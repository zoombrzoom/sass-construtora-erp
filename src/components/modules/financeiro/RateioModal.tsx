'use client'

import { useState, useEffect } from 'react'
import { Rateio } from '@/types/financeiro'
import { getObras } from '@/lib/db/obras'
import { Obra } from '@/types/obra'

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Rateio entre Obras</h2>
        
        <div className="space-y-4">
          {rateios.map((rateio, index) => (
            <div key={index} className="flex items-center space-x-2">
              <select
                value={rateio.obraId}
                onChange={(e) => updateRateio(index, 'obraId', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Selecione uma obra</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                max="100"
                value={rateio.percentual}
                onChange={(e) => updateRateio(index, 'percentual', parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md"
              />
              <span className="w-8">%</span>
              <span className="w-24 text-sm text-gray-600">
                R$ {((valorTotal * rateio.percentual) / 100).toFixed(2).replace('.', ',')}
              </span>
              {rateios.length > 1 && (
                <button
                  onClick={() => removeRateio(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={addRateio}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + Adicionar Obra
          </button>
          <div className="text-sm">
            Total: <span className={getTotalPercentual() === 100 ? 'text-green-600' : 'text-red-600'}>
              {getTotalPercentual()}%
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={getTotalPercentual() !== 100}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
