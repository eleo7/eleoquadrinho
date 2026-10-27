/* =========================================================
   EleoQuadrinho — Service Worker (Offline Cache & PWA)
   ========================================================= */
const CACHE_NAME = 'eq-cache-v42-community-library';
const ASSETS_ESTATICOS = [
  './',
  './index.html',
  './css/style.css?v=community-library-20261027-39',
  './js/data.js?v=community-library-20261027-39',
  './js/fontes.js?v=community-library-20261027-39',
  './js/universe-tree.js?v=community-library-20261027-39',
  './js/content-access.js?v=community-library-20261027-39',
  './js/user-access-ui.js?v=community-library-20261027-39',
  './js/cbr-import.js?v=community-library-20261027-39',
  './js/cbr-worker.js?v=community-library-20261027-39',
  './js/unrar.wasm?v=community-library-20261027-39',
  './js/reward-seasons.js?v=community-library-20261027-39',
  './js/reward-art.js?v=community-library-20261027-39',
  './js/community.js?v=community-library-20261027-39',
  './js/local-library.js?v=community-library-20261027-39',
  './js/release-news.js?v=community-library-20261027-39',
  './js/library-view.js?v=community-library-20261027-39',
  './js/app.js?v=community-library-20261027-39',
  './js/account-client.js?v=community-library-20261027-39',
  './js/jszip.min.js?v=community-library-20261027-39',
  './js/package-batch.js?v=community-library-20261027-39',
  './js/hq-package.js?v=community-library-20261027-39',
  './js/epic-rewards.js?v=community-library-20261027-39',
  './js/reading-rewards.js?v=community-library-20261027-39',
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
