'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ContaPessoalCategoria,
  ContaPessoalLancamento,
  createCategoriaPessoal,
  createLancamentoPessoal,
  deleteCategoriaPessoal,
  deleteLancamentoPessoal,
  getCategoriasPessoais,
  getLancamentosPessoais,
  updateCategoriaPessoal,
  updateLancamentoPessoal,
  updateLancamentoPessoalComprovante,
  updateLancamentoPessoalPagamento,
} from '@/lib/db/contasPessoais'
import { uploadImage } from '@/lib/storage/upload'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '@/utils/currency'
import { Plus, Pencil, Trash2, Wallet, Check, X, CheckCircle, Circle, Upload, ExternalLink } from 'lucide-react'

const categoriasPadrao = [
  'Empréstimos',
  'Casa',
  'Carros',
  'Financiamentos',
  'Condomínios',
  'Cartões',
  'Plano de Saúde',
]

export default function ContasPessoaisPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const permissions = getPermissions(user)
  const [categorias, setCategorias] = useState<ContaPessoalCategoria[]>([])
  const [lancamentos, setLancamentos] = useState<ContaPessoalLancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNomeCategoria, setNovoNomeCategoria] = useState('')
  const [categoriaEditando, setCategoriaEditando] = useState<ContaPessoalCategoria | null>(null)
  const [nomeEditado, setNomeEditado] = useState('')
  const [draftsLancamentos, setDraftsLancamentos] = useState<Record<string, { valor: string, descricao: string }>>({})
  const [draftComprovantes, setDraftComprovantes] = useState<Record<string, File | null>>({})
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('geral')
  const [lancamentoEditandoId, setLancamentoEditandoId] = useState<string | null>(null)
  const [valorEditado, setValorEditado] = useState('')
  const [descricaoEditada, setDescricaoEditada] = useState('')

  const loadDados = useCallback(async () => {
    try {
      const dataCategorias = await getCategoriasPessoais()
      if (dataCategorias.length === 0) {
        for (const nome of categoriasPadrao) {
          await createCategoriaPessoal(nome)
        }
      }
      const [categoriasAtualizadas, lancamentosAtualizados] = await Promise.all([
        getCategoriasPessoais(),
        getLancamentosPessoais(),
      ])
      setCategorias(categoriasAtualizadas)
      setLancamentos(lancamentosAtualizados)
    } catch (error) {
      console.error('Erro ao carregar contas pessoais:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user && !permissions.canAccessContasPessoais) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, permissions.canAccessContasPessoais, router])

  useEffect(() => {
    if (authLoading) return
    if (!permissions.canAccessContasPessoais) {
      setLoading(false)
      return
    }
    loadDados()
  }, [authLoading, permissions.canAccessContasPessoais, loadDados])

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const totaisPorCategoria = useMemo(() => {
    return lancamentos.reduce<Record<string, number>>((acc, item) => {
      if (!item.pago) {
        acc[item.categoriaId] = (acc[item.categoriaId] || 0) + item.valor
      }
      return acc
    }, {})
  }, [lancamentos])

  const totalGeral = useMemo(() => {
    return Object.values(totaisPorCategoria).reduce((sum, value) => sum + value, 0)
  }, [totaisPorCategoria])

  const lancamentosPorCategoria = useMemo(() => {
    return lancamentos.reduce<Record<string, ContaPessoalLancamento[]>>((acc, item) => {
      if (!acc[item.categoriaId]) {
        acc[item.categoriaId] = []
      }
      acc[item.categoriaId].push(item)
      return acc
    }, {})
  }, [lancamentos])

  const handleAdicionarCategoria = async () => {
    const nome = novoNomeCategoria.trim()
    if (!nome) return
    try {
      await createCategoriaPessoal(nome)
      setNovoNomeCategoria('')
      await loadDados()
    } catch (error: any) {
      console.error('Erro ao adicionar categoria:', error)
      alert(error?.message || 'Erro ao adicionar categoria')
    }
  }

  const handleSalvarEdicao = async () => {
    if (!categoriaEditando) return
    const nome = nomeEditado.trim()
    if (!nome) return
    try {
      await updateCategoriaPessoal(categoriaEditando.id, nome)
      setCategoriaEditando(null)
      setNomeEditado('')
      await loadDados()
    } catch (error: any) {
      console.error('Erro ao atualizar categoria:', error)
      alert(error?.message || 'Erro ao atualizar categoria')
    }
  }

  const handleExcluirCategoria = async (categoriaId: string) => {
    if (!confirm('Excluir a categoria e todos os lançamentos vinculados?')) return
    try {
      await deleteCategoriaPessoal(categoriaId)
      if (categoriaSelecionada === categoriaId) {
        setCategoriaSelecionada('geral')
      }
      await loadDados()
    } catch (error: any) {
      console.error('Erro ao excluir categoria:', error)
      alert(error?.message || 'Erro ao excluir categoria')
    }
  }

  const handleAdicionarLancamento = async (categoriaId: string) => {
    const draft = draftsLancamentos[categoriaId]
    const valor = parseCurrencyInput(draft?.valor || '')
    const descricao = draft?.descricao?.trim()
    const comprovanteFile = draftComprovantes[categoriaId] || null
    if (!valor || valor <= 0) {
      alert('Informe um valor válido para o lançamento')
      return
    }
    try {
      let comprovanteUrl = ''
      if (comprovanteFile && user) {
        const path = `contas-pessoais/comprovantes/${user.id}_${Date.now()}_${comprovanteFile.name}`
        comprovanteUrl = await uploadImage(comprovanteFile, path, false)
      }

      await createLancamentoPessoal({
        categoriaId,
        valor,
        descricao,
        comprovanteUrl,
      })
      setDraftsLancamentos(prev => ({
        ...prev,
        [categoriaId]: { valor: '', descricao: '' },
      }))
      setDraftComprovantes(prev => ({ ...prev, [categoriaId]: null }))
      await loadDados()
    } catch (error: any) {
      console.error('Erro ao adicionar lançamento:', error)
      alert(error?.message || 'Erro ao adicionar lançamento')
    }
  }

  const handleExcluirLancamento = async (lancamentoId: string) => {
    if (!confirm('Excluir este lançamento?')) return
    try {
      await deleteLancamentoPessoal(lancamentoId)
      await loadDados()
    } catch (error: any) {
      console.error('Erro ao excluir lançamento:', error)
      alert(error?.message || 'Erro ao excluir lançamento')
    }
  }

  const handleTogglePagamento = async (lancamentoId: string, pagoAtual: boolean) => {
    try {
      await updateLancamentoPessoalPagamento(lancamentoId, !pagoAtual)
      await loadDados()
    } catch (error: any) {
      console.error('Erro ao atualizar pagamento do lançamento:', error)
      alert(error?.message || 'Erro ao atualizar pagamento do lançamento')
    }
  }

  const iniciarEdicaoLancamento = (item: ContaPessoalLancamento) => {
    setLancamentoEditandoId(item.id)
    setValorEditado(formatCurrencyInput(item.valor))
    setDescricaoEditada(item.descricao || '')
  }

  const cancelarEdicaoLancamento = () => {
    setLancamentoEditandoId(null)
    setValorEditado('')
    setDescricaoEditada('')
  }

  const salvarEdicaoLancamento = async (lancamentoId: string) => {
    const valor = parseCurrencyInput(valorEditado)
    if (!valor || valor <= 0) {
      alert('Informe um valor válido para o lançamento')
      return
    }

    try {
      await updateLancamentoPessoal(lancamentoId, {
        valor,
        descricao: descricaoEditada,
      })
      cancelarEdicaoLancamento()
      await loadDados()
    } catch (error: any) {
      console.error('Erro ao editar lançamento:', error)
      alert(error?.message || 'Erro ao editar lançamento')
    }
  }

  const handleUploadComprovanteLancamento = async (lancamentoId: string, file: File) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      const path = `contas-pessoais/comprovantes/${user.id}_${Date.now()}_${file.name}`
      const comprovanteUrl = await uploadImage(file, path, false)
      await updateLancamentoPessoalComprovante(lancamentoId, comprovanteUrl)
      await loadDados()
    } catch (error: any) {
      console.error('Erro ao atualizar comprovante do lançamento:', error)
      alert(error?.message || 'Erro ao salvar comprovante')
    }
  }

  if (authLoading || loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!permissions.canAccessContasPessoais) {
    return null
  }

  const categoriaAtual = categorias.find((cat) => cat.id === categoriaSelecionada) || null
  const listaLancamentosAtual = categoriaSelecionada === 'geral'
    ? lancamentos
    : (lancamentosPorCategoria[categoriaSelecionada] || [])
  const totalCategoriaAtual = categoriaSelecionada === 'geral'
    ? totalGeral
    : (totaisPorCategoria[categoriaSelecionada] || 0)
  const draftAtual = categoriaSelecionada !== 'geral'
    ? (draftsLancamentos[categoriaSelecionada] || { valor: '', descricao: '' })
    : null

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand">Contas Pessoais</h1>
          <p className="text-sm text-gray-400 mt-1">Some os valores em aberto por categoria e acompanhe o total geral.</p>
        </div>
        <div className="bg-dark-500 border border-dark-100 rounded-lg px-4 py-3 flex items-center gap-3">
          <Wallet className="w-5 h-5 text-brand" />
          <div>
            <p className="text-xs text-gray-400">Total em aberto</p>
            <p className="text-lg font-semibold text-gray-100">{formatCurrency(totalGeral)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <aside className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6 h-fit">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Categorias</h2>
          <button
            onClick={() => setCategoriaSelecionada('geral')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-2 transition-colors ${
              categoriaSelecionada === 'geral'
                ? 'bg-brand/20 text-brand'
                : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
            }`}
          >
            <span>Geral</span>
            <span className="text-xs text-gray-400">{formatCurrency(totalGeral)}</span>
          </button>

          <div className="space-y-1">
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                onClick={() => setCategoriaSelecionada(categoria.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  categoriaSelecionada === categoria.id
                    ? 'bg-brand/20 text-brand'
                    : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                }`}
              >
                <span className="truncate">{categoria.nome}</span>
                <span className="text-xs text-gray-400">{formatCurrency(totaisPorCategoria[categoria.id] || 0)}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-dark-100">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={novoNomeCategoria}
                onChange={(event) => setNovoNomeCategoria(event.target.value)}
                placeholder="Nova categoria"
                className="px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                onClick={handleAdicionarCategoria}
                className="flex items-center justify-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </button>
            </div>
          </div>
        </aside>

        <section className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              {categoriaSelecionada === 'geral' ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-100">Visão Geral</h3>
                  <p className="text-sm text-gray-400 mt-1">Total em aberto: {formatCurrency(totalGeral)}</p>
                </>
              ) : categoriaEditando?.id === categoriaAtual?.id ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={nomeEditado}
                    onChange={(event) => setNomeEditado(event.target.value)}
                    className="px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSalvarEdicao}
                      className="p-2 bg-success text-dark-800 rounded-lg hover:bg-success/80 transition-colors"
                      title="Salvar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCategoriaEditando(null)
                        setNomeEditado('')
                      }}
                      className="p-2 bg-dark-300 text-gray-300 rounded-lg hover:text-brand transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-100">{categoriaAtual?.nome || 'Categoria'}</h3>
                  <p className="text-sm text-gray-400 mt-1">Total em aberto: {formatCurrency(totalCategoriaAtual)}</p>
                </>
              )}
            </div>

            {categoriaSelecionada !== 'geral' && categoriaAtual && categoriaEditando?.id !== categoriaAtual.id && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCategoriaEditando(categoriaAtual)
                    setNomeEditado(categoriaAtual.nome)
                  }}
                  className="flex items-center text-brand hover:text-brand-light text-sm font-medium transition-colors"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </button>
                <button
                  onClick={() => handleExcluirCategoria(categoriaAtual.id)}
                  className="flex items-center text-error hover:text-red-400 text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </button>
              </div>
            )}
          </div>

          {categoriaSelecionada !== 'geral' && categoriaAtual && draftAtual && (
            <div className="mt-4 border-t border-dark-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Valor"
                  value={draftAtual.valor}
                  onChange={(event) => setDraftsLancamentos(prev => ({
                    ...prev,
                    [categoriaAtual.id]: { ...draftAtual, valor: sanitizeCurrencyInput(event.target.value) },
                  }))}
                  onBlur={() => setDraftsLancamentos(prev => ({
                    ...prev,
                    [categoriaAtual.id]: { ...draftAtual, valor: draftAtual.valor ? formatCurrencyInput(draftAtual.valor) : '' },
                  }))}
                  className="px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={draftAtual.descricao}
                  onChange={(event) => setDraftsLancamentos(prev => ({
                    ...prev,
                    [categoriaAtual.id]: { ...draftAtual, descricao: event.target.value },
                  }))}
                  className="px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <button
                  onClick={() => handleAdicionarLancamento(categoriaAtual.id)}
                  className="flex items-center justify-center px-4 py-2 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Lançar
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center px-3 py-2 bg-dark-400 border border-dark-100 rounded-lg text-gray-300 cursor-pointer hover:border-brand hover:text-brand transition-colors text-sm">
                  <Upload className="w-4 h-4 mr-2" />
                  {draftComprovantes[categoriaAtual.id] ? 'Trocar comprovante' : 'Adicionar comprovante'}
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(event) => setDraftComprovantes((prev) => ({
                      ...prev,
                      [categoriaAtual.id]: event.target.files?.[0] || null,
                    }))}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-gray-500">
                  {draftComprovantes[categoriaAtual.id]?.name || 'Sem comprovante no lançamento'}
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-dark-100 pt-4">
            {listaLancamentosAtual.length > 0 ? (
              <ul className="space-y-2">
                {listaLancamentosAtual.map((item) => (
                  <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-dark-400 border border-dark-100 rounded-lg px-3 py-2">
                    {lancamentoEditandoId === item.id ? (
                      <div className="w-full grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={valorEditado}
                          onChange={(event) => setValorEditado(sanitizeCurrencyInput(event.target.value))}
                          onBlur={() => setValorEditado((prev) => (prev ? formatCurrencyInput(prev) : ''))}
                          className="px-3 py-2 bg-dark-300 border border-dark-100 rounded-lg text-gray-100"
                        />
                        <input
                          type="text"
                          value={descricaoEditada}
                          onChange={(event) => setDescricaoEditada(event.target.value)}
                          className="px-3 py-2 bg-dark-300 border border-dark-100 rounded-lg text-gray-100"
                          placeholder="Descrição"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => salvarEdicaoLancamento(item.id)}
                            className="p-2 bg-success text-dark-800 rounded-lg hover:bg-success/80 transition-colors"
                            title="Salvar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelarEdicaoLancamento}
                            className="p-2 bg-dark-300 text-gray-300 rounded-lg hover:text-brand transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className={`text-sm ${item.pago ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
                            {item.descricao || 'Lançamento'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.createdAt ? item.createdAt.toLocaleDateString('pt-BR') : 'Sem data'}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {item.comprovanteUrl ? (
                              <a
                                href={item.comprovanteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-brand hover:text-brand-light"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                Ver comprovante
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500">Sem comprovante</span>
                            )}
                            <label className="inline-flex items-center text-xs text-gray-300 hover:text-brand cursor-pointer">
                              <Upload className="w-3.5 h-3.5 mr-1" />
                              {item.comprovanteUrl ? 'Substituir' : 'Anexar'}
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(event) => {
                                  const file = event.target.files?.[0]
                                  if (file) {
                                    handleUploadComprovanteLancamento(item.id, file)
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-semibold ${item.pago ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
                            {formatCurrency(item.valor)}
                          </span>
                          <button
                            onClick={() => iniciarEdicaoLancamento(item)}
                            className="text-gray-300 hover:text-brand transition-colors"
                            title="Editar lançamento"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTogglePagamento(item.id, !!item.pago)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                              item.pago
                                ? 'bg-success/20 text-success hover:bg-success/30'
                                : 'bg-dark-300 text-gray-300 hover:text-brand'
                            }`}
                            title={item.pago ? 'Marcar como em aberto' : 'Marcar como pago'}
                          >
                            {item.pago ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                            {item.pago ? 'Pago' : 'Em aberto'}
                          </button>
                          <button
                            onClick={() => handleExcluirLancamento(item.id)}
                            className="text-error hover:text-red-400 transition-colors"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Nenhum lançamento registrado.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
