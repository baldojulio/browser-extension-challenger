const CACHE_NAME = 'browser-extension-v1';
const urlsToCache = [
  'style.css',
  'script.js',
  'data.json'
];

self.addEventListener('install', event => {
  // Skip waiting to activate immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // Claim clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Only cache specific resources, let HTML go through normally for bfcache
  if (event.request.destination === 'document') {
    return; // Don't cache HTML documents
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          // Only cache successful responses for static assets
          if (response.status === 200 && 
              (event.request.destination === 'style' || 
               event.request.destination === 'script' ||
               event.request.url.includes('.json'))) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
  );
});
