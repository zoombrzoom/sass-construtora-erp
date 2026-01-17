'use client'

import { useState } from 'react'
import { ContaReceberStatus, ContaReceberOrigem } from '@/types/financeiro'
import { Obra } from '@/types/obra'

interface FiltrosContasReceberProps {
  onFilterChange: (filters: {
    status?: ContaReceberStatus
    origem?: ContaReceberOrigem
    obraId?: string
    dataInicio?: string
    dataFim?: string
    busca?: string
  }) => void
  obras: Obra[]
}

export function FiltrosContasReceber({ onFilterChange, obras }: FiltrosContasReceberProps) {
  const [status, setStatus] = useState<ContaReceberStatus | ''>('')
  const [origem, setOrigem] = useState<ContaReceberOrigem | ''>('')
  const [obraId, setObraId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [busca, setBusca] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const aplicarFiltros = () => {
    onFilterChange({
      status: status || undefined,
      origem: origem || undefined,
      obraId: obraId || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      busca: busca || undefined,
    })
  }

  const limparFiltros = () => {
    setStatus('')
    setOrigem('')
    setObraId('')
    setDataInicio('')
    setDataFim('')
    setBusca('')
    onFilterChange({})
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por descrição..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContaReceberStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="recebido">Recebido</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Origem
            </label>
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value as ContaReceberOrigem | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas</option>
              <option value="financiamento">Financiamento</option>
              <option value="cliente">Cliente</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Obra
            </label>
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
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
