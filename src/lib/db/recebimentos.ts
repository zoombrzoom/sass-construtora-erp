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

export interface RecebimentoFisico {
  id: string
  pedidoCompraId: string
  obraId: string
  confirmadoPor: string
  dataRecebimento: Date | Timestamp
  observacoes?: string
  fotos?: string[] // URLs Firebase Storage
  createdAt: Date | Timestamp
}

const COLLECTION_NAME = 'recebimentos'

export async function getRecebimento(id: string): Promise<RecebimentoFisico | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
      dataRecebimento: docSnap.data().dataRecebimento?.toDate() || new Date(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as RecebimentoFisico
  } catch (error) {
    console.error('Erro ao buscar recebimento:', error)
    throw error
  }
}

export async function getRecebimentos(filters?: { 
  pedidoCompraId?: string
  obraId?: string
}): Promise<RecebimentoFisico[]> {
  try {
    const constraints: QueryConstraint[] = []
    
    if (filters?.pedidoCompraId) {
      constraints.push(where('pedidoCompraId', '==', filters.pedidoCompraId))
    }
    
    if (filters?.obraId) {
      constraints.push(where('obraId', '==', filters.obraId))
    }
    
    const q = constraints.length > 0 
      ? query(collection(db, COLLECTION_NAME), ...constraints)
      : collection(db, COLLECTION_NAME)
    
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dataRecebimento: doc.data().dataRecebimento?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as RecebimentoFisico[]
  } catch (error) {
    console.error('Erro ao buscar recebimentos:', error)
    throw error
  }
}

export async function createRecebimento(data: Omit<RecebimentoFisico, 'id' | 'createdAt'>): Promise<string> {
  try {
    const cleanData: any = {
      pedidoCompraId: data.pedidoCompraId,
      obraId: data.obraId,
      confirmadoPor: data.confirmadoPor,
      dataRecebimento: Timestamp.fromDate(data.dataRecebimento as Date),
      createdAt: Timestamp.now(),
    }

    if (data.observacoes) {
      cleanData.observacoes = data.observacoes
    }
    if (data.fotos && data.fotos.length > 0) {
      cleanData.fotos = data.fotos
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData)
    
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar recebimento:', error)
    throw error
  }
}

export async function updateRecebimento(id: string, data: Partial<Omit<RecebimentoFisico, 'id' | 'createdAt'>>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: any = { ...data }
    
    if (data.dataRecebimento) {
      updateData.dataRecebimento = Timestamp.fromDate(data.dataRecebimento as Date)
    }
    
    await updateDoc(docRef, updateData)
  } catch (error) {
    console.error('Erro ao atualizar recebimento:', error)
    throw error
  }
}

export async function deleteRecebimento(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erro ao deletar recebimento:', error)
    throw error
  }
}
