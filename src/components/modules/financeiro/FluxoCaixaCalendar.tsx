'use client'

import { useEffect, useState } from 'react'
import { getFluxoCaixa, FluxoCaixaPeriodo } from '@/lib/db/fluxoCaixa'
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">Erro ao carregar dados</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <button
          onClick={previousPeriod}
          className="flex items-center px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Anterior
        </button>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-100">
          {view === 'day' 
            ? format(currentDate, "dd 'de' MMMM 'de' yyyy")
            : `${format(data.inicio, 'dd/MM')} - ${format(data.fim, 'dd/MM/yyyy')}`
          }
        </h2>
        <button
          onClick={nextPeriod}
          className="flex items-center px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors"
        >
          Próximo
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-dark-100">
            <thead className="bg-dark-400">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Entradas
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Saídas
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {data.dias.map((dia, index) => (
                <tr key={index} className={isSameDay(dia.data, new Date()) ? 'bg-brand/10' : ''}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                    {format(dia.data, 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-success">
                    {formatCurrency(dia.entradas)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-error">
                    {formatCurrency(dia.saidas)}
                  </td>
                  <td className={`px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    dia.saldo >= 0 ? 'text-success' : 'text-error'
                  }`}>
                    {formatCurrency(dia.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-dark-400">
              <tr>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-100">
                  Total
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-success">
                  {formatCurrency(data.totalEntradas)}
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-error">
                  {formatCurrency(data.totalSaidas)}
                </td>
                <td className={`px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-bold ${
                  data.saldoFinal >= 0 ? 'text-success' : 'text-error'
                }`}>
                  {formatCurrency(data.saldoFinal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
