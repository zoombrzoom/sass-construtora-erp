import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  Timestamp,
  type QueryConstraint
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { ContaReceber, ContaReceberStatus } from '@/types/financeiro'

const COLLECTION_NAME = 'contasReceber'

export async function getContaReceber(id: string): Promise<ContaReceber | null> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
      dataVencimento: docSnap.data().dataVencimento?.toDate() || new Date(),
      dataRecebimento: docSnap.data().dataRecebimento?.toDate(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as ContaReceber
  } catch (error) {
    console.error('Erro ao buscar conta a receber:', error)
    throw error
  }
}

export async function getContasReceber(filters?: { 
  obraId?: string
  status?: ContaReceberStatus
}): Promise<ContaReceber[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const constraints: QueryConstraint[] = []
    
    if (filters?.obraId) {
      constraints.push(where('obraId', '==', filters.obraId))
    }
    
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status))
    }
    
    const q = constraints.length > 0 
      ? query(collection(db, COLLECTION_NAME), ...constraints)
      : collection(db, COLLECTION_NAME)
    
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dataVencimento: doc.data().dataVencimento?.toDate() || new Date(),
      dataRecebimento: doc.data().dataRecebimento?.toDate(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as ContaReceber[]
  } catch (error) {
    console.error('Erro ao buscar contas a receber:', error)
    throw error
  }
}

export async function createContaReceber(data: Omit<ContaReceber, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')
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

    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData)
    
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar conta a receber:', error)
    throw error
  }
}

export async function updateContaReceber(id: string, data: Partial<Omit<ContaReceber, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: any = { ...data }
    
    if (data.dataVencimento) {
      updateData.dataVencimento = Timestamp.fromDate(data.dataVencimento as Date)
    }
    if (data.dataRecebimento) {
      updateData.dataRecebimento = Timestamp.fromDate(data.dataRecebimento as Date)
    }
    
    await updateDoc(docRef, updateData)
  } catch (error) {
    console.error('Erro ao atualizar conta a receber:', error)
    throw error
  }
}

export async function deleteContaReceber(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erro ao deletar conta a receber:', error)
    throw error
  }
}
