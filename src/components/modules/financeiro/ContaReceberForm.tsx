'use client'

import { useState, useEffect } from 'react'
import { ContaReceber, ContaReceberOrigem } from '@/types/financeiro'
import { createContaReceber, updateContaReceber } from '@/lib/db/contasReceber'
import { getObras } from '@/lib/db/obras'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Obra } from '@/types/obra'
import { toDate } from '@/utils/date'
import { AlertCircle, Save, ArrowLeft } from 'lucide-react'

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
        <label htmlFor="obraId" className={labelClass}>
          Obra (Opcional)
        </label>
        <select
          id="obraId"
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className={inputClass}
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
        <label htmlFor="valor" className={labelClass}>
          Valor *
        </label>
        <input
          id="valor"
          type="number"
          step="0.01"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className={inputClass}
          placeholder="0.00"
        />
      </div>

      <div>
        <label htmlFor="dataVencimento" className={labelClass}>
          Data de Vencimento *
        </label>
        <input
          id="dataVencimento"
          type="date"
          required
          value={dataVencimento}
          onChange={(e) => setDataVencimento(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="origem" className={labelClass}>
          Origem *
        </label>
        <select
          id="origem"
          value={origem}
          onChange={(e) => setOrigem(e.target.value as ContaReceberOrigem)}
          className={inputClass}
        >
          <option value="financiamento">Financiamento</option>
          <option value="cliente">Cliente</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      <div>
        <label htmlFor="descricao" className={labelClass}>
          Descrição
        </label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Descrição opcional..."
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
          {loading ? 'Salvando...' : conta ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
