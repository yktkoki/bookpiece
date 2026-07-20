const CACHE_NAME = 'bookpiece-v9';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// コード（HTML/JS/CSS）はネットワーク優先。
// キャッシュ優先にすると修正をデプロイしても端末が古いコードを使い続けるため。
// オフライン時はキャッシュにフォールバックするので PWA として動く。
const NETWORK_FIRST = /\.(html|js|css)$/;

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.method !== 'GET') return;

  const isCode =
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    NETWORK_FIRST.test(url.pathname);

  e.respondWith(
    isCode
      ? fetch(e.request)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone)).catch(() => {});
            return res;
          })
          .catch(() => caches.match(e.request))
      : caches.match(e.request).then((cached) => {
          const fetchPromise = fetch(e.request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone)).catch(() => {});
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
  );
});
