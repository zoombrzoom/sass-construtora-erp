'use client'

import { useState, useEffect } from 'react'
import { createRecebimento, RecebimentoFisico } from '@/lib/db/recebimentos'
import { getPedidosCompra } from '@/lib/db/pedidosCompra'
import { uploadImages } from '@/lib/storage/upload'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { PedidoCompra } from '@/types/compras'
import { AlertCircle, Save, ArrowLeft, Upload, Image } from 'lucide-react'

interface RecebimentoFisicoFormProps {
  onSuccess?: () => void
}

export function RecebimentoFisicoForm({ onSuccess }: RecebimentoFisicoFormProps) {
  const [pedidoCompraId, setPedidoCompraId] = useState('')
  const [obraId, setObraId] = useState('')
  const [dataRecebimento, setDataRecebimento] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [observacoes, setObservacoes] = useState('')
  const [fotos, setFotos] = useState<File[]>([])
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    loadPedidos()
  }, [])

  const loadPedidos = async () => {
    try {
      const data = await getPedidosCompra({ status: 'confirmado' })
      setPedidos(data)
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFotos(files)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!pedidoCompraId || !obraId) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)

    try {
      if (!user) throw new Error('Usuário não autenticado')

      let fotosUrls: string[] = []

      if (fotos.length > 0) {
        const path = `recebimentos/${pedidoCompraId}_${Date.now()}`
        fotosUrls = await uploadImages(fotos, path)
      }

      const recebimentoData: any = {
        pedidoCompraId,
        obraId,
        confirmadoPor: user.id,
        dataRecebimento: new Date(dataRecebimento),
        createdAt: new Date(),
      }

      if (observacoes && observacoes.trim()) {
        recebimentoData.observacoes = observacoes.trim()
      }

      if (fotosUrls.length > 0) {
        recebimentoData.fotos = fotosUrls
      }

      await createRecebimento(recebimentoData)

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/compras/recebimentos')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar recebimento')
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
        <label htmlFor="pedidoCompraId" className={labelClass}>Pedido de Compra *</label>
        <select
          id="pedidoCompraId"
          required
          value={pedidoCompraId}
          onChange={(e) => setPedidoCompraId(e.target.value)}
          className={inputClass}
        >
          <option value="">Selecione um pedido</option>
          {pedidos.map((pedido) => (
            <option key={pedido.id} value={pedido.id}>
              Pedido {pedido.id.slice(0, 8)}...
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="obraId" className={labelClass}>Obra *</label>
        <input
          id="obraId"
          type="text"
          required
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className={inputClass}
          placeholder="ID da Obra"
        />
      </div>

      <div>
        <label htmlFor="dataRecebimento" className={labelClass}>Data de Recebimento *</label>
        <input
          id="dataRecebimento"
          type="date"
          required
          value={dataRecebimento}
          onChange={(e) => setDataRecebimento(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="fotos" className={labelClass}>Fotos do Recebimento</label>
        <div className="mt-1 flex items-center">
          <label className="flex items-center px-4 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-300 cursor-pointer hover:border-brand hover:text-brand transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            Escolher Arquivos
            <input
              id="fotos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {fotos.length > 0 && (
            <span className="ml-3 text-sm text-gray-400 flex items-center">
              <Image className="w-4 h-4 mr-1" />
              {fotos.length} foto(s) selecionada(s)
            </span>
          )}
        </div>
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
          {loading ? 'Salvando...' : 'Confirmar Recebimento'}
        </button>
      </div>
    </form>
  )
}
