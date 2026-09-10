const CACHE_NAME = "moon-runes-pwa-v196";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/search.html",
  "/js/search-sources.js",
  "/statics.htm",
  "/runes.html",
  "/lots.html",
  "/context.html",
  "/game.html",
  "/governance.html",
  "/lo3rwang.html",
  "/tutorial01.html",
  "/tutorial02.html",
  "/evolution.html",
  "/css/style.css",
  "/js/loc-nav.js",
  "/js/loc-nav1.js",
  "/js/home-canonical.js",
  "/js/loc-periods.js",
  "/css/loc-nav.css",
  "/css/loc-responsive.css",
  "/css/rune-draw.css",
  "/data/html/runes-beginner.html",
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
  "/data/json/core/runes66.json",
  "/data/json/core/runes66groups.json",
  "/data/json/sources/facebook/manifest.json",
  "/js/main.js",
  "/js/locMoonPhase.js",
  "/js/facebook-repo-corpus.js",
  "/js/runes-pwa-ia.js",
  "/js/rune-draw.js?v=20260908-4",
  "/js/rune-daily-records.js?v=20260908-1",
  "/js/runeLibrary.js?v=20260905-3",
  "/js/runes66.js",
  "/js/direction64.js",
  "/js/rune_all_data_all.js",
  "/js/quick-selector.js",
  "/js/list.js?v=20260905-5",
  "/js/loc2-game.js",
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
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isNavigation = request.mode === "navigate";
  const isJs = url.pathname.endsWith(".js");
  const isHtml = url.pathname.endsWith(".html") || url.pathname.endsWith(".htm") || url.pathname === "/";
  const isCoreRuneData = [
    "/data/json/core/runes66.json",
    "/data/json/core/runes66groups.json"
  ].includes(url.pathname);

  if (isNavigation || isJs || isHtml || isCoreRuneData) {
    event.respondWith(
      fetch(request, {cache:"no-store"})
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response && response.ok && url.origin === location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
