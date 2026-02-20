import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  type QueryConstraint,
  where,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { pushUndoable } from '@/lib/undo/undoStore'
import { Documento, DocumentoPasta } from '@/types/documentos'

const DOCUMENTOS_COLLECTION = 'documentos'
const PASTAS_COLLECTION = 'documentos_pastas'

function parseDate(value: any): Date {
  return value?.toDate?.() || new Date()
}

function sortByOrdemAndDate<T extends { ordem?: number; createdAt: Date | any }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ordemA = typeof a.ordem === 'number' ? a.ordem : 0
    const ordemB = typeof b.ordem === 'number' ? b.ordem : 0
    if (ordemA !== ordemB) return ordemA - ordemB
    return parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime()
  })
}

export async function getDocumentos(filters?: {
  obraId?: string
  folderId?: string
  includePrivate?: boolean
}): Promise<Documento[]> {
  if (!db) throw new Error('Firebase não está inicializado')

  const constraints: QueryConstraint[] = []
  if (filters?.obraId) {
    constraints.push(where('obraId', '==', filters.obraId))
  }
  if (filters?.folderId !== undefined) {
    constraints.push(where('folderId', '==', filters.folderId))
  }

  const q = constraints.length > 0
    ? query(collection(db, DOCUMENTOS_COLLECTION), ...constraints)
    : collection(db, DOCUMENTOS_COLLECTION)

  const snapshot = await getDocs(q)
  let data = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: parseDate(docSnap.data().createdAt),
    updatedAt: docSnap.data().updatedAt?.toDate?.(),
    ordem: typeof docSnap.data().ordem === 'number' ? docSnap.data().ordem : 0,
  })) as Documento[]

  if (!filters?.includePrivate) {
    data = data.filter((item) => item.visibilidade !== 'admin_only')
  }

  return sortByOrdemAndDate(data)
}

export async function createDocumento(data: Omit<Documento, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')

  const payload: any = {
    nome: data.nome.trim(),
    arquivoNome: data.arquivoNome,
    arquivoUrl: data.arquivoUrl,
    visibilidade: data.visibilidade,
    categoria: data.categoria,
    ordem: typeof data.ordem === 'number' ? data.ordem : Date.now(),
    createdBy: data.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }

  if (data.descricao) payload.descricao = data.descricao.trim()
  if (data.obraId) payload.obraId = data.obraId
  if (data.folderId) payload.folderId = data.folderId
  if (data.arquivoPath) payload.arquivoPath = data.arquivoPath
  if (data.mimeType) payload.mimeType = data.mimeType
  if (typeof data.tamanho === 'number') payload.tamanho = data.tamanho

  const docRef = await addDoc(collection(db, DOCUMENTOS_COLLECTION), payload)
  const id = docRef.id

  pushUndoable({
    description: 'Adicionar documento',
    undo: async () => deleteDoc(doc(db, DOCUMENTOS_COLLECTION, id)),
    redo: async () => addDoc(collection(db, DOCUMENTOS_COLLECTION), payload),
  })

  return id
}

export async function updateDocumento(
  id: string,
  data: Partial<Omit<Documento, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')

  const docRef = doc(db, DOCUMENTOS_COLLECTION, id)
  const snapshot = await getDoc(docRef)
  const previousData = snapshot.exists() ? snapshot.data() : null

  const payload: any = {}
  if (data.nome !== undefined) payload.nome = data.nome.trim()
  if (data.descricao !== undefined) payload.descricao = data.descricao.trim()
  if (data.arquivoNome !== undefined) payload.arquivoNome = data.arquivoNome
  if (data.arquivoUrl !== undefined) payload.arquivoUrl = data.arquivoUrl
  if (data.arquivoPath !== undefined) payload.arquivoPath = data.arquivoPath
  if (data.mimeType !== undefined) payload.mimeType = data.mimeType
  if (data.tamanho !== undefined) payload.tamanho = data.tamanho
  if (data.visibilidade !== undefined) payload.visibilidade = data.visibilidade
  if (data.categoria !== undefined) payload.categoria = data.categoria
  if (data.obraId !== undefined) payload.obraId = data.obraId || null
  if (data.folderId !== undefined) payload.folderId = data.folderId || null
  if (data.ordem !== undefined) payload.ordem = data.ordem
  payload.updatedAt = Timestamp.now()

  await updateDoc(docRef, payload)

  if (previousData) {
    pushUndoable({
      description: 'Editar documento',
      undo: async () => updateDoc(docRef, previousData),
      redo: async () => updateDoc(docRef, payload),
    })
  }
}

export async function deleteDocumento(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  const docRef = doc(db, DOCUMENTOS_COLLECTION, id)
  const snapshot = await getDoc(docRef)
  const previousData = snapshot.exists() ? { ...snapshot.data() } : null

  await deleteDoc(docRef)

  if (previousData) {
    pushUndoable({
      description: 'Excluir documento',
      undo: async () => setDoc(doc(db, DOCUMENTOS_COLLECTION, id), previousData),
      redo: async () => deleteDoc(docRef),
    })
  }
}

export async function getDocumentosPastas(filters?: { includePrivate?: boolean }): Promise<DocumentoPasta[]> {
  if (!db) throw new Error('Firebase não está inicializado')

  const snapshot = await getDocs(collection(db, PASTAS_COLLECTION))
  let data = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: parseDate(docSnap.data().createdAt),
    updatedAt: docSnap.data().updatedAt?.toDate?.(),
    ordem: typeof docSnap.data().ordem === 'number' ? docSnap.data().ordem : 0,
    cor: docSnap.data().cor || '#D4AF37',
    icone: docSnap.data().icone || 'folder',
  })) as DocumentoPasta[]

  if (!filters?.includePrivate) {
    data = data.filter((item) => item.visibilidade !== 'admin_only')
  }

  return sortByOrdemAndDate(data)
}

export async function createDocumentoPasta(
  data: Omit<DocumentoPasta, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')

  const payload: any = {
    nome: data.nome.trim(),
    cor: data.cor || '#D4AF37',
    icone: data.icone || 'folder',
    visibilidade: data.visibilidade,
    ordem: typeof data.ordem === 'number' ? data.ordem : Date.now(),
    createdBy: data.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }

  if (data.parentId) payload.parentId = data.parentId

  const docRef = await addDoc(collection(db, PASTAS_COLLECTION), payload)
  return docRef.id
}

export async function updateDocumentoPasta(
  id: string,
  data: Partial<Omit<DocumentoPasta, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')

  const payload: any = {}
  if (data.nome !== undefined) payload.nome = data.nome.trim()
  if (data.parentId !== undefined) payload.parentId = data.parentId || null
  if (data.cor !== undefined) payload.cor = data.cor
  if (data.icone !== undefined) payload.icone = data.icone
  if (data.visibilidade !== undefined) payload.visibilidade = data.visibilidade
  if (data.ordem !== undefined) payload.ordem = data.ordem
  payload.updatedAt = Timestamp.now()

  await updateDoc(doc(db, PASTAS_COLLECTION, id), payload)
}

export async function deleteDocumentoPasta(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  await deleteDoc(doc(db, PASTAS_COLLECTION, id))
}
