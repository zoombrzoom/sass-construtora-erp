'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Obra } from '@/types/obra'
import { getObra } from '@/lib/db/obras'
import { ObraForm } from '@/components/modules/obras/ObraForm'
import Link from 'next/link'

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Editar Obra</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/obras/${obra.id}/gastos`}
            className="px-3 py-2 text-sm border border-dark-100 rounded-lg text-gray-300 hover:text-brand hover:border-brand transition-colors"
          >
            Ver Gastos
          </Link>
          <Link
            href={`/obras/${obra.id}/medicoes`}
            className="px-3 py-2 text-sm border border-dark-100 rounded-lg text-gray-300 hover:text-brand hover:border-brand transition-colors"
          >
            Ver Medições
          </Link>
        </div>
      </div>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <ObraForm obra={obra} />
      </div>
    </div>
  )
}
