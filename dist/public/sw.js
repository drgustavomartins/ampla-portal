const CACHE_NAME = 'ampla-facial-v3';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './favicon.png',
  './icon-192x192.png',
  './icon-512x512.png',
  './manifest.json'
];

// Install: precache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (
    event.request.destination === 'style' ||
    event.request.destination === 'script' ||
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for navigation (HTML pages)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('./index.html');
        });
      })
  );
});
