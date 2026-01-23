'use client'

import { useEffect, useState } from 'react'
import { getDashboardData, DashboardData } from '@/lib/db/dashboard'
import Link from 'next/link'
import { Wallet, TrendingDown, TrendingUp, AlertTriangle, Building2, CreditCard, ShoppingCart, BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const dashboardData = await getDashboardData()
      setData(dashboardData)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-12 text-gray-400">
          <div className="animate-pulse">Carregando...</div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-12 text-gray-400">Erro ao carregar dados</div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-6">Dashboard</h1>
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {/* Saldo Geral */}
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-5 shadow-dark">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                Saldo Geral
              </p>
              <p className="mt-1 text-lg sm:text-2xl font-bold text-brand truncate">
                {formatCurrency(data.saldoGeral)}
              </p>
            </div>
            <div className="flex-shrink-0 p-2 bg-brand/20 rounded-lg">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-brand" />
            </div>
          </div>
        </div>

        {/* Total a Pagar */}
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-5 shadow-dark">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                A Pagar Hoje
              </p>
              <p className="mt-1 text-lg sm:text-2xl font-bold text-error truncate">
                {formatCurrency(data.totalPagarHoje)}
              </p>
            </div>
            <div className="flex-shrink-0 p-2 bg-error/20 rounded-lg">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-error" />
            </div>
          </div>
        </div>

        {/* Total a Receber */}
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-5 shadow-dark">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                A Receber Hoje
              </p>
              <p className="mt-1 text-lg sm:text-2xl font-bold text-success truncate">
                {formatCurrency(data.totalReceberHoje)}
              </p>
            </div>
            <div className="flex-shrink-0 p-2 bg-success/20 rounded-lg">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-5 shadow-dark">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                Alertas
              </p>
              <p className="mt-1 text-lg sm:text-2xl font-bold text-warning truncate">
                {data.cotacoesPendentes} pendentes
              </p>
              {data.contasVencidas > 0 && (
                <p className="text-xs text-error mt-1">
                  {data.contasVencidas} vencidas
                </p>
              )}
            </div>
            <div className="flex-shrink-0 p-2 bg-warning/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="mt-6 sm:mt-8">
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6 shadow-dark">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Link
              href="/obras"
              className="flex flex-col items-center p-4 border border-dark-100 rounded-xl hover:bg-dark-400 hover:border-brand/50 transition-all group min-h-touch"
            >
              <div className="p-3 bg-dark-400 rounded-lg group-hover:bg-brand/20 transition-colors">
                <Building2 className="w-6 h-6 text-brand" />
              </div>
              <span className="text-sm font-medium text-gray-300 mt-2 group-hover:text-brand transition-colors">Obras</span>
            </Link>
            
            <Link
              href="/financeiro/contas-pagar"
              className="flex flex-col items-center p-4 border border-dark-100 rounded-xl hover:bg-dark-400 hover:border-brand/50 transition-all group min-h-touch"
            >
              <div className="p-3 bg-dark-400 rounded-lg group-hover:bg-brand/20 transition-colors">
                <CreditCard className="w-6 h-6 text-brand" />
              </div>
              <span className="text-sm font-medium text-gray-300 mt-2 group-hover:text-brand transition-colors">Contas a Pagar</span>
            </Link>
            
            <Link
              href="/compras/requisicoes"
              className="flex flex-col items-center p-4 border border-dark-100 rounded-xl hover:bg-dark-400 hover:border-brand/50 transition-all group min-h-touch"
            >
              <div className="p-3 bg-dark-400 rounded-lg group-hover:bg-brand/20 transition-colors">
                <ShoppingCart className="w-6 h-6 text-brand" />
              </div>
              <span className="text-sm font-medium text-gray-300 mt-2 group-hover:text-brand transition-colors">Compras</span>
            </Link>
            
            <Link
              href="/financeiro/fluxo-caixa"
              className="flex flex-col items-center p-4 border border-dark-100 rounded-xl hover:bg-dark-400 hover:border-brand/50 transition-all group min-h-touch"
            >
              <div className="p-3 bg-dark-400 rounded-lg group-hover:bg-brand/20 transition-colors">
                <BarChart3 className="w-6 h-6 text-brand" />
              </div>
              <span className="text-sm font-medium text-gray-300 mt-2 group-hover:text-brand transition-colors">Fluxo de Caixa</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
