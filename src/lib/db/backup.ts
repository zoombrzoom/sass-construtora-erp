import {
  Firestore,
  Timestamp,
  collection,
  doc,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import type { FirebaseError } from 'firebase/app'
import { db } from '../firebase/config'
import { clearDbReadCache } from './cache'

export const BACKUP_COLLECTIONS = [
  'users',
  'obras',
  'obras_categorias',
  'contasPagar',
  'contasReceber',
  'folhaPagamento',
  'folha_pagamento_categorias',
  'requisicoes',
  'cotacoes',
  'pedidosCompra',
  'medicoes',
  'recebimentos',
  'fornecedores',
  'empreiteiros',
  'planoContas',
  'precos_regionais',
  'contas_pessoais_categorias',
  'contas_pessoais_lancamentos',
  'dados_bancarios',
  'documentos',
  'documentos_pastas',
  'caixinha',
] as const

const BACKUP_VERSION = 2
const MAX_BATCH_OPS = 400
const MAX_MISMATCH_DETAILS = 5

export type BackupCollectionName = (typeof BACKUP_COLLECTIONS)[number]

export interface BackupDocumentEntry {
  id: string
  data: unknown
}

export interface DatabaseBackup {
  version: number
  createdAt: string
  source: string
  collections: Record<string, BackupDocumentEntry[]>
  stats: {
    collections: number
    documents: number
    skippedCollections: string[]
    collectionDocumentCounts?: Record<string, number>
  }
}

export interface BackupProgress {
  phase: 'reading' | 'writing' | 'deleting'
  collection: string
  current: number
  total: number
}

export interface CreateBackupOptions {
  onProgress?: (progress: BackupProgress) => void
  allowPartial?: boolean
}

export interface RestoreBackupOptions {
  replaceExisting?: boolean
  strict?: boolean
  verifyAfterRestore?: boolean
  onProgress?: (progress: BackupProgress) => void
}

export interface RestoreBackupResult {
  collectionsProcessed: number
  documentsWritten: number
  documentsDeleted: number
  collectionsSkipped: string[]
}

function isFirestoreTimestamp(value: any): value is Timestamp {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.toDate === 'function' &&
      typeof value.seconds === 'number' &&
      typeof value.nanoseconds === 'number'
  )
}

function serializeValue(value: any): any {
  if (value === null || value === undefined) return value

  if (value instanceof Date) {
    return {
      __backupType: 'date',
      value: value.toISOString(),
    }
  }

  if (isFirestoreTimestamp(value)) {
    return {
      __backupType: 'timestamp',
      value: value.toDate().toISOString(),
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item))
  }

  if (typeof value === 'object') {
    const result: Record<string, any> = {}
    Object.keys(value).forEach((key) => {
      result[key] = serializeValue(value[key])
    })
    return result
  }

  return value
}

function deserializeValue(value: any): any {
  if (value === null || value === undefined) return value

  if (Array.isArray(value)) {
    return value.map((item) => deserializeValue(item))
  }

  if (typeof value === 'object') {
    if (value.__backupType === 'timestamp' || value.__backupType === 'date') {
      const date = new Date(String(value.value || ''))
      if (Number.isNaN(date.getTime())) {
        return null
      }
      return Timestamp.fromDate(date)
    }

    const result: Record<string, any> = {}
    Object.keys(value).forEach((key) => {
      result[key] = deserializeValue(value[key])
    })
    return result
  }

  return value
}

