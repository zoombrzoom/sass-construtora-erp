'use client'

import { useState, useEffect } from 'react'
import { ContaReceber, ContaReceberOrigem } from '@/types/financeiro'
import { createContaReceber, updateContaReceber } from '@/lib/db/contasReceber'
import { getObras } from '@/lib/db/obras'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Obra } from '@/types/obra'
import { toDate } from '@/utils/date'

interface ContaReceberFormProps {
  conta?: ContaReceber
  onSuccess?: () => void
}

export function ContaReceberForm({ conta, onSuccess }: ContaReceberFormProps) {
  const [valor, setValor] = useState(conta?.valor.toString() || '')
  const [dataVencimento, setDataVencimento] = useState(
    conta?.dataVencimento 
      ? toDate(conta.dataVencimento).toISOString().split('T')[0]
      : ''
  )
  const [origem, setOrigem] = useState<ContaReceberOrigem>(conta?.origem || 'cliente')
  const [obraId, setObraId] = useState(conta?.obraId || '')
  const [descricao, setDescricao] = useState(conta?.descricao || '')
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
      const data = await getObras()
      setObras(data)
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!user) throw new Error('Usuário não autenticado')

      const data: any = {
        valor: parseFloat(valor),
        dataVencimento: new Date(dataVencimento),
        origem,
        status: conta?.status || 'pendente',
        createdBy: user.id,
      }

      if (obraId) {
        data.obraId = obraId
      }

      if (descricao && descricao.trim()) {
        data.descricao = descricao.trim()
      }

      if (conta) {
        await updateContaReceber(conta.id, data)
      } else {
        await createContaReceber(data)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/financeiro/contas-receber')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar conta')
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
          Obra (Opcional)
        </label>
        <select
          id="obraId"
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Nenhuma (Escritório)</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="valor" className="block text-sm font-medium text-gray-700">
          Valor *
        </label>
        <input
          id="valor"
          type="number"
          step="0.01"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="dataVencimento" className="block text-sm font-medium text-gray-700">
          Data de Vencimento *
        </label>
        <input
          id="dataVencimento"
          type="date"
          required
          value={dataVencimento}
          onChange={(e) => setDataVencimento(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="origem" className="block text-sm font-medium text-gray-700">
          Origem *
        </label>
        <select
          id="origem"
          value={origem}
          onChange={(e) => setOrigem(e.target.value as ContaReceberOrigem)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="financiamento">Financiamento</option>
          <option value="cliente">Cliente</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      <div>
        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
          Descrição
        </label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
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
          {loading ? 'Salvando...' : conta ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
