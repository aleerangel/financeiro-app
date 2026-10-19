self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico';

  // Nunca intercepta ou usa cache para páginas autenticadas, RSC payloads ou rotas de auth
  if (!isStaticAsset) return;

  event.respondWith(
    fetch(event.request).catch((err) => {
      return caches.match(event.request).then((res) => res || Promise.reject(err));
    })
  );
});
