'use client'

import { useEffect, useState } from 'react'
import {
  FolhaPagamento,
  FolhaPagamentoFormaPagamento,
  FolhaPagamentoRecorrenciaTipo,
  FolhaPagamentoStatus,
} from '@/types/financeiro'
import { createFolhaPagamento, createFolhasPagamentoRecorrentes, updateFolhaPagamento } from '@/lib/db/folhaPagamento'
import { getFolhaPagamentoCategorias } from '@/lib/db/folhaPagamentoCategorias'
import { uploadImage } from '@/lib/storage/upload'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toDate } from '@/utils/date'
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '@/utils/currency'
import { AlertCircle, ArrowLeft, Save, Upload, ExternalLink } from 'lucide-react'

interface FolhaPagamentoFormProps {
  folha?: FolhaPagamento
  onSuccess?: () => void
}

const FORMAS_PAGAMENTO: { value: FolhaPagamentoFormaPagamento; label: string }[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'ted', label: 'TED' },
  { value: 'doc', label: 'DOC' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'outro', label: 'Outro' },
]

const STATUS_OPTIONS: { value: FolhaPagamentoStatus; label: string }[] = [
  { value: 'aberto', label: 'Em aberto' },
  { value: 'parcial', label: 'Pago parcial' },
  { value: 'pago', label: 'Pago' },
]

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function toInputDate(value: Date): string {
  return value.toISOString().split('T')[0]
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

function addMonthsKeepingDay(value: Date, monthsToAdd: number): Date {
  const base = new Date(value)
  const baseDay = base.getDate()
  const shifted = new Date(base.getFullYear(), base.getMonth() + monthsToAdd, 1, 12, 0, 0, 0)
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate()
  shifted.setDate(Math.min(baseDay, lastDay))
  return shifted
}

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

function toMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0)
}

