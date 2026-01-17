'use client'

import { useEffect, useState } from 'react'
import { syncQueue, isOnline, setupOnlineListener } from '@/lib/offline/sync'

export function useOfflineSync() {
  const [isOnlineStatus, setIsOnlineStatus] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    setIsOnlineStatus(isOnline())

    const cleanup = setupOnlineListener(async () => {
      setIsOnlineStatus(true)
      await performSync()
    })

    // Verificar status online periodicamente
    const interval = setInterval(() => {
      setIsOnlineStatus(isOnline())
    }, 5000)

    // Sincronizar ao montar se estiver online
    if (isOnline()) {
      performSync()
    }

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [])

  const performSync = async () => {
    if (!isOnline() || isSyncing) return

    setIsSyncing(true)
    try {
      const result = await syncQueue()
      if (result.success > 0 || result.errors > 0) {
        setLastSync(new Date())
      }
    } catch (error) {
      console.error('Erro na sincronização:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  return {
    isOnline: isOnlineStatus,
    isSyncing,
    lastSync,
    sync: performSync,
  }
}
