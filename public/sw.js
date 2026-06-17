const CACHE = "Trigr-v1";
const OFFLINE = ["/", "/assistant", "/dashboard"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

self.addEventListener("push", e => {
  const data = e.data?.json() ?? {};
  const title = data.title ?? "Trigr";
  const options = {
    body: data.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag ?? "Trigr-notif",
    renotify: true,
    data: { url: data.url ?? "/dashboard" },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/dashboard";
  e.waitUntil(clients.matchAll({ type: "window" }).then(cs => {
    const c = cs.find(w => w.url.includes(url));
    if (c) return c.focus();
    return clients.openWindow(url);
  }));
});
