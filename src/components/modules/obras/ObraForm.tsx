'use client'

import { useState } from 'react'
import { Obra, ObraStatus } from '@/types/obra'
import { createObra, updateObra } from '@/lib/db/obras'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface ObraFormProps {
  obra?: Obra
  onSuccess?: () => void
}

export function ObraForm({ obra, onSuccess }: ObraFormProps) {
  const [nome, setNome] = useState(obra?.nome || '')
  const [endereco, setEndereco] = useState(obra?.endereco || '')
  const [status, setStatus] = useState<ObraStatus>(obra?.status || 'ativa')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (obra) {
        await updateObra(obra.id, { nome, endereco, status })
      } else {
        if (!user) throw new Error('Usuário não autenticado')
        await createObra({
          nome,
          endereco,
          status,
          createdBy: user.id,
          createdAt: new Date(),
        })
      }
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/obras')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar obra')
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
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
          Nome da Obra *
        </label>
        <input
          id="nome"
          type="text"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
          Endereço *
        </label>
        <input
          id="endereco"
          type="text"
          required
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status *
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ObraStatus)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="ativa">Ativa</option>
          <option value="pausada">Pausada</option>
          <option value="concluida">Concluída</option>
        </select>
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
          {loading ? 'Salvando...' : obra ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
