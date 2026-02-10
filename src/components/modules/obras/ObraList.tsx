'use client'

import { useEffect, useMemo, useState } from 'react'
import { Obra, ObraStatus } from '@/types/obra'
import { getObras, deleteObra } from '@/lib/db/obras'
import { createObraCategoria, deleteObraCategoria, getObrasCategorias } from '@/lib/db/obrasCategorias'
import { FiltrosObras } from '@/components/ui/FiltrosObras'
import Link from 'next/link'
import { Plus, Trash2, Building2, Wallet, Eye, Pencil } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function ObraList() {
  const { user } = useAuth()
  const canManageCategorias = Boolean(user && (user.role === 'admin' || user.role === 'financeiro'))
  const [obras, setObras] = useState<Obra[]>([])
  const [obrasFiltradas, setObrasFiltradas] = useState<Obra[]>([])
  const [categorias, setCategorias] = useState<Array<{ id: string; nome: string }>>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('__all__')
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<{
    status?: ObraStatus
    busca?: string
  }>({})

  useEffect(() => {
    loadObras()
  }, [filtros.status])

  useEffect(() => {
    aplicarFiltros()
  }, [obras, filtros.busca, categoriaAtiva])

  useEffect(() => {
    loadCategorias()
  }, [])

  const loadObras = async () => {
    setLoading(true)
    try {
      const data = await getObras(filtros.status ? { status: filtros.status } : undefined)
      setObras(data)
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    } finally {
      setLoading(false)
    }
  }

  const aplicarFiltros = () => {
    let filtradas = [...obras]

    if (filtros.busca) {
      const buscaLower = filtros.busca.toLowerCase()
      filtradas = filtradas.filter(obra => {
        const nome = obra.nome.toLowerCase()
        const endereco = obra.endereco.toLowerCase()
        return nome.includes(buscaLower) || endereco.includes(buscaLower)
      })
    }

    if (categoriaAtiva === '__none__') {
      filtradas = filtradas.filter((o) => !o.categoriaId)
    } else if (categoriaAtiva !== '__all__') {
      filtradas = filtradas.filter((o) => o.categoriaId === categoriaAtiva)
    }

    setObrasFiltradas(filtradas)
  }

  const loadCategorias = async () => {
    try {
      const data = await getObrasCategorias()
      setCategorias(data.map((c) => ({ id: c.id, nome: c.nome })))
    } catch (error) {
      console.error('Erro ao carregar categorias de obras:', error)
    }
  }

  const categoriasResumo = useMemo(() => {
    const counts = new Map<string, number>()
    let semCategoria = 0
    obras.forEach((o) => {
      if (!o.categoriaId) {
        semCategoria += 1
        return
      }
      counts.set(o.categoriaId, (counts.get(o.categoriaId) || 0) + 1)
    })
    return { counts, semCategoria, total: obras.length }
  }, [obras])

  const handleCreateCategoria = async () => {
    if (!user) return
    if (!canManageCategorias) return
    const nome = novaCategoriaNome.trim()
    if (!nome) return
    try {
      await createObraCategoria({ nome, createdBy: user.id })
      setNovaCategoriaNome('')
      await loadCategorias()
    } catch (error) {
      console.error('Erro ao criar categoria de obras:', error)
      alert('Erro ao criar categoria.')
    }
  }

  const handleDeleteCategoria = async (id: string) => {
    if (!canManageCategorias) return
    if (!confirm('Excluir esta categoria? (as obras manterão o registro, mas a categoria pode sumir da lista)')) return
    try {
      await deleteObraCategoria(id)
      if (categoriaAtiva === id) setCategoriaAtiva('__all__')
      await loadCategorias()
    } catch (error) {
      console.error('Erro ao excluir categoria de obras:', error)
      alert('Erro ao excluir categoria.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta obra?')) return

    try {
      await deleteObra(id)
      loadObras()
    } catch (error) {
      console.error('Erro ao excluir obra:', error)
      alert('Erro ao excluir obra')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Obras</h2>
        <Link
          href="/obras/nova"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Obra
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
                categoriaAtiva === '__all__' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
              }`}
            >
              <span>Geral</span>
              <span className="text-xs text-gray-400">{categoriasResumo.total}</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoriaAtiva('__none__')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                categoriaAtiva === '__none__' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
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
                    categoriaAtiva === cat.id ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
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
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Editar</p>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <input
                  value={novaCategoriaNome}
                  onChange={(e) => setNovaCategoriaNome(e.target.value)}
                  className="min-w-0 w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Nova categoria..."
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

        <div className="min-w-0">
          <FiltrosObras onFilterChange={setFiltros} />

          {obrasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              {obras.length === 0 ? 'Nenhuma obra cadastrada' : 'Nenhuma obra encontrada com os filtros aplicados'}
            </div>
          ) : (
            <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden mt-4">
              <div className="px-4 py-3 bg-dark-400 border-b border-dark-100">
                <p className="text-sm text-gray-400">
                  Mostrando {obrasFiltradas.length} de {obras.length} obra(s)
                </p>
              </div>
              <ul className="divide-y divide-dark-100">
                {obrasFiltradas.map((obra) => (
                  <li key={obra.id}>
                    <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <Link
                            href={`/obras/${obra.id}`}
                            className="text-sm font-medium text-gray-100 hover:text-brand transition-colors"
                          >
                            {obra.nome}
                          </Link>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              obra.status === 'ativa'
                                ? 'bg-success/20 text-success'
                                : obra.status === 'pausada'
                                  ? 'bg-warning/20 text-warning'
                                  : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {obra.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-400 truncate">{obra.endereco}</p>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/obras/${obra.id}`}
                          className="p-2 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                          title="Visão Geral"
                          aria-label="Visão Geral"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/obras/${obra.id}/gastos`}
                          className="p-2 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                          title="Gastos"
                          aria-label="Gastos"
                        >
                          <Wallet className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/obras/${obra.id}/editar`}
                          className="p-2 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                          title="Editar"
                          aria-label="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(obra.id)}
                          className="p-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors"
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
          )}
        </div>
      </div>
    </div>
  )
}
