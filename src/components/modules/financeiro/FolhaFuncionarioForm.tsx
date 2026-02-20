'use client'

import { useEffect, useState } from 'react'
import type { FolhaFuncionario, FolhaFuncionarioRecorrenciaTipo } from '@/types/financeiro'
import type { ContaPagarFormaPagamento } from '@/types/financeiro'
import { createFolhaFuncionario, updateFolhaFuncionario } from '@/lib/db/folhaFuncionarios'
import { getFolhaPagamentoCategorias } from '@/lib/db/folhaPagamentoCategorias'
import { getObras } from '@/lib/db/obras'
import { gerarContasFolha } from '@/lib/folha/gerarContasFolha'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toDate } from '@/utils/date'
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '@/utils/currency'
import { AlertCircle, ArrowLeft, Save } from 'lucide-react'

const FORMAS_PAGAMENTO: { value: ContaPagarFormaPagamento; label: string }[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'ted', label: 'TED' },
  { value: 'doc', label: 'DOC' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'outro', label: 'Outro' },
]

const RECORRENCIA_OPTIONS: { value: FolhaFuncionarioRecorrenciaTipo; label: string }[] = [
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'avulso', label: 'Avulso' },
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

interface FolhaFuncionarioFormProps {
  funcionario?: FolhaFuncionario
  onSuccess?: () => void
}

