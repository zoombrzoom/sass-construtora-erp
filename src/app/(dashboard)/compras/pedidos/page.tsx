'use client'

import { useEffect, useState } from 'react'
import { PedidoCompra } from '@/types/compras'
import { getPedidosCompra } from '@/lib/db/pedidosCompra'
import { PedidoCompraCard } from '@/components/modules/compras/PedidoCompraCard'

export default function PedidosCompraPage() {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPedidos()
  }, [])

  const loadPedidos = async () => {
    try {
      const data = await getPedidosCompra()
      setPedidos(data)
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Pedidos de Compra</h1>

      {pedidos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum pedido de compra encontrado
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <PedidoCompraCard
              key={pedido.id}
              pedido={pedido}
              onUpdate={loadPedidos}
            />
          ))}
        </div>
      )}
    </div>
  )
}
