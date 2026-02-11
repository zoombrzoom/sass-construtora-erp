'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'
import { getObra } from '@/lib/db/obras'
import { getContasPagar } from '@/lib/db/contasPagar'
import { ContaPagar, ContaPagarStatus, ContaPagarTipo } from '@/types/financeiro'
import { Obra } from '@/types/obra'
import { ArrowLeft, Filter, HardHat } from 'lucide-react'

const MATERIAIS_COMUNS = ['cimento', 'ferro', 'esquadria', 'areia', 'brita', 'tijolo', 'argamassa', 'bloco']

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function GastosObraPage() {
  const params = useParams()
  const obraId = params.id as string
  const [obra, setObra] = useState<Obra | null>(null)
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ContaPagarStatus | ''>('')
  const [tipo, setTipo] = useState<ContaPagarTipo | ''>('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (obraId) {
      loadData()
    }
  }, [obraId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [obraData, contasData] = await Promise.all([
        getObra(obraId),
        getContasPagar({ obraId }),
      ])
      setObra(obraData)
      setContas(contasData)
    } catch (error) {
      console.error('Erro ao carregar gastos da obra:', error)
    } finally {
      setLoading(false)
    }
  }

  const contasBase = useMemo(() => {
    const inicio = dataInicio ? new Date(dataInicio) : null
    const fim = dataFim ? new Date(dataFim) : null
    if (fim) fim.setHours(23, 59, 59, 999)

    return contas.filter((conta) => {
      if (status && conta.status !== status) return false
      if (tipo && conta.tipo !== tipo) return false

      const dataComparacao = toDate(conta.dataPagamento || conta.dataVencimento)
      if (inicio && dataComparacao < inicio) return false
      if (fim && dataComparacao > fim) return false

      return true
    })
  }, [contas, status, tipo, dataInicio, dataFim])

  const contasFiltradas = useMemo(() => {
    const termo = normalizeText(busca.trim())
    if (!termo) return contasBase

    return contasBase.filter((conta) => {
      const descricao = normalizeText(conta.descricao || '')
      return descricao.includes(termo)
    })
  }, [contasBase, busca])

  const totais = useMemo(() => {
    return contasFiltradas.reduce(
      (acc, conta) => {
        acc.total += conta.valor
        if (conta.status === 'pago') {
          acc.pago += conta.valor
        } else {
          acc.aberto += conta.valor
        }
        return acc
      },
      { total: 0, pago: 0, aberto: 0 }
    )
  }, [contasFiltradas])

  const materialResumo = useMemo(() => {
    return MATERIAIS_COMUNS.map((material) => {
      const valor = contasBase
        .filter((conta) => normalizeText(conta.descricao || '').includes(material))
        .reduce((sum, conta) => sum + conta.valor, 0)
      return { material, valor }
    }).sort((a, b) => b.valor - a.valor)
  }, [contasBase])

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!obra) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Obra não encontrada</p>
        <Link href="/obras" className="text-brand hover:text-brand-light">
          Voltar para Obras
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand">Gastos da Obra</h1>
          <p className="text-sm text-gray-400 mt-1">{obra.nome}</p>
        </div>
        <Link
          href="/obras"
          className="flex items-center px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total no Filtro</p>
          <p className="text-lg font-semibold text-gray-100">{formatCurrency(totais.total)}</p>
        </div>
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Pago</p>
          <p className="text-lg font-semibold text-success">{formatCurrency(totais.pago)}</p>
        </div>
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Em Aberto</p>
          <p className="text-lg font-semibold text-warning">{formatCurrency(totais.aberto)}</p>
        </div>
      </div>

      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label htmlFor="busca" className="block text-xs text-gray-400 mb-1">Pesquisar material/descrição</label>
            <input
              id="busca"
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex: cimento, ferro, esquadria..."
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-xs text-gray-400 mb-1">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus((e.target.value as ContaPagarStatus) || '')}
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="vencido">Vencido</option>
              <option value="pago">Pago</option>
            </select>
          </div>
          <div>
            <label htmlFor="tipo" className="block text-xs text-gray-400 mb-1">Tipo</label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo((e.target.value as ContaPagarTipo) || '')}
              className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Todos</option>
              <option value="boleto">Boleto</option>
              <option value="escritorio">Escritório</option>
              <option value="folha">Folha</option>
              <option value="empreiteiro">Empreiteiro</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label htmlFor="dataInicio" className="block text-xs text-gray-400 mb-1">Período</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-2 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-2 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
        <div className="flex items-center text-gray-300 mb-3">
          <Filter className="w-4 h-4 mr-2 text-brand" />
          <span className="text-sm font-medium">Resumo por material</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {materialResumo.map((item) => (
            <button
              key={item.material}
              onClick={() => setBusca(item.material)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                normalizeText(busca) === item.material
                  ? 'border-brand bg-brand/20 text-brand'
                  : 'border-dark-100 bg-dark-400 text-gray-300 hover:border-brand hover:text-brand'
              }`}
            >
              {item.material}: {formatCurrency(item.valor)}
            </button>
          ))}
        </div>
      </div>

      {contasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <HardHat className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          Nenhum gasto encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-dark-400 border-b border-dark-100">
            <p className="text-sm text-gray-400">
              {contasFiltradas.length} lançamento(s) de gasto na obra
            </p>
          </div>
          <ul className="divide-y divide-dark-100">
            {contasFiltradas
              .sort((a, b) => toDate(b.dataPagamento || b.dataVencimento).getTime() - toDate(a.dataPagamento || a.dataVencimento).getTime())
              .map((conta) => (
                <li key={conta.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <p className="text-base font-semibold text-gray-100">{formatCurrency(conta.valor)}</p>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            conta.status === 'pago' ? 'bg-success/20 text-success' :
                            conta.status === 'vencido' ? 'bg-error/20 text-error' :
                            'bg-warning/20 text-warning'
                          }`}>
                            {conta.status}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-dark-400 text-gray-300">
                            {conta.tipo}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{conta.descricao || 'Sem descrição'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Vencimento: {format(toDate(conta.dataVencimento), 'dd/MM/yyyy')}
                          {conta.dataPagamento && ` | Pagamento: ${format(toDate(conta.dataPagamento), 'dd/MM/yyyy')}`}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Link
                          href={`/financeiro/contas-pagar/${conta.id}`}
                          className="text-sm text-brand hover:text-brand-light"
                        >
                          Ver conta
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
