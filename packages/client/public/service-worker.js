const CACHE_NAME = "watcher-pwa-v1";
const STATIC_ASSET_PATTERN = /\.(?:css|js|mjs|svg|png|jpg|jpeg|webp|glb|webmanifest)$/i;

function getAppShellUrls() {
  const scopeUrl = new URL(self.registration.scope);

  return [
    scopeUrl.href,
    new URL("manifest.webmanifest", scopeUrl).href,
    new URL("pwa-icon.svg", scopeUrl).href
  ];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(getAppShellUrls()))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(self.registration.scope)));
    return;
  }

  if (!STATIC_ASSET_PATTERN.test(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }

          return response;
        })
        .catch(() => undefined);

      return cachedResponse ?? networkResponse.then((response) => response ?? Response.error());
    })
  );
});
