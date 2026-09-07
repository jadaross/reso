/*
 * Reso's service worker. Push only — no offline caching.
 *
 * Two rules from Apple that this file exists to obey:
 *  1. Every push MUST result in a visible notification. If a push arrives and the
 *     worker shows nothing, Safari eventually revokes the permission silently.
 *  2. The worker has to be a real, statically served file at a stable path.
 */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A malformed payload is still a push, and rule 1 says we must show something.
  }

  const title = payload.title || "Reso";
  const options = {
    body: payload.body || "",
    tag: payload.tag || "reso",
    // Replace rather than stack: a second "tap your dates" should not pile up.
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification.data && event.notification.data.url;
  if (!target) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if (client.url.includes(target) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow ? self.clients.openWindow(target) : null;
      }),
  );
});
