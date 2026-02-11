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

const COLLECTION_NAME = 'folha_pagamento_categorias'

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

export async function getFolhaPagamentoCategorias(): Promise<FolhaPagamentoCategoria[]> {
  if (!db) throw new Error('Firebase não está inicializado')

  const q = query(collection(db, COLLECTION_NAME), orderBy('nome', 'asc'))
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

  return id
}

export async function deleteFolhaPagamentoCategoria(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}

