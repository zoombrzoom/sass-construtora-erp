'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { getFolhaFuncionarios, deleteFolhaFuncionario } from '@/lib/db/folhaFuncionarios'
import { deleteContasPagarNaoPagasPorFolhaFuncionarioId } from '@/lib/db/contasPagar'
import {
  deleteFolhaPagamentoCategoria,
  getFolhaPagamentoCategorias,
  saveFolhaPagamentoCategoria,
} from '@/lib/db/folhaPagamentoCategorias'
import type { FolhaFuncionario, FolhaFuncionarioRecorrenciaTipo } from '@/types/financeiro'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCpf(value?: string): string {
  if (!value) return '-'
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return value
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

const RECORRENCIA_LABELS: Record<FolhaFuncionarioRecorrenciaTipo, string> = {
  avulso: 'Avulso',
  mensal: 'Mensal',
  quinzenal: 'Quinzenal',
  semanal: 'Semanal',
}

function valorResumo(f: FolhaFuncionario): number {
  switch (f.recorrenciaTipo) {
    case 'quinzenal':
      return (f.valorQuinzena1 ?? 0) + (f.valorQuinzena2 ?? 0)
    case 'mensal':
      return f.valorMensal ?? 0
    case 'semanal':
      return f.valorSemanal ?? 0
    case 'avulso':
      return f.valorAvulso ?? 0
    default:
      return 0
  }
}

export default function FolhaPagamentoPage() {
  const { user } = useAuth()
  const canManageCategorias = Boolean(user && (user.role === 'admin' || user.role === 'financeiro'))
  const [funcionarios, setFuncionarios] = useState<FolhaFuncionario[]>([])
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<Array<{ id: string; nome: string }>>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('__all__')
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [busca, setBusca] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    void loadFuncionarios()
  }, [])

  useEffect(() => {
    void loadCategorias()
  }, [])

  const loadFuncionarios = async () => {
    try {
      const data = await getFolhaFuncionarios()
      setFuncionarios(data)
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategorias = async () => {
    try {
      const data = await getFolhaPagamentoCategorias()
      setCategorias(data.map((c) => ({ id: c.id, nome: c.nome })))
    } catch (error) {
      console.error('Erro ao carregar categorias da folha:', error)
    }
  }

  const categoriaNomePorId = useMemo(() => {
    const map = new Map<string, string>()
    categorias.forEach((c) => map.set(c.id, c.nome))
    return map
  }, [categorias])

  const categoriasResumo = useMemo(() => {
    const counts = new Map<string, number>()
    let semCategoria = 0
    funcionarios.forEach((f) => {
      if (!f.categoriaId) {
        semCategoria += 1
        return
      }
      counts.set(f.categoriaId, (counts.get(f.categoriaId) || 0) + 1)
    })
    return { counts, semCategoria, total: funcionarios.length }
  }, [funcionarios])

  const funcionariosFiltrados = useMemo(() => {
    let base = funcionarios.filter((f) => f.ativo !== false)

    base = base.filter((f) => {
      if (categoriaAtiva === '__all__') return true
      if (categoriaAtiva === '__none__') return !f.categoriaId
      return f.categoriaId === categoriaAtiva
    })

    const buscaTexto = busca.trim().toLowerCase()
    const buscaCpf = busca.replace(/\D/g, '')
    if (buscaTexto) {
      base = base.filter((f) => {
        const nome = (f.nome || '').toLowerCase()
        const agencia = (f.agencia || '').toLowerCase()
        const conta = (f.conta || '').toLowerCase()
        const cpf = (f.cpf || '').replace(/\D/g, '')
        return (
          nome.includes(buscaTexto) ||
          agencia.includes(buscaTexto) ||
          conta.includes(buscaTexto) ||
          (buscaCpf.length >= 3 && cpf.includes(buscaCpf))
        )
      })
    }

    return base.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [funcionarios, categoriaAtiva, busca])

  const handleCreateCategoria = async () => {
    if (!canManageCategorias || !user) return
    const nome = novaCategoriaNome.trim()
    if (!nome) return
    try {
      await saveFolhaPagamentoCategoria({ nome, createdBy: user.id })
      setNovaCategoriaNome('')
      await loadCategorias()
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      alert('Erro ao salvar categoria.')
    }
  }

  const handleDeleteCategoria = async (id: string) => {
    if (!canManageCategorias) return
    const cat = categorias.find((c) => c.id === id)
    const nome = cat?.nome || id
    const confirmed = confirm(`Excluir a categoria "${nome}"?`)
    if (!confirmed) return
    try {
      await deleteFolhaPagamentoCategoria(id)
      if (categoriaAtiva === id) setCategoriaAtiva('__all__')
      await loadCategorias()
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      alert('Erro ao excluir categoria.')
    }
  }

  const handleDeleteFuncionario = async (f: FolhaFuncionario) => {
    const confirmed = confirm(
      `Excluir o funcionário "${f.nome}"? As contas não pagas serão removidas; as já pagas permanecem no histórico.`
    )
    if (!confirmed) return
    setDeletingId(f.id)
    try {
      await deleteContasPagarNaoPagasPorFolhaFuncionarioId(f.id)
      await deleteFolhaFuncionario(f.id)
      await loadFuncionarios()
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error)
      alert('Erro ao excluir funcionário.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  const tableCols = 'lg:grid-cols-[minmax(0,3fr)_120px_120px_minmax(0,1.3fr)_120px]'

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Folha de Pagamento</h1>
        <Link
          href="/financeiro/folha-pagamento/funcionario/nova"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Funcionário
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
        <aside className="bg-dark-500 border border-dark-100 rounded-xl p-4 h-fit overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Categorias</p>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setCategoriaAtiva('__all__')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                categoriaAtiva === '__all__'
                  ? 'bg-brand/20 text-brand'
                  : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
              }`}
            >
              <span>Todos</span>
              <span className="text-xs text-gray-400">{categoriasResumo.total}</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoriaAtiva('__none__')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                categoriaAtiva === '__none__'
                  ? 'bg-brand/20 text-brand'
                  : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
              }`}
            >
              <span>Sem categoria</span>
              <span className="text-xs text-gray-400">{categoriasResumo.semCategoria}</span>
            </button>

            {categorias.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    categoriaAtiva === cat.id
                      ? 'bg-brand/20 text-brand'
                      : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                  }`}
                >
                  <span className="truncate">{cat.nome}</span>
                  <span className="text-xs text-gray-400">{categoriasResumo.counts.get(cat.id) || 0}</span>
                </button>
                {canManageCategorias && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategoria(cat.id)}
                    className="p-2 rounded-lg text-error hover:bg-error/10"
                    aria-label={`Excluir categoria ${cat.nome}`}
                    title="Excluir categoria"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {canManageCategorias && (
            <div className="mt-4 pt-4 border-t border-dark-100">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Nova categoria</p>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <input
                  value={novaCategoriaNome}
                  onChange={(e) => setNovaCategoriaNome(e.target.value)}
                  className="min-w-0 w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Ex: Escritório, Betão..."
                />
                <button
                  type="button"
                  onClick={handleCreateCategoria}
                  className="px-3 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors whitespace-nowrap shrink-0"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </aside>

        <div className="space-y-4 min-w-0">
          <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-center">
              <div>
                <label htmlFor="filtroBusca" className="block text-xs text-gray-400 mb-1">
                  Buscar funcionário
                </label>
                <input
                  id="filtroBusca"
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Nome, CPF, agência, conta..."
                />
              </div>
              <div className="text-sm text-gray-400 lg:text-right">
                Mostrando {funcionariosFiltrados.length} funcionário(s)
              </div>
            </div>
          </div>

          {funcionariosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              Nenhum funcionário encontrado.
            </div>
          ) : (
            <div className="bg-dark-500 border border-dark-100 rounded-xl">
              <div className="overflow-x-auto lg:overflow-x-hidden">
                <div className="w-full">
                  <div
                    className={`hidden lg:grid ${tableCols} gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-dark-100`}
                  >
                    <div>Funcionário</div>
                    <div>Valor</div>
                    <div>Recorrência</div>
                    <div>Categoria</div>
                    <div className="text-right">Ações</div>
                  </div>

                  <ul className="divide-y divide-dark-100">
                    {funcionariosFiltrados.map((f) => {
                      const departamento = f.categoriaId
                        ? categoriaNomePorId.get(f.categoriaId) || f.categoriaId
                        : '-'
                      const cpfFmt = f.cpf ? formatCpf(f.cpf) : '-'
                      const valor = valorResumo(f)

                      return (
                        <li key={f.id}>
                          <div className="px-4 py-4">
                            <div className={`grid grid-cols-1 ${tableCols} gap-2 lg:items-center`}>
                              <div className="min-w-0">
                                <p className="text-base font-semibold text-gray-100 truncate" title={f.nome}>
                                  {f.nome}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate whitespace-nowrap">
                                  CPF: {cpfFmt} | Ag: {f.agencia || '-'} | Conta: {f.conta || '-'}
                                </p>
                              </div>

                              <div className="text-lg font-bold text-brand whitespace-nowrap">
                                {formatCurrency(valor)}
                              </div>

                              <div className="text-sm text-gray-300">
                                {RECORRENCIA_LABELS[f.recorrenciaTipo]}
                              </div>

                              <div className="text-sm text-gray-400 truncate" title={departamento}>
                                {departamento}
                              </div>

                              <div className="flex items-center gap-1.5 justify-start lg:justify-end flex-nowrap">
                                <Link
                                  href={`/financeiro/folha-pagamento/funcionario/${f.id}/editar`}
                                  className="p-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                                  title="Editar"
                                  aria-label="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFuncionario(f)}
                                  disabled={deletingId === f.id}
                                  className="p-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-error/20 hover:text-error transition-colors disabled:opacity-50"
                                  title="Excluir"
                                  aria-label="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
