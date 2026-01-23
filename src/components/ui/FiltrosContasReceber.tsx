'use client'

import { useState } from 'react'
import { ContaReceberStatus, ContaReceberOrigem } from '@/types/financeiro'
import { Obra } from '@/types/obra'
import { Search, Filter, X } from 'lucide-react'

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
    <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                onFilterChange({ busca: e.target.value || undefined })
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
            />
          </div>
        </div>
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className={`flex items-center justify-center px-4 py-2.5 border rounded-lg transition-colors min-h-touch ${
            mostrarFiltros 
              ? 'bg-brand/20 border-brand text-brand' 
              : 'border-dark-100 text-gray-400 hover:border-brand hover:text-brand'
          }`}
        >
          <Filter className="w-4 h-4 mr-2" />
          {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </button>
      </div>

      {mostrarFiltros && (
        <div className="mt-4 pt-4 border-t border-dark-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContaReceberStatus | '')}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
              >
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="recebido">Recebido</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Origem
              </label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value as ContaReceberOrigem | '')}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
              >
                <option value="">Todas</option>
                <option value="financiamento">Financiamento</option>
                <option value="cliente">Cliente</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Obra
              </label>
              <select
                value={obraId}
                onChange={(e) => setObraId(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
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
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-4 border-t border-dark-100">
            <button
              onClick={limparFiltros}
              className="flex items-center justify-center px-4 py-2.5 border border-dark-100 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors min-h-touch"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </button>
            <button
              onClick={aplicarFiltros}
              className="flex items-center justify-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
