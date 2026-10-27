/* =========================================================
   EleoQuadrinho — Service Worker (Offline Cache & PWA)
   ========================================================= */
const CACHE_NAME = 'eq-cache-v43-scheduled';
const ASSETS_ESTATICOS = [
  './',
  './index.html',
  './css/style.css?v=scheduled-20261027-40',
  './js/data.js?v=scheduled-20261027-40',
  './js/fontes.js?v=scheduled-20261027-40',
  './js/universe-tree.js?v=scheduled-20261027-40',
  './js/content-access.js?v=scheduled-20261027-40',
  './js/user-access-ui.js?v=scheduled-20261027-40',
  './js/cbr-import.js?v=scheduled-20261027-40',
  './js/cbr-worker.js?v=scheduled-20261027-40',
  './js/unrar.wasm?v=scheduled-20261027-40',
  './js/reward-seasons.js?v=scheduled-20261027-40',
  './js/reward-art.js?v=scheduled-20261027-40',
  './js/community.js?v=scheduled-20261027-40',
  './js/local-library.js?v=scheduled-20261027-40',
  './js/release-news.js?v=scheduled-20261027-40',
  './js/library-view.js?v=scheduled-20261027-40',
  './js/app.js?v=scheduled-20261027-40',
  './js/account-client.js?v=scheduled-20261027-40',
  './js/jszip.min.js?v=scheduled-20261027-40',
  './js/package-batch.js?v=scheduled-20261027-40',
  './js/hq-package.js?v=scheduled-20261027-40',
  './js/epic-rewards.js?v=scheduled-20261027-40',
  './js/scheduled-events.js?v=scheduled-20261027-40',
  './js/reading-rewards.js?v=scheduled-20261027-40',
  './manifest.json',
  './assets/icon.svg',
  './assets/universe-default.svg',
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
