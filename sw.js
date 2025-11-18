const CACHE_NAME = 'kumon-diario-v12'; // <--- ATUALIZADO PARA v12 (CRÍTICO)
const urlsToCache = [
    './',
    './index.html',
    './css/styles.css',
    './js/config.js', // <--- Caminho 'js/' (um 's')
    './js/app.js',    // <--- Caminho 'js/'
    './js/auth.js',   // <--- Caminho 'js/'
    './icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Tenta pegar da rede primeiro (para garantir dados novos)
      // Se falhar (offline), usa o cache.
      return fetch(event.request).catch(() => caches.match(event.request));
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName); // Deleta v11 e anteriores
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
