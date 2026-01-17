'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Requisicao } from '@/types/compras'
import { getRequisicao } from '@/lib/db/requisicoes'
import { RequisicaoForm } from '@/components/modules/compras/RequisicaoForm'
import { useRouter } from 'next/navigation'

export default function EditarRequisicaoPage() {
  const params = useParams()
  const router = useRouter()
  const [requisicao, setRequisicao] = useState<Requisicao | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadRequisicao(params.id as string)
    }
  }, [params.id])

  const loadRequisicao = async (id: string) => {
    try {
      const data = await getRequisicao(id)
      if (data) {
        setRequisicao(data)
      }
    } catch (error) {
      console.error('Erro ao carregar requisição:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  if (!requisicao) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Requisição não encontrada</p>
          <button
            onClick={() => router.push('/compras/requisicoes')}
            className="text-blue-600 hover:text-blue-800"
          >
            Voltar para Requisições
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Editar Requisição</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <RequisicaoForm 
          requisicao={requisicao}
          onSuccess={() => router.push(`/compras/requisicoes/${requisicao.id}`)}
        />
      </div>
    </div>
  )
}
