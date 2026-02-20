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
import { ContaReceber, ContaReceberStatus } from '@/types/financeiro'
import { getCachedValue, invalidateCachePrefix, makeCacheKey } from './cache'

const COLLECTION_NAME = 'contasReceber'
const READ_CACHE_TTL_MS = 20 * 1000
const LIST_CACHE_SCOPE = `${COLLECTION_NAME}:list`
const ITEM_CACHE_SCOPE = `${COLLECTION_NAME}:item`

function invalidateContasReceberCache(): void {
  invalidateCachePrefix(LIST_CACHE_SCOPE)
  invalidateCachePrefix(ITEM_CACHE_SCOPE)
}

function getFirestoreInstance() {
  if (!db) throw new Error('Firebase não está inicializado')
  return db
}

function mapContaReceberDoc(docSnap: any): ContaReceber {
  return {
    id: docSnap.id,
    ...docSnap.data(),
    dataVencimento: docSnap.data().dataVencimento?.toDate() || new Date(),
    dataRecebimento: docSnap.data().dataRecebimento?.toDate(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
  } as ContaReceber
}

export async function getContaReceber(id: string): Promise<ContaReceber | null> {
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
        
        return mapContaReceberDoc(docSnap)
      } catch (error) {
        console.error('Erro ao buscar conta a receber:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function getContasReceber(filters?: { 
  obraId?: string
  status?: ContaReceberStatus
}): Promise<ContaReceber[]> {
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
        
        const q = constraints.length > 0 
          ? query(collection(firestore, COLLECTION_NAME), ...constraints)
          : collection(firestore, COLLECTION_NAME)
        
        const querySnapshot = await getDocs(q)
        
        return querySnapshot.docs.map((item) => mapContaReceberDoc(item)) as ContaReceber[]
      } catch (error) {
        console.error('Erro ao buscar contas a receber:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function createContaReceber(data: Omit<ContaReceber, 'id' | 'createdAt'>): Promise<string> {
  const firestore = getFirestoreInstance()
  try {
    const cleanData: any = {
      valor: data.valor,
      dataVencimento: Timestamp.fromDate(data.dataVencimento as Date),
      origem: data.origem,
      status: data.status,
      createdBy: data.createdBy,
      createdAt: Timestamp.now(),
    }

    if (data.obraId) {
      cleanData.obraId = data.obraId
    }
    if (data.descricao) {
      cleanData.descricao = data.descricao
    }
    if (data.dataRecebimento) {
      cleanData.dataRecebimento = Timestamp.fromDate(data.dataRecebimento as Date)
    }

    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), cleanData)
    const id = docRef.id

    pushUndoable({
      description: 'Criar conta a receber',
      undo: async () => {
        await deleteDoc(doc(firestore, COLLECTION_NAME, id))
        invalidateContasReceberCache()
      },
      redo: async () => {
        await addDoc(collection(firestore, COLLECTION_NAME), cleanData)
        invalidateContasReceberCache()
      },
    })

    invalidateContasReceberCache()
    return id
  } catch (error) {
    console.error('Erro ao criar conta a receber:', error)
    throw error
  }
}

export async function updateContaReceber(id: string, data: Partial<Omit<ContaReceber, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> {
  const firestore = getFirestoreInstance()
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? snapshot.data() : null

    const updateData: any = { ...data }
    if (data.dataVencimento) {
      updateData.dataVencimento = Timestamp.fromDate(data.dataVencimento as Date)
    }
    if (data.dataRecebimento) {
      updateData.dataRecebimento = Timestamp.fromDate(data.dataRecebimento as Date)
    }

    await updateDoc(docRef, updateData)
    invalidateContasReceberCache()

    if (previousData) {
      pushUndoable({
        description: 'Editar conta a receber',
        undo: async () => {
          await updateDoc(docRef, previousData)
          invalidateContasReceberCache()
        },
        redo: async () => {
          await updateDoc(docRef, updateData)
          invalidateContasReceberCache()
        },
      })
    }
  } catch (error) {
    console.error('Erro ao atualizar conta a receber:', error)
    throw error
  }
}

export async function deleteContaReceber(id: string): Promise<void> {
  const firestore = getFirestoreInstance()
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? { ...snapshot.data() } : null

    await deleteDoc(docRef)
    invalidateContasReceberCache()

    if (previousData) {
      pushUndoable({
        description: 'Excluir conta a receber',
        undo: async () => {
          await setDoc(doc(firestore, COLLECTION_NAME, id), previousData)
          invalidateContasReceberCache()
        },
        redo: async () => {
          await deleteDoc(docRef)
          invalidateContasReceberCache()
        },
      })
    }
  } catch (error) {
    console.error('Erro ao deletar conta a receber:', error)
    throw error
  }
}
