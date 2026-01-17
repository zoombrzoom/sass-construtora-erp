'use client'

import { useEffect, useState } from 'react'
import { Obra, ObraStatus } from '@/types/obra'
import { getObras, deleteObra } from '@/lib/db/obras'
import { FiltrosObras } from '@/components/ui/FiltrosObras'
import Link from 'next/link'

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

    // Filtro por busca (nome ou endereço)
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
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Obras</h2>
        <Link
          href="/obras/nova"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Nova Obra
        </Link>
      </div>

      <FiltrosObras onFilterChange={setFiltros} />

      {obrasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {obras.length === 0 
            ? 'Nenhuma obra cadastrada'
            : 'Nenhuma obra encontrada com os filtros aplicados'
          }
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-2 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">
              Mostrando {obrasFiltradas.length} de {obras.length} obra(s)
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {obrasFiltradas.map((obra) => (
              <li key={obra.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {obra.nome}
                      </p>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${
                        obra.status === 'ativa' ? 'bg-green-100 text-green-800' :
                        obra.status === 'pausada' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {obra.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {obra.endereco}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/obras/${obra.id}/editar`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(obra.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
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
