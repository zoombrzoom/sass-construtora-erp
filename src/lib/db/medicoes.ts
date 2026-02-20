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
  Timestamp,
  type QueryConstraint
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { pushUndoable } from '@/lib/undo/undoStore'
import { Medicao } from '@/types/medicao'

const COLLECTION_NAME = 'medicoes'

function calcularValorLiberado(valorTotal: number, percentualExecutado: number): number {
  return valorTotal * (percentualExecutado / 100)
}

export async function getMedicao(id: string): Promise<Medicao | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
      dataMedicao: docSnap.data().dataMedicao?.toDate() || new Date(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as Medicao
  } catch (error) {
    console.error('Erro ao buscar medição:', error)
    throw error
  }
}

export async function getMedicoes(filters?: { 
  obraId?: string
}): Promise<Medicao[]> {
  try {
    const constraints: QueryConstraint[] = []
    
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
      dataMedicao: doc.data().dataMedicao?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Medicao[]
  } catch (error) {
    console.error('Erro ao buscar medições:', error)
    throw error
  }
}

export async function createMedicao(data: Omit<Medicao, 'id' | 'valorLiberado' | 'createdAt'>): Promise<string> {
  try {
    const valorLiberado = calcularValorLiberado(data.valorTotal, data.percentualExecutado)
    
    const cleanData: any = {
      obraId: data.obraId,
      empreiteiro: data.empreiteiro,
      servico: data.servico,
      percentualExecutado: data.percentualExecutado,
      valorTotal: data.valorTotal,
      valorLiberado,
      dataMedicao: Timestamp.fromDate(data.dataMedicao as Date),
      createdBy: data.createdBy,
      createdAt: Timestamp.now(),
    }

    if (data.observacoes) {
      cleanData.observacoes = data.observacoes
    }
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData)
    const id = docRef.id

    pushUndoable({
      description: 'Criar medição',
      undo: async () => deleteDoc(doc(db, COLLECTION_NAME, id)),
      redo: async () => addDoc(collection(db, COLLECTION_NAME), cleanData),
    })

    return id
  } catch (error) {
    console.error('Erro ao criar medição:', error)
    throw error
  }
}

export async function updateMedicao(id: string, data: Partial<Omit<Medicao, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? snapshot.data() : null

    const updateData: any = { ...data }
    
    // Recalcular valor liberado se necessário
    if (data.valorTotal !== undefined || data.percentualExecutado !== undefined) {
      const medicaoAtual = await getMedicao(id)
      if (medicaoAtual) {
        const valorTotal = data.valorTotal ?? medicaoAtual.valorTotal
        const percentualExecutado = data.percentualExecutado ?? medicaoAtual.percentualExecutado
        updateData.valorLiberado = calcularValorLiberado(valorTotal, percentualExecutado)
      }
    }
    
    if (data.dataMedicao) {
      updateData.dataMedicao = Timestamp.fromDate(data.dataMedicao as Date)
    }

    await updateDoc(docRef, updateData)

    if (previousData) {
      pushUndoable({
        description: 'Editar medição',
        undo: async () => updateDoc(docRef, previousData),
        redo: async () => updateDoc(docRef, updateData),
      })
    }
  } catch (error) {
    console.error('Erro ao atualizar medição:', error)
    throw error
  }
}

export async function deleteMedicao(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? { ...snapshot.data() } : null

    await deleteDoc(docRef)

    if (previousData) {
      pushUndoable({
        description: 'Excluir medição',
        undo: async () => setDoc(doc(db, COLLECTION_NAME, id), previousData),
        redo: async () => deleteDoc(docRef),
      })
    }
  } catch (error) {
    console.error('Erro ao deletar medição:', error)
    throw error
  }
}
