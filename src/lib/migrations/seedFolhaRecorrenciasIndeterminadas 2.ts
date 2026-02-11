import type { FolhaPagamento, FolhaPagamentoRecorrenciaTipo } from '@/types/financeiro'
import { createFolhaPagamento, getFolhasPagamento, updateFolhaPagamento } from '@/lib/db/folhaPagamento'
import { toDate } from '@/utils/date'

function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

function nthBusinessDayOfMonth(year: number, monthZeroBased: number, n: number): Date {
  const target = Math.max(1, Math.min(31, Number(n) || 1))
  let count = 0
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, monthZeroBased, d, 12, 0, 0)
    if (dt.getMonth() !== monthZeroBased) break
    if (!isBusinessDay(dt)) continue
    count += 1
    if (count === target) return dt
  }
  // fallback: ultimo dia do mes
  return new Date(year, monthZeroBased + 1, 0, 12, 0, 0)
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0)
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function clampDayInMonth(year: number, monthZeroBased: number, day: number): Date {
  const lastDay = new Date(year, monthZeroBased + 1, 0).getDate()
  const d = Math.max(1, Math.min(lastDay, Number(day) || 1))
  return new Date(year, monthZeroBased, d, 12, 0, 0)
}

function isInRange(date: Date, from: Date, to: Date): boolean {
  const t = date.getTime()
  return t >= from.getTime() && t <= to.getTime()
}

function atNoon(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0)
}

function addDaysKeepingNoon(value: Date, daysToAdd: number): Date {
  const d = atNoon(value)
  d.setDate(d.getDate() + Number(daysToAdd || 0))
  return atNoon(d)
}

function ceilDiv(a: number, b: number): number {
  if (b === 0) return 0
  return Math.floor((a + b - 1) / b)
}

