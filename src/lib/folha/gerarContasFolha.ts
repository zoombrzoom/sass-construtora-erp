import type { FolhaFuncionario } from '@/types/financeiro'
import {
  createContaPagar,
  getContasPagarPorFolhaFuncionarioId,
  deleteContasPagarNaoPagasPorFolhaFuncionarioId,
} from '@/lib/db/contasPagar'
import { toDate } from '@/utils/date'

/** Usado quando o funcionário não tem obra vinculada; as contas da folha aparecem em Contas a Pagar mesmo assim. */
export const OBRA_ID_FOLHA_SEM_OBRA = '__FOLHA_SEM_OBRA__'

function isBusinessDay(date: Date): boolean {
  return date.getDay() !== 0 && date.getDay() !== 6
}

function nthBusinessDayOfMonth(year: number, monthZeroBased: number, n: number): Date {
  const target = Math.max(1, Math.min(22, Number(n) || 1))
  let count = 0
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, monthZeroBased, d, 12, 0, 0)
    if (dt.getMonth() !== monthZeroBased) break
    if (!isBusinessDay(dt)) continue
    count += 1
    if (count === target) return dt
  }
  return new Date(year, monthZeroBased + 1, 0, 12, 0, 0)
}

function clampDayInMonth(year: number, monthZeroBased: number, day: number): Date {
  const last = new Date(year, monthZeroBased + 1, 0).getDate()
  const d = Math.max(1, Math.min(last, day))
  return new Date(year, monthZeroBased, d, 12, 0, 0)
}

export type VencimentoItem = { dataVencimento: Date; valor: number }

/**
 * Gera a lista de vencimentos (data + valor) para os próximos `months` meses a partir de `startDate`,
 * conforme o tipo de recorrência e configuração do funcionário.
 */
export function buildVencimentos(
  f: FolhaFuncionario,
  startDate: Date,
  months: number
): VencimentoItem[] {
  const result: VencimentoItem[] = []
  const diaUtil = Math.max(1, Math.min(22, f.diaUtil ?? 5))
  const diaMes2 = Math.max(1, Math.min(31, f.diaMes2 ?? 20))
  const diaMensal = Math.max(1, Math.min(31, f.diaMensal ?? 20))

  const startYear = startDate.getFullYear()
  const startMonth = startDate.getMonth()

  if (f.recorrenciaTipo === 'avulso') {
    const data = f.dataAvulso ? toDate(f.dataAvulso) : startDate
    const valor = f.valorAvulso ?? 0
    if (valor > 0 && data >= startDate) {
      result.push({ dataVencimento: data, valor })
    }
    return result
  }

  if (f.recorrenciaTipo === 'mensal') {
    const valor = f.valorMensal ?? 0
    if (valor <= 0) return result
    for (let m = 0; m < months; m++) {
      const y = startYear + Math.floor((startMonth + m) / 12)
      const mo = (startMonth + m) % 12
      const data = clampDayInMonth(y, mo, diaMensal)
      if (data >= startDate) result.push({ dataVencimento: data, valor })
    }
    return result
  }

  if (f.recorrenciaTipo === 'quinzenal') {
    const v1 = f.valorQuinzena1 ?? 0
    const v2 = f.valorQuinzena2 ?? 0
    if (v1 <= 0 && v2 <= 0) return result
    for (let m = 0; m < months; m++) {
      const y = startYear + Math.floor((startMonth + m) / 12)
      const mo = (startMonth + m) % 12
      const primeiro = nthBusinessDayOfMonth(y, mo, diaUtil)
      const segundo = clampDayInMonth(y, mo, diaMes2)
      if (primeiro >= startDate && v1 > 0) result.push({ dataVencimento: primeiro, valor: v1 })
      if (segundo >= startDate && v2 > 0) result.push({ dataVencimento: segundo, valor: v2 })
    }
    return result
  }

  if (f.recorrenciaTipo === 'semanal') {
    const valor = f.valorSemanal ?? 0
    if (valor <= 0) return result
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + months)
    let d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0)
    while (d < endDate) {
      if (d >= startDate) result.push({ dataVencimento: new Date(d), valor })
      d.setDate(d.getDate() + 7)
    }
    return result
  }

  return result
}

