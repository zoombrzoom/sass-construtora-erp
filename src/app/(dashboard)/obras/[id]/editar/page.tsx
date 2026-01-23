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
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!obra) {
    return <div className="text-center py-12 text-gray-500">Obra não encontrada</div>
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Editar Obra</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <ObraForm obra={obra} />
      </div>
    </div>
  )
}
