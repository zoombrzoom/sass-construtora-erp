'use client'

import { useEffect, useState } from 'react'
import { ContaPagar, ContaPagarStatus, ContaPagarTipo } from '@/types/financeiro'
import { getContasPagar } from '@/lib/db/contasPagar'
import { getObras } from '@/lib/db/obras'
import { FiltrosFinanceiro } from '@/components/ui/FiltrosFinanceiro'
import Link from 'next/link'
import { format } from 'date-fns'
import { Obra } from '@/types/obra'
import { toDate } from '@/utils/date'

export default function ContasPagarPage() {
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [contasFiltradas, setContasFiltradas] = useState<ContaPagar[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<{
    status?: ContaPagarStatus
    tipo?: ContaPagarTipo
    obraId?: string
    dataInicio?: string
    dataFim?: string
    busca?: string
  }>({})

  useEffect(() => {
    loadObras()
  }, [])

  useEffect(() => {
    loadContas()
  }, [filtros.status, filtros.obraId])

  useEffect(() => {
    aplicarFiltros()
  }, [contas, filtros.tipo, filtros.dataInicio, filtros.dataFim, filtros.busca])

  const loadObras = async () => {
    try {
      const data = await getObras()
      setObras(data)
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    }
  }

  const loadContas = async () => {
    try {
      const data = await getContasPagar({
        status: filtros.status,
        obraId: filtros.obraId,
      })
      setContas(data)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    } finally {
      setLoading(false)
    }
  }

  const aplicarFiltros = () => {
    let filtradas = [...contas]

    // Filtro por tipo
    if (filtros.tipo) {
      filtradas = filtradas.filter(conta => conta.tipo === filtros.tipo)
    }

    // Filtro por data
    if (filtros.dataInicio) {
      const dataInicio = new Date(filtros.dataInicio)
      filtradas = filtradas.filter(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        return dataVenc >= dataInicio
      })
    }

    if (filtros.dataFim) {
      const dataFim = new Date(filtros.dataFim)
      dataFim.setHours(23, 59, 59, 999) // Fim do dia
      filtradas = filtradas.filter(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        return dataVenc <= dataFim
      })
    }

    // Filtro por busca (descrição)
    if (filtros.busca) {
      const buscaLower = filtros.busca.toLowerCase()
      filtradas = filtradas.filter(conta => {
        const descricao = conta.descricao?.toLowerCase() || ''
        const tipo = conta.tipo.toLowerCase()
        return descricao.includes(buscaLower) || tipo.includes(buscaLower)
      })
    }

    setContasFiltradas(filtradas)
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contas a Pagar</h1>
        <Link
          href="/financeiro/contas-pagar/nova"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Nova Conta
        </Link>
      </div>

      <FiltrosFinanceiro 
        onFilterChange={setFiltros}
        obras={obras}
      />

      {contasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {contas.length === 0 
            ? 'Nenhuma conta a pagar cadastrada'
            : 'Nenhuma conta encontrada com os filtros aplicados'
          }
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-2 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">
              Mostrando {contasFiltradas.length} de {contas.length} conta(s)
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {contasFiltradas.map((conta) => (
              <li key={conta.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          R$ {conta.valor.toFixed(2).replace('.', ',')}
                        </p>
                        <span className={`ml-2 px-2 py-1 text-xs rounded ${
                          conta.status === 'pago' ? 'bg-green-100 text-green-800' :
                          conta.status === 'vencido' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {conta.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Vencimento: {format(toDate(conta.dataVencimento), 'dd/MM/yyyy')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Tipo: {conta.tipo} | Obra ID: {conta.obraId}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/financeiro/contas-pagar/${conta.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Ver Detalhes
                      </Link>
                      {conta.comprovanteUrl && (
                        <a
                          href={conta.comprovanteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Ver Comprovante
                        </a>
                      )}
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
