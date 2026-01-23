'use client'

import { useEffect, useState } from 'react'
import { PedidoCompra } from '@/types/compras'
import { getPedidosCompra } from '@/lib/db/pedidosCompra'
import { PedidoCompraCard } from '@/components/modules/compras/PedidoCompraCard'
import { Package } from 'lucide-react'

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
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Pedidos de Compra</h1>

      {pedidos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-600" />
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
