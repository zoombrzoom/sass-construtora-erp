'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ContaPagar,
  ContaPagarFormaPagamento,
  ContaPagarStatus,
  ContaPagarTipo,
} from '@/types/financeiro'
import { createContaPagar, deleteContaPagar, getContasPagar, updateContaPagar } from '@/lib/db/contasPagar'
import { markFolhaPagamentoMigradaContaPagar } from '@/lib/db/folhaPagamento'
import { migrateContasPessoaisToContasPagar } from '@/lib/migrations/migrateContasPessoais'
import { migrateFolhaPagamentoToContasPagar } from '@/lib/migrations/migrateFolhaPagamento'
import { seedFolhaRecorrenciasIndeterminadas } from '@/lib/migrations/seedFolhaRecorrenciasIndeterminadas'
import { getObras } from '@/lib/db/obras'
import { FiltrosFinanceiro } from '@/components/ui/FiltrosFinanceiro'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'
import Link from 'next/link'
import { format } from 'date-fns'
import { Obra } from '@/types/obra'
import { toDate } from '@/utils/date'
import {
  Plus,
  Eye,
  FileText,
  Edit2,
  CreditCard,
  CheckSquare,
  Square,
  Copy,
  ExternalLink,
  Building2,
  Layers3,
  Trash2,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const FORMAS_PAGAMENTO: { value: ContaPagarFormaPagamento; label: string }[] = [
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'PIX' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'ted', label: 'TED' },
  { value: 'doc', label: 'DOC' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'outro', label: 'Outro' },
]

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

function toInputDate(value: Date): string {
  return value.toISOString().split('T')[0]
}

function addMonthsKeepingDay(value: Date, monthsToAdd: number): Date {
  const base = new Date(value)
  const baseDay = base.getDate()
  const shifted = new Date(base.getFullYear(), base.getMonth() + monthsToAdd, 1, 12, 0, 0, 0)
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate()
  shifted.setDate(Math.min(baseDay, lastDay))
  return shifted
}

