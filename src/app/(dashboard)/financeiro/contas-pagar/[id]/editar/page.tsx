'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ContaPagar } from '@/types/financeiro'
import { getContaPagar } from '@/lib/db/contasPagar'
import { ContaPagarForm } from '@/components/modules/financeiro/ContaPagarForm'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'

export default function EditarContaPagarPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const permissions = getPermissions(user)
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
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!conta) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Conta não encontrada</p>
        <button
          onClick={() => router.push('/financeiro/contas-pagar')}
          className="text-brand hover:text-brand-light"
        >
          Voltar para Contas a Pagar
        </button>
      </div>
    )
  }

  if (conta.tipo === 'particular' && !permissions.canAccessContasParticulares) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Você não tem acesso a contas particulares.</p>
        <button
          onClick={() => router.push('/financeiro/contas-pagar')}
          className="text-brand hover:text-brand-light"
        >
          Voltar para Contas a Pagar
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Editar Conta a Pagar</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <ContaPagarForm 
          conta={conta}
          onSuccess={() => router.push(`/financeiro/contas-pagar/${conta.id}`)}
        />
      </div>
    </div>
  )
}
