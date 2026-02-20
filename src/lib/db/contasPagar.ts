import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { pushUndoable } from '@/lib/undo/undoStore'
import { ComprovanteMensal, ContaPagar, ContaPagarStatus, ContaPagarTipo } from '@/types/financeiro'
import { toDate } from '@/utils/date'
import { getCachedValue, invalidateCachePrefix, makeCacheKey } from './cache'

const COLLECTION_NAME = 'contasPagar'
const READ_CACHE_TTL_MS = 20 * 1000
const LIST_CACHE_SCOPE = `${COLLECTION_NAME}:list`
const ITEM_CACHE_SCOPE = `${COLLECTION_NAME}:item`

function invalidateContasPagarCache(): void {
  invalidateCachePrefix(LIST_CACHE_SCOPE)
  invalidateCachePrefix(ITEM_CACHE_SCOPE)
}

function mapContaPagarDoc(docItem: any): ContaPagar {
  const data = docItem.data()
  return {
    id: docItem.id,
    ...data,
    dataVencimento: data.dataVencimento?.toDate() || new Date(),
    dataPagamento: data.dataPagamento?.toDate(),
    createdAt: data.createdAt?.toDate() || new Date(),
    comprovantesMensais: normalizeComprovantesMensais(data.comprovantesMensais),
  } as ContaPagar
}

export type ContaPagarPageCursor = QueryDocumentSnapshot<DocumentData> | null

export interface GetContasPagarPageParams {
  obraId?: string
  status?: ContaPagarStatus
  tipo?: ContaPagarTipo
  dataVencimentoInicio?: Date
  dataVencimentoFim?: Date
  includeParticular?: boolean
  cursor?: ContaPagarPageCursor
  limitCount?: number
}

export interface GetContasPagarPageResult {
  items: ContaPagar[]
  nextCursor: ContaPagarPageCursor
  hasMore: boolean
}

function normalizeComprovantesMensais(value: any): ComprovanteMensal[] | undefined {
  if (!Array.isArray(value)) return undefined

  const normalized: ComprovanteMensal[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object' || !item.url || !item.mesReferencia) continue
    const enviadoEm = item.enviadoEm?.toDate
      ? item.enviadoEm.toDate()
      : item.enviadoEm
        ? new Date(item.enviadoEm)
        : undefined

    normalized.push({
      parcela: Number(item.parcela) || 1,
      mesReferencia: String(item.mesReferencia),
      url: String(item.url),
      nomeArquivo: item.nomeArquivo ? String(item.nomeArquivo) : undefined,
      enviadoEm: enviadoEm && !Number.isNaN(enviadoEm.getTime()) ? enviadoEm : undefined,
    })
  }

  return normalized.length > 0 ? normalized : undefined
}

function serializeComprovantesMensais(value?: ComprovanteMensal[]): any[] | undefined {
  if (!value || value.length === 0) return undefined

  return value.map((item) => ({
    parcela: item.parcela,
    mesReferencia: item.mesReferencia,
    url: item.url,
    nomeArquivo: item.nomeArquivo || '',
    enviadoEm: item.enviadoEm
      ? (item.enviadoEm as any)?.toDate
        ? (item.enviadoEm as any)
        : Timestamp.fromDate(item.enviadoEm as Date)
      : Timestamp.now(),
  }))
}

function addMonthsKeepingDay(value: Date, monthsToAdd: number): Date {
  const base = new Date(value)
  const baseDay = base.getDate()
  const shifted = new Date(base.getFullYear(), base.getMonth() + monthsToAdd, 1, 12, 0, 0, 0)
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate()
  shifted.setDate(Math.min(baseDay, lastDay))
  return shifted
}

