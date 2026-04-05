/**
 * Lifework Service Worker
 * Strategy: Network-first for all assets (avoids stale JS/CSS caches).
 * Falls back to cache only when network is unavailable.
 */

const CACHE_NAME = 'lifework-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls — always go to the network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Never intercept Vite internal requests
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/__')) {
    return;
  }

  // Network-first for everything: always try network, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
