self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Interceptação de cache estático (assets e ícones)
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

// ==============================================================================
// WEB PUSH NOTIFICATIONS
// ==============================================================================

self.addEventListener('push', (event) => {
  let data = {
    title: 'Finanças em Dia',
    body: 'Você possui novidades ou contas a vencer.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url: '/transacoes',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || (data.data && data.data.url) || '/transacoes',
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Ver Detalhes',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/transacoes';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se houver uma janela/aba do app já aberta, foca nela e redireciona
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Se nenhuma estiver aberta, abre uma nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
