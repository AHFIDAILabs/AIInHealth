// Push notifications (admin/delegate) — unchanged from before this file also
// took on PWA duties below.
self.addEventListener('push', (event) => {
  let data = { title: 'AI in Health Summit 2026', body: '' };
  try {
    data = event.data ? event.data.json() : data;
  } catch {
    data.body = event.data ? event.data.text() : '';
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'AI in Health Summit 2026', {
      body: data.body || '',
      icon: '/summit-icon.png',
      badge: '/summit-icon.png',
      data: { url: data.url || '/admin/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/admin/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// --- PWA app-shell caching ---
//
// Deliberately conservative — the backend API lives on a different origin
// (see VITE_API_URL), so it's never touched here at all: this handler bails
// out before `respondWith` for anything that isn't a same-origin GET, which
// already excludes every API call, Cloudinary image, and Google Fonts
// request. Nothing about auth, live registration/payment/admin data, or any
// POST/PUT/PATCH/DELETE request is ever cached or intercepted.
//
// Two strategies, chosen by request type:
// - Page navigations (the HTML document): network-first. A visitor online
//   always gets the just-deployed page (so a new release is never masked by
//   a stale cached shell); only falls back to the last cached shell if the
//   network request fails outright (offline).
// - Same-origin static assets (JS/CSS/images/fonts): cache-first. Vite's
//   build hashes every asset filename, so a cached file is either identical
//   to the current one or simply not requested anymore — there's no
//   staleness risk in caching these aggressively.
const CACHE_NAME = 'aihs-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Best-effort pre-cache — never let a failed fetch here (e.g. a network
  // hiccup during install) block the service worker from installing at all.
  // The fetch handler below fills the cache lazily on the next real
  // navigation regardless.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add('/').catch(() => {})));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const res = await fetch(request);
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
  );
});
