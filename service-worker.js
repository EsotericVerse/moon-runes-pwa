const CACHE_NAME = "moon-runes-pwa-v184";

// Keep precache intentionally small. Feature pages now own their own data lifecycle.
// Large registries, analysis snapshots, rune datasets and page-specific scripts are
// fetched only when the corresponding page/function is opened.
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/css/style.css",
  "/css/loc-nav.css",
  "/css/loc-responsive.css",
  "/js/loc-nav.js",
  "/js/search-source-stats.js",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/apple-touch-icon.png",
  "/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("moon-runes-pwa-") && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET") return;

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  // Generated/dynamic data must stay fresh and must not accumulate in Cache Storage.
  if (
    url.pathname.startsWith("/data/json/generated/") ||
    url.pathname.startsWith("/data/json/registries/") ||
    url.pathname.startsWith("/data/json/core/")
  ) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // Feature pages are network-first. They are no longer globally precached.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  // JS/CSS are cached only after a page actually requests them.
  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(caches.match(request).then((cachedResponse) => cachedResponse || fetch(request)));
});