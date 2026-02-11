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

export interface ObraCategoriaDb {
  id: string
  nome: string
  createdAt: Timestamp | Date
  createdBy: string
  updatedAt?: Timestamp | Date
}

const COLLECTION_NAME = 'obras_categorias'

export async function getObrasCategorias(): Promise<ObraCategoriaDb[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const q = query(collection(db, COLLECTION_NAME), orderBy('nome', 'asc'))
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
  return docRef.id
}

export async function updateObraCategoria(id: string, params: { nome: string }): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  const nome = params.nome.trim()
  if (!nome) throw new Error('Nome inválido')
  await updateDoc(doc(db, COLLECTION_NAME, id), { nome, updatedAt: Timestamp.now() })
}

export async function deleteObraCategoria(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}

