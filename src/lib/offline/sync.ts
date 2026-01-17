import { getSyncQueue, removeFromSyncQueue, clearSyncQueue } from './indexeddb'

// Importar funções de CRUD de cada módulo
import { createObra, updateObra, deleteObra } from '../db/obras'
import { createContaPagar, updateContaPagar, deleteContaPagar } from '../db/contasPagar'
import { createContaReceber, updateContaReceber, deleteContaReceber } from '../db/contasReceber'
import { createRequisicao, updateRequisicao, deleteRequisicao } from '../db/requisicoes'
import { createCotacao, updateCotacao, deleteCotacao } from '../db/cotacoes'
import { createPedidoCompra, updatePedidoCompra, deletePedidoCompra } from '../db/pedidosCompra'
import { createMedicao, updateMedicao, deleteMedicao } from '../db/medicoes'
import { createRecebimento, updateRecebimento, deleteRecebimento } from '../db/recebimentos'

type SyncOperation = {
  collection: string
  operation: 'create' | 'update' | 'delete'
  data: any
}

const operationHandlers: Record<string, Record<string, Function>> = {
  obras: {
    create: createObra,
    update: updateObra,
    delete: deleteObra,
  },
  contasPagar: {
    create: createContaPagar,
    update: updateContaPagar,
    delete: deleteContaPagar,
  },
  contasReceber: {
    create: createContaReceber,
    update: updateContaReceber,
    delete: deleteContaReceber,
  },
  requisicoes: {
    create: createRequisicao,
    update: updateRequisicao,
    delete: deleteRequisicao,
  },
  cotacoes: {
    create: createCotacao,
    update: updateCotacao,
    delete: deleteCotacao,
  },
  pedidosCompra: {
    create: createPedidoCompra,
    update: updatePedidoCompra,
    delete: deletePedidoCompra,
  },
  medicoes: {
    create: createMedicao,
    update: updateMedicao,
    delete: deleteMedicao,
  },
  recebimentos: {
    create: createRecebimento,
    update: updateRecebimento,
    delete: deleteRecebimento,
  },
}

export async function syncQueue(): Promise<{ success: number; errors: number }> {
  try {
    const queue = await getSyncQueue()
    
    if (queue.length === 0) {
      return { success: 0, errors: 0 }
    }

    let success = 0
    let errors = 0

    for (const item of queue) {
      try {
        const handlers = operationHandlers[item.collection]
        if (!handlers) {
          console.warn(`Nenhum handler encontrado para coleção: ${item.collection}`)
          await removeFromSyncQueue(item.id)
          errors++
          continue
        }

        const handler = handlers[item.operation]
        if (!handler) {
          console.warn(`Nenhum handler encontrado para operação: ${item.operation}`)
          await removeFromSyncQueue(item.id)
          errors++
          continue
        }

        // Executar operação
        if (item.operation === 'delete') {
          await handler(item.data.id || item.data)
        } else {
          await handler(item.data)
        }

        // Remover da fila após sucesso
        await removeFromSyncQueue(item.id)
        success++
      } catch (error) {
        console.error(`Erro ao sincronizar item ${item.id}:`, error)
        errors++
        // Não remove da fila em caso de erro para tentar novamente depois
      }
    }

    return { success, errors }
  } catch (error) {
    console.error('Erro ao sincronizar fila:', error)
    throw error
  }
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

export function setupOnlineListener(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleOnline = () => {
    callback()
  }

  window.addEventListener('online', handleOnline)

  return () => {
    window.removeEventListener('online', handleOnline)
  }
}
