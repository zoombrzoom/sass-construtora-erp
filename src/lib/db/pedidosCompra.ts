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
import { PedidoCompra, PedidoCompraStatus } from '@/types/compras'

const COLLECTION_NAME = 'pedidosCompra'

export async function getPedidoCompra(id: string): Promise<PedidoCompra | null> {
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
    } as PedidoCompra
  } catch (error) {
    console.error('Erro ao buscar pedido de compra:', error)
    throw error
  }
}

export async function getPedidosCompra(filters?: { 
  cotacaoId?: string
  status?: PedidoCompraStatus
}): Promise<PedidoCompra[]> {
  try {
    const constraints: QueryConstraint[] = []
    
    if (filters?.cotacaoId) {
      constraints.push(where('cotacaoId', '==', filters.cotacaoId))
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
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as PedidoCompra[]
  } catch (error) {
    console.error('Erro ao buscar pedidos de compra:', error)
    throw error
  }
}

export async function createPedidoCompra(data: Omit<PedidoCompra, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      createdAt: Timestamp.now(),
    })
    
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar pedido de compra:', error)
    throw error
  }
}

export async function updatePedidoCompra(id: string, data: Partial<Omit<PedidoCompra, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, data)
  } catch (error) {
    console.error('Erro ao atualizar pedido de compra:', error)
    throw error
  }
}

export async function deletePedidoCompra(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erro ao deletar pedido de compra:', error)
    throw error
  }
}
