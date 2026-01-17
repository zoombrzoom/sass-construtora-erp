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
import { ContaPagar, ContaPagarStatus } from '@/types/financeiro'

const COLLECTION_NAME = 'contasPagar'

export async function getContaPagar(id: string): Promise<ContaPagar | null> {
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
      dataPagamento: docSnap.data().dataPagamento?.toDate(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as ContaPagar
  } catch (error) {
    console.error('Erro ao buscar conta a pagar:', error)
    throw error
  }
}

export async function getContasPagar(filters?: { 
  obraId?: string
  status?: ContaPagarStatus
  dataVencimentoInicio?: Date
  dataVencimentoFim?: Date
}): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const constraints: QueryConstraint[] = []
    
    if (filters?.obraId) {
      constraints.push(where('obraId', '==', filters.obraId))
    }
    
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status))
    }
    
    // Nota: Firestore não suporta range queries em múltiplos campos
    // Para filtros de data, seria necessário fazer no cliente ou usar índices compostos
    
    const q = constraints.length > 0 
      ? query(collection(db, COLLECTION_NAME), ...constraints)
      : collection(db, COLLECTION_NAME)
    
    const querySnapshot = await getDocs(q)
    
    let results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dataVencimento: doc.data().dataVencimento?.toDate() || new Date(),
      dataPagamento: doc.data().dataPagamento?.toDate(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as ContaPagar[]
    
    // Filtro de data no cliente (se necessário)
    if (filters?.dataVencimentoInicio || filters?.dataVencimentoFim) {
      results = results.filter(conta => {
        const dataVenc = new Date(conta.dataVencimento)
        if (filters.dataVencimentoInicio && dataVenc < filters.dataVencimentoInicio) return false
        if (filters.dataVencimentoFim && dataVenc > filters.dataVencimentoFim) return false
        return true
      })
    }
    
    return results
  } catch (error) {
    console.error('Erro ao buscar contas a pagar:', error)
    throw error
  }
}

export async function createContaPagar(data: Omit<ContaPagar, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    // Remover campos undefined (Firestore não aceita undefined)
    const cleanData: any = {
      valor: data.valor,
      dataVencimento: Timestamp.fromDate(data.dataVencimento as Date),
      tipo: data.tipo,
      obraId: data.obraId,
      status: data.status,
      createdBy: data.createdBy,
    }

    // Adicionar campos opcionais apenas se existirem
    if (data.comprovanteUrl) {
      cleanData.comprovanteUrl = data.comprovanteUrl
    }
    if (data.descricao) {
      cleanData.descricao = data.descricao
    }
    if (data.dataPagamento) {
      cleanData.dataPagamento = Timestamp.fromDate(data.dataPagamento as Date)
    }
    if (data.rateio && data.rateio.length > 0) {
      cleanData.rateio = data.rateio
    }

    cleanData.createdAt = Timestamp.now()

    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData)
    
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar conta a pagar:', error)
    throw error
  }
}

export async function updateContaPagar(id: string, data: Partial<Omit<ContaPagar, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: any = {}
    
    // Adicionar apenas campos que foram fornecidos e não são undefined
    if (data.valor !== undefined) updateData.valor = data.valor
    if (data.tipo !== undefined) updateData.tipo = data.tipo
    if (data.obraId !== undefined) updateData.obraId = data.obraId
    if (data.status !== undefined) updateData.status = data.status
    if (data.comprovanteUrl !== undefined) updateData.comprovanteUrl = data.comprovanteUrl
    if (data.descricao !== undefined) updateData.descricao = data.descricao
    if (data.rateio !== undefined) updateData.rateio = data.rateio
    
    if (data.dataVencimento) {
      updateData.dataVencimento = Timestamp.fromDate(data.dataVencimento as Date)
    }
    if (data.dataPagamento) {
      updateData.dataPagamento = Timestamp.fromDate(data.dataPagamento as Date)
    }
    
    updateData.updatedAt = Timestamp.now()
    
    await updateDoc(docRef, updateData)
  } catch (error) {
    console.error('Erro ao atualizar conta a pagar:', error)
    throw error
  }
}

export async function deleteContaPagar(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erro ao deletar conta a pagar:', error)
    throw error
  }
}
