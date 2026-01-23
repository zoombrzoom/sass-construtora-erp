'use client'

import { useState } from 'react'
import { Obra, ObraStatus } from '@/types/obra'
import { createObra, updateObra } from '@/lib/db/obras'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { AlertCircle, Save, ArrowLeft } from 'lucide-react'

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

  const inputClass = "mt-1 block w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
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
        <label htmlFor="nome" className={labelClass}>
          Nome da Obra *
        </label>
        <input
          id="nome"
          type="text"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={inputClass}
          placeholder="Nome da obra"
        />
      </div>

      <div>
        <label htmlFor="endereco" className={labelClass}>
          Endereço *
        </label>
        <input
          id="endereco"
          type="text"
          required
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          className={inputClass}
          placeholder="Endereço completo"
        />
      </div>

      <div>
        <label htmlFor="status" className={labelClass}>
          Status *
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ObraStatus)}
          className={inputClass}
        >
          <option value="ativa">Ativa</option>
          <option value="pausada">Pausada</option>
          <option value="concluida">Concluída</option>
        </select>
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
          {loading ? 'Salvando...' : obra ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
