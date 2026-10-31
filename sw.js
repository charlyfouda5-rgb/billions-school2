const CACHE_NAME = 'delta-school-v20-shell';
const SHELL = ['./', './index.html', './manifest.webmanifest', './config.js', './sync.js', './features.js', './extras.js', './share.js', './demo.js', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable-512.png', './assets/icon-180.png', './assets/favicon-32.png', './assets/logo.jpg', './assets/install-logo.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (new URL(req.url).searchParams.has('ping')) return;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fetch(req).then(res => { if (res && res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone())); return res; }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
});
