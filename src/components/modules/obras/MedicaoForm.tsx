'use client'

import { useState, useEffect } from 'react'
import { Medicao } from '@/types/medicao'
import { createMedicao, updateMedicao } from '@/lib/db/medicoes'
import { getObras } from '@/lib/db/obras'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Obra } from '@/types/obra'
import { toDate } from '@/utils/date'

interface MedicaoFormProps {
  medicao?: Medicao
  onSuccess?: () => void
}

export function MedicaoForm({ medicao, onSuccess }: MedicaoFormProps) {
  const [obraId, setObraId] = useState(medicao?.obraId || '')
  const [empreiteiro, setEmpreiteiro] = useState(medicao?.empreiteiro || '')
  const [servico, setServico] = useState(medicao?.servico || '')
  const [percentualExecutado, setPercentualExecutado] = useState(
    medicao?.percentualExecutado.toString() || '0'
  )
  const [valorTotal, setValorTotal] = useState(medicao?.valorTotal.toString() || '')
  const [dataMedicao, setDataMedicao] = useState(
    medicao?.dataMedicao 
      ? toDate(medicao.dataMedicao).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [observacoes, setObservacoes] = useState(medicao?.observacoes || '')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!obraId || !empreiteiro || !servico) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    const percentual = parseFloat(percentualExecutado)
    if (percentual < 0 || percentual > 100) {
      setError('Percentual deve estar entre 0 e 100')
      return
    }

    setLoading(true)

    try {
      if (!user) throw new Error('Usuário não autenticado')

      const data: any = {
        obraId,
        empreiteiro,
        servico,
        percentualExecutado: percentual,
        valorTotal: parseFloat(valorTotal),
        dataMedicao: new Date(dataMedicao),
        createdBy: user.id,
      }

      if (observacoes && observacoes.trim()) {
        data.observacoes = observacoes.trim()
      }

      if (medicao) {
        await updateMedicao(medicao.id, data)
      } else {
        await createMedicao(data)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/obras/${obraId}/medicoes`)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar medição')
    } finally {
      setLoading(false)
    }
  }

  const valorLiberado = (parseFloat(valorTotal) * parseFloat(percentualExecutado)) / 100

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
        <label htmlFor="empreiteiro" className="block text-sm font-medium text-gray-700">
          Empreiteiro *
        </label>
        <input
          id="empreiteiro"
          type="text"
          required
          value={empreiteiro}
          onChange={(e) => setEmpreiteiro(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="servico" className="block text-sm font-medium text-gray-700">
          Serviço *
        </label>
        <input
          id="servico"
          type="text"
          required
          value={servico}
          onChange={(e) => setServico(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="valorTotal" className="block text-sm font-medium text-gray-700">
            Valor Total *
          </label>
          <input
            id="valorTotal"
            type="number"
            step="0.01"
            min="0"
            required
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="percentualExecutado" className="block text-sm font-medium text-gray-700">
            % Executado *
          </label>
          <input
            id="percentualExecutado"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            value={percentualExecutado}
            onChange={(e) => setPercentualExecutado(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-900">
          Valor a Liberar: R$ {valorLiberado.toFixed(2).replace('.', ',')}
        </p>
      </div>

      <div>
        <label htmlFor="dataMedicao" className="block text-sm font-medium text-gray-700">
          Data da Medição *
        </label>
        <input
          id="dataMedicao"
          type="date"
          required
          value={dataMedicao}
          onChange={(e) => setDataMedicao(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
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
          {loading ? 'Salvando...' : medicao ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
