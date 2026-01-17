'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Obra } from '@/types/obra'
import { getObra } from '@/lib/db/obras'
import { ObraForm } from '@/components/modules/obras/ObraForm'

export default function EditarObraPage() {
  const params = useParams()
  const [obra, setObra] = useState<Obra | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadObra(params.id as string)
    }
  }, [params.id])

  const loadObra = async (id: string) => {
    try {
      const data = await getObra(id)
      setObra(data)
    } catch (error) {
      console.error('Erro ao carregar obra:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  if (!obra) {
    return <div className="text-center py-12">Obra não encontrada</div>
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Editar Obra</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <ObraForm obra={obra} />
      </div>
    </div>
  )
}
