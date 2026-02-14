const DEFAULT_TTL_MS = 60 * 1000
const MAX_ENTRIES = 400

type CacheValueEntry = {
  value: unknown
  expiresAt: number
}

const valueCache = new Map<string, CacheValueEntry>()
const inFlightCache = new Map<string, Promise<unknown>>()

function trimCache() {
  if (valueCache.size <= MAX_ENTRIES) return

  const now = Date.now()

  for (const [key, entry] of valueCache.entries()) {
    if (entry.expiresAt <= now) {
      valueCache.delete(key)
    }
    if (valueCache.size <= MAX_ENTRIES) return
  }

  while (valueCache.size > MAX_ENTRIES) {
    const firstKey = valueCache.keys().next().value
    if (firstKey === undefined) break
    valueCache.delete(firstKey)
  }
}

function normalizeForCacheKey(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForCacheKey(item))
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const normalized: Record<string, unknown> = {}

    Object.keys(obj)
      .sort()
      .forEach((key) => {
        const current = obj[key]
        if (current !== undefined) {
          normalized[key] = normalizeForCacheKey(current)
        }
      })

    return normalized
  }

  return value
}

export function makeCacheKey(scope: string, params?: unknown): string {
  if (params === undefined) return scope
  return `${scope}:${JSON.stringify(normalizeForCacheKey(params))}`
}

export async function getCachedValue<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now()
  const cached = valueCache.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.value as T
  }

  const inFlight = inFlightCache.get(key)
  if (inFlight) {
    return inFlight as Promise<T>
  }

  const promise = loader()
    .then((value) => {
      valueCache.set(key, {
        value,
        expiresAt: Date.now() + Math.max(1, ttlMs),
      })
      trimCache()
      return value
    })
    .finally(() => {
      inFlightCache.delete(key)
    })

  inFlightCache.set(key, promise as Promise<unknown>)

  return promise
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  valueCache.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, ttlMs),
  })
  trimCache()
}

export function invalidateCacheKey(key: string): void {
  valueCache.delete(key)
  inFlightCache.delete(key)
}

export function invalidateCachePrefix(prefix: string): void {
  for (const key of valueCache.keys()) {
    if (key.startsWith(prefix)) {
      valueCache.delete(key)
    }
  }

  for (const key of inFlightCache.keys()) {
    if (key.startsWith(prefix)) {
      inFlightCache.delete(key)
    }
  }
}

export function clearDbReadCache(): void {
  valueCache.clear()
  inFlightCache.clear()
}
