// Arogya Relay — Service Worker for Offline Caching and Medicine Push Notifications

const CACHE_NAME = "arogya-relay-v1";
const STATIC_ASSETS = ["/", "/manifest.json", "/hotspot-qr.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Web Push event listener
self.addEventListener("push", (event) => {
  let data = { title: "⏰ Arogya Relay: Medicine Reminder", body: "It is time to take your scheduled dose." };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/hotspot-qr.png",
    badge: "/hotspot-qr.png",
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: "take", title: "✓ Mark Taken" },
      { action: "snooze", title: "⏰ Snooze 10m" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "take") {
    // Handled in client or logged
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});
