const CACHE_NAME = 'erp-construtora-v3'
const urlsToCache = ['/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
  self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache only safe same-origin static requests
        const url = new URL(event.request.url)
        const isSameOrigin = url.origin === self.location.origin
        const isStatic = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')

        if (isSameOrigin && isStatic && response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
        }

        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        return caches.match('/login')
      })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName)
          return Promise.resolve()
        })
      )
    )
  )
  self.clients.claim()
})
