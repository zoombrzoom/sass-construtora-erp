'use client'

import { useEffect, useState } from 'react'
import { Cotacao } from '@/types/compras'
import { getCotacoes } from '@/lib/db/cotacoes'
import Link from 'next/link'
import { CotacaoCard } from '@/components/modules/compras/CotacaoCard'

export default function CotacoesPage() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pendente' | 'aprovado' | 'rejeitado'>('all')

  useEffect(() => {
    loadCotacoes()
  }, [filter])

  const loadCotacoes = async () => {
    try {
      const data = await getCotacoes(
        filter !== 'all' ? { status: filter } : undefined
      )
      setCotacoes(data)
    } catch (error) {
      console.error('Erro ao carregar cotações:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Cotações</h1>
        <Link
          href="/compras/cotacoes/nova"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Nova Cotação
        </Link>
      </div>

      <div className="mb-4 flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('pendente')}
          className={`px-4 py-2 rounded-md ${
            filter === 'pendente' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Pendentes
        </button>
        <button
          onClick={() => setFilter('aprovado')}
          className={`px-4 py-2 rounded-md ${
            filter === 'aprovado' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Aprovadas
        </button>
      </div>

      {cotacoes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhuma cotação encontrada
        </div>
      ) : (
        <div className="space-y-4">
          {cotacoes.map((cotacao) => (
            <CotacaoCard
              key={cotacao.id}
              cotacao={cotacao}
              onUpdate={loadCotacoes}
            />
          ))}
        </div>
      )}
    </div>
  )
}
