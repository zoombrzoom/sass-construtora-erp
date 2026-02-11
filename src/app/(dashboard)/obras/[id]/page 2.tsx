'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { getObra } from '@/lib/db/obras'
import { getContasPagar } from '@/lib/db/contasPagar'
import { getRequisicoes } from '@/lib/db/requisicoes'
import { getCotacoes } from '@/lib/db/cotacoes'
import { ContaPagar } from '@/types/financeiro'
import { Cotacao, Requisicao } from '@/types/compras'
import { Obra } from '@/types/obra'
import { toDate } from '@/utils/date'
import { ArrowLeft, CreditCard, FileCheck, ShoppingCart } from 'lucide-react'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ObraVisaoPage() {
  const params = useParams()
  const obraId = params.id as string
  const [obra, setObra] = useState<Obra | null>(null)
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([])
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (obraId) {
      loadData()
    }
  }, [obraId])

  const loadData = async () => {
    try {
      const [obraData, contasData, requisicoesData, cotacoesData] = await Promise.all([
        getObra(obraId),
        getContasPagar({ obraId }),
        getRequisicoes({ obraId }),
        getCotacoes(),
      ])

      const requisicaoIds = new Set(requisicoesData.map((item) => item.id))
      const cotacoesDaObra = cotacoesData.filter((item) => requisicaoIds.has(item.requisicaoId))

      setObra(obraData)
      setContas(contasData)
      setRequisicoes(requisicoesData)
      setCotacoes(cotacoesDaObra)
    } catch (error) {
      console.error('Erro ao carregar visão da obra:', error)
    } finally {
      setLoading(false)
    }
  }

  const contasPagas = useMemo(() => contas.filter((item) => item.status === 'pago'), [contas])
  const contasAbertas = useMemo(() => contas.filter((item) => item.status !== 'pago'), [contas])

  const totalPago = useMemo(() => contasPagas.reduce((sum, item) => sum + item.valor, 0), [contasPagas])
  const totalAberto = useMemo(() => contasAbertas.reduce((sum, item) => sum + item.valor, 0), [contasAbertas])

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
          <h1 className="text-2xl sm:text-3xl font-bold text-brand">{obra.nome}</h1>
          <p className="text-sm text-gray-400 mt-1">{obra.endereco}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/obras"
            className="flex items-center px-3 py-2 border border-dark-100 rounded-lg text-gray-300 hover:border-brand hover:text-brand transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar
          </Link>
          <Link
            href={`/obras/${obra.id}/editar`}
            className="px-3 py-2 border border-dark-100 rounded-lg text-gray-300 hover:border-brand hover:text-brand transition-colors"
          >
            Editar Obra
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Contas pagas</p>
          <p className="text-base font-semibold text-success">{contasPagas.length}</p>
        </div>
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Contas em aberto</p>
          <p className="text-base font-semibold text-warning">{contasAbertas.length}</p>
        </div>
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total pago</p>
          <p className="text-base font-semibold text-success">{formatCurrency(totalPago)}</p>
        </div>
        <div className="bg-dark-500 border border-dark-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total em aberto</p>
          <p className="text-base font-semibold text-warning">{formatCurrency(totalAberto)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 flex items-center">
              <CreditCard className="w-4 h-4 mr-2 text-success" />
              Contas Pagas
            </h2>
            <span className="text-xs text-gray-500">{contasPagas.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-dark-100">
            {contasPagas.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">Nenhuma conta paga.</p>
            ) : contasPagas
              .sort((a, b) => toDate(b.dataPagamento || b.dataVencimento).getTime() - toDate(a.dataPagamento || a.dataVencimento).getTime())
              .map((conta) => (
                <Link key={conta.id} href={`/financeiro/contas-pagar/${conta.id}`} className="block px-4 py-3 hover:bg-dark-400 transition-colors">
                  <p className="text-sm text-gray-100">{conta.descricao || `Conta ${conta.id.slice(0, 8)}`}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(conta.valor)} | Pago em {conta.dataPagamento ? format(toDate(conta.dataPagamento), 'dd/MM/yyyy') : '-'}
                  </p>
                </Link>
              ))}
          </div>
        </section>

        <section className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 flex items-center">
              <CreditCard className="w-4 h-4 mr-2 text-warning" />
              Contas em Aberto
            </h2>
            <span className="text-xs text-gray-500">{contasAbertas.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-dark-100">
            {contasAbertas.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">Nenhuma conta em aberto.</p>
            ) : contasAbertas
              .sort((a, b) => toDate(a.dataVencimento).getTime() - toDate(b.dataVencimento).getTime())
              .map((conta) => (
                <Link key={conta.id} href={`/financeiro/contas-pagar/${conta.id}`} className="block px-4 py-3 hover:bg-dark-400 transition-colors">
                  <p className="text-sm text-gray-100">{conta.descricao || `Conta ${conta.id.slice(0, 8)}`}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(conta.valor)} | Vence em {format(toDate(conta.dataVencimento), 'dd/MM/yyyy')}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 flex items-center">
              <FileCheck className="w-4 h-4 mr-2 text-brand" />
              Cotações da Obra
            </h2>
            <span className="text-xs text-gray-500">{cotacoes.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-dark-100">
            {cotacoes.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">Nenhuma cotação.</p>
            ) : cotacoes
              .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
              .map((cotacao) => (
                <Link key={cotacao.id} href={`/compras/cotacoes/${cotacao.id}/editar`} className="block px-4 py-3 hover:bg-dark-400 transition-colors">
                  <p className="text-sm text-gray-100">Cotação #{cotacao.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Status: {cotacao.status} | Menor preço: {formatCurrency(cotacao.menorPreco)}
                  </p>
                </Link>
              ))}
          </div>
        </section>

        <section className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 flex items-center">
              <ShoppingCart className="w-4 h-4 mr-2 text-brand" />
              Requisições da Obra
            </h2>
            <span className="text-xs text-gray-500">{requisicoes.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-dark-100">
            {requisicoes.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">Nenhuma requisição.</p>
            ) : requisicoes
              .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
              .map((requisicao) => (
                <Link key={requisicao.id} href={`/compras/requisicoes/${requisicao.id}`} className="block px-4 py-3 hover:bg-dark-400 transition-colors">
                  <p className="text-sm text-gray-100">Requisição #{requisicao.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {requisicao.itens.length} item(ns) | Status: {requisicao.status}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  )
}
