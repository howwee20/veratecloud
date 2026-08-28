const CACHE_NAME = 'polyswap-mobile-v8'
const APP_SHELL = [
  '/mobile.html',
  '/mobile.css?v=mobile-cloud-8',
  '/mobile.js?v=mobile-cloud-8',
  '/assets/polyswap-mark.png?v=2',
  '/assets/providers/openai.svg',
  '/assets/providers/deepseek.svg',
  '/assets/providers/gemini.svg',
  '/assets/providers/anthropic.svg',
  '/assets/providers/meta.svg'
]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone()
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {})
    return response
  }).catch(() => caches.match(event.request).then(response => response || caches.match('/mobile.html'))))
})

self.addEventListener('push', event => {
  let payload = { title: 'PolySwap', body: 'Your job has an update.', jobId: '' }
  try { payload = { ...payload, ...(event.data?.json() || {}) } } catch {}
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/assets/polyswap-mark.png?v=2',
    badge: '/assets/polyswap-mark.png?v=2',
    data: { jobId: payload.jobId || '', navigate: payload.navigate || '' }
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const jobId = event.notification.data?.jobId || ''
  const destination = event.notification.data?.navigate || ('/mobile.html' + (jobId ? '#job=' + encodeURIComponent(jobId) : ''))
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => client.url.includes('/mobile.html'))
    if (existing) {
      existing.navigate(destination)
      return existing.focus()
    }
    return self.clients.openWindow(destination)
  }))
})
