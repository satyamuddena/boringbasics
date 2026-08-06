/*
 * Service worker for the installable admin app.
 *
 * Two rules govern this file, and both exist so it never has to change again:
 *
 * 1. It caches NOTHING. A caching service worker is the only way a PWA shows
 *    stale content, and stale bookings are the exact problem this app was built
 *    to fix. The fetch handler below is a pass-through that exists solely
 *    because Chrome requires one before it will offer to install the app.
 *
 * 2. It is payload-driven, not notification-aware. It renders whatever title,
 *    body, url and tag the server sends. A new kind of notification is a server
 *    change only — nobody has to reinstall the app to receive it.
 *
 * Plain JS on purpose: it is served straight from /public with no build step,
 * so what you read here is what runs.
 */

const SW_VERSION = "1";

self.addEventListener("install", () => {
  // Take over straight away rather than waiting for every tab to close, so a
  // deploy reaches the phone on the next open.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-only. Present for installability; deliberately never caches.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A malformed payload should still surface something rather than nothing.
    payload = {};
  }

  const title = payload.title || "Boring Basics";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    // Same tag replaces an earlier notification for the same booking instead of
    // stacking three near-identical rows on the lock screen.
    tag: payload.tag || "boring-basics",
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/admin/leads" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/admin/leads";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reuse an open admin window if there is one — opening a second copy of an
      // installed app is disorienting.
      for (const client of all) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              // Focus alone is still a useful outcome.
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

// Fired when a subscription is rotated by the push service. The page re-posts
// its subscription on every mount, so the next open repairs the record; this
// listener exists to make that intent explicit rather than accidental.
self.addEventListener("pushsubscriptionchange", () => {});

console.info(`[sw] Boring Basics admin worker v${SW_VERSION}`);
