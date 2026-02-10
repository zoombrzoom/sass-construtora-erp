'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FolhaPagamento } from '@/types/financeiro'
import { getFolhaPagamento } from '@/lib/db/folhaPagamento'
import { FolhaPagamentoForm } from '@/components/modules/financeiro/FolhaPagamentoForm'

export default function EditarFolhaPagamentoPage() {
  const params = useParams()
  const router = useRouter()
  const [folha, setFolha] = useState<FolhaPagamento | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadFolha(params.id as string)
    }
  }, [params.id])

  const loadFolha = async (id: string) => {
    try {
      const data = await getFolhaPagamento(id)
      setFolha(data)
    } catch (error) {
      console.error('Erro ao carregar folha de pagamento:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!folha) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Lançamento não encontrado</p>
        <button
          onClick={() => router.push('/financeiro/folha-pagamento')}
          className="text-brand hover:text-brand-light"
        >
          Voltar para Folha de Pagamento
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Editar Lançamento de Folha</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <FolhaPagamentoForm
          folha={folha}
          onSuccess={() => router.push(`/financeiro/folha-pagamento/${folha.id}`)}
        />
      </div>
    </div>
  )
}
