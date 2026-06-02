const CACHE = 'agenda-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  // Verwijder oude caches (agenda-v1 etc.) en claim clients direct
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Onderschep ALLEEN /_next/static/ (content-gehashte, onveranderlijke assets)
// HTML-pagina's en API-calls gaan altijd via het netwerk — dit voorkomt laadproblemen
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  if (!url.pathname.startsWith('/_next/static/')) return

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request)
      if (cached) return cached
      const resp = await fetch(e.request)
      if (resp.ok) cache.put(e.request, resp.clone())
      return resp
    })
  )
})

// Push notificatie ontvangen
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

// Klik op notificatie → app openen
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lijst) => {
      const open = lijst.find((c) => c.url.startsWith(self.location.origin))
      return open ? open.focus() : self.clients.openWindow('/')
    })
  )
})
