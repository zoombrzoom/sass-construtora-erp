'use client'

import { useState, useEffect } from 'react'
import { Cotacao, FornecedorCotacaoItem, RequisicaoItem } from '@/types/compras'
import { createCotacao, updateCotacao } from '@/lib/db/cotacoes'
import { getRequisicoes, getRequisicao } from '@/lib/db/requisicoes'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Requisicao } from '@/types/compras'

interface CotacaoFormProps {
  cotacao?: Cotacao
  onSuccess?: () => void
  initialRequisicaoId?: string
}

export function CotacaoForm({ cotacao, onSuccess, initialRequisicaoId }: CotacaoFormProps) {
  const [requisicaoId, setRequisicaoId] = useState(cotacao?.requisicaoId || initialRequisicaoId || '')
  const [requisicao, setRequisicao] = useState<Requisicao | null>(null)
  const [itensSelecionados, setItensSelecionados] = useState<number[]>(cotacao?.itensSelecionados || [])
  
  // Converter fornecedores antigos (com preco direto) para nova estrutura
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
    
    // Se for estrutura antiga (tem preco direto), converter
    if (fornecedorA.preco !== undefined && typeof fornecedorA.preco === 'number') {
      return [
        { nome: fornecedorA.nome || '', cnpj: fornecedorA.cnpj, precosPorItem: {} },
        { nome: fornecedorB.nome || '', cnpj: fornecedorB.cnpj, precosPorItem: {} },
        { nome: fornecedorC.nome || '', cnpj: fornecedorC.cnpj, precosPorItem: {} }
      ]
    }
    
    // Estrutura nova
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
  const router = useRouter()

  useEffect(() => {
    loadRequisicoes()
    // Se estiver editando uma cotação, carregar a requisição automaticamente
    if (cotacao?.requisicaoId) {
      loadRequisicao(cotacao.requisicaoId)
    }
  }, [])

  useEffect(() => {
    // Quando uma requisição é selecionada, carregar seus dados
    if (requisicaoId && requisicoes.length > 0) {
      const req = requisicoes.find(r => r.id === requisicaoId)
      if (req) {
        setRequisicao(req)
        // Selecionar todos os itens por padrão apenas se não houver itens já selecionados
        if (itensSelecionados.length === 0) {
          setItensSelecionados(req.itens.map((_, index) => index))
        }
      }
    } else if (requisicaoId && !requisicao) {
      // Carregar requisição diretamente se não estiver na lista
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
      // Remover preços desse item de todos os fornecedores
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

    // Verificar se pelo menos um fornecedor tem preço para pelo menos um item
    const temPreco = fornecedores.some(f => 
      itensSelecionados.some(itemIndex => f.precosPorItem[itemIndex] && f.precosPorItem[itemIndex] > 0)
    )
    if (!temPreco) {
      setError('Informe pelo menos um preço para pelo menos um item')
      return
    }

    setLoading(true)

    try {
      // Criar string de item para compatibilidade
      const itemString = requisicao.itens
        .filter((_, index) => itensSelecionados.includes(index))
        .map(i => {
          const info = i.info || i.unidade || ''
          return `${i.descricao} (${i.quantidade}${info ? ` - ${info}` : ''})`
        })
        .join(', ')

      // Garantir que temos pelo menos 3 fornecedores para compatibilidade
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

  if (!requisicao && requisicaoId) {
    return <div className="text-center py-4">Carregando requisição...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="requisicaoId" className="block text-sm font-medium text-gray-700">
          Requisição *
        </label>
        <select
          id="requisicaoId"
          required
          value={requisicaoId}
          onChange={(e) => {
            setRequisicaoId(e.target.value)
            setRequisicao(null)
            setItensSelecionados([])
          }}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Itens para Cotar *
          </label>
          <div className="space-y-2 border rounded-md p-4 bg-gray-50">
            {requisicao.itens.map((item, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={itensSelecionados.includes(index)}
                  onChange={() => toggleItem(index)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">{item.descricao}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    - Quantidade: {item.quantidade} {item.info || item.unidade ? `(${item.info || item.unidade})` : ''}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {itensSelecionados.length > 0 && requisicao && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Fornecedores *
            </label>
            <button
              type="button"
              onClick={addFornecedor}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Adicionar Fornecedor
            </button>
          </div>
          <div className="space-y-4">
            {fornecedores.map((fornecedor, fornecedorIndex) => (
              <div key={fornecedorIndex} className="border rounded-lg p-4 relative bg-white">
                {fornecedores.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFornecedor(fornecedorIndex)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-sm font-bold"
                  >
                    ✕
                  </button>
                )}
                <h3 className="font-medium mb-4 text-lg">
                  Fornecedor {String.fromCharCode(65 + fornecedorIndex)}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome *</label>
                    <input
                      type="text"
                      required
                      value={fornecedor.nome}
                      onChange={(e) => updateFornecedor(fornecedorIndex, 'nome', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CNPJ</label>
                    <input
                      type="text"
                      value={fornecedor.cnpj || ''}
                      onChange={(e) => updateFornecedor(fornecedorIndex, 'cnpj', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preços por Item
                    </label>
                    <div className="space-y-2">
                      {itensSelecionados.map((itemIndex) => {
                        const item = requisicao.itens[itemIndex]
                        const info = item.info || item.unidade || ''
                        return (
                          <div key={itemIndex} className="flex items-center space-x-2">
                            <label className="flex-1 text-sm text-gray-700">
                              {item.descricao} ({item.quantidade} {info ? `- ${info}` : ''}):
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Deixe em branco se não tiver"
                              value={fornecedor.precosPorItem[itemIndex] || ''}
                              onChange={(e) => updatePrecoItem(fornecedorIndex, itemIndex, parseFloat(e.target.value) || 0)}
                              className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
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

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : cotacao ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
