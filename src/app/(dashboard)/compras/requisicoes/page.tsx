'use client'

import { useEffect, useMemo, useState } from 'react'
import { Requisicao, Cotacao, RequisicaoStatus } from '@/types/compras'
import { getRequisicoes, deleteRequisicao, updateRequisicao } from '@/lib/db/requisicoes'
import { getCotacoes } from '@/lib/db/cotacoes'
import { getObras } from '@/lib/db/obras'
import { Obra } from '@/types/obra'
import Link from 'next/link'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  FileCheck,
  ShoppingCart,
  CheckSquare,
  Square,
  Save,
} from 'lucide-react'

type BatchBoolean = 'manter' | 'marcar' | 'desmarcar'

const STATUS_OPTIONS: { value: RequisicaoStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_cotacao', label: 'Em cotação' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'comprado', label: 'Comprado' },
  { value: 'entregue', label: 'Entregue' },
]

function getStatusBadge(status: RequisicaoStatus): string {
  if (status === 'entregue') return 'bg-success/20 text-success'
  if (status === 'comprado') return 'bg-blue-500/20 text-blue-400'
  if (status === 'aprovado') return 'bg-warning/20 text-warning'
  if (status === 'em_cotacao') return 'bg-purple-500/20 text-purple-400'
  return 'bg-gray-500/20 text-gray-400'
}

