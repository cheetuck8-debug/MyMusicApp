/* MyMusic Service Worker - 离线缓存 */
const CACHE = 'mymusic-v1';
const ASSETS = ['./', './index.html', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 下载服务请求不缓存，走网络
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});
