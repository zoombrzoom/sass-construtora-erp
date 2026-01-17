import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface ERPDatabase extends DBSchema {
  syncQueue: {
    key: string
    value: {
      id: string
      collection: string
      operation: 'create' | 'update' | 'delete'
      data: any
      timestamp: number
    }
  }
  cache: {
    key: string
    value: {
      collection: string
      data: any
      timestamp: number
    }
  }
}

let db: IDBPDatabase<ERPDatabase> | null = null

export async function initDB(): Promise<IDBPDatabase<ERPDatabase>> {
  if (db) return db

  db = await openDB<ERPDatabase>('erp-construtora', 1, {
    upgrade(db) {
      // Fila de sincronização
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' })
      }
      
      // Cache de dados
      if (!db.objectStoreNames.contains('cache')) {
        const cacheStore = db.createObjectStore('cache', { keyPath: 'key' })
        cacheStore.createIndex('collection', 'collection')
        cacheStore.createIndex('timestamp', 'timestamp')
      }
    },
  })

  return db
}

export async function addToSyncQueue(
  collection: string,
  operation: 'create' | 'update' | 'delete',
  data: any
): Promise<void> {
  const database = await initDB()
  const id = `${collection}_${Date.now()}_${Math.random()}`
  
  await database.add('syncQueue', {
    id,
    collection,
    operation,
    data,
    timestamp: Date.now(),
  })
}

export async function getSyncQueue(): Promise<ERPDatabase['syncQueue']['value'][]> {
  const database = await initDB()
  return await database.getAll('syncQueue')
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const database = await initDB()
  await database.delete('syncQueue', id)
}

export async function clearSyncQueue(): Promise<void> {
  const database = await initDB()
  await database.clear('syncQueue')
}

export async function cacheData(collection: string, key: string, data: any): Promise<void> {
  const database = await initDB()
  await database.put('cache', {
    key: `${collection}_${key}`,
    collection,
    data,
    timestamp: Date.now(),
  })
}

export async function getCachedData(collection: string, key: string): Promise<any | null> {
  const database = await initDB()
  const cached = await database.get('cache', `${collection}_${key}`)
  return cached?.data || null
}

export async function clearCache(collection?: string): Promise<void> {
  const database = await initDB()
  
  if (collection) {
    const tx = database.transaction('cache', 'readwrite')
    const store = tx.objectStore('cache')
    const index = store.index('collection')
    
    let cursor = await index.openCursor(IDBKeyRange.only(collection))
    while (cursor) {
      await cursor.delete()
      cursor = await cursor.continue()
    }
    
    await tx.done
  } else {
    await database.clear('cache')
  }
}
