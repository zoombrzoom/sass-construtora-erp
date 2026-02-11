import {
  collection,
  getDocs,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const COLLECTION_NAME = 'precos_regionais'

export interface PrecoRegional {
  id: string
  key: string
  descricao: string
  info?: string
  unidade?: string
  menorPreco?: number
  precoMedio?: number
  updatedAt?: Date
}

function normalizeText(value?: string): string {
  if (!value) return ''
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function buildPrecoRegionalKey(descricao: string, info?: string, unidade?: string): string {
  const primary = normalizeText(descricao)
  const detail = normalizeText(info || unidade)
  return detail ? `${primary}|${detail}` : primary
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export async function getPrecosRegionaisByKeys(keys: string[]): Promise<PrecoRegional[]> {
  if (!db) throw new Error('Firebase não está inicializado')
  if (keys.length === 0) return []

  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)))
  const chunks = chunkArray(uniqueKeys, 10)

  try {
    const results: PrecoRegional[] = []

    for (const chunk of chunks) {
      const constraints: QueryConstraint[] = [
        where('key', 'in', chunk),
      ]

      const q = query(collection(db, COLLECTION_NAME), ...constraints)
      const querySnapshot = await getDocs(q)

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as any
        results.push({
          id: docSnap.id,
          key: data.key,
          descricao: data.descricao || '',
          info: data.info,
          unidade: data.unidade,
          menorPreco: data.menorPreco,
          precoMedio: data.precoMedio,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
        })
      })
    }

    return results
  } catch (error) {
    console.error('Erro ao buscar preços regionais:', error)
    throw error
  }
}
