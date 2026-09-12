const CACHE_NAME = "moon-runes-pwa-v223";

// Governance rule:
// Service Worker cache is reserved for pages that depend on the Render backend.
// Static pages (including lots.html, index.html, governance.html, CSS, JS, JSON)
// must use normal browser/HTTP caching only so frequent content changes are visible immediately.
const RENDER_BACKED_PAGES = new Set([
  "/runes.html"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([...RENDER_BACKED_PAGES]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only same-origin Render-backed page shells are managed by the Service Worker.
  // Everything else bypasses the SW completely.
  if (url.origin !== self.location.origin || !RENDER_BACKED_PAGES.has(url.pathname)) {
    return;
  }

  // Render-backed page: network first, cached shell only as fallback.
  event.respondWith(
    fetch(request, { cache: "no-cache" })
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
