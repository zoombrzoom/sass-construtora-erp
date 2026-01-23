'use client'

import { CotacaoForm } from '@/components/modules/compras/CotacaoForm'
import { useSearchParams } from 'next/navigation'

export default function NovaCotacaoPage() {
  const searchParams = useSearchParams()
  const requisicaoId = searchParams.get('requisicaoId')

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Nova Cotação</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <CotacaoForm initialRequisicaoId={requisicaoId || undefined} />
      </div>
    </div>
  )
}
