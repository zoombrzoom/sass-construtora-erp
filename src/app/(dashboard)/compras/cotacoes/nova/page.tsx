'use client'

import { CotacaoForm } from '@/components/modules/compras/CotacaoForm'
import { useSearchParams } from 'next/navigation'

export default function NovaCotacaoPage() {
  const searchParams = useSearchParams()
  const requisicaoId = searchParams.get('requisicaoId')

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Nova Cotação</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <CotacaoForm initialRequisicaoId={requisicaoId || undefined} />
      </div>
    </div>
  )
}
