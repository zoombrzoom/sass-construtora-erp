'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, CalendarPlus, ChevronLeft, Pencil, Trash2, CheckCircle, Circle, CheckSquare, Square } from 'lucide-react'
import type { ContaPagar, FolhaFuncionario } from '@/types/financeiro'
import { getFolhaFuncionario } from '@/lib/db/folhaFuncionarios'
import {
  getContasPagarPorFolhaFuncionarioId,
  updateContaPagar,
  deleteContaPagar,
} from '@/lib/db/contasPagar'
import { gerarContasFolha, adicionarUmPeriodoParaTras } from '@/lib/folha/gerarContasFolha'
import { useAuth } from '@/hooks/useAuth'
import { toDate } from '@/utils/date'
import { FolhaFuncionarioForm } from '@/components/modules/financeiro/FolhaFuncionarioForm'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function EditarFolhaFuncionarioPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [funcionario, setFuncionario] = useState<FolhaFuncionario | null>(null)
  const [loading, setLoading] = useState(true)
  const [gerandoContas, setGerandoContas] = useState(false)
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [loadingContas, setLoadingContas] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingValorId, setEditingValorId] = useState<string | null>(null)
  const [editingValorInput, setEditingValorInput] = useState('')
  const [selectedContaIds, setSelectedContaIds] = useState<string[]>([])
  const [showValorLoteModal, setShowValorLoteModal] = useState(false)
  const [valorLoteInput, setValorLoteInput] = useState('')
  /** 0 = só próximos 12 meses; 12 ou 24 = incluir passado (X meses atrás + 12 à frente). */
  const [mesesPassadoGerar, setMesesPassadoGerar] = useState<0 | 12 | 24>(0)

  const funcionarioId = params.id as string

  useEffect(() => {
    if (funcionarioId) getFolhaFuncionario(funcionarioId).then(setFuncionario).finally(() => setLoading(false))
  }, [funcionarioId])

  const loadContas = async () => {
    if (!funcionarioId) return
    setLoadingContas(true)
    try {
      const list = await getContasPagarPorFolhaFuncionarioId(funcionarioId)
      list.sort((a, b) => toDate(a.dataVencimento).getTime() - toDate(b.dataVencimento).getTime())
      setContas(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingContas(false)
    }
  }

  useEffect(() => {
    if (funcionarioId) loadContas()
  }, [funcionarioId])

  if (loading) return <div className="text-center py-12 text-gray-400">Carregando...</div>
  if (!funcionario)
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Funcionário não encontrado</p>
        <Link href="/financeiro/folha-pagamento" className="text-brand hover:text-brand-light">
          Voltar para Folha de Pagamento
        </Link>
      </div>
    )

  const handleGerarContas = async () => {
    if (!user || !funcionario) return
    setGerandoContas(true)
    try {
      const criadas = await gerarContasFolha(funcionario, user.id, {
        replaceFuture: mesesPassadoGerar === 0,
        ...(mesesPassadoGerar > 0 && { mesesPassado: mesesPassadoGerar }),
      })
      const msg =
        mesesPassadoGerar === 0
          ? criadas > 0
            ? `${criadas} conta(s) a pagar gerada(s) para os próximos 12 meses.`
            : 'Nenhuma conta nova gerada (já existem para os próximos 12 meses).'
          : criadas > 0
            ? `${criadas} conta(s) a pagar gerada(s) (passado + futuro).`
            : 'Nenhuma conta nova gerada (já existem para o período).'
      alert(msg)
      await loadContas()
    } catch (e) {
      console.error(e)
      alert('Erro ao gerar contas.')
    } finally {
      setGerandoContas(false)
    }
  }

  const handleAdicionarUmPeriodoParaTras = async () => {
    if (!user || !funcionario) return
    if (funcionario.recorrenciaTipo === 'avulso') {
      alert('Funcionário avulso não tem períodos recorrentes para adicionar.')
      return
    }
    setGerandoContas(true)
    try {
      const criadas = await adicionarUmPeriodoParaTras(funcionario, user.id)
      const label =
        funcionario.recorrenciaTipo === 'quinzenal'
          ? '1 mês (2 quinzenas)'
          : funcionario.recorrenciaTipo === 'semanal'
            ? '1 mês (~4 semanas)'
            : '1 mês'
      alert(
        criadas > 0
          ? `${criadas} lançamento(s) adicionado(s) para trás (${label}).`
          : 'Nenhum lançamento novo (já existe para o período anterior).'
      )
      await loadContas()
    } catch (e) {
      console.error(e)
      alert('Erro ao adicionar período.')
    } finally {
      setGerandoContas(false)
    }
  }

  const startEditingValor = (conta: ContaPagar) => {
    setEditingValorId(conta.id)
    setEditingValorInput(conta.valor.toFixed(2).replace('.', ','))
  }

  const cancelEditingValor = () => {
    setEditingValorId(null)
    setEditingValorInput('')
  }

  const saveValorInline = async (contaId: string) => {
    const normalized = editingValorInput.trim().replace(/\./g, '').replace(',', '.')
    const valor = parseFloat(normalized)
    if (Number.isNaN(valor) || valor < 0) {
      alert('Valor inválido. Use número, ex: 22,00 ou 1500.')
      return
    }
    setEditingValorId(null)
    setEditingValorInput('')
    setUpdatingId(contaId)
    try {
      await updateContaPagar(contaId, { valor })
      await loadContas()
    } catch (e) {
      console.error(e)
      alert('Erro ao atualizar valor.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleTogglePago = async (conta: ContaPagar) => {
    setUpdatingId(conta.id)
    try {
      if (conta.status === 'pago') {
        await updateContaPagar(conta.id, { status: 'pendente', dataPagamento: null as unknown as Date })
      } else {
        await updateContaPagar(conta.id, { status: 'pago', dataPagamento: new Date() })
      }
      await loadContas()
    } catch (e) {
      console.error(e)
      alert('Erro ao atualizar status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleExcluirConta = async (conta: ContaPagar) => {
    if (!confirm(`Excluir lançamento de ${format(toDate(conta.dataVencimento), 'dd/MM/yyyy')} - ${formatCurrency(conta.valor)}?`)) return
    setUpdatingId(conta.id)
    try {
      await deleteContaPagar(conta.id)
      await loadContas()
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir.')
    } finally {
      setUpdatingId(null)
    }
  }

  const toggleSelectConta = (id: string) => {
    setSelectedContaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const selectAllContas = () => setSelectedContaIds(contas.map((c) => c.id))
  const deselectAllContas = () => setSelectedContaIds([])

  const selectedContas = contas.filter((c) => selectedContaIds.includes(c.id))
  const selectedPendentes = selectedContas.filter((c) => c.status !== 'pago')
  const selectedPagas = selectedContas.filter((c) => c.status === 'pago')

  const handleExcluirSelecionados = async () => {
    const n = selectedContaIds.length
    if (n === 0) return
    if (!confirm(`Excluir ${n} lançamento(s) selecionado(s)?`)) return
    try {
      await Promise.all(selectedContaIds.map((id) => deleteContaPagar(id)))
      setSelectedContaIds([])
      await loadContas()
      alert(`${n} lançamento(s) excluído(s).`)
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir.')
    }
  }

  const handleMarcarSelecionadosPago = async () => {
    if (selectedPendentes.length === 0) return
    try {
      await Promise.all(
        selectedPendentes.map((c) => updateContaPagar(c.id, { status: 'pago', dataPagamento: new Date() }))
      )
      setSelectedContaIds([])
      await loadContas()
      alert(`${selectedPendentes.length} lançamento(s) marcado(s) como pago.`)
    } catch (e) {
      console.error(e)
      alert('Erro ao atualizar.')
    }
  }

  const handleVoltarSelecionadosAPagar = async () => {
    if (selectedPagas.length === 0) return
    try {
      await Promise.all(
        selectedPagas.map((c) => updateContaPagar(c.id, { status: 'pendente', dataPagamento: null as unknown as Date }))
      )
      setSelectedContaIds([])
      await loadContas()
      alert(`${selectedPagas.length} lançamento(s) voltou(aram) para A pagar.`)
    } catch (e) {
      console.error(e)
      alert('Erro ao atualizar.')
    }
  }

  const openValorLoteModal = () => {
    if (selectedContaIds.length === 0) return
    setValorLoteInput('')
    setShowValorLoteModal(true)
  }

  const closeValorLoteModal = () => {
    setShowValorLoteModal(false)
    setValorLoteInput('')
  }

  const applyValorEmLote = async () => {
    const v = valorLoteInput.trim()
    if (!v) {
      alert('Informe o valor.')
      return
    }
    const normalized = v.replace(/\./g, '').replace(',', '.')
    const valor = parseFloat(normalized)
    if (Number.isNaN(valor) || valor < 0) {
      alert('Valor inválido. Use número, ex: 22,00 ou 1500.')
      return
    }
    const n = selectedContaIds.length
    closeValorLoteModal()
    try {
      await Promise.all(selectedContaIds.map((id) => updateContaPagar(id, { valor })))
      setSelectedContaIds([])
      setEditingValorId(null)
      await loadContas()
      alert(`${n} lançamento(s) atualizado(s) para ${formatCurrency(valor)}.`)
    } catch (e) {
      console.error(e)
      alert('Erro ao atualizar valor.')
    }
  }

  return (
    <div>
      {showValorLoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeValorLoteModal}>
          <div
            className="bg-dark-500 border border-dark-100 rounded-xl p-6 shadow-xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-100 mb-2">Alterar valor em lote</h3>
            <p className="text-sm text-gray-400 mb-4">
              Novo valor (R$) para {selectedContaIds.length} lançamento(s):
            </p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-400">R$</span>
              <input
                type="text"
                value={valorLoteInput}
                onChange={(e) => setValorLoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyValorEmLote()
                  if (e.key === 'Escape') closeValorLoteModal()
                }}
                placeholder="0,00"
                className="flex-1 px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeValorLoteModal}
                className="px-4 py-2 rounded-lg border border-dark-100 text-gray-400 hover:bg-dark-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyValorEmLote}
                className="px-4 py-2 rounded-lg bg-brand text-dark-800 font-medium hover:bg-brand-light transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Editar Funcionário</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mesesPassadoGerar}
            onChange={(e) => setMesesPassadoGerar(Number(e.target.value) as 0 | 12 | 24)}
            className="px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value={0}>Próximos 12 meses</option>
            <option value={12}>Incluir passado (12 meses atrás + 12 à frente)</option>
            <option value={24}>Incluir passado (24 meses atrás + 12 à frente)</option>
          </select>
          <button
            type="button"
            onClick={handleAdicionarUmPeriodoParaTras}
            disabled={gerandoContas || !user || funcionario.recorrenciaTipo === 'avulso'}
            className="flex items-center px-4 py-2 border border-dark-100 rounded-lg text-gray-300 hover:border-brand hover:text-brand transition-colors disabled:opacity-50"
            title={
              funcionario.recorrenciaTipo === 'avulso'
                ? 'Não disponível para avulso'
                : `Adicionar 1 ${funcionario.recorrenciaTipo === 'quinzenal' ? 'mês (2 quinzenas)' : funcionario.recorrenciaTipo === 'semanal' ? 'mês (~4 semanas)' : 'mês'} para trás`
            }
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            +1 para trás
          </button>
          <button
            type="button"
            onClick={handleGerarContas}
            disabled={gerandoContas || !user}
            className="flex items-center px-4 py-2 border border-dark-100 rounded-lg text-gray-300 hover:border-brand hover:text-brand transition-colors disabled:opacity-50"
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            {gerandoContas ? 'Gerando...' : 'Gerar contas'}
          </button>
          <Link
            href="/financeiro/folha-pagamento"
            className="flex items-center px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </div>
      </div>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6 mb-6">
        <FolhaFuncionarioForm
          funcionario={funcionario}
          onSuccess={() => {
            loadContas()
            router.push('/financeiro/folha-pagamento')
          }}
        />
      </div>

      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Lançamentos (Contas a Pagar)</h2>
          {contas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                onClick={selectedContaIds.length === contas.length ? deselectAllContas : selectAllContas}
                className="text-gray-400 hover:text-brand transition-colors"
              >
                {selectedContaIds.length === contas.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
            </div>
          )}
        </div>
        {selectedContaIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-dark-400/50 border border-dark-100 rounded-lg">
            <span className="text-gray-300 text-sm font-medium">{selectedContaIds.length} selecionado(s)</span>
            <button
              type="button"
              onClick={openValorLoteModal}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-dark-300 text-gray-200 hover:bg-brand/20 hover:text-brand transition-colors"
            >
              Alterar valor em lote
            </button>
            {selectedPendentes.length > 0 && (
              <button
                type="button"
                onClick={handleMarcarSelecionadosPago}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors"
              >
                Marcar como pago ({selectedPendentes.length})
              </button>
            )}
            {selectedPagas.length > 0 && (
              <button
                type="button"
                onClick={handleVoltarSelecionadosAPagar}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-warning/20 text-warning hover:bg-warning/30 transition-colors"
              >
                Voltar para A pagar ({selectedPagas.length})
              </button>
            )}
            <button
              type="button"
              onClick={handleExcluirSelecionados}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-error/20 text-error hover:bg-error/30 transition-colors"
            >
              Excluir selecionados
            </button>
          </div>
        )}
        {loadingContas ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : contas.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum lançamento. Use &quot;Gerar contas&quot; acima (pode incluir meses passados para lançar pagamentos antigos).</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-dark-100">
                  <th className="w-10 pb-2 pr-2">
                    <button
                      type="button"
                      onClick={selectedContaIds.length === contas.length ? deselectAllContas : selectAllContas}
                      className="p-1 rounded text-gray-400 hover:text-brand"
                      title={selectedContaIds.length === contas.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    >
                      {selectedContaIds.length === contas.length ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                  <th className="pb-2 pr-4">Vencimento</th>
                  <th className="pb-2 pr-4">Valor</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((conta) => (
                  <tr key={conta.id} className="border-b border-dark-100/50">
                    <td className="w-10 py-2 pr-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectConta(conta.id)}
                        className="p-1 rounded text-gray-400 hover:text-brand transition-colors"
                        title={selectedContaIds.includes(conta.id) ? 'Desmarcar' : 'Selecionar'}
                      >
                        {selectedContaIds.includes(conta.id) ? (
                          <CheckSquare className="w-5 h-5 text-brand" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-gray-300">{format(toDate(conta.dataVencimento), 'dd/MM/yyyy')}</td>
                    <td className="py-2 pr-4">
                      {editingValorId === conta.id ? (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-400">R$</span>
                          <input
                            type="text"
                            value={editingValorInput}
                            onChange={(e) => setEditingValorInput(e.target.value)}
                            onBlur={() => {
                              setTimeout(() => {
                                if (editingValorId === conta.id && editingValorInput.trim()) saveValorInline(conta.id)
                              }, 0)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                saveValorInline(conta.id)
                              }
                              if (e.key === 'Escape') cancelEditingValor()
                            }}
                            className="w-24 px-2 py-1 bg-dark-400 border border-brand rounded text-gray-100 text-sm"
                            autoFocus
                          />
                        </span>
                      ) : (
                        <span className="text-gray-300">{formatCurrency(conta.valor)}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          conta.status === 'pago' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}
                      >
                        {conta.status === 'pago' ? 'Pago' : 'A pagar'}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => (editingValorId === conta.id ? saveValorInline(conta.id) : startEditingValor(conta))}
                          disabled={updatingId === conta.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-dark-400 hover:text-brand transition-colors disabled:opacity-50"
                          title={editingValorId === conta.id ? 'Salvar valor' : 'Editar valor'}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePago(conta)}
                          disabled={updatingId === conta.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-dark-400 hover:text-brand transition-colors disabled:opacity-50"
                          title={conta.status === 'pago' ? 'Voltar para A pagar' : 'Marcar como pago'}
                        >
                          {conta.status === 'pago' ? (
                            <Circle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluirConta(conta)}
                          disabled={updatingId === conta.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-error/20 hover:text-error transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
