const CACHE_NAME = 'moon-runes-pwa-v3';
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'result.html',
  'fate.html',
  'daily.html',
  '2card.html',
  '3card.html',
  '5card.html',
  'list.html',
  'css/style.css',
  'js/main.js',
  'js/result.js',
  'js/fate.js',
  'js/daily.js',
  'js/2card.js',
  'js/3card.js',
  'js/5card.js',
  'js/runeLibrary.js',
  'js/list.js',
  '64images/65_玄.png',
  '64images/66_命.png',
  'manifest.json',
  'favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
