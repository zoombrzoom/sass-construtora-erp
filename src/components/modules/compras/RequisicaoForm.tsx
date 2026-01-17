'use client'

import { useState, useEffect } from 'react'
import { Requisicao, RequisicaoItem } from '@/types/compras'
import { createRequisicao, updateRequisicao } from '@/lib/db/requisicoes'
import { getObras } from '@/lib/db/obras'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Obra } from '@/types/obra'

interface RequisicaoFormProps {
  requisicao?: Requisicao
  onSuccess?: () => void
}

export function RequisicaoForm({ requisicao, onSuccess }: RequisicaoFormProps) {
  const [obraId, setObraId] = useState(requisicao?.obraId || '')
  const [itens, setItens] = useState<RequisicaoItem[]>(
    requisicao?.itens || [{ descricao: '', quantidade: 0, info: '' }]
  )
  const [observacoes, setObservacoes] = useState(requisicao?.observacoes || '')
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    loadObras()
  }, [])

  const loadObras = async () => {
    try {
      const data = await getObras({ status: 'ativa' })
      setObras(data)
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    }
  }

  const addItem = () => {
    setItens([...itens, { descricao: '', quantidade: 0, info: '' }])
  }

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof RequisicaoItem, value: string | number) => {
    const updated = [...itens]
    updated[index] = { ...updated[index], [field]: value }
    setItens(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!obraId) {
      setError('Selecione uma obra')
      return
    }

    if (itens.length === 0 || itens.some(item => !item.descricao || item.quantidade <= 0)) {
      setError('Adicione pelo menos um item válido')
      return
    }

    setLoading(true)

    try {
      if (!user) throw new Error('Usuário não autenticado')

      const data: any = {
        obraId,
        solicitadoPor: user.id,
        itens: itens.filter(item => item.descricao && item.quantidade > 0),
        status: requisicao?.status || 'pendente',
      }

      // Adicionar observações apenas se tiver valor
      if (observacoes && observacoes.trim()) {
        data.observacoes = observacoes.trim()
      }

      if (requisicao) {
        await updateRequisicao(requisicao.id, data)
      } else {
        await createRequisicao(data)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/compras/requisicoes')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar requisição')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="obraId" className="block text-sm font-medium text-gray-700">
          Obra *
        </label>
        <select
          id="obraId"
          required
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecione uma obra</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Itens *
        </label>
        <div className="space-y-3">
          {itens.map((item, index) => (
            <div key={index} className="border rounded-md p-3 bg-gray-50">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Parafuso"
                    value={item.descricao}
                    onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={item.quantidade}
                    onChange={(e) => updateItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Info
                  </label>
                  <input
                    type="text"
                    placeholder="Peso, tamanho, modelo..."
                    value={item.info || item.unidade || ''}
                    onChange={(e) => updateItem(index, 'info', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="col-span-12 sm:col-span-1 flex items-end">
                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md text-sm font-medium"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
        >
          + Adicionar Item
        </button>
      </div>

      <div>
        <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700">
          Observações
        </label>
        <textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

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
          {loading ? 'Salvando...' : requisicao ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
