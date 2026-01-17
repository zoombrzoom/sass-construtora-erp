'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Cotacao } from '@/types/compras'
import { getCotacao } from '@/lib/db/cotacoes'
import { CotacaoForm } from '@/components/modules/compras/CotacaoForm'
import { useRouter } from 'next/navigation'

export default function EditarCotacaoPage() {
  const params = useParams()
  const router = useRouter()
  const [cotacao, setCotacao] = useState<Cotacao | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadCotacao(params.id as string)
    }
  }, [params.id])

  const loadCotacao = async (id: string) => {
    try {
      const data = await getCotacao(id)
      if (data) {
        setCotacao(data)
      }
    } catch (error) {
      console.error('Erro ao carregar cotação:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  if (!cotacao) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Cotação não encontrada</p>
          <button
            onClick={() => router.push('/compras/cotacoes')}
            className="text-blue-600 hover:text-blue-800"
          >
            Voltar para Cotações
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Editar Cotação</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <CotacaoForm 
          cotacao={cotacao}
          onSuccess={() => router.push('/compras/cotacoes')}
        />
      </div>
    </div>
  )
}
