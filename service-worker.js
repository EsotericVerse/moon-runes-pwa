const CACHE_NAME = "moon-runes-pwa-v109";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/result.html",
  "/list.html",
  "/search.html",
  "/tutorial01.html",
  "/life.html",
  "/css/style.css",
  "/js/loc-nav.js",
  "/css/loc-nav.css",
  "/css/loc-responsive.css",
  "/data/json/registries/LOC_NAV.json",
  "/data/json/registries/LOC_KM_KEYWORDS.json",
  "/data/json/registries/LOC_KNOWLEDGE_ASSET_REGISTRY.json",
  "/data/json/registries/LOC_ERA_REGISTRY.json",
  "/data/json/core/lots.json",
  "/data/json/core/runes64.json",
  "/js/main.js",
  "/js/locMoonPhase.js",
  "/js/result.js",
  "/js/runeLibrary.js",
  "/js/runes64.js",
  "/js/direction64.js",
  "/js/list.js",
  "/64images/65_玄.png",
  "/64images/66_命.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/apple-touch-icon.png",
  "/manifest.json",
  "/pics/loc_framework_map.jpg",
  "/pics/loc_operation_cycle.jpg",
  "/pics/loc_system_overview.jpg",
  "/pics/loc_runes_66_overview.jpg",
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
