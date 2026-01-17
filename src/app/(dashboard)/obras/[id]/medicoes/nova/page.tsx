'use client'

import { useParams } from 'next/navigation'
import { MedicaoForm } from '@/components/modules/obras/MedicaoForm'

export default function NovaMedicaoPage() {
  const params = useParams()
  const obraId = params.id as string

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Nova Medição</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <MedicaoForm />
      </div>
    </div>
  )
}
