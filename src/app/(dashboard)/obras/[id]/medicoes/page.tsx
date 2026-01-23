'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Medicao } from '@/types/medicao'
import { getMedicoes } from '@/lib/db/medicoes'
import Link from 'next/link'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'
import { Plus, Ruler } from 'lucide-react'

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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Medições de Empreiteiros</h1>
        <Link
          href={`/obras/${obraId}/medicoes/nova`}
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Medição
        </Link>
      </div>

      {medicoes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Ruler className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          Nenhuma medição cadastrada
        </div>
      ) : (
        <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <ul className="divide-y divide-dark-100">
            {medicoes.map((medicao) => (
              <li key={medicao.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-100">
                        {medicao.empreiteiro} - {medicao.servico}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        {medicao.percentualExecutado}% executado | Valor Total: {formatCurrency(medicao.valorTotal)}
                      </p>
                      <p className="text-sm text-success font-medium">
                        Valor a Liberar: {formatCurrency(medicao.valorLiberado)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
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
