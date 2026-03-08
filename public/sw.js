/**
 * TCD Tickets Service Worker
 *
 * Strategies:
 *  - Static assets (JS/CSS/fonts): Cache-first with network fallback
 *  - API routes: Network-first with stale-while-revalidate for safe reads
 *  - Ticket pages: Stale-while-revalidate for offline viewing
 *  - Push notifications: handled via `push` event
 */

const CACHE_NAME = 'tcd-tickets-v1';
const OFFLINE_URL = '/offline';

// Resources to pre-cache at install time
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
];

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Non-fatal: offline page may not exist yet during development
      });
    })
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────────
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

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Skip Next.js internal routes and HMR
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // API routes: network-first (safe GETs only)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, 3000));
    return;
  }

  // Ticket card pages: stale-while-revalidate for offline access
  if (url.pathname.startsWith('/tickets/') && url.pathname.endsWith('/card')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation pages: network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }
});

// ── Push Notifications ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'TCD Tickets', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: data.link || '/' },
    actions: data.actions || [],
    tag: data.tag || 'tcd-tickets',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TCD Tickets', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Cache strategies ───────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || networkFetch;
}

async function networkFirstWithTimeout(request, timeoutMs) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
