'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ContaPagar } from '@/types/financeiro'
import { getContaPagar } from '@/lib/db/contasPagar'
import { getObra } from '@/lib/db/obras'
import { Obra } from '@/types/obra'
import { format } from 'date-fns'
import Link from 'next/link'
import { toDate } from '@/utils/date'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'
import { ArrowLeft, Edit2, ExternalLink, Copy } from 'lucide-react'

export default function ContaPagarDetalhesPage() {
  const params = useParams()
  const { user } = useAuth()
  const permissions = getPermissions(user)
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

  const getParcelaTexto = (target: ContaPagar) => {
    const total = Math.max(1, target.totalParcelas || 1)
    const atual = Math.min(Math.max(1, target.parcelaAtual || 1), total)
    return `${atual}/${total}`
  }

  const formatMonthLabel = (value: string) => {
    if (!value || !value.includes('-')) return value
    const [year, month] = value.split('-')
    return `${month}/${year}`
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      alert('Copiado!')
    } catch {
      alert('Não foi possível copiar')
    }
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

  if (conta.tipo === 'particular' && !permissions.canAccessContasParticulares) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Você não tem acesso a contas particulares.</p>
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
                Conta #{conta.id.slice(0, 8)} {(conta.totalParcelas || 1) > 1 ? `| Parcela ${getParcelaTexto(conta)}` : ''}
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
              <h3 className="text-sm font-medium text-gray-400 mb-2">Parcela</h3>
              <p className="text-sm text-gray-100">
                {getParcelaTexto(conta)}
                {conta.recorrenciaMensal ? ' | Recorrência mensal' : ''}
              </p>
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

            {(conta.favorecido || conta.contaPagamento || conta.formaPagamento || conta.banco || conta.agencia || conta.conta || conta.chavePix) && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Dados de Pagamento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Contato</p>
                    <p className="text-sm text-gray-100">{conta.favorecido || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Conta</p>
                    <p className="text-sm text-gray-100">{conta.contaPagamento || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Forma</p>
                    <p className="text-sm text-gray-100">{conta.formaPagamento || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Banco</p>
                    <p className="text-sm text-gray-100">{conta.banco || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Agência</p>
                    <p className="text-sm text-gray-100">{conta.agencia || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Conta do favorecido</p>
                    <p className="text-sm text-gray-100">{conta.conta || '-'}</p>
                  </div>
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3 sm:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Chave PIX</p>
                    <p className="text-sm text-gray-100 break-all">{conta.chavePix || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(conta.linhaDigitavel || conta.codigoBarras || conta.boletoUrl) && (
            <div className="mt-6 pt-6 border-t border-dark-100">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Boleto e Códigos</h3>
              <div className="space-y-3">
                {conta.boletoUrl && (
                  <a
                    href={conta.boletoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-brand hover:text-brand-light text-sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Abrir boleto
                  </a>
                )}

                {conta.linhaDigitavel && (
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Linha Digitável</p>
                    <p className="text-sm text-gray-100 break-all">{conta.linhaDigitavel}</p>
                    <button
                      onClick={() => handleCopy(conta.linhaDigitavel!)}
                      className="mt-2 inline-flex items-center text-xs text-brand hover:text-brand-light"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copiar linha
                    </button>
                  </div>
                )}

                {conta.codigoBarras && (
                  <div className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Código de Barras</p>
                    <p className="text-sm text-gray-100 break-all">{conta.codigoBarras}</p>
                    <button
                      onClick={() => handleCopy(conta.codigoBarras!)}
                      className="mt-2 inline-flex items-center text-xs text-brand hover:text-brand-light"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copiar código
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {conta.comprovanteUrl && (
            <div className="mt-6 pt-6 border-t border-dark-100">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Comprovante</h3>
              <a
                href={conta.comprovanteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-brand hover:text-brand-light text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Abrir comprovante
              </a>
            </div>
          )}

          {conta.comprovantesMensais && conta.comprovantesMensais.length > 0 && (
            <div className="mt-6 pt-6 border-t border-dark-100">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Comprovantes mensais</h3>
              <div className="space-y-2">
                {conta.comprovantesMensais.map((item, index) => (
                  <div key={`${item.mesReferencia}-${item.parcela}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-dark-100 bg-dark-400 p-3">
                    <p className="text-sm text-gray-100">
                      Parcela {item.parcela}/{Math.max(1, conta.totalParcelas || 1)} | Mês {formatMonthLabel(item.mesReferencia)}
                    </p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-brand hover:text-brand-light"
                    >
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                      Abrir comprovante
                    </a>
                  </div>
                ))}
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
