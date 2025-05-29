
self.addEventListener('install', event => {
  console.log('[SW] 安裝完成');
  event.waitUntil(
    caches.open('moon-runes-cache-v1').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './data/runes.json',
        './images/41_語.png',
        './images/42_憶.png'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
