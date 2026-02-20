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
import { Cotacao, CotacaoStatus } from '@/types/compras'
import { getCachedValue, invalidateCachePrefix, makeCacheKey } from './cache'

const COLLECTION_NAME = 'cotacoes'
const READ_CACHE_TTL_MS = 20 * 1000
const LIST_CACHE_SCOPE = `${COLLECTION_NAME}:list`
const ITEM_CACHE_SCOPE = `${COLLECTION_NAME}:item`

function invalidateCotacoesCache(): void {
  invalidateCachePrefix(LIST_CACHE_SCOPE)
  invalidateCachePrefix(ITEM_CACHE_SCOPE)
}

function getFirestoreInstance() {
  if (!db) throw new Error('Firebase não está inicializado')
  return db
}

function mapCotacaoDoc(docSnap: any): Cotacao {
  return {
    id: docSnap.id,
    ...docSnap.data(),
    aprovadoEm: docSnap.data().aprovadoEm?.toDate(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
  } as Cotacao
}

function calcularMenorPreco(cotacao: Omit<Cotacao, 'id' | 'menorPreco' | 'fornecedorMenorPreco' | 'createdAt'>): { menorPreco: number, fornecedorMenorPreco: string } {
  // Verificar se é a estrutura antiga (com preco direto) ou nova (com precosPorItem)
  const fornecedorA = cotacao.fornecedorA as any
  const fornecedorB = cotacao.fornecedorB as any
  const fornecedorC = cotacao.fornecedorC as any

  // Se for estrutura antiga (tem preco direto)
  if (fornecedorA.preco !== undefined && typeof fornecedorA.preco === 'number') {
    const precos = [
      { preco: fornecedorA.preco, fornecedor: 'A' },
      { preco: fornecedorB.preco, fornecedor: 'B' },
      { preco: fornecedorC.preco, fornecedor: 'C' },
    ]
    
    const menor = precos.reduce((min, atual) => 
      atual.preco < min.preco ? atual : min
    )
    
    return {
      menorPreco: menor.preco,
      fornecedorMenorPreco: menor.fornecedor,
    }
  }

  // Estrutura nova: calcular soma total de preços por fornecedor
  const itensSelecionados = cotacao.itensSelecionados || []
  const totais = [
    { 
      total: itensSelecionados.reduce((sum, itemIndex) => 
        sum + (fornecedorA.precosPorItem?.[itemIndex] || 0), 0
      ), 
      fornecedor: 'A' 
    },
    { 
      total: itensSelecionados.reduce((sum, itemIndex) => 
        sum + (fornecedorB.precosPorItem?.[itemIndex] || 0), 0
      ), 
      fornecedor: 'B' 
    },
    { 
      total: itensSelecionados.reduce((sum, itemIndex) => 
        sum + (fornecedorC.precosPorItem?.[itemIndex] || 0), 0
      ), 
      fornecedor: 'C' 
    },
  ]

  const menor = totais.reduce((min, atual) => 
    (atual.total > 0 && (min.total === 0 || atual.total < min.total)) ? atual : min
  )
  
  return {
    menorPreco: menor.total,
    fornecedorMenorPreco: menor.fornecedor,
  }
}

export async function getCotacao(id: string): Promise<Cotacao | null> {
  const firestore = getFirestoreInstance()
  const cacheKey = makeCacheKey(ITEM_CACHE_SCOPE, { id })
  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const docRef = doc(firestore, COLLECTION_NAME, id)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          return null
        }

        return mapCotacaoDoc(docSnap)
      } catch (error) {
        console.error('Erro ao buscar cotação:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function getCotacoes(filters?: { 
  requisicaoId?: string
  status?: CotacaoStatus
}): Promise<Cotacao[]> {
  const firestore = getFirestoreInstance()
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE, filters ?? {})
  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const constraints: QueryConstraint[] = []

        if (filters?.requisicaoId) {
          constraints.push(where('requisicaoId', '==', filters.requisicaoId))
        }

        if (filters?.status) {
          constraints.push(where('status', '==', filters.status))
        }

        const q = constraints.length > 0
          ? query(collection(firestore, COLLECTION_NAME), ...constraints)
          : collection(firestore, COLLECTION_NAME)

        const querySnapshot = await getDocs(q)

        return querySnapshot.docs.map((item) => mapCotacaoDoc(item)) as Cotacao[]
      } catch (error) {
        console.error('Erro ao buscar cotações:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function createCotacao(data: Omit<Cotacao, 'id' | 'menorPreco' | 'fornecedorMenorPreco' | 'createdAt'>): Promise<string> {
  const firestore = getFirestoreInstance()
  try {
    const { menorPreco, fornecedorMenorPreco } = calcularMenorPreco(data)
    
    const cleanData = { ...data, menorPreco, fornecedorMenorPreco, createdAt: Timestamp.now() }
    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), cleanData)
    const id = docRef.id

    pushUndoable({
      description: 'Criar cotação',
      undo: async () => {
        await deleteDoc(doc(firestore, COLLECTION_NAME, id))
        invalidateCotacoesCache()
      },
      redo: async () => {
        await addDoc(collection(firestore, COLLECTION_NAME), cleanData)
        invalidateCotacoesCache()
      },
    })

    invalidateCotacoesCache()
    return id
  } catch (error) {
    console.error('Erro ao criar cotação:', error)
    throw error
  }
}

export async function updateCotacao(id: string, data: Partial<Omit<Cotacao, 'id' | 'createdAt'>>): Promise<void> {
  const firestore = getFirestoreInstance()
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? snapshot.data() : null

    const updateData: any = { ...data }
    
    // Recalcular menor preço se os preços mudaram
    if (data.fornecedorA || data.fornecedorB || data.fornecedorC) {
      const baseData = previousData
        ? ({
            id,
            ...previousData,
          } as Cotacao)
        : await getCotacao(id)

      if (baseData) {
        const cotacaoAtualizada = {
          ...baseData,
          ...updateData,
        }
        const { menorPreco, fornecedorMenorPreco } = calcularMenorPreco(cotacaoAtualizada)
        updateData.menorPreco = menorPreco
        updateData.fornecedorMenorPreco = fornecedorMenorPreco
      }
    }
    
    if (data.aprovadoEm) {
      updateData.aprovadoEm = Timestamp.fromDate(data.aprovadoEm as Date)
    }

    await updateDoc(docRef, updateData)
    invalidateCotacoesCache()

    if (previousData) {
      pushUndoable({
        description: 'Editar cotação',
        undo: async () => {
          await updateDoc(docRef, previousData)
          invalidateCotacoesCache()
        },
        redo: async () => {
          await updateDoc(docRef, updateData)
          invalidateCotacoesCache()
        },
      })
    }
  } catch (error) {
    console.error('Erro ao atualizar cotação:', error)
    throw error
  }
}

export async function deleteCotacao(id: string): Promise<void> {
  const firestore = getFirestoreInstance()
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? { ...snapshot.data() } : null

    await deleteDoc(docRef)
    invalidateCotacoesCache()

    if (previousData) {
      pushUndoable({
        description: 'Excluir cotação',
        undo: async () => {
          await setDoc(doc(firestore, COLLECTION_NAME, id), previousData)
          invalidateCotacoesCache()
        },
        redo: async () => {
          await deleteDoc(docRef)
          invalidateCotacoesCache()
        },
      })
    }
  } catch (error) {
    console.error('Erro ao deletar cotação:', error)
    throw error
  }
}
