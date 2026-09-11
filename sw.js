const CACHE_NAME = 'workout-routine-pwa-v2';
const ASSET_CACHE = 'workout-routine-assets-v2';

const APP_SHELL = [
  './',
  './index.html'
];

const FRESH_ASSETS = new Set([
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== ASSET_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // manifest와 앱 아이콘은 항상 네트워크에서 최신 파일을 먼저 가져온다.
  if (url.origin === self.location.origin) {
    const relativePath = './' + url.pathname.split('/').pop();

    if (FRESH_ASSETS.has(relativePath)) {
      event.respondWith(
        fetch(event.request, { cache: 'no-store' })
          .then(response => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then(cache => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      );
      return;
    }
  }

  // 화면 자체도 온라인일 때 최신 버전을 우선 사용한다.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 그 외 정적 파일은 캐시 우선.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
