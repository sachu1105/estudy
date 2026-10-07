// Service worker: web push, and enough caching that Today still opens without a
// connection (milestone 16). Deliberately small — no framework, no precache manifest.

const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon.svg"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL && key !== PAGES)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Pages the app caches a copy of, so they open again offline. */
const CACHEABLE = ["/today", "/plan", "/calendar", "/pods"];

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache anything that is per-request: sessions, streams, uploads.
  if (url.pathname.startsWith("/api/")) return;
  if (request.headers.get("accept")?.includes("text/event-stream")) return;
  if (request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok && CACHEABLE.includes(url.pathname)) {
          const cache = await caches.open(PAGES);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        // Offline: the last copy of this page, else the offline page.
        const cached = await caches.match(request, { ignoreSearch: true });
        return cached ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let message;
  try {
    message = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(message.title ?? "Study planner", {
      body: message.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: message.tag,
      data: { url: message.url ?? "/today" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/today";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Reuse a tab that is already open rather than piling up new ones.
        const open = clients.find((client) => client.url.includes(target));
        if (open) return open.focus();
        const any = clients[0];
        if (any && "navigate" in any)
          return any.navigate(target).then((c) => c && c.focus());
        return self.clients.openWindow(target);
      }),
  );
});