function stableStringify(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return '"__undefined__"'

  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item: any) => stableStringify(item)).join(',')}]`
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort()
    const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    return `{${pairs.join(',')}}`
  }

  return JSON.stringify(String(value))
}

function formatIdList(ids: string[]): string {
  if (ids.length <= MAX_MISMATCH_DETAILS) {
    return ids.join(', ')
  }

  const shown = ids.slice(0, MAX_MISMATCH_DETAILS)
  return `${shown.join(', ')} ...(+${ids.length - MAX_MISMATCH_DETAILS})`
}

function getSkippedCollectionsFromBackup(backup: DatabaseBackup): string[] {
  const maybeSkipped = (backup as any)?.stats?.skippedCollections
  if (!Array.isArray(maybeSkipped)) {
    return []
  }

  return maybeSkipped.filter((item: unknown): item is string => typeof item === 'string')
}

function getMissingCollectionsFromBackup(backup: DatabaseBackup): string[] {
  return BACKUP_COLLECTIONS.filter((collectionName) => (
    !Object.prototype.hasOwnProperty.call(backup.collections, collectionName)
  ))
}

async function verifyRestoredCollection(
  firestore: Firestore,
  collectionName: string,
  expectedDocs: BackupDocumentEntry[],
  replaceExisting: boolean
): Promise<void> {
  const currentSnap = await getDocs(collection(firestore, collectionName))
  const expectedById = new Map<string, string>()
  const currentById = new Map<string, string>()

  expectedDocs.forEach((item) => {
    expectedById.set(item.id, stableStringify(item.data))
  })

  currentSnap.docs.forEach((docSnap) => {
    currentById.set(docSnap.id, stableStringify(serializeValue(docSnap.data())))
  })

  const missingIds: string[] = []
  const mismatchedIds: string[] = []
  const extraIds: string[] = []

  expectedById.forEach((expectedData, docId) => {
    const currentData = currentById.get(docId)
    if (currentData === undefined) {
      missingIds.push(docId)
      return
    }

    if (currentData !== expectedData) {
      mismatchedIds.push(docId)
    }
  })

  if (replaceExisting) {
    currentById.forEach((_currentData, docId) => {
      if (!expectedById.has(docId)) {
        extraIds.push(docId)
      }
    })
  }

  if (missingIds.length === 0 && mismatchedIds.length === 0 && extraIds.length === 0) {
    return
  }

  const details: string[] = []
  if (missingIds.length > 0) {
    details.push(`ausentes (${missingIds.length}): ${formatIdList(missingIds)}`)
  }
  if (mismatchedIds.length > 0) {
    details.push(`divergentes (${mismatchedIds.length}): ${formatIdList(mismatchedIds)}`)
  }
  if (extraIds.length > 0) {
    details.push(`extras (${extraIds.length}): ${formatIdList(extraIds)}`)
  }

  throw new Error(
    `Verificação pós-restauração falhou na coleção "${collectionName}" (${details.join(' | ')}).`
  )
}

export function isDatabaseBackup(payload: unknown): payload is DatabaseBackup {
  if (!payload || typeof payload !== 'object') return false

  const data = payload as DatabaseBackup
  if (typeof data.version !== 'number') return false
  if (typeof data.createdAt !== 'string') return false
  if (!data.collections || typeof data.collections !== 'object') return false

  return Object.values(data.collections).every((collectionData) => {
    if (!Array.isArray(collectionData)) return false

    return collectionData.every((entry) => (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as BackupDocumentEntry).id === 'string' &&
      Object.prototype.hasOwnProperty.call(entry, 'data')
    ))
  })
}

export function getBackupFileName(createdAtIso: string): string {
  const date = new Date(createdAtIso)
  const stamp = Number.isNaN(date.getTime())
    ? createdAtIso.replace(/[:.]/g, '-')
    : date.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `backup-sass-construtora-${stamp}.json`
}

export async function createDatabaseBackup(options: CreateBackupOptions = {}): Promise<DatabaseBackup> {
  if (!db) throw new Error('Firebase não está inicializado')

  const collections: Record<string, BackupDocumentEntry[]> = {}
  const collectionDocumentCounts: Record<string, number> = {}
  let totalDocuments = 0
  const skippedCollections: string[] = []

  for (const collectionName of BACKUP_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, collectionName))
      const total = snap.size

      const docs = snap.docs.map((docSnap, index) => {
        options?.onProgress?.({
          phase: 'reading',
          collection: collectionName,
          current: index + 1,
          total,
        })

        return {
          id: docSnap.id,
          data: serializeValue(docSnap.data()),
        }
      })

      collections[collectionName] = docs
      collectionDocumentCounts[collectionName] = docs.length
      totalDocuments += docs.length
    } catch (error) {
      console.warn(`Coleção ignorada no backup: ${collectionName}`, error)
      skippedCollections.push(collectionName)
      collections[collectionName] = []
      collectionDocumentCounts[collectionName] = 0
    }
  }

  if (skippedCollections.length > 0 && !options.allowPartial) {
    throw new Error(
      `Backup incompleto: não foi possível ler ${skippedCollections.length} coleção(ões): ${skippedCollections.join(', ')}.`
    )
  }

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    source: 'sass-construtora-erp',
    collections,
    stats: {
      collections: BACKUP_COLLECTIONS.length,
      documents: totalDocuments,
      skippedCollections,
      collectionDocumentCounts,
    },
  }
}

async function commitSets(
  firestore: Firestore,
  collectionName: string,
  docsToSet: BackupDocumentEntry[],
  onProgress?: (progress: BackupProgress) => void
): Promise<number> {
  if (docsToSet.length === 0) return 0

  let written = 0

  for (let i = 0; i < docsToSet.length; i += MAX_BATCH_OPS) {
    const chunk = docsToSet.slice(i, i + MAX_BATCH_OPS)
    const batch = writeBatch(firestore)

    chunk.forEach((item) => {
      const ref = doc(firestore, collectionName, item.id)
      batch.set(ref, deserializeValue(item.data))
    })

    await batch.commit()
    written += chunk.length

    onProgress?.({
      phase: 'writing',
      collection: collectionName,
      current: written,
      total: docsToSet.length,
    })
  }

  return written
}

async function commitDeletes(
  firestore: Firestore,
  collectionName: string,
  docIdsToDelete: string[],
  onProgress?: (progress: BackupProgress) => void
): Promise<number> {
  if (docIdsToDelete.length === 0) return 0

  let deleted = 0

  for (let i = 0; i < docIdsToDelete.length; i += MAX_BATCH_OPS) {
    const chunk = docIdsToDelete.slice(i, i + MAX_BATCH_OPS)
    const batch = writeBatch(firestore)

    chunk.forEach((docId) => {
      batch.delete(doc(firestore, collectionName, docId))
    })

    await batch.commit()
    deleted += chunk.length

    onProgress?.({
      phase: 'deleting',
      collection: collectionName,
      current: deleted,
      total: docIdsToDelete.length,
    })
  }

  return deleted
}

export async function restoreDatabaseBackup(
  backup: DatabaseBackup,
  options: RestoreBackupOptions = {}
): Promise<RestoreBackupResult> {
  if (!db) throw new Error('Firebase não está inicializado')
  const firestore = db
  if (!isDatabaseBackup(backup)) throw new Error('Arquivo de backup inválido')

  const replaceExisting = options.replaceExisting !== false
  const strict = options.strict !== false
  const verifyAfterRestore = options.verifyAfterRestore !== false
  let documentsWritten = 0
  let documentsDeleted = 0
  const collectionsSkippedSet = new Set<string>()
  const skippedFromBackup = new Set<string>(getSkippedCollectionsFromBackup(backup))
  const missingCollections = getMissingCollectionsFromBackup(backup)

  if (strict && skippedFromBackup.size > 0) {
    throw new Error(
      `O backup foi gerado de forma parcial e não garante recuperação total. Coleções ausentes na origem: ${Array.from(skippedFromBackup).join(', ')}.`
    )
  }

  if (strict && missingCollections.length > 0) {
    throw new Error(
      `O arquivo de backup não contém todas as coleções esperadas. Faltando: ${missingCollections.join(', ')}.`
    )
  }

  const collectionsInRestoreOrder = [
    ...BACKUP_COLLECTIONS.filter((collectionName) => collectionName !== 'users'),
    'users',
  ] as const

  for (const collectionName of collectionsInRestoreOrder) {
    try {
      const collectionExistsInBackup = Object.prototype.hasOwnProperty.call(
        backup.collections,
        collectionName
      )

      // Backups antigos podem não conter todas as coleções atuais.
      // Se não existir no backup, não alteramos a coleção para evitar perda de dados.
      if (!collectionExistsInBackup) {
        if (strict) {
          throw new Error(`Coleção obrigatória ausente no arquivo de backup: ${collectionName}.`)
        }
        collectionsSkippedSet.add(collectionName)
        continue
      }

      // Se a coleção foi ignorada na geração do backup (erro/permissão),
      // não devemos apagar dados atuais durante a restauração.
      if (skippedFromBackup.has(collectionName)) {
        if (strict) {
          throw new Error(
            `Coleção "${collectionName}" foi ignorada no backup original e não pode ser restaurada com segurança.`
          )
        }
        collectionsSkippedSet.add(collectionName)
        continue
      }

      const incomingDocs = backup.collections[collectionName] || []

      documentsWritten += await commitSets(firestore, collectionName, incomingDocs, options.onProgress)

      if (replaceExisting) {
        try {
          const currentSnap = await getDocs(collection(firestore, collectionName))
          const incomingIds = new Set(incomingDocs.map((item) => item.id))

          const toDelete = currentSnap.docs
            .map((docSnap) => docSnap.id)
            .filter((docId) => !incomingIds.has(docId))

          documentsDeleted += await commitDeletes(firestore, collectionName, toDelete, options.onProgress)
        } catch (error) {
          const code = (error as FirebaseError | undefined)?.code
          if (code === 'permission-denied') {
            if (strict) {
              throw new Error(`Sem permissão para validar/remover documentos em "${collectionName}".`)
            }
            collectionsSkippedSet.add(collectionName)
            continue
          }
          throw error
        }
      }

      if (verifyAfterRestore) {
        try {
          await verifyRestoredCollection(firestore, collectionName, incomingDocs, replaceExisting)
        } catch (error) {
          const code = (error as FirebaseError | undefined)?.code
          if (code === 'permission-denied' && !strict) {
            collectionsSkippedSet.add(collectionName)
            continue
          }
          throw error
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Falha ao restaurar a coleção "${collectionName}": ${message}`)
    }
  }

  clearDbReadCache()

  return {
    collectionsProcessed: BACKUP_COLLECTIONS.length,
    documentsWritten,
    documentsDeleted,
    collectionsSkipped: Array.from(collectionsSkippedSet),
  }
}
