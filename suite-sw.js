/* Mortgage Suite 57.38: keeps the Loan Suite's scripts and styles on the device, so a repeat visit does not wait
   for 50 network round trips (GitHub Pages only lets browsers keep a file for 10 minutes).

   What it touches - and nothing else:
     - GET requests for same-origin files under assets/ that carry a ?v= version,
     - and only when the page asking for them is a Loan Suite page (loan-suite*.html, full-suite.html, all-in-one.html).
   Every other request - page loads themselves, the Income Calculator, Quick, the Doc Organizer, workers, fonts,
   uploads, anything without ?v= - is never answered here, so the browser fetches it exactly as it would without
   this file.

   How: the copy on the device answers at once, and the file is checked again in the background (a 304 when nothing
   changed), so an edit that forgot to bump ?v= still shows up on the next visit. Older versions of a file are
   dropped when a new one is stored.

   Turning it off: replace this file's contents with
     self.addEventListener('install',()=>self.skipWaiting());
     self.addEventListener('activate',e=>e.waitUntil(caches.delete('mt-suite-v1').then(()=>self.registration.unregister())));
   Registered by tools/lazy-suite.py's loader on the Loan Suite pages only. */
const CACHE = 'mt-suite-v1';
const BASE = new URL('./', self.location).pathname;            // e.g. /mtgcalc/
const SUITE_PAGE = /^(?:loan-suite[\w-]*|full-suite|all-in-one)\.html$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('mt-suite-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

function fromSuitePage(req) {
  if (!req.referrer) return false;
  try {
    const r = new URL(req.referrer);
    return r.origin === self.location.origin && r.pathname.startsWith(BASE) && SUITE_PAGE.test(r.pathname.slice(BASE.length));
  } catch (e) { return false; }
}

async function store(cache, req, res) {
  const path = new URL(req.url).pathname;
  for (const old of await cache.keys()) if (new URL(old.url).pathname === path && old.url !== req.url) await cache.delete(old);
  await cache.put(req, res);
}

async function staleWhileRevalidate(event) {
  const req = event.request;
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); event.waitUntil(store(cache, req, copy)); }
    return res;
  });
  if (hit) { event.waitUntil(net.catch(() => {})); return hit; }
  return net;
}

/* first visit: the page lists the versioned files it just downloaded, so the next visit is already fast. They come
   out of the browser's own cache, so this costs no extra download. */
function wanted(u) {
  try {
    const url = new URL(u, self.location);
    return url.origin === self.location.origin && url.pathname.startsWith(BASE + 'assets/') && url.searchParams.has('v') ? url.href : null;
  } catch (e) { return null; }
}
self.addEventListener('message', event => {
  const list = event.data && event.data.mtCache;
  const from = event.source && event.source.url;
  if (!Array.isArray(list) || !from || !fromSuitePage({ referrer: from })) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const todo = [...new Set(list.slice(0, 200).map(wanted).filter(Boolean))];
    async function worker() {                                   // six at a time
      for (let href; (href = todo.shift());) {
        if (await cache.match(href)) continue;
        try { const res = await fetch(href, { credentials: 'same-origin' }); if (res.ok && res.type === 'basic') await store(cache, new Request(href), res); } catch (e) {}
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode === 'navigate') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE + 'assets/') || !url.searchParams.has('v')) return;
  if (!fromSuitePage(req)) return;
  event.respondWith(staleWhileRevalidate(event));
});
