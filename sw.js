/* =========================================================
   EleoQuadrinho — Service Worker (Offline Cache & PWA)
   ========================================================= */
const CACHE_NAME = 'eq-cache-v48-direct';
const ASSETS_ESTATICOS = [
  './',
  './index.html',
  './css/style.css?v=direct-20261028-45',
  './js/data.js?v=direct-20261028-45',
  './js/fontes.js?v=direct-20261028-45',
  './js/universe-tree.js?v=direct-20261028-45',
  './js/content-access.js?v=direct-20261028-45',
  './js/user-access-ui.js?v=direct-20261028-45',
  './js/cbr-import.js?v=direct-20261028-45',
  './js/cbr-worker.js?v=direct-20261028-45',
  './js/unrar.wasm?v=direct-20261028-45',
  './js/reward-seasons.js?v=direct-20261028-45',
  './js/thunder-rewards.js?v=direct-20261028-45',
  './js/noxus-rewards.js?v=direct-20261028-45',
  './js/reward-art.js?v=direct-20261028-45',
  './js/community.js?v=direct-20261028-45',
  './js/local-library.js?v=direct-20261028-45',
  './js/release-news.js?v=direct-20261028-45',
  './js/library-view.js?v=direct-20261028-45',
  './js/direct-transfers.js?v=direct-20261028-45',
  './js/app.js?v=direct-20261028-45',
  './js/account-client.js?v=direct-20261028-45',
  './js/jszip.min.js?v=direct-20261028-45',
  './js/package-batch.js?v=direct-20261028-45',
  './js/hq-package.js?v=direct-20261028-45',
  './js/epic-rewards.js?v=direct-20261028-45',
  './js/scheduled-events.js?v=direct-20261028-45',
  './js/reading-rewards.js?v=direct-20261028-45',
  './manifest.json',
  './assets/icon.svg',
  './assets/universe-default.svg',
  './assets/thundercats-frames.png',
  './assets/thundercats-avatars.png',
  './assets/noxus-frames.png',
  './assets/noxus-avatars.png',
  './assets/capas/guardia.jpg',
  './assets/capas/grega.jpg',
  './assets/capas/nordica.jpg',
  './assets/capas/egipcia.jpg',
  './assets/capas/folclore.jpg',
  './assets/capas/japonesa.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_ESTATICOS.map(url => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Não intercepta chamadas de API externas pesadas ou POSTs
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  if (url.origin !== location.origin) {
    // Para CDNs externas (fontes, pdf.js, jszip), tenta rede com fallback para cache
    if (url.hostname.includes('cdnjs') || url.hostname.includes('jsdelivr') || url.hostname.includes('fonts.g')) {
      e.respondWith(
        caches.match(e.request).then(cached => {
          return cached || fetch(e.request).then(res => {
            if (res.ok) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
            }
            return res;
          }).catch(() => cached);
        })
      );
    }
    return;
  }

  // Network-first for application code so authentication updates are not pinned offline.
  if (e.request.mode === 'navigate' || /\.(js|css)$/.test(url.pathname)) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy))); }
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }

  // Para arquivos locais: Stale-While-Revalidate
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res.ok) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
