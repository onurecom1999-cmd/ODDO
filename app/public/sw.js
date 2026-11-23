// ODDO offline support. Pages: network first, the last copy when offline. Built files (hashed names): cache first.
// Everything else (Supabase, functions, other sites) goes straight to the network.
const CACHE = 'oddo-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!u.pathname.startsWith(scope)) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(scope, c)); return res; })
      .catch(() => caches.match(scope).then(m => m || Response.error())));
    return;
  }
  if (/\/(_expo|assets)\//.test(u.pathname) || /\/ex\/|\.(png|jpg|wasm|json)$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); }
      return res;
    })));
  }
});
