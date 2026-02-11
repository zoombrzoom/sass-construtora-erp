import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const COLLECTION_NAME = 'caixinha'
const VALOR_INICIAL_PADRAO = 600

export interface CaixinhaGasto {
  id: string
  descricao: string
  valor: number
  data: Date
  criadoPor: string
  createdAt: Date
}

export interface CaixinhaMensal {
  id: string
  mes: number
  ano: number
  valorInicial: number
  gastos: CaixinhaGasto[]
  saldo: number
  updatedAt?: Date
}

function getDocId(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

function toDateOrNow(value: any): Date {
  if (!value) return new Date()
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()
  return new Date(value)
}

function serializeGastos(gastos: CaixinhaGasto[]) {
  return gastos.map((item) => ({
    id: item.id,
    descricao: item.descricao,
    valor: item.valor,
    data: Timestamp.fromDate(item.data),
    criadoPor: item.criadoPor,
    createdAt: Timestamp.fromDate(item.createdAt),
  }))
}

function calcularSaldo(valorInicial: number, gastos: CaixinhaGasto[]): number {
  const totalGastos = gastos.reduce((total, item) => total + item.valor, 0)
  return Number((valorInicial - totalGastos).toFixed(2))
}

export async function getCaixinhaMes(ano: number, mes: number): Promise<CaixinhaMensal> {
  if (!db) throw new Error('Firebase não está inicializado')

  const id = getDocId(ano, mes)
  const docRef = doc(db, COLLECTION_NAME, id)
  const snap = await getDoc(docRef)

  if (!snap.exists()) {
    const novaCaixinha: CaixinhaMensal = {
      id,
      ano,
      mes,
      valorInicial: VALOR_INICIAL_PADRAO,
      gastos: [],
      saldo: VALOR_INICIAL_PADRAO,
      updatedAt: new Date(),
    }

    await setDoc(docRef, {
      ano,
      mes,
      valorInicial: VALOR_INICIAL_PADRAO,
      gastos: [],
      saldo: VALOR_INICIAL_PADRAO,
      updatedAt: Timestamp.now(),
    })

    return novaCaixinha
  }

  const raw = snap.data()
  const gastosRaw = Array.isArray(raw.gastos) ? raw.gastos : []
  const gastos: CaixinhaGasto[] = gastosRaw.map((item: any) => ({
    id: item.id || `${Date.now()}`,
    descricao: item.descricao || '',
    valor: Number(item.valor || 0),
    data: toDateOrNow(item.data),
    criadoPor: item.criadoPor || '',
    createdAt: toDateOrNow(item.createdAt),
  }))

  const valorInicial = Number(raw.valorInicial || VALOR_INICIAL_PADRAO)
  const saldo = calcularSaldo(valorInicial, gastos)

  return {
    id: snap.id,
    ano: Number(raw.ano || ano),
    mes: Number(raw.mes || mes),
    valorInicial,
    gastos,
    saldo,
    updatedAt: raw.updatedAt?.toDate?.() || undefined,
  }
}

export async function updateValorInicialCaixinha(
  ano: number,
  mes: number,
  valorInicial: number
): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  const caixinha = await getCaixinhaMes(ano, mes)
  const saldo = calcularSaldo(valorInicial, caixinha.gastos)
  const docRef = doc(db, COLLECTION_NAME, getDocId(ano, mes))

  await setDoc(
    docRef,
    {
      ano,
      mes,
      valorInicial,
      gastos: serializeGastos(caixinha.gastos),
      saldo,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )
}

export async function addGastoCaixinha(
  ano: number,
  mes: number,
  data: {
    descricao: string
    valor: number
    data: Date
    criadoPor: string
  }
): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  const caixinha = await getCaixinhaMes(ano, mes)

  const novoGasto: CaixinhaGasto = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    descricao: data.descricao.trim(),
    valor: data.valor,
    data: data.data,
    criadoPor: data.criadoPor,
    createdAt: new Date(),
  }

  const gastos = [novoGasto, ...caixinha.gastos]
  const saldo = calcularSaldo(caixinha.valorInicial, gastos)
  const docRef = doc(db, COLLECTION_NAME, getDocId(ano, mes))

  await setDoc(
    docRef,
    {
      ano,
      mes,
      valorInicial: caixinha.valorInicial,
      gastos: serializeGastos(gastos),
      saldo,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )
}

export async function removeGastoCaixinha(
  ano: number,
  mes: number,
  gastoId: string
): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')
  const caixinha = await getCaixinhaMes(ano, mes)
  const gastos = caixinha.gastos.filter((item) => item.id !== gastoId)
  const saldo = calcularSaldo(caixinha.valorInicial, gastos)
  const docRef = doc(db, COLLECTION_NAME, getDocId(ano, mes))

  await setDoc(
    docRef,
    {
      ano,
      mes,
      valorInicial: caixinha.valorInicial,
      gastos: serializeGastos(gastos),
      saldo,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )
}