export async function seedFolhaRecorrenciasIndeterminadas(params: {
  from: Date
  to: Date
}): Promise<{ created: number; skipped: number }> {
  const from = new Date(params.from)
  const to = new Date(params.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { created: 0, skipped: 0 }
  }

  const folhas = await getFolhasPagamento()
  // Templates elegiveis:
  // - Mensal/Quinzenal: usam modelo "indeterminada" (grupo + tipo).
  // - Semanal/Personalizado: quando nao ha recorrenciaTotal, tratamos como indeterminada e
  //   semeamos ocorrencias dentro do range (para aparecerem no Contas a Pagar por mes).
  const templates = folhas.filter((f) => {
    if (!f.recorrenciaTipo) return false
    const tipo = f.recorrenciaTipo as FolhaPagamentoRecorrenciaTipo
    if (tipo === 'mensal' || tipo === 'quinzenal') {
      return Boolean(f.recorrenciaIndeterminada && f.recorrenciaGrupoId)
    }
    if (tipo === 'semanal' || tipo === 'personalizado') {
      // Se tiver recorrenciaTotal, assumimos que ja foi gerado de forma finita (nao semear indefinidamente).
      return Boolean(!f.recorrenciaTotal)
    }
    return false
  })
  if (templates.length === 0) return { created: 0, skipped: 0 }

  const existingByGroup = new Map<string, Set<string>>()
  const maxIndexByGroup = new Map<string, number>()
  const minDateByGroup = new Map<string, Date>()
  for (const f of folhas) {
    if (!f.recorrenciaGrupoId) continue
    const gid = f.recorrenciaGrupoId
    if (!existingByGroup.has(gid)) existingByGroup.set(gid, new Set<string>())
    const dt = atNoon(toDate(f.dataReferencia))
    existingByGroup.get(gid)!.add(dateKey(dt))
    const idx = Number(f.recorrenciaIndex) || 0
    maxIndexByGroup.set(gid, Math.max(maxIndexByGroup.get(gid) || 0, idx))
    const prevMin = minDateByGroup.get(gid)
    if (!prevMin || dt.getTime() < prevMin.getTime()) minDateByGroup.set(gid, dt)
  }

  // Garante que templates semanal/personalizado tenham um grupo, para evitar duplicacoes.
  // Faz best-effort: se falhar por permissao, a recorrencia desse template pode nao ser semeada.
  const ensuredTemplates: FolhaPagamento[] = []
  for (const t of templates) {
    if (t.recorrenciaGrupoId) {
      ensuredTemplates.push(t)
      continue
    }

    const gid = `auto_${t.createdBy || 'user'}_${t.id}`
    try {
      await updateFolhaPagamento(t.id, {
        recorrenciaGrupoId: gid,
        recorrenciaIndex: t.recorrenciaIndex || 1,
        // Marca como indeterminada para explicitar a intencao no documento.
        recorrenciaIndeterminada: true,
      })
      const next = { ...t, recorrenciaGrupoId: gid, recorrenciaIndex: t.recorrenciaIndex || 1, recorrenciaIndeterminada: true }
      ensuredTemplates.push(next)

      if (!existingByGroup.has(gid)) existingByGroup.set(gid, new Set<string>())
      const dt = atNoon(toDate(next.dataReferencia))
      existingByGroup.get(gid)!.add(dateKey(dt))
      maxIndexByGroup.set(gid, Math.max(maxIndexByGroup.get(gid) || 0, Number(next.recorrenciaIndex) || 1))
      minDateByGroup.set(gid, dt)
    } catch (err) {
      console.warn('Falha ao atribuir grupo automatico para recorrencia semanal/personalizada:', err)
    }
  }

  const byGroup = new Map<string, FolhaPagamento[]>()
  for (const t of ensuredTemplates) {
    const gid = t.recorrenciaGrupoId
    if (!gid) continue
    if (!byGroup.has(gid)) byGroup.set(gid, [])
    byGroup.get(gid)!.push(t)
  }

  let created = 0
  let skipped = 0

  for (
    let m = monthStart(from);
    m.getTime() <= monthStart(to).getTime();
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1, 12, 0, 0)
  ) {
    const year = m.getFullYear()
    const monthZeroBased = m.getMonth()

    for (const [gid, list] of byGroup.entries()) {
      const template = [...list].sort((a, b) => toDate(b.dataReferencia).getTime() - toDate(a.dataReferencia).getTime())[0]
      const tipo = template.recorrenciaTipo as FolhaPagamentoRecorrenciaTipo

      // Somente Mensal/Quinzenal nesta varredura mensal (semanal/personalizado abaixo).
      if (tipo !== 'mensal' && tipo !== 'quinzenal') continue

      const diaUtil = Math.max(1, Math.min(22, Number(template.recorrenciaDiaUtil) || 5))
      const dia2 = Math.max(1, Math.min(31, Number(template.recorrenciaDiaMes2) || 20))

      const desired: Date[] =
        tipo === 'mensal'
          ? [nthBusinessDayOfMonth(year, monthZeroBased, diaUtil)]
          : [nthBusinessDayOfMonth(year, monthZeroBased, diaUtil), clampDayInMonth(year, monthZeroBased, dia2)]

      const existingKeys = existingByGroup.get(gid) || new Set<string>()
      if (!existingByGroup.has(gid)) existingByGroup.set(gid, existingKeys)

      let nextIndex = (maxIndexByGroup.get(gid) || 0) + 1

      for (const dt of desired) {
        if (!isInRange(dt, from, to)) continue
        const key = dateKey(dt)
        if (existingKeys.has(key)) {
          skipped += 1
          continue
        }
        existingKeys.add(key)

        await createFolhaPagamento({
          funcionarioNome: template.funcionarioNome,
          cpf: template.cpf || '',
          agencia: template.agencia || '',
          conta: template.conta || '',
          valor: template.valor,
          valorPago: 0,
          status: 'aberto',
          formaPagamento: template.formaPagamento,
          categoriaId: template.categoriaId,
          recorrenciaTipo: template.recorrenciaTipo,
          recorrenciaIntervaloDias: template.recorrenciaIntervaloDias,
          recorrenciaIndeterminada: true,
          recorrenciaDiaUtil: diaUtil,
          recorrenciaDiaMes2: dia2,
          recorrenciaGrupoId: gid,
          recorrenciaIndex: nextIndex++,
          dataReferencia: dt,
          createdBy: template.createdBy,
          observacoes: template.observacoes,
        })

        created += 1
        maxIndexByGroup.set(gid, nextIndex - 1)
      }
    }
  }

  // Semanal/Personalizado: semeia ocorrencias dentro do range selecionado, com base no "anchor" do grupo.
  for (const [gid, list] of byGroup.entries()) {
    const template = [...list].sort((a, b) => toDate(b.dataReferencia).getTime() - toDate(a.dataReferencia).getTime())[0]
    const tipo = template.recorrenciaTipo as FolhaPagamentoRecorrenciaTipo
    if (tipo !== 'semanal' && tipo !== 'personalizado') continue

    const intervaloDias =
      tipo === 'semanal'
        ? 7
        : Math.max(1, Number(template.recorrenciaIntervaloDias) || 1)

    const existingKeys = existingByGroup.get(gid) || new Set<string>()
    if (!existingByGroup.has(gid)) existingByGroup.set(gid, existingKeys)

    const anchor = minDateByGroup.get(gid) || atNoon(toDate(template.dataReferencia))
    const fromNoon = atNoon(from)
    const toNoon = atNoon(to)
    if (Number.isNaN(anchor.getTime()) || Number.isNaN(fromNoon.getTime()) || Number.isNaN(toNoon.getTime())) {
      continue
    }

    // Calcula o primeiro k tal que anchor + k*intervalo >= from
    const msPerDay = 24 * 60 * 60 * 1000
    const diffDays = Math.floor((fromNoon.getTime() - anchor.getTime()) / msPerDay)
    const kStart = diffDays <= 0 ? 0 : ceilDiv(diffDays, intervaloDias)
    const desired: Date[] = []

    for (let k = kStart; k < kStart + 5000; k++) {
      const dt = addDaysKeepingNoon(anchor, k * intervaloDias)
      if (dt.getTime() > toNoon.getTime()) break
      if (!isInRange(dt, fromNoon, toNoon)) continue
      desired.push(dt)
    }

    if (desired.length === 0) continue

    // Mantem indices sempre crescentes.
    let nextIndex = (maxIndexByGroup.get(gid) || 0) + 1

    for (const dt of desired) {
      const key = dateKey(dt)
      if (existingKeys.has(key)) {
        skipped += 1
        continue
      }
      existingKeys.add(key)

      await createFolhaPagamento({
        funcionarioNome: template.funcionarioNome,
        cpf: template.cpf || '',
        agencia: template.agencia || '',
        conta: template.conta || '',
        valor: template.valor,
        valorPago: 0,
        status: 'aberto',
        formaPagamento: template.formaPagamento,
        categoriaId: template.categoriaId,
        recorrenciaTipo: template.recorrenciaTipo,
        recorrenciaIntervaloDias: intervaloDias,
        recorrenciaIndeterminada: true,
        recorrenciaGrupoId: gid,
        recorrenciaIndex: nextIndex++,
        dataReferencia: dt,
        createdBy: template.createdBy,
        observacoes: template.observacoes,
      })

      created += 1
      maxIndexByGroup.set(gid, nextIndex - 1)
    }
  }

  return { created, skipped }
}
