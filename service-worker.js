const CACHE_NAME = "moon-runes-pwa-v17";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/result.html",
  "/fate.html",
  "/daily.html",
  "/2card.html",
  "/3card.html",
  "/5card.html",
  "/list.html",
  "/search.html",
  "/faq.html",
  "/loc3.html",
  "/life.html",
  "/css/style.css",
  "/js/main.js",
  "/js/result.js",
  "/js/fate.js",
  "/js/daily.js",
  "/js/2card.js",
  "/js/3card.js",
  "/js/5card.js",
  "/js/runeLibrary.js",
  "/js/runes64.js",
  "/js/direction64.js",
  "/js/rune_all_data_all.js",
  "/js/list.js",
  "/64images/65_玄.png",
  "/64images/66_命.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/apple-touch-icon.png",
  "/manifest.json",
  "/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
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

  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/")
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse || fetch(request))
  );
});
