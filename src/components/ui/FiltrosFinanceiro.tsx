'use client'

import { useState } from 'react'
import { ContaPagarStatus, ContaPagarTipo } from '@/types/financeiro'
import { Obra } from '@/types/obra'

interface FiltrosFinanceiroProps {
  onFilterChange: (filters: {
    status?: ContaPagarStatus
    tipo?: ContaPagarTipo
    obraId?: string
    dataInicio?: string
    dataFim?: string
    busca?: string
  }) => void
  obras: Obra[]
}

export function FiltrosFinanceiro({ onFilterChange, obras }: FiltrosFinanceiroProps) {
  const [status, setStatus] = useState<ContaPagarStatus | ''>('')
  const [tipo, setTipo] = useState<ContaPagarTipo | ''>('')
  const [obraId, setObraId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [busca, setBusca] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const aplicarFiltros = () => {
    onFilterChange({
      status: status || undefined,
      tipo: tipo || undefined,
      obraId: obraId || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      busca: busca || undefined,
    })
  }

  const limparFiltros = () => {
    setStatus('')
    setTipo('')
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
              onChange={(e) => setStatus(e.target.value as ContaPagarStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as ContaPagarTipo | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="boleto">Boleto</option>
              <option value="folha">Folha</option>
              <option value="empreiteiro">Empreiteiro</option>
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
