'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'
import { FolhaPagamento, FolhaPagamentoFormaPagamento, FolhaPagamentoRecorrenciaTipo, FolhaPagamentoStatus } from '@/types/financeiro'
import { deleteFolhaPagamento, getFolhaPagamento, getFolhasPagamento, updateFolhaPagamento } from '@/lib/db/folhaPagamento'
import { deleteContaPagar, getContasPagarPorFolhaPagamentoId } from '@/lib/db/contasPagar'
import { ArrowLeft, CheckCircle2, Edit2, ExternalLink, Trash2 } from 'lucide-react'

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

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCpf(value: string): string {
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

export default function FolhaPagamentoDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const [folha, setFolha] = useState<FolhaPagamento | null>(null)
  const [funcionarioRef, setFuncionarioRef] = useState<{ nome: string; cpf: string }>({ nome: '', cpf: '' })
  const [lancamentos, setLancamentos] = useState<FolhaPagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLancamentos, setLoadingLancamentos] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadFolha(params.id as string)
    }
  }, [params.id])

  const loadFolha = async (id: string) => {
    try {
      const data = await getFolhaPagamento(id)
      setFolha(data)
      if (data) {
        setFuncionarioRef({
          nome: data.funcionarioNome || '',
          cpf: cpfDigits(data.cpf),
        })
      }
    } catch (error) {
      console.error('Erro ao carregar folha de pagamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLancamentosFuncionario = async (ref: { nome: string; cpf: string }) => {
    if (!ref.nome && !ref.cpf) return
    setLoadingLancamentos(true)
    try {
      const all = await getFolhasPagamento()
      const byCpf = ref.cpf.length === 11
      const key = normalizeFuncionarioKey(ref.nome)
      const filtered = all.filter((f) => {
        if (byCpf) return cpfDigits(f.cpf) === ref.cpf
        return normalizeFuncionarioKey(f.funcionarioNome) === key
      })
      filtered.sort((a, b) => toDate(b.dataReferencia).getTime() - toDate(a.dataReferencia).getTime())
      setLancamentos(filtered)
    } catch (error) {
      console.error('Erro ao carregar lançamentos do funcionário:', error)
    } finally {
      setLoadingLancamentos(false)
    }
  }

  useEffect(() => {
    if (!funcionarioRef.nome && !funcionarioRef.cpf) return
    void loadLancamentosFuncionario(funcionarioRef)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionarioRef.nome, funcionarioRef.cpf])

  const resumo = useMemo(() => {
    return lancamentos.reduce(
      (acc, item) => {
        const aberto = Math.max(item.valor - item.valorPago, 0)
        acc.total += item.valor
        acc.totalPago += item.valorPago
        acc.totalAberto += aberto
        return acc
      },
      { total: 0, totalPago: 0, totalAberto: 0 }
    )
  }, [lancamentos])

  const handleMarcarPago = async (item: FolhaPagamento) => {
    const confirmado = confirm(`Marcar "${item.funcionarioNome}" (${format(toDate(item.dataReferencia), 'dd/MM/yyyy')}) como pago?`)
    if (!confirmado) return
    try {
      const hoje = new Date()
      await updateFolhaPagamento(item.id, {
        status: 'pago',
        valorPago: item.valor,
        dataPagamento: hoje,
        formaPagamento: item.formaPagamento || 'pix',
      })
      await loadLancamentosFuncionario(funcionarioRef)
    } catch (error: any) {
      console.error('Erro ao marcar como pago:', error)
      const code = error?.code || error?.name
      if (code === 'permission-denied') {
        alert('Sem permissão para marcar como pago. Peça a um usuário Admin/Financeiro.')
      } else {
        alert('Erro ao marcar como pago.')
      }
    }
  }

  const handleDeleteLancamento = async (item: FolhaPagamento) => {
    const confirmed = confirm(`Excluir lançamento de "${item.funcionarioNome}" (${format(toDate(item.dataReferencia), 'dd/MM/yyyy')})?`)
    if (!confirmed) return

    try {
      await deleteFolhaPagamento(item.id)

      try {
        const contas = await getContasPagarPorFolhaPagamentoId(item.id)
        if (contas.length > 0) {
          await Promise.all(contas.map((c) => deleteContaPagar(c.id)))
        }
      } catch (cleanupErr) {
        console.warn('Falha ao limpar contas vinculadas após excluir folha:', cleanupErr)
      }

      // Recarrega lista e, se deletou o registro usado na URL, redireciona para outro do mesmo funcionário.
      const all = await getFolhasPagamento()
      const byCpf = funcionarioRef.cpf.length === 11
      const key = normalizeFuncionarioKey(funcionarioRef.nome)
      const remaining = all
        .filter((f) => {
          if (byCpf) return cpfDigits(f.cpf) === funcionarioRef.cpf
          return normalizeFuncionarioKey(f.funcionarioNome) === key
        })
        .sort((a, b) => toDate(b.dataReferencia).getTime() - toDate(a.dataReferencia).getTime())

      setLancamentos(remaining)

      if (remaining.length === 0) {
        router.push('/financeiro/folha-pagamento')
      } else if ((params.id as string) === item.id) {
        router.replace(`/financeiro/folha-pagamento/${remaining[0].id}`)
      }
    } catch (error: any) {
      console.error('Erro ao excluir lançamento:', error)
      const code = error?.code || error?.name
      if (code === 'permission-denied') {
        alert('Sem permissão para excluir lançamentos da folha. (permission-denied)')
      } else {
        alert('Erro ao excluir lançamento.')
      }
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!folha) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Lançamento não encontrado</p>
        <Link href="/financeiro/folha-pagamento" className="text-brand hover:text-brand-light">
          Voltar para Folha de Pagamento
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Folha por Funcionário</h1>
        <Link
          href="/financeiro/folha-pagamento"
          className="flex items-center px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Link>
      </div>

      <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-dark-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-100">{folha.funcionarioNome}</h2>
              <p className="text-sm text-gray-400 mt-1">
                CPF: {formatCpf(folha.cpf || '')} | {lancamentos.length} lançamento(s)
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${resumo.totalAberto > 0 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
              {resumo.totalAberto > 0 ? 'Com pendências' : 'Tudo pago'}
            </span>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-dark-400 border border-dark-100 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Valor Total</p>
              <p className="text-base font-semibold text-gray-100">{formatCurrency(resumo.total)}</p>
            </div>
            <div className="bg-dark-400 border border-dark-100 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Valor Pago</p>
              <p className="text-base font-semibold text-success">{formatCurrency(resumo.totalPago)}</p>
            </div>
            <div className="bg-dark-400 border border-dark-100 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Em Aberto</p>
              <p className="text-base font-semibold text-warning">{formatCurrency(resumo.totalAberto)}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Lançamentos</h3>

            {loadingLancamentos ? (
              <div className="text-sm text-gray-500">Carregando lançamentos...</div>
            ) : lancamentos.length === 0 ? (
              <div className="text-sm text-gray-500">Nenhum lançamento encontrado.</div>
            ) : (
              <div className="border border-dark-100 rounded-xl overflow-hidden">
                <div className="hidden lg:grid grid-cols-[110px_130px_130px_130px_120px_150px_110px] gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-dark-100 bg-dark-400">
                  <div>Ref.</div>
                  <div>Valor</div>
                  <div>Pago</div>
                  <div>Aberto</div>
                  <div>Status</div>
                  <div>Recorrência</div>
                  <div className="text-right">Ações</div>
                </div>

                <ul className="divide-y divide-dark-100">
                  {lancamentos.map((item) => {
                    const aberto = Math.max(item.valor - item.valorPago, 0)
                    return (
                      <li key={item.id} className="px-4 py-3">
                        <div className="grid grid-cols-1 lg:grid-cols-[110px_130px_130px_130px_120px_150px_110px] gap-2 lg:items-center">
                          <div className="text-sm text-gray-300 whitespace-nowrap">
                            {format(toDate(item.dataReferencia), 'dd/MM/yy')}
                          </div>
                          <div className="text-sm font-semibold text-gray-100 whitespace-nowrap">
                            {formatCurrency(item.valor)}
                          </div>
                          <div className="text-sm font-semibold text-success whitespace-nowrap">
                            {formatCurrency(item.valorPago)}
                          </div>
                          <div className="text-sm font-semibold text-warning whitespace-nowrap">
                            {formatCurrency(aberto)}
                          </div>
                          <div>
                            {item.status === 'pago' ? (
                              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${STATUS_BADGES[item.status]}`}>
                                {STATUS_LABELS[item.status]}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMarcarPago(item)}
                                className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${STATUS_BADGES[item.status]} hover:brightness-110`}
                                title="Clique para marcar como pago"
                              >
                                {STATUS_LABELS[item.status]}
                                <CheckCircle2 className="w-3.5 h-3.5 ml-1.5 opacity-80" />
                              </button>
                            )}
                          </div>
                          <div className="text-sm text-gray-300 truncate">
                            {formatRecorrencia(item)}
                          </div>
                          <div className="flex items-center gap-2 justify-start lg:justify-end">
                            <Link
                              href={`/financeiro/folha-pagamento/${item.id}/editar`}
                              className="inline-flex items-center px-2.5 py-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors text-sm"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 mr-1.5" />
                              Editar
                            </Link>
                            <button
                              onClick={() => handleDeleteLancamento(item)}
                              className="inline-flex items-center px-2.5 py-1.5 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors text-sm"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 mr-1.5" />
                              Excluir
                            </button>
                          </div>
                        </div>

                        {(item.formaPagamento || item.dataPagamento || item.comprovanteUrl) && (
                          <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                            <span>Forma: {item.formaPagamento ? FORMA_LABELS[item.formaPagamento] : '-'}</span>
                            <span>Pagamento: {item.dataPagamento ? format(toDate(item.dataPagamento), 'dd/MM/yy') : '-'}</span>
                            {item.comprovanteUrl && (
                              <a
                                href={item.comprovanteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-brand hover:text-brand-light"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                Comprovante
                              </a>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-dark-100">
            <div className="flex flex-wrap justify-end gap-3">
              <Link
                href="/financeiro/folha-pagamento"
                className="px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