export default function ContasPagarPage() {
  const { user } = useAuth()
  const permissions = getPermissions(user)
  const canAccessContasParticulares = permissions.canAccessContasParticulares
  const canViewAllObras = permissions.canViewAllObras
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [contasFiltradas, setContasFiltradas] = useState<ContaPagar[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCodigos, setShowCodigos] = useState(false)
  const [sidebarFiltro, setSidebarFiltro] = useState<string>('geral')
  const [loteFormaPagamento, setLoteFormaPagamento] = useState<ContaPagarFormaPagamento>('pix')
  const [loteContaPagamento, setLoteContaPagamento] = useState<string>('')
  const [loteDataPagamento, setLoteDataPagamento] = useState(toInputDate(new Date()))
  const [contaPopupParcelasId, setContaPopupParcelasId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [didMigratePessoais, setDidMigratePessoais] = useState(false)
  const [didMigrateFolha, setDidMigrateFolha] = useState(false)
  const seededFolhaRanges = useRef<Set<string>>(new Set())
  const backfilledParcelamentos = useRef<Set<string>>(new Set())
  const [filtros, setFiltros] = useState<{
    status?: ContaPagarStatus
    tipo?: ContaPagarTipo
    obraId?: string
    dataInicio?: string
    dataFim?: string
    busca?: string
  }>({})
  const [sort, setSort] = useState<{ key: 'descricao' | 'contato' | 'conta' | 'data' | 'status' | 'valor'; dir: 'asc' | 'desc' }>({
    key: 'data',
    dir: 'desc',
  })

  useEffect(() => {
    loadObras()
  }, [])

  useEffect(() => {
    if (!user) return
    if (didMigratePessoais) return
    if (!permissions.canAccessContasPessoais) return
    if (!(user.role === 'admin' || user.role === 'financeiro')) {
      setDidMigratePessoais(true)
      return
    }

    ; (async () => {
      try {
        await migrateContasPessoaisToContasPagar({ userId: user.id, limit: 500 })
      } catch (error) {
        console.error('Falha ao migrar contas pessoais para contas a pagar:', error)
      } finally {
        setDidMigratePessoais(true)
        await loadContas()
      }
    })()
  }, [user, permissions.canAccessContasPessoais, didMigratePessoais])

  useEffect(() => {
    if (!user) return
    if (didMigrateFolha) return
    if (!(user.role === 'admin' || user.role === 'financeiro' || user.role === 'secretaria')) {
      setDidMigrateFolha(true)
      return
    }

    ; (async () => {
      try {
        await migrateFolhaPagamentoToContasPagar({ userId: user.id, limit: 800 })
      } catch (error) {
        console.error('Falha ao migrar folha de pagamento para contas a pagar:', error)
      } finally {
        setDidMigrateFolha(true)
        await loadContas()
      }
    })()
  }, [user, didMigrateFolha])

  // Garante que recorrencias indeterminadas da folha existam em um horizonte rolling (12 meses),
  // para que a migracao gere as contas dos proximos meses sem precisar abrir a aba de Folha.
  useEffect(() => {
    if (!user) return
    if (!(user.role === 'admin' || user.role === 'financeiro' || user.role === 'secretaria')) return
    // Evita duplicar a migracao inicial; depois disso mantemos o horizonte rolling.
    if (!didMigrateFolha) return

    // Mantem um horizonte de 12 meses (rolling) para nao crescer infinito.
    // Ex.: fev/2026 -> cria recorrencias de fev/2026 ate jan/2027.
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0)
    const to = new Date(now.getFullYear(), now.getMonth() + 12, 0, 12, 0, 0)
    to.setHours(23, 59, 59, 999)
    const key = `${from.toISOString().slice(0, 10)}|${to.toISOString().slice(0, 10)}`
    if (seededFolhaRanges.current.has(key)) return
    seededFolhaRanges.current.add(key)

      ; (async () => {
        try {
          await seedFolhaRecorrenciasIndeterminadas({ from, to })
          await migrateFolhaPagamentoToContasPagar({ userId: user.id, limit: 800 })
        } catch (error) {
          console.error('Falha ao preparar recorrencias da folha no periodo:', error)
        } finally {
          await loadContas()
        }
      })()
  }, [user?.id, user?.role, didMigrateFolha])

  useEffect(() => {
    loadContas()
  }, [filtros.status, filtros.obraId, canAccessContasParticulares, canViewAllObras, user?.obraId])

  // Recarregar contas automaticamente quando a página ganha foco (ex: voltar da tela de nova conta)
  useEffect(() => {
    const onFocus = () => { loadContas() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    aplicarFiltros()
  }, [contas, filtros.tipo, filtros.dataInicio, filtros.dataFim, filtros.busca, sidebarFiltro, canAccessContasParticulares, sort.key, sort.dir])

  // Backfill de parcelas: se existir conta com totalParcelas > 1 mas sem parcelas futuras criadas,
  // cria automaticamente (para aparecer nos meses seguintes).
  useEffect(() => {
    if (!user) return
    if (!(user.role === 'admin' || user.role === 'financeiro' || user.role === 'secretaria')) return
    if (contas.length === 0) return

    const run = async () => {
      // Limites para nao travar o app em bases grandes.
      const MAX_GROUPS = 60
      const MAX_CREATES = 600

      let processedGroups = 0
      const updates: Promise<void>[] = []
      const creates: Promise<string>[] = []
      let didChange = false

      for (const [groupKey, list] of parcelasPorGrupo.entries()) {
        if (processedGroups >= MAX_GROUPS) break
        if (creates.length >= MAX_CREATES) break

        const key = groupKey
        if (backfilledParcelamentos.current.has(key)) continue

        const base = list[0]
        const total = Math.max(1, ...list.map((c) => c.totalParcelas || 1))
        if (total <= 1) {
          backfilledParcelamentos.current.add(key)
          continue
        }

        const baseParcela = Math.max(1, base.parcelaAtual || 1)
        // So geramos automaticamente quando a conta base eh a parcela 1.
        if (baseParcela !== 1) {
          backfilledParcelamentos.current.add(key)
          continue
        }

        const existentes = new Set(list.map((c) => Math.max(1, c.parcelaAtual || 1)))
        const missing: number[] = []
        for (let parcela = 1; parcela <= total; parcela++) {
          if (!existentes.has(parcela)) missing.push(parcela)
        }

        if (missing.length === 0) {
          backfilledParcelamentos.current.add(key)
          continue
        }

        processedGroups += 1
        didChange = true

        const createdBy = (base as any).createdBy || user.id
        const baseVencimento = toDate(base.dataVencimento)
        const groupId = groupKey.startsWith('single:')
          ? `${createdBy}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          : groupKey

        if (groupKey.startsWith('single:')) {
          // Liga o grupo na conta base.
          updates.push(
            updateContaPagar(base.id, {
              grupoParcelamentoId: groupId,
              recorrenciaMensal: true,
              totalParcelas: total,
            })
          )
        }

        let completed = true
        for (const parcela of missing) {
          if (parcela === baseParcela) continue
          if (creates.length >= MAX_CREATES) {
            completed = false
            break
          }
          const monthOffset = parcela - baseParcela
          const dataVencimentoParcela = addMonthsKeepingDay(baseVencimento, monthOffset)

          creates.push(
            createContaPagar({
              valor: base.valor,
              dataVencimento: dataVencimentoParcela,
              tipo: base.tipo,
              obraId: base.obraId,
              pessoal: base.pessoal,
              status: 'pendente',
              descricao: base.descricao,
              favorecido: base.favorecido,
              contaPagamento: base.contaPagamento,
              banco: base.banco,
              agencia: base.agencia,
              conta: base.conta,
              chavePix: base.chavePix,
              boletoUrl: base.boletoUrl,
              linhaDigitavel: base.linhaDigitavel,
              codigoBarras: base.codigoBarras,
              parcelaAtual: parcela,
              totalParcelas: total,
              grupoParcelamentoId: groupId,
              recorrenciaMensal: true,
              createdBy,
            })
          )
        }

        // So marca como concluido se conseguiu criar todas as parcelas faltantes.
        if (completed) {
          backfilledParcelamentos.current.add(key)
        }
      }

      if (!didChange) return

      try {
        if (updates.length > 0) await Promise.all(updates)
        if (creates.length > 0) await Promise.all(creates)
      } catch (error) {
        console.error('Falha ao backfill de parcelas:', error)
      } finally {
        await loadContas()
      }
    }

    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, contas])

  const loadObras = async () => {
    try {
      const data = await getObras()
      setObras(data)
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    }
  }

  const loadContas = async () => {
    const obraFiltro = filtros.obraId || (!canViewAllObras ? user?.obraId : undefined)
    try {
      const data = await getContasPagar({
        status: filtros.status,
        obraId: obraFiltro,
        includeParticular: canAccessContasParticulares,
      })
      setContas(data.filter((conta) => canAccessContasParticulares || conta.tipo !== 'particular'))
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    } finally {
      setLoading(false)
    }
  }

  const aplicarFiltros = () => {
    let filtradas = [...contas]

    if (!canAccessContasParticulares) {
      filtradas = filtradas.filter((conta) => conta.tipo !== 'particular')
    }

    if (filtros.tipo) {
      filtradas = filtradas.filter((conta) => conta.tipo === filtros.tipo)
    }

    if (filtros.dataInicio) {
      const dataInicio = parseDateInput(filtros.dataInicio)
      filtradas = filtradas.filter((conta) => {
        const dataVenc = toDate(conta.dataVencimento)
        return dataVenc >= dataInicio
      })
    }

    if (filtros.dataFim) {
      const dataFim = parseDateInput(filtros.dataFim)
      dataFim.setHours(23, 59, 59, 999)
      filtradas = filtradas.filter((conta) => {
        const dataVenc = toDate(conta.dataVencimento)
        return dataVenc <= dataFim
      })
    }

    if (filtros.busca) {
      const buscaLower = filtros.busca.toLowerCase()
      filtradas = filtradas.filter((conta) => {
        const descricao = conta.descricao?.toLowerCase() || ''
        const tipo = conta.tipo.toLowerCase()
        const linha = conta.linhaDigitavel?.toLowerCase() || ''
        const codigo = conta.codigoBarras?.toLowerCase() || ''
        const parcela = `${conta.parcelaAtual || 1}/${conta.totalParcelas || 1}`.toLowerCase()
        return (
          descricao.includes(buscaLower) ||
          tipo.includes(buscaLower) ||
          linha.includes(buscaLower) ||
          codigo.includes(buscaLower) ||
          parcela.includes(buscaLower)
        )
      })
    }

    if (sidebarFiltro.startsWith('tipo:')) {
      const tipoFiltro = sidebarFiltro.replace('tipo:', '') as ContaPagarTipo
      filtradas = filtradas.filter((conta) => conta.tipo === tipoFiltro)
    }

    if (sidebarFiltro.startsWith('obra:')) {
      const obraFiltro = sidebarFiltro.replace('obra:', '')
      filtradas = filtradas.filter((conta) => conta.obraId === obraFiltro)
    }

    if (sidebarFiltro === 'pessoal') {
      filtradas = filtradas.filter((conta) => Boolean(conta.pessoal) || conta.obraId === 'PESSOAL')
    }

    const statusRank: Record<ContaPagarStatus, number> = {
      vencido: 0,
      pendente: 1,
      pago: 2,
    }

    const getDescricao = (conta: ContaPagar) => conta.descricao || `Conta #${conta.id.slice(0, 8)}`
    const getContato = (conta: ContaPagar) => conta.favorecido || ''
    const getConta = (conta: ContaPagar) => conta.contaPagamento || ''

    filtradas.sort((a, b) => {
      let cmp = 0
      if (sort.key === 'descricao') {
        cmp = getDescricao(a).localeCompare(getDescricao(b), 'pt-BR', { sensitivity: 'base' })
      } else if (sort.key === 'contato') {
        cmp = getContato(a).localeCompare(getContato(b), 'pt-BR', { sensitivity: 'base' })
      } else if (sort.key === 'conta') {
        cmp = getConta(a).localeCompare(getConta(b), 'pt-BR', { sensitivity: 'base' })
      } else if (sort.key === 'data') {
        cmp = toDate(a.dataVencimento).getTime() - toDate(b.dataVencimento).getTime()
      } else if (sort.key === 'status') {
        cmp = (statusRank[a.status] ?? 0) - (statusRank[b.status] ?? 0)
      } else if (sort.key === 'valor') {
        cmp = (a.valor || 0) - (b.valor || 0)
      }

      if (cmp === 0) {
        // Desempate consistente: data e id
        const t = toDate(a.dataVencimento).getTime() - toDate(b.dataVencimento).getTime()
        if (t !== 0) cmp = t
        else cmp = a.id.localeCompare(b.id)
      }

      return sort.dir === 'asc' ? cmp : -cmp
    })

    setContasFiltradas(filtradas)
  }

  const toggleSort = (key: typeof sort.key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { key, dir: 'asc' }
    })
  }

  const SortHeader = ({ keyName, label, align = 'left' }: { keyName: typeof sort.key; label: string; align?: 'left' | 'right' }) => {
    const active = sort.key === keyName
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown
    return (
      <button
        type="button"
        onClick={() => toggleSort(keyName)}
        className={`inline-flex items-center gap-1 text-xs uppercase tracking-wide transition-colors hover:text-brand ${align === 'right' ? 'justify-end text-right w-full' : 'justify-start text-left w-full'
          }`}
        title={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        <Icon className={`w-3.5 h-3.5 ${active ? 'opacity-90' : 'opacity-40'}`} />
      </button>
    )
  }

  useEffect(() => {
    const validIds = new Set(contasFiltradas.filter((conta) => conta.status !== 'pago').map((conta) => conta.id))
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
  }, [contasFiltradas])

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const getObraNome = (obraId: string) => {
    return obras.find((obra) => obra.id === obraId)?.nome || obraId
  }

  const getParcelaTexto = (conta: ContaPagar) => {
    const total = Math.max(1, conta.totalParcelas || 1)
    const atual = Math.min(Math.max(1, conta.parcelaAtual || 1), total)
    return `${atual}/${total}`
  }

  const hasParcelamento = (conta: ContaPagar) => {
    return (conta.totalParcelas || 1) > 1 || (conta.parcelaAtual || 1) > 1
  }

  const parcelasPorGrupo = useMemo(() => {
    const map = new Map<string, ContaPagar[]>()
    contas.forEach((conta) => {
      const groupKey = conta.grupoParcelamentoId || `single:${conta.id}`
      if (!map.has(groupKey)) {
        map.set(groupKey, [])
      }
      map.get(groupKey)!.push(conta)
    })

    map.forEach((list, key) => {
      map.set(
        key,
        [...list].sort((a, b) => {
          const parcelaA = a.parcelaAtual || 1
          const parcelaB = b.parcelaAtual || 1
          if (parcelaA !== parcelaB) return parcelaA - parcelaB
          return toDate(a.dataVencimento).getTime() - toDate(b.dataVencimento).getTime()
        })
      )
    })

    return map
  }, [contas])

  const getParcelasDoGrupo = (conta: ContaPagar) => {
    const groupKey = conta.grupoParcelamentoId || `single:${conta.id}`
    return parcelasPorGrupo.get(groupKey) || [conta]
  }

  const contaPopupParcelas = useMemo(() => {
    if (!contaPopupParcelasId) return null
    return contas.find((item) => item.id === contaPopupParcelasId) || null
  }, [contaPopupParcelasId, contas])

  const parcelasDoPopup = useMemo(() => {
    if (!contaPopupParcelas) return []
    return getParcelasDoGrupo(contaPopupParcelas)
  }, [contaPopupParcelas, parcelasPorGrupo])

  const contasEmAberto = useMemo(() => {
    return contasFiltradas.filter((conta) => conta.status !== 'pago')
  }, [contasFiltradas])

  const contasSelecionadas = useMemo(() => {
    const selectedSet = new Set(selectedIds)
    return contasFiltradas.filter((conta) => selectedSet.has(conta.id))
  }, [contasFiltradas, selectedIds])

  const resumoSidebar = useMemo(() => {
    const porTipo: Record<ContaPagarTipo, number> = {
      boleto: 0,
      escritorio: 0,
      folha: 0,
      empreiteiro: 0,
      particular: 0,
      outro: 0,
    }
    const porObra = new Map<string, number>()

    contas.forEach((conta) => {
      porTipo[conta.tipo] = (porTipo[conta.tipo] || 0) + 1
      porObra.set(conta.obraId, (porObra.get(conta.obraId) || 0) + 1)
    })

    const obrasComContas = Array.from(porObra.entries())
      .map(([obraId, quantidade]) => {
        const obra = obras.find((item) => item.id === obraId)
        return {
          obraId,
          nome: obra?.nome || obraId,
          quantidade,
        }
      })
      .sort((a, b) => a.nome.localeCompare(b.nome))

    const pessoalCount = contas.filter((c) => Boolean(c.pessoal) || c.obraId === 'PESSOAL').length
    return { porTipo, obrasComContas, pessoalCount }
  }, [contas, obras])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleSelectAllOpen = () => {
    const openIds = contasEmAberto.map((conta) => conta.id)
    const allSelected = openIds.length > 0 && openIds.every((id) => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : openIds)
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      alert('Copiado!')
    } catch {
      alert('Não foi possível copiar')
    }
  }

  const abrirBoletosSelecionados = () => {
    const urls = contasSelecionadas
      .map((conta) => conta.boletoUrl)
      .filter((value): value is string => Boolean(value))

    if (urls.length === 0) {
      alert('Nenhuma conta selecionada tem boleto anexado.')
      return
    }

    urls.forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'))
  }

  const marcarSelecionadasComoPagas = async () => {
    if (contasSelecionadas.length === 0) return
    if (!loteDataPagamento) {
      alert('Informe a data do pagamento em lote.')
      return
    }

    const confirmacao = confirm(`Marcar ${contasSelecionadas.length} conta(s) como paga(s)?`)
    if (!confirmacao) return

    try {
      const contaPagamentoValue = loteContaPagamento.trim()
      await Promise.all(
        contasSelecionadas.map((conta) =>
          updateContaPagar(conta.id, {
            status: 'pago',
            formaPagamento: loteFormaPagamento,
            ...(contaPagamentoValue ? { contaPagamento: contaPagamentoValue } : {}),
            dataPagamento: parseDateInput(loteDataPagamento),
          })
        )
      )

      await loadContas()
      setSelectedIds([])
      alert('Contas atualizadas como pagas.')
    } catch (error) {
      console.error('Erro ao atualizar contas em lote:', error)
      alert('Erro ao marcar contas como pagas.')
    }
  }

  const excluirSelecionadasEmLote = async () => {
    if (contasSelecionadas.length === 0) return

    const deletaveis = contasSelecionadas.filter((conta) => canDeleteConta(conta))
    const bloqueadas = contasSelecionadas.filter((conta) => !canDeleteConta(conta))

    if (deletaveis.length === 0) {
      alert('Você não tem permissão para excluir as contas selecionadas.')
      return
    }

    const msgBase = `Excluir ${deletaveis.length} conta(s) selecionada(s)? Essa ação não pode ser desfeita.`
    const msg =
      bloqueadas.length > 0
        ? `${msgBase}\n\nObs: ${bloqueadas.length} conta(s) não serão excluídas por falta de permissão.`
        : msgBase

    const confirmacao = confirm(msg)
    if (!confirmacao) return

    try {
      await Promise.all(
        deletaveis.map(async (conta) => {
          // Se a conta veio da folha (migracao), ao deletar nao podemos recriar no proximo reload.
          if (conta.tipo === 'folha' && conta.folhaPagamentoId) {
            try {
              await markFolhaPagamentoMigradaContaPagar({
                folhaPagamentoId: conta.folhaPagamentoId,
                contaPagarId: '__deleted__',
              })
            } catch (err) {
              console.warn('Falha ao marcar folha como migrada (delete em lote):', err)
            }
          }
          await deleteContaPagar(conta.id)
        })
      )
      await loadContas()
      setSelectedIds([])
      alert('Contas excluídas com sucesso.')
    } catch (error) {
      console.error('Erro ao excluir contas em lote:', error)
      alert('Erro ao excluir contas em lote.')
    }
  }

  const canDeleteConta = (conta: ContaPagar) => {
    if (user?.role === 'admin' || user?.role === 'financeiro' || user?.role === 'secretaria') return true
    return conta.tipo === 'particular' && canAccessContasParticulares
  }

  const handleDeleteConta = async (conta: ContaPagar) => {
    const nomeConta = conta.descricao || `Conta ${conta.id.slice(0, 8)}`
    const ehParcelamento = hasParcelamento(conta)

    // Encontra todas as parcelas relacionadas
    let parcelasRelacionadas: ContaPagar[] = []
    if (conta.grupoParcelamentoId) {
      parcelasRelacionadas = getParcelasDoGrupo(conta)
    } else if (ehParcelamento) {
      // Fallback: buscar pelo descricao + tipo + obraId + totalParcelas
      parcelasRelacionadas = contas.filter((c) => {
        if (c.id === conta.id) return true
        if (!hasParcelamento(c)) return false
        const mesmaDescricao = (c.descricao || '') === (conta.descricao || '')
        const mesmoTipo = c.tipo === conta.tipo
        const mesmaObra = c.obraId === conta.obraId
        const mesmoTotal = (c.totalParcelas || 1) === (conta.totalParcelas || 1)
        return mesmaDescricao && mesmoTipo && mesmaObra && mesmoTotal
      })
    }

    const temMultiplasParcelas = parcelasRelacionadas.length > 1

    if (temMultiplasParcelas) {
      const parcelaAtual = conta.parcelaAtual || 1
      const totalNominal = conta.totalParcelas || parcelasRelacionadas.length
      const confirmacao = confirm(
        `"${nomeConta}" faz parte de um parcelamento (parcela ${parcelaAtual}/${totalNominal}, ${parcelasRelacionadas.length} parcela(s) encontrada(s)).\n\nDeseja excluir TODAS as parcelas desse parcelamento?\n\n• OK = Excluir todas as parcelas\n• Cancelar = Não excluir`
      )
      if (!confirmacao) return
    } else {
      const confirmacao = confirm(`Excluir "${nomeConta}"? Essa ação não pode ser desfeita.`)
      if (!confirmacao) return
    }

    try {
      if (temMultiplasParcelas) {
        // Marcar folhas como deletadas
        for (const parcela of parcelasRelacionadas) {
          if (parcela.tipo === 'folha' && parcela.folhaPagamentoId) {
            try {
              await markFolhaPagamentoMigradaContaPagar({
                folhaPagamentoId: parcela.folhaPagamentoId,
                contaPagarId: '__deleted__',
              })
            } catch (err) {
              console.warn('Falha ao marcar folha como migrada (delete grupo):', err)
            }
          }
        }

        // Deletar todas as parcelas individualmente
        await Promise.all(parcelasRelacionadas.map((p) => deleteContaPagar(p.id)))

        setSelectedIds((prev) => prev.filter((id) => !parcelasRelacionadas.some((p) => p.id === id)))
        await loadContas()
        alert(`${parcelasRelacionadas.length} parcela(s) excluída(s) com sucesso.`)
      } else {
        if (conta.tipo === 'folha' && conta.folhaPagamentoId) {
          try {
            await markFolhaPagamentoMigradaContaPagar({
              folhaPagamentoId: conta.folhaPagamentoId,
              contaPagarId: '__deleted__',
            })
          } catch (err) {
            console.warn('Falha ao marcar folha como migrada (delete):', err)
          }
        }
        await deleteContaPagar(conta.id)
        setSelectedIds((prev) => prev.filter((id) => id !== conta.id))
        await loadContas()
        alert('Conta excluída com sucesso.')
      }
    } catch (error) {
      console.error('Erro ao excluir conta:', error)
      alert('Erro ao excluir conta.')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  // Colunas ajustadas para caber no desktop sem scroll horizontal e com mais espaco para a descricao.
  // Removemos a coluna "Cod" (nao pedida) e encurtamos a data para dd/MM/yy.
  const tableCols =
    'lg:grid-cols-[28px_minmax(0,4.2fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_86px_96px_110px_144px]'

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

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
        <aside className="bg-dark-500 border border-dark-100 rounded-xl p-4 h-fit">
          <h2 className="text-sm font-semibold text-gray-200 mb-3 flex items-center">
            <Layers3 className="w-4 h-4 mr-2 text-brand" />
            Categorias
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => setSidebarFiltro('geral')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${sidebarFiltro === 'geral' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                }`}
            >
              <span>Geral</span>
              <span className="text-xs text-gray-400">{contas.length}</span>
            </button>
            <button
              onClick={() => setSidebarFiltro('pessoal')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${sidebarFiltro === 'pessoal' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                }`}
            >
              <span>Pessoal</span>
              <span className="text-xs text-gray-400">{resumoSidebar.pessoalCount}</span>
            </button>
            <button
              onClick={() => setSidebarFiltro('tipo:escritorio')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${sidebarFiltro === 'tipo:escritorio' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                }`}
            >
              <span>Contas Escritório</span>
              <span className="text-xs text-gray-400">{resumoSidebar.porTipo.escritorio}</span>
            </button>

            <button
              onClick={() => setSidebarFiltro('tipo:folha')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${sidebarFiltro === 'tipo:folha' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                }`}
            >
              <span>Folha de Pagamento</span>
              <span className="text-xs text-gray-400">{resumoSidebar.porTipo.folha}</span>
            </button>
            <button
              onClick={() => setSidebarFiltro('tipo:empreiteiro')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${sidebarFiltro === 'tipo:empreiteiro' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                }`}
            >
              <span>Empreiteiros</span>
              <span className="text-xs text-gray-400">{resumoSidebar.porTipo.empreiteiro}</span>
            </button>
            <button
              onClick={() => setSidebarFiltro('tipo:boleto')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${sidebarFiltro === 'tipo:boleto' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                }`}
            >
              <span>Boletos</span>
              <span className="text-xs text-gray-400">{resumoSidebar.porTipo.boleto}</span>
            </button>
            <button
              onClick={() => setSidebarFiltro('tipo:outro')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${sidebarFiltro === 'tipo:outro' ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                }`}
            >
              <span>Outros</span>
              <span className="text-xs text-gray-400">{resumoSidebar.porTipo.outro}</span>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-dark-100">
            <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Obras com Contas
            </h3>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {resumoSidebar.obrasComContas
                .filter((item) => {
                  const id = item.obraId.toUpperCase()
                  return id !== 'FOLHA' && id !== 'PESSOAL'
                })
                .map((item) => (
                  <button
                    key={item.obraId}
                    onClick={() => setSidebarFiltro(`obra:${item.obraId}`)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${sidebarFiltro === `obra:${item.obraId}` ? 'bg-brand/20 text-brand' : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                      }`}
                  >
                    <span className="truncate">{item.nome}</span>
                    <span className="text-xs text-gray-400">{item.quantidade}</span>
                  </button>
                ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <FiltrosFinanceiro
            onFilterChange={setFiltros}
            obras={obras}
            showParticularOption={canAccessContasParticulares}
          />

          {selectedIds.length > 0 && (
            <div className="mb-4 border border-brand/30 bg-brand/10 rounded-xl p-4">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-brand font-medium">
                    {selectedIds.length} conta(s) selecionada(s) para pagamento em lote
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Abra boletos/códigos e marque todas como pagas de uma vez.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={abrirBoletosSelecionados}
                    className="px-3 py-2 text-sm border border-dark-100 rounded-lg text-gray-300 hover:text-brand hover:border-brand transition-colors"
                  >
                    Abrir boletos
                  </button>
                  <button
                    onClick={() => setShowCodigos((prev) => !prev)}
                    className="px-3 py-2 text-sm border border-dark-100 rounded-lg text-gray-300 hover:text-brand hover:border-brand transition-colors"
                  >
                    {showCodigos ? 'Ocultar códigos' : 'Ver códigos'}
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-2 text-sm border border-dark-100 rounded-lg text-gray-300 hover:text-brand hover:border-brand transition-colors"
                    title="Limpar seleção"
                  >
                    Limpar seleção
                  </button>
                  <button
                    onClick={excluirSelecionadasEmLote}
                    className="px-3 py-2 text-sm border border-error/40 bg-error/10 rounded-lg text-error hover:bg-error/15 transition-colors"
                    title="Excluir selecionadas"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="loteFormaPagamento" className="block text-xs text-gray-400 mb-1">Forma</label>
                  <select
                    id="loteFormaPagamento"
                    value={loteFormaPagamento}
                    onChange={(e) => setLoteFormaPagamento(e.target.value as ContaPagarFormaPagamento)}
                    className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    {FORMAS_PAGAMENTO.map((forma) => (
                      <option key={forma.value} value={forma.value}>{forma.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="loteContaPagamento" className="block text-xs text-gray-400 mb-1">Conta</label>
                  <input
                    id="loteContaPagamento"
                    type="text"
                    value={loteContaPagamento}
                    onChange={(e) => setLoteContaPagamento(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Conta usada para pagar"
                  />
                </div>

                <div>
                  <label htmlFor="loteDataPagamento" className="block text-xs text-gray-400 mb-1">Data do pagamento</label>
                  <input
                    id="loteDataPagamento"
                    type="date"
                    value={loteDataPagamento}
                    onChange={(e) => setLoteDataPagamento(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={marcarSelecionadasComoPagas}
                    className="w-full px-4 py-2.5 bg-success text-dark-800 font-semibold rounded-lg hover:bg-success/80 transition-colors"
                  >
                    Marcar como pagas
                  </button>
                </div>
              </div>

              {showCodigos && (
                <div className="mt-4 border-t border-dark-100 pt-4 space-y-2">
                  {contasSelecionadas.map((conta) => (
                    <div key={conta.id} className="bg-dark-500 border border-dark-100 rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-sm text-gray-200">
                          Conta #{conta.id.slice(0, 8)} | {formatCurrency(conta.valor)}
                          {hasParcelamento(conta) ? ` | Parcela ${getParcelaTexto(conta)}` : ''}
                        </p>
                        {conta.boletoUrl && (
                          <a
                            href={conta.boletoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-brand hover:text-brand-light"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            Abrir boleto
                          </a>
                        )}
                      </div>

                      <div className="mt-2 space-y-2">
                        {conta.linhaDigitavel && (
                          <div className="bg-dark-400 rounded-lg p-2">
                            <p className="text-xs text-gray-500 mb-1">Linha Digitável</p>
                            <p className="text-xs text-gray-200 break-all">{conta.linhaDigitavel}</p>
                            <button
                              onClick={() => handleCopy(conta.linhaDigitavel!)}
                              className="mt-1 inline-flex items-center text-xs text-brand hover:text-brand-light"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copiar linha
                            </button>
                          </div>
                        )}

                        {conta.codigoBarras && (
                          <div className="bg-dark-400 rounded-lg p-2">
                            <p className="text-xs text-gray-500 mb-1">Código de Barras</p>
                            <p className="text-xs text-gray-200 break-all">{conta.codigoBarras}</p>
                            <button
                              onClick={() => handleCopy(conta.codigoBarras!)}
                              className="mt-1 inline-flex items-center text-xs text-brand hover:text-brand-light"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copiar código
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {contasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              {contas.length === 0
                ? 'Nenhuma conta a pagar cadastrada'
                : 'Nenhuma conta encontrada com os filtros aplicados'}
            </div>
          ) : (
            <div className="bg-dark-500 border border-dark-100 rounded-xl">
              <div className="px-4 py-3 bg-dark-400 border-b border-dark-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-sm text-gray-400">
                  Mostrando {contasFiltradas.length} de {contas.length} conta(s)
                </p>
                <button
                  onClick={toggleSelectAllOpen}
                  className="inline-flex items-center text-sm text-brand hover:text-brand-light"
                >
                  {contasEmAberto.length > 0 && contasEmAberto.every((conta) => selectedIds.includes(conta.id)) ? (
                    <CheckSquare className="w-4 h-4 mr-1.5" />
                  ) : (
                    <Square className="w-4 h-4 mr-1.5" />
                  )}
                  Selecionar em aberto
                </button>
              </div>

              <div className="overflow-x-auto lg:overflow-x-hidden">
                <div className="w-full">
                  <div className={`hidden lg:grid ${tableCols} gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-dark-100`}>
                    <div />
                    <div><SortHeader keyName="descricao" label="Descrição" /></div>
                    <div><SortHeader keyName="contato" label="Contato" /></div>
                    <div><SortHeader keyName="conta" label="Conta" /></div>
                    <div><SortHeader keyName="data" label="Data" /></div>
                    <div><SortHeader keyName="status" label="Situação" /></div>
                    <div><SortHeader keyName="valor" label="Valor" /></div>
                    <div className="text-right">Ações</div>
                  </div>

                  <ul className="divide-y divide-dark-100">
                    {contasFiltradas.map((conta) => {
                      const podeSelecionar = conta.status !== 'pago'
                      const isSelected = selectedIds.includes(conta.id)
                      const parcelasDoGrupo = getParcelasDoGrupo(conta)
                      const parcelaAtualNumero = conta.parcelaAtual || 1
                      const proximaParcela = parcelasDoGrupo.find((item) => (item.parcelaAtual || 1) > parcelaAtualNumero)
                      const descricao = conta.descricao || `Conta #${conta.id.slice(0, 8)}`
                      const isPessoal = Boolean(conta.pessoal) || conta.obraId === 'PESSOAL'
                      const isFolha = conta.tipo === 'folha'
                      const isEmpreiteiro = conta.tipo === 'empreiteiro'

                      return (
                        <li key={conta.id} className="px-4 py-3">
                          <div className={`grid grid-cols-1 ${tableCols} gap-2 lg:items-center`}>
                            <div className="pt-0.5">
                              <button
                                disabled={!podeSelecionar}
                                onClick={() => podeSelecionar && toggleSelect(conta.id)}
                                className={`transition-colors ${podeSelecionar ? 'text-gray-300 hover:text-brand' : 'text-gray-600 cursor-not-allowed'}`}
                                title={podeSelecionar ? 'Selecionar' : 'Já pago'}
                                aria-label="Selecionar"
                              >
                                {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                              </button>
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-100 truncate" title={descricao}>
                                {descricao}
                                {isPessoal && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-brand/15 text-brand whitespace-nowrap">
                                    pessoal
                                  </span>
                                )}
                                {isFolha && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-pink-500/20 text-pink-300 whitespace-nowrap">
                                    folha
                                  </span>
                                )}
                                {isEmpreiteiro && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-300 whitespace-nowrap">
                                    empreita
                                  </span>
                                )}
                              </p>
                              <div className="mt-1 flex items-center flex-wrap gap-2">
                                {hasParcelamento(conta) && (
                                  <button
                                    type="button"
                                    onClick={() => setContaPopupParcelasId(conta.id)}
                                    className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors whitespace-nowrap"
                                  >
                                    Parcela {getParcelaTexto(conta)}
                                  </button>
                                )}
                                {conta.recorrenciaMensal && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-500/20 text-cyan-300 whitespace-nowrap">
                                    Mensal
                                  </span>
                                )}
                                {conta.boletoUrl && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 whitespace-nowrap">
                                    Boleto
                                  </span>
                                )}
                                {(conta.linhaDigitavel || conta.codigoBarras) && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-300 whitespace-nowrap">
                                    Código
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-gray-500 truncate">
                                Obra: {getObraNome(conta.obraId)} | Tipo: {conta.tipo}
                                {proximaParcela ? ` | Próxima: ${format(toDate(proximaParcela.dataVencimento), 'dd/MM/yyyy')}` : ''}
                              </p>
                            </div>

                            <div className="text-sm text-gray-300 truncate" title={conta.favorecido || '-'}>
                              {conta.favorecido || '-'}
                            </div>

                            <div className="text-sm text-gray-300 truncate" title={conta.contaPagamento || '-'}>
                              {conta.contaPagamento || '-'}
                            </div>

                            <div className="text-sm text-gray-300 whitespace-nowrap">
                              {format(toDate(conta.dataVencimento), 'dd/MM/yy')}
                            </div>

                            <div>
                              {conta.status === 'pago' ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const confirmacao = confirm(`Voltar "${conta.descricao || 'esta conta'}" para "A Pagar"?`)
                                    if (!confirmacao) return
                                    try {
                                      await updateContaPagar(conta.id, {
                                        status: 'pendente',
                                        dataPagamento: null as unknown as Date,
                                      })
                                      await loadContas()
                                    } catch (err) {
                                      console.error('Erro ao reverter status:', err)
                                      alert('Erro ao reverter status.')
                                    }
                                  }}
                                  className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap bg-success/20 text-success cursor-pointer hover:opacity-80 transition-opacity"
                                  title="Clique para voltar para A Pagar"
                                >
                                  Paga
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const confirmacao = confirm(`Marcar "${conta.descricao || 'esta conta'}" como paga?`)
                                    if (!confirmacao) return
                                    try {
                                      await updateContaPagar(conta.id, {
                                        status: 'pago',
                                        dataPagamento: new Date(),
                                      })
                                      await loadContas()
                                    } catch (err) {
                                      console.error('Erro ao marcar como pago:', err)
                                      alert('Erro ao marcar como pago.')
                                    }
                                  }}
                                  className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${conta.status === 'vencido'
                                    ? 'bg-error/20 text-error'
                                    : 'bg-warning/20 text-warning'
                                    }`}
                                  title="Clique para marcar como pago"
                                >
                                  A Pagar
                                </button>
                              )}
                            </div>

                            <div className="text-base font-semibold text-brand whitespace-nowrap">
                              {formatCurrency(conta.valor)}
                            </div>

                            <div className="flex items-center gap-1.5 justify-start lg:justify-end flex-nowrap">
                              <Link
                                href={`/financeiro/contas-pagar/${conta.id}`}
                                className="p-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                                title="Detalhes"
                                aria-label="Detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <Link
                                href={`/financeiro/contas-pagar/${conta.id}/editar`}
                                className="p-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                                title="Editar"
                                aria-label="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Link>
                              {(conta.boletoUrl || conta.comprovanteUrl) && (
                                <a
                                  href={conta.boletoUrl || conta.comprovanteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                                  title={conta.boletoUrl ? 'Abrir boleto' : 'Abrir comprovante'}
                                  aria-label={conta.boletoUrl ? 'Abrir boleto' : 'Abrir comprovante'}
                                >
                                  {conta.boletoUrl ? <ExternalLink className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                </a>
                              )}
                              {canDeleteConta(conta) && (
                                <button
                                  onClick={() => handleDeleteConta(conta)}
                                  className="p-1.5 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors"
                                  title="Excluir"
                                  aria-label="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
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
        </div>
      </div>

      {contaPopupParcelas && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-dark-400 border-b border-dark-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand">Parcelas da Conta</p>
                <p className="text-xs text-gray-400">
                  {contaPopupParcelas.descricao || `Conta #${contaPopupParcelas.id.slice(0, 8)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContaPopupParcelasId(null)}
                className="p-1.5 rounded-lg border border-dark-100 text-gray-300 hover:text-brand hover:border-brand transition-colors"
                aria-label="Fechar popup de parcelas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {parcelasDoPopup.length <= 1 ? (
                <p className="text-sm text-gray-400">
                  Não há outras parcelas disponíveis para esta conta.
                </p>
              ) : (
                <ul className="space-y-2">
                  {parcelasDoPopup.map((parcela) => (
                    <li key={parcela.id} className="border border-dark-100 rounded-lg p-3 bg-dark-400">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-100">
                            Parcela {getParcelaTexto(parcela)} | {formatCurrency(parcela.valor)}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Vencimento: {format(toDate(parcela.dataVencimento), 'dd/MM/yyyy')}
                            {parcela.status === 'pago' && parcela.dataPagamento && ` | Pagamento registrado: ${format(toDate(parcela.dataPagamento), 'dd/MM/yyyy')}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${parcela.status === 'pago' ? 'bg-success/20 text-success' :
                            parcela.status === 'vencido' ? 'bg-error/20 text-error' :
                              'bg-warning/20 text-warning'
                            }`}>
                            {parcela.status}
                          </span>
                          <Link
                            href={`/financeiro/contas-pagar/${parcela.id}`}
                            onClick={() => setContaPopupParcelasId(null)}
                            className="inline-flex items-center text-sm text-brand hover:text-brand-light transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Abrir
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
