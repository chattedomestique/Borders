// Border Studio Service Worker
const CACHE = 'border-studio-v1'
const PRECACHE = [
  '/Borders/',
  '/Borders/index.html',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  // Network-first for navigation, cache-first for assets
  const { request } = event
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/Borders/index.html'))
    )
    return
  }
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  )
})
