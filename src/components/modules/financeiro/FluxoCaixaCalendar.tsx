'use client'

import { useEffect, useState } from 'react'
import { getFluxoCaixa, FluxoCaixaPeriodo } from '@/lib/db/fluxoCaixa'
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns'

interface FluxoCaixaCalendarProps {
  view: 'day' | 'week'
}

export function FluxoCaixaCalendar({ view }: FluxoCaixaCalendarProps) {
  const [data, setData] = useState<FluxoCaixaPeriodo | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    loadData()
  }, [currentDate, view])

  const loadData = async () => {
    try {
      let inicio: Date
      let fim: Date

      if (view === 'day') {
        inicio = new Date(currentDate)
        fim = new Date(currentDate)
      } else {
        inicio = startOfWeek(currentDate)
        fim = endOfWeek(currentDate)
      }

      const fluxoData = await getFluxoCaixa(inicio, fim)
      setData(fluxoData)
    } catch (error) {
      console.error('Erro ao carregar fluxo de caixa:', error)
    } finally {
      setLoading(false)
    }
  }

  const previousPeriod = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, -1))
    } else {
      setCurrentDate(addDays(currentDate, -7))
    }
  }

  const nextPeriod = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, 1))
    } else {
      setCurrentDate(addDays(currentDate, 7))
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  if (!data) {
    return <div className="text-center py-12">Erro ao carregar dados</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={previousPeriod}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← Anterior
        </button>
        <h2 className="text-xl font-semibold">
          {view === 'day' 
            ? format(currentDate, "dd 'de' MMMM 'de' yyyy")
            : `${format(data.inicio, 'dd/MM')} - ${format(data.fim, 'dd/MM/yyyy')}`
          }
        </h2>
        <button
          onClick={nextPeriod}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Próximo →
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entradas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saídas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.dias.map((dia, index) => (
              <tr key={index} className={isSameDay(dia.data, new Date()) ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(dia.data, 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  R$ {dia.entradas.toFixed(2).replace('.', ',')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                  R$ {dia.saidas.toFixed(2).replace('.', ',')}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                  dia.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  R$ {dia.saldo.toFixed(2).replace('.', ',')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Total
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                R$ {data.totalEntradas.toFixed(2).replace('.', ',')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                R$ {data.totalSaidas.toFixed(2).replace('.', ',')}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                data.saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                R$ {data.saldoFinal.toFixed(2).replace('.', ',')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
