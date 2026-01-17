'use client'

import { useState, useEffect } from 'react'
import { createRecebimento, RecebimentoFisico } from '@/lib/db/recebimentos'
import { getPedidosCompra } from '@/lib/db/pedidosCompra'
import { uploadImages } from '@/lib/storage/upload'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { PedidoCompra } from '@/types/compras'

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="pedidoCompraId" className="block text-sm font-medium text-gray-700">
          Pedido de Compra *
        </label>
        <select
          id="pedidoCompraId"
          required
          value={pedidoCompraId}
          onChange={(e) => setPedidoCompraId(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecione um pedido</option>
          {pedidos.map((pedido) => (
            <option key={pedido.id} value={pedido.id}>
              Pedido {pedido.id}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="obraId" className="block text-sm font-medium text-gray-700">
          Obra *
        </label>
        <input
          id="obraId"
          type="text"
          required
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="ID da Obra"
        />
      </div>

      <div>
        <label htmlFor="dataRecebimento" className="block text-sm font-medium text-gray-700">
          Data de Recebimento *
        </label>
        <input
          id="dataRecebimento"
          type="date"
          required
          value={dataRecebimento}
          onChange={(e) => setDataRecebimento(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="fotos" className="block text-sm font-medium text-gray-700">
          Fotos do Recebimento
        </label>
        <input
          id="fotos"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {fotos.length > 0 && (
          <p className="mt-2 text-sm text-gray-500">
            {fotos.length} foto(s) selecionada(s)
          </p>
        )}
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
          {loading ? 'Salvando...' : 'Confirmar Recebimento'}
        </button>
      </div>
    </form>
  )
}
