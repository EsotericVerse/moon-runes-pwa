const CACHE_NAME = "moon-runes-pwa-v180";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/search.html",
  "/runes.html",
  "/lots.html",
  "/statics.html",
  "/context.html",
  "/game.html",
  "/governance.html",
  "/lo3rwang.html",
  "/tutorial01.html",
  "/tutorial02.html",
  "/evolution.html",
  "/css/style.css",
  "/js/loc-nav.js",
  "/js/loc-periods.js",
  "/js/statics-workspace.js",
  "/js/search-source-stats.js",
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
  "/data/json/core/runes66.json",
  "/data/json/core/runes66groups.json",
  "/js/main.js",
  "/js/locMoonPhase.js",
  "/js/rune-draw.js?v=20260908-4",
  "/js/rune-daily-records.js?v=20260910-statics",
  "/js/runeLibrary.js?v=20260905-3",
  "/js/runes66.js",
  "/js/direction64.js",
  "/js/rune_all_data_all.js",
  "/js/quick-selector.js",
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
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((cacheNames) => Promise.all(cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) { event.respondWith(fetch(request)); return; }

  if (url.pathname === "/data/json/generated/LOC_RUNE_FREQUENCY_STATS.json" || url.pathname === "/data/json/generated/loc4/threads/LOC4_THREADS_DOCUMENT_MANIFEST.json" || url.pathname.startsWith("/data/json/generated/loc4/threads/main/")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (["/search.html","/runes.html","/lots.html","/statics.html","/evolution.html","/game.html"].includes(url.pathname)) {
    event.respondWith(fetch(request, { cache: "no-store" }).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === "navigate" || url.pathname.endsWith(".js") || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    event.respondWith(fetch(request, { cache: "no-store" }).then((networkResponse) => {const responseClone = networkResponse.clone();caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));return networkResponse;}).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(caches.match(request).then((cachedResponse) => cachedResponse || fetch(request)));
});