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
import { Requisicao, RequisicaoStatus } from '@/types/compras'

const COLLECTION_NAME = 'requisicoes'

export async function getRequisicao(id: string): Promise<Requisicao | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as Requisicao
  } catch (error) {
    console.error('Erro ao buscar requisição:', error)
    throw error
  }
}

export async function getRequisicoes(filters?: { 
  obraId?: string
  status?: RequisicaoStatus
  solicitadoPor?: string
}): Promise<Requisicao[]> {
  try {
    const constraints: QueryConstraint[] = []
    
    if (filters?.obraId) {
      constraints.push(where('obraId', '==', filters.obraId))
    }
    
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status))
    }
    
    if (filters?.solicitadoPor) {
      constraints.push(where('solicitadoPor', '==', filters.solicitadoPor))
    }
    
    const q = constraints.length > 0 
      ? query(collection(db, COLLECTION_NAME), ...constraints)
      : collection(db, COLLECTION_NAME)
    
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Requisicao[]
  } catch (error) {
    console.error('Erro ao buscar requisições:', error)
    throw error
  }
}

export async function createRequisicao(data: Omit<Requisicao, 'id' | 'createdAt'>): Promise<string> {
  try {
    // Remover campos undefined (Firestore não aceita undefined)
    const cleanData: any = {
      obraId: data.obraId,
      solicitadoPor: data.solicitadoPor,
      itens: data.itens,
      status: data.status,
      createdAt: Timestamp.now(),
    }

    // Adicionar campos opcionais apenas se existirem
    if (data.observacoes) {
      cleanData.observacoes = data.observacoes
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData)
    
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar requisição:', error)
    throw error
  }
}

export async function updateRequisicao(id: string, data: Partial<Omit<Requisicao, 'id' | 'createdAt'>>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: any = {}
    
    // Adicionar apenas campos que foram fornecidos e não são undefined
    if (data.obraId !== undefined) updateData.obraId = data.obraId
    if (data.solicitadoPor !== undefined) updateData.solicitadoPor = data.solicitadoPor
    if (data.itens !== undefined) updateData.itens = data.itens
    if (data.status !== undefined) updateData.status = data.status
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes
    
    updateData.updatedAt = Timestamp.now()
    
    await updateDoc(docRef, updateData)
  } catch (error) {
    console.error('Erro ao atualizar requisição:', error)
    throw error
  }
}

export async function deleteRequisicao(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erro ao deletar requisição:', error)
    throw error
  }
}
