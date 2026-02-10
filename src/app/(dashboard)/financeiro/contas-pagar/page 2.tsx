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
import { Plus, Eye, FileText, CreditCard } from 'lucide-react'

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

    if (filtros.tipo) {
      filtradas = filtradas.filter(conta => conta.tipo === filtros.tipo)
    }

    if (filtros.dataInicio) {
      const dataInicio = new Date(filtros.dataInicio)
      filtradas = filtradas.filter(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        return dataVenc >= dataInicio
      })
    }

    if (filtros.dataFim) {
      const dataFim = new Date(filtros.dataFim)
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
        const tipo = conta.tipo.toLowerCase()
        return descricao.includes(buscaLower) || tipo.includes(buscaLower)
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
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Contas a Pagar</h1>
        <Link
          href="/financeiro/contas-pagar/nova"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Link>
      </div>

      <FiltrosFinanceiro 
        onFilterChange={setFiltros}
        obras={obras}
      />

      {contasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          {contas.length === 0 
            ? 'Nenhuma conta a pagar cadastrada'
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
                          conta.status === 'pago' ? 'bg-success/20 text-success' :
                          conta.status === 'vencido' ? 'bg-error/20 text-error' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {conta.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">
                        Vencimento: {format(toDate(conta.dataVencimento), 'dd/MM/yyyy')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Tipo: {conta.tipo} | Obra ID: {conta.obraId.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/financeiro/contas-pagar/${conta.id}`}
                        className="flex items-center text-brand hover:text-brand-light text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalhes
                      </Link>
                      {conta.comprovanteUrl && (
                        <a
                          href={conta.comprovanteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-gray-400 hover:text-brand text-sm font-medium transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Comprovante
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
