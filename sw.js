// sw.js - Service Worker para PWA de prueba

const CACHE_NAME = 'pwa-test-v1';
const urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ============================================================
// INSTALACIÓN
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVACIÓN
// ============================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH (para servir la PWA offline)
// ============================================================
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // Guardamos en cache las respuestas nuevas
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});

// ============================================================
// MENSAJES (para recibir notificaciones desde la UI)
// ============================================================
self.addEventListener('message', event => {
  console.log('[SW] Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    // Enviamos la notificación simulada a todos los clientes (pestañas)
    const text = event.data.text || 'soy el gato';
    
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_RECEIVED',
          text: text
        });
      });
    });
    
    // También mostramos una notificación real del sistema (opcional)
    if (self.registration && self.registration.showNotification) {
      self.registration.showNotification('📨 Notificación de prueba', {
        body: `Texto: "${text}"`,
        icon: '/icon-192.png',
        vibrate: [200, 100, 200],
        data: {
          text: text
        }
      });
    }
  }
});

// ============================================================
// NOTIFICACIONES PUSH (para futuras pruebas)
// ============================================================
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Notificación', body: 'Mensaje' };
  
  const options = {
    body: data.body || 'Cuerpo de la notificación',
    icon: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      text: data.body || 'soy el gato'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '📨 Nueva notificación', options)
  );
});

// ============================================================
// CLIC EN NOTIFICACIÓN
// ============================================================
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Abrimos la PWA cuando se hace clic en la notificación
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Si ya hay una ventana abierta, la enfocamos
        for (const client of clientList) {
          if (client.url && client.url.includes('/index.html')) {
            return client.focus();
          }
        }
        // Si no, abrimos una nueva
        return self.clients.openWindow('/index.html');
      })
      .then(() => {
        // Enviamos el mensaje a la UI para que reaccione
        const text = event.notification.data?.text || 'soy el gato';
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'NOTIFICATION_RECEIVED',
              text: text
            });
          });
        });
      })
  );
});