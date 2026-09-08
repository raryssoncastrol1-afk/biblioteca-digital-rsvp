const CACHE_NAME = 'rsvp-focus-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/reader.bundle.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Remove o cache buster (?v=...) da URL para casar com assets em cache
function stripCacheBuster(url) {
  try {
    const parsed = new URL(url, self.location.origin);
    if (parsed.origin === self.location.origin) {
      parsed.search = '';
      return parsed.toString();
    }
  } catch (err) {
    // URL inválida — segue o fluxo normal
  }
  return url;
}

// Estratégia Network-First: busca da rede primeiro para sempre ter o código mais recente;
// caso offline, usa a cópia do cache.
self.addEventListener('fetch', (event) => {
  // Ignora requisições de API
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.ok && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        const cacheKey = stripCacheBuster(event.request.url);
        return caches.match(cacheKey).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});