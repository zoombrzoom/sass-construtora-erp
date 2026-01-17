'use client'

import { useEffect, useState } from 'react'
import { getRecebimentos, RecebimentoFisico } from '@/lib/db/recebimentos'
import Link from 'next/link'
import { format } from 'date-fns'
import { toDate } from '@/utils/date'

export default function RecebimentosPage() {
  const [recebimentos, setRecebimentos] = useState<RecebimentoFisico[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecebimentos()
  }, [])

  const loadRecebimentos = async () => {
    try {
      const data = await getRecebimentos()
      setRecebimentos(data)
    } catch (error) {
      console.error('Erro ao carregar recebimentos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Recebimentos Físicos</h1>
        <Link
          href="/compras/recebimentos/novo"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Novo Recebimento
        </Link>
      </div>

      {recebimentos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum recebimento cadastrado
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {recebimentos.map((recebimento) => (
              <li key={recebimento.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Pedido: {recebimento.pedidoCompraId} | Obra: {recebimento.obraId}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Recebido em: {format(toDate(recebimento.dataRecebimento), 'dd/MM/yyyy')}
                      </p>
                      {recebimento.observacoes && (
                        <p className="text-sm text-gray-500 mt-1">
                          {recebimento.observacoes}
                        </p>
                      )}
                      {recebimento.fotos && recebimento.fotos.length > 0 && (
                        <p className="text-sm text-blue-600 mt-1">
                          {recebimento.fotos.length} foto(s) anexada(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
