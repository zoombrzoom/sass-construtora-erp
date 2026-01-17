'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ContaReceber } from '@/types/financeiro'
import { getContaReceber } from '@/lib/db/contasReceber'
import { getObra } from '@/lib/db/obras'
import { Obra } from '@/types/obra'
import { format } from 'date-fns'
import Link from 'next/link'

export default function ContaReceberDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const [conta, setConta] = useState<ContaReceber | null>(null)
  const [obra, setObra] = useState<Obra | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadConta(params.id as string)
    }
  }, [params.id])

  const loadConta = async (id: string) => {
    try {
      const data = await getContaReceber(id)
      if (data) {
        setConta(data)
        // Carregar dados da obra se existir
        if (data.obraId) {
          const obraData = await getObra(data.obraId)
          setObra(obraData)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conta:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  if (!conta) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Conta não encontrada</p>
          <Link
            href="/financeiro/contas-receber"
            className="text-blue-600 hover:text-blue-800"
          >
            Voltar para Contas a Receber
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Detalhes da Conta a Receber</h1>
        <Link
          href="/financeiro/contas-receber"
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Voltar
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Conta #{conta.id.slice(0, 8)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Criada em {format(new Date(conta.createdAt), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded ${
              conta.status === 'recebido' ? 'bg-green-100 text-green-800' :
              conta.status === 'atrasado' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {conta.status}
            </span>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Valor</h3>
              <p className="text-2xl font-bold text-gray-900">
                R$ {conta.valor.toFixed(2).replace('.', ',')}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Origem</h3>
              <p className="text-sm text-gray-900 capitalize">
                {conta.origem}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Data de Vencimento</h3>
              <p className="text-sm text-gray-900">
                {format(new Date(conta.dataVencimento), 'dd/MM/yyyy')}
              </p>
            </div>

            {conta.dataRecebimento && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Data de Recebimento</h3>
                <p className="text-sm text-gray-900">
                  {format(new Date(conta.dataRecebimento), 'dd/MM/yyyy')}
                </p>
              </div>
            )}

            {conta.obraId && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Obra</h3>
                <p className="text-sm text-gray-900">
                  {obra ? obra.nome : conta.obraId}
                </p>
                {obra && (
                  <p className="text-xs text-gray-500 mt-1">
                    {obra.endereco}
                  </p>
                )}
              </div>
            )}

            {!conta.obraId && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Centro de Custo</h3>
                <p className="text-sm text-gray-900">
                  Escritório
                </p>
              </div>
            )}

            {conta.descricao && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Descrição</h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {conta.descricao}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <Link
                href="/financeiro/contas-receber"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </Link>
              <Link
                href={`/financeiro/contas-receber/${conta.id}/editar`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Editar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
