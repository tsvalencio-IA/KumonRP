const CACHE_NAME = 'kumon-diario-v6'; // <--- ALTERAÇÃO CRÍTICA
const urlsToCache = [
    './',
    './index.html',
    './css/styles.css',
    './js/config.js',
    './js/app.js',
    './js/auth.js',
    './icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
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
            // Deleta caches antigos (v1, v2, v3, v4, v5)
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});