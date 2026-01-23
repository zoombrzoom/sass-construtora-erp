'use client'

import { useParams } from 'next/navigation'
import { MedicaoForm } from '@/components/modules/obras/MedicaoForm'

export default function NovaMedicaoPage() {
  const params = useParams()
  const obraId = params.id as string

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Nova Medição</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <MedicaoForm />
      </div>
    </div>
  )
}
