import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { getCachedValue, invalidateCachePrefix, makeCacheKey } from './cache'

export interface ObraCategoriaDb {
  id: string
  nome: string
  createdAt: Timestamp | Date
  createdBy: string
  updatedAt?: Timestamp | Date
}

const COLLECTION_NAME = 'obras_categorias'
const READ_CACHE_TTL_MS = 5 * 60 * 1000
const LIST_CACHE_SCOPE = `${COLLECTION_NAME}:list`

function invalidateObrasCategoriasCache(): void {
  invalidateCachePrefix(LIST_CACHE_SCOPE)
}

export async function getObrasCategorias(): Promise<ObraCategoriaDb[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE)
  return getCachedValue(
    cacheKey,
    async () => {
      const q = query(collection(firestore, COLLECTION_NAME), orderBy('nome', 'asc'))
      const snap = await getDocs(q)
      return snap.docs.map((d) => {
        const data: any = d.data()
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || undefined,
        }
      }) as ObraCategoriaDb[]
    },
    READ_CACHE_TTL_MS
  )
}

export async function createObraCategoria(params: { nome: string; createdBy: string }): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')
  const nome = params.nome.trim()
  if (!nome) throw new Error('Nome inválido')
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    nome,
    createdBy: params.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  invalidateObrasCategoriasCache()
  return docRef.id
}

export async function updateObraCategoria(id: string, params: { nome: string }): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  const nome = params.nome.trim()
  if (!nome) throw new Error('Nome inválido')
  await updateDoc(doc(db, COLLECTION_NAME, id), { nome, updatedAt: Timestamp.now() })
  invalidateObrasCategoriasCache()
}

export async function deleteObraCategoria(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  await deleteDoc(doc(db, COLLECTION_NAME, id))
  invalidateObrasCategoriasCache()
}
