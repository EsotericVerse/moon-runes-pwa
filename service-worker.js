const CACHE_NAME = "moon-runes-pwa-v165";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/context.html",
  "/governance.html",
  "/loc2-game.html",
  "/lo3rwang.html",
  "/tutorial01.html",
  "/tutorial02.html",
  "/evolution.html",
  "/css/style.css",
  "/js/loc-nav.js",
  "/js/loc-periods.js",
  "/css/loc-nav.css",
  "/css/loc-responsive.css",
  "/css/rune-draw.css",
  "/data/json/registries/LOC_NAV.json",
  "/data/json/registries/LOC_KM_KEYWORDS.json",
  "/data/json/registries/LOC_KNOWLEDGE_ASSET_REGISTRY.json",
  "/data/json/registries/LOC_ERA_REGISTRY.json",
  "/data/json/registries/LOC8_DAILY_RUNE_SNAPSHOT.json",
  "/data/json/registries/LOC8_EVENT_SNAPSHOT.json",
  "/data/json/registries/LOC_MEDIA_REGISTRY.json",
  "/data/json/registries/LOC4_WRITING_REGISTRY.json",
  "/data/json/registries/LOC_CONTENT_TYPE_REGISTRY.json",
  "/data/json/registries/LOC6_PERIOD_KEYWORD_ANALYSIS.json",
  "/data/json/registries/LOC3_PERIOD_KEYWORD_ANALYSIS.json",
  "/data/json/registries/LOC_SOURCE_ACTIVITY_REGISTRY.json",
  "/data/json/registries/LOC_KEYWORD_GOVERNANCE.json",
  "/data/json/core/lots.json",
  "/data/json/core/runes64.json",
  "/js/main.js",
  "/js/locMoonPhase.js",
  "/js/rune-draw.js?v=20260908-4",
  "/js/rune-daily-records.js?v=20260908-1",
  "/js/runeLibrary.js?v=20260905-3",
  "/js/runes64.js",
  "/js/direction64.js",
  "/js/rune_all_data_all.js",
  "/js/list.js?v=20260905-5",
  "/64images/65_玄.png",
  "/64images/66_命.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/apple-touch-icon.png",
  "/manifest.json",
  "/pics/LOC-structure.png",
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

  // Search-critical data must never be served cache-first. These files are
  // frequently regenerated and stale copies break corpus search.
  if (
    url.pathname === "/data/json/generated/loc4/threads/LOC4_THREADS_DOCUMENT_MANIFEST.json" ||
    url.pathname.startsWith("/data/json/generated/loc4/threads/main/")
  ) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // Search and LunaRunes are updated frequently. Never serve cached HTML shells.
  if (url.pathname === "/search.html" || url.pathname === "/runes.html") {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/")
  ) {
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

  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse || fetch(request))
  );
});
