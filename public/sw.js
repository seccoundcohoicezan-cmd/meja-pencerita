/* Service worker MasteryDnD: aplikasi tetap terbuka tanpa internet.
   Halaman: jaringan dulu, cadangan dari cache. Aset ber-hash (/assets, /img): cache dulu.
   Permintaan ke Supabase/Google TIDAK pernah di-cache. */
const CACHE = 'masterydnd-v1';
const SHELL = ['/', '/portal', '/layar', '/manifest.webmanifest', '/img/logo-kecil.webp', '/img/splash.webp', '/img/ikon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match(url.pathname.startsWith('/portal') ? '/portal' : '/'))));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/img/')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; })));
  }
});
