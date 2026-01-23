'use client'

import { useEffect, useState } from 'react'
import { Fornecedor, getFornecedores, deleteFornecedor } from '@/lib/db/fornecedores'
import Link from 'next/link'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'

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
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Fornecedores</h1>
        <Link
          href="/cadastros/fornecedores/novo"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Link>
      </div>

      {fornecedores.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          Nenhum fornecedor cadastrado
        </div>
      ) : (
        <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <ul className="divide-y divide-dark-100">
            {fornecedores.map((fornecedor) => (
              <li key={fornecedor.id}>
                <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100">
                      {fornecedor.nome}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      CNPJ: {fornecedor.cnpj} | Categoria: {fornecedor.categoria}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Link
                      href={`/cadastros/fornecedores/${fornecedor.id}/editar`}
                      className="flex items-center text-brand hover:text-brand-light text-sm font-medium transition-colors"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(fornecedor.id)}
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
