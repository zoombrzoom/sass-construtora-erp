'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ContaPagar } from '@/types/financeiro'
import { getContaPagar } from '@/lib/db/contasPagar'
import { ContaPagarForm } from '@/components/modules/financeiro/ContaPagarForm'
import { useRouter } from 'next/navigation'

export default function EditarContaPagarPage() {
  const params = useParams()
  const router = useRouter()
  const [conta, setConta] = useState<ContaPagar | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadConta(params.id as string)
    }
  }, [params.id])

  const loadConta = async (id: string) => {
    try {
      const data = await getContaPagar(id)
      if (data) {
        setConta(data)
      }
    } catch (error) {
      console.error('Erro ao carregar conta:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  if (!conta) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Conta não encontrada</p>
          <button
            onClick={() => router.push('/financeiro/contas-pagar')}
            className="text-blue-600 hover:text-blue-800"
          >
            Voltar para Contas a Pagar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Editar Conta a Pagar</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <ContaPagarForm 
          conta={conta}
          onSuccess={() => router.push(`/financeiro/contas-pagar/${conta.id}`)}
        />
      </div>
    </div>
  )
}
