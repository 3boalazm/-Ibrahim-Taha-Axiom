/* Service worker of the installable app (site/README.md#install-as-an-app).
 *
 * Built in two steps: src/pages/sw.js.ts writes this file to dist/sw.js with the interface
 * strings filled in, then scripts/service-worker.mjs (astro:build:done) fills in the
 * precache list, the brand mark and VERSION, a hash of this worker and of every precached
 * file, so any change to them changes sw.js and browsers pick up the new worker.
 *
 *   pages (navigations)     network first. A saved copy is used only when the network
 *                           fails; without one, an offline page lists the saved pages.
 *                           A page the server reports gone (404, 410) loses its saved
 *                           copy, so withdrawn content does not stay readable offline.
 *   /_astro/ (hashed files) cache first: a file name changes whenever its content does
 *   .json (search index)    network first, saved copy offline
 *   other same-origin GETs  stale-while-revalidate (images, icons, manifests)
 *   never touched           other origins, non-GET requests, /api/ (the site assistant),
 *                           /_vercel/ (Vercel Web Analytics),
 *                           Range requests and this file
 */
const VERSION = '__VERSION__';
const PRECACHE = /*__PRECACHE__*/ [];
const STRINGS = /*__STRINGS__*/ {};
const MARK = /*__MARK__*/ '';

const SHELL = `axiom-shell-${VERSION}`;
const PAGES = 'axiom-pages';
const ASSETS = 'axiom-assets';
const FILES = 'axiom-files';
/** Once a cache holds more entries than this, the oldest go first. */
const LIMITS = { [PAGES]: 80, [ASSETS]: 120, [FILES]: 80 };
const MATCH = { ignoreVary: true };

const isArabic = (pathname) => pathname === '/ar/' || pathname.startsWith('/ar/');
/** A page's HTML depends on its path only: the query and the hash are state for scripts. */
const pageKey = (url) => url.origin + url.pathname;
const usable = (response) => Boolean(response) && response.ok && response.type === 'basic' && !response.redirected;
const isHtml = (response) => (response.headers.get('content-type') || '').includes('text/html');
const skipped = (url) =>
  url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/') || url.pathname === '/sw.js';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // no-cache: revalidate with the server (a cheap 304 when nothing changed)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL, PAGES, ASSETS, FILES];
      for (const name of await caches.keys()) {
        if (name.startsWith('axiom-') && !keep.includes(name)) await caches.delete(name);
      }
      // the page request starts while the worker boots, instead of after
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (skipped(url)) return;
  if (request.mode === 'navigate') event.respondWith(page(event, url));
  else if (url.pathname.startsWith('/_astro/')) event.respondWith(cacheFirst(event, request));
  else if (url.pathname.endsWith('.json')) event.respondWith(networkFirst(event, request));
  else event.respondWith(staleWhileRevalidate(event, request));
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'cache-urls' && Array.isArray(data.urls)) event.waitUntil(warm(data.urls.slice(0, 120)));
});

async function store(cacheName, key, response) {
  const cache = await caches.open(cacheName);
  await cache.put(key, response);
  const keys = await cache.keys();
  for (const old of keys.slice(0, Math.max(0, keys.length - LIMITS[cacheName]))) await cache.delete(old);
}

/** Drops the saved copy of a page the site no longer serves. */
async function forget(key) {
  const cache = await caches.open(PAGES);
  await cache.delete(key, MATCH);
}

async function page(event, url) {
  try {
    const response = (await event.preloadResponse) || (await fetch(event.request));
    if (usable(response) && isHtml(response)) event.waitUntil(store(PAGES, pageKey(url), response.clone()));
    else if (response.status === 404 || response.status === 410) event.waitUntil(forget(pageKey(url)));
    return response;
  } catch (error) {
    const key = pageKey(url);
    const saved = (await caches.match(key, { ...MATCH, cacheName: PAGES })) || (await caches.match(key, { ...MATCH, cacheName: SHELL }));
    return saved || offlinePage(url);
  }
}

async function cacheFirst(event, request) {
  const saved = await caches.match(request, MATCH);
  if (saved) return saved;
  const response = await fetch(request);
  if (usable(response)) event.waitUntil(store(ASSETS, request, response.clone()));
  return response;
}

async function networkFirst(event, request) {
  try {
    const response = await fetch(request);
    if (usable(response)) event.waitUntil(store(FILES, request, response.clone()));
    return response;
  } catch (error) {
    const saved = await caches.match(request, MATCH);
    if (saved) return saved;
    throw error;
  }
}

async function staleWhileRevalidate(event, request) {
  const saved = await caches.match(request, MATCH);
  const fresh = fetch(request).then((response) => {
    if (usable(response)) event.waitUntil(store(FILES, request, response.clone()));
    return response;
  });
  if (!saved) return fresh;
  event.waitUntil(fresh.catch(() => undefined));
  return saved;
}

/** First visit: the page loaded before this worker was running, so it sends the URLs it
 *  used. They are read from the browser's HTTP cache, not downloaded again. */
