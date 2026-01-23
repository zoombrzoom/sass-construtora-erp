'use client'

import { useEffect, useState } from 'react'
import { Requisicao, Cotacao } from '@/types/compras'
import { getRequisicoes, deleteRequisicao } from '@/lib/db/requisicoes'
import { getCotacoes } from '@/lib/db/cotacoes'
import Link from 'next/link'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'

export default function RequisicoesPage() {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([])
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRequisicoes()
    loadCotacoes()
  }, [])

  const loadRequisicoes = async () => {
    try {
      const data = await getRequisicoes()
      setRequisicoes(data)
    } catch (error) {
      console.error('Erro ao carregar requisições:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCotacoes = async () => {
    try {
      const data = await getCotacoes()
      setCotacoes(data)
    } catch (error) {
      console.error('Erro ao carregar cotações:', error)
    }
  }

  const getCotacaoByRequisicao = (requisicaoId: string): Cotacao | null => {
    return cotacoes.find(c => c.requisicaoId === requisicaoId) || null
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta requisição?')) return

    try {
      await deleteRequisicao(id)
      loadRequisicoes()
    } catch (error) {
      console.error('Erro ao excluir requisição:', error)
      alert('Erro ao excluir requisição')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Requisições de Compras</h1>
        <Link
          href="/compras/requisicoes/nova"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Nova Requisição
        </Link>
      </div>

      {requisicoes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhuma requisição cadastrada
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {requisicoes.map((requisicao) => {
              const cotacao = getCotacaoByRequisicao(requisicao.id)
              return (
                <li key={requisicao.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            Obra ID: {requisicao.obraId}
                          </p>
                          <span className={`ml-2 px-2 py-1 text-xs rounded ${
                            requisicao.status === 'entregue' ? 'bg-green-100 text-green-800' :
                            requisicao.status === 'comprado' ? 'bg-blue-100 text-blue-800' :
                            requisicao.status === 'aprovado' ? 'bg-yellow-100 text-yellow-800' :
                            requisicao.status === 'em_cotacao' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {requisicao.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {requisicao.itens.length} item(ns) | Criada em {format(toDate(requisicao.createdAt), 'dd/MM/yyyy')}
                        </p>
                        {cotacao && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            <span className="text-blue-700 font-medium">📋 Cotação gerada</span>
                            {' '}
                            <span className="text-blue-600">
                              (Status: {cotacao.status === 'pendente' ? 'Aguardando aprovação' : cotacao.status})
                            </span>
                            {cotacao.menorPreco > 0 && (
                              <span className="text-blue-600 ml-2">
                                • Menor preço: R$ {cotacao.menorPreco.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex flex-col items-end space-y-2">
                        <div className="flex space-x-2">
                          <Link
                            href={`/compras/requisicoes/${requisicao.id}`}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Ver Detalhes
                          </Link>
                          <Link
                            href={`/compras/requisicoes/${requisicao.id}/editar`}
                            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => handleDelete(requisicao.id)}
                            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Deletar
                          </button>
                        </div>
                        {cotacao && (
                          <Link
                            href="/compras/cotacoes"
                            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            Ver e Aprovar Cotação →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
