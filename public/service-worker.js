self.addEventListener('install', event => {
  console.log('[SW] 安裝完成');
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
