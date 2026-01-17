'use client'

import { PedidoCompra } from '@/types/compras'
import { getCotacao } from '@/lib/db/cotacoes'
import { gerarPedidoPDF } from '@/lib/pdf/gerarPedido'
import { uploadImage } from '@/lib/storage/upload'
import { updatePedidoCompra } from '@/lib/db/pedidosCompra'
import { useState } from 'react'

interface PedidoCompraCardProps {
  pedido: PedidoCompra
  onUpdate?: () => void
}

export function PedidoCompraCard({ pedido, onUpdate }: PedidoCompraCardProps) {
  const [loading, setLoading] = useState(false)

  const handleGerarPDF = async () => {
    setLoading(true)
    try {
      const cotacao = await getCotacao(pedido.cotacaoId)
      if (!cotacao) {
        alert('Cotação não encontrada')
        return
      }

      const fornecedorSelecionado = 
        cotacao.fornecedorMenorPreco === 'A' ? 'A' :
        cotacao.fornecedorMenorPreco === 'B' ? 'B' : 'C'

      const blob = await gerarPedidoPDF(pedido.cotacaoId, fornecedorSelecionado)
      
      // Upload do PDF para Firebase Storage
      const file = new File([blob], `pedido_${pedido.id}.pdf`, { type: 'application/pdf' })
      const path = `pedidos/${pedido.id}_${Date.now()}.pdf`
      const pdfUrl = await uploadImage(file, path, false)
      
      await updatePedidoCompra(pedido.id, {
        pdfUrl,
        status: 'gerado',
      })

      // Download do PDF
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pedido_${pedido.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Pedido {pedido.id}</h3>
          <p className="text-sm text-gray-500">Cotação: {pedido.cotacaoId}</p>
          <p className="text-sm text-gray-500">Fornecedor: {pedido.fornecedorSelecionado}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded ${
          pedido.status === 'confirmado' ? 'bg-green-100 text-green-800' :
          pedido.status === 'enviado' ? 'bg-blue-100 text-blue-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {pedido.status}
        </span>
      </div>

      <div className="flex space-x-2">
        {!pedido.pdfUrl && (
          <button
            onClick={handleGerarPDF}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Gerando...' : 'Gerar PDF'}
          </button>
        )}
        {pedido.pdfUrl && (
          <a
            href={pedido.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Ver PDF
          </a>
        )}
      </div>
    </div>
  )
}
