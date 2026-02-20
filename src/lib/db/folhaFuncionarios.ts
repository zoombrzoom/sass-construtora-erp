import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { pushUndoable } from '@/lib/undo/undoStore'
import type { FolhaFuncionario } from '@/types/financeiro'

const COLLECTION_NAME = 'folhaFuncionarios'

function mapDocToFolhaFuncionario(docSnap: DocumentSnapshot): FolhaFuncionario | null {
  if (!docSnap.exists()) return null
  const raw = docSnap.data()
  return {
    id: docSnap.id,
    nome: raw.nome ?? '',
    cpf: raw.cpf,
    agencia: raw.agencia,
    conta: raw.conta,
    categoriaId: raw.categoriaId,
    formaPagamento: raw.formaPagamento,
    obraId: raw.obraId ?? '',
    recorrenciaTipo: raw.recorrenciaTipo ?? 'mensal',
    diaUtil: raw.diaUtil,
    diaMes2: raw.diaMes2,
    diaMensal: raw.diaMensal,
    valorMensal: raw.valorMensal,
    valorQuinzena1: raw.valorQuinzena1,
    valorQuinzena2: raw.valorQuinzena2,
    valorSemanal: raw.valorSemanal,
    valorAvulso: raw.valorAvulso,
    dataAvulso: raw.dataAvulso?.toDate?.() ?? raw.dataAvulso,
    ativo: raw.ativo !== false,
    createdBy: raw.createdBy ?? '',
    createdAt: raw.createdAt?.toDate?.() ?? new Date(),
    updatedAt: raw.updatedAt?.toDate?.() ?? undefined,
  } as FolhaFuncionario
}

export async function getFolhaFuncionarios(): Promise<FolhaFuncionario[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('nome', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => mapDocToFolhaFuncionario(d))
    .filter((f): f is FolhaFuncionario => f !== null)
}

export async function getFolhaFuncionario(id: string): Promise<FolhaFuncionario | null> {
  if (!db) throw new Error('Firebase não está inicializado')
  const docRef = doc(db, COLLECTION_NAME, id)
  const docSnap = await getDoc(docRef)
  return mapDocToFolhaFuncionario(docSnap)
}

function buildCreateData(data: Omit<FolhaFuncionario, 'id' | 'createdAt'>): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    nome: data.nome.trim(),
    recorrenciaTipo: data.recorrenciaTipo,
    ativo: data.ativo !== false,
    createdBy: data.createdBy,
    createdAt: Timestamp.now(),
  }
  if (data.obraId?.trim()) clean.obraId = data.obraId.trim()
  if (data.cpf?.trim()) clean.cpf = data.cpf.trim()
  if (data.agencia?.trim()) clean.agencia = data.agencia.trim()
  if (data.conta?.trim()) clean.conta = data.conta.trim()
  if (data.categoriaId?.trim()) clean.categoriaId = data.categoriaId.trim()
  if (data.formaPagamento) clean.formaPagamento = data.formaPagamento
  if (data.diaUtil !== undefined) clean.diaUtil = data.diaUtil
  if (data.diaMes2 !== undefined) clean.diaMes2 = data.diaMes2
  if (data.diaMensal !== undefined) clean.diaMensal = data.diaMensal
  if (data.valorMensal !== undefined) clean.valorMensal = data.valorMensal
  if (data.valorQuinzena1 !== undefined) clean.valorQuinzena1 = data.valorQuinzena1
  if (data.valorQuinzena2 !== undefined) clean.valorQuinzena2 = data.valorQuinzena2
  if (data.valorSemanal !== undefined) clean.valorSemanal = data.valorSemanal
  if (data.valorAvulso !== undefined) clean.valorAvulso = data.valorAvulso
  if (data.dataAvulso) clean.dataAvulso = Timestamp.fromDate(data.dataAvulso as Date)
  return clean
}

export async function createFolhaFuncionario(data: Omit<FolhaFuncionario, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')
  const cleanData = buildCreateData(data)
  const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData)
  const id = docRef.id

  pushUndoable({
    description: 'Criar funcionário',
    undo: async () => deleteDoc(doc(db, COLLECTION_NAME, id)),
    redo: async () => addDoc(collection(db, COLLECTION_NAME), cleanData),
  })

  return id
}

export async function updateFolhaFuncionario(
  id: string,
  data: Partial<Omit<FolhaFuncionario, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  const docRef = doc(db, COLLECTION_NAME, id)
  const snapshot = await getDoc(docRef)
  const previousData = snapshot.exists() ? snapshot.data() : null

  const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() }
  if (data.nome !== undefined) updateData.nome = data.nome.trim()
  if (data.cpf !== undefined) updateData.cpf = data.cpf?.trim() ?? null
  if (data.agencia !== undefined) updateData.agencia = data.agencia?.trim() ?? null
  if (data.conta !== undefined) updateData.conta = data.conta?.trim() ?? null
  if (data.categoriaId !== undefined) updateData.categoriaId = data.categoriaId?.trim() ?? null
  if (data.formaPagamento !== undefined) updateData.formaPagamento = data.formaPagamento
  if (data.obraId !== undefined) updateData.obraId = (data.obraId && data.obraId.trim()) ? data.obraId.trim() : null
  if (data.recorrenciaTipo !== undefined) updateData.recorrenciaTipo = data.recorrenciaTipo
  if (data.diaUtil !== undefined) updateData.diaUtil = data.diaUtil
  if (data.diaMes2 !== undefined) updateData.diaMes2 = data.diaMes2
  if (data.diaMensal !== undefined) updateData.diaMensal = data.diaMensal
  if (data.valorMensal !== undefined) updateData.valorMensal = data.valorMensal
  if (data.valorQuinzena1 !== undefined) updateData.valorQuinzena1 = data.valorQuinzena1
  if (data.valorQuinzena2 !== undefined) updateData.valorQuinzena2 = data.valorQuinzena2
  if (data.valorSemanal !== undefined) updateData.valorSemanal = data.valorSemanal
  if (data.valorAvulso !== undefined) updateData.valorAvulso = data.valorAvulso
  if (data.dataAvulso !== undefined) {
    updateData.dataAvulso = data.dataAvulso ? Timestamp.fromDate(data.dataAvulso as Date) : null
  }
  if (data.ativo !== undefined) updateData.ativo = data.ativo

  await updateDoc(docRef, updateData)

  if (previousData) {
    pushUndoable({
      description: 'Editar funcionário',
      undo: async () => updateDoc(docRef, previousData),
      redo: async () => updateDoc(docRef, updateData),
    })
  }
}

export async function deleteFolhaFuncionario(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  const docRef = doc(db, COLLECTION_NAME, id)
  const snapshot = await getDoc(docRef)
  const previousData = snapshot.exists() ? { ...snapshot.data() } : null

  await deleteDoc(docRef)

  if (previousData) {
    pushUndoable({
      description: 'Excluir funcionário',
      undo: async () => setDoc(doc(db, COLLECTION_NAME, id), previousData),
      redo: async () => deleteDoc(docRef),
    })
  }
}
