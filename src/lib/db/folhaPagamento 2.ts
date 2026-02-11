import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { FolhaPagamento, FolhaPagamentoFormaPagamento, FolhaPagamentoRecorrenciaTipo, FolhaPagamentoStatus } from '@/types/financeiro'

const COLLECTION_NAME = 'folhaPagamento'

export async function markFolhaPagamentoMigradaContaPagar(params: {
  folhaPagamentoId: string
  contaPagarId: string
}): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  await updateDoc(doc(db, COLLECTION_NAME, params.folhaPagamentoId), {
    migradoContaPagarId: params.contaPagarId,
  })
}

export async function getFolhaPagamento(id: string): Promise<FolhaPagamento | null> {
  if (!db) throw new Error('Firebase não está inicializado')

  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const rawData = docSnap.data()

    return {
      id: docSnap.id,
      ...rawData,
      dataReferencia: rawData.dataReferencia?.toDate() || new Date(),
      dataPagamento: rawData.dataPagamento?.toDate(),
      createdAt: rawData.createdAt?.toDate() || new Date(),
    } as FolhaPagamento
  } catch (error) {
    console.error('Erro ao buscar folha de pagamento:', error)
    throw error
  }
}

export async function getFolhasPagamento(filters?: {
  status?: FolhaPagamentoStatus
  formaPagamento?: FolhaPagamentoFormaPagamento
}): Promise<FolhaPagamento[]> {
  if (!db) throw new Error('Firebase não está inicializado')

  try {
    const constraints: QueryConstraint[] = []

    if (filters?.status) {
      constraints.push(where('status', '==', filters.status))
    }

    if (filters?.formaPagamento) {
      constraints.push(where('formaPagamento', '==', filters.formaPagamento))
    }

    const q = constraints.length > 0
      ? query(collection(db, COLLECTION_NAME), ...constraints)
      : collection(db, COLLECTION_NAME)

    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((item) => {
      const rawData = item.data()
      return {
        id: item.id,
        ...rawData,
        dataReferencia: rawData.dataReferencia?.toDate() || new Date(),
        dataPagamento: rawData.dataPagamento?.toDate(),
        createdAt: rawData.createdAt?.toDate() || new Date(),
      }
    }) as FolhaPagamento[]
  } catch (error) {
    console.error('Erro ao buscar folhas de pagamento:', error)
    throw error
  }
}

export async function createFolhaPagamento(data: Omit<FolhaPagamento, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')

  try {
    const cleanData: any = {
      funcionarioNome: data.funcionarioNome,
      valor: data.valor,
      valorPago: data.valorPago,
      status: data.status,
      createdBy: data.createdBy,
      dataReferencia: Timestamp.fromDate(data.dataReferencia as Date),
      createdAt: Timestamp.now(),
    }

    if (data.cpf) cleanData.cpf = data.cpf
    if (data.agencia) cleanData.agencia = data.agencia
    if (data.conta) cleanData.conta = data.conta
    if (data.categoriaId) cleanData.categoriaId = data.categoriaId
    if (data.recorrenciaTipo) cleanData.recorrenciaTipo = data.recorrenciaTipo
    if (data.recorrenciaIntervaloDias) cleanData.recorrenciaIntervaloDias = data.recorrenciaIntervaloDias
    if (data.recorrenciaIndeterminada !== undefined) cleanData.recorrenciaIndeterminada = data.recorrenciaIndeterminada
    if (data.recorrenciaDiaUtil !== undefined) cleanData.recorrenciaDiaUtil = data.recorrenciaDiaUtil
    if (data.recorrenciaDiaMes2 !== undefined) cleanData.recorrenciaDiaMes2 = data.recorrenciaDiaMes2
    if (data.recorrenciaGrupoId) cleanData.recorrenciaGrupoId = data.recorrenciaGrupoId
    if (data.recorrenciaIndex) cleanData.recorrenciaIndex = data.recorrenciaIndex
    if (data.recorrenciaTotal) cleanData.recorrenciaTotal = data.recorrenciaTotal

    if (data.formaPagamento) {
      cleanData.formaPagamento = data.formaPagamento
    }

    if (data.dataPagamento) {
      cleanData.dataPagamento = Timestamp.fromDate(data.dataPagamento as Date)
    }

    if (data.comprovanteUrl) {
      cleanData.comprovanteUrl = data.comprovanteUrl
    }

    if (data.observacoes) {
      cleanData.observacoes = data.observacoes
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData)
    return docRef.id
  } catch (error) {
    console.error('Erro ao criar folha de pagamento:', error)
    throw error
  }
}

