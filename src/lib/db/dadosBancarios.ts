import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { getCachedValue, invalidateCachePrefix, makeCacheKey } from './cache'

const COLLECTION_NAME = 'dados_bancarios'
const READ_CACHE_TTL_MS = 5 * 60 * 1000
const LIST_CACHE_SCOPE = `${COLLECTION_NAME}:list`

function invalidateDadosBancariosCache(): void {
  invalidateCachePrefix(LIST_CACHE_SCOPE)
}

export interface DadosBancarios {
  id: string
  favorecido: string
  banco: string
  agencia?: string
  conta?: string
  chavePix?: string
  updatedAt?: Date
}

function getFavorecidoKey(favorecido: string): string {
  return favorecido.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
}

export async function getDadosBancarios(): Promise<DadosBancarios[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE)
  return getCachedValue(
    cacheKey,
    async () => {
      const q = query(collection(firestore, COLLECTION_NAME), orderBy('favorecido', 'asc'))
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        updatedAt: docSnap.data().updatedAt?.toDate?.() || undefined,
      })) as DadosBancarios[]
    },
    READ_CACHE_TTL_MS
  )
}

export async function saveDadosBancarios(data: {
  favorecido: string
  banco: string
  agencia?: string
  conta?: string
  chavePix?: string
}): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')

  const favorecido = data.favorecido.trim()
  const banco = data.banco.trim()
  if (!favorecido || !banco) {
    return
  }

  const docId = getFavorecidoKey(favorecido)
  const docRef = doc(db, COLLECTION_NAME, docId)

  await setDoc(
    docRef,
    {
      favorecido,
      banco,
      agencia: data.agencia?.trim() || '',
      conta: data.conta?.trim() || '',
      chavePix: data.chavePix?.trim() || '',
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )
  invalidateDadosBancariosCache()
}
