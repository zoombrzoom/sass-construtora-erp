'use client'

import { useEffect, useState } from 'react'
import { PlanoContas, getPlanoContas, deletePlanoConta } from '@/lib/db/planoContas'
import Link from 'next/link'
import { Plus, Edit2, Trash2, ClipboardList } from 'lucide-react'

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
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Plano de Contas</h1>
        <Link
          href="/cadastros/plano-contas/nova"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Link>
      </div>

      {contas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          Nenhuma conta cadastrada
        </div>
      ) : (
        <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <ul className="divide-y divide-dark-100">
            {contas.map((conta) => (
              <li key={conta.id}>
                <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100">
                      {conta.codigo} - {conta.descricao}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      Categoria: {conta.categoria}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Link
                      href={`/cadastros/plano-contas/${conta.id}/editar`}
                      className="flex items-center text-brand hover:text-brand-light text-sm font-medium transition-colors"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(conta.id)}
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