export function FolhaPagamentoForm({ folha, onSuccess }: FolhaPagamentoFormProps) {
  const [funcionarioNome, setFuncionarioNome] = useState(folha?.funcionarioNome || '')
  const [cpf, setCpf] = useState(formatCpf(folha?.cpf || ''))
  const [agencia, setAgencia] = useState(folha?.agencia || '')
  const [conta, setConta] = useState(folha?.conta || '')
  const [categorias, setCategorias] = useState<Array<{ id: string; nome: string }>>([])
  const [categoriaId, setCategoriaId] = useState<string>(folha?.categoriaId || '')
  const [valor, setValor] = useState(folha?.valor !== undefined ? formatCurrencyInput(folha.valor) : '')
  const [valorQuinzena1, setValorQuinzena1] = useState('')
  const [valorQuinzena2, setValorQuinzena2] = useState('')
  const [valorPago, setValorPago] = useState(folha?.valorPago !== undefined ? formatCurrencyInput(folha.valorPago) : '0,00')
  const [status, setStatus] = useState<FolhaPagamentoStatus>(folha?.status || 'aberto')
  const [formaPagamento, setFormaPagamento] = useState<FolhaPagamentoFormaPagamento | ''>(folha?.formaPagamento || '')
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<FolhaPagamentoRecorrenciaTipo | ''>(folha?.recorrenciaTipo || '')
  const [recorrenciaIntervaloDias, setRecorrenciaIntervaloDias] = useState<number>(folha?.recorrenciaIntervaloDias || 30)
  const [gerarRecorrencia, setGerarRecorrencia] = useState<boolean>(false)
  const [recorrenciaTotal, setRecorrenciaTotal] = useState<number>(12)
  const [recorrenciaDiaUtil, setRecorrenciaDiaUtil] = useState<number>(folha?.recorrenciaDiaUtil || 5)
  const [recorrenciaDiaMes2, setRecorrenciaDiaMes2] = useState<number>(folha?.recorrenciaDiaMes2 || 20)
  const [dataReferenciaTouched, setDataReferenciaTouched] = useState(false)
  const [dataReferencia, setDataReferencia] = useState(
    folha?.dataReferencia ? toInputDate(toDate(folha.dataReferencia)) : toInputDate(new Date())
  )
  const [dataPagamento, setDataPagamento] = useState(
    folha?.dataPagamento ? toInputDate(toDate(folha.dataPagamento)) : ''
  )
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)
  const [comprovanteUrl, setComprovanteUrl] = useState(folha?.comprovanteUrl || '')
  const [observacoes, setObservacoes] = useState(folha?.observacoes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      try {
        const data = await getFolhaPagamentoCategorias()
        setCategorias(data.map((c) => ({ id: c.id, nome: c.nome })))
      } catch (err) {
        console.error('Erro ao carregar categorias da folha:', err)
      }
    })()
  }, [])

  const inputClass = 'mt-1 block w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch'
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1'

  const valorNumber = parseCurrencyInput(valor) || 0
  const valorQuinzena1Num = parseCurrencyInput(valorQuinzena1) || 0
  const valorQuinzena2Num = parseCurrencyInput(valorQuinzena2) || 0
  const valorTotalDisplay =
    !folha && recorrenciaTipo === 'quinzenal'
      ? valorQuinzena1Num + valorQuinzena2Num
      : valorNumber
  const valorPagoNumber = parseCurrencyInput(valorPago) || 0
  const valorAberto = Math.max(valorTotalDisplay - valorPagoNumber, 0)

  const ensurePagamentoDefaults = () => {
    if (!formaPagamento) setFormaPagamento('pix')
    if (!dataPagamento) setDataPagamento(toInputDate(new Date()))
  }

  const isIndeterminada = recorrenciaTipo === 'mensal' || recorrenciaTipo === 'quinzenal'

  const computeDefaultDataReferencia = (base: Date, tipo: FolhaPagamentoRecorrenciaTipo): Date => {
    const y = base.getFullYear()
    const m = base.getMonth()
    const diaUtil = Math.max(1, Math.min(22, Number(recorrenciaDiaUtil) || 5))
    const primeiro = nthBusinessDayOfMonth(y, m, diaUtil)

    if (tipo === 'mensal') return primeiro

    // quinzenal: 5o dia util e dia 20
    const d2 = Math.max(1, Math.min(31, Number(recorrenciaDiaMes2) || 20))
    const segundo = new Date(y, m, d2, 12, 0, 0)

    const hoje = new Date()
    const baseMonth = toMonthStart(base).getTime()
    const hojeMonth = toMonthStart(hoje).getTime()
    if (baseMonth !== hojeMonth) {
      // Se for um mes diferente do atual, usa sempre o primeiro pagamento do mes.
      return primeiro
    }

    // Mes atual: escolhe o proximo vencimento (primeiro ou segundo), senao vai para o proximo mes.
    const now = new Date()
    const endSecond = new Date(segundo)
    endSecond.setHours(23, 59, 59, 999)
    if (now <= endSecond) {
      return now <= primeiro ? primeiro : segundo
    }
    // proximo mes
    const next = new Date(y, m + 1, 1, 12, 0, 0)
    return nthBusinessDayOfMonth(next.getFullYear(), next.getMonth(), diaUtil)
  }

  useEffect(() => {
    if (folha) return
    if (!recorrenciaTipo) return
    if (!isIndeterminada) return
    if (dataReferenciaTouched) return
    const base = new Date()
    const next = computeDefaultDataReferencia(base, recorrenciaTipo as FolhaPagamentoRecorrenciaTipo)
    setDataReferencia(toInputDate(next))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorrenciaTipo, recorrenciaDiaUtil, recorrenciaDiaMes2])

  const handleStatusChange = (nextStatus: FolhaPagamentoStatus) => {
    setStatus(nextStatus)

    if (nextStatus === 'aberto') {
      setValorPago('0,00')
      setFormaPagamento('')
      setDataPagamento('')
      return
    }

    if (nextStatus === 'pago' && valor) {
      setValorPago(formatCurrencyInput(valor))
      if (!dataPagamento) {
        setDataPagamento(toInputDate(new Date()))
      }
    }
  }

  const syncStatusFromValorPago = (nextValorPagoStr: string) => {
    const total = parseCurrencyInput(valor) || 0
    const pago = parseCurrencyInput(nextValorPagoStr) || 0

    if (!total || total <= 0) return

    if (pago <= 0) {
      if (status !== 'aberto') setStatus('aberto')
      return
    }

    ensurePagamentoDefaults()

    if (pago >= total) {
      if (status !== 'pago') setStatus('pago')
      // Mantem consistente: pago == total.
      setValorPago(formatCurrencyInput(valor))
      return
    }

    if (status !== 'parcial') setStatus('parcial')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cpfDigits = cpf.replace(/\D/g, '')
    const valorNum = parseCurrencyInput(valor)
    let valorPagoNum = parseCurrencyInput(valorPago) || 0

    if (!funcionarioNome.trim()) {
      setError('Informe o nome do funcionário')
      return
    }

    if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
      setError('Se informar CPF, ele precisa ter 11 dígitos')
      return
    }

    const isQuinzenal = recorrenciaTipo === 'quinzenal' && !folha
    const valor1 = isQuinzenal ? (parseCurrencyInput(valorQuinzena1) || 0) : valorNum
    const valor2 = isQuinzenal ? (parseCurrencyInput(valorQuinzena2) || 0) : valorNum

    if (isQuinzenal) {
      if (Number.isNaN(parseCurrencyInput(valorQuinzena1)) || valor1 <= 0) {
        setError('Informe o valor da 1ª quinzena')
        return
      }
      if (Number.isNaN(parseCurrencyInput(valorQuinzena2)) || valor2 <= 0) {
        setError('Informe o valor da 2ª quinzena')
        return
      }
    } else if (!valor || Number.isNaN(valorNum) || valorNum <= 0) {
      setError('Informe um valor válido')
      return
    }

    if (!dataReferencia) {
      setError('Informe a data de referência')
      return
    }

    if (status === 'aberto') {
      valorPagoNum = 0
    }

    if (status === 'pago') {
      valorPagoNum = valorNum
    }

    if (status === 'parcial' && (valorPagoNum <= 0 || valorPagoNum >= valorNum)) {
      setError('Para status parcial, informe um valor pago maior que zero e menor que o valor total')
      return
    }

    if (status !== 'aberto' && !dataPagamento) {
      setError('Informe a data de pagamento')
      return
    }

    if (status !== 'aberto' && !formaPagamento) {
      setError('Selecione a forma de pagamento')
      return
    }

    if (!user) {
      setError('Sessão expirada. Faça login novamente.')
      return
    }

    setLoading(true)

    try {
      let comprovante = comprovanteUrl

      if (comprovanteFile) {
        const path = `folha-pagamento/comprovantes/${user.id}_${Date.now()}_${comprovanteFile.name}`
        comprovante = await uploadImage(comprovanteFile, path, false)
        setComprovanteUrl(comprovante)
      }

      const payloadValor = isQuinzenal ? valor1 : valorNum
      const payload: any = {
        funcionarioNome: funcionarioNome.trim(),
        cpf: cpfDigits,
        agencia: agencia.trim(),
        conta: conta.trim(),
        categoriaId: categoriaId ? categoriaId : null,
        valor: payloadValor,
        valorPago: valorPagoNum,
        status,
        dataReferencia: parseDateInput(dataReferencia),
        createdBy: user.id,
      }

      if (recorrenciaTipo) {
        payload.recorrenciaTipo = recorrenciaTipo
        if (recorrenciaTipo === 'personalizado') {
          payload.recorrenciaIntervaloDias = Math.max(1, Number(recorrenciaIntervaloDias) || 1)
        }
        if (recorrenciaTipo === 'mensal' || recorrenciaTipo === 'quinzenal') {
          payload.recorrenciaIndeterminada = true
          payload.recorrenciaDiaUtil = Math.max(1, Math.min(22, Number(recorrenciaDiaUtil) || 5))
          payload.recorrenciaDiaMes2 = Math.max(1, Math.min(31, Number(recorrenciaDiaMes2) || 20))
        }
      }

      if (status !== 'aberto') {
        payload.formaPagamento = formaPagamento
        payload.dataPagamento = parseDateInput(dataPagamento)
      } else {
        payload.formaPagamento = null
        payload.dataPagamento = null
      }

      if (comprovante) {
        payload.comprovanteUrl = comprovante
      }

      if (observacoes.trim()) {
        payload.observacoes = observacoes.trim()
      }

      if (folha) {
        await updateFolhaPagamento(folha.id, payload)
      } else {
        const tipoFinal = recorrenciaTipo as FolhaPagamentoRecorrenciaTipo | ''

        // Mensal/quinzenal: recorrente por tempo indeterminado.
        if (tipoFinal === 'mensal' || tipoFinal === 'quinzenal') {
          const groupId = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          const baseDate = parseDateInput(dataReferencia)
          const baseMonth = toMonthStart(baseDate)
          const monthsToSeed = 3 // mes atual + proximos 2 (sem gerar 12 meses)

          const diaUtil = Math.max(1, Math.min(22, Number(recorrenciaDiaUtil) || 5))
          const dia2 = Math.max(1, Math.min(31, Number(recorrenciaDiaMes2) || 20))
          const valorSegundo = tipoFinal === 'quinzenal' ? valor2 : payloadValor

          const creates: Promise<string>[] = []
          let idx = 0

          const seedOne = (dt: Date, valorDoLancamento: number) => {
            idx += 1
            const isSame = dt.toISOString().slice(0, 10) === baseDate.toISOString().slice(0, 10)
            creates.push(
              createFolhaPagamento({
                ...payload,
                valor: valorDoLancamento,
                valorPago: isSame ? valorPagoNum : 0,
                dataReferencia: dt,
                recorrenciaGrupoId: groupId,
                recorrenciaIndex: idx,
                recorrenciaTotal: undefined,
                status: isSame ? payload.status : 'aberto',
                formaPagamento: isSame ? payload.formaPagamento : undefined,
                dataPagamento: isSame ? payload.dataPagamento : undefined,
                comprovanteUrl: isSame ? payload.comprovanteUrl : undefined,
                recorrenciaIndeterminada: true,
                recorrenciaDiaUtil: diaUtil,
                recorrenciaDiaMes2: dia2,
                createdBy: user.id,
              })
            )
          }

          for (let m = 0; m < monthsToSeed; m++) {
            const monthStart = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + m, 1, 12, 0, 0)
            const primeiro = nthBusinessDayOfMonth(monthStart.getFullYear(), monthStart.getMonth(), diaUtil)
            if (tipoFinal === 'mensal') {
              seedOne(primeiro, payloadValor)
            } else {
              const segundo = new Date(monthStart.getFullYear(), monthStart.getMonth(), dia2, 12, 0, 0)
              seedOne(primeiro, payloadValor)
              seedOne(segundo, valorSegundo)
            }
          }

          await Promise.all(creates)
        } else {
          // Semanal/personalizado: mantem opcao de gerar futuros (qtd).
          const shouldCreateRecorrentes =
            Boolean(recorrenciaTipo) && Boolean(gerarRecorrencia) && Number(recorrenciaTotal) > 1

          if (!shouldCreateRecorrentes) {
            await createFolhaPagamento(payload)
          } else {
            const total = Math.min(60, Math.max(2, Number(recorrenciaTotal) || 2))
            const baseDate = parseDateInput(dataReferencia)

            let intervaloDiasFinal: number | undefined
            if (tipoFinal === 'personalizado') {
              intervaloDiasFinal = Math.max(1, Number(recorrenciaIntervaloDias) || 1)
            } else if (tipoFinal === 'semanal') {
              intervaloDiasFinal = 7
            }

            const dias = Math.max(1, Number(intervaloDiasFinal) || 1)
            await createFolhasPagamentoRecorrentes({
              base: payload,
              total,
              tipo: tipoFinal as FolhaPagamentoRecorrenciaTipo,
              intervaloDias: dias,
              buildDataReferencia: (indexZeroBased: number) => {
                const next = new Date(baseDate)
                next.setDate(next.getDate() + indexZeroBased * dias)
                return next
              },
            })
          }
        }
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/financeiro/folha-pagamento')
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro ao salvar folha de pagamento'
      const code = err?.code || err?.name
      if (code === 'permission-denied') {
        setError('Sem permissão para criar ou editar folha. Verifique se seu usuário é Admin, Financeiro ou Secretaria.')
      } else {
        setError(msg)
      }
      console.error('Erro ao salvar folha:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-error/20 border border-error/30 text-error px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="funcionarioNome" className={labelClass}>Funcionário *</label>
          <input
            id="funcionarioNome"
            type="text"
            required
            value={funcionarioNome}
            onChange={(e) => setFuncionarioNome(e.target.value)}
            className={inputClass}
            placeholder="Nome completo"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="categoriaId" className={labelClass}>Departamento</label>
          <select
            id="categoriaId"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className={inputClass}
          >
            <option value="">Geral (sem departamento)</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>

        {!folha && (
          <div className="sm:col-span-2">
            <label htmlFor="recorrenciaTipoTop" className={labelClass}>Recorrência</label>
            <select
              id="recorrenciaTipoTop"
              value={recorrenciaTipo}
              onChange={(e) => setRecorrenciaTipo((e.target.value as FolhaPagamentoRecorrenciaTipo) || '')}
              className={inputClass}
            >
              <option value="">Sem recorrência</option>
              <option value="mensal">Mensal</option>
              <option value="quinzenal">Quinzenal (valores diferentes por quinzena)</option>
              <option value="semanal">Semanal</option>
              <option value="personalizado">Personalizado</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Quinzenal: defina valor da 1ª e 2ª quinzena abaixo.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="cpf" className={labelClass}>CPF</label>
          <input
            id="cpf"
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            className={inputClass}
            placeholder="000.000.000-00"
          />
        </div>

        {!folha && recorrenciaTipo === 'quinzenal' ? (
          <div>
            <label htmlFor="valor" className={labelClass}>Valor *</label>
            <input
              id="valor"
              type="text"
              inputMode="decimal"
              required
              value={valor}
              onChange={(e) => setValor(sanitizeCurrencyInput(e.target.value))}
              onBlur={() => {
                if (valor) {
                  setValor(formatCurrencyInput(valor))
                }
              }}
              className={inputClass}
              placeholder="0,00"
            />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="valorQuinzena1" className={labelClass}>Valor 1ª quinzena *</label>
              <input
                id="valorQuinzena1"
                type="text"
                inputMode="decimal"
                required
                value={valorQuinzena1}
                onChange={(e) => setValorQuinzena1(sanitizeCurrencyInput(e.target.value))}
                onBlur={() => {
                  if (valorQuinzena1) setValorQuinzena1(formatCurrencyInput(valorQuinzena1))
                }}
                className={inputClass}
                placeholder="0,00"
              />
            </div>
            <div>
              <label htmlFor="valorQuinzena2" className={labelClass}>Valor 2ª quinzena *</label>
              <input
                id="valorQuinzena2"
                type="text"
                inputMode="decimal"
                required
                value={valorQuinzena2}
                onChange={(e) => setValorQuinzena2(sanitizeCurrencyInput(e.target.value))}
                onBlur={() => {
                  if (valorQuinzena2) setValorQuinzena2(formatCurrencyInput(valorQuinzena2))
                }}
                className={inputClass}
                placeholder="0,00"
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="agencia" className={labelClass}>Agência</label>
          <input
            id="agencia"
            type="text"
            value={agencia}
            onChange={(e) => setAgencia(e.target.value)}
            className={inputClass}
            placeholder="Ex: 1234"
          />
        </div>

        <div>
          <label htmlFor="conta" className={labelClass}>Conta</label>
          <input
            id="conta"
            type="text"
            value={conta}
            onChange={(e) => setConta(e.target.value)}
            className={inputClass}
            placeholder="Ex: 12345-6"
          />
        </div>
      </div>

      {/* Recorrência - seção destacada para aparecer tanto em adicionar quanto editar */}
      <div className="border border-brand/30 rounded-xl p-4 sm:p-5 bg-dark-400/60 space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">Recorrência</h3>
          <p className="text-xs text-gray-500 mt-1">
            Selecione Mensal ou Quinzenal para configurar dias de vencimento (ex.: 5º dia útil e dia 20).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="recorrenciaTipo" className={labelClass}>Tipo (opcional)</label>
            <select
              id="recorrenciaTipo"
              value={recorrenciaTipo}
              onChange={(e) => setRecorrenciaTipo((e.target.value as FolhaPagamentoRecorrenciaTipo) || '')}
              className={inputClass}
            >
              <option value="">Sem recorrência</option>
              <option value="mensal">Mensal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="semanal">Semanal</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          <div className={recorrenciaTipo === 'personalizado' ? '' : 'hidden'}>
              <label htmlFor="recorrenciaIntervaloDias" className={labelClass}>Intervalo (dias)</label>
              <input
                id="recorrenciaIntervaloDias"
                type="number"
                min={1}
                value={recorrenciaIntervaloDias}
                onChange={(e) => setRecorrenciaIntervaloDias(Number(e.target.value) || 1)}
                className={inputClass}
                placeholder="Ex: 10"
              />
            </div>

            <div className={recorrenciaTipo && !isIndeterminada ? '' : 'hidden'}>
              <label htmlFor="recorrenciaTotal" className={labelClass}>Gerar lançamentos</label>
              <div className="mt-1 flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={gerarRecorrencia}
                    onChange={(e) => setGerarRecorrencia(e.target.checked)}
                  />
                  Gerar futuros
                </label>
                <input
                  id="recorrenciaTotal"
                  type="number"
                  min={2}
                  max={60}
                  disabled={!gerarRecorrencia}
                  value={recorrenciaTotal}
                  onChange={(e) => setRecorrenciaTotal(Number(e.target.value) || 2)}
                  className="w-28 px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
                />
                <span className="text-xs text-gray-500">até 60</span>
              </div>
            </div>

            <div className={isIndeterminada ? '' : 'hidden'}>
              <label htmlFor="recorrenciaDiaUtil" className={labelClass}>Dia útil (padrão)</label>
              <input
                id="recorrenciaDiaUtil"
                type="number"
                min={1}
                max={22}
                value={recorrenciaDiaUtil}
                onChange={(e) => setRecorrenciaDiaUtil(Number(e.target.value) || 5)}
                className={inputClass}
                placeholder="5"
              />
              <p className="mt-1 text-xs text-gray-500">
                Mensal: paga no {recorrenciaDiaUtil}º dia útil. Quinzenal: 1º pagamento no {recorrenciaDiaUtil}º dia útil.
              </p>
            </div>

            <div className={recorrenciaTipo === 'quinzenal' ? '' : 'hidden'}>
              <label htmlFor="recorrenciaDiaMes2" className={labelClass}>2º pagamento (dia do mês)</label>
              <input
                id="recorrenciaDiaMes2"
                type="number"
                min={1}
                max={31}
                value={recorrenciaDiaMes2}
                onChange={(e) => setRecorrenciaDiaMes2(Number(e.target.value) || 20)}
                className={inputClass}
                placeholder="20"
              />
              <p className="mt-1 text-xs text-gray-500">
                Quinzenal: 2º pagamento no dia {recorrenciaDiaMes2}.
              </p>
            </div>
          </div>
      </div>

      <div className="border border-dark-100 rounded-xl p-4 sm:p-5 bg-dark-400/40 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">Controle de Pagamento</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status" className={labelClass}>Status *</label>
            <select
              id="status"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as FolhaPagamentoStatus)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="valorPago" className={labelClass}>Valor Pago</label>
            <input
              id="valorPago"
              type="text"
              inputMode="decimal"
              value={valorPago}
              onChange={(e) => {
                const next = sanitizeCurrencyInput(e.target.value)
                setValorPago(next)
                syncStatusFromValorPago(next)
              }}
              onBlur={() => {
                if (valorPago) {
                  setValorPago(formatCurrencyInput(valorPago))
                }
              }}
              className={inputClass}
              placeholder="0,00"
            />
          </div>

          <div>
            <label htmlFor="formaPagamento" className={labelClass}>Forma de Pagamento</label>
            <select
              id="formaPagamento"
              value={formaPagamento}
              onChange={(e) => {
                setFormaPagamento(e.target.value as FolhaPagamentoFormaPagamento)
                if (status === 'aberto') {
                  ensurePagamentoDefaults()
                  setStatus('parcial')
                }
              }}
              className={inputClass}
            >
              <option value="">Selecione</option>
              {FORMAS_PAGAMENTO.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dataReferencia" className={labelClass}>Data de Referência *</label>
            <input
              id="dataReferencia"
              type="date"
              required
              value={dataReferencia}
              onChange={(e) => {
                setDataReferenciaTouched(true)
                setDataReferencia(e.target.value)
              }}
              className={inputClass}
            />
            {isIndeterminada && (
              <p className="mt-1 text-xs text-gray-500">
                Dica: para Mensal/Quinzenal, use o vencimento padrao (5º dia útil e/ou dia 20). Pode ajustar se algum funcionário receber diferente.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="dataPagamento" className={labelClass}>Data de Pagamento</label>
            <input
              id="dataPagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => {
                setDataPagamento(e.target.value)
                if (status === 'aberto') {
                  ensurePagamentoDefaults()
                  setStatus('parcial')
                }
              }}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="comprovanteFolha" className={labelClass}>Comprovante de Pagamento (PDF ou imagem)</label>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <label className="flex items-center px-4 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-300 cursor-pointer hover:border-brand hover:text-brand transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              {comprovanteFile ? 'Trocar comprovante' : comprovanteUrl ? 'Substituir comprovante' : 'Escolher comprovante'}
              <input
                id="comprovanteFolha"
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setComprovanteFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            <span className="text-sm text-gray-400 truncate max-w-full">
              {comprovanteFile?.name || (comprovanteUrl ? 'Comprovante anexado' : 'Nenhum arquivo enviado')}
            </span>
            {comprovanteUrl && (
              <a
                href={comprovanteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-brand hover:text-brand-light"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Abrir comprovante atual
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-dark-500 border border-dark-100 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Valor Total</p>
            <p className="text-sm font-semibold text-gray-100">
              {valorTotalDisplay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="bg-dark-500 border border-dark-100 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Pago</p>
            <p className="text-sm font-semibold text-success">
              {valorPagoNumber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="bg-dark-500 border border-dark-100 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Em Aberto</p>
            <p className="text-sm font-semibold text-warning">
              {valorAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="observacoes" className={labelClass}>Observações</label>
        <textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Ex: pago em 2x, observações sobre desconto, etc."
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-dark-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center px-4 py-2.5 border border-dark-100 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors min-h-touch"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || authLoading || !user}
          className="flex items-center justify-center px-6 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light disabled:opacity-50 transition-colors min-h-touch"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : authLoading ? 'Carregando...' : folha ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
