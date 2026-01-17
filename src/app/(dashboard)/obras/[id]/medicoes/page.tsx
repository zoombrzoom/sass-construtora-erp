'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Medicao } from '@/types/medicao'
import { getMedicoes } from '@/lib/db/medicoes'
import Link from 'next/link'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'

export default function MedicoesPage() {
  const params = useParams()
  const obraId = params.id as string
  const [medicoes, setMedicoes] = useState<Medicao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (obraId) {
      loadMedicoes()
    }
  }, [obraId])

  const loadMedicoes = async () => {
    try {
      const data = await getMedicoes({ obraId })
      setMedicoes(data)
    } catch (error) {
      console.error('Erro ao carregar medições:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Medições de Empreiteiros</h1>
        <Link
          href={`/obras/${obraId}/medicoes/nova`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Nova Medição
        </Link>
      </div>

      {medicoes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhuma medição cadastrada
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {medicoes.map((medicao) => (
              <li key={medicao.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {medicao.empreiteiro} - {medicao.servico}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {medicao.percentualExecutado}% executado | Valor Total: R$ {medicao.valorTotal.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        Valor a Liberar: R$ {medicao.valorLiberado.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Data: {format(toDate(medicao.dataMedicao), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