export function FolhaFuncionarioForm({ funcionario, onSuccess }: FolhaFuncionarioFormProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [nome, setNome] = useState(funcionario?.nome ?? '')
  const [cpf, setCpf] = useState(funcionario?.cpf ? formatCpf(funcionario.cpf) : '')
  const [agencia, setAgencia] = useState(funcionario?.agencia ?? '')
  const [conta, setConta] = useState(funcionario?.conta ?? '')
  const [categoriaId, setCategoriaId] = useState(funcionario?.categoriaId ?? '')
  const [obraId, setObraId] = useState(funcionario?.obraId ?? '')
  const [formaPagamento, setFormaPagamento] = useState<ContaPagarFormaPagamento | ''>(
    funcionario?.formaPagamento ?? 'pix'
  )
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<FolhaFuncionarioRecorrenciaTipo>(
    funcionario?.recorrenciaTipo ?? 'quinzenal'
  )
  const [diaUtil, setDiaUtil] = useState(funcionario?.diaUtil ?? 5)
  const [diaMes2, setDiaMes2] = useState(funcionario?.diaMes2 ?? 20)
  const [diaMensal, setDiaMensal] = useState(funcionario?.diaMensal ?? 20)
  const [valorMensal, setValorMensal] = useState(
    funcionario?.valorMensal !== undefined ? formatCurrencyInput(funcionario.valorMensal) : ''
  )
  const [valorQuinzena1, setValorQuinzena1] = useState(
    funcionario?.valorQuinzena1 !== undefined ? formatCurrencyInput(funcionario.valorQuinzena1) : ''
  )
  const [valorQuinzena2, setValorQuinzena2] = useState(
    funcionario?.valorQuinzena2 !== undefined ? formatCurrencyInput(funcionario.valorQuinzena2) : ''
  )
  const [valorSemanal, setValorSemanal] = useState(
    funcionario?.valorSemanal !== undefined ? formatCurrencyInput(funcionario.valorSemanal) : ''
  )
  const [valorAvulso, setValorAvulso] = useState(
    funcionario?.valorAvulso !== undefined ? formatCurrencyInput(funcionario.valorAvulso) : ''
  )
  const [dataAvulso, setDataAvulso] = useState(
    funcionario?.dataAvulso ? toInputDate(toDate(funcionario.dataAvulso)) : toInputDate(new Date())
  )
  const [categorias, setCategorias] = useState<Array<{ id: string; nome: string }>>([])
  const [obras, setObras] = useState<Array<{ id: string; nome: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const [catsResult, obsResult] = await Promise.allSettled([
        getFolhaPagamentoCategorias(),
        getObras(),
      ])
      if (catsResult.status === 'fulfilled') {
        setCategorias(catsResult.value.map((c) => ({ id: c.id, nome: c.nome })))
      } else {
        console.warn('Erro ao carregar categorias da folha:', catsResult.reason)
      }
      if (obsResult.status === 'fulfilled') {
        setObras(obsResult.value.map((o) => ({ id: o.id, nome: o.nome })))
      } else {
        console.warn('Erro ao carregar obras:', obsResult.reason)
      }
    }
    load()
  }, [])

  const inputClass =
    'mt-1 block w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch'
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!user) {
      setError('Sessão expirada. Faça login novamente.')
      return
    }

    const cpfDigits = cpf.replace(/\D/g, '')
    if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
      setError('CPF deve ter 11 dígitos')
      return
    }
    if (!nome.trim()) {
      setError('Informe o nome do funcionário')
      return
    }

    if (recorrenciaTipo === 'quinzenal') {
      const v1 = parseCurrencyInput(valorQuinzena1)
      const v2 = parseCurrencyInput(valorQuinzena2)
      if (v1 <= 0 || v2 <= 0) {
        setError('Informe os valores da 1ª e 2ª quinzena')
        return
      }
    } else if (recorrenciaTipo === 'mensal') {
      if (parseCurrencyInput(valorMensal) <= 0) {
        setError('Informe o valor mensal')
        return
      }
    } else if (recorrenciaTipo === 'semanal') {
      if (parseCurrencyInput(valorSemanal) <= 0) {
        setError('Informe o valor semanal')
        return
      }
    } else if (recorrenciaTipo === 'avulso') {
      if (parseCurrencyInput(valorAvulso) <= 0) {
        setError('Informe o valor avulso')
        return
      }
    }

    setLoading(true)
    try {
      const payload: Omit<FolhaFuncionario, 'id' | 'createdAt'> = {
        nome: nome.trim(),
        cpf: cpfDigits || undefined,
        agencia: agencia.trim() || undefined,
        conta: conta.trim() || undefined,
        categoriaId: categoriaId || undefined,
        obraId: obraId.trim(),
        formaPagamento: formaPagamento || undefined,
        recorrenciaTipo,
        ativo: true,
        createdBy: user.id,
      }
      if (recorrenciaTipo === 'quinzenal') {
        payload.diaUtil = diaUtil
        payload.diaMes2 = diaMes2
        payload.valorQuinzena1 = parseCurrencyInput(valorQuinzena1)
        payload.valorQuinzena2 = parseCurrencyInput(valorQuinzena2)
      } else if (recorrenciaTipo === 'mensal') {
        payload.diaMensal = diaMensal
        payload.valorMensal = parseCurrencyInput(valorMensal)
      } else if (recorrenciaTipo === 'semanal') {
        payload.valorSemanal = parseCurrencyInput(valorSemanal)
      } else {
        payload.valorAvulso = parseCurrencyInput(valorAvulso)
        payload.dataAvulso = new Date(dataAvulso + 'T12:00:00')
      }

      if (funcionario) {
        await updateFolhaFuncionario(funcionario.id, payload)
        const updated = await import('@/lib/db/folhaFuncionarios').then((m) => m.getFolhaFuncionario(funcionario.id))
        if (updated) await gerarContasFolha(updated, user.id, { replaceFuture: true })
      } else {
        const id = await createFolhaFuncionario(payload)
        const created = await import('@/lib/db/folhaFuncionarios').then((m) => m.getFolhaFuncionario(id))
        if (created) await gerarContasFolha(created, user.id)
      }

      if (onSuccess) onSuccess()
      else router.push('/financeiro/folha-pagamento')
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar')
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
          <label htmlFor="nome" className={labelClass}>Nome *</label>
          <input
            id="nome"
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputClass}
            placeholder="Nome completo"
          />
        </div>
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
        <div>
          <label htmlFor="formaPagamento" className={labelClass}>Forma de pagamento</label>
          <select
            id="formaPagamento"
            value={formaPagamento}
            onChange={(e) => setFormaPagamento((e.target.value as ContaPagarFormaPagamento) || 'pix')}
            className={inputClass}
          >
            {FORMAS_PAGAMENTO.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="agencia" className={labelClass}>Agência</label>
          <input id="agencia" type="text" value={agencia} onChange={(e) => setAgencia(e.target.value)} className={inputClass} placeholder="Ex: 1234" />
        </div>
        <div>
          <label htmlFor="conta" className={labelClass}>Conta</label>
          <input id="conta" type="text" value={conta} onChange={(e) => setConta(e.target.value)} className={inputClass} placeholder="Ex: 12345-6" />
        </div>
        <div>
          <label htmlFor="categoriaId" className={labelClass}>Categoria</label>
          <select id="categoriaId" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={inputClass}>
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="obraId" className={labelClass}>Obra</label>
          <select id="obraId" value={obraId} onChange={(e) => setObraId(e.target.value)} className={inputClass}>
            <option value="">Nenhuma</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-brand/30 rounded-xl p-4 sm:p-5 bg-dark-400/60 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">Recorrência e valores</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="recorrenciaTipo" className={labelClass}>Forma de receber *</label>
            <select
              id="recorrenciaTipo"
              value={recorrenciaTipo}
              onChange={(e) => setRecorrenciaTipo(e.target.value as FolhaFuncionarioRecorrenciaTipo)}
              className={inputClass}
            >
              {RECORRENCIA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {recorrenciaTipo === 'quinzenal' && (
            <>
              <div>
                <label htmlFor="diaUtil" className={labelClass}>1º pagamento (dia útil)</label>
                <input id="diaUtil" type="number" min={1} max={22} value={diaUtil} onChange={(e) => setDiaUtil(Number(e.target.value) || 5)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="diaMes2" className={labelClass}>2º pagamento (dia do mês)</label>
                <input id="diaMes2" type="number" min={1} max={31} value={diaMes2} onChange={(e) => setDiaMes2(Number(e.target.value) || 20)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="valorQuinzena1" className={labelClass}>Valor 1ª quinzena *</label>
                <input
                  id="valorQuinzena1"
                  type="text"
                  inputMode="decimal"
                  value={valorQuinzena1}
                  onChange={(e) => setValorQuinzena1(sanitizeCurrencyInput(e.target.value))}
                  onBlur={() => valorQuinzena1 && setValorQuinzena1(formatCurrencyInput(valorQuinzena1))}
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
                  value={valorQuinzena2}
                  onChange={(e) => setValorQuinzena2(sanitizeCurrencyInput(e.target.value))}
                  onBlur={() => valorQuinzena2 && setValorQuinzena2(formatCurrencyInput(valorQuinzena2))}
                  className={inputClass}
                  placeholder="0,00"
                />
              </div>
            </>
          )}

          {recorrenciaTipo === 'mensal' && (
            <>
              <div>
                <label htmlFor="diaMensal" className={labelClass}>Dia do mês</label>
                <input id="diaMensal" type="number" min={1} max={31} value={diaMensal} onChange={(e) => setDiaMensal(Number(e.target.value) || 20)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="valorMensal" className={labelClass}>Valor mensal *</label>
                <input
                  id="valorMensal"
                  type="text"
                  inputMode="decimal"
                  value={valorMensal}
                  onChange={(e) => setValorMensal(sanitizeCurrencyInput(e.target.value))}
                  onBlur={() => valorMensal && setValorMensal(formatCurrencyInput(valorMensal))}
                  className={inputClass}
                  placeholder="0,00"
                />
              </div>
            </>
          )}

          {recorrenciaTipo === 'semanal' && (
            <div>
              <label htmlFor="valorSemanal" className={labelClass}>Valor semanal *</label>
              <input
                id="valorSemanal"
                type="text"
                inputMode="decimal"
                value={valorSemanal}
                onChange={(e) => setValorSemanal(sanitizeCurrencyInput(e.target.value))}
                onBlur={() => valorSemanal && setValorSemanal(formatCurrencyInput(valorSemanal))}
                className={inputClass}
                placeholder="0,00"
              />
            </div>
          )}

          {recorrenciaTipo === 'avulso' && (
            <>
              <div>
                <label htmlFor="valorAvulso" className={labelClass}>Valor *</label>
                <input
                  id="valorAvulso"
                  type="text"
                  inputMode="decimal"
                  value={valorAvulso}
                  onChange={(e) => setValorAvulso(sanitizeCurrencyInput(e.target.value))}
                  onBlur={() => valorAvulso && setValorAvulso(formatCurrencyInput(valorAvulso))}
                  className={inputClass}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label htmlFor="dataAvulso" className={labelClass}>Data</label>
                <input id="dataAvulso" type="date" value={dataAvulso} onChange={(e) => setDataAvulso(e.target.value)} className={inputClass} />
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500">Ao salvar, serão geradas contas a pagar (tipo folha) para os próximos 12 meses. Na edição do funcionário você pode gerar também lançamentos no passado (meses já decorridos).</p>
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
          {loading ? 'Salvando...' : funcionario ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
