'use client'

import { useEffect, useState } from 'react'
import { Cotacao } from '@/types/compras'
import { getCotacoes } from '@/lib/db/cotacoes'
import Link from 'next/link'
import { CotacaoCard } from '@/components/modules/compras/CotacaoCard'
import { Plus, FileSearch } from 'lucide-react'

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
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Cotações</h1>
        <Link
          href="/compras/cotacoes/nova"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Cotação
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-brand text-dark-800' 
              : 'bg-dark-500 text-gray-400 hover:text-brand border border-dark-100'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('pendente')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'pendente' 
              ? 'bg-warning text-dark-800' 
              : 'bg-dark-500 text-gray-400 hover:text-warning border border-dark-100'
          }`}
        >
          Pendentes
        </button>
        <button
          onClick={() => setFilter('aprovado')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'aprovado' 
              ? 'bg-success text-dark-800' 
              : 'bg-dark-500 text-gray-400 hover:text-success border border-dark-100'
          }`}
        >
          Aprovadas
        </button>
      </div>

      {cotacoes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileSearch className="w-12 h-12 mx-auto mb-3 text-gray-600" />
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
