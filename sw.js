/* OneSignal: lets Built by BC show notifications. If it can't load (no signal), the app still works offline. */
try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'); } catch (e) {}
/* Built by BC: keeps the app on the phone so it opens with no signal. Weights themselves are saved by the page. */
const CACHE = 'bbc-push-4758edd5';
const SHELL = ["index.html", "manifest.webmanifest", "archivo.woff2", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('bbc-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // the Google Sheet API is never cached

  if (req.mode === 'navigate') {
    // Try the network for the newest version, but don't keep someone waiting in a gym with one bar of signal.
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => caches.match('index.html').then(r => { if (!done && r) { done = true; resolve(r); } });
      const timer = setTimeout(fallback, 3000);
      fetch(req).then(r => {
        if (r && r.ok) caches.open(CACHE).then(c => c.put('index.html', r.clone()));
        clearTimeout(timer);
        if (!done) { done = true; resolve(r); }
      }).catch(() => { clearTimeout(timer); fallback().then(() => { if (!done) { done = true; resolve(Response.error()); } }); });
    }));
    return;
  }

  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
