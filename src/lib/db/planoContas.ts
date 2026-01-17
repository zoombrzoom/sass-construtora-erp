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
  type QueryConstraint
} from 'firebase/firestore'
import { db } from '../firebase/config'

export type PlanoContasCategoria = 'material' | 'mao_obra' | 'admin'

export interface PlanoContas {
  id: string
  codigo: string
  descricao: string
  categoria: PlanoContasCategoria
}

const COLLECTION_NAME = 'planoContas'

export async function getPlanoConta(id: string): Promise<PlanoContas | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as PlanoContas
  } catch (error) {
    console.error('Erro ao buscar plano de contas:', error)
    throw error
  }
}

export async function getPlanoContas(filters?: { 
  categoria?: PlanoContasCategoria
}): Promise<PlanoContas[]> {
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
    })) as PlanoContas[]
  } catch (error) {
    console.error('Erro ao buscar plano de contas:', error)
    throw error
  }
}

export async function createPlanoConta(data: Omit<PlanoContas, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), data)
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar plano de contas:', error)
    throw error
  }
}

export async function updatePlanoConta(id: string, data: Partial<Omit<PlanoContas, 'id'>>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, data)
  } catch (error) {
    console.error('Erro ao atualizar plano de contas:', error)
    throw error
  }
}

export async function deletePlanoConta(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erro ao deletar plano de contas:', error)
    throw error
  }
}