function buildContaPagarCreateData(data: Omit<ContaPagar, 'id' | 'createdAt'>): any {
  const cleanData: any = {
    valor: data.valor,
    dataVencimento: Timestamp.fromDate(data.dataVencimento as Date),
    tipo: data.tipo,
    obraId: data.obraId,
    status: data.status,
    createdBy: data.createdBy,
    createdAt: Timestamp.now(),
  }

  if (data.pessoal !== undefined) cleanData.pessoal = data.pessoal
  if (data.folhaPagamentoId) cleanData.folhaPagamentoId = data.folhaPagamentoId
  if (data.folhaFuncionarioId) cleanData.folhaFuncionarioId = data.folhaFuncionarioId
  if (data.comprovanteUrl) cleanData.comprovanteUrl = data.comprovanteUrl
  if (data.boletoUrl) cleanData.boletoUrl = data.boletoUrl
  if (data.linhaDigitavel) cleanData.linhaDigitavel = data.linhaDigitavel
  if (data.codigoBarras) cleanData.codigoBarras = data.codigoBarras
  if (data.formaPagamento) cleanData.formaPagamento = data.formaPagamento
  if (data.contaPagamento) cleanData.contaPagamento = data.contaPagamento
  if (data.favorecido) cleanData.favorecido = data.favorecido
  if (data.banco) cleanData.banco = data.banco
  if (data.agencia) cleanData.agencia = data.agencia
  if (data.conta) cleanData.conta = data.conta
  if (data.chavePix) cleanData.chavePix = data.chavePix
  if (data.descricao) cleanData.descricao = data.descricao
  if (data.dataPagamento) cleanData.dataPagamento = Timestamp.fromDate(data.dataPagamento as Date)
  if (data.rateio && data.rateio.length > 0) cleanData.rateio = data.rateio
  if (data.parcelaAtual !== undefined) cleanData.parcelaAtual = data.parcelaAtual
  if (data.totalParcelas !== undefined) cleanData.totalParcelas = data.totalParcelas
  if (data.grupoParcelamentoId) cleanData.grupoParcelamentoId = data.grupoParcelamentoId
  if (data.recorrenciaMensal !== undefined) cleanData.recorrenciaMensal = data.recorrenciaMensal

  const comprovantesMensais = serializeComprovantesMensais(data.comprovantesMensais)
  if (comprovantesMensais) cleanData.comprovantesMensais = comprovantesMensais

  return cleanData
}

export async function getContaPagar(id: string): Promise<ContaPagar | null> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
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

        const data = docSnap.data()

        return {
          id: docSnap.id,
          ...data,
          dataVencimento: data.dataVencimento?.toDate() || new Date(),
          dataPagamento: data.dataPagamento?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          comprovantesMensais: normalizeComprovantesMensais(data.comprovantesMensais),
        } as ContaPagar
      } catch (error) {
        console.error('Erro ao buscar conta a pagar:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function getContasPagar(filters?: {
  obraId?: string
  status?: ContaPagarStatus
  dataVencimentoInicio?: Date
  dataVencimentoFim?: Date
  includeParticular?: boolean
}): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE, {
    type: 'getContasPagar',
    filters: filters ?? {},
  })
  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const includeParticular = filters?.includeParticular ?? false
        const hasDateRange = Boolean(filters?.dataVencimentoInicio || filters?.dataVencimentoFim)

        const buildConstraints = (options: { includeObra: boolean; includeParticularFilter: boolean }) => {
          const constraints: QueryConstraint[] = []

          if (options.includeObra && filters?.obraId) {
            constraints.push(where('obraId', '==', filters.obraId))
          }

          if (filters?.dataVencimentoInicio) {
            constraints.push(where('dataVencimento', '>=', Timestamp.fromDate(filters.dataVencimentoInicio)))
          }

          if (filters?.dataVencimentoFim) {
            constraints.push(where('dataVencimento', '<=', Timestamp.fromDate(filters.dataVencimentoFim)))
          }

          if (hasDateRange) {
            constraints.push(orderBy('dataVencimento', 'desc'))
          }

          // Quando não há filtro de data, mantemos o filtro no servidor para reduzir leitura.
          // Com range de data ativo, este filtro pode exigir combinações inválidas de índices;
          // nesse caso filtramos no cliente.
          if (options.includeParticularFilter && !includeParticular && !hasDateRange) {
            constraints.push(where('tipo', '!=', 'particular'))
          }

          return constraints
        }

        let querySnapshot
        try {
          const constraints = buildConstraints({ includeObra: true, includeParticularFilter: true })
          const q = constraints.length > 0
            ? query(collection(firestore, COLLECTION_NAME), ...constraints)
            : collection(firestore, COLLECTION_NAME)
          querySnapshot = await getDocs(q)
        } catch (primaryError) {
          if (!hasDateRange) throw primaryError
          console.warn('Fallback getContasPagar: consulta simplificada por dataVencimento', primaryError)

          const fallbackConstraints = buildConstraints({ includeObra: false, includeParticularFilter: false })
          const fallbackQuery = fallbackConstraints.length > 0
            ? query(collection(firestore, COLLECTION_NAME), ...fallbackConstraints)
            : collection(firestore, COLLECTION_NAME)
          querySnapshot = await getDocs(fallbackQuery)
        }

        let results = querySnapshot.docs.map(mapContaPagarDoc) as ContaPagar[]

        if (filters?.obraId) {
          results = results.filter(conta => conta.obraId === filters.obraId)
        }

        if (!includeParticular) {
          results = results.filter(conta => conta.tipo !== 'particular')
        }

        if (filters?.status) {
          results = results.filter(conta => conta.status === filters.status)
        }

        if (filters?.dataVencimentoInicio || filters?.dataVencimentoFim) {
          results = results.filter(conta => {
            const dataVenc = toDate(conta.dataVencimento)
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
    },
    READ_CACHE_TTL_MS
  )
}

