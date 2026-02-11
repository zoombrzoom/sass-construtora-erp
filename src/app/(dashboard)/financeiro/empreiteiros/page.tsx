'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Plus, HardHat } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { getEmpreiteiros } from '@/lib/db/empreiteiros'
import { getObras } from '@/lib/db/obras'
import { Empreiteiro, EmpreiteiroFormaPagamento } from '@/types/financeiro'
import { toDate } from '@/utils/date'

function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function normalizeKey(nome: string): string {
    return String(nome || '').trim().toLowerCase().replace(/\s+/g, ' ')
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

type EmpreiteiroRow = {
    key: string
    registroId: string
    nome: string
    totalMedicoes: number
    ultimaMedicao: number
    valorTotal: number
    valorAberto: number
    obraIds: string[]
}

export default function EmpreiteirosPage() {
    const { user } = useAuth()
    const [empreiteiros, setEmpreiteiros] = useState<Empreiteiro[]>([])
    const [obras, setObras] = useState<Map<string, string>>(new Map())
    const [loading, setLoading] = useState(true)
    const [obraFiltro, setObraFiltro] = useState<string>('__all__')
    const [busca, setBusca] = useState('')

    useEffect(() => {
        void loadData()
    }, [])

    const loadData = async () => {
        try {
            const [emps, obrasData] = await Promise.all([getEmpreiteiros(), getObras()])
            setEmpreiteiros(emps)
            const map = new Map<string, string>()
            obrasData.forEach((o) => map.set(o.id, o.nome))
            setObras(map)
        } catch (error) {
            console.error('Erro ao carregar empreiteiros:', error)
        } finally {
            setLoading(false)
        }
    }

    // Obras usadas para filtro
    const obrasUsadas = useMemo(() => {
        const ids = new Set<string>()
        empreiteiros.forEach((e) => ids.add(e.obraId))
        return Array.from(ids).map((id) => ({ id, nome: obras.get(id) || id })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    }, [empreiteiros, obras])

    // Agrupar por empreiteiro
    const rows = useMemo((): EmpreiteiroRow[] => {
        const byKey = new Map<string, { registros: Empreiteiro[] }>()

        for (const emp of empreiteiros) {
            const key = normalizeKey(emp.empreiteiroNome)
            if (!byKey.has(key)) {
                byKey.set(key, { registros: [] })
            }
            byKey.get(key)!.registros.push(emp)
        }

        const result: EmpreiteiroRow[] = Array.from(byKey.entries()).map(([key, { registros }]) => {
            const sorted = [...registros].sort((a, b) => b.medicaoNumero - a.medicaoNumero)
            const latest = sorted[0]
            const totalMedicoes = registros.length
            const ultimaMedicao = Math.max(...registros.map((r) => r.medicaoNumero))
            const valorTotal = registros.reduce((sum, r) => sum + r.valor, 0)
            const valorAberto = registros.reduce((sum, r) => sum + Math.max(r.valor - r.valorPago, 0), 0)
            const obraIds = [...new Set(registros.map((r) => r.obraId))]

            return {
                key,
                registroId: latest.id,
                nome: latest.empreiteiroNome,
                totalMedicoes,
                ultimaMedicao,
                valorTotal,
                valorAberto,
                obraIds,
            }
        })

        result.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        return result
    }, [empreiteiros])

    // Contagem por obra
    const obraResumo = useMemo(() => {
        const counts = new Map<string, number>()
        rows.forEach((r) => {
            r.obraIds.forEach((oid) => {
                counts.set(oid, (counts.get(oid) || 0) + 1)
            })
        })
        return { counts, total: rows.length }
    }, [rows])

    // Filtrar
    const filtrados = useMemo(() => {
        let base = [...rows]

        if (obraFiltro !== '__all__') {
            base = base.filter((r) => r.obraIds.includes(obraFiltro))
        }

        const buscaTexto = busca.trim().toLowerCase()
        if (buscaTexto) {
            base = base.filter((r) => r.nome.toLowerCase().includes(buscaTexto))
        }

        return base
    }, [rows, obraFiltro, busca])

    if (loading) {
        return <div className="text-center py-12 text-gray-400">Carregando...</div>
    }

    const tableCols = 'lg:grid-cols-[minmax(0,3fr)_100px_120px_120px_120px_120px]'

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-brand">Empreiteiros</h1>
                <Link
                    href="/financeiro/empreiteiros/nova"
                    className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Medição
                </Link>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
                <aside className="bg-dark-500 border border-dark-100 rounded-xl p-4 h-fit overflow-hidden">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Filtrar por Obra</p>

                    <div className="space-y-1">
                        <button
                            type="button"
                            onClick={() => setObraFiltro('__all__')}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${obraFiltro === '__all__'
                                    ? 'bg-brand/20 text-brand'
                                    : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                                }`}
                        >
                            <span>Todas as obras</span>
                            <span className="text-xs text-gray-400">{obraResumo.total}</span>
                        </button>

                        {obrasUsadas.map((obra) => (
                            <button
                                key={obra.id}
                                type="button"
                                onClick={() => setObraFiltro(obra.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${obraFiltro === obra.id
                                        ? 'bg-brand/20 text-brand'
                                        : 'text-gray-300 hover:bg-dark-400 hover:text-brand'
                                    }`}
                            >
                                <span className="truncate">{obra.nome}</span>
                                <span className="text-xs text-gray-400">{obraResumo.counts.get(obra.id) || 0}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                <div className="space-y-4 min-w-0">
                    <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-center">
                            <div>
                                <label htmlFor="filtroBusca" className="block text-xs text-gray-400 mb-1">
                                    Buscar empreiteiro
                                </label>
                                <input
                                    id="filtroBusca"
                                    type="text"
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                                    placeholder="Nome do empreiteiro..."
                                />
                            </div>
                            <div className="text-sm text-gray-400 lg:text-right">
                                Mostrando {filtrados.length} empreiteiro(s)
                            </div>
                        </div>
                    </div>

                    {filtrados.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <HardHat className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                            Nenhum empreiteiro encontrado.
                        </div>
                    ) : (
                        <div className="bg-dark-500 border border-dark-100 rounded-xl">
                            <div className="overflow-x-auto lg:overflow-x-hidden">
                                <div className="w-full">
                                    <div
                                        className={`hidden lg:grid ${tableCols} gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-dark-100`}
                                    >
                                        <div>Empreiteiro</div>
                                        <div>Medições</div>
                                        <div>Última</div>
                                        <div>Valor Total</div>
                                        <div>Em Aberto</div>
                                        <div className="text-right">Ações</div>
                                    </div>

                                    <ul className="divide-y divide-dark-100">
                                        {filtrados.map((f) => {
                                            const obrasNomes = f.obraIds.map((id) => obras.get(id) || id).join(', ')

                                            return (
                                                <li key={f.key}>
                                                    <div className="px-4 py-4">
                                                        <div className={`grid grid-cols-1 ${tableCols} gap-2 lg:items-center`}>
                                                            <div className="min-w-0">
                                                                <p className="text-base font-semibold text-gray-100 truncate" title={f.nome}>
                                                                    {f.nome}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-0.5 truncate" title={obrasNomes}>
                                                                    {obrasNomes}
                                                                </p>
                                                            </div>

                                                            <div className="text-lg font-bold text-orange-400">
                                                                {f.totalMedicoes}
                                                            </div>

                                                            <div className="text-sm text-gray-300">
                                                                #{f.ultimaMedicao}
                                                            </div>

                                                            <div className="text-lg font-bold text-brand whitespace-nowrap">
                                                                {formatCurrency(f.valorTotal)}
                                                            </div>

                                                            <div className={`text-sm font-semibold whitespace-nowrap ${f.valorAberto > 0 ? 'text-warning' : 'text-success'}`}>
                                                                {formatCurrency(f.valorAberto)}
                                                            </div>

                                                            <div className="flex items-center gap-1.5 justify-start lg:justify-end flex-nowrap">
                                                                <Link
                                                                    href={`/financeiro/empreiteiros/${f.registroId}`}
                                                                    className="p-1.5 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                                                                    title="Detalhes"
                                                                    aria-label="Detalhes"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Link>
                                                                <Link
                                                                    href={`/financeiro/empreiteiros/${f.registroId}/editar`}
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
