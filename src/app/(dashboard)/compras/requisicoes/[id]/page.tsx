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
        // Carregar dados da obra
        const obraData = await getObra(data.obraId)
        setObra(obraData)
        // Carregar cotação relacionada
        const cotacoes = await getCotacoes({ requisicaoId: id })
        if (cotacoes.length > 0) {
          setCotacao(cotacoes[0]) // Pegar a primeira cotação
        }
      }
    } catch (error) {
      console.error('Erro ao carregar requisição:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  if (!requisicao) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Requisição não encontrada</p>
          <Link
            href="/compras/requisicoes"
            className="text-blue-600 hover:text-blue-800"
          >
            Voltar para Requisições
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Detalhes da Requisição</h1>
        <Link
          href="/compras/requisicoes"
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Voltar
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Requisição #{requisicao.id.slice(0, 8)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Criada em {format(toDate(requisicao.createdAt), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded ${
              requisicao.status === 'entregue' ? 'bg-green-100 text-green-800' :
              requisicao.status === 'comprado' ? 'bg-blue-100 text-blue-800' :
              requisicao.status === 'aprovado' ? 'bg-yellow-100 text-yellow-800' :
              requisicao.status === 'em_cotacao' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {requisicao.status}
            </span>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Obra</h3>
              <p className="text-sm text-gray-900">
                {obra ? obra.nome : requisicao.obraId}
              </p>
              {obra && (
                <p className="text-xs text-gray-500 mt-1">
                  {obra.endereco}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
              <p className="text-sm text-gray-900 capitalize">
                {requisicao.status.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Itens Solicitados</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Info
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requisicao.itens.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.descricao}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.quantidade}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.info || item.unidade || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {requisicao.observacoes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Observações</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {requisicao.observacoes}
              </p>
            </div>
          )}

          {cotacao && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-900 mb-1">
                    ✅ Cotação Gerada
                  </h3>
                  <p className="text-xs text-blue-700">
                    Status: <span className="font-medium capitalize">{cotacao.status.replace('_', ' ')}</span>
                    {cotacao.status === 'pendente' && ' - Aguardando aprovação'}
                    {cotacao.status === 'aprovado' && ' - Pronta para gerar pedido'}
                  </p>
                  {cotacao.menorPreco > 0 && (
                    <p className="text-xs text-blue-700 mt-1">
                      Menor preço: <span className="font-bold">R$ {cotacao.menorPreco.toFixed(2).replace('.', ',')}</span>
                      {' '}(Fornecedor {cotacao.fornecedorMenorPreco})
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Link
                    href="/compras/cotacoes"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Ver e Aprovar Cotação
                  </Link>
                  <Link
                    href={`/compras/cotacoes/${cotacao.id}/editar`}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                  >
                    Editar Cotação
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <Link
                href="/compras/requisicoes"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </Link>
              <Link
                href={`/compras/requisicoes/${requisicao.id}/editar`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Editar Requisição
              </Link>
              {cotacao ? (
                <>
                  <Link
                    href={`/compras/cotacoes/${cotacao.id}/editar`}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Editar Cotação
                  </Link>
                  <Link
                    href="/compras/cotacoes"
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Ver Cotação
                  </Link>
                </>
              ) : requisicao.status === 'pendente' && (
                <Link
                  href={`/compras/cotacoes/nova?requisicaoId=${requisicao.id}`}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
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
