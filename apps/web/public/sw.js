const CACHE = "mst-reparto-v1";
const SHELL = ["/login", "/reparto"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // API: network-only. El snapshot de ruta vive en IndexedDB, no en Cache Storage.
  if (url.port === "3001" || url.origin !== self.location.origin) {
    return;
  }
  if (req.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const cacheable =
          res.ok &&
          (url.pathname === "/login" ||
            url.pathname === "/reparto" ||
            url.pathname.startsWith("/_next/static/"));
        if (cacheable) {
          const copy = res.clone();
          void caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit ?? caches.match("/reparto")),
      ),
  );
});
