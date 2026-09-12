const CACHE_NAME = "moon-runes-pwa-v222";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/search.html",
  "/js/search-sources.js",
  "/js/statics-dashboard.js",
  "/js/rune-analytics.js",
  "/js/rune-context-graph.js",
  "/js/search-pure.js",
  "/statics.html",
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
  "/js/search-display-governance.js",
  "/js/loc-periods.js",
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
  "/data/json/registries/LUNARUNE_DERIVED_LEXICON.json",
  "/data/json/registries/LUNARUNE_EVOLUTION_HISTORY.json",
  "/data/json/core/lots.json",
  "/data/json/core/runes.json",
  "/data/json/core/runes66groups.json",
  "/data/json/sources/facebook/manifest.json",
  "/js/main.js",
  "/js/locMoonPhase.js",
  "/js/facebook-repo-corpus.js",
  "/js/runes-pwa-ia.js",
  "/js/rune-draw.js?v=20260908-4",
  "/js/rune-daily-records.js?v=20260913-1",
  "/js/runeLibrary.js?v=20260905-3",
  "/js/runes66.js",
  "/js/direction64.js",
  "/js/rune_all_data_all.js",
  "/js/quick-selector.js",
  "/js/rune.js?v=20260911-1",
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
  const isHtml = url.pathname.endsWith(".html") || url.pathname.endsWith(".htm") || url.pathname === "/";
  const isStylesheet = request.destination === "style" || url.pathname.endsWith(".css");
  const isCoreRuneData = [
    "/data/json/core/runes.json",
    "/data/json/core/runes66groups.json",
    "/data/json/registries/LUNARUNE_DERIVED_LEXICON.json",
    "/data/json/registries/LUNARUNE_EVOLUTION_HISTORY.json"
  ].includes(url.pathname);

  // Navigation, HTML, stylesheets, and current rune semantics are freshness-first.
  // Stylesheets must not be cache-first because new HTML paired with stale CSS
  // causes a broken first paint that only corrects after a second reload.
  if (isNavigation || isHtml || isStylesheet || isCoreRuneData) {
    event.respondWith(
      fetch(request, {cache:"no-cache"})
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

  // Versioned/static assets, including JS, are cache-first. A new service
  // worker cache version refreshes them on deployment, avoiding a network hit
  // on every page view while preserving deterministic PWA assets.
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