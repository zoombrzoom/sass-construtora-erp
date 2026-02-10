'use client'

import { useEffect, useState } from 'react'
import { ContaReceber, ContaReceberStatus, ContaReceberOrigem } from '@/types/financeiro'
import { getContasReceber } from '@/lib/db/contasReceber'
import { getObras } from '@/lib/db/obras'
import { FiltrosContasReceber } from '@/components/ui/FiltrosContasReceber'
import Link from 'next/link'
import { format } from 'date-fns'
import { Obra } from '@/types/obra'
import { toDate } from '@/utils/date'
import { Plus, Eye, TrendingUp } from 'lucide-react'

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

export default function ContasReceberPage() {
  const [contas, setContas] = useState<ContaReceber[]>([])
  const [contasFiltradas, setContasFiltradas] = useState<ContaReceber[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<{
    status?: ContaReceberStatus
    origem?: ContaReceberOrigem
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
  }, [contas, filtros.origem, filtros.dataInicio, filtros.dataFim, filtros.busca])

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
      const data = await getContasReceber({
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

    if (filtros.origem) {
      filtradas = filtradas.filter(conta => conta.origem === filtros.origem)
    }

    if (filtros.dataInicio) {
      const dataInicio = parseDateInput(filtros.dataInicio)
      filtradas = filtradas.filter(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        return dataVenc >= dataInicio
      })
    }

    if (filtros.dataFim) {
      const dataFim = parseDateInput(filtros.dataFim)
      dataFim.setHours(23, 59, 59, 999)
      filtradas = filtradas.filter(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        return dataVenc <= dataFim
      })
    }

    if (filtros.busca) {
      const buscaLower = filtros.busca.toLowerCase()
      filtradas = filtradas.filter(conta => {
        const descricao = conta.descricao?.toLowerCase() || ''
        const origem = conta.origem.toLowerCase()
        return descricao.includes(buscaLower) || origem.includes(buscaLower)
      })
    }

    setContasFiltradas(filtradas)
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
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Contas a Receber</h1>
        <Link
          href="/financeiro/contas-receber/nova"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Link>
      </div>

      <FiltrosContasReceber 
        onFilterChange={setFiltros}
        obras={obras}
      />

      {contasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          {contas.length === 0 
            ? 'Nenhuma conta a receber cadastrada'
            : 'Nenhuma conta encontrada com os filtros aplicados'
          }
        </div>
      ) : (
        <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-dark-400 border-b border-dark-100">
            <p className="text-sm text-gray-400">
              Mostrando {contasFiltradas.length} de {contas.length} conta(s)
            </p>
          </div>
          <ul className="divide-y divide-dark-100">
            {contasFiltradas.map((conta) => (
              <li key={conta.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <p className="text-base font-semibold text-gray-100">
                          {formatCurrency(conta.valor)}
                        </p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          conta.status === 'recebido' ? 'bg-success/20 text-success' :
                          conta.status === 'atrasado' ? 'bg-error/20 text-error' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {conta.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">
                        Vencimento: {format(toDate(conta.dataVencimento), 'dd/MM/yyyy')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Origem: {conta.origem} {conta.obraId && `| Obra ID: ${conta.obraId.slice(0, 8)}...`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/financeiro/contas-receber/${conta.id}`}
                        className="flex items-center text-brand hover:text-brand-light text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalhes
                      </Link>
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