export async function createFolhasPagamentoRecorrentes(params: {
  base: any
  total: number
  tipo: FolhaPagamentoRecorrenciaTipo
  intervaloDias?: number
  buildDataReferencia: (indexZeroBased: number) => Date
}): Promise<string[]> {
  if (!db) throw new Error('Firebase não está inicializado')

  const total = Math.min(60, Math.max(2, Number(params.total) || 2))
  const groupId = `${params.base.createdBy}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  try {
    const batch = writeBatch(db)
    const ids: string[] = []

    for (let idx = 0; idx < total; idx++) {
      const docRef = doc(collection(db, COLLECTION_NAME))
      const isFirst = idx === 0
      const dataReferencia = params.buildDataReferencia(idx)

      const cleanData: any = {
        funcionarioNome: String(params.base.funcionarioNome || '').trim(),
        valor: Number(params.base.valor) || 0,
        valorPago: isFirst ? Number(params.base.valorPago) || 0 : 0,
        status: isFirst ? params.base.status : 'aberto',
        createdBy: params.base.createdBy,
        dataReferencia: Timestamp.fromDate(dataReferencia),
        createdAt: Timestamp.now(),
        recorrenciaTipo: params.tipo,
        recorrenciaGrupoId: groupId,
        recorrenciaIndex: idx + 1,
        recorrenciaTotal: total,
      }

      if (params.intervaloDias) cleanData.recorrenciaIntervaloDias = params.intervaloDias

      if (params.base.cpf) cleanData.cpf = params.base.cpf
      if (params.base.agencia) cleanData.agencia = params.base.agencia
      if (params.base.conta) cleanData.conta = params.base.conta
      if (params.base.categoriaId) cleanData.categoriaId = params.base.categoriaId
      if (params.base.observacoes) cleanData.observacoes = params.base.observacoes

      if (isFirst && params.base.formaPagamento) {
        cleanData.formaPagamento = params.base.formaPagamento
      }
      if (isFirst && params.base.dataPagamento) {
        cleanData.dataPagamento = Timestamp.fromDate(params.base.dataPagamento as Date)
      }
      if (isFirst && params.base.comprovanteUrl) {
        cleanData.comprovanteUrl = params.base.comprovanteUrl
      }

      batch.set(docRef, cleanData)
      ids.push(docRef.id)
    }

    await batch.commit()
    return ids
  } catch (error) {
    console.error('Erro ao criar folhas recorrentes:', error)
    throw error
  }
}

export async function updateFolhaPagamento(
  id: string,
  data: Partial<Omit<FolhaPagamento, 'id' | 'createdAt' | 'createdBy'>> & {
    formaPagamento?: FolhaPagamentoFormaPagamento | null
    dataPagamento?: Timestamp | Date | null
    comprovanteUrl?: string | null
  }
): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')

  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: any = {}

    if (data.funcionarioNome !== undefined) updateData.funcionarioNome = data.funcionarioNome
    if (data.cpf !== undefined) updateData.cpf = data.cpf
    if (data.agencia !== undefined) updateData.agencia = data.agencia
    if (data.conta !== undefined) updateData.conta = data.conta
    if (data.valor !== undefined) updateData.valor = data.valor
    if (data.valorPago !== undefined) updateData.valorPago = data.valorPago
    if (data.status !== undefined) updateData.status = data.status
    if (data.formaPagamento !== undefined) updateData.formaPagamento = data.formaPagamento
    if (data.comprovanteUrl !== undefined) updateData.comprovanteUrl = data.comprovanteUrl
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes
    if (data.categoriaId !== undefined) updateData.categoriaId = data.categoriaId
    if (data.recorrenciaTipo !== undefined) updateData.recorrenciaTipo = data.recorrenciaTipo
    if (data.recorrenciaIntervaloDias !== undefined) updateData.recorrenciaIntervaloDias = data.recorrenciaIntervaloDias
    if (data.recorrenciaIndeterminada !== undefined) updateData.recorrenciaIndeterminada = data.recorrenciaIndeterminada
    if (data.recorrenciaDiaUtil !== undefined) updateData.recorrenciaDiaUtil = data.recorrenciaDiaUtil
    if (data.recorrenciaDiaMes2 !== undefined) updateData.recorrenciaDiaMes2 = data.recorrenciaDiaMes2
    if (data.recorrenciaGrupoId !== undefined) updateData.recorrenciaGrupoId = data.recorrenciaGrupoId
    if (data.recorrenciaIndex !== undefined) updateData.recorrenciaIndex = data.recorrenciaIndex
    if (data.recorrenciaTotal !== undefined) updateData.recorrenciaTotal = data.recorrenciaTotal

    if (data.dataReferencia) {
      updateData.dataReferencia = Timestamp.fromDate(data.dataReferencia as Date)
    }

    if (data.dataPagamento === null) {
      updateData.dataPagamento = null
    } else if (data.dataPagamento) {
      updateData.dataPagamento = Timestamp.fromDate(data.dataPagamento as Date)
    }

    updateData.updatedAt = Timestamp.now()

    await updateDoc(docRef, updateData)
  } catch (error) {
    console.error('Erro ao atualizar folha de pagamento:', error)
    throw error
  }
}

export async function deleteFolhaPagamento(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')

  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erro ao deletar folha de pagamento:', error)
    throw error
  }
}
