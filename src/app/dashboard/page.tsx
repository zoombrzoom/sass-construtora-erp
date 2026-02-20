'use client'

import { useEffect, useMemo, useState } from 'react'
import { getDashboardData, DashboardData } from '@/lib/db/dashboard'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'
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
  CheckCircle2,
  Package,
  PieChart,
  Activity,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

type PeriodoContas = 'aberto' | 'semana' | 'quinzena' | 'mes'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [periodoContas, setPeriodoContas] = useState<PeriodoContas>('semana')
  const [categoriaContas, setCategoriaContas] = useState<string>('todas')
  const [loading, setLoading] = useState(true)
  const permissions = getPermissions(user)
  const canViewSensitiveDashboardFinance = permissions.canViewSensitiveDashboardFinance
  const canAccessFluxoCaixa = permissions.canAccessFluxoCaixa
  const canViewAllFinanceiro = permissions.canViewAllFinanceiro
  const canAccessContasParticulares = permissions.canAccessContasParticulares
  const canViewAllObras = permissions.canViewAllObras

  const loadData = async () => {
    if (!user) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      const dashboardData = await getDashboardData({
        includeParticular: canAccessContasParticulares,
        includeContasReceber: canViewSensitiveDashboardFinance,
        includeCotacoes: canViewAllFinanceiro,
        obraId: canViewAllObras ? undefined : user.obraId,
      })
      setData(dashboardData)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    setLoading(true)
    loadData()
  }, [
    authLoading,
    user?.id,
    user?.obraId,
    canAccessContasParticulares,
    canViewSensitiveDashboardFinance,
    canViewAllFinanceiro,
    canViewAllObras,
  ])

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

  const showFluxoCaixaCard = canViewSensitiveDashboardFinance && canAccessFluxoCaixa

  const categoriasContas = useMemo(() => {
    const base = data?.contasEmAberto || []
    const categorias = Array.from(new Set(base.map((conta) => conta.categoria))).sort()
    return ['todas', ...categorias]
  }, [data])

  const contasEmAbertoFiltradas = useMemo(() => {
    const base = data?.contasEmAberto || []
    const hoje = new Date()
    const limite = new Date()
    let diasLimite = 0

    if (periodoContas === 'semana') diasLimite = 7
    if (periodoContas === 'quinzena') diasLimite = 15
    if (periodoContas === 'mes') diasLimite = 30

    if (diasLimite > 0) {
      limite.setDate(hoje.getDate() + diasLimite)
      limite.setHours(23, 59, 59, 999)
    }

    return base.filter((conta) => {
      if (categoriaContas !== 'todas' && conta.categoria !== categoriaContas) return false
      if (diasLimite === 0) return true
      return conta.dataVencimento <= limite
    })
  }, [data, periodoContas, categoriaContas])

  const totalContasEmAbertoFiltradas = useMemo(() => {
    return contasEmAbertoFiltradas.reduce((sum, conta) => sum + conta.valor, 0)
  }, [contasEmAbertoFiltradas])

  const totalContasVencidasFiltradas = useMemo(() => {
    return contasEmAbertoFiltradas.filter((conta) => conta.diasRestantes < 0).length
  }, [contasEmAbertoFiltradas])

  const pieColors = ['#C4A86C', '#4F8CFF', '#7C5CFC', '#2DD4BF', '#F472B6']

  const maxFluxo = Math.max(
    ...(data?.fluxoMensal || []).map((f) => Math.max(f.entradas, f.saidas)),
    1
  )

  if (loading || authLoading) {
    return (
      <div className="py-6">
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-6">
        <div className="text-center py-16" style={{ color: 'var(--foreground-muted)' }}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Erro ao carregar dados</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
              Visão Geral
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Bom dia, {user?.nome?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--foreground-muted)' }}>
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Atualizado agora</span>
          <button
            onClick={() => { setLoading(true); loadData(); }}
            className="p-2.5 rounded-xl transition-all hover:scale-105"
            style={{
              background: 'var(--background-card)',
              border: '1px solid var(--border)',
              color: 'var(--primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Saldo Geral */}
        {canViewSensitiveDashboardFinance && (
          <div className="stat-card animate-fade-in-up stagger-1">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
                  Saldo Geral
                </p>
                <p className={`mt-2 text-lg sm:text-2xl font-bold truncate ${data.saldoGeral >= 0 ? 'text-success' : 'text-error'}`}>
                  {formatCurrency(data.saldoGeral)}
                </p>
              </div>
              <div className={`stat-icon ${data.saldoGeral >= 0 ? 'bg-success/10' : 'bg-error/10'}`}>
                <Wallet className={`w-5 h-5 ${data.saldoGeral >= 0 ? 'text-success' : 'text-error'}`} />
              </div>
            </div>
          </div>
        )}

        {/* A Pagar Hoje */}
        <div className="stat-card animate-fade-in-up stagger-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
                A Pagar Hoje
              </p>
              <p className="mt-2 text-lg sm:text-2xl font-bold text-error truncate">
                {formatCurrency(data.totalPagarHoje)}
              </p>
            </div>
            <div className="stat-icon bg-error/10">
              <TrendingDown className="w-5 h-5 text-error" />
            </div>
          </div>
        </div>

        {/* A Receber Hoje */}
        {canViewSensitiveDashboardFinance && (
          <div className="stat-card animate-fade-in-up stagger-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
                  A Receber Hoje
                </p>
                <p className="mt-2 text-lg sm:text-2xl font-bold text-success truncate">
                  {formatCurrency(data.totalReceberHoje)}
                </p>
              </div>
              <div className="stat-icon bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
            </div>
          </div>
        )}

        {/* Alertas */}
        <div className="stat-card animate-fade-in-up stagger-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
                Alertas
              </p>
              <p className="mt-2 text-lg sm:text-2xl font-bold truncate" style={{ color: 'var(--warning)' }}>
                {data.cotacoesPendentes + data.contasVencidas}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {data.contasVencidas > 0 && (
                  <span className="badge badge-error">{data.contasVencidas} vencidas</span>
                )}
                {data.cotacoesPendentes > 0 && (
                  <span className="badge badge-warning">{data.cotacoesPendentes} cotações</span>
                )}
              </div>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--warning)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ===== RESUMO DO MÊS ===== */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${canViewSensitiveDashboardFinance ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
        <div className="card-static p-4 animate-fade-in-up stagger-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-error" />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>A Pagar (Mês)</span>
          </div>
          <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--foreground)' }}>{formatCompact(data.totalPagarMes)}</p>
        </div>

        {canViewSensitiveDashboardFinance && (
          <div className="card-static p-4 animate-fade-in-up stagger-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>A Receber (Mês)</span>
            </div>
            <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--foreground)' }}>{formatCompact(data.totalReceberMes)}</p>
          </div>
        )}

        <div className="card-static p-4 animate-fade-in-up stagger-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Pago (Mês)</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-success">{formatCompact(data.totalPagoMes)}</p>
        </div>

        {canViewSensitiveDashboardFinance && (
          <div className="card-static p-4 animate-fade-in-up stagger-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Recebido (Mês)</span>
            </div>
            <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--primary)' }}>{formatCompact(data.totalRecebidoMes)}</p>
          </div>
        )}

        <div className="card-static p-4 animate-fade-in-up stagger-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-blue)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Obras Ativas</span>
          </div>
          <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--foreground)' }}>{data.obrasAtivas}</p>
        </div>

        <div className="card-static p-4 animate-fade-in-up stagger-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-orange)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Requisições</span>
          </div>
          <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--foreground)' }}>{data.requisicoesAbertas}</p>
        </div>
      </div>

      {/* ===== CONTAS EM ABERTO ===== */}
      <div className="card-static p-5 sm:p-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'rgba(196, 168, 108, 0.1)' }}>
              <CreditCard className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Contas em Aberto</h2>
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Preview das próximas contas</p>
            </div>
          </div>
          <Link
            href="/financeiro/contas-pagar"
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--primary)', background: 'rgba(196, 168, 108, 0.08)' }}
          >
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'aberto', label: 'Todas em aberto' },
              { value: 'semana', label: 'Semana' },
              { value: 'quinzena', label: 'Quinzenal' },
              { value: 'mes', label: 'Mensal' },
            ].map((periodo) => (
              <button
                key={periodo.value}
                onClick={() => setPeriodoContas(periodo.value as PeriodoContas)}
                className="px-3 py-2 text-xs font-medium rounded-lg transition-all"
                style={periodoContas === periodo.value ? {
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(196, 168, 108, 0.3)',
                } : {
                  background: 'var(--background-tertiary)',
                  color: 'var(--foreground-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {periodo.label}
              </button>
            ))}
          </div>
          <select
            value={categoriaContas}
            onChange={(e) => setCategoriaContas(e.target.value)}
            className="w-full text-sm"
          >
            <option value="todas">Todas as categorias</option>
            {categoriasContas.filter((categoria) => categoria !== 'todas').map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: 'var(--background-tertiary)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Qtd. contas</p>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--foreground)' }}>{contasEmAbertoFiltradas.length}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--background-tertiary)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Total</p>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--warning)' }}>{formatCurrency(totalContasEmAbertoFiltradas)}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--background-tertiary)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Vencidas</p>
            <p className="text-lg font-bold mt-1 text-error">{totalContasVencidasFiltradas}</p>
          </div>
        </div>

        {contasEmAbertoFiltradas.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {contasEmAbertoFiltradas.map((conta) => (
              <div key={conta.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl transition-all hover:scale-[1.01]" style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border-light)' }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{conta.descricao}</p>
                    <span className="badge badge-brand">{conta.categoria}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>
                    Vencimento: {format(conta.dataVencimento, 'dd/MM/yyyy')}
                    {conta.diasRestantes < 0 && <span className="text-error ml-2 font-semibold">({Math.abs(conta.diasRestantes)} dia(s) atrasada)</span>}
                    {conta.diasRestantes === 0 && <span className="ml-2 font-semibold" style={{ color: 'var(--warning)' }}>(vence hoje)</span>}
                    {conta.diasRestantes > 0 && <span className="ml-2" style={{ color: 'var(--foreground-muted)' }}>(vence em {conta.diasRestantes} dia(s))</span>}
                  </p>
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--warning)' }}>{formatCurrency(conta.valor)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10" style={{ color: 'var(--foreground-muted)' }}>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma conta em aberto nesse filtro.</p>
          </div>
        )}
      </div>

      {/* ===== GRÁFICOS ===== */}
      <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${showFluxoCaixaCard ? 'lg:grid-cols-2' : ''}`}>
        {/* Fluxo de Caixa */}
        {showFluxoCaixaCard && (
          <div className="card-static p-5 sm:p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="stat-icon" style={{ background: 'rgba(79, 140, 255, 0.1)' }}>
                  <BarChart3 className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Fluxo de Caixa</h2>
                  <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Últimos 6 meses</p>
                </div>
              </div>
              <Link
                href="/financeiro/fluxo-caixa"
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--accent-blue)', background: 'rgba(79, 140, 255, 0.08)' }}
              >
                Ver mais <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex items-center gap-4 mb-5 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-success rounded-full" />
                <span style={{ color: 'var(--foreground-muted)' }}>Entradas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-error rounded-full" />
                <span style={{ color: 'var(--foreground-muted)' }}>Saídas</span>
              </div>
            </div>

            <div className="space-y-4">
              {data.fluxoMensal.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider w-12" style={{ color: 'var(--foreground-muted)' }}>{item.mes}</span>
                    <span className={`font-bold ${item.saldo >= 0 ? 'text-success' : 'text-error'}`}>
                      {item.saldo >= 0 ? '+' : ''}{formatCompact(item.saldo)}
                    </span>
                  </div>
                  <div className="flex gap-1.5 h-7">
                    <div
                      className="bg-success rounded-lg transition-all duration-700"
                      style={{ width: `${(item.entradas / maxFluxo) * 50}%`, opacity: 0.8 }}
                      title={`Entradas: ${formatCurrency(item.entradas)}`}
                    />
                    <div
                      className="bg-error rounded-lg transition-all duration-700"
                      style={{ width: `${(item.saidas / maxFluxo) * 50}%`, opacity: 0.8 }}
                      title={`Saídas: ${formatCurrency(item.saidas)}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gastos por Obra */}
        <div className="card-static p-5 sm:p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="stat-icon" style={{ background: 'rgba(124, 92, 252, 0.1)' }}>
                <PieChart className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Gastos por Obra</h2>
                <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Distribuição atual</p>
              </div>
            </div>
            <Link
              href="/obras"
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--accent-purple)', background: 'rgba(124, 92, 252, 0.08)' }}
            >
              Ver obras <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.gastosPorObra.length > 0 ? (
            <div className="space-y-4">
              {data.gastosPorObra.map((item, index) => (
                <div key={item.obraId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[60%]" style={{ color: 'var(--foreground)' }}>{item.obraNome}</span>
                    <span className="font-semibold" style={{ color: 'var(--foreground-secondary)' }}>{formatCompact(item.valor)}</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--background-tertiary)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${item.percentual}%`,
                        background: `linear-gradient(90deg, ${pieColors[index % pieColors.length]}, ${pieColors[index % pieColors.length]}dd)`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] font-semibold text-right" style={{ color: 'var(--foreground-muted)' }}>{item.percentual.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10" style={{ color: 'var(--foreground-muted)' }}>
              <PieChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum gasto registrado</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== PRÓXIMAS CONTAS + OBRAS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Próximas Contas */}
        <div className="card-static p-5 sm:p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="stat-icon" style={{ background: 'rgba(45, 212, 191, 0.1)' }}>
                <Calendar className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} />
              </div>
              <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Próximas Contas</h2>
            </div>
            <Link
              href="/financeiro/contas-pagar"
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--accent-teal)', background: 'rgba(45, 212, 191, 0.08)' }}
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.proximasContas.length > 0 ? (
            <div className="space-y-2">
              {data.proximasContas.map((conta) => (
                <div key={conta.id} className="flex items-center justify-between p-3 rounded-xl transition-all hover:scale-[1.01]" style={{ background: 'var(--background-tertiary)' }}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`stat-icon w-9 h-9 ${conta.tipo === 'pagar' ? 'bg-error/10' : 'bg-success/10'}`}>
                      {conta.tipo === 'pagar' ? (
                        <ArrowDownRight className="w-4 h-4 text-error" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-success" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{conta.descricao}</p>
                      <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                        {format(conta.dataVencimento, 'dd/MM/yyyy')}
                        {conta.diasRestantes < 0 && (
                          <span className="text-error ml-1 font-semibold">
                            ({Math.abs(conta.diasRestantes)}d atrasado)
                          </span>
                        )}
                        {conta.diasRestantes === 0 && (
                          <span className="ml-1 font-semibold" style={{ color: 'var(--warning)' }}>(Hoje)</span>
                        )}
                        {conta.diasRestantes > 0 && (
                          <span className="ml-1">(em {conta.diasRestantes}d)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ml-2 ${conta.tipo === 'pagar' ? 'text-error' : 'text-success'}`}>
                    {formatCurrency(conta.valor)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10" style={{ color: 'var(--foreground-muted)' }}>
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma conta próxima</p>
            </div>
          )}
        </div>

        {/* Obras Ativas */}
        <div className="card-static p-5 sm:p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="stat-icon" style={{ background: 'rgba(244, 114, 182, 0.1)' }}>
                <Building2 className="w-5 h-5" style={{ color: 'var(--accent-pink)' }} />
              </div>
              <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Obras Ativas</h2>
            </div>
            <Link
              href="/obras"
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--accent-pink)', background: 'rgba(244, 114, 182, 0.08)' }}
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.obrasResumo.length > 0 ? (
            <div className="space-y-2">
              {data.obrasResumo.map((obra) => (
                <Link
                  key={obra.id}
                  href={`/obras/${obra.id}/editar`}
                  className="block p-3 rounded-xl transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--background-tertiary)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{obra.nome}</p>
                    <span className="badge badge-success">{obra.status}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs" style={{ color: 'var(--foreground-muted)' }}>
                      <span>Gasto: {formatCurrency(obra.totalGasto)}</span>
                      {obra.orcamento > 0 && (
                        <span>Orçamento: {formatCurrency(obra.orcamento)}</span>
                      )}
                    </div>
                    {obra.orcamento > 0 && (
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--background-hover)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(obra.percentualGasto, 100)}%`,
                            background: obra.percentualGasto > 100
                              ? 'linear-gradient(90deg, var(--error), #ff6b6b)'
                              : obra.percentualGasto > 80
                                ? 'linear-gradient(90deg, var(--warning), #fbbf24)'
                                : 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                          }}
                        />
                      </div>
                    )}
                    {obra.orcamento > 0 && (
                      <p className={`text-[11px] font-semibold text-right ${obra.percentualGasto > 100 ? 'text-error' :
                          obra.percentualGasto > 80 ? 'text-warning-dark' : ''
                        }`} style={obra.percentualGasto <= 80 ? { color: 'var(--foreground-muted)' } : undefined}>
                        {obra.percentualGasto.toFixed(1)}% do orçamento
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10" style={{ color: 'var(--foreground-muted)' }}>
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma obra ativa</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== AÇÕES RÁPIDAS ===== */}
      <div className="card-static p-5 sm:p-6 animate-fade-in-up">
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--foreground)' }}>Ações Rápidas</h2>
        <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${canAccessFluxoCaixa && canViewAllFinanceiro ? 'sm:grid-cols-5' : canAccessFluxoCaixa ? 'sm:grid-cols-4' : canViewAllFinanceiro ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <Link
            href="/obras/nova"
            className="card-modern flex flex-col items-center p-4 group !border-transparent !bg-[var(--background-tertiary)]"
          >
            <div className="p-3 rounded-xl transition-all group-hover:scale-110" style={{ background: 'rgba(79, 140, 255, 0.1)' }}>
              <Building2 className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} />
            </div>
            <span className="text-xs font-semibold mt-3 text-center transition-colors" style={{ color: 'var(--foreground-secondary)' }}>Nova Obra</span>
          </Link>

          <Link
            href="/financeiro/contas-pagar/nova"
            className="card-modern flex flex-col items-center p-4 group !border-transparent !bg-[var(--background-tertiary)]"
          >
            <div className="p-3 rounded-xl transition-all group-hover:scale-110" style={{ background: 'rgba(196, 168, 108, 0.1)' }}>
              <CreditCard className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            </div>
            <span className="text-xs font-semibold mt-3 text-center transition-colors" style={{ color: 'var(--foreground-secondary)' }}>Nova Conta</span>
          </Link>

          <Link
            href="/compras/requisicoes/nova"
            className="card-modern flex flex-col items-center p-4 group !border-transparent !bg-[var(--background-tertiary)]"
          >
            <div className="p-3 rounded-xl transition-all group-hover:scale-110" style={{ background: 'rgba(124, 92, 252, 0.1)' }}>
              <ShoppingCart className="w-6 h-6" style={{ color: 'var(--accent-purple)' }} />
            </div>
            <span className="text-xs font-semibold mt-3 text-center transition-colors" style={{ color: 'var(--foreground-secondary)' }}>Nova Requisição</span>
          </Link>

          {canViewAllFinanceiro && (
            <Link
              href="/financeiro/folha-pagamento"
              className="card-modern flex flex-col items-center p-4 group !border-transparent !bg-[var(--background-tertiary)]"
            >
              <div className="p-3 rounded-xl transition-all group-hover:scale-110" style={{ background: 'rgba(45, 212, 191, 0.1)' }}>
                <Wallet className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
              </div>
              <span className="text-xs font-semibold mt-3 text-center transition-colors" style={{ color: 'var(--foreground-secondary)' }}>Folha de Pagamento</span>
            </Link>
          )}

          {canAccessFluxoCaixa && (
            <Link
              href="/financeiro/fluxo-caixa"
              className="card-modern flex flex-col items-center p-4 group !border-transparent !bg-[var(--background-tertiary)]"
            >
              <div className="p-3 rounded-xl transition-all group-hover:scale-110" style={{ background: 'rgba(244, 114, 182, 0.1)' }}>
                <BarChart3 className="w-6 h-6" style={{ color: 'var(--accent-pink)' }} />
              </div>
              <span className="text-xs font-semibold mt-3 text-center transition-colors" style={{ color: 'var(--foreground-secondary)' }}>Fluxo de Caixa</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
