'use client'

import { PedidoCompra } from '@/types/compras'
import { getCotacao } from '@/lib/db/cotacoes'
import { gerarPedidoPDF } from '@/lib/pdf/gerarPedido'
import { uploadImage } from '@/lib/storage/upload'
import { updatePedidoCompra } from '@/lib/db/pedidosCompra'
import { useState } from 'react'
import { FileText, ExternalLink, Loader2 } from 'lucide-react'

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
      
      const file = new File([blob], `pedido_${pedido.id}.pdf`, { type: 'application/pdf' })
      const path = `pedidos/${pedido.id}_${Date.now()}.pdf`
      const pdfUrl = await uploadImage(file, path, false)
      
      await updatePedidoCompra(pedido.id, {
        pdfUrl,
        status: 'gerado',
      })

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
    <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-100">Pedido {pedido.id.slice(0, 8)}...</h3>
          <p className="text-sm text-gray-400">Cotação: {pedido.cotacaoId.slice(0, 8)}...</p>
          <p className="text-sm text-gray-400">Fornecedor: {pedido.fornecedorSelecionado}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          pedido.status === 'confirmado' ? 'bg-success/20 text-success' :
          pedido.status === 'enviado' ? 'bg-blue-500/20 text-blue-400' :
          'bg-warning/20 text-warning'
        }`}>
          {pedido.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {!pedido.pdfUrl && (
          <button
            onClick={handleGerarPDF}
            disabled={loading}
            className="flex items-center px-4 py-2.5 bg-brand text-dark-800 font-medium rounded-lg hover:bg-brand-light disabled:opacity-50 transition-colors min-h-touch"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Gerar PDF
              </>
            )}
          </button>
        )}
        {pedido.pdfUrl && (
          <a
            href={pedido.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-4 py-2.5 bg-success text-dark-800 font-medium rounded-lg hover:bg-success/80 transition-colors min-h-touch"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver PDF
          </a>
        )}
      </div>
    </div>
  )
}
