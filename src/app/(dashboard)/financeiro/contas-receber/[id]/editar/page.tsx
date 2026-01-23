'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ContaReceber } from '@/types/financeiro'
import { getContaReceber } from '@/lib/db/contasReceber'
import { ContaReceberForm } from '@/components/modules/financeiro/ContaReceberForm'
import { useRouter } from 'next/navigation'

export default function EditarContaReceberPage() {
  const params = useParams()
  const router = useRouter()
  const [conta, setConta] = useState<ContaReceber | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadConta(params.id as string)
    }
  }, [params.id])

  const loadConta = async (id: string) => {
    try {
      const data = await getContaReceber(id)
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
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!conta) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Conta não encontrada</p>
        <button
          onClick={() => router.push('/financeiro/contas-receber')}
          className="text-brand hover:text-brand-light"
        >
          Voltar para Contas a Receber
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Editar Conta a Receber</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <ContaReceberForm 
          conta={conta}
          onSuccess={() => router.push(`/financeiro/contas-receber/${conta.id}`)}
        />
      </div>
    </div>
  )
}