export async function getContasPagarPage(params?: GetContasPagarPageParams): Promise<GetContasPagarPageResult> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db

  const includeParticular = params?.includeParticular ?? false
  const pageSize = Math.max(20, Math.min(300, Number(params?.limitCount) || 120))
  const fallbackOffset =
    params?.cursor && typeof params.cursor === 'object' && '__fallbackOffset' in (params.cursor as any)
      ? Number((params.cursor as any).__fallbackOffset || 0)
      : null

  if (!includeParticular && params?.tipo === 'particular') {
    return { items: [], nextCursor: null, hasMore: false }
  }

  const applyClientFilters = (items: ContaPagar[]) => {
    return items.filter((item) => {
      if (!includeParticular && item.tipo === 'particular') return false
      if (params?.obraId && item.obraId !== params.obraId) return false
      if (params?.status && item.status !== params.status) return false
      if (params?.tipo && item.tipo !== params.tipo) return false
      if (params?.dataVencimentoInicio && toDate(item.dataVencimento) < params.dataVencimentoInicio) return false
      if (params?.dataVencimentoFim && toDate(item.dataVencimento) > params.dataVencimentoFim) return false
      return true
    })
  }

  const sortByDataVencimentoDesc = (a: ContaPagar, b: ContaPagar) => {
    const byVencimento = toDate(b.dataVencimento).getTime() - toDate(a.dataVencimento).getTime()
    if (byVencimento !== 0) return byVencimento
    const byCreatedAt = toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
    if (byCreatedAt !== 0) return byCreatedAt
    return b.id.localeCompare(a.id)
  }

  const buildFallbackPage = async (options?: { offset?: number; cursorId?: string }) => {
    const all = await getContasPagar({
      obraId: params?.obraId,
      status: params?.status,
      dataVencimentoInicio: params?.dataVencimentoInicio,
      dataVencimentoFim: params?.dataVencimentoFim,
      includeParticular,
    })
    const filtered = applyClientFilters(all)
    const sorted = [...filtered].sort(sortByDataVencimentoDesc)

    let offset = Math.max(0, options?.offset || 0)
    if (options?.cursorId) {
      const cursorIndex = sorted.findIndex((item) => item.id === options.cursorId)
      offset = cursorIndex >= 0 ? cursorIndex + 1 : 0
    }

    const pageItems = sorted.slice(offset, offset + pageSize)
    const nextOffset = offset + pageItems.length
    const hasMore = nextOffset < sorted.length

    return {
      items: pageItems,
      nextCursor: hasMore ? ({ __fallbackOffset: nextOffset } as unknown as ContaPagarPageCursor) : null,
      hasMore,
    }
  }

  if (fallbackOffset !== null) {
    return buildFallbackPage({ offset: fallbackOffset })
  }

  try {
    const constraints: QueryConstraint[] = []

    if (params?.obraId) {
      constraints.push(where('obraId', '==', params.obraId))
    }

    if (params?.status) {
      constraints.push(where('status', '==', params.status))
    }

    if (params?.tipo) {
      constraints.push(where('tipo', '==', params.tipo))
    }

    if (params?.dataVencimentoInicio) {
      constraints.push(where('dataVencimento', '>=', Timestamp.fromDate(params.dataVencimentoInicio)))
    }

    if (params?.dataVencimentoFim) {
      constraints.push(where('dataVencimento', '<=', Timestamp.fromDate(params.dataVencimentoFim)))
    }

    if (params?.dataVencimentoInicio || params?.dataVencimentoFim) {
      constraints.push(orderBy('dataVencimento', 'desc'))
    } else {
      constraints.push(orderBy('createdAt', 'desc'))
    }

    constraints.push(limit(pageSize + 1))

    if (params?.cursor) {
      constraints.push(startAfter(params.cursor))
    }

    const q = query(collection(firestore, COLLECTION_NAME), ...constraints)
    const querySnapshot = await getDocs(q)
    let docs = querySnapshot.docs

    if (!includeParticular && !params?.tipo) {
      docs = docs.filter((docItem) => docItem.data().tipo !== 'particular')
    }

    const items = docs.slice(0, pageSize).map(mapContaPagarDoc) as ContaPagar[]
    const hasMore = docs.length > pageSize
    const nextCursor = hasMore ? docs[pageSize - 1] : null

    return {
      items,
      nextCursor,
      hasMore,
    }
  } catch (error) {
    console.warn('Falha ao paginar contas a pagar, usando fallback com lista completa:', error)
    const cursorId =
      params?.cursor && typeof params.cursor === 'object' && 'id' in (params.cursor as any)
        ? String((params.cursor as any).id || '')
        : undefined
    return buildFallbackPage({ cursorId })
  }
}

