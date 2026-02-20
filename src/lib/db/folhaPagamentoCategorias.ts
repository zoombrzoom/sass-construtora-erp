import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { FolhaPagamentoCategoria } from '@/types/financeiro'
import { getCachedValue, invalidateCachePrefix, makeCacheKey } from './cache'

const COLLECTION_NAME = 'folha_pagamento_categorias'
const READ_CACHE_TTL_MS = 5 * 60 * 1000
const LIST_CACHE_SCOPE = `${COLLECTION_NAME}:list`

function invalidateFolhaCategoriasCache(): void {
  invalidateCachePrefix(LIST_CACHE_SCOPE)
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

export async function getFolhaPagamentoCategorias(): Promise<FolhaPagamentoCategoria[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE)
  return getCachedValue(
    cacheKey,
    async () => {
      const q = query(collection(firestore, COLLECTION_NAME), orderBy('nome', 'asc'))
      const snap = await getDocs(q)

      return snap.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || undefined,
        }
      }) as FolhaPagamentoCategoria[]
    },
    READ_CACHE_TTL_MS
  )
}

export async function saveFolhaPagamentoCategoria(data: { nome: string; createdBy: string }): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')

  const nome = data.nome.trim()
  if (!nome) {
    throw new Error('Informe o nome da categoria.')
  }

  const id = slugify(nome)
  const ref = doc(db, COLLECTION_NAME, id)

  await setDoc(
    ref,
    {
      nome,
      createdBy: data.createdBy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )

  invalidateFolhaCategoriasCache()
  return id
}

export async function deleteFolhaPagamentoCategoria(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  await deleteDoc(doc(db, COLLECTION_NAME, id))
  invalidateFolhaCategoriasCache()
}
