const CACHE = 'agenda-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Sla alleen statische assets op in cache
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Alleen GET requests; sla API-aanroepen en Supabase over
  if (e.request.method !== 'GET') return
  if (url.hostname.includes('supabase')) return
  if (url.pathname.startsWith('/_next/data')) return

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request)
      const networkFetch = fetch(e.request).then((resp) => {
        if (resp.ok && url.pathname.startsWith('/_next/static')) {
          cache.put(e.request, resp.clone())
        }
        return resp
      }).catch(() => cached)
      return cached || networkFetch
    })
  )
})

// Push notificatie ontvangen (van server)
self.addEventListener('push', (e) => {
  if (!e.data) return
  let data
  try { data = e.data.json() } catch { data = { titel: 'Agenda', bericht: e.data.text() } }

  e.waitUntil(
    self.registration.showNotification(data.titel ?? 'Agenda herinnering', {
      body:  data.bericht ?? '',
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      tag:   data.id ?? 'agenda',
      data:  { url: '/' },
    })
  )
})

// Klik op notificatie → app openen/focussen
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lijst) => {
      const open = lijst.find((c) => c.url.startsWith(self.location.origin))
      return open ? open.focus() : self.clients.openWindow('/')
    })
  )
})
