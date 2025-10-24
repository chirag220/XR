const VERSION = 'xr-device-v1';
const STATIC_ASSETS = [
  '/device', // HTML shell
  '/public/css/common.css',
  '/public/css/device.css',
  '/public/css/styles.css',
  '/public/js/app.js',
  '/public/js/config.js',
  '/public/js/device.js',
  '/public/js/ui.js',
  '/public/js/signaling.js',
  '/public/js/voice.js',
  '/public/js/telemetry.js',
  '/public/js/webrtc-quality.js',
  '/public/js/messages.js',
  '/public/images/xr-logo-192.png',
  '/public/images/xr-logo-512.png'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(STATIC_ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  const url = new URL(req.url);

  // NEVER touch Socket.IO / websockets
  if (url.pathname.startsWith('/socket.io')) return;

  if (req.method !== 'GET') return;

  // Keep pages fresh for XR flows (network-first for documents)
  if (req.destination === 'document') {
    evt.respondWith((async () => {
      try { return await fetch(req, { cache: 'no-store' }); }
      catch {
        const cache = await caches.open(VERSION);
        const cached = await cache.match('/device');
        return cached || Response.error();
      }
    })());
    return;
  }

  // Stale-while-revalidate for static assets
  evt.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    const fetcher = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fetcher;
  })());
});
