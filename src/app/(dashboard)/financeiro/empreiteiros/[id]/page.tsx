'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'
import { Empreiteiro, EmpreiteiroFormaPagamento, EmpreiteiroStatus } from '@/types/financeiro'
import { deleteEmpreiteiro, getEmpreiteiro, getEmpreiteiros, updateEmpreiteiro } from '@/lib/db/empreiteiros'
import { getObras } from '@/lib/db/obras'
import { ArrowLeft, CheckCircle2, Edit2, ExternalLink, Trash2 } from 'lucide-react'

const STATUS_LABELS: Record<EmpreiteiroStatus, string> = {
    aberto: 'Em aberto',
    parcial: 'Parcial',
    pago: 'Pago',
}

const STATUS_BADGES: Record<EmpreiteiroStatus, string> = {
    aberto: 'bg-warning/20 text-warning',
    parcial: 'bg-blue-500/20 text-blue-400',
    pago: 'bg-success/20 text-success',
}

const FORMA_LABELS: Record<EmpreiteiroFormaPagamento, string> = {
    pix: 'PIX',
    deposito: 'Depósito',
    transferencia: 'Transferência',
    ted: 'TED',
    doc: 'DOC',
    dinheiro: 'Dinheiro',
    outro: 'Outro',
}

function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function normalizeKey(nome: string): string {
    return String(nome || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export default function EmpreiteiroDetalhesPage() {
    const params = useParams()
    const router = useRouter()
    const [empreiteiro, setEmpreiteiro] = useState<Empreiteiro | null>(null)
    const [lancamentos, setLancamentos] = useState<Empreiteiro[]>([])
    const [obrasMap, setObrasMap] = useState<Map<string, string>>(new Map())
    const [loading, setLoading] = useState(true)
    const [loadingLancamentos, setLoadingLancamentos] = useState(false)

    useEffect(() => {
        ; (async () => {
            try {
                const data = await getObras()
                const map = new Map<string, string>()
                data.forEach((o) => map.set(o.id, o.nome))
                setObrasMap(map)
            } catch (err) {
                console.error('Erro ao carregar obras:', err)
            }
        })()
    }, [])

    useEffect(() => {
        if (params.id) {
            loadEmpreiteiro(params.id as string)
        }
    }, [params.id])

    const loadEmpreiteiro = async (id: string) => {
        try {
            const data = await getEmpreiteiro(id)
            setEmpreiteiro(data)
            if (data) {
                void loadLancamentos(data.empreiteiroNome)
            }
        } catch (error) {
            console.error('Erro ao carregar empreiteiro:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadLancamentos = async (nome: string) => {
        if (!nome) return
        setLoadingLancamentos(true)
        try {
            const all = await getEmpreiteiros()
            const key = normalizeKey(nome)
            const filtered = all.filter((e) => normalizeKey(e.empreiteiroNome) === key)
            filtered.sort((a, b) => {
                // Ordena por nº de medição (desc) depois por data (desc)
                if (a.medicaoNumero !== b.medicaoNumero) return b.medicaoNumero - a.medicaoNumero
                return toDate(b.dataReferencia).getTime() - toDate(a.dataReferencia).getTime()
            })
            setLancamentos(filtered)
        } catch (error) {
            console.error('Erro ao carregar lançamentos:', error)
        } finally {
            setLoadingLancamentos(false)
        }
    }

    const resumo = useMemo(() => {
        return lancamentos.reduce(
            (acc, item) => {
                const aberto = Math.max(item.valor - item.valorPago, 0)
                acc.total += item.valor
                acc.totalPago += item.valorPago
                acc.totalAberto += aberto
                acc.totalMedicoes = Math.max(acc.totalMedicoes, item.medicaoNumero)
                return acc
            },
            { total: 0, totalPago: 0, totalAberto: 0, totalMedicoes: 0 }
        )
    }, [lancamentos])

    const handleMarcarPago = async (item: Empreiteiro) => {
        const confirmado = confirm(`Marcar medição #${item.medicaoNumero} de "${item.empreiteiroNome}" como pago?`)
        if (!confirmado) return
        try {
            const hoje = new Date()
            await updateEmpreiteiro(item.id, {
                status: 'pago',
                valorPago: item.valor,
                dataPagamento: hoje,
                formaPagamento: item.formaPagamento || 'pix',
            })
            if (empreiteiro) {
                await loadLancamentos(empreiteiro.empreiteiroNome)
            }
        } catch (error: any) {
            console.error('Erro ao marcar como pago:', error)
            const code = error?.code || error?.name
            if (code === 'permission-denied') {
                alert('Sem permissão para marcar como pago.')
            } else {
                alert('Erro ao marcar como pago.')
            }
        }
    }

    const handleDeleteLancamento = async (item: Empreiteiro) => {
        const confirmed = confirm(`Excluir medição #${item.medicaoNumero} de "${item.empreiteiroNome}"?`)
        if (!confirmed) return

        try {
            await deleteEmpreiteiro(item.id)

            if (empreiteiro) {
                const all = await getEmpreiteiros()
                const key = normalizeKey(empreiteiro.empreiteiroNome)
                const remaining = all
                    .filter((e) => normalizeKey(e.empreiteiroNome) === key)
                    .sort((a, b) => b.medicaoNumero - a.medicaoNumero)

                setLancamentos(remaining)

                if (remaining.length === 0) {
                    router.push('/financeiro/empreiteiros')
                } else if ((params.id as string) === item.id) {
                    router.replace(`/financeiro/empreiteiros/${remaining[0].id}`)
                }
            }
        } catch (error: any) {
            console.error('Erro ao excluir:', error)
            const code = error?.code || error?.name
            if (code === 'permission-denied') {
                alert('Sem permissão para excluir.')
            } else {
                alert('Erro ao excluir.')
            }
        }
    }

    if (loading) {
        return <div className="text-center py-12 text-gray-400">Carregando...</div>
    }

    if (!empreiteiro) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Registro não encontrado</p>
                <Link href="/financeiro/empreiteiros" className="text-brand hover:text-brand-light">
                    Voltar para Empreiteiros
                </Link>
            </div>
        )
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-brand">Medições do Empreiteiro</h1>
                <Link
                    href="/financeiro/empreiteiros"
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
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-100">{empreiteiro.empreiteiroNome}</h2>
                            <p className="text-sm text-gray-400 mt-1">
                                {lancamentos.length} medição(ões) | Até medição #{resumo.totalMedicoes}
                            </p>
                        </div>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${resumo.totalAberto > 0 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                            {resumo.totalAberto > 0 ? 'Com pendências' : 'Tudo pago'}
                        </span>
                    </div>
                </div>

                <div className="px-4 sm:px-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                        <div className="bg-dark-400 border border-dark-100 rounded-lg p-4">
                            <p className="text-xs text-gray-400 mb-1">Medições</p>
                            <p className="text-base font-semibold text-orange-400">{lancamentos.length}</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Medições</h3>

                        {loadingLancamentos ? (
                            <div className="text-sm text-gray-500">Carregando medições...</div>
                        ) : lancamentos.length === 0 ? (
                            <div className="text-sm text-gray-500">Nenhuma medição encontrada.</div>
                        ) : (
                            <div className="border border-dark-100 rounded-xl overflow-hidden">
                                <div className="hidden lg:grid grid-cols-[60px_1fr_100px_120px_120px_100px_100px_110px] gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-dark-100 bg-dark-400">
                                    <div>Nº</div>
                                    <div>Serviço / Obra</div>
                                    <div>%</div>
                                    <div>Valor</div>
                                    <div>Pago</div>
                                    <div>Ref.</div>
                                    <div>Status</div>
                                    <div className="text-right">Ações</div>
                                </div>

                                <ul className="divide-y divide-dark-100">
                                    {lancamentos.map((item) => {
                                        const obraNome = obrasMap.get(item.obraId) || item.obraId
                                        return (
                                            <li key={item.id} className="px-4 py-3">
                                                <div className="grid grid-cols-1 lg:grid-cols-[60px_1fr_100px_120px_120px_100px_100px_110px] gap-2 lg:items-center">
                                                    <div className="text-lg font-bold text-orange-400">
                                                        #{item.medicaoNumero}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-100 truncate">{item.servico}</p>
                                                        <p className="text-xs text-gray-500 truncate">{obraNome}</p>
                                                    </div>
                                                    <div className="text-sm text-orange-400 font-semibold">
                                                        {item.percentualExecutado}%
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-100 whitespace-nowrap">
                                                        {formatCurrency(item.valor)}
                                                    </div>
                                                    <div className="text-sm font-semibold text-success whitespace-nowrap">
                                                        {formatCurrency(item.valorPago)}
                                                    </div>
                                                    <div className="text-sm text-gray-300 whitespace-nowrap">
                                                        {format(toDate(item.dataReferencia), 'dd/MM/yy')}
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
                                                    <div className="flex items-center gap-2 justify-start lg:justify-end">
                                                        <Link
                                                            href={`/financeiro/empreiteiros/${item.id}/editar`}
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
                                href="/financeiro/empreiteiros"
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
