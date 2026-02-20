import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  Timestamp,
  type QueryConstraint
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { pushUndoable } from '@/lib/undo/undoStore'
import { Requisicao, RequisicaoStatus } from '@/types/compras'
import { getCachedValue, invalidateCachePrefix, makeCacheKey } from './cache'

const COLLECTION_NAME = 'requisicoes'
const READ_CACHE_TTL_MS = 20 * 1000
const LIST_CACHE_SCOPE = `${COLLECTION_NAME}:list`
const ITEM_CACHE_SCOPE = `${COLLECTION_NAME}:item`

function invalidateRequisicoesCache(): void {
  invalidateCachePrefix(LIST_CACHE_SCOPE)
  invalidateCachePrefix(ITEM_CACHE_SCOPE)
}

function getFirestoreInstance() {
  if (!db) throw new Error('Firebase não está inicializado')
  return db
}

function mapRequisicaoDoc(docSnap: any): Requisicao {
  const rawData = docSnap.data()
  return {
    id: docSnap.id,
    ...rawData,
    pedido: rawData.pedido ?? false,
    aprovado: rawData.aprovado ?? false,
    createdAt: rawData.createdAt?.toDate() || new Date(),
    dataEntrega: rawData.dataEntrega?.toDate ? rawData.dataEntrega.toDate() : rawData.dataEntrega,
  } as Requisicao
}

export async function getRequisicao(id: string): Promise<Requisicao | null> {
  const firestore = getFirestoreInstance()
  const cacheKey = makeCacheKey(ITEM_CACHE_SCOPE, { id })
  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const docRef = doc(firestore, COLLECTION_NAME, id)
        const docSnap = await getDoc(docRef)
        
        if (!docSnap.exists()) {
          return null
        }

        return mapRequisicaoDoc(docSnap)
      } catch (error) {
        console.error('Erro ao buscar requisição:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function getRequisicoes(filters?: { 
  obraId?: string
  status?: RequisicaoStatus
  solicitadoPor?: string
}): Promise<Requisicao[]> {
  const firestore = getFirestoreInstance()
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE, filters ?? {})
  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const constraints: QueryConstraint[] = []
        
        if (filters?.obraId) {
          constraints.push(where('obraId', '==', filters.obraId))
        }
        
        if (filters?.status) {
          constraints.push(where('status', '==', filters.status))
        }
        
        if (filters?.solicitadoPor) {
          constraints.push(where('solicitadoPor', '==', filters.solicitadoPor))
        }
        
        const q = constraints.length > 0 
          ? query(collection(firestore, COLLECTION_NAME), ...constraints)
          : collection(firestore, COLLECTION_NAME)
        
        const querySnapshot = await getDocs(q)
        
        return querySnapshot.docs.map((item) => mapRequisicaoDoc(item)) as Requisicao[]
      } catch (error) {
        console.error('Erro ao buscar requisições:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function createRequisicao(data: Omit<Requisicao, 'id' | 'createdAt'>): Promise<string> {
  const firestore = getFirestoreInstance()
  try {
    // Remover campos undefined (Firestore não aceita undefined)
    const cleanData: any = {
      obraId: data.obraId,
      solicitadoPor: data.solicitadoPor,
      itens: data.itens,
      status: data.status,
      pedido: data.pedido ?? false,
      aprovado: data.aprovado ?? false,
      createdAt: Timestamp.now(),
    }

    // Adicionar campos opcionais apenas se existirem
    if (data.observacoes) {
      cleanData.observacoes = data.observacoes
    }
    if (data.dataEntrega) {
      cleanData.dataEntrega = data.dataEntrega
    }
    if (data.notaFiscal) {
      cleanData.notaFiscal = data.notaFiscal
    }
    if (data.comprovantePagamento) {
      cleanData.comprovantePagamento = data.comprovantePagamento
    }

    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), cleanData)
    const id = docRef.id

    pushUndoable({
      description: 'Criar requisição',
      undo: async () => {
        await deleteDoc(doc(firestore, COLLECTION_NAME, id))
        invalidateRequisicoesCache()
      },
      redo: async () => {
        await addDoc(collection(firestore, COLLECTION_NAME), cleanData)
        invalidateRequisicoesCache()
      },
    })

    invalidateRequisicoesCache()
    return id
  } catch (error) {
    console.error('Erro ao criar requisição:', error)
    throw error
  }
}

export async function updateRequisicao(id: string, data: Partial<Omit<Requisicao, 'id' | 'createdAt'>>): Promise<void> {
  const firestore = getFirestoreInstance()
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? snapshot.data() : null

    const updateData: any = {}
    
    // Adicionar apenas campos que foram fornecidos e não são undefined
    if (data.obraId !== undefined) updateData.obraId = data.obraId
    if (data.solicitadoPor !== undefined) updateData.solicitadoPor = data.solicitadoPor
    if (data.itens !== undefined) updateData.itens = data.itens
    if (data.status !== undefined) updateData.status = data.status
    if (data.pedido !== undefined) updateData.pedido = data.pedido
    if (data.aprovado !== undefined) updateData.aprovado = data.aprovado
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes
    if (data.dataEntrega !== undefined) updateData.dataEntrega = data.dataEntrega
    if (data.notaFiscal !== undefined) updateData.notaFiscal = data.notaFiscal
    if (data.comprovantePagamento !== undefined) updateData.comprovantePagamento = data.comprovantePagamento
    
    updateData.updatedAt = Timestamp.now()

    await updateDoc(docRef, updateData)
    invalidateRequisicoesCache()

    if (previousData) {
      pushUndoable({
        description: 'Editar requisição',
        undo: async () => {
          await updateDoc(docRef, previousData)
          invalidateRequisicoesCache()
        },
        redo: async () => {
          await updateDoc(docRef, updateData)
          invalidateRequisicoesCache()
        },
      })
    }
  } catch (error) {
    console.error('Erro ao atualizar requisição:', error)
    throw error
  }
}

export async function deleteRequisicao(id: string): Promise<void> {
  const firestore = getFirestoreInstance()
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? { ...snapshot.data() } : null

    await deleteDoc(docRef)
    invalidateRequisicoesCache()

    if (previousData) {
      pushUndoable({
        description: 'Excluir requisição',
        undo: async () => {
          await setDoc(doc(firestore, COLLECTION_NAME, id), previousData)
          invalidateRequisicoesCache()
        },
        redo: async () => {
          await deleteDoc(docRef)
          invalidateRequisicoesCache()
        },
      })
    }
  } catch (error) {
    console.error('Erro ao deletar requisição:', error)
    throw error
  }
}
