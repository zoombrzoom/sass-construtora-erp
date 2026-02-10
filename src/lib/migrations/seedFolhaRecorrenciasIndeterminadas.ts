import type { FolhaPagamento, FolhaPagamentoRecorrenciaTipo } from '@/types/financeiro'
import { createFolhaPagamento, getFolhasPagamento } from '@/lib/db/folhaPagamento'
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

function normalizeText(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

function hashString(value: string): string {
  // DJB2-ish: simples, deterministico, suficiente para gerar IDs curtos.
  let h = 5381
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h) ^ value.charCodeAt(i)
  }
  // unsigned 32-bit -> base36
  return (h >>> 0).toString(36)
}

function fallbackGroupKey(f: FolhaPagamento): string | null {
  if (!f.recorrenciaTipo) return null
  const tipo = String(f.recorrenciaTipo || '').trim()
  if (!tipo) return null

  const createdBy = normalizeText((f as any).createdBy) || 'user'
  const cpf = normalizeText((f as any).cpf).replace(/\D/g, '')
  const nome = normalizeText((f as any).funcionarioNome).toLowerCase()
  const categoriaId = normalizeText((f as any).categoriaId) || 'none'

  const seed = `${createdBy}|${tipo}|${cpf}|${nome}|${categoriaId}`
  const h = hashString(seed).slice(0, 10)
  return `auto_${createdBy}_${tipo}_${h}`
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
  const recorrentes = folhas.filter((f) => Boolean(f.recorrenciaTipo))
  if (recorrentes.length === 0) return { created: 0, skipped: 0 }

  const existingByGroup = new Map<string, Set<string>>()
  const maxIndexByGroup = new Map<string, number>()
  const minDateByGroup = new Map<string, Date>()
  for (const f of recorrentes) {
    const gid = f.recorrenciaGrupoId || fallbackGroupKey(f)
    if (!gid) continue
    if (!existingByGroup.has(gid)) existingByGroup.set(gid, new Set<string>())
    const dt = atNoon(toDate(f.dataReferencia))
    existingByGroup.get(gid)!.add(dateKey(dt))
    const idx = Number(f.recorrenciaIndex) || 0
    maxIndexByGroup.set(gid, Math.max(maxIndexByGroup.get(gid) || 0, idx))
    const prevMin = minDateByGroup.get(gid)
    if (!prevMin || dt.getTime() < prevMin.getTime()) minDateByGroup.set(gid, dt)
  }

  const byGroup = new Map<string, FolhaPagamento[]>()
  for (const t of recorrentes) {
    const gid = t.recorrenciaGrupoId || fallbackGroupKey(t)
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

      const templateRef = atNoon(toDate(template.dataReferencia))
      const diaUtil = (() => {
        const raw = Number((template as any).recorrenciaDiaUtil)
        if (raw > 0) return Math.max(1, Math.min(22, raw))
        if (isBusinessDay(templateRef)) {
          let count = 0
          for (let d = 1; d <= templateRef.getDate(); d++) {
            const dt = new Date(templateRef.getFullYear(), templateRef.getMonth(), d, 12, 0, 0)
            if (dt.getMonth() !== templateRef.getMonth()) break
            if (!isBusinessDay(dt)) continue
            count += 1
          }
          return Math.max(1, Math.min(22, count || 5))
        }
        return 5
      })()

      const dia2 = (() => {
        const raw = Number((template as any).recorrenciaDiaMes2)
        if (raw > 0) return Math.max(1, Math.min(31, raw))
        const d = templateRef.getDate()
        return d >= 15 ? Math.max(1, Math.min(31, d)) : 20
      })()

      const desired: Date[] =
        tipo === 'mensal'
          ? [nthBusinessDayOfMonth(year, monthZeroBased, diaUtil)]
          : [nthBusinessDayOfMonth(year, monthZeroBased, diaUtil), clampDayInMonth(year, monthZeroBased, dia2)]

      const existingKeys = existingByGroup.get(gid) || new Set<string>()
      if (!existingByGroup.has(gid)) existingByGroup.set(gid, existingKeys)

      let nextIndex = Math.max(maxIndexByGroup.get(gid) || 0, existingKeys.size) + 1

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
    let nextIndex = Math.max(maxIndexByGroup.get(gid) || 0, existingKeys.size) + 1

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
