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
import { Obra, ObraStatus } from '@/types/obra'
import { getCachedValue, invalidateCachePrefix, makeCacheKey } from './cache'

const COLLECTION_NAME = 'obras'
const READ_CACHE_TTL_MS = 30 * 1000
const LIST_CACHE_SCOPE = `${COLLECTION_NAME}:list`
const ITEM_CACHE_SCOPE = `${COLLECTION_NAME}:item`

function toDateSafe(val: unknown): Date | undefined {
  if (val == null) return undefined
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') return (val as { toDate: () => Date }).toDate()
  if (val instanceof Date) return val
  try { return new Date(val as string | number) } catch { return undefined }
}

function invalidateObrasCache(): void {
  invalidateCachePrefix(LIST_CACHE_SCOPE)
  invalidateCachePrefix(ITEM_CACHE_SCOPE)
}

function getFirestoreInstance() {
  if (!db) throw new Error('Firebase não está inicializado')
  return db
}

function mapObraDoc(docSnap: any): Obra {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    ...data,
    createdAt: toDateSafe(data.createdAt) || new Date(),
    updatedAt: toDateSafe(data.updatedAt),
  } as Obra
}

export async function getObra(id: string): Promise<Obra | null> {
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

        return mapObraDoc(docSnap)
      } catch (error) {
        console.error('Erro ao buscar obra:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function getObras(filters?: { status?: ObraStatus }): Promise<Obra[]> {
  const firestore = getFirestoreInstance()
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE, filters ?? {})
  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const constraints: QueryConstraint[] = []

        if (filters?.status) {
          constraints.push(where('status', '==', filters.status))
        }

        const q = constraints.length > 0
          ? query(collection(firestore, COLLECTION_NAME), ...constraints)
          : collection(firestore, COLLECTION_NAME)

        const querySnapshot = await getDocs(q)

        return querySnapshot.docs.map((d) => mapObraDoc(d)) as Obra[]
      } catch (error) {
        console.error('Erro ao buscar obras:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function createObra(data: Omit<Obra, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const firestore = getFirestoreInstance()
  try {
    const payload = { ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), payload)
    const id = docRef.id

    pushUndoable({
      description: 'Criar obra',
      undo: async () => {
        await deleteDoc(doc(firestore, COLLECTION_NAME, id))
        invalidateObrasCache()
      },
      redo: async () => {
        await addDoc(collection(firestore, COLLECTION_NAME), payload)
        invalidateObrasCache()
      },
    })

    invalidateObrasCache()
    return id
  } catch (error) {
    console.error('Erro ao criar obra:', error)
    throw error
  }
}

export async function updateObra(id: string, data: Partial<Omit<Obra, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> {
  const firestore = getFirestoreInstance()
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? snapshot.data() : null

    const updateData = { ...data, updatedAt: Timestamp.now() }
    await updateDoc(docRef, updateData)
    invalidateObrasCache()

    if (previousData) {
      pushUndoable({
        description: 'Editar obra',
        undo: async () => {
          await updateDoc(docRef, previousData)
          invalidateObrasCache()
        },
        redo: async () => {
          await updateDoc(docRef, updateData)
          invalidateObrasCache()
        },
      })
    }
  } catch (error) {
    console.error('Erro ao atualizar obra:', error)
    throw error
  }
}

export async function deleteObra(id: string): Promise<void> {
  const firestore = getFirestoreInstance()
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? { ...snapshot.data() } : null

    await deleteDoc(docRef)
    invalidateObrasCache()

    if (previousData) {
      pushUndoable({
        description: 'Excluir obra',
        undo: async () => {
          await setDoc(doc(firestore, COLLECTION_NAME, id), previousData)
          invalidateObrasCache()
        },
        redo: async () => {
          await deleteDoc(docRef)
          invalidateObrasCache()
        },
      })
    }
  } catch (error) {
    console.error('Erro ao deletar obra:', error)
    throw error
  }
}
