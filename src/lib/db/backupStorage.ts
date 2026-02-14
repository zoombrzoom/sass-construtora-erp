import { DBSchema, openDB } from 'idb'
import { DatabaseBackup } from './backup'

interface BackupStorageDb extends DBSchema {
  backups: {
    key: string
    value: StoredBackupRecord
    indexes: {
      createdAt: string
    }
  }
}

export interface StoredBackupMeta {
  id: string
  name: string
  createdAt: string
  sizeBytes: number
  documents: number
}

interface StoredBackupRecord extends StoredBackupMeta {
  backup: DatabaseBackup
}

const DB_NAME = 'sass-construtora-backups'
const DB_VERSION = 1
const STORE_NAME = 'backups'
const MAX_STORED_BACKUPS = 10

let dbPromise: ReturnType<typeof openDB<BackupStorageDb>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<BackupStorageDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt')
        }
      },
    })
  }

  return dbPromise
}

function toMeta(record: StoredBackupRecord): StoredBackupMeta {
  const { id, name, createdAt, sizeBytes, documents } = record
  return { id, name, createdAt, sizeBytes, documents }
}

function formatBackupName(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return `Backup ${createdAt}`
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function listStoredBackups(): Promise<StoredBackupMeta[]> {
  const db = await getDb()
  const all = await db.getAll(STORE_NAME)

  return all
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toMeta)
}

export async function getStoredBackupById(id: string): Promise<DatabaseBackup | null> {
  const db = await getDb()
  const record = await db.get(STORE_NAME, id)
  return record?.backup || null
}

export async function saveStoredBackup(backup: DatabaseBackup): Promise<StoredBackupMeta> {
  const db = await getDb()
  const createdAt = backup.createdAt || new Date().toISOString()
  const serialized = JSON.stringify(backup)

  const record: StoredBackupRecord = {
    id: `backup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: formatBackupName(createdAt),
    createdAt,
    documents: backup.stats?.documents || 0,
    sizeBytes: new Blob([serialized]).size,
    backup,
  }

  await db.put(STORE_NAME, record)

  const all = await db.getAll(STORE_NAME)
  const sorted = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const overflow = sorted.slice(MAX_STORED_BACKUPS)

  if (overflow.length > 0) {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    for (const item of overflow) {
      await tx.store.delete(item.id)
    }
    await tx.done
  }

  return toMeta(record)
}

export async function deleteStoredBackup(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}
