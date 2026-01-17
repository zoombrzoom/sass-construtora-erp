'use client'

import { useState } from 'react'
import { ObraStatus } from '@/types/obra'

interface FiltrosObrasProps {
  onFilterChange: (filters: {
    status?: ObraStatus
    busca?: string
  }) => void
}

export function FiltrosObras({ onFilterChange }: FiltrosObrasProps) {
  const [status, setStatus] = useState<ObraStatus | ''>('')
  const [busca, setBusca] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const aplicarFiltros = () => {
    onFilterChange({
      status: status || undefined,
      busca: busca || undefined,
    })
  }

  const limparFiltros = () => {
    setStatus('')
    setBusca('')
    onFilterChange({})
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por nome ou endereço..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              onFilterChange({ busca: e.target.value || undefined })
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="ml-4 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </button>
      </div>

      {mostrarFiltros && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ObraStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="ativa">Ativa</option>
              <option value="pausada">Pausada</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
        </div>
      )}

      {mostrarFiltros && (
        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
          <button
            onClick={limparFiltros}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Limpar Filtros
          </button>
          <button
            onClick={aplicarFiltros}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Aplicar Filtros
          </button>
        </div>
      )}
    </div>
  )
}