export async function getContasPagarPorTipo(tipo: ContaPagarTipo): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE, { type: 'getContasPagarPorTipo', tipo })
  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const q = query(collection(firestore, COLLECTION_NAME), where('tipo', '==', tipo))
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(mapContaPagarDoc) as ContaPagar[]
      } catch (error) {
        console.error('Erro ao buscar contas por tipo:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function getContasPagarPessoais(params?: {
  includeParticular?: boolean
}): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  const includeParticular = params?.includeParticular ?? false

  const isContaPessoal = (conta: Partial<ContaPagar>): boolean => {
    const obra = String((conta as any)?.obraId || '').trim().toUpperCase()
    return Boolean((conta as any)?.pessoal) || obra === 'PESSOAL'
  }

  const baseConstraints: QueryConstraint[] = []
  // Evita falhar por regras de segurança quando o perfil nao pode ler "particular".
  if (!includeParticular) {
    baseConstraints.push(where('tipo', '!=', 'particular'))
  }

  // Firestore nao suporta OR direto: fazemos consultas separadas e unimos.
  // Tambem suportamos dados legados (pessoal salvo como string/numero, ou obraId com variacao de caixa).
  const pessoalValues: any[] = [true, 'true', 1, '1']
  const obraValues = ['PESSOAL', 'Pessoal', 'pessoal']

  const queries = [
    ...pessoalValues.map((value) =>
      query(collection(firestore, COLLECTION_NAME), ...baseConstraints, where('pessoal', '==', value))
    ),
    ...obraValues.map((value) =>
      query(collection(firestore, COLLECTION_NAME), ...baseConstraints, where('obraId', '==', value))
    ),
  ]

  const mergeSnaps = (snaps: any[]): ContaPagar[] => {
    const map = new Map<string, ContaPagar>()
    for (const snap of snaps) {
      snap?.docs?.forEach((docItem: any) => map.set(docItem.id, mapContaPagarDoc(docItem)))
    }
    return Array.from(map.values()).filter(isContaPessoal)
  }

  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE, {
    type: 'getContasPagarPessoais',
    includeParticular,
  })

  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const snaps = await Promise.all(queries.map((q) => getDocs(q)))
        const merged = mergeSnaps(snaps)
        return merged
      } catch (error) {
        console.error('Erro ao buscar contas pessoais (contasPagar):', error)
        // Ultima tentativa: carregar todas e filtrar (se permitido), em vez de quebrar a tela.
        try {
          const all = await getContasPagar({ includeParticular })
          return all.filter(isContaPessoal)
        } catch {
          throw error
        }
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function getContasPagarPorFolhaPagamentoId(folhaPagamentoId: string): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE, {
    type: 'getContasPagarPorFolhaPagamentoId',
    folhaPagamentoId,
  })
  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const q = query(collection(firestore, COLLECTION_NAME), where('folhaPagamentoId', '==', folhaPagamentoId))
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(mapContaPagarDoc) as ContaPagar[]
      } catch (error) {
        console.error('Erro ao buscar contas por folhaPagamentoId:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function getContasPagarPorFolhaFuncionarioId(folhaFuncionarioId: string): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE, {
    type: 'getContasPagarPorFolhaFuncionarioId',
    folhaFuncionarioId,
  })
  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const q = query(collection(firestore, COLLECTION_NAME), where('folhaFuncionarioId', '==', folhaFuncionarioId))
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(mapContaPagarDoc) as ContaPagar[]
      } catch (error) {
        console.error('Erro ao buscar contas por folhaFuncionarioId:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function getContasPagarPorGrupo(grupoParcelamentoId: string): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  const cacheKey = makeCacheKey(LIST_CACHE_SCOPE, {
    type: 'getContasPagarPorGrupo',
    grupoParcelamentoId,
  })
  return getCachedValue(
    cacheKey,
    async () => {
      try {
        const q = query(collection(firestore, COLLECTION_NAME), where('grupoParcelamentoId', '==', grupoParcelamentoId))
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(mapContaPagarDoc) as ContaPagar[]
      } catch (error) {
        console.error('Erro ao buscar contas por grupo de parcelamento:', error)
        throw error
      }
    },
    READ_CACHE_TTL_MS
  )
}

