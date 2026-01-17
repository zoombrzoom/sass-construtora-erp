'use client'

import { useEffect, useState } from 'react'
import { getDashboardData, DashboardData } from '@/lib/db/dashboard'
import Link from 'next/link'

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
        <div className="text-center py-12">Carregando...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">Erro ao carregar dados</div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Saldo Geral
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    R$ {data.saldoGeral.toFixed(2).replace('.', ',')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔴</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total a Pagar Hoje
                  </dt>
                  <dd className="text-lg font-semibold text-red-600">
                    R$ {data.totalPagarHoje.toFixed(2).replace('.', ',')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🟢</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total a Receber Hoje
                  </dt>
                  <dd className="text-lg font-semibold text-green-600">
                    R$ {data.totalReceberHoje.toFixed(2).replace('.', ',')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Alertas
                  </dt>
                  <dd className="text-lg font-semibold text-yellow-600">
                    {data.cotacoesPendentes} cotações pendentes
                  </dd>
                  {data.contasVencidas > 0 && (
                    <dd className="text-sm text-red-600 mt-1">
                      {data.contasVencidas} contas vencidas
                    </dd>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link
              href="/obras"
              className="text-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <div className="text-2xl mb-2">🏗️</div>
              <div className="text-sm font-medium">Obras</div>
            </Link>
            <Link
              href="/financeiro/contas-pagar"
              className="text-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <div className="text-2xl mb-2">💳</div>
              <div className="text-sm font-medium">Contas a Pagar</div>
            </Link>
            <Link
              href="/compras/requisicoes"
              className="text-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <div className="text-2xl mb-2">🛒</div>
              <div className="text-sm font-medium">Compras</div>
            </Link>
            <Link
              href="/financeiro/fluxo-caixa"
              className="text-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium">Fluxo de Caixa</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
