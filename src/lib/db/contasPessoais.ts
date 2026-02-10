import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export interface ContaPessoalCategoria {
  id: string
  nome: string
  createdAt?: Date
}

export interface ContaPessoalLancamento {
  id: string
  categoriaId: string
  descricao?: string
  valor: number
  pago?: boolean
  comprovanteUrl?: string
  migradoContaPagarId?: string
  createdAt?: Date
}

const CATEGORIES_COLLECTION = 'contas_pessoais_categorias'
const ENTRIES_COLLECTION = 'contas_pessoais_lancamentos'

export async function getCategoriasPessoais(): Promise<ContaPessoalCategoria[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const q = query(collection(db, CATEGORIES_COLLECTION), orderBy('nome', 'asc'))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.() || undefined,
    })) as ContaPessoalCategoria[]
  } catch (error) {
    console.error('Erro ao buscar categorias pessoais:', error)
    throw error
  }
}

export async function createCategoriaPessoal(nome: string): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
      nome,
      createdAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar categoria pessoal:', error)
    throw error
  }
}

export async function updateCategoriaPessoal(id: string, nome: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id)
    await updateDoc(docRef, { nome })
  } catch (error) {
    console.error('Erro ao atualizar categoria pessoal:', error)
    throw error
  }
}

export async function deleteCategoriaPessoal(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const batch = writeBatch(db)
    const catRef = doc(db, CATEGORIES_COLLECTION, id)
    batch.delete(catRef)

    const constraints: QueryConstraint[] = [
      where('categoriaId', '==', id),
    ]
    const entriesQuery = query(collection(db, ENTRIES_COLLECTION), ...constraints)
    const entriesSnapshot = await getDocs(entriesQuery)
    entriesSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref)
    })

    await batch.commit()
  } catch (error) {
    console.error('Erro ao deletar categoria pessoal:', error)
    throw error
  }
}

export async function getLancamentosPessoais(filters?: {
  categoriaId?: string
}): Promise<ContaPessoalLancamento[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
    if (filters?.categoriaId) {
      constraints.unshift(where('categoriaId', '==', filters.categoriaId))
    }

    const q = query(collection(db, ENTRIES_COLLECTION), ...constraints)
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      pago: docSnap.data().pago ?? false,
      migradoContaPagarId: docSnap.data().migradoContaPagarId || undefined,
      createdAt: docSnap.data().createdAt?.toDate?.() || undefined,
    })) as ContaPessoalLancamento[]
  } catch (error) {
    console.error('Erro ao buscar lançamentos pessoais:', error)
    throw error
  }
}

export async function marcarLancamentoPessoalMigrado(id: string, contaPagarId: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, ENTRIES_COLLECTION, id)
    await updateDoc(docRef, { migradoContaPagarId: contaPagarId })
  } catch (error) {
    console.error('Erro ao marcar lançamento pessoal como migrado:', error)
    throw error
  }
}

export async function createLancamentoPessoal(data: Omit<ContaPessoalLancamento, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), {
      ...data,
      pago: data.pago ?? false,
      comprovanteUrl: data.comprovanteUrl || '',
      createdAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar lançamento pessoal:', error)
    throw error
  }
}

export async function updateLancamentoPessoalPagamento(id: string, pago: boolean): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, ENTRIES_COLLECTION, id)
    await updateDoc(docRef, { pago })
  } catch (error) {
    console.error('Erro ao atualizar pagamento do lançamento pessoal:', error)
    throw error
  }
}

export async function updateLancamentoPessoalComprovante(id: string, comprovanteUrl: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, ENTRIES_COLLECTION, id)
    await updateDoc(docRef, { comprovanteUrl })
  } catch (error) {
    console.error('Erro ao atualizar comprovante do lançamento pessoal:', error)
    throw error
  }
}

export async function updateLancamentoPessoal(
  id: string,
  data: Partial<Pick<ContaPessoalLancamento, 'descricao' | 'valor'>>
): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const payload: any = {}

    if (data.descricao !== undefined) {
      payload.descricao = data.descricao?.trim() || ''
    }
    if (data.valor !== undefined) {
      payload.valor = data.valor
    }

    const docRef = doc(db, ENTRIES_COLLECTION, id)
    await updateDoc(docRef, payload)
  } catch (error) {
    console.error('Erro ao atualizar lançamento pessoal:', error)
    throw error
  }
}

export async function deleteLancamentoPessoal(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, ENTRIES_COLLECTION, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erro ao deletar lançamento pessoal:', error)
    throw error
  }
}
