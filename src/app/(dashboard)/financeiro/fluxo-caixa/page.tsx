'use client'

import { useState } from 'react'
import { FluxoCaixaCalendar } from '@/components/modules/financeiro/FluxoCaixaCalendar'
import { CalendarDays, Calendar } from 'lucide-react'

export default function FluxoCaixaPage() {
  const [view, setView] = useState<'day' | 'week'>('week')

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Fluxo de Caixa</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setView('day')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'day' 
                ? 'bg-brand text-dark-800' 
                : 'bg-dark-500 text-gray-400 hover:text-brand border border-dark-100'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Dia
          </button>
          <button
            onClick={() => setView('week')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'week' 
                ? 'bg-brand text-dark-800' 
                : 'bg-dark-500 text-gray-400 hover:text-brand border border-dark-100'
            }`}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Semana
          </button>
        </div>
      </div>
      <FluxoCaixaCalendar view={view} />
    </div>
  )
}
