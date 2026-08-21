/* Bharat Yatra service worker — makes the whole app work with no network.
   Heritage sites are often exactly where the signal isn't.            */
const CACHE = 'bharat-yatra-v1';
const CORE = [
  './', 'index.html', 'style.css', 'app.js', 'map3d.js', 'i18n.js', 'artwork.js',
  'vr.js', 'ar.js', 'manifest.webmanifest',
  'vendor/three.min.js', 'vendor/OrbitControls.js', 'vendor/qrcode.min.js',
  'data/content.json', 'data/districts.json', 'data/india-states.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE).catch(() => {}))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // never cache the community API — it must always be live
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200 && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
