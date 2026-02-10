import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  query,
  where,
  Timestamp,
  type QueryConstraint
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { ComprovanteMensal, ContaPagar, ContaPagarStatus, ContaPagarTipo } from '@/types/financeiro'
import { toDate } from '@/utils/date'

const COLLECTION_NAME = 'contasPagar'

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
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
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
}

export async function getContasPagar(filters?: { 
  obraId?: string
  status?: ContaPagarStatus
  dataVencimentoInicio?: Date
  dataVencimentoFim?: Date
  includeParticular?: boolean
}): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const includeParticular = filters?.includeParticular ?? false
    const constraints: QueryConstraint[] = []
    
    if (filters?.obraId) {
      constraints.push(where('obraId', '==', filters.obraId))
    }

    // Para perfis sem acesso a "particular", a query precisa excluir esse tipo
    // para não falhar por regras de segurança.
    if (!includeParticular) {
      constraints.push(where('tipo', '!=', 'particular'))
    }
    
    // Nota: Firestore não suporta range queries em múltiplos campos
    // Para filtros de data, seria necessário fazer no cliente ou usar índices compostos
    
    const q = constraints.length > 0 
      ? query(collection(db, COLLECTION_NAME), ...constraints)
      : collection(db, COLLECTION_NAME)
    
    const querySnapshot = await getDocs(q)
    
    let results = querySnapshot.docs.map(mapContaPagarDoc) as ContaPagar[]

    if (filters?.status) {
      results = results.filter(conta => conta.status === filters.status)
    }
    
    // Filtro de data no cliente (se necessário)
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
}

export async function getContasPagarPorTipo(tipo: ContaPagarTipo): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const q = query(collection(db, COLLECTION_NAME), where('tipo', '==', tipo))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(mapContaPagarDoc) as ContaPagar[]
  } catch (error) {
    console.error('Erro ao buscar contas por tipo:', error)
    throw error
  }
}

export async function getContasPagarPessoais(params?: {
  includeParticular?: boolean
}): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
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
      query(collection(db, COLLECTION_NAME), ...baseConstraints, where('pessoal', '==', value))
    ),
    ...obraValues.map((value) =>
      query(collection(db, COLLECTION_NAME), ...baseConstraints, where('obraId', '==', value))
    ),
  ]

  const mergeSnaps = (snaps: any[]): ContaPagar[] => {
    const map = new Map<string, ContaPagar>()
    for (const snap of snaps) {
      snap?.docs?.forEach((docItem: any) => map.set(docItem.id, mapContaPagarDoc(docItem)))
    }
    return Array.from(map.values()).filter(isContaPessoal)
  }

  try {
    const snaps = await Promise.all(queries.map((q) => getDocs(q)))
    const merged = mergeSnaps(snaps)
    if (merged.length > 0) return merged

    // Fallback: em alguns cenarios (dados legados), a tag pode estar inconsistente.
    // Carrega tudo que o usuario tem permissao e filtra no cliente.
    try {
      const all = await getContasPagar({ includeParticular })
      return all.filter(isContaPessoal)
    } catch {
      return merged
    }
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
}

export async function getContasPagarPorFolhaPagamentoId(folhaPagamentoId: string): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const q = query(collection(db, COLLECTION_NAME), where('folhaPagamentoId', '==', folhaPagamentoId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(mapContaPagarDoc) as ContaPagar[]
  } catch (error) {
    console.error('Erro ao buscar contas por folhaPagamentoId:', error)
    throw error
  }
}

export async function getContasPagarPorGrupo(grupoParcelamentoId: string): Promise<ContaPagar[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const q = query(collection(db, COLLECTION_NAME), where('grupoParcelamentoId', '==', grupoParcelamentoId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(mapContaPagarDoc) as ContaPagar[]
  } catch (error) {
    console.error('Erro ao buscar contas por grupo de parcelamento:', error)
    throw error
  }
}

export async function createContaPagar(data: Omit<ContaPagar, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase não está inicializado')
  try {
    const cleanData = buildContaPagarCreateData(data)
    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData)
    
    return docRef.id
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
    const batch = writeBatch(db)
    const groupId = `${data.createdBy}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const ids: string[] = []

    for (let parcela = parcelaInicial; parcela <= totalParcelas; parcela++) {
      const parcelaDocRef = doc(collection(db, COLLECTION_NAME))
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

      batch.set(parcelaDocRef, buildContaPagarCreateData(payload))
      ids.push(parcelaDocRef.id)
    }

    await batch.commit()
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
    const updateData: any = {}
    
    // Adicionar apenas campos que foram fornecidos e não são undefined
    if (data.valor !== undefined) updateData.valor = data.valor
    if (data.tipo !== undefined) updateData.tipo = data.tipo
    if (data.obraId !== undefined) updateData.obraId = data.obraId
    if (data.pessoal !== undefined) updateData.pessoal = data.pessoal
    if (data.folhaPagamentoId !== undefined) updateData.folhaPagamentoId = data.folhaPagamentoId
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
    return querySnapshot.size
  } catch (error) {
    console.error('Erro ao deletar contas do grupo de parcelamento:', error)
    throw error
  }
}