async function warm(urls) {
  for (const raw of urls) {
    let url;
    try {
      url = new URL(raw, self.location.origin);
    } catch {
      continue;
    }
    if (skipped(url)) continue;
    const asPage = url.pathname.endsWith('/');
    const key = asPage ? pageKey(url) : url.href;
    if (await caches.match(key, MATCH)) continue;
    try {
      const response = await fetch(key, { cache: 'force-cache' });
      if (!usable(response) || (asPage && !isHtml(response))) continue;
      await store(asPage ? PAGES : url.pathname.startsWith('/_astro/') ? ASSETS : FILES, key, response);
    } catch {
      // offline or gone: nothing to keep
    }
  }
}

/* ---- the offline page: built here, so it needs nothing from the network ---- */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const unescape = (value) =>
  value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] !== '#') return NAMED[code.toLowerCase()] ?? whole;
    const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
  });

/** The <title> sits in the first few kilobytes, so reading stops there. */
async function titleOf(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  try {
    while (text.length < 65536) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      const found = /<title>([^<]*)<\/title>/i.exec(text);
      if (found) return unescape(found[1]).trim();
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
  return '';
}

/** Saved pages in the visitor's language, newest first (at most 30). */
async function savedPages(lang) {
  const list = [];
  const seen = new Set();
  const suffix = ` — ${STRINGS.site}`;
  for (const name of [PAGES, SHELL]) {
    const cache = await caches.open(name);
    for (const request of (await cache.keys()).reverse()) {
      const { pathname } = new URL(request.url);
      if (!pathname.endsWith('/') || seen.has(pathname) || isArabic(pathname) !== (lang === 'ar')) continue;
      const response = await cache.match(request, MATCH);
      if (!response) continue;
      seen.add(pathname);
      let title = await titleOf(response);
      if (title.endsWith(suffix)) title = title.slice(0, -suffix.length);
      list.push({ pathname, title: title && title !== STRINGS.site ? title : STRINGS[lang].home });
      if (list.length >= 30) return list;
    }
  }
  return list;
}

const OFFLINE_CSS = `
:root{color-scheme:light;--paper:#f7f4ee;--ink:#101e19;--ink-2:#414e48;--rule:#dbd5c7;--accent:#1e4b3a;--ring:#a9843f}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){color-scheme:dark;--paper:#0e1512;--ink:#efefe7;--ink-2:#b9c2bb;--rule:#2a352f;--accent:#9ed0b4;--ring:#d8b578}}
:root[data-theme=dark]{color-scheme:dark;--paper:#0e1512;--ink:#efefe7;--ink-2:#b9c2bb;--rule:#2a352f;--accent:#9ed0b4;--ring:#d8b578}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--paper);color:var(--ink);font:1.0625rem/1.65 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Arabic","Noto Naskh Arabic",Tahoma,sans-serif}
main{width:min(34rem,100% - 2.5rem);padding:3rem 0}
.mark{display:block;width:3.25rem;height:3.25rem;color:var(--ink)}
.mark [stroke]{stroke:var(--ring)}
.mark path:not([stroke]){fill:currentColor}
h1{font-size:1.75rem;line-height:1.25;margin:1.25rem 0 .5rem}
h2{font-size:1rem;margin:2.25rem 0 .5rem}
p{margin:0 0 1rem;color:var(--ink-2)}
a{color:var(--accent);text-underline-offset:.2em}
a:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:2px}
.actions{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1.5rem;margin-top:1.5rem}
.button{display:inline-block;padding:.6em 1.25em;border-radius:999px;background:var(--ink);color:var(--paper);font-weight:600;text-decoration:none}
ul{list-style:none;margin:0;padding:0;border-top:1px solid var(--rule)}
li{border-bottom:1px solid var(--rule)}
li a{display:block;padding:.65rem 0}`;

async function offlinePage(url) {
  const lang = isArabic(url.pathname) ? 'ar' : 'en';
  const s = STRINGS[lang];
  const saved = await savedPages(lang).catch(() => []);
  const list = saved.length
    ? `<h2>${esc(s.offlineSaved)}</h2><ul data-offline-saved>${saved
        .map((p) => `<li><a href="${esc(p.pathname)}">${esc(p.title)}</a></li>`)
        .join('')}</ul>`
    : `<p data-offline-none>${esc(s.offlineNone)}</p>`;
  const html = `<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(s.offlineTitle)} — ${esc(STRINGS.site)}</title>
<script>try{var t=localStorage.getItem('axiom-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
<style>${OFFLINE_CSS}</style>
</head>
<body data-offline-page>
<main>
${MARK}
<h1>${esc(s.offlineTitle)}</h1>
<p>${esc(s.offlineBody)}</p>
<p class="actions"><a class="button" href="${esc(url.pathname + url.search)}">${esc(s.offlineRetry)}</a><a href="${lang === 'ar' ? '/ar/' : '/'}">${esc(s.home)}</a></p>
${list}
</main>
</body>
</html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Axiom-Offline': '1' },
  });
}
