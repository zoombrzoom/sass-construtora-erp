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
import { Cotacao, CotacaoStatus } from '@/types/compras'

const COLLECTION_NAME = 'cotacoes'

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
      aprovadoEm: docSnap.data().aprovadoEm?.toDate(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as Cotacao
  } catch (error) {
    console.error('Erro ao buscar cotação:', error)
    throw error
  }
}

export async function getCotacoes(filters?: { 
  requisicaoId?: string
  status?: CotacaoStatus
}): Promise<Cotacao[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const constraints: QueryConstraint[] = []
    
    if (filters?.requisicaoId) {
      constraints.push(where('requisicaoId', '==', filters.requisicaoId))
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
      aprovadoEm: doc.data().aprovadoEm?.toDate(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Cotacao[]
  } catch (error) {
    console.error('Erro ao buscar cotações:', error)
    throw error
  }
}

export async function createCotacao(data: Omit<Cotacao, 'id' | 'menorPreco' | 'fornecedorMenorPreco' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const { menorPreco, fornecedorMenorPreco } = calcularMenorPreco(data)
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      menorPreco,
      fornecedorMenorPreco,
      createdAt: Timestamp.now(),
    })
    
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar cotação:', error)
    throw error
  }
}

export async function updateCotacao(id: string, data: Partial<Omit<Cotacao, 'id' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: any = { ...data }
    
    // Recalcular menor preço se os preços mudaram
    if (data.fornecedorA || data.fornecedorB || data.fornecedorC) {
      const cotacaoAtual = await getCotacao(id)
      if (cotacaoAtual) {
        const cotacaoAtualizada = {
          ...cotacaoAtual,
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
  } catch (error) {
    console.error('Erro ao atualizar cotação:', error)
    throw error
  }
}

export async function deleteCotacao(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erro ao deletar cotação:', error)
    throw error
  }
}
