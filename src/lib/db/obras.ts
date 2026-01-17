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
import { Obra, ObraStatus } from '@/types/obra'

const COLLECTION_NAME = 'obras'

export async function getObra(id: string): Promise<Obra | null> {
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
      updatedAt: docSnap.data().updatedAt?.toDate(),
    } as Obra
  } catch (error) {
    console.error('Erro ao buscar obra:', error)
    throw error
  }
}

export async function getObras(filters?: { status?: ObraStatus }): Promise<Obra[]> {
  try {
    const constraints: QueryConstraint[] = []
    
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
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Obra[]
  } catch (error) {
    console.error('Erro ao buscar obras:', error)
    throw error
  }
}

export async function createObra(data: Omit<Obra, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar obra:', error)
    throw error
  }
}

export async function updateObra(id: string, data: Partial<Omit<Obra, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Erro ao atualizar obra:', error)
    throw error
  }
}

export async function deleteObra(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erro ao deletar obra:', error)
    throw error
  }
}