export async function createContaPagar(data: Omit<ContaPagar, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  try {
    const cleanData = buildContaPagarCreateData(data)
    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), cleanData)
    const id = docRef.id

    pushUndoable({
      description: 'Criar conta a pagar',
      undo: async () => {
        await deleteDoc(doc(firestore, COLLECTION_NAME, id))
        invalidateContasPagarCache()
      },
      redo: async () => {
        await addDoc(collection(firestore, COLLECTION_NAME), cleanData)
        invalidateContasPagarCache()
      },
    })

    invalidateContasPagarCache()
    return id
  } catch (error) {
    console.error('Erro ao criar conta a pagar:', error)
    throw error
  }
}

export async function createContasPagarParceladasMensais(
  data: Omit<ContaPagar, 'id' | 'createdAt' | 'parcelaAtual' | 'grupoParcelamentoId'> & {
    totalParcelas: number
    parcelaInicial?: number
    parcelasConfig?: Array<{
      parcela: number
      valor: number
      dataVencimento: Date
    }>
  }
): Promise<string[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db

  const { parcelasConfig, ...baseData } = data
  const totalParcelas = Math.max(1, Number(data.totalParcelas) || 1)
  const parcelaInicial = Math.max(1, Number(data.parcelaInicial) || 1)
  const parcelasConfigMap = new Map(
    (parcelasConfig || []).map((item) => [item.parcela, item])
  )

  if (parcelaInicial > totalParcelas) {
    throw new Error('A parcela inicial não pode ser maior que o total de parcelas.')
  }

  try {
    const batch = writeBatch(firestore)
    const groupId = `${data.createdBy}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const ids: string[] = []
    const createdItems: { id: string; data: any }[] = []

    for (let parcela = parcelaInicial; parcela <= totalParcelas; parcela++) {
      const parcelaDocRef = doc(collection(firestore, COLLECTION_NAME))
      const monthOffset = parcela - parcelaInicial
      const parcelaCustom = parcelasConfigMap.get(parcela)
      const dataVencimentoParcela =
        parcelaCustom?.dataVencimento ||
        addMonthsKeepingDay(baseData.dataVencimento as Date, monthOffset)
      const valorParcela = parcelaCustom?.valor ?? baseData.valor

      const payload: Omit<ContaPagar, 'id' | 'createdAt'> = {
        ...baseData,
        valor: valorParcela,
        dataVencimento: dataVencimentoParcela,
        parcelaAtual: parcela,
        totalParcelas,
        grupoParcelamentoId: groupId,
        recorrenciaMensal: true,
        status: parcela === parcelaInicial ? baseData.status : 'pendente',
        formaPagamento: parcela === parcelaInicial ? baseData.formaPagamento : undefined,
        dataPagamento: parcela === parcelaInicial ? baseData.dataPagamento : undefined,
        comprovanteUrl: parcela === parcelaInicial ? baseData.comprovanteUrl : undefined,
        comprovantesMensais: parcela === parcelaInicial ? baseData.comprovantesMensais : undefined,
      }

      const cleanData = buildContaPagarCreateData(payload)
      batch.set(parcelaDocRef, cleanData)
      ids.push(parcelaDocRef.id)
      createdItems.push({ id: parcelaDocRef.id, data: cleanData })
    }

    await batch.commit()
    invalidateContasPagarCache()

    pushUndoable({
      description: 'Criar contas parceladas',
      undo: async () => {
        const undoSettingsBatch = writeBatch(firestore)
        createdItems.forEach((item) => undoSettingsBatch.delete(doc(firestore, COLLECTION_NAME, item.id)))
        await undoSettingsBatch.commit()
        invalidateContasPagarCache()
      },
      redo: async () => {
        const redoBatch = writeBatch(firestore)
        createdItems.forEach((item) => redoBatch.set(doc(firestore, COLLECTION_NAME, item.id), item.data))
        await redoBatch.commit()
        invalidateContasPagarCache()
      },
    })

    return ids
  } catch (error) {
    console.error('Erro ao criar contas parceladas mensais:', error)
    throw error
  }
}

export async function updateContaPagar(
  id: string,
  data: Partial<Omit<ContaPagar, 'id' | 'createdAt' | 'createdBy'>> & { dataPagamento?: Date | Timestamp | null }
): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? snapshot.data() : null

    const updateData: any = {}

    // Adicionar apenas campos que foram fornecidos e não são undefined
    if (data.valor !== undefined) updateData.valor = data.valor
    if (data.tipo !== undefined) updateData.tipo = data.tipo
    if (data.obraId !== undefined) updateData.obraId = data.obraId
    if (data.pessoal !== undefined) updateData.pessoal = data.pessoal
    if (data.folhaPagamentoId !== undefined) updateData.folhaPagamentoId = data.folhaPagamentoId
    if (data.folhaFuncionarioId !== undefined) updateData.folhaFuncionarioId = data.folhaFuncionarioId
    if (data.status !== undefined) updateData.status = data.status
    if (data.comprovanteUrl !== undefined) updateData.comprovanteUrl = data.comprovanteUrl
    if (data.boletoUrl !== undefined) updateData.boletoUrl = data.boletoUrl
    if (data.linhaDigitavel !== undefined) updateData.linhaDigitavel = data.linhaDigitavel
    if (data.codigoBarras !== undefined) updateData.codigoBarras = data.codigoBarras
    if (data.formaPagamento !== undefined) updateData.formaPagamento = data.formaPagamento
    if (data.contaPagamento !== undefined) updateData.contaPagamento = data.contaPagamento
    if (data.favorecido !== undefined) updateData.favorecido = data.favorecido
    if (data.banco !== undefined) updateData.banco = data.banco
    if (data.agencia !== undefined) updateData.agencia = data.agencia
    if (data.conta !== undefined) updateData.conta = data.conta
    if (data.chavePix !== undefined) updateData.chavePix = data.chavePix
    if (data.descricao !== undefined) updateData.descricao = data.descricao
    if (data.rateio !== undefined) updateData.rateio = data.rateio
    if (data.parcelaAtual !== undefined) updateData.parcelaAtual = data.parcelaAtual
    if (data.totalParcelas !== undefined) updateData.totalParcelas = data.totalParcelas
    if (data.grupoParcelamentoId !== undefined) updateData.grupoParcelamentoId = data.grupoParcelamentoId
    if (data.recorrenciaMensal !== undefined) updateData.recorrenciaMensal = data.recorrenciaMensal
    if (data.comprovantesMensais !== undefined) {
      updateData.comprovantesMensais = serializeComprovantesMensais(data.comprovantesMensais) || []
    }

    if (data.dataVencimento) {
      updateData.dataVencimento = Timestamp.fromDate(data.dataVencimento as Date)
    }
    if (data.dataPagamento === null) {
      updateData.dataPagamento = null
    } else if (data.dataPagamento) {
      updateData.dataPagamento = Timestamp.fromDate(data.dataPagamento as Date)
    }

    updateData.updatedAt = Timestamp.now()

    await updateDoc(docRef, updateData)
    invalidateContasPagarCache()

    if (previousData) {
      pushUndoable({
        description: 'Editar conta a pagar',
        undo: async () => {
          await updateDoc(docRef, previousData)
          invalidateContasPagarCache()
        },
        redo: async () => {
          await updateDoc(docRef, updateData)
          invalidateContasPagarCache()
        },
      })
    }
  } catch (error) {
    console.error('Erro ao atualizar conta a pagar:', error)
    throw error
  }
}

export async function deleteContaPagar(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)
    const previousData = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null

    await deleteDoc(docRef)
    invalidateContasPagarCache()

    if (previousData) {
      pushUndoable({
        description: 'Excluir conta a pagar',
        undo: async () => {
          const { id: _id, ...data } = previousData as any
          await setDoc(doc(firestore, COLLECTION_NAME, id), data)
          invalidateContasPagarCache()
        },
        redo: async () => {
          await deleteDoc(docRef)
          invalidateContasPagarCache()
        },
      })
    }
  } catch (error) {
    console.error('Erro ao deletar conta a pagar:', error)
    throw error
  }
}

const MAX_BATCH_OPS = 400

export async function deleteContasPagarByIds(ids: string[]): Promise<number> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  if (ids.length === 0) return 0
  try {
    for (let i = 0; i < ids.length; i += MAX_BATCH_OPS) {
      const chunk = ids.slice(i, i + MAX_BATCH_OPS)
      const batch = writeBatch(firestore)
      chunk.forEach((id) => batch.delete(doc(firestore, COLLECTION_NAME, id)))
      await batch.commit()
    }
    invalidateContasPagarCache()
    return ids.length
  } catch (error) {
    console.error('Erro ao deletar contas a pagar em lote:', error)
    throw error
  }
}

export async function deleteContasPagarPorGrupo(grupoParcelamentoId: string): Promise<number> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const q = query(collection(db, COLLECTION_NAME), where('grupoParcelamentoId', '==', grupoParcelamentoId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) return 0

    const batch = writeBatch(db)
    querySnapshot.docs.forEach((docItem) => {
      batch.delete(docItem.ref)
    })
    await batch.commit()
    invalidateContasPagarCache()
    return querySnapshot.size
  } catch (error) {
    console.error('Erro ao deletar contas do grupo de parcelamento:', error)
    throw error
  }
}

/**
 * Deleta todas as contas a pagar NÃO PAGAS vinculadas a uma folha de pagamento.
 * Contas com status 'pago' são preservadas no histórico.
 */
export async function deleteContasPagarNaoPagasPorFolhaPagamentoId(folhaPagamentoId: string): Promise<number> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const q = query(collection(db, COLLECTION_NAME), where('folhaPagamentoId', '==', folhaPagamentoId))
    const querySnapshot = await getDocs(q)

    const naoPagas = querySnapshot.docs.filter((docItem) => {
      const data = docItem.data()
      return data.status !== 'pago'
    })

    if (naoPagas.length === 0) return 0

    const batch = writeBatch(db)
    naoPagas.forEach((docItem) => {
      batch.delete(docItem.ref)
    })
    await batch.commit()
    invalidateContasPagarCache()
    return naoPagas.length
  } catch (error) {
    console.error('Erro ao deletar contas não pagas por folhaPagamentoId:', error)
    throw error
  }
}

/**
 * Deleta todas as contas a pagar NÃO PAGAS vinculadas a um funcionário da folha (folhaFuncionarios).
 * Contas com status 'pago' são preservadas no histórico.
 */
export async function deleteContasPagarNaoPagasPorFolhaFuncionarioId(folhaFuncionarioId: string): Promise<number> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const q = query(collection(db, COLLECTION_NAME), where('folhaFuncionarioId', '==', folhaFuncionarioId))
    const querySnapshot = await getDocs(q)
    const naoPagas = querySnapshot.docs.filter((docItem) => docItem.data().status !== 'pago')
    if (naoPagas.length === 0) return 0
    const batch = writeBatch(db)
    naoPagas.forEach((docItem) => batch.delete(docItem.ref))
    await batch.commit()
    invalidateContasPagarCache()
    return naoPagas.length
  } catch (error) {
    console.error('Erro ao deletar contas não pagas por folhaFuncionarioId:', error)
    throw error
  }
}

/**
 * Deleta todas as contas a pagar NÃO PAGAS de um determinado tipo e favorecido.
 * Usado para limpar contas de empreiteiros ao deletar o empreiteiro.
 * Contas com status 'pago' são preservadas no histórico.
 */
export async function deleteContasPagarNaoPagasPorTipoEFavorecido(
  tipo: 'empreiteiro' | 'folha',
  favorecido: string
): Promise<number> {
  if (!db) throw new Error('Firebase não está inicializado')
  if (!favorecido.trim()) return 0
  try {
    const q = query(collection(db, COLLECTION_NAME), where('tipo', '==', tipo))
    const querySnapshot = await getDocs(q)

    const normalizedFavorecido = favorecido.trim().toLowerCase().replace(/\s+/g, ' ')
    const naoPagas = querySnapshot.docs.filter((docItem) => {
      const data = docItem.data()
      if (data.status === 'pago') return false
      const docFavorecido = String(data.favorecido || data.descricao || '').trim().toLowerCase().replace(/\s+/g, ' ')
      return docFavorecido === normalizedFavorecido
    })

    if (naoPagas.length === 0) return 0

    const batch = writeBatch(db)
    naoPagas.forEach((docItem) => {
      batch.delete(docItem.ref)
    })
    await batch.commit()
    invalidateContasPagarCache()
    return naoPagas.length
  } catch (error) {
    console.error(`Erro ao deletar contas não pagas por tipo=${tipo} e favorecido:`, error)
    throw error
  }
}
