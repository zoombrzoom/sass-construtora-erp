'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ContaPagar } from '@/types/financeiro'
import { getContaPagar } from '@/lib/db/contasPagar'
import { getObra } from '@/lib/db/obras'
import { Obra } from '@/types/obra'
import { format } from 'date-fns'
import Link from 'next/link'
import { toDate } from '@/utils/date'
import { ArrowLeft, Edit2, ExternalLink } from 'lucide-react'

export default function ContaPagarDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const [conta, setConta] = useState<ContaPagar | null>(null)
  const [obra, setObra] = useState<Obra | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadConta(params.id as string)
    }
  }, [params.id])

  const loadConta = async (id: string) => {
    try {
      const data = await getContaPagar(id)
      if (data) {
        setConta(data)
        const obraData = await getObra(data.obraId)
        setObra(obraData)
      }
    } catch (error) {
      console.error('Erro ao carregar conta:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!conta) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Conta não encontrada</p>
        <Link href="/financeiro/contas-pagar" className="text-brand hover:text-brand-light">
          Voltar para Contas a Pagar
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Detalhes da Conta a Pagar</h1>
        <Link
          href="/financeiro/contas-pagar"
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
              <h2 className="text-lg sm:text-xl font-semibold text-gray-100">
                Conta #{conta.id.slice(0, 8)}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Criada em {format(toDate(conta.createdAt), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              conta.status === 'pago' ? 'bg-success/20 text-success' :
              conta.status === 'vencido' ? 'bg-error/20 text-error' :
              'bg-warning/20 text-warning'
            }`}>
              {conta.status}
            </span>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Valor</h3>
              <p className="text-2xl font-bold text-brand">{formatCurrency(conta.valor)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Tipo</h3>
              <p className="text-sm text-gray-100 capitalize">{conta.tipo}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Data de Vencimento</h3>
              <p className="text-sm text-gray-100">{format(toDate(conta.dataVencimento), 'dd/MM/yyyy')}</p>
            </div>
            {conta.dataPagamento && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Data de Pagamento</h3>
                <p className="text-sm text-gray-100">{format(toDate(conta.dataPagamento), 'dd/MM/yyyy')}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Obra (Centro de Custo)</h3>
              <p className="text-sm text-gray-100">{obra ? obra.nome : conta.obraId}</p>
              {obra && <p className="text-xs text-gray-500 mt-1">{obra.endereco}</p>}
            </div>
            {conta.descricao && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Descrição</h3>
                <p className="text-sm text-gray-100 whitespace-pre-wrap">{conta.descricao}</p>
              </div>
            )}
            {conta.rateio && conta.rateio.length > 0 && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Rateio</h3>
                <div className="space-y-2">
                  {conta.rateio.map((rateio, index) => (
                    <div key={index} className="text-sm text-gray-100">
                      {rateio.percentual}% - Obra ID: {rateio.obraId}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {conta.comprovanteUrl && (
            <div className="mt-6 pt-6 border-t border-dark-100">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Comprovante/Nota Fiscal</h3>
              <div className="relative w-full max-w-md">
                <a href={conta.comprovanteUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={conta.comprovanteUrl} alt="Comprovante" className="w-full h-auto rounded-lg border border-dark-100 hover:opacity-90 transition-opacity" />
                </a>
                <a href={conta.comprovanteUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-brand hover:text-brand-light text-sm">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Abrir em nova aba
                </a>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-dark-100">
            <div className="flex flex-wrap justify-end gap-3">
              <Link href="/financeiro/contas-pagar" className="px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors">
                Voltar
              </Link>
              <Link href={`/financeiro/contas-pagar/${conta.id}/editar`} className="flex items-center px-4 py-2 bg-brand text-dark-800 font-medium rounded-lg">
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