export default function RequisicoesPage() {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([])
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchStatus, setBatchStatus] = useState<RequisicaoStatus | ''>('')
  const [batchPedido, setBatchPedido] = useState<BatchBoolean>('manter')
  const [batchAprovado, setBatchAprovado] = useState<BatchBoolean>('manter')
  const [loading, setLoading] = useState(true)
  const [batchLoading, setBatchLoading] = useState(false)
  const [filtros, setFiltros] = useState<{
    obraId: string
    status: RequisicaoStatus | ''
    dataInicio: string
    dataFim: string
    busca: string
  }>({
    obraId: '',
    status: '',
    dataInicio: '',
    dataFim: '',
    busca: '',
  })

  useEffect(() => {
    loadObras()
    loadCotacoes()
  }, [])

  useEffect(() => {
    loadRequisicoes()
  }, [filtros.obraId, filtros.status])

  const loadObras = async () => {
    try {
      const data = await getObras()
      setObras(data)
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    }
  }

  const loadRequisicoes = async () => {
    try {
      const data = await getRequisicoes({
        obraId: filtros.obraId || undefined,
        status: filtros.status || undefined,
      })
      setRequisicoes(data)
    } catch (error) {
      console.error('Erro ao carregar pedidos e compras:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCotacoes = async () => {
    try {
      const data = await getCotacoes()
      setCotacoes(data)
    } catch (error) {
      console.error('Erro ao carregar cotações:', error)
    }
  }

  const getCotacaoByRequisicao = (requisicaoId: string): Cotacao | null => {
    return cotacoes.find((cotacao) => cotacao.requisicaoId === requisicaoId) || null
  }

  const getObraNome = (obraId: string): string => {
    return obras.find((obra) => obra.id === obraId)?.nome || obraId
  }

  const requisicoesFiltradas = useMemo(() => {
    const inicio = filtros.dataInicio ? new Date(filtros.dataInicio) : null
    const fim = filtros.dataFim ? new Date(filtros.dataFim) : null
    if (fim) fim.setHours(23, 59, 59, 999)
    const busca = filtros.busca.trim().toLowerCase()

    return [...requisicoes]
      .filter((requisicao) => {
        const createdAt = toDate(requisicao.createdAt)

        if (inicio && createdAt < inicio) return false
        if (fim && createdAt > fim) return false
        if (!busca) return true

        const itensTexto = requisicao.itens
          .map((item) => `${item.descricao} ${item.info || ''}`)
          .join(' ')
          .toLowerCase()

        return itensTexto.includes(busca)
      })
      .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
  }, [requisicoes, filtros.dataInicio, filtros.dataFim, filtros.busca])

  useEffect(() => {
    const validIds = new Set(requisicoesFiltradas.map((requisicao) => requisicao.id))
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
  }, [requisicoesFiltradas])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    const allIds = requisicoesFiltradas.map((item) => item.id)
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : allIds)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return

    try {
      await deleteRequisicao(id)
      await loadRequisicoes()
    } catch (error) {
      console.error('Erro ao excluir pedido:', error)
      alert('Erro ao excluir pedido')
    }
  }

  const handleToggleFlag = async (
    requisicaoId: string,
    field: 'pedido' | 'aprovado',
    value: boolean
  ) => {
    try {
      const payload = { [field]: value } as Partial<Pick<Requisicao, 'pedido' | 'aprovado'>>
      await updateRequisicao(requisicaoId, payload)
      setRequisicoes((prev) =>
        prev.map((item) => (item.id === requisicaoId ? { ...item, [field]: value } : item))
      )
    } catch (error) {
      console.error(`Erro ao atualizar ${field}:`, error)
      alert('Erro ao atualizar status do pedido')
    }
  }

  const aplicarEdicaoLote = async () => {
    if (selectedIds.length === 0) return

    const payload: Partial<Pick<Requisicao, 'status' | 'pedido' | 'aprovado'>> = {}

    if (batchStatus) payload.status = batchStatus
    if (batchPedido !== 'manter') payload.pedido = batchPedido === 'marcar'
    if (batchAprovado !== 'manter') payload.aprovado = batchAprovado === 'marcar'

    if (Object.keys(payload).length === 0) {
      alert('Selecione ao menos um campo para editar em lote.')
      return
    }

    const confirmacao = confirm(`Aplicar edição em lote para ${selectedIds.length} pedido(s)?`)
    if (!confirmacao) return

    try {
      setBatchLoading(true)
      await Promise.all(selectedIds.map((id) => updateRequisicao(id, payload)))
      setSelectedIds([])
      await loadRequisicoes()
      alert('Pedidos atualizados com sucesso.')
    } catch (error) {
      console.error('Erro ao aplicar edição em lote:', error)
      alert('Erro ao atualizar pedidos em lote.')
    } finally {
      setBatchLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Pedidos e Compras</h1>
        <Link
          href="/compras/requisicoes/nova"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Link>
      </div>

      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Busca</label>
            <input
              type="text"
              value={filtros.busca}
              onChange={(e) => setFiltros((prev) => ({ ...prev, busca: e.target.value }))}
              placeholder="Descrição dos itens..."
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Obra</label>
            <select
              value={filtros.obraId}
              onChange={(e) => setFiltros((prev) => ({ ...prev, obraId: e.target.value }))}
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Todas</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select
              value={filtros.status}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, status: (e.target.value as RequisicaoStatus) || '' }))
              }
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Data início</label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros((prev) => ({ ...prev, dataInicio: e.target.value }))}
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Data fim</label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros((prev) => ({ ...prev, dataFim: e.target.value }))}
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 border border-brand/30 bg-brand/10 rounded-xl p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-brand font-medium">{selectedIds.length} pedido(s) selecionado(s)</p>
              <p className="text-xs text-gray-400 mt-1">Editar status e flags de pedido/aprovação em lote.</p>
            </div>
            <button
              onClick={aplicarEdicaoLote}
              disabled={batchLoading}
              className="inline-flex items-center px-4 py-2.5 bg-success text-dark-800 font-semibold rounded-lg hover:bg-success/80 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {batchLoading ? 'Aplicando...' : 'Editar em Lote'}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <select
                value={batchStatus}
                onChange={(e) => setBatchStatus((e.target.value as RequisicaoStatus) || '')}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">Manter atual</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Pedido</label>
              <select
                value={batchPedido}
                onChange={(e) => setBatchPedido(e.target.value as BatchBoolean)}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="manter">Manter</option>
                <option value="marcar">Marcar</option>
                <option value="desmarcar">Desmarcar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Aprovado</label>
              <select
                value={batchAprovado}
                onChange={(e) => setBatchAprovado(e.target.value as BatchBoolean)}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="manter">Manter</option>
                <option value="marcar">Marcar</option>
                <option value="desmarcar">Desmarcar</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {requisicoesFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          Nenhum pedido encontrado com os filtros aplicados
        </div>
      ) : (
        <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-dark-400 border-b border-dark-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm text-gray-400">
              Mostrando {requisicoesFiltradas.length} pedido(s)
            </p>
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center text-sm text-brand hover:text-brand-light"
            >
              {requisicoesFiltradas.length > 0 &&
              requisicoesFiltradas.every((requisicao) => selectedIds.includes(requisicao.id)) ? (
                <CheckSquare className="w-4 h-4 mr-1.5" />
              ) : (
                <Square className="w-4 h-4 mr-1.5" />
              )}
              Selecionar todos
            </button>
          </div>

          <ul className="divide-y divide-dark-100">
            {requisicoesFiltradas.map((requisicao) => {
              const cotacao = getCotacaoByRequisicao(requisicao.id)
              return (
                <li key={requisicao.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleSelect(requisicao.id)}
                        className="mt-0.5 text-gray-300 hover:text-brand transition-colors"
                      >
                        {selectedIds.includes(requisicao.id) ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2">
                              <p className="text-sm font-medium text-gray-100">
                                Obra: {getObraNome(requisicao.obraId)}
                              </p>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(requisicao.status)}`}>
                                {requisicao.status}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-gray-400">
                              {requisicao.itens.length} item(ns) | Criado em {format(toDate(requisicao.createdAt), 'dd/MM/yyyy')}
                              {' '}| Entrega {requisicao.dataEntrega ? format(toDate(requisicao.dataEntrega), 'dd/MM/yyyy') : '-'}
                            </p>

                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl">
                              <label className="inline-flex items-center text-xs text-gray-300 gap-2">
                                <input
                                  type="checkbox"
                                  checked={!!requisicao.pedido}
                                  onChange={(e) => handleToggleFlag(requisicao.id, 'pedido', e.target.checked)}
                                  className="h-4 w-4 rounded border-dark-100 bg-dark-300 text-brand focus:ring-brand"
                                />
                                Pedido realizado
                              </label>
                              <label className="inline-flex items-center text-xs text-gray-300 gap-2">
                                <input
                                  type="checkbox"
                                  checked={!!requisicao.aprovado}
                                  onChange={(e) => handleToggleFlag(requisicao.id, 'aprovado', e.target.checked)}
                                  className="h-4 w-4 rounded border-dark-100 bg-dark-300 text-brand focus:ring-brand"
                                />
                                Aprovado para compra
                              </label>
                            </div>

                            <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                              {requisicao.itens.slice(0, 3).map((item, index) => (
                                <p key={`${item.descricao}-${index}`}>
                                  {item.descricao} ({item.quantidade})
                                </p>
                              ))}
                              {requisicao.itens.length > 3 && <p>+ {requisicao.itens.length - 3} item(ns)</p>}
                            </div>

                            {cotacao && (
                              <div className="mt-3 p-2.5 bg-brand/10 border border-brand/30 rounded-lg text-xs">
                                <span className="text-brand font-medium flex items-center">
                                  <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                                  Cotação gerada
                                </span>
                                <span className="text-gray-400 block mt-1">
                                  Status: {cotacao.status === 'pendente' ? 'Aguardando aprovação' : cotacao.status}
                                </span>
                                {cotacao.menorPreco > 0 && (
                                  <span className="text-success block mt-1">
                                    Menor preço: R$ {cotacao.menorPreco.toFixed(2).replace('.', ',')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/compras/requisicoes/${requisicao.id}`}
                              className="flex items-center px-3 py-2 text-sm bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              Detalhes
                            </Link>
                            <Link
                              href={`/compras/requisicoes/${requisicao.id}/editar`}
                              className="flex items-center px-3 py-2 text-sm bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                            >
                              <Edit2 className="w-4 h-4 mr-1.5" />
                              Editar
                            </Link>
                            <button
                              onClick={() => handleDelete(requisicao.id)}
                              className="flex items-center px-3 py-2 text-sm bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 mr-1.5" />
                              Deletar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
