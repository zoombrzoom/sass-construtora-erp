'use client'

import { useState } from 'react'
import { Cotacao } from '@/types/compras'
import { updateCotacao, deleteCotacao } from '@/lib/db/cotacoes'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CotacaoCardProps {
  cotacao: Cotacao
  onUpdate?: () => void
}

export function CotacaoCard({ cotacao, onUpdate }: CotacaoCardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const permissions = user?.role === 'admin' || user?.role === 'financeiro'
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string>(
    cotacao.fornecedorSelecionado || cotacao.fornecedorMenorPreco || 'A'
  )

  const handleSelectFornecedor = async (letra: string) => {
    try {
      await updateCotacao(cotacao.id, {
        fornecedorSelecionado: letra,
      })
      setFornecedorSelecionado(letra)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Erro ao selecionar fornecedor:', error)
      alert('Erro ao selecionar fornecedor')
    }
  }

  const handleApprove = async () => {
    if (!fornecedorSelecionado) {
      alert('Selecione um fornecedor antes de aprovar')
      return
    }

    if (!confirm(`Deseja aprovar esta cotação com o Fornecedor ${fornecedorSelecionado}?`)) return

    try {
      await updateCotacao(cotacao.id, {
        status: 'aprovado',
        fornecedorSelecionado: fornecedorSelecionado,
        aprovadoPor: user?.id,
        aprovadoEm: new Date(),
      })
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Erro ao aprovar cotação:', error)
      alert('Erro ao aprovar cotação')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta cotação?')) return

    try {
      await deleteCotacao(cotacao.id)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Erro ao deletar cotação:', error)
      alert('Erro ao deletar cotação')
    }
  }

  const getFornecedorData = (letra: 'A' | 'B' | 'C') => {
    const fornecedorRaw = 
      letra === 'A' ? cotacao.fornecedorA :
      letra === 'B' ? cotacao.fornecedorB :
      cotacao.fornecedorC
    
    const isMenor = cotacao.fornecedorMenorPreco === letra
    
    // Verificar se é estrutura antiga (com preco direto) ou nova (com precosPorItem)
    const fornecedor = fornecedorRaw as any
    const nome = fornecedor.nome || ''
    const cnpj = fornecedor.cnpj
    
    let preco = 0
    if (fornecedor.preco !== undefined && typeof fornecedor.preco === 'number') {
      // Estrutura antiga: preço direto
      preco = fornecedor.preco
    } else if (fornecedor.precosPorItem && cotacao.itensSelecionados) {
      // Estrutura nova: calcular soma dos preços dos itens selecionados
      preco = cotacao.itensSelecionados.reduce((sum, itemIndex) => 
        sum + (fornecedor.precosPorItem[itemIndex] || 0), 0
      )
    } else {
      // Fallback: usar menorPreco se disponível
      preco = cotacao.menorPreco || 0
    }
    
    return { fornecedor: { nome, cnpj, preco }, isMenor }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{cotacao.item}</h3>
          <p className="text-sm text-gray-500">Requisição: {cotacao.requisicaoId}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded ${
          cotacao.status === 'aprovado' ? 'bg-green-100 text-green-800' :
          cotacao.status === 'rejeitado' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {cotacao.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {(['A', 'B', 'C'] as const).map((letra) => {
          const { fornecedor, isMenor } = getFornecedorData(letra)
          const isSelecionado = fornecedorSelecionado === letra
          const temPreco = fornecedor.preco > 0
          
          return (
            <div
              key={letra}
              className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                isSelecionado 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : isMenor 
                    ? 'border-green-500 bg-green-50 hover:border-green-600' 
                    : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => temPreco && handleSelectFornecedor(letra)}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Fornecedor {letra}</span>
                <div className="flex items-center space-x-1">
                  {isMenor && (
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                      Menor Preço
                    </span>
                  )}
                  {isSelecionado && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                      ✓ Selecionado
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">{fornecedor.nome || 'Não informado'}</p>
              {temPreco ? (
                <p className={`text-lg font-bold ${isSelecionado ? 'text-blue-600' : isMenor ? 'text-green-600' : 'text-gray-900'}`}>
                  R$ {fornecedor.preco.toFixed(2).replace('.', ',')}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Sem preço informado</p>
              )}
              {fornecedor.cnpj && (
                <p className="text-xs text-gray-500 mt-1">CNPJ: {fornecedor.cnpj}</p>
              )}
              {cotacao.status === 'pendente' && temPreco && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectFornecedor(letra)
                  }}
                  className={`mt-2 w-full py-1.5 text-xs rounded-md ${
                    isSelecionado
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {isSelecionado ? '✓ Selecionado' : 'Selecionar'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      
      {cotacao.status === 'pendente' && fornecedorSelecionado && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Fornecedor selecionado:</strong> {fornecedorSelecionado}
            {fornecedorSelecionado !== cotacao.fornecedorMenorPreco && (
              <span className="ml-2 text-orange-600">
                (Não é o menor preço - Menor preço: Fornecedor {cotacao.fornecedorMenorPreco})
              </span>
            )}
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
        <Link
          href={`/compras/cotacoes/${cotacao.id}/editar`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Editar
        </Link>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          Deletar
        </button>
        {cotacao.status === 'pendente' && permissions && (
          <button
            onClick={handleApprove}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Aprovar
          </button>
        )}
      </div>
    </div>
  )
}
