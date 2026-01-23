'use client'

import { useState, useEffect } from 'react'
import { Medicao } from '@/types/medicao'
import { createMedicao, updateMedicao } from '@/lib/db/medicoes'
import { getObras } from '@/lib/db/obras'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Obra } from '@/types/obra'
import { toDate } from '@/utils/date'
import { AlertCircle, Save, ArrowLeft } from 'lucide-react'

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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
        <label htmlFor="obraId" className={labelClass}>Obra *</label>
        <select
          id="obraId"
          required
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className={inputClass}
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
        <label htmlFor="empreiteiro" className={labelClass}>Empreiteiro *</label>
        <input
          id="empreiteiro"
          type="text"
          required
          value={empreiteiro}
          onChange={(e) => setEmpreiteiro(e.target.value)}
          className={inputClass}
          placeholder="Nome do empreiteiro"
        />
      </div>

      <div>
        <label htmlFor="servico" className={labelClass}>Serviço *</label>
        <input
          id="servico"
          type="text"
          required
          value={servico}
          onChange={(e) => setServico(e.target.value)}
          className={inputClass}
          placeholder="Descrição do serviço"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="valorTotal" className={labelClass}>Valor Total *</label>
          <input
            id="valorTotal"
            type="number"
            step="0.01"
            min="0"
            required
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="percentualExecutado" className={labelClass}>% Executado *</label>
          <input
            id="percentualExecutado"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            value={percentualExecutado}
            onChange={(e) => setPercentualExecutado(e.target.value)}
            className={inputClass}
            placeholder="0"
          />
        </div>
      </div>

      <div className="bg-brand/10 border border-brand/30 rounded-lg p-4">
        <p className="text-sm font-medium text-brand">
          Valor a Liberar: {formatCurrency(isNaN(valorLiberado) ? 0 : valorLiberado)}
        </p>
      </div>

      <div>
        <label htmlFor="dataMedicao" className={labelClass}>Data da Medição *</label>
        <input
          id="dataMedicao"
          type="date"
          required
          value={dataMedicao}
          onChange={(e) => setDataMedicao(e.target.value)}
          className={inputClass}
        />
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
          {loading ? 'Salvando...' : medicao ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
