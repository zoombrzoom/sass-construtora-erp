'use client'

import { useEffect, useState } from 'react'
import { Obra, ObraStatus } from '@/types/obra'
import { getObras, deleteObra } from '@/lib/db/obras'
import { FiltrosObras } from '@/components/ui/FiltrosObras'
import Link from 'next/link'
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react'

export function ObraList() {
  const [obras, setObras] = useState<Obra[]>([])
  const [obrasFiltradas, setObrasFiltradas] = useState<Obra[]>([])
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
  }, [obras, filtros.busca])

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

    setObrasFiltradas(filtradas)
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

      <FiltrosObras onFilterChange={setFiltros} />

      {obrasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          {obras.length === 0 
            ? 'Nenhuma obra cadastrada'
            : 'Nenhuma obra encontrada com os filtros aplicados'
          }
        </div>
      ) : (
        <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
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
                      <p className="text-sm font-medium text-gray-100">
                        {obra.nome}
                      </p>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        obra.status === 'ativa' ? 'bg-success/20 text-success' :
                        obra.status === 'pausada' ? 'bg-warning/20 text-warning' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {obra.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400 truncate">
                      {obra.endereco}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Link
                      href={`/obras/${obra.id}/editar`}
                      className="flex items-center text-brand hover:text-brand-light text-sm font-medium transition-colors"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(obra.id)}
                      className="flex items-center text-error hover:text-red-400 text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
