'use client'

import { useEffect, useState } from 'react'
import { Fornecedor, getFornecedores, deleteFornecedor } from '@/lib/db/fornecedores'
import Link from 'next/link'

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFornecedores()
  }, [])

  const loadFornecedores = async () => {
    try {
      const data = await getFornecedores()
      setFornecedores(data)
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return

    try {
      await deleteFornecedor(id)
      loadFornecedores()
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error)
      alert('Erro ao excluir fornecedor')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Fornecedores</h1>
        <Link
          href="/cadastros/fornecedores/novo"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Novo Fornecedor
        </Link>
      </div>

      {fornecedores.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum fornecedor cadastrado
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {fornecedores.map((fornecedor) => (
              <li key={fornecedor.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {fornecedor.nome}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      CNPJ: {fornecedor.cnpj} | Categoria: {fornecedor.categoria}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/cadastros/fornecedores/${fornecedor.id}/editar`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(fornecedor.id)}
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
