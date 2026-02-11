'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Wallet, Plus, Trash2, Save } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'
import {
  addGastoCaixinha,
  getCaixinhaMes,
  removeGastoCaixinha,
  updateValorInicialCaixinha,
  type CaixinhaMensal,
} from '@/lib/db/caixinha'
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '@/utils/currency'

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export default function CaixinhaPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const permissions = getPermissions(user)
  const canAccessCaixinha = permissions.canAccessCaixinha

  const now = useMemo(() => new Date(), [])
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [caixinha, setCaixinha] = useState<CaixinhaMensal | null>(null)
  const [valorInicialInput, setValorInicialInput] = useState('600,00')
  const [descricao, setDescricao] = useState('')
  const [valorGastoInput, setValorGastoInput] = useState('')
  const [dataGasto, setDataGasto] = useState(now.toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && user && !canAccessCaixinha) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, canAccessCaixinha, router])

  useEffect(() => {
    if (authLoading || !canAccessCaixinha) return
    loadCaixinha()
  }, [authLoading, mes, ano, canAccessCaixinha])

  const loadCaixinha = async () => {
    try {
      setLoading(true)
      const data = await getCaixinhaMes(ano, mes)
      setCaixinha(data)
      setValorInicialInput(formatCurrencyInput(data.valorInicial))
    } catch (error) {
      console.error('Erro ao carregar caixinha:', error)
      alert('Erro ao carregar caixinha')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const handleSalvarValorInicial = async () => {
    const valor = parseCurrencyInput(valorInicialInput)
    if (valor <= 0) {
      alert('Informe um valor inicial válido.')
      return
    }

    try {
      setSaving(true)
      await updateValorInicialCaixinha(ano, mes, valor)
      await loadCaixinha()
    } catch (error) {
      console.error('Erro ao salvar valor inicial:', error)
      alert('Erro ao salvar valor inicial')
    } finally {
      setSaving(false)
    }
  }

  const handleAdicionarGasto = async () => {
    if (!user) return
    const valor = parseCurrencyInput(valorGastoInput)

    if (!descricao.trim()) {
      alert('Informe a descrição do gasto.')
      return
    }
    if (valor <= 0) {
      alert('Informe um valor válido para o gasto.')
      return
    }

    try {
      setSaving(true)
      await addGastoCaixinha(ano, mes, {
        descricao: descricao.trim(),
        valor,
        data: new Date(`${dataGasto}T12:00:00`),
        criadoPor: user.id,
      })
      setDescricao('')
      setValorGastoInput('')
      setDataGasto(new Date().toISOString().split('T')[0])
      await loadCaixinha()
    } catch (error) {
      console.error('Erro ao adicionar gasto:', error)
      alert('Erro ao adicionar gasto')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoverGasto = async (gastoId: string) => {
    if (!confirm('Remover este gasto da caixinha?')) return

    try {
      setSaving(true)
      await removeGastoCaixinha(ano, mes, gastoId)
      await loadCaixinha()
    } catch (error) {
      console.error('Erro ao remover gasto:', error)
      alert('Erro ao remover gasto')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!canAccessCaixinha) {
    return null
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="w-7 h-7 text-brand" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand">Caixinha do Escritório</h1>
          <p className="text-sm text-gray-400 mt-1">Controle mensal de gastos com saldo atualizado automaticamente.</p>
        </div>
      </div>

      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mês</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100"
            >
              {MESES.map((nome, index) => (
                <option key={nome} value={index + 1}>
                  {nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Ano</label>
            <input
              type="number"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value) || now.getFullYear())}
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Valor mensal</label>
            <input
              type="text"
              inputMode="decimal"
              value={valorInicialInput}
              onChange={(e) => setValorInicialInput(sanitizeCurrencyInput(e.target.value))}
              onBlur={() => setValorInicialInput((prev) => (prev ? formatCurrencyInput(prev) : ''))}
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100"
            />
          </div>

          <button
            onClick={handleSalvarValorInicial}
            disabled={saving}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Atualizar valor
          </button>
        </div>
      </div>

      {caixinha && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Valor Inicial</p>
              <p className="text-lg font-semibold text-gray-100">{formatCurrency(caixinha.valorInicial)}</p>
            </div>
            <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total de Gastos</p>
              <p className="text-lg font-semibold text-error">
                {formatCurrency(caixinha.gastos.reduce((acc, item) => acc + item.valor, 0))}
              </p>
            </div>
            <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Saldo Restante</p>
              <p className="text-lg font-semibold text-success">{formatCurrency(caixinha.saldo)}</p>
            </div>
          </div>

          <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-5 mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand mb-3">Adicionar Gasto</h2>
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_180px_180px_auto] gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Valor</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorGastoInput}
                  onChange={(e) => setValorGastoInput(sanitizeCurrencyInput(e.target.value))}
                  onBlur={() => setValorGastoInput((prev) => (prev ? formatCurrencyInput(prev) : ''))}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data</label>
                <input
                  type="date"
                  value={dataGasto}
                  onChange={(e) => setDataGasto(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100"
                />
              </div>
              <button
                onClick={handleAdicionarGasto}
                disabled={saving}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-success text-dark-800 font-semibold rounded-lg hover:bg-success/80 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lançar
              </button>
            </div>
          </div>

          <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-dark-400 border-b border-dark-100">
              <p className="text-sm text-gray-400">
                Gastos de {MESES[mes - 1]} / {ano}
              </p>
            </div>
            {caixinha.gastos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhum gasto lançado neste mês.</div>
            ) : (
              <ul className="divide-y divide-dark-100">
                {caixinha.gastos.map((gasto) => (
                  <li key={gasto.id} className="px-4 py-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-gray-100">{gasto.descricao}</p>
                        <p className="text-xs text-gray-500">
                          {format(gasto.data, 'dd/MM/yyyy')} | Lançado em {format(gasto.createdAt, 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-error">{formatCurrency(gasto.valor)}</p>
                        <button
                          onClick={() => handleRemoverGasto(gasto.id)}
                          className="text-error hover:text-red-400 transition-colors"
                          title="Remover gasto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
