// service-worker.js

const CACHE_NAME = 'moon-runes-v2'; // 每次重大修改記得改版本
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/data/runes.json',
  '/images/41_語.png',
  '/images/42_憶.png',
  // 加上所有使用到的圖片與其他檔案
  // 例如 '/images/01_靈.png' 等，可自動產生或手動列出
];

// 安裝階段：預先快取檔案
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 啟動階段：清理舊快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
});

// 攔截請求：從快取優先，否則從網路取
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse =>
      cachedResponse || fetch(event.request)
    )
  );
});