/**
 * Adiciona 1 mês/período de lançamentos para trás (seguindo a lógica quinzenal, mensal ou semanal).
 * Usa a data do lançamento mais antigo existente como referência; se não houver nenhum, usa o mês anterior a hoje.
 */
export async function adicionarUmPeriodoParaTras(
  funcionario: FolhaFuncionario,
  createdBy: string
): Promise<number> {
  if (!funcionario.ativo) return 0
  if (funcionario.recorrenciaTipo === 'avulso') return 0

  const existing = await getContasPagarPorFolhaFuncionarioId(funcionario.id)

  let startDate: Date
  if (existing.length === 0) {
    startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
  } else {
    const datas = existing.map((c) => toDate(c.dataVencimento))
    const minima = new Date(Math.min(...datas.map((d) => d.getTime())))
    startDate = new Date(minima.getFullYear(), minima.getMonth() - 1, 1, 0, 0, 0, 0)
  }

  const vencimentos = buildVencimentos(funcionario, startDate, 1)
  if (vencimentos.length === 0) return 0

  const existingKeys = new Set(existing.map((c) => toDateKey(toDate(c.dataVencimento))))
  const obraId = (funcionario.obraId && funcionario.obraId.trim()) ? funcionario.obraId.trim() : OBRA_ID_FOLHA_SEM_OBRA

  let created = 0
  for (const { dataVencimento, valor } of vencimentos) {
    const key = toDateKey(dataVencimento)
    if (existingKeys.has(key)) continue
    await createContaPagar({
      valor,
      dataVencimento,
      tipo: 'folha',
      obraId,
      status: 'pendente',
      createdBy,
      folhaFuncionarioId: funcionario.id,
      favorecido: funcionario.nome,
      agencia: funcionario.agencia,
      conta: funcionario.conta,
      formaPagamento: funcionario.formaPagamento,
    })
    existingKeys.add(key)
    created += 1
  }
  return created
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Gera contas a pagar para os próximos 12 meses a partir de hoje (ou da data de início do funcionário).
 * Se replaceFuture, remove antes todas as contas não pagas deste funcionário e recria (uso em edição).
 * Se mesesPassado > 0, inclui lançamentos no passado (a partir de X meses atrás) além dos próximos 12;
 * nesse caso não remove contas existentes, apenas adiciona as que faltam (para não apagar pagamentos antigos).
 */
export async function gerarContasFolha(
  funcionario: FolhaFuncionario,
  createdBy: string,
  options?: { replaceFuture?: boolean; mesesPassado?: number }
): Promise<number> {
  if (!funcionario.ativo) return 0

  const incluirPassado = (options?.mesesPassado ?? 0) > 0
  if (options?.replaceFuture && !incluirPassado) {
    await deleteContasPagarNaoPagasPorFolhaFuncionarioId(funcionario.id)
  }

  let startDate: Date
  let months: number
  if (incluirPassado) {
    const mesesPassado = Math.min(60, Math.max(1, options!.mesesPassado!))
    startDate = new Date()
    startDate.setMonth(startDate.getMonth() - mesesPassado)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
    months = mesesPassado + 12
  } else {
    startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    months = 12
  }

  const vencimentos = buildVencimentos(funcionario, startDate, months)
  if (vencimentos.length === 0) return 0

  const existing = await getContasPagarPorFolhaFuncionarioId(funcionario.id)
  const existingKeys = new Set(existing.map((c) => toDateKey(toDate(c.dataVencimento))))

  const obraId = (funcionario.obraId && funcionario.obraId.trim()) ? funcionario.obraId.trim() : OBRA_ID_FOLHA_SEM_OBRA

  let created = 0
  for (const { dataVencimento, valor } of vencimentos) {
    const key = toDateKey(dataVencimento)
    if (existingKeys.has(key)) continue
    await createContaPagar({
      valor,
      dataVencimento,
      tipo: 'folha',
      obraId,
      status: 'pendente',
      createdBy,
      folhaFuncionarioId: funcionario.id,
      favorecido: funcionario.nome,
      agencia: funcionario.agencia,
      conta: funcionario.conta,
      formaPagamento: funcionario.formaPagamento,
    })
    existingKeys.add(key)
    created += 1
  }
  return created
}
