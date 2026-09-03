// Minimal push service worker for the admin portal — receives a push, shows a
// desktop notification, and focuses/opens the admin dashboard on click. No caching,
// no offline strategy: this isn't a PWA, it exists solely to receive push while no
// tab is open.

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
