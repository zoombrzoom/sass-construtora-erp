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
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!requisicao) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Pedido não encontrado</p>
        <button
          onClick={() => router.push('/compras/requisicoes')}
          className="text-brand hover:text-brand-light"
        >
          Voltar para Pedidos e Compras
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Editar Pedido e Compra</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <RequisicaoForm 
          requisicao={requisicao}
          onSuccess={() => router.push(`/compras/requisicoes/${requisicao.id}`)}
        />
      </div>
    </div>
  )
}
