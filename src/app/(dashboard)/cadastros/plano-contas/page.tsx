'use client'

import { useEffect, useState } from 'react'
import { PlanoContas, getPlanoContas, deletePlanoConta } from '@/lib/db/planoContas'
import Link from 'next/link'

export default function PlanoContasPage() {
  const [contas, setContas] = useState<PlanoContas[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContas()
  }, [])

  const loadContas = async () => {
    try {
      const data = await getPlanoContas()
      setContas(data)
    } catch (error) {
      console.error('Erro ao carregar plano de contas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return

    try {
      await deletePlanoConta(id)
      loadContas()
    } catch (error) {
      console.error('Erro ao excluir conta:', error)
      alert('Erro ao excluir conta')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Plano de Contas</h1>
        <Link
          href="/cadastros/plano-contas/nova"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Nova Conta
        </Link>
      </div>

      {contas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhuma conta cadastrada
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {contas.map((conta) => (
              <li key={conta.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {conta.codigo} - {conta.descricao}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Categoria: {conta.categoria}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/cadastros/plano-contas/${conta.id}/editar`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(conta.id)}
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
