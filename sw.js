const CACHE = "gin-counter-v6";

const STATIC_ASSETS = [
  "./manifest.webmanifest",
  "./gin.png",
  "./rum.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  // API requests must always go to the network.
  if (url.hostname === "train-isp-check.vercel.app") {
    return;
  }

  // Always prefer the newest HTML/navigation response.
  if (
    request.mode === "navigate" ||
    request.destination === "document" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html")
  ) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request, {
            cache: "no-store"
          });
        } catch (error) {
          const cached = await caches.match("./index.html");

          if (cached) {
            return cached;
          }

          throw error;
        }
      })()
    );

    return;
  }

  // Static assets: cache first, then refresh/fill cache from network.
  event.respondWith(
    caches.match(request).then(async cached => {
      if (cached) {
        return cached;
      }

      const response = await fetch(request);

      if (response.ok && url.origin === self.location.origin) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }

      return response;
    })
  );
});
