'use client'

import { useEffect, useState } from 'react'
import { getDashboardData, DashboardData } from '@/lib/db/dashboard'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Wallet, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Building2, 
  CreditCard, 
  ShoppingCart, 
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  PieChart,
  Activity
} from 'lucide-react'

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
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando dashboard...</p>
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

  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`
    }
    return formatCurrency(value)
  }

  // Calcular o valor máximo para o gráfico de barras
  const maxFluxo = Math.max(
    ...data.fluxoMensal.map(f => Math.max(f.entradas, f.saidas)),
    1
  )

  // Cores para o gráfico de pizza
  const pieColors = ['#C4A86C', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Atualizado agora</span>
          <button 
            onClick={() => { setLoading(true); loadData(); }}
            className="p-2 bg-dark-500 border border-dark-100 rounded-lg hover:border-brand transition-colors"
          >
            <Activity className="w-4 h-4 text-brand" />
          </button>
        </div>
      </div>
      
      {/* Cards de Resumo Principal */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Saldo Geral */}
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-5 shadow-dark">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                Saldo Geral
              </p>
              <p className={`mt-1 text-lg sm:text-2xl font-bold truncate ${data.saldoGeral >= 0 ? 'text-success' : 'text-error'}`}>
                {formatCurrency(data.saldoGeral)}
              </p>
            </div>
            <div className={`flex-shrink-0 p-2 rounded-lg ${data.saldoGeral >= 0 ? 'bg-success/20' : 'bg-error/20'}`}>
              <Wallet className={`w-5 h-5 sm:w-6 sm:h-6 ${data.saldoGeral >= 0 ? 'text-success' : 'text-error'}`} />
            </div>
          </div>
        </div>

        {/* A Pagar Hoje */}
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

        {/* A Receber Hoje */}
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
                {data.cotacoesPendentes + data.contasVencidas}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.contasVencidas > 0 && (
                  <span className="text-xs text-error bg-error/20 px-1.5 py-0.5 rounded">
                    {data.contasVencidas} vencidas
                  </span>
                )}
                {data.cotacoesPendentes > 0 && (
                  <span className="text-xs text-warning bg-warning/20 px-1.5 py-0.5 rounded">
                    {data.cotacoesPendentes} cotações
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 p-2 bg-warning/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Resumo do Mês + Contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-4 h-4 text-error" />
            <span className="text-xs text-gray-400">A Pagar (Mês)</span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-gray-100">{formatCompact(data.totalPagarMes)}</p>
        </div>
        
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-success" />
            <span className="text-xs text-gray-400">A Receber (Mês)</span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-gray-100">{formatCompact(data.totalReceberMes)}</p>
        </div>
        
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-xs text-gray-400">Pago (Mês)</span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-success">{formatCompact(data.totalPagoMes)}</p>
        </div>
        
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-brand" />
            <span className="text-xs text-gray-400">Recebido (Mês)</span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-brand">{formatCompact(data.totalRecebidoMes)}</p>
        </div>
        
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-brand" />
            <span className="text-xs text-gray-400">Obras Ativas</span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-gray-100">{data.obrasAtivas}</p>
        </div>
        
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-warning" />
            <span className="text-xs text-gray-400">Requisições</span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-gray-100">{data.requisicoesAbertas}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Gráfico de Fluxo de Caixa */}
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6 shadow-dark">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand" />
              Fluxo de Caixa (6 meses)
            </h2>
            <Link href="/financeiro/fluxo-caixa" className="text-xs text-brand hover:text-brand-light">
              Ver mais
            </Link>
          </div>
          
          {/* Legenda */}
          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-success rounded"></div>
              <span className="text-gray-400">Entradas</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-error rounded"></div>
              <span className="text-gray-400">Saídas</span>
            </div>
          </div>
          
          {/* Gráfico de Barras */}
          <div className="space-y-4">
            {data.fluxoMensal.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 uppercase font-medium w-12">{item.mes}</span>
                  <span className={`font-semibold ${item.saldo >= 0 ? 'text-success' : 'text-error'}`}>
                    {item.saldo >= 0 ? '+' : ''}{formatCompact(item.saldo)}
                  </span>
                </div>
                <div className="flex gap-1 h-6">
                  {/* Barra de Entradas */}
                  <div 
                    className="bg-success/80 rounded-sm transition-all duration-500"
                    style={{ width: `${(item.entradas / maxFluxo) * 50}%` }}
                    title={`Entradas: ${formatCurrency(item.entradas)}`}
                  />
                  {/* Barra de Saídas */}
                  <div 
                    className="bg-error/80 rounded-sm transition-all duration-500"
                    style={{ width: `${(item.saidas / maxFluxo) * 50}%` }}
                    title={`Saídas: ${formatCurrency(item.saidas)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de Gastos por Obra */}
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6 shadow-dark">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-brand" />
              Gastos por Obra
            </h2>
            <Link href="/obras" className="text-xs text-brand hover:text-brand-light">
              Ver obras
            </Link>
          </div>
          
          {data.gastosPorObra.length > 0 ? (
            <div className="space-y-3">
              {data.gastosPorObra.map((item, index) => (
                <div key={item.obraId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 truncate max-w-[60%]">{item.obraNome}</span>
                    <span className="text-gray-400">{formatCompact(item.valor)}</span>
                  </div>
                  <div className="h-2 bg-dark-400 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${item.percentual}%`,
                        backgroundColor: pieColors[index % pieColors.length]
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-right">{item.percentual.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum gasto registrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Próximas Contas + Obras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Próximas Contas */}
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6 shadow-dark">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand" />
              Próximas Contas
            </h2>
            <Link href="/financeiro/contas-pagar" className="text-xs text-brand hover:text-brand-light">
              Ver todas
            </Link>
          </div>
          
          {data.proximasContas.length > 0 ? (
            <div className="space-y-3">
              {data.proximasContas.map((conta) => (
                <div key={conta.id} className="flex items-center justify-between p-3 bg-dark-400 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${conta.tipo === 'pagar' ? 'bg-error/20' : 'bg-success/20'}`}>
                      {conta.tipo === 'pagar' ? (
                        <ArrowDownRight className={`w-4 h-4 text-error`} />
                      ) : (
                        <ArrowUpRight className={`w-4 h-4 text-success`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-100 truncate">{conta.descricao}</p>
                      <p className="text-xs text-gray-500">
                        {format(conta.dataVencimento, 'dd/MM/yyyy')}
                        {conta.diasRestantes < 0 && (
                          <span className="text-error ml-2">
                            ({Math.abs(conta.diasRestantes)} dias atrasado)
                          </span>
                        )}
                        {conta.diasRestantes === 0 && (
                          <span className="text-warning ml-2">(Hoje)</span>
                        )}
                        {conta.diasRestantes > 0 && (
                          <span className="text-gray-400 ml-2">
                            (em {conta.diasRestantes} dias)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ml-2 ${conta.tipo === 'pagar' ? 'text-error' : 'text-success'}`}>
                    {formatCurrency(conta.valor)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma conta próxima</p>
            </div>
          )}
        </div>

        {/* Obras Ativas */}
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6 shadow-dark">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand" />
              Obras Ativas
            </h2>
            <Link href="/obras" className="text-xs text-brand hover:text-brand-light">
              Ver todas
            </Link>
          </div>
          
          {data.obrasResumo.length > 0 ? (
            <div className="space-y-3">
              {data.obrasResumo.map((obra) => (
                <Link 
                  key={obra.id} 
                  href={`/obras/${obra.id}/editar`}
                  className="block p-3 bg-dark-400 rounded-lg hover:bg-dark-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-100 font-medium truncate">{obra.nome}</p>
                    <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded">
                      {obra.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Gasto: {formatCurrency(obra.totalGasto)}</span>
                      {obra.orcamento > 0 && (
                        <span>Orçamento: {formatCurrency(obra.orcamento)}</span>
                      )}
                    </div>
                    {obra.orcamento > 0 && (
                      <div className="h-1.5 bg-dark-300 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            obra.percentualGasto > 100 ? 'bg-error' : 
                            obra.percentualGasto > 80 ? 'bg-warning' : 'bg-brand'
                          }`}
                          style={{ width: `${Math.min(obra.percentualGasto, 100)}%` }}
                        />
                      </div>
                    )}
                    {obra.orcamento > 0 && (
                      <p className={`text-xs text-right ${
                        obra.percentualGasto > 100 ? 'text-error' : 
                        obra.percentualGasto > 80 ? 'text-warning' : 'text-gray-400'
                      }`}>
                        {obra.percentualGasto.toFixed(1)}% do orçamento
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma obra ativa</p>
            </div>
          )}
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6 shadow-dark">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Link
            href="/obras/nova"
            className="flex flex-col items-center p-4 border border-dark-100 rounded-xl hover:bg-dark-400 hover:border-brand/50 transition-all group min-h-touch"
          >
            <div className="p-3 bg-dark-400 rounded-lg group-hover:bg-brand/20 transition-colors">
              <Building2 className="w-6 h-6 text-brand" />
            </div>
            <span className="text-sm font-medium text-gray-300 mt-2 group-hover:text-brand transition-colors text-center">Nova Obra</span>
          </Link>
          
          <Link
            href="/financeiro/contas-pagar/nova"
            className="flex flex-col items-center p-4 border border-dark-100 rounded-xl hover:bg-dark-400 hover:border-brand/50 transition-all group min-h-touch"
          >
            <div className="p-3 bg-dark-400 rounded-lg group-hover:bg-brand/20 transition-colors">
              <CreditCard className="w-6 h-6 text-brand" />
            </div>
            <span className="text-sm font-medium text-gray-300 mt-2 group-hover:text-brand transition-colors text-center">Nova Conta</span>
          </Link>
          
          <Link
            href="/compras/requisicoes/nova"
            className="flex flex-col items-center p-4 border border-dark-100 rounded-xl hover:bg-dark-400 hover:border-brand/50 transition-all group min-h-touch"
          >
            <div className="p-3 bg-dark-400 rounded-lg group-hover:bg-brand/20 transition-colors">
              <ShoppingCart className="w-6 h-6 text-brand" />
            </div>
            <span className="text-sm font-medium text-gray-300 mt-2 group-hover:text-brand transition-colors text-center">Nova Requisição</span>
          </Link>
          
          <Link
            href="/financeiro/fluxo-caixa"
            className="flex flex-col items-center p-4 border border-dark-100 rounded-xl hover:bg-dark-400 hover:border-brand/50 transition-all group min-h-touch"
          >
            <div className="p-3 bg-dark-400 rounded-lg group-hover:bg-brand/20 transition-colors">
              <BarChart3 className="w-6 h-6 text-brand" />
            </div>
            <span className="text-sm font-medium text-gray-300 mt-2 group-hover:text-brand transition-colors text-center">Fluxo de Caixa</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
