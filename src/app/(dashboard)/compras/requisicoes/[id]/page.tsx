'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Requisicao, Cotacao } from '@/types/compras'
import { getRequisicao } from '@/lib/db/requisicoes'
import { getCotacoes } from '@/lib/db/cotacoes'
import { getObra } from '@/lib/db/obras'
import { Obra } from '@/types/obra'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'
import Link from 'next/link'
import { ArrowLeft, Edit2, FileCheck, Plus, Eye } from 'lucide-react'

export default function RequisicaoDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const [requisicao, setRequisicao] = useState<Requisicao | null>(null)
  const [obra, setObra] = useState<Obra | null>(null)
  const [cotacao, setCotacao] = useState<Cotacao | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadRequisicao(params.id as string)
    }
  }, [params.id])

  const loadRequisicao = async (id: string) => {
    try {
      const data = await getRequisicao(id)
      if (data) {
        setRequisicao(data)
        const obraData = await getObra(data.obraId)
        setObra(obraData)
        const cotacoes = await getCotacoes({ requisicaoId: id })
        if (cotacoes.length > 0) {
          setCotacao(cotacoes[0])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar requisição:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  if (!requisicao) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Requisição não encontrada</p>
        <Link href="/compras/requisicoes" className="text-brand hover:text-brand-light">
          Voltar para Requisições
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Detalhes da Requisição</h1>
        <Link
          href="/compras/requisicoes"
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
                Requisição #{requisicao.id.slice(0, 8)}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Criada em {format(toDate(requisicao.createdAt), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              requisicao.status === 'entregue' ? 'bg-success/20 text-success' :
              requisicao.status === 'comprado' ? 'bg-blue-500/20 text-blue-400' :
              requisicao.status === 'aprovado' ? 'bg-warning/20 text-warning' :
              requisicao.status === 'em_cotacao' ? 'bg-purple-500/20 text-purple-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {requisicao.status}
            </span>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Obra</h3>
              <p className="text-sm text-gray-100">{obra ? obra.nome : requisicao.obraId}</p>
              {obra && <p className="text-xs text-gray-500 mt-1">{obra.endereco}</p>}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
              <p className="text-sm text-gray-100 capitalize">{requisicao.status.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Itens Solicitados</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-100">
                <thead className="bg-dark-400">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Quantidade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {requisicao.itens.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-100">{item.descricao}</td>
                      <td className="px-4 py-3 text-sm text-gray-100">{item.quantidade}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{item.info || item.unidade || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {requisicao.observacoes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Observações</h3>
              <p className="text-sm text-gray-100 whitespace-pre-wrap">{requisicao.observacoes}</p>
            </div>
          )}

          {cotacao && (
            <div className="mt-6 p-4 bg-brand/10 border border-brand/30 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-brand mb-1 flex items-center">
                    <FileCheck className="w-4 h-4 mr-1.5" />
                    Cotação Gerada
                  </h3>
                  <p className="text-xs text-gray-400">
                    Status: <span className="font-medium capitalize">{cotacao.status.replace('_', ' ')}</span>
                  </p>
                  {cotacao.menorPreco > 0 && (
                    <p className="text-xs text-success mt-1">
                      Menor preço: <span className="font-bold">R$ {cotacao.menorPreco.toFixed(2).replace('.', ',')}</span>
                      {' '}(Fornecedor {cotacao.fornecedorMenorPreco})
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/compras/cotacoes" className="flex items-center px-3 py-2 bg-brand text-dark-800 font-medium rounded-lg text-sm">
                    <Eye className="w-4 h-4 mr-1.5" />
                    Ver Cotação
                  </Link>
                  <Link href={`/compras/cotacoes/${cotacao.id}/editar`} className="flex items-center px-3 py-2 bg-dark-400 text-gray-300 rounded-lg text-sm hover:text-brand">
                    <Edit2 className="w-4 h-4 mr-1.5" />
                    Editar
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-dark-100">
            <div className="flex flex-wrap justify-end gap-3">
              <Link href="/compras/requisicoes" className="px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors">
                Voltar
              </Link>
              <Link href={`/compras/requisicoes/${requisicao.id}/editar`} className="flex items-center px-4 py-2 bg-brand text-dark-800 font-medium rounded-lg">
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Link>
              {!cotacao && requisicao.status === 'pendente' && (
                <Link href={`/compras/cotacoes/nova?requisicaoId=${requisicao.id}`} className="flex items-center px-4 py-2 bg-success text-dark-800 font-medium rounded-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Cotação
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
