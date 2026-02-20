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
  type QueryConstraint
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { pushUndoable } from '@/lib/undo/undoStore'

export interface Fornecedor {
  id: string
  nome: string
  cnpj: string
  categoria: string
  contato: {
    telefone?: string
    email?: string
  }
  endereco?: string
  observacoes?: string
}

const COLLECTION_NAME = 'fornecedores'

export async function getFornecedor(id: string): Promise<Fornecedor | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Fornecedor
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error)
    throw error
  }
}

export async function getFornecedores(filters?: { 
  categoria?: string
}): Promise<Fornecedor[]> {
  try {
    const constraints: QueryConstraint[] = []
    
    if (filters?.categoria) {
      constraints.push(where('categoria', '==', filters.categoria))
    }
    
    const q = constraints.length > 0 
      ? query(collection(db, COLLECTION_NAME), ...constraints)
      : collection(db, COLLECTION_NAME)
    
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Fornecedor[]
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error)
    throw error
  }
}

export async function createFornecedor(data: Omit<Fornecedor, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), data)
    const id = docRef.id

    pushUndoable({
      description: 'Criar fornecedor',
      undo: async () => deleteDoc(doc(db, COLLECTION_NAME, id)),
      redo: async () => addDoc(collection(db, COLLECTION_NAME), data),
    })

    return id
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error)
    throw error
  }
}

export async function updateFornecedor(id: string, data: Partial<Omit<Fornecedor, 'id'>>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? snapshot.data() : null

    await updateDoc(docRef, data)

    if (previousData) {
      pushUndoable({
        description: 'Editar fornecedor',
        undo: async () => updateDoc(docRef, previousData),
        redo: async () => updateDoc(docRef, data),
      })
    }
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error)
    throw error
  }
}

export async function deleteFornecedor(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? { ...snapshot.data() } : null

    await deleteDoc(docRef)

    if (previousData) {
      pushUndoable({
        description: 'Excluir fornecedor',
        undo: async () => setDoc(doc(db, COLLECTION_NAME, id), previousData),
        redo: async () => deleteDoc(docRef),
      })
    }
  } catch (error) {
    console.error('Erro ao deletar fornecedor:', error)
    throw error
  }
}
