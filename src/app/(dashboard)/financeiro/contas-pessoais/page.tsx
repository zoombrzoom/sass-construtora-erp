'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Eye, Pencil, Plus, Tag, Trash2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'
import { deleteContaPagar, getContasPagar, getContasPagarPessoais } from '@/lib/db/contasPagar'
import { migrateContasPessoaisToContasPagar } from '@/lib/migrations/migrateContasPessoais'
import { ContaPagar, ContaPagarStatus } from '@/types/financeiro'
import { toDate } from '@/utils/date'
import { DatePicker } from '@/components/ui/DatePicker'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getErrorMessage(error: unknown): string {
  if (!error) return 'Erro desconhecido'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  const anyErr = error as any
  return String(anyErr?.code || anyErr?.message || 'Erro desconhecido')
}

function isContaPessoal(conta: Partial<ContaPagar>): boolean {
  const obra = String((conta as any)?.obraId || '').trim().toUpperCase()
  return Boolean((conta as any)?.pessoal) || obra === 'PESSOAL'
}

function toInputDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

export default function ContasPessoaisPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const permissions = getPermissions(user)
  const canManage = Boolean(user && (user.role === 'admin' || user.role === 'financeiro'))

  const hoje = new Date()
  // Por padrão, mostra um intervalo bem amplo para evitar "sumir" contas futuras (ex.: próximos meses).
  const inicioPadrao = new Date(hoje)
  inicioPadrao.setFullYear(hoje.getFullYear() - 1)
  inicioPadrao.setHours(12, 0, 0, 0)
  const fimPadrao = new Date(hoje)
  fimPadrao.setFullYear(hoje.getFullYear() + 1)
  fimPadrao.setHours(12, 0, 0, 0)

  const [contas, setContas] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string>('')
  const [migrating, setMigrating] = useState(false)
  const [separarSituacao, setSepararSituacao] = useState(true)
  const [filtros, setFiltros] = useState<{
    status?: ContaPagarStatus
    dataInicio?: string
    dataFim?: string
    busca?: string
  }>(() => ({
    dataInicio: toInputDate(inicioPadrao),
    dataFim: toInputDate(fimPadrao),
  }))

  useEffect(() => {
    if (!authLoading && user && !permissions.canAccessContasPessoais) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, permissions.canAccessContasPessoais, router])

  const loadContas = async () => {
    setLoadError('')
    const includeParticular = permissions.canAccessContasParticulares
    // Para perfis que nao podem ver todas as obras (ex.: engenharia), limita a leitura
    // ao centro de custo permitido para evitar "permission-denied" em queries amplas.
    const obraFiltro = permissions.canViewAllObras ? undefined : user?.obraId

    try {
      // Preferencia: buscar apenas pessoais. Se falhar por regra/indice, faz fallback
      // para carregar e filtrar no cliente (limitando por obra quando necessario).
      let data: ContaPagar[]
      try {
        data = await getContasPagarPessoais({ includeParticular })
      } catch (error) {
        console.error('Falha ao buscar contas pessoais via query dedicada:', error)
        setLoadError(getErrorMessage(error))
        const all = await getContasPagar({ includeParticular, obraId: obraFiltro })
        data = all.filter(isContaPessoal)
      }

      if (data.length > 0) setLoadError('')
      setContas(data)
    } catch (error) {
      console.error('Erro ao carregar contas pessoais (financeiro):', error)
      setLoadError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user || !permissions.canAccessContasPessoais) {
      setLoading(false)
      return
    }

    ;(async () => {
      setLoading(true)
      // Migra lancamentos antigos (colecao "contas_pessoais_*") para "contasPagar" com tag pessoal.
      if (canManage) {
        try {
          setMigrating(true)
          await migrateContasPessoaisToContasPagar({ userId: user.id, limit: 500 })
        } catch (error) {
          console.error('Falha ao migrar contas pessoais:', error)
        } finally {
          setMigrating(false)
        }
      }
      await loadContas()
    })()
  }, [authLoading, user?.id, permissions.canAccessContasPessoais, canManage])

  const contasFiltradas = useMemo(() => {
    let base = [...contas].sort((a, b) => toDate(b.dataVencimento).getTime() - toDate(a.dataVencimento).getTime())

    if (filtros.status) {
      base = base.filter((c) => c.status === filtros.status)
    }

    if (filtros.dataInicio) {
      const inicio = parseDateInput(filtros.dataInicio)
      base = base.filter((c) => toDate(c.dataVencimento) >= inicio)
    }

    if (filtros.dataFim) {
      const fim = parseDateInput(filtros.dataFim)
      fim.setHours(23, 59, 59, 999)
      base = base.filter((c) => toDate(c.dataVencimento) <= fim)
    }

    const busca = filtros.busca?.trim().toLowerCase()
    if (busca) {
      base = base.filter((c) => {
        const desc = c.descricao?.toLowerCase() || ''
        const contato = c.favorecido?.toLowerCase() || ''
        const conta = c.contaPagamento?.toLowerCase() || ''
        return desc.includes(busca) || contato.includes(busca) || conta.includes(busca) || c.id.toLowerCase().includes(busca)
      })
    }

    return base
  }, [contas, filtros])

  const handleDelete = async (conta: ContaPagar) => {
    if (!canManage) return
    const nomeConta = conta.descricao || `Conta ${conta.id.slice(0, 8)}`
    if (!confirm(`Excluir "${nomeConta}"? Essa ação não pode ser desfeita.`)) return

    try {
      await deleteContaPagar(conta.id)
      await loadContas()
    } catch (error) {
      console.error('Erro ao excluir conta pessoal:', error)
      alert('Erro ao excluir conta.')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  const tableCols =
    'lg:grid-cols-[minmax(260px,3fr)_minmax(160px,1.2fr)_minmax(160px,1.2fr)_110px_120px_120px_108px]'

  const contasAbertas = contasFiltradas.filter((c) => c.status !== 'pago')
  const contasPagas = contasFiltradas.filter((c) => c.status === 'pago')

  const renderTabela = (items: ContaPagar[]) => {
    if (items.length === 0) return null
    return (
      <div className="bg-dark-500 border border-dark-100 rounded-xl">
        <div className="px-4 py-3 bg-dark-400 border-b border-dark-100">
          <p className="text-sm text-gray-400">Mostrando {items.length} conta(s)</p>
        </div>

        <div className="overflow-x-auto">
          <div className="w-full">
            <div className={`hidden lg:grid ${tableCols} gap-3 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-dark-100`}>
              <div>Descricao</div>
              <div>Contato</div>
              <div>Conta</div>
              <div>Data</div>
              <div>Situacao</div>
              <div>Valor</div>
              <div className="text-right">Acoes</div>
            </div>

            <ul className="divide-y divide-dark-100">
              {items.map((conta) => (
                <li key={conta.id} className="px-4 py-3">
                  <div className={`grid grid-cols-1 ${tableCols} gap-3 lg:items-center`}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-100 truncate" title={conta.descricao || conta.id}>
                        {conta.descricao || `Conta #${conta.id.slice(0, 8)}`}
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-brand/15 text-brand whitespace-nowrap">
                          pessoal
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        Vencimento: {format(toDate(conta.dataVencimento), 'dd/MM/yyyy')}
                      </p>
                    </div>

                    <div className="text-sm text-gray-300 truncate" title={conta.favorecido || '-'}>
                      {conta.favorecido || '-'}
                    </div>

                    <div className="text-sm text-gray-300 truncate" title={conta.contaPagamento || '-'}>
                      {conta.contaPagamento || '-'}
                    </div>

                    <div className="text-sm text-gray-300 whitespace-nowrap">
                      {format(toDate(conta.dataVencimento), 'dd/MM/yyyy')}
                    </div>

                    <div>
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                          conta.status === 'pago'
                            ? 'bg-success/20 text-success'
                            : conta.status === 'vencido'
                              ? 'bg-error/20 text-error'
                              : 'bg-warning/20 text-warning'
                        }`}
                      >
                        {conta.status === 'pago' ? 'Pago' : 'A Pagar'}
                      </span>
                    </div>

                    <div className="text-base font-semibold text-brand whitespace-nowrap">
                      {formatCurrency(conta.valor)}
                    </div>

                    <div className="flex items-center gap-2 justify-start lg:justify-end">
                      <Link
                        href={`/financeiro/contas-pagar/${conta.id}`}
                        className="p-2 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                        title="Detalhes"
                        aria-label="Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/financeiro/contas-pagar/${conta.id}/editar`}
                        className={`p-2 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors ${
                          !canManage ? 'pointer-events-none opacity-50' : ''
                        }`}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(conta)}
                        className={`p-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors ${
                          !canManage ? 'pointer-events-none opacity-50' : ''
                        }`}
                        title="Excluir"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand">Contas Pessoais</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Aparece no geral de Contas a Pagar com a tag <span className="text-brand font-medium">pessoal</span>.
          </p>
        </div>
        <Link
          href="/financeiro/contas-pagar/nova?pessoal=1"
          className={`flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch ${
            !canManage ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta Pessoal
        </Link>
      </div>

      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select
              value={filtros.status || ''}
              onChange={(e) => setFiltros((p) => ({ ...p, status: (e.target.value as ContaPagarStatus) || undefined }))}
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="vencido">Vencido</option>
              <option value="pago">Pago</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">De</label>
            <DatePicker
              value={filtros.dataInicio || ''}
              onChange={(value) => setFiltros((p) => ({ ...p, dataInicio: value || undefined }))}
              placeholder="Selecionar"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Até</label>
            <DatePicker
              value={filtros.dataFim || ''}
              onChange={(value) => setFiltros((p) => ({ ...p, dataFim: value || undefined }))}
              placeholder="Selecionar"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Buscar</label>
            <input
              type="text"
              value={filtros.busca || ''}
              onChange={(e) => setFiltros((p) => ({ ...p, busca: e.target.value }))}
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Descrição, contato, conta..."
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-dark-100 flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={separarSituacao}
              onChange={(e) => setSepararSituacao(e.target.checked)}
            />
            Separar por situação (visual)
          </label>
          <button
            type="button"
            onClick={() => setFiltros((p) => ({ ...p, dataInicio: toInputDate(inicioPadrao), dataFim: toInputDate(fimPadrao) }))}
            className="text-xs text-brand hover:text-brand-light"
          >
            Voltar para o período padrão
          </button>
        </div>
      </div>

      {migrating && (
        <div className="mb-4 text-xs text-gray-500">
          Migrando contas pessoais antigas para o financeiro...
        </div>
      )}

      {loadError && (
        <div className="mb-4 p-3 rounded-lg border border-error/30 bg-error/10 text-error text-sm">
          Erro ao carregar contas pessoais: <span className="font-medium">{loadError}</span>
        </div>
      )}

      {contasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Nenhuma conta pessoal encontrada.</div>
      ) : separarSituacao && !filtros.status ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">A pagar</h2>
            <p className="text-xs text-gray-500">{contasAbertas.length} item(ns)</p>
          </div>
          {renderTabela(contasAbertas) || (
            <div className="text-center py-8 text-gray-500 bg-dark-500 border border-dark-100 rounded-xl">
              Nenhuma conta a pagar no período.
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Pagas</h2>
            <p className="text-xs text-gray-500">{contasPagas.length} item(ns)</p>
          </div>
          {renderTabela(contasPagas) || (
            <div className="text-center py-8 text-gray-500 bg-dark-500 border border-dark-100 rounded-xl">
              Nenhuma conta paga no período.
            </div>
          )}
        </div>
      ) : (
        renderTabela(contasFiltradas)
      )}
    </div>
  )
}
