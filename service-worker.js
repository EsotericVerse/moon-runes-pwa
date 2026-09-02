const CACHE_NAME = "moon-runes-pwa-v8";

// 66 張完整符文圖像：安裝完成後即可在離線狀態抽取與瀏覽。
const RUNE_IMAGES = [
  "01_靈.png", "02_魂.png", "03_彩.png", "04_憶.png",
  "05_界.png", "06_域.png", "07_鏡.png", "08_核.png",
  "09_向.png", "10_斷.png", "11_封.png", "12_鍊.png",
  "13_啟.png", "14_分.png", "15_悟.png", "16_誤.png",
  "17_生.png", "18_老.png", "19_病.png", "20_死.png",
  "21_心.png", "22_愛.png", "23_語.png", "24_韻.png",
  "25_樹.png", "26_花.png", "27_葉.png", "28_草.png",
  "29_根.png", "30_種.png", "31_實.png", "32_枝.png",
  "33_金.png", "34_玉.png", "35_晶.png", "36_地.png",
  "37_石.png", "38_鑽.png", "39_礦.png", "40_塵.png",
  "41_光.png", "42_暗.png", "43_水.png", "44_火.png",
  "45_風.png", "46_土.png", "47_雷.png", "48_氣.png",
  "49_日.png", "50_月.png", "51_星.png", "52_辰.png",
  "53_明.png", "54_時.png", "55_空.png", "56_因.png",
  "57_福.png", "58_禍.png", "59_無.png", "60_夢.png",
  "61_幻.png", "62_緣.png", "63_虛.png", "64_果.png",
  "65_玄.png", "66_命.png"
].map((fileName) => `/64images/${fileName}`);

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/result.html",
  "/fate.html",
  "/daily.html",
  "/2card.html",
  "/3card.html",
  "/5card.html",
  "/list.html",
  "/css/style.css",
  "/js/main.js",
  "/js/result.js",
  "/js/fate.js",
  "/js/daily.js",
  "/js/2card.js",
  "/js/3card.js",
  "/js/5card.js",
  "/js/runeLibrary.js",
  "/js/runes64.js",
  "/js/direction64.js",
  "/js/rune_all_data_all.js",
  "/js/list.js",
  "/js/vendor/solarlunar.min.js",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/apple-touch-icon.png",
  "/manifest.json",
  "/favicon.ico",
  ...RUNE_IMAGES
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
