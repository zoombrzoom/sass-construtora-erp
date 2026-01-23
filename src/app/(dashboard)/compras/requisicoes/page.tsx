'use client'

import { useEffect, useState } from 'react'
import { Requisicao, Cotacao } from '@/types/compras'
import { getRequisicoes, deleteRequisicao } from '@/lib/db/requisicoes'
import { getCotacoes } from '@/lib/db/cotacoes'
import Link from 'next/link'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'
import { Plus, Eye, Edit2, Trash2, FileCheck, ShoppingCart } from 'lucide-react'

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
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Requisições de Compras</h1>
        <Link
          href="/compras/requisicoes/nova"
          className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Requisição
        </Link>
      </div>

      {requisicoes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          Nenhuma requisição cadastrada
        </div>
      ) : (
        <div className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
          <ul className="divide-y divide-dark-100">
            {requisicoes.map((requisicao) => {
              const cotacao = getCotacaoByRequisicao(requisicao.id)
              return (
                <li key={requisicao.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <p className="text-sm font-medium text-gray-100">
                            Obra ID: {requisicao.obraId.slice(0, 8)}...
                          </p>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            requisicao.status === 'entregue' ? 'bg-success/20 text-success' :
                            requisicao.status === 'comprado' ? 'bg-blue-500/20 text-blue-400' :
                            requisicao.status === 'aprovado' ? 'bg-warning/20 text-warning' :
                            requisicao.status === 'em_cotacao' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {requisicao.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-400">
                          {requisicao.itens.length} item(ns) | Criada em {format(toDate(requisicao.createdAt), 'dd/MM/yyyy')}
                        </p>
                        {cotacao && (
                          <div className="mt-2 p-2.5 bg-brand/10 border border-brand/30 rounded-lg text-xs">
                            <span className="text-brand font-medium flex items-center">
                              <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                              Cotação gerada
                            </span>
                            <span className="text-gray-400 block mt-1">
                              Status: {cotacao.status === 'pendente' ? 'Aguardando aprovação' : cotacao.status}
                            </span>
                            {cotacao.menorPreco > 0 && (
                              <span className="text-success block mt-1">
                                Menor preço: R$ {cotacao.menorPreco.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/compras/requisicoes/${requisicao.id}`}
                          className="flex items-center px-3 py-2 text-sm bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Detalhes
                        </Link>
                        <Link
                          href={`/compras/requisicoes/${requisicao.id}/editar`}
                          className="flex items-center px-3 py-2 text-sm bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand transition-colors"
                        >
                          <Edit2 className="w-4 h-4 mr-1.5" />
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDelete(requisicao.id)}
                          className="flex items-center px-3 py-2 text-sm bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Deletar
                        </button>
                        {cotacao && (
                          <Link
                            href="/compras/cotacoes"
                            className="flex items-center px-3 py-2 text-sm bg-brand text-dark-800 font-medium rounded-lg hover:bg-brand-light transition-colors"
                          >
                            Ver Cotação →
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
