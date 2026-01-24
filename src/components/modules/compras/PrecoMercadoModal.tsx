'use client'

import { X, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'

interface PrecoMercado {
  descricao: string
  quantidade: number
  unidade?: string
  precoMedio: number
  precoMinimo: number
  precoMaximo: number
  fornecedoresEncontrados?: number
  observacoes?: string
}

interface PrecoMercadoModalProps {
  isOpen: boolean
  onClose: () => void
  precos: PrecoMercado[]
  precosFornecedores?: { [itemIndex: number]: number }
  itensSelecionados: number[]
}

export function PrecoMercadoModal({
  isOpen,
  onClose,
  precos,
  precosFornecedores = {},
  itensSelecionados
}: PrecoMercadoModalProps) {
  if (!isOpen) return null

  const getComparacao = (precoFornecedor: number, precoMedio: number) => {
    const diferenca = precoFornecedor - precoMedio
    const percentual = (diferenca / precoMedio) * 100
    
    if (percentual <= -5) {
      return { tipo: 'bom', icon: TrendingDown, cor: 'text-success', texto: `${Math.abs(percentual).toFixed(1)}% abaixo da média` }
    } else if (percentual >= 5) {
      return { tipo: 'ruim', icon: TrendingUp, cor: 'text-error', texto: `${percentual.toFixed(1)}% acima da média` }
    } else {
      return { tipo: 'medio', icon: Minus, cor: 'text-warning', texto: 'Próximo da média' }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-500 border border-dark-100 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-dark-100">
          <h2 className="text-xl font-bold text-brand">Preços de Mercado</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-400 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 flex-1">
          <div className="space-y-4">
            {precos.map((preco, index) => {
              const itemIndex = itensSelecionados[index]
              const precoFornecedor = precosFornecedores[itemIndex]
              const comparacao = precoFornecedor ? getComparacao(precoFornecedor, preco.precoMedio) : null
              const Icon = comparacao?.icon || AlertCircle
              
              return (
                <div
                  key={index}
                  className="border border-dark-100 rounded-lg p-4 bg-dark-400"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-100 mb-1">{preco.descricao}</h3>
                      <p className="text-sm text-gray-400">
                        Quantidade: {preco.quantidade} {preco.unidade ? `(${preco.unidade})` : ''}
                      </p>
                    </div>
                    {preco.fornecedoresEncontrados && (
                      <span className="text-xs text-gray-500 bg-dark-300 px-2 py-1 rounded">
                        {preco.fornecedoresEncontrados} fornecedores
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div className="bg-dark-300 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Mínimo</p>
                      <p className="text-sm font-semibold text-gray-200">
                        R$ {preco.precoMinimo.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-dark-300 rounded-lg p-3 border-2 border-brand">
                      <p className="text-xs text-gray-400 mb-1">Média de Mercado</p>
                      <p className="text-lg font-bold text-brand">
                        R$ {preco.precoMedio.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-dark-300 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Máximo</p>
                      <p className="text-sm font-semibold text-gray-200">
                        R$ {preco.precoMaximo.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {precoFornecedor && comparacao && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg bg-dark-300 ${comparacao.cor}`}>
                      <Icon className="w-4 h-4" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Preço do fornecedor: R$ {precoFornecedor.toFixed(2)}
                        </p>
                        <p className="text-xs opacity-80">{comparacao.texto}</p>
                      </div>
                    </div>
                  )}
                  
                  {preco.observacoes && (
                    <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {preco.observacoes}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="p-6 border-t border-dark-100 bg-dark-400">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <p>Os preços são estimativas baseadas em dados de mercado. Considere variações regionais e sazonais.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
