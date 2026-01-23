'use client'

import { useState } from 'react'
import { Cotacao } from '@/types/compras'
import { updateCotacao, deleteCotacao } from '@/lib/db/cotacoes'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit2, Trash2, Check, CheckCircle } from 'lucide-react'

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
    
    const fornecedor = fornecedorRaw as any
    const nome = fornecedor.nome || ''
    const cnpj = fornecedor.cnpj
    
    let preco = 0
    if (fornecedor.preco !== undefined && typeof fornecedor.preco === 'number') {
      preco = fornecedor.preco
    } else if (fornecedor.precosPorItem && cotacao.itensSelecionados) {
      preco = cotacao.itensSelecionados.reduce((sum, itemIndex) => 
        sum + (fornecedor.precosPorItem[itemIndex] || 0), 0
      )
    } else {
      preco = cotacao.menorPreco || 0
    }
    
    return { fornecedor: { nome, cnpj, preco }, isMenor }
  }

  return (
    <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-100">{cotacao.item}</h3>
          <p className="text-sm text-gray-400">Requisição: {cotacao.requisicaoId.slice(0, 8)}...</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          cotacao.status === 'aprovado' ? 'bg-success/20 text-success' :
          cotacao.status === 'rejeitado' ? 'bg-error/20 text-error' :
          'bg-warning/20 text-warning'
        }`}>
          {cotacao.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
        {(['A', 'B', 'C'] as const).map((letra) => {
          const { fornecedor, isMenor } = getFornecedorData(letra)
          const isSelecionado = fornecedorSelecionado === letra
          const temPreco = fornecedor.preco > 0
          
          return (
            <div
              key={letra}
              className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                isSelecionado 
                  ? 'border-brand bg-brand/10 shadow-md' 
                  : isMenor 
                    ? 'border-success bg-success/10 hover:border-success/70' 
                    : 'border-dark-100 bg-dark-400 hover:border-gray-500'
              }`}
              onClick={() => temPreco && handleSelectFornecedor(letra)}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-200">Fornecedor {letra}</span>
                <div className="flex items-center space-x-1">
                  {isMenor && (
                    <span className="text-xs bg-success text-dark-800 px-2 py-0.5 rounded font-medium">
                      Menor
                    </span>
                  )}
                  {isSelecionado && (
                    <span className="text-xs bg-brand text-dark-800 px-2 py-0.5 rounded font-medium flex items-center">
                      <Check className="w-3 h-3 mr-0.5" />
                      Selecionado
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-400">{fornecedor.nome || 'Não informado'}</p>
              {temPreco ? (
                <p className={`text-lg font-bold ${isSelecionado ? 'text-brand' : isMenor ? 'text-success' : 'text-gray-100'}`}>
                  R$ {fornecedor.preco.toFixed(2).replace('.', ',')}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">Sem preço informado</p>
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
                  className={`mt-2 w-full py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    isSelecionado
                      ? 'bg-brand text-dark-800'
                      : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                  }`}
                >
                  {isSelecionado ? 'Selecionado' : 'Selecionar'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      
      {cotacao.status === 'pendente' && fornecedorSelecionado && (
        <div className="mb-4 p-3 bg-brand/10 border border-brand/30 rounded-lg">
          <p className="text-sm text-gray-200">
            <strong className="text-brand">Fornecedor selecionado:</strong> {fornecedorSelecionado}
            {fornecedorSelecionado !== cotacao.fornecedorMenorPreco && (
              <span className="ml-2 text-warning">
                (Não é o menor preço - Menor preço: Fornecedor {cotacao.fornecedorMenorPreco})
              </span>
            )}
          </p>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-dark-100">
        <Link
          href={`/compras/cotacoes/${cotacao.id}/editar`}
          className="flex items-center px-3 py-2 bg-dark-400 text-gray-300 rounded-lg hover:bg-dark-300 hover:text-brand text-sm transition-colors"
        >
          <Edit2 className="w-4 h-4 mr-1.5" />
          Editar
        </Link>
        <button
          onClick={handleDelete}
          className="flex items-center px-3 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 text-sm transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Deletar
        </button>
        {cotacao.status === 'pendente' && permissions && (
          <button
            onClick={handleApprove}
            className="flex items-center px-3 py-2 bg-success text-dark-800 font-medium rounded-lg hover:bg-success/80 text-sm transition-colors"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Aprovar
          </button>
        )}
      </div>
    </div>
  )
}
