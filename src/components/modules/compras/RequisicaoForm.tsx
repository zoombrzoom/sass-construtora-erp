'use client'

import { useState, useEffect } from 'react'
import { Requisicao, RequisicaoItem } from '@/types/compras'
import { createRequisicao, updateRequisicao } from '@/lib/db/requisicoes'
import { getObras } from '@/lib/db/obras'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Obra } from '@/types/obra'
import { AlertCircle, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'

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

  const inputClass = "w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
  const labelClass = "block text-sm font-medium text-gray-300 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-error/20 border border-error/30 text-error px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label htmlFor="obraId" className={labelClass}>
          Obra *
        </label>
        <select
          id="obraId"
          required
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className={`${inputClass} min-h-touch`}
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
        <label className={labelClass}>Itens *</label>
        <div className="space-y-3">
          {itens.map((item, index) => (
            <div key={index} className="border border-dark-100 rounded-lg p-3 bg-dark-400">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: Parafuso"
                    value={item.descricao}
                    onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Quantidade</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={item.quantidade}
                    onChange={(e) => updateItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Info</label>
                  <input
                    type="text"
                    placeholder="Peso, tamanho..."
                    value={item.info || item.unidade || ''}
                    onChange={(e) => updateItem(index, 'info', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-12 sm:col-span-1 flex items-end">
                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full p-2 text-error hover:bg-error/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 mx-auto" />
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
          className="mt-3 flex items-center px-4 py-2 text-sm text-brand hover:bg-brand/10 border border-brand/50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Item
        </button>
      </div>

      <div>
        <label htmlFor="observacoes" className={labelClass}>Observações</label>
        <textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Observações opcionais..."
        />
      </div>

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
          {loading ? 'Salvando...' : requisicao ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
