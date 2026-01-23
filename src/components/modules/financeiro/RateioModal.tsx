'use client'

import { useState, useEffect } from 'react'
import { Rateio } from '@/types/financeiro'
import { getObras } from '@/lib/db/obras'
import { Obra } from '@/types/obra'
import { X, Plus, Trash2 } from 'lucide-react'

interface RateioModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (rateio: Rateio[]) => void
  valorTotal: number
  obraPrincipalId: string
}

export function RateioModal({ isOpen, onClose, onConfirm, valorTotal, obraPrincipalId }: RateioModalProps) {
  const [obras, setObras] = useState<Obra[]>([])
  const [rateios, setRateios] = useState<Rateio[]>([
    { obraId: obraPrincipalId, percentual: 100 }
  ])

  useEffect(() => {
    if (isOpen) {
      loadObras()
    }
  }, [isOpen])

  const loadObras = async () => {
    try {
      const data = await getObras()
      setObras(data)
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    }
  }

  const addRateio = () => {
    setRateios([...rateios, { obraId: '', percentual: 0 }])
  }

  const removeRateio = (index: number) => {
    setRateios(rateios.filter((_, i) => i !== index))
  }

  const updateRateio = (index: number, field: 'obraId' | 'percentual', value: string | number) => {
    const updated = [...rateios]
    updated[index] = { ...updated[index], [field]: value }
    setRateios(updated)
  }

  const getTotalPercentual = () => {
    return rateios.reduce((sum, r) => sum + r.percentual, 0)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const handleConfirm = () => {
    if (getTotalPercentual() !== 100) {
      alert('A soma dos percentuais deve ser 100%')
      return
    }

    if (rateios.some(r => !r.obraId)) {
      alert('Selecione todas as obras')
      return
    }

    onConfirm(rateios)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-6 max-w-2xl w-full shadow-dark-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-brand">Rateio entre Obras</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {rateios.map((rateio, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-dark-400 rounded-lg">
              <select
                value={rateio.obraId}
                onChange={(e) => updateRateio(index, 'obraId', e.target.value)}
                className="flex-1 px-3 py-2.5 bg-dark-300 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">Selecione uma obra</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rateio.percentual}
                  onChange={(e) => updateRateio(index, 'percentual', parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2.5 bg-dark-300 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <span className="text-gray-400">%</span>
                <span className="text-sm text-brand font-medium min-w-[80px]">
                  {formatCurrency((valorTotal * rateio.percentual) / 100)}
                </span>
                {rateios.length > 1 && (
                  <button
                    onClick={() => removeRateio(index)}
                    className="p-2 text-error hover:bg-error/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={addRateio}
            className="flex items-center text-brand hover:text-brand-light text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Obra
          </button>
          <div className="text-sm text-gray-300">
            Total: <span className={getTotalPercentual() === 100 ? 'text-success font-bold' : 'text-error font-bold'}>
              {getTotalPercentual()}%
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-dark-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-dark-100 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={getTotalPercentual() !== 100}
            className="px-6 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light disabled:opacity-50 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
