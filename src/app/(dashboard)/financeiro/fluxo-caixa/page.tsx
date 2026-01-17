'use client'

import { useState } from 'react'
import { FluxoCaixaCalendar } from '@/components/modules/financeiro/FluxoCaixaCalendar'

export default function FluxoCaixaPage() {
  const [view, setView] = useState<'day' | 'week'>('week')

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Fluxo de Caixa</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setView('day')}
            className={`px-4 py-2 rounded-md ${
              view === 'day' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded-md ${
              view === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Semana
          </button>
        </div>
      </div>
      <FluxoCaixaCalendar view={view} />
    </div>
  )
}
