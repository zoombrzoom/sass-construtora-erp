'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FolhaPagamento,
  FolhaPagamentoFormaPagamento,
  FolhaPagamentoRecorrenciaTipo,
  FolhaPagamentoStatus,
} from '@/types/financeiro'
import { createFolhaPagamento, deleteFolhaPagamento, getFolhasPagamento, updateFolhaPagamento } from '@/lib/db/folhaPagamento'
import { deleteFolhaPagamentoCategoria, getFolhaPagamentoCategorias, saveFolhaPagamentoCategoria } from '@/lib/db/folhaPagamentoCategorias'
import { deleteContaPagar, getContasPagarPorFolhaPagamentoId } from '@/lib/db/contasPagar'
import Link from 'next/link'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'
import { CheckCircle2, CreditCard, Eye, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { DatePicker } from '@/components/ui/DatePicker'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCpf(value?: string): string {
  if (!value) return '-'
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return value
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

const STATUS_LABELS: Record<FolhaPagamentoStatus, string> = {
  aberto: 'Em aberto',
  parcial: 'Parcial',
  pago: 'Pago',
}

const STATUS_BADGES: Record<FolhaPagamentoStatus, string> = {
  aberto: 'bg-warning/20 text-warning',
  parcial: 'bg-blue-500/20 text-blue-400',
  pago: 'bg-success/20 text-success',
}

const FORMA_LABELS: Record<FolhaPagamentoFormaPagamento, string> = {
  pix: 'PIX',
  deposito: 'Depósito',
  transferencia: 'Transferência',
  ted: 'TED',
  doc: 'DOC',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
}

const RECORRENCIA_LABELS: Record<FolhaPagamentoRecorrenciaTipo, string> = {
  mensal: 'Mensal',
  quinzenal: 'Quinzenal',
  semanal: 'Semanal',
  personalizado: 'Personalizado',
}

function formatRecorrencia(folha: FolhaPagamento): string {
  if (!folha.recorrenciaTipo) return '-'
  if (folha.recorrenciaTipo === 'personalizado') {
    const dias = Number(folha.recorrenciaIntervaloDias) || 0
    return dias > 0 ? `A cada ${dias} dia(s)` : RECORRENCIA_LABELS.personalizado
  }
  return RECORRENCIA_LABELS[folha.recorrenciaTipo]
}

function toInputDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseInputDate(value?: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day, 12, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

function nthBusinessDayOfMonth(year: number, monthZeroBased: number, n: number): Date {
  const target = Math.max(1, Math.min(31, Number(n) || 1))
  let count = 0
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, monthZeroBased, d, 12, 0, 0)
    if (dt.getMonth() !== monthZeroBased) break
    if (!isBusinessDay(dt)) continue
    count += 1
    if (count === target) return dt
  }
  return new Date(year, monthZeroBased + 1, 0, 12, 0, 0)
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0)
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function normalizeFuncionarioKey(nome: string): string {
  return String(nome || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export default function FolhaPagamentoPage() {
  const { user } = useAuth()
  const canManageCategorias = Boolean(user && (user.role === 'admin' || user.role === 'financeiro'))
  const [folhas, setFolhas] = useState<FolhaPagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<Array<{ id: string; nome: string }>>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('__all__')
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [filtros, setFiltros] = useState<{
    status?: FolhaPagamentoStatus
    formaPagamento?: FolhaPagamentoFormaPagamento
    busca?: string
    dataInicio?: string
    dataFim?: string
  }>(() => {
    const fim = new Date()
    const inicio = new Date()
    inicio.setDate(fim.getDate() - 30) // 31 dias incluindo hoje
    return {
      dataInicio: toInputDate(inicio),
      dataFim: toInputDate(fim),
    }
  })

  useEffect(() => {
    loadFolhas()
  }, [filtros.status, filtros.formaPagamento])

  useEffect(() => {
    loadCategorias()
  }, [])

  // Mantem recorrencias indeterminadas "vivas": cria automaticamente proximos meses
  // (sem gerar 12 de uma vez). Isso ajuda Mensal/Quinzenal a aparecerem sempre.
  useEffect(() => {
    if (!user) return
    if (!(user.role === 'admin' || user.role === 'financeiro')) return
    if (folhas.length === 0) return

    const run = async () => {
      try {
        const templates = folhas.filter((f) => f.recorrenciaIndeterminada && f.recorrenciaGrupoId && f.recorrenciaTipo)
        if (templates.length === 0) return

        const now = new Date()
        const start = monthStart(now)
        const end = monthStart(new Date(now.getFullYear(), now.getMonth() + 2, 1, 12, 0, 0))

        const byGroup = new Map<string, FolhaPagamento[]>()
        for (const f of templates) {
          const gid = f.recorrenciaGrupoId!
          if (!byGroup.has(gid)) byGroup.set(gid, [])
          byGroup.get(gid)!.push(f)
        }

        const existingAll = folhas.filter((f) => f.recorrenciaGrupoId)
        const existingByGroup = new Map<string, Set<string>>()
        const maxIndexByGroup = new Map<string, number>()
        for (const f of existingAll) {
          const gid = f.recorrenciaGrupoId!
          if (!existingByGroup.has(gid)) existingByGroup.set(gid, new Set())
          existingByGroup.get(gid)!.add(dateKey(toDate(f.dataReferencia)))
          const idx = Number(f.recorrenciaIndex) || 0
          maxIndexByGroup.set(gid, Math.max(maxIndexByGroup.get(gid) || 0, idx))
        }

        const creates: Promise<string>[] = []

        for (const [gid, list] of byGroup.entries()) {
          // Pega o mais recente como "template" (para respeitar edicoes).
          const template = [...list].sort((a, b) => toDate(b.dataReferencia).getTime() - toDate(a.dataReferencia).getTime())[0]
          const tipo = template.recorrenciaTipo as FolhaPagamentoRecorrenciaTipo
          const diaUtil = Math.max(1, Math.min(22, Number(template.recorrenciaDiaUtil) || 5))
          const dia2 = Math.max(1, Math.min(31, Number(template.recorrenciaDiaMes2) || 20))
          const existingKeys = existingByGroup.get(gid) || new Set<string>()
          let nextIndex = (maxIndexByGroup.get(gid) || 0) + 1

          for (let m = 0; m <= 2; m++) {
            const ms = new Date(start.getFullYear(), start.getMonth() + m, 1, 12, 0, 0)
            if (ms < start || ms > end) continue
            const primeiro = nthBusinessDayOfMonth(ms.getFullYear(), ms.getMonth(), diaUtil)
            const segundo = new Date(ms.getFullYear(), ms.getMonth(), dia2, 12, 0, 0)

            const desired: Date[] = tipo === 'mensal' ? [primeiro] : [primeiro, segundo]

            for (const dt of desired) {
              const key = dateKey(dt)
              if (existingKeys.has(key)) continue
              existingKeys.add(key)

              creates.push(
                createFolhaPagamento({
                  funcionarioNome: template.funcionarioNome,
                  cpf: template.cpf || '',
                  agencia: template.agencia || '',
                  conta: template.conta || '',
                  valor: template.valor,
                  valorPago: 0,
                  status: 'aberto',
                  categoriaId: template.categoriaId,
                  recorrenciaTipo: template.recorrenciaTipo,
                  recorrenciaIndeterminada: true,
                  recorrenciaDiaUtil: diaUtil,
                  recorrenciaDiaMes2: dia2,
                  recorrenciaGrupoId: gid,
                  recorrenciaIndex: nextIndex++,
                  dataReferencia: dt,
                  createdBy: template.createdBy,
                  observacoes: template.observacoes,
                })
              )
            }
          }
        }

        if (creates.length > 0) {
          await Promise.all(creates)
          await loadFolhas()
        }
      } catch (error) {
        console.error('Erro ao semear recorrencias indeterminadas:', error)
      }
    }

    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, folhas.length])

  const loadFolhas = async () => {
    try {
      const data = await getFolhasPagamento({
        status: filtros.status,
        formaPagamento: filtros.formaPagamento,
      })
      setFolhas(data)
    } catch (error) {
      console.error('Erro ao carregar folhas de pagamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategorias = async () => {
    try {
      const data = await getFolhaPagamentoCategorias()
      setCategorias(data.map((c) => ({ id: c.id, nome: c.nome })))
    } catch (error) {
      console.error('Erro ao carregar categorias da folha:', error)
    }
  }

  const categoriaNomePorId = useMemo(() => {
    const map = new Map<string, string>()
    categorias.forEach((c) => map.set(c.id, c.nome))
    return map
  }, [categorias])

  const categoriasResumo = useMemo(() => {
    const counts = new Map<string, number>()
    let semCategoria = 0
    folhas.forEach((f) => {
      if (!f.categoriaId) {
        semCategoria += 1
        return
      }
      counts.set(f.categoriaId, (counts.get(f.categoriaId) || 0) + 1)
    })
    return { counts, semCategoria, total: folhas.length }
  }, [folhas])

  const folhasFiltradas = useMemo(() => {
    const busca = filtros.busca?.trim().toLowerCase()
    const base = [...folhas]
      // Pedido do cliente: ordenar por nome (e, dentro do nome, por data desc).
      .sort((a, b) => {
        const nomeCmp = a.funcionarioNome.localeCompare(b.funcionarioNome, 'pt-BR')
        if (nomeCmp !== 0) return nomeCmp
        return toDate(b.dataReferencia).getTime() - toDate(a.dataReferencia).getTime()
      })

    const inicio = parseInputDate(filtros.dataInicio)
    const fim = parseInputDate(filtros.dataFim)
    if (inicio || fim) {
      base.splice(
        0,
        base.length,
        ...base.filter((f) => {
          const d = toDate(f.dataReferencia)
          if (inicio && d < inicio) return false
          if (fim) {
            const end = new Date(fim)
            end.setHours(23, 59, 59, 999)
            if (d > end) return false
          }
          return true
        })
      )
    }

    const baseCategoria = base.filter((folha) => {
      if (categoriaAtiva === '__all__') return true
      if (categoriaAtiva === '__none__') return !folha.categoriaId
      return folha.categoriaId === categoriaAtiva
    })

    if (!busca) {
      return baseCategoria
    }

    return baseCategoria.filter((folha) => {
      const cpf = folha.cpf || ''
      const agencia = folha.agencia || ''
      const conta = folha.conta || ''
      return (
        folha.funcionarioNome.toLowerCase().includes(busca) ||
        cpf.includes(busca.replace(/\D/g, '')) ||
        agencia.toLowerCase().includes(busca) ||
        conta.toLowerCase().includes(busca)
      )
    })
  }, [folhas, filtros.busca, filtros.dataInicio, filtros.dataFim, categoriaAtiva])

  const resumo = useMemo(() => {
    const emAbertoSet = new Set<string>()
    const acc = { total: 0, totalPago: 0, totalAberto: 0, funcionariosEmAberto: 0 }

    for (const folha of folhasFiltradas) {
      const aberto = Math.max(folha.valor - folha.valorPago, 0)
      acc.total += folha.valor
      acc.totalPago += folha.valorPago
      acc.totalAberto += aberto
      if (aberto > 0) emAbertoSet.add(normalizeFuncionarioKey(folha.funcionarioNome))
    }

    acc.funcionariosEmAberto = emAbertoSet.size
    return acc
  }, [folhasFiltradas])

  const handleDelete = async (id: string) => {
    const confirmed = confirm('Tem certeza que deseja excluir este lançamento da folha?')
    if (!confirmed) return

    try {
      await deleteFolhaPagamento(id)
      await loadFolhas()

      // Best-effort: se falhar por permissão em contas a pagar, não deve impedir
      // a exclusão do lançamento da folha (principal).
      try {
        const contas = await getContasPagarPorFolhaPagamentoId(id)
        if (contas.length > 0) {
          await Promise.all(contas.map((c) => deleteContaPagar(c.id)))
        }
      } catch (cleanupErr: any) {
        console.warn('Falha ao limpar contas vinculadas após excluir folha:', cleanupErr)
      }
    } catch (error: any) {
      console.error('Erro ao excluir folha:', error)
      const code = error?.code || error?.name
      if (code === 'permission-denied') {
        alert('Sem permissão para excluir lançamentos da folha. (permission-denied)')
      } else {
        alert('Erro ao excluir registro da folha.')
      }
    }
  }

  const handleMarcarPago = async (folha: FolhaPagamento) => {
    const confirmado = confirm(`Marcar "${folha.funcionarioNome}" como pago?`)
    if (!confirmado) return

    try {
      const hoje = new Date()
      await updateFolhaPagamento(folha.id, {
        status: 'pago',
        valorPago: folha.valor,
        dataPagamento: hoje,
        formaPagamento: folha.formaPagamento || 'pix',
      })
      await loadFolhas()
    } catch (error) {
      console.error('Erro ao marcar como pago:', error)
      alert('Erro ao marcar como pago.')
    }
  }

  const handleCreateCategoria = async () => {
    if (!user) return
    if (!canManageCategorias) return
    const nome = novaCategoriaNome.trim()
    if (!nome) return
    try {
      await saveFolhaPagamentoCategoria({ nome, createdBy: user.id })
      setNovaCategoriaNome('')
      await loadCategorias()
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      alert('Erro ao salvar categoria.')
    }
  }

  const handleDeleteCategoria = async (id: string) => {
    if (!canManageCategorias) return
    if (!confirm('Excluir esta categoria? (os lançamentos existentes manterão o registro, mas a categoria pode sumir da lista)')) return
    try {
      await deleteFolhaPagamentoCategoria(id)
      if (categoriaAtiva === id) setCategoriaAtiva('__all__')
      await loadCategorias()
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      alert('Erro ao excluir categoria.')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  // Colunas pensadas para caber no conteudo (com sidebar 280px) sem gerar scroll horizontal no desktop.
  // A coluna de acoes precisa comportar 3 icones, entao deixamos um pouco mais larga.
  const tableCols =
    'lg:grid-cols-[minmax(0,3fr)_112px_112px_120px_104px_minmax(0,1.4fr)_120px]'

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Folha de Pagamento</h1>
        <Link
          href="/financeiro/folha-pagamento/nova"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Lançamento
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
        <aside className="bg-dark-500 border border-dark-100 rounded-xl p-4 h-fit overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Departamentos</p>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setCategoriaAtiva('__all__')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                categoriaAtiva === '__all__' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
              }`}
            >
              <span>Geral</span>
              <span className="text-xs text-gray-400">{categoriasResumo.total}</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoriaAtiva('__none__')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                categoriaAtiva === '__none__' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
              }`}
            >
              <span>Sem departamento</span>
              <span className="text-xs text-gray-400">{categoriasResumo.semCategoria}</span>
            </button>

            {categorias.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    categoriaAtiva === cat.id ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                  }`}
                >
                  <span className="truncate">{cat.nome}</span>
                  <span className="text-xs text-gray-400">{categoriasResumo.counts.get(cat.id) || 0}</span>
                </button>
                {canManageCategorias && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategoria(cat.id)}
                    className="p-2 rounded-lg text-error hover:bg-error/10"
                    aria-label={`Excluir categoria ${cat.nome}`}
                    title="Excluir categoria"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {canManageCategorias && (
            <div className="mt-4 pt-4 border-t border-dark-100">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Editar</p>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <input
                  value={novaCategoriaNome}
                  onChange={(e) => setNovaCategoriaNome(e.target.value)}
                  className="min-w-0 w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Nova categoria..."
                />
                <button
                  type="button"
                  onClick={handleCreateCategoria}
                  className="px-3 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors whitespace-nowrap shrink-0"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </aside>

        <div className="space-y-5 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Valor da Folha</p>
              <p className="text-lg font-semibold text-gray-100">{formatCurrency(resumo.total)}</p>
            </div>
            <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total Pago</p>
              <p className="text-lg font-semibold text-success">{formatCurrency(resumo.totalPago)}</p>
            </div>
            <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total em Aberto</p>
              <p className="text-lg font-semibold text-warning">{formatCurrency(resumo.totalAberto)}</p>
            </div>
            <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Funcionários em Aberto</p>
              <p className="text-lg font-semibold text-gray-100">{resumo.funcionariosEmAberto}</p>
            </div>
          </div>

          <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label htmlFor="filtroStatus" className="block text-xs text-gray-400 mb-1">Status</label>
                <select
                  id="filtroStatus"
                  value={filtros.status || ''}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, status: (e.target.value as FolhaPagamentoStatus) || undefined }))}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Todos</option>
                  <option value="aberto">Em aberto</option>
                  <option value="parcial">Parcial</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
              <div>
                <label htmlFor="filtroForma" className="block text-xs text-gray-400 mb-1">Forma de pagamento</label>
                <select
                  id="filtroForma"
                  value={filtros.formaPagamento || ''}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, formaPagamento: (e.target.value as FolhaPagamentoFormaPagamento) || undefined }))}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Todas</option>
                  {Object.entries(FORMA_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">De</label>
                <DatePicker
                  value={filtros.dataInicio || ''}
                  onChange={(value) => setFiltros((prev) => ({ ...prev, dataInicio: value || undefined }))}
                  placeholder="Selecionar"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ate</label>
                <DatePicker
                  value={filtros.dataFim || ''}
                  onChange={(value) => setFiltros((prev) => ({ ...prev, dataFim: value || undefined }))}
                  placeholder="Selecionar"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <label htmlFor="filtroBusca" className="block text-xs text-gray-400 mb-1">Buscar</label>
                <input
                  id="filtroBusca"
                  type="text"
                  value={filtros.busca || ''}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, busca: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Nome, CPF (opcional), agência ou conta..."
                />
              </div>
            </div>
          </div>

          {folhasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              Nenhum registro de folha encontrado.
            </div>
          ) : (
            <div className="bg-dark-500 border border-dark-100 rounded-xl">
              <div className="px-4 py-3 bg-dark-400 border-b border-dark-100">
                <p className="text-sm text-gray-400">
                  Mostrando {folhasFiltradas.length} lançamento(s)
                </p>
              </div>

              <div className="overflow-x-auto lg:overflow-x-hidden">
                <div className="w-full">
                  <div className={`hidden lg:grid ${tableCols} gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-dark-100`}>
                    <div>Funcionário</div>
                    <div>Valor</div>
                    <div>Recorrência</div>
                    <div>Status</div>
                    <div>Ref.</div>
                    <div>Departamento</div>
                    <div className="text-right">Ações</div>
                  </div>

                  <ul className="divide-y divide-dark-100">
                    {folhasFiltradas.map((folha) => {
                  const emAberto = Math.max(folha.valor - folha.valorPago, 0)
                  const departamento = folha.categoriaId ? (categoriaNomePorId.get(folha.categoriaId) || folha.categoriaId) : 'Geral'

                      return (
                        <li key={folha.id}>
                          <div className="px-4 py-4">
                            <div className={`grid grid-cols-1 ${tableCols} gap-2 lg:items-center`}>
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-gray-100 truncate" title={folha.funcionarioNome}>
                              {folha.funcionarioNome}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate whitespace-nowrap">
                              CPF: {formatCpf(folha.cpf)} | Pago: {formatCurrency(folha.valorPago)} | Aberto: {formatCurrency(emAberto)}
                            </p>
                          </div>

                          <div className="text-lg font-bold text-brand whitespace-nowrap">
                            {formatCurrency(folha.valor)}
                          </div>

                          <div className="text-sm text-gray-300 truncate">
                            {formatRecorrencia(folha)}
                          </div>

                          <div>
                            {folha.status === 'pago' ? (
                              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${STATUS_BADGES[folha.status]}`}>
                                {STATUS_LABELS[folha.status]}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMarcarPago(folha)}
                                className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${STATUS_BADGES[folha.status]} hover:brightness-110`}
                                title="Clique para marcar como pago"
                              >
                                {STATUS_LABELS[folha.status]}
                                <CheckCircle2 className="w-3.5 h-3.5 ml-1.5 opacity-80" />
                              </button>
                            )}
                          </div>

                          <div className="text-sm text-gray-300 whitespace-nowrap">
                            {format(toDate(folha.dataReferencia), 'dd/MM/yyyy')}
                          </div>

                          <div className="text-sm text-gray-400 truncate" title={departamento}>
                            {departamento}
                          </div>

                          <div className="flex items-center gap-1.5 justify-start lg:justify-end flex-nowrap">
                            <Link
                              href={`/financeiro/folha-pagamento/${folha.id}`}
                              className="p-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                              title="Detalhes"
                              aria-label="Detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/financeiro/folha-pagamento/${folha.id}/editar`}
                              className="p-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                              title="Editar"
                              aria-label="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(folha.id)}
                              className="p-1.5 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors"
                              title="Excluir"
                              aria-label="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5" />
            Em aberto = valor total - valor pago.
          </div>
        </div>
      </div>
    </div>
  )
}
