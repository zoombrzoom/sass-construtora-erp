'use client'

import { useState, useEffect } from 'react'
import { Cotacao, FornecedorCotacaoItem, RequisicaoItem } from '@/types/compras'
import { createCotacao, updateCotacao } from '@/lib/db/cotacoes'
import { getRequisicoes, getRequisicao } from '@/lib/db/requisicoes'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Requisicao } from '@/types/compras'
import { AlertCircle, Save, ArrowLeft, Plus, X, Sparkles, Loader2 } from 'lucide-react'
import { PrecoMercadoModal } from './PrecoMercadoModal'

interface CotacaoFormProps {
  cotacao?: Cotacao
  onSuccess?: () => void
  initialRequisicaoId?: string
}

export function CotacaoForm({ cotacao, onSuccess, initialRequisicaoId }: CotacaoFormProps) {
  const [requisicaoId, setRequisicaoId] = useState(cotacao?.requisicaoId || initialRequisicaoId || '')
  const [requisicao, setRequisicao] = useState<Requisicao | null>(null)
  const [itensSelecionados, setItensSelecionados] = useState<number[]>(cotacao?.itensSelecionados || [])
  
  const getFornecedoresIniciais = (): FornecedorCotacaoItem[] => {
    if (!cotacao) {
      return [
        { nome: '', precosPorItem: {} },
        { nome: '', precosPorItem: {} },
        { nome: '', precosPorItem: {} }
      ]
    }
    
    const fornecedorA = cotacao.fornecedorA as any
    const fornecedorB = cotacao.fornecedorB as any
    const fornecedorC = cotacao.fornecedorC as any
    
    if (fornecedorA.preco !== undefined && typeof fornecedorA.preco === 'number') {
      return [
        { nome: fornecedorA.nome || '', cnpj: fornecedorA.cnpj, precosPorItem: {} },
        { nome: fornecedorB.nome || '', cnpj: fornecedorB.cnpj, precosPorItem: {} },
        { nome: fornecedorC.nome || '', cnpj: fornecedorC.cnpj, precosPorItem: {} }
      ]
    }
    
    return [
      fornecedorA as FornecedorCotacaoItem,
      fornecedorB as FornecedorCotacaoItem,
      fornecedorC as FornecedorCotacaoItem
    ]
  }
  
  const [fornecedores, setFornecedores] = useState<FornecedorCotacaoItem[]>(getFornecedoresIniciais())
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [precosMercado, setPrecosMercado] = useState<any[]>([])
  const [mostrarModalPrecos, setMostrarModalPrecos] = useState(false)
  const [buscandoPrecos, setBuscandoPrecos] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadRequisicoes()
    if (cotacao?.requisicaoId) {
      loadRequisicao(cotacao.requisicaoId)
    }
  }, [])

  useEffect(() => {
    if (requisicaoId && requisicoes.length > 0) {
      const req = requisicoes.find(r => r.id === requisicaoId)
      if (req) {
        setRequisicao(req)
        if (itensSelecionados.length === 0) {
          setItensSelecionados(req.itens.map((_, index) => index))
        }
      }
    } else if (requisicaoId && !requisicao) {
      loadRequisicao(requisicaoId)
    }
  }, [requisicaoId, requisicoes])

  const loadRequisicoes = async () => {
    try {
      const data = await getRequisicoes()
      setRequisicoes(data.filter(req => req.status === 'pendente' || req.status === 'em_cotacao'))
    } catch (error) {
      console.error('Erro ao carregar requisições:', error)
    }
  }

  const loadRequisicao = async (id: string) => {
    try {
      const data = await getRequisicao(id)
      if (data) {
        setRequisicao(data)
        if (itensSelecionados.length === 0) {
          setItensSelecionados(data.itens.map((_, index) => index))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar requisição:', error)
    }
  }

  const toggleItem = (index: number) => {
    if (itensSelecionados.includes(index)) {
      setItensSelecionados(itensSelecionados.filter(i => i !== index))
      setFornecedores(fornecedores.map(f => {
        const novosPrecos = { ...f.precosPorItem }
        delete novosPrecos[index]
        return { ...f, precosPorItem: novosPrecos }
      }))
    } else {
      setItensSelecionados([...itensSelecionados, index])
    }
  }

  const addFornecedor = () => {
    setFornecedores([...fornecedores, { nome: '', precosPorItem: {} }])
  }

  const removeFornecedor = (index: number) => {
    if (fornecedores.length > 1) {
      setFornecedores(fornecedores.filter((_, i) => i !== index))
    }
  }

  const updateFornecedor = (index: number, field: 'nome' | 'cnpj', value: string) => {
    const updated = [...fornecedores]
    updated[index] = { ...updated[index], [field]: value }
    setFornecedores(updated)
  }

  const updatePrecoItem = (fornecedorIndex: number, itemIndex: number, preco: number) => {
    const updated = [...fornecedores]
    const novosPrecos = { ...updated[fornecedorIndex].precosPorItem }
    if (preco > 0) {
      novosPrecos[itemIndex] = preco
    } else {
      delete novosPrecos[itemIndex]
    }
    updated[fornecedorIndex] = { ...updated[fornecedorIndex], precosPorItem: novosPrecos }
    setFornecedores(updated)
  }

  const buscarPrecosMercado = async (itemIndex?: number) => {
    if (!requisicao) return

    setBuscandoPrecos(true)
    setError('')

    try {
      const itensParaBuscar = itemIndex !== undefined
        ? [requisicao.itens[itemIndex]]
        : requisicao.itens.filter((_, index) => itensSelecionados.includes(index))

      const response = await fetch('/api/cotacao/buscar-precos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itens: itensParaBuscar,
          regiao: 'Brasil' // Pode ser configurável no futuro
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar preços de mercado')
      }

      const data = await response.json()
      setPrecosMercado(data.precos)
      setMostrarModalPrecos(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar preços de mercado')
    } finally {
      setBuscandoPrecos(false)
    }
  }

  const getPrecosFornecedores = () => {
    const precos: { [itemIndex: number]: number } = {}
    fornecedores.forEach(fornecedor => {
      Object.entries(fornecedor.precosPorItem).forEach(([itemIndex, preco]) => {
        const index = parseInt(itemIndex)
        if (!precos[index] || preco < precos[index]) {
          precos[index] = preco
        }
      })
    })
    return precos
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!requisicaoId || !requisicao) {
      setError('Selecione uma requisição')
      return
    }

    if (itensSelecionados.length === 0) {
      setError('Selecione pelo menos um item para cotar')
      return
    }

    if (fornecedores.length === 0) {
      setError('Adicione pelo menos um fornecedor')
      return
    }

    const fornecedoresSemNome = fornecedores.some(f => !f.nome || f.nome.trim() === '')
    if (fornecedoresSemNome) {
      setError('Preencha o nome de todos os fornecedores')
      return
    }

    const temPreco = fornecedores.some(f => 
      itensSelecionados.some(itemIndex => f.precosPorItem[itemIndex] && f.precosPorItem[itemIndex] > 0)
    )
    if (!temPreco) {
      setError('Informe pelo menos um preço para pelo menos um item')
      return
    }

    setLoading(true)

    try {
      const itemString = requisicao.itens
        .filter((_, index) => itensSelecionados.includes(index))
        .map(i => {
          const info = i.info || i.unidade || ''
          return `${i.descricao} (${i.quantidade}${info ? ` - ${info}` : ''})`
        })
        .join(', ')

      const fornecedorA = fornecedores[0] || { nome: '', precosPorItem: {} }
      const fornecedorB = fornecedores[1] || { nome: '', precosPorItem: {} }
      const fornecedorC = fornecedores[2] || { nome: '', precosPorItem: {} }

      const data: any = {
        requisicaoId,
        item: itemString,
        itensSelecionados,
        fornecedorA,
        fornecedorB,
        fornecedorC,
        status: cotacao?.status || 'pendente',
      }

      if (cotacao) {
        await updateCotacao(cotacao.id, data)
      } else {
        await createCotacao(data)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/compras/cotacoes')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cotação')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
  const labelClass = "block text-sm font-medium text-gray-300 mb-1"

  if (!requisicao && requisicaoId) {
    return <div className="text-center py-4 text-gray-400">Carregando requisição...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-error/20 border border-error/30 text-error px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label htmlFor="requisicaoId" className={labelClass}>Requisição *</label>
        <select
          id="requisicaoId"
          required
          value={requisicaoId}
          onChange={(e) => {
            setRequisicaoId(e.target.value)
            setRequisicao(null)
            setItensSelecionados([])
          }}
          className={`${inputClass} min-h-touch`}
        >
          <option value="">Selecione uma requisição</option>
          {requisicoes.map((req) => (
            <option key={req.id} value={req.id}>
              Requisição {req.id.slice(0, 8)} - {req.itens.length} item(ns)
            </option>
          ))}
        </select>
      </div>

      {requisicao && requisicao.itens.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className={labelClass}>Itens para Cotar *</label>
            {itensSelecionados.length > 0 && (
              <button
                type="button"
                onClick={() => buscarPrecosMercado()}
                disabled={buscandoPrecos}
                className="flex items-center px-3 py-1.5 text-sm bg-brand text-dark-800 font-medium rounded-lg hover:bg-brand-light disabled:opacity-50 transition-colors"
              >
                {buscandoPrecos ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Buscar Preços (IA)
                  </>
                )}
              </button>
            )}
          </div>
          <div className="space-y-2 border border-dark-100 rounded-lg p-4 bg-dark-400">
            {requisicao.itens.map((item, index) => (
              <div key={index} className="flex items-center justify-between hover:bg-dark-300 p-2 rounded-lg transition-colors">
                <label className="flex items-center space-x-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={itensSelecionados.includes(index)}
                    onChange={() => toggleItem(index)}
                    className="h-4 w-4 text-brand focus:ring-brand border-dark-100 rounded bg-dark-300"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-100">{item.descricao}</span>
                    <span className="text-sm text-gray-400 ml-2">
                      - Qtd: {item.quantidade} {item.info || item.unidade ? `(${item.info || item.unidade})` : ''}
                    </span>
                  </div>
                </label>
                {itensSelecionados.includes(index) && (
                  <button
                    type="button"
                    onClick={() => buscarPrecosMercado(index)}
                    disabled={buscandoPrecos}
                    className="ml-2 p-1.5 text-brand hover:bg-brand/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Buscar preço de mercado para este item"
                  >
                    {buscandoPrecos ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {itensSelecionados.length > 0 && requisicao && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className={labelClass}>Fornecedores *</label>
            <button
              type="button"
              onClick={addFornecedor}
              className="flex items-center px-3 py-1.5 text-sm bg-success text-dark-800 font-medium rounded-lg hover:bg-success/80 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </button>
          </div>
          <div className="space-y-4">
            {fornecedores.map((fornecedor, fornecedorIndex) => (
              <div key={fornecedorIndex} className="border border-dark-100 rounded-lg p-4 relative bg-dark-400">
                {fornecedores.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFornecedor(fornecedorIndex)}
                    className="absolute top-2 right-2 p-1 text-error hover:bg-error/20 rounded transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <h3 className="font-medium mb-4 text-lg text-brand">
                  Fornecedor {String.fromCharCode(65 + fornecedorIndex)}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={fornecedor.nome}
                      onChange={(e) => updateFornecedor(fornecedorIndex, 'nome', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={fornecedor.cnpj || ''}
                      onChange={(e) => updateFornecedor(fornecedorIndex, 'cnpj', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="border-t border-dark-100 pt-3 mt-3">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Preços por Item</label>
                    <div className="space-y-2">
                      {itensSelecionados.map((itemIndex) => {
                        const item = requisicao.itens[itemIndex]
                        const info = item.info || item.unidade || ''
                        return (
                          <div key={itemIndex} className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <label className="flex-1 text-sm text-gray-300">
                              {item.descricao} ({item.quantidade}{info ? ` - ${info}` : ''}):
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={fornecedor.precosPorItem[itemIndex] || ''}
                              onChange={(e) => updatePrecoItem(fornecedorIndex, itemIndex, parseFloat(e.target.value) || 0)}
                              className="w-full sm:w-32 px-3 py-2 bg-dark-300 border border-dark-100 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-dark-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center px-4 py-2.5 border border-dark-100 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors min-h-touch"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center px-6 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light disabled:opacity-50 transition-colors min-h-touch"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : cotacao ? 'Atualizar' : 'Criar'}
        </button>
      </div>

      <PrecoMercadoModal
        isOpen={mostrarModalPrecos}
        onClose={() => setMostrarModalPrecos(false)}
        precos={precosMercado}
        precosFornecedores={getPrecosFornecedores()}
        itensSelecionados={itensSelecionados}
      />
    </form>
  )
}
