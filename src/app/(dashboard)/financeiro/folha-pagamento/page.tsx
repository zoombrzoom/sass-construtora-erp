'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Plus, Trash2, Users } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { getFolhasPagamento } from '@/lib/db/folhaPagamento'
import {
  deleteFolhaPagamentoCategoria,
  getFolhaPagamentoCategorias,
  saveFolhaPagamentoCategoria,
} from '@/lib/db/folhaPagamentoCategorias'
import {
  FolhaPagamento,
  FolhaPagamentoFormaPagamento,
  FolhaPagamentoRecorrenciaTipo,
} from '@/types/financeiro'
import { toDate } from '@/utils/date'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCpf(value?: string): string {
  if (!value) return '-'
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return value
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function cpfDigits(value?: string): string {
  return (value || '').replace(/\D/g, '')
}

function normalizeFuncionarioKey(nome: string): string {
  return String(nome || '').trim().toLowerCase().replace(/\s+/g, ' ')
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

type RecorrenciaLike = {
  recorrenciaTipo?: FolhaPagamentoRecorrenciaTipo
  recorrenciaIntervaloDias?: number
  recorrenciaDiaUtil?: number
  recorrenciaDiaMes2?: number
}

function formatRecorrencia(value: RecorrenciaLike): string {
  if (!value.recorrenciaTipo) return '-'
  if (value.recorrenciaTipo === 'personalizado') {
    const dias = Number(value.recorrenciaIntervaloDias) || 0
    return dias > 0 ? `A cada ${dias} dia(s)` : RECORRENCIA_LABELS.personalizado
  }
  return RECORRENCIA_LABELS[value.recorrenciaTipo]
}

function formatRecorrenciaDetalhe(value: RecorrenciaLike): string {
  if (!value.recorrenciaTipo) return ''
  if (value.recorrenciaTipo === 'mensal' || value.recorrenciaTipo === 'quinzenal') {
    const diaUtil = Number(value.recorrenciaDiaUtil) || 0
    const dia2 = Number(value.recorrenciaDiaMes2) || 0
    if (value.recorrenciaTipo === 'mensal') {
      return diaUtil > 0 ? `${diaUtil}º dia útil` : ''
    }
    const parts: string[] = []
    if (diaUtil > 0) parts.push(`${diaUtil}º dia útil`)
    if (dia2 > 0) parts.push(`Dia ${dia2}`)
    return parts.join(' • ')
  }
  if (value.recorrenciaTipo === 'personalizado') {
    const dias = Number(value.recorrenciaIntervaloDias) || 0
    return dias > 0 ? `${dias} dia(s)` : ''
  }
  return ''
}

type FuncionarioRow = {
  key: string
  folhaId: string
  nome: string
  cpf: string
  agencia: string
  conta: string
  valor: number
  formaPagamento?: FolhaPagamentoFormaPagamento
  categoriaId?: string
  recorrenciaTipo?: FolhaPagamentoRecorrenciaTipo
  recorrenciaIndeterminada?: boolean
  recorrenciaDiaUtil?: number
  recorrenciaDiaMes2?: number
  recorrenciaIntervaloDias?: number
}

function folhaTemplateScore(folha: FolhaPagamento): number {
  let score = 0
  if (folha.recorrenciaIndeterminada) score += 2
  if (folha.recorrenciaGrupoId) score += 1
  return score
}

export default function FolhaPagamentoPage() {
  const { user } = useAuth()
  const canManageCategorias = Boolean(user && (user.role === 'admin' || user.role === 'financeiro'))
  const [folhas, setFolhas] = useState<FolhaPagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<Array<{ id: string; nome: string }>>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('__all__')
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    void loadFolhas()
  }, [])

  useEffect(() => {
    void loadCategorias()
  }, [])

  const loadFolhas = async () => {
    try {
      const data = await getFolhasPagamento()
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

  const funcionarios = useMemo((): FuncionarioRow[] => {
    const byKey = new Map<string, FolhaPagamento>()

    for (const folha of folhas) {
      const cpf = cpfDigits(folha.cpf)
      const key =
        cpf.length === 11 ? `cpf:${cpf}` : `nome:${normalizeFuncionarioKey(folha.funcionarioNome)}`

      const current = byKey.get(key)
      if (!current) {
        byKey.set(key, folha)
        continue
      }

      const curScore = folhaTemplateScore(current)
      const nextScore = folhaTemplateScore(folha)
      if (nextScore > curScore) {
        byKey.set(key, folha)
        continue
      }

      if (nextScore < curScore) continue

      const curTime = toDate(current.dataReferencia).getTime()
      const nextTime = toDate(folha.dataReferencia).getTime()
      if (nextTime > curTime) {
        byKey.set(key, folha)
      }
    }

    const result: FuncionarioRow[] = Array.from(byKey.entries()).map(([key, folha]) => ({
      key,
      folhaId: folha.id,
      nome: folha.funcionarioNome || '',
      cpf: cpfDigits(folha.cpf),
      agencia: folha.agencia || '',
      conta: folha.conta || '',
      valor: Number(folha.valor) || 0,
      formaPagamento: folha.formaPagamento,
      categoriaId: folha.categoriaId,
      recorrenciaTipo: folha.recorrenciaTipo,
      recorrenciaIndeterminada: Boolean(folha.recorrenciaIndeterminada),
      recorrenciaDiaUtil: folha.recorrenciaDiaUtil,
      recorrenciaDiaMes2: folha.recorrenciaDiaMes2,
      recorrenciaIntervaloDias: folha.recorrenciaIntervaloDias,
    }))

    result.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    return result
  }, [folhas])

  const categoriasResumo = useMemo(() => {
    const counts = new Map<string, number>()
    let semCategoria = 0
    funcionarios.forEach((f) => {
      if (!f.categoriaId) {
        semCategoria += 1
        return
      }
      counts.set(f.categoriaId, (counts.get(f.categoriaId) || 0) + 1)
    })
    return { counts, semCategoria, total: funcionarios.length }
  }, [funcionarios])

  const funcionariosFiltrados = useMemo(() => {
    let base = [...funcionarios]

    base = base.filter((f) => {
      if (categoriaAtiva === '__all__') return true
      if (categoriaAtiva === '__none__') return !f.categoriaId
      return f.categoriaId === categoriaAtiva
    })

    const buscaTexto = busca.trim().toLowerCase()
    const buscaCpf = busca.replace(/\D/g, '')
    if (buscaTexto) {
      base = base.filter((f) => {
        const nome = f.nome.toLowerCase()
        const agencia = (f.agencia || '').toLowerCase()
        const conta = (f.conta || '').toLowerCase()
        const forma = f.formaPagamento ? FORMA_LABELS[f.formaPagamento].toLowerCase() : ''
        const cpf = f.cpf || ''
        return (
          nome.includes(buscaTexto) ||
          agencia.includes(buscaTexto) ||
          conta.includes(buscaTexto) ||
          forma.includes(buscaTexto) ||
          (buscaCpf.length >= 3 && cpf.includes(buscaCpf))
        )
      })
    }

    return base
  }, [funcionarios, categoriaAtiva, busca])

  const handleCreateCategoria = async () => {
    if (!canManageCategorias) return
    const nome = novaCategoriaNome.trim()
    if (!nome) return
    try {
      await saveFolhaPagamentoCategoria({ nome, createdBy: user!.id })
      setNovaCategoriaNome('')
      await loadCategorias()
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      alert('Erro ao salvar categoria.')
    }
  }

  const handleDeleteCategoria = async (id: string) => {
    if (!canManageCategorias) return
    const cat = categorias.find((c) => c.id === id)
    const nome = cat?.nome || id
    const confirmed = confirm(`Excluir a categoria "${nome}"?`)
    if (!confirmed) return

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

  const tableCols =
    'lg:grid-cols-[minmax(0,3fr)_120px_160px_minmax(0,1.3fr)_120px]'

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Folha de Pagamento</h1>
        <Link
          href="/financeiro/folha-pagamento/nova"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Funcionário
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
                categoriaAtiva === '__all__'
                  ? 'bg-brand/20 text-brand'
                  : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
              }`}
            >
              <span>Geral</span>
              <span className="text-xs text-gray-400">{categoriasResumo.total}</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoriaAtiva('__none__')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                categoriaAtiva === '__none__'
                  ? 'bg-brand/20 text-brand'
                  : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
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
                    categoriaAtiva === cat.id
                      ? 'bg-brand/20 text-brand'
                      : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
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

        <div className="space-y-4 min-w-0">
          <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-center">
              <div>
                <label htmlFor="filtroBusca" className="block text-xs text-gray-400 mb-1">
                  Buscar funcionário
                </label>
                <input
                  id="filtroBusca"
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Nome, CPF, agência, conta ou forma de pagamento..."
                />
              </div>
              <div className="text-sm text-gray-400 lg:text-right">
                Mostrando {funcionariosFiltrados.length} funcionário(s)
              </div>
            </div>
          </div>

          {funcionariosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              Nenhum funcionário encontrado.
            </div>
          ) : (
            <div className="bg-dark-500 border border-dark-100 rounded-xl">
              <div className="overflow-x-auto lg:overflow-x-hidden">
                <div className="w-full">
                  <div
                    className={`hidden lg:grid ${tableCols} gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-dark-100`}
                  >
                    <div>Funcionário</div>
                    <div>Valor</div>
                    <div>Recorrência</div>
                    <div>Departamento</div>
                    <div className="text-right">Ações</div>
                  </div>

                  <ul className="divide-y divide-dark-100">
                    {funcionariosFiltrados.map((f) => {
                      const departamento = f.categoriaId
                        ? categoriaNomePorId.get(f.categoriaId) || f.categoriaId
                        : 'Geral'
                      const cpfFmt = f.cpf ? formatCpf(f.cpf) : '-'
                      const forma = f.formaPagamento ? FORMA_LABELS[f.formaPagamento] : '-'
                      const detalheRec = formatRecorrenciaDetalhe(f)

                      return (
                        <li key={f.key}>
                          <div className="px-4 py-4">
                            <div className={`grid grid-cols-1 ${tableCols} gap-2 lg:items-center`}>
                              <div className="min-w-0">
                                <p className="text-base font-semibold text-gray-100 truncate" title={f.nome}>
                                  {f.nome}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate whitespace-nowrap">
                                  CPF: {cpfFmt} | Ag: {f.agencia || '-'} | Conta: {f.conta || '-'} | {forma}
                                </p>
                              </div>

                              <div className="text-lg font-bold text-brand whitespace-nowrap">
                                {formatCurrency(f.valor)}
                              </div>

                              <div className="text-sm text-gray-300 truncate" title={detalheRec || undefined}>
                                {formatRecorrencia(f)}
                                {detalheRec ? <span className="text-xs text-gray-500"> ({detalheRec})</span> : null}
                              </div>

                              <div className="text-sm text-gray-400 truncate" title={departamento}>
                                {departamento}
                              </div>

                              <div className="flex items-center gap-1.5 justify-start lg:justify-end flex-nowrap">
                                <Link
                                  href={`/financeiro/folha-pagamento/${f.folhaId}`}
                                  className="p-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                                  title="Detalhes"
                                  aria-label="Detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                                <Link
                                  href={`/financeiro/folha-pagamento/${f.folhaId}/editar`}
                                  className="p-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                                  title="Editar"
                                  aria-label="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Link>
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
        </div>
      </div>
    </div>
  )
}
