/**
 * The installable app in a real browser (site/README.md#install-as-an-app):
 * - Chrome reads each language's manifest and reports no installability errors;
 * - the service worker installs, controls the pages and precaches both home pages, and a
 *   first visit hands over the page it loaded;
 * - offline (the test server is stopped, which the worker's own requests feel too): a
 *   visited page opens styled from its saved copy, both home pages open although never
 *   visited, an unvisited page gets the offline page in its language listing the saved
 *   pages of that language, /api/ requests fail instead of being answered from a cache,
 *   and once the server is back pages come from the network again;
 * - "Install the app": a floating button opposite the assistant's launcher (bottom left in
 *   English, bottom right in Arabic). One press opens the browser's install prompt (a
 *   simulated beforeinstallprompt, plus a probe for a real one); no button in Safari or
 *   Firefox, which give pages no way to install, in the installed app, or without JS.
 *
 *   CHROME_PATH=/usr/bin/google-chrome node tests/e2e/app.mjs
 *
 * Without puppeteer-core or CHROME_PATH it explains what is missing and exits 0, unless
 * E2E_REQUIRED=1 (set in CI), when it exits 1.
 */
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { DIST, requireBuild } from '../helpers.mjs';

const required = process.env.E2E_REQUIRED === '1';
const skip = (why) => {
  console.log(`e2e app skipped: ${why}`);
  if (required && process.env.GITHUB_ACTIONS === 'true') console.log(`::error title=e2e app::skipped although E2E_REQUIRED=1: ${why}`);
  process.exit(required ? 1 : 0);
};
requireBuild();
const executablePath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
if (!executablePath || !existsSync(executablePath)) skip('set CHROME_PATH to a Chrome or Chromium binary');
let puppeteer;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  skip('puppeteer-core is not installed (npm i --no-save puppeteer-core@25)');
}

// ------------------------------------------------------------- static server
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const gone = new Set(); // paths answered 404, as if the page had been withdrawn
const server = http.createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (gone.has(path)) return res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end('<!doctype html><title>Not found</title><h1>Not found</h1>');
  let f = join(DIST, path);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const B = `http://127.0.0.1:${PORT}`;
const stopServer = () => new Promise((r) => (server.close(() => r()), server.closeAllConnections()));
const startServer = () => new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const VERSION = readFileSync(join(DIST, 'sw.js'), 'utf8').match(/^const VERSION = '([0-9a-f]{12})';$/m)?.[1];
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  // iPadOS asks for desktop sites and reports a Mac; only its touch screen tells
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  firefoxAndroid: 'Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0',
};

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const jsErrors = [];
let failed = 0;
const annotate = (msg) => {
  if (process.env.GITHUB_ACTIONS === 'true') console.log(`::error title=e2e app::${String(msg).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
};
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    annotate(msg);
  }
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
};
async function open({ width = 1280, height = 900, ua, touchPoints = 0, standalone = false, realPrompt = false } = {}) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => jsErrors.push(`${page.url()}: ${e.message}`));
  if (!realPrompt) {
    // Whether the browser fires a real beforeinstallprompt depends on its own heuristics
    // (headless Chrome 156 in CI does, Chromium 153 does not). The tests hold real events
    // back, as Safari and Firefox never send one, and dispatch their own (isTrusted false).
    await page.evaluateOnNewDocument(() => {
      addEventListener('beforeinstallprompt', (e) => e.isTrusted && e.stopImmediatePropagation(), true);
    });
  }
  const cdp = await page.createCDPSession();
  if (ua) await cdp.send('Emulation.setUserAgentOverride', { userAgent: ua });
  if (touchPoints) await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: touchPoints });
  if (standalone) {
    // an installed app reports display-mode: standalone
    await page.evaluateOnNewDocument(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : real(q));
    });
  }
  await page.setViewport({ width, height });
  return { page, cdp };
}
const until = (page, fn, arg, timeout = 8000) => page.waitForFunction(fn, { timeout, polling: 100 }, arg).then(() => true, () => false);
const go = (page, path) => page.goto(B + path, { waitUntil: 'networkidle0' });
/** Which of the elements matching sel are actually displayed. */
const shown = (page, sel) => page.$$eval(sel, (els) => els.map((el) => !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0));
const savedIn = (page, cacheName, path) =>
  page.evaluate(async (name, p) => Boolean(await (await caches.open(name)).match(location.origin + p)), cacheName, path);
/** A beforeinstallprompt like Chromium's; returns whether the page called preventDefault. */
const fakePrompt = (page) =>
  page.evaluate(() => {
    window.__prompted = 0;
    const e = new Event('beforeinstallprompt', { cancelable: true });
    e.prompt = () => (window.__prompted++, Promise.resolve());
    e.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });

// ------------------------------------------------- service worker, first visit
const { page, cdp } = await open();
await go(page, '/publications/');
const reg = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.ready;
  return { scope: r.scope, script: r.active?.scriptURL, state: r.active?.state, preload: (await r.navigationPreload?.getState())?.enabled ?? null };
});
ok(reg.script === `${B}/sw.js` && reg.scope === `${B}/`, `the service worker /sw.js is registered for the whole site (scope ${reg.scope})`);
ok(reg.state === 'activated', `it activates (${reg.state})`);
ok(reg.preload === true, 'navigation preload is on, so a page request does not wait for the worker to start');
ok(await until(page, () => Boolean(navigator.serviceWorker.controller)), 'it controls the page it was installed from');
const shell = await page.evaluate(async (v) => {
  const names = await caches.keys();
  const keys = names.includes(`axiom-shell-${v}`) ? (await (await caches.open(`axiom-shell-${v}`)).keys()).map((r) => new URL(r.url).pathname) : [];
  return { names, keys };
}, VERSION);
ok(shell.names.includes(`axiom-shell-${VERSION}`), `the precache is named after VERSION ${VERSION}`);
ok(shell.keys.includes('/') && shell.keys.includes('/ar/') && shell.keys.some((k) => k.endsWith('.css')), `both home pages and the stylesheets are precached (${shell.keys.length} files)`);
ok(await until(page, async () => Boolean(await (await caches.open('axiom-pages')).match(location.origin + '/publications/'))), 'first visit: the page loaded before the worker ran is saved too');

await go(page, '/research/');
ok(await until(page, async () => Boolean(await (await caches.open('axiom-pages')).match(location.origin + '/research/'))), 'a page opened online is saved for offline reading');
await go(page, '/ar/teaching/');
ok(await until(page, async () => Boolean(await (await caches.open('axiom-pages')).match(location.origin + '/ar/teaching/'))), 'an Arabic page is saved as well');
ok(!(await savedIn(page, 'axiom-pages', '/lab/')), 'a page never opened is not saved (nothing is downloaded in advance beyond the home pages)');

// ------------------------------------------------------ manifests, installability
for (const [path, manifest, appId] of [
  ['/', '/site.webmanifest', '/'],
  ['/ar/publications/', '/ar/site.webmanifest', '/ar/'],
]) {
  await go(page, path);
  const m = await cdp.send('Page.getAppManifest');
  const data = JSON.parse(m.data || '{}');
  ok(m.url === B + manifest && m.errors.length === 0, `${path}: Chrome reads ${manifest} without errors${m.errors.length ? ` (${JSON.stringify(m.errors)})` : ''}`);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  ok(inst.installabilityErrors.length === 0, `${path}: no installability errors${inst.installabilityErrors.length ? ` (${JSON.stringify(inst.installabilityErrors)})` : ''}`);
  // the manifest as Chrome parsed it: its id is the identity the installed app gets
  // (Page.getAppId returns nothing in current Chrome, so it is not used)
  ok(m.manifest?.id === B + appId && m.manifest?.scope === `${B}/`, `${path}: Chrome gives the app the id ${appId} and the scope / (${m.manifest?.id})`);
  ok(data.start_url === appId && data.display === 'standalone', `${path}: it starts at ${data.start_url} in its own window`);
}

// ------------------------------------------------------------------- offline
await stopServer();
const offline = await page.goto(`${B}/research/`, { waitUntil: 'load' });
ok(offline?.status() === 200 && offline.fromServiceWorker(), 'offline: a page opened before comes from its saved copy');
const styled = () => page.evaluate(() => [...document.styleSheets].some((s) => s.href?.includes('/_astro/') && s.cssRules.length > 20));
ok((await styled()) && (await page.$eval('h1', (h) => h.textContent.trim().length > 0)), 'offline: the saved page has its heading and its stylesheet');
const arHome = await page.goto(`${B}/ar/`, { waitUntil: 'load' });
ok(arHome?.status() === 200 && (await page.evaluate(() => document.documentElement.dir === 'rtl')) && (await styled()), 'offline: the Arabic home page opens although it was never visited (precached), styled and right to left');
await page.goto(`${B}/`, { waitUntil: 'load' });
ok((await page.$eval('h1', (h) => h.textContent.trim().length > 0)) && (await styled()), 'offline: the English home page opens too');

await page.goto(`${B}/lab/`, { waitUntil: 'load' });
const enOffline = await page.evaluate(() => ({
  isOffline: document.body.hasAttribute('data-offline-page'),
  lang: document.documentElement.lang,
  h1: document.querySelector('h1')?.textContent,
  links: [...document.querySelectorAll('[data-offline-saved] a')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent })),
  retry: document.querySelector('.actions .button')?.getAttribute('href'),
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}));
ok(enOffline.isOffline && enOffline.lang === 'en' && enOffline.h1 === 'You’re offline', `offline: a page never opened gets the offline page in English ("${enOffline.h1}")`);
const enPaths = enOffline.links.map((l) => l.href);
ok(enPaths.includes('/research/') && enPaths.includes('/publications/') && enPaths.includes('/'), `it lists the saved English pages (${enPaths.join(', ')})`);
ok(enPaths.every((p) => !p.startsWith('/ar/')), 'and no Arabic ones');
ok(enOffline.links.every((l) => l.text.trim() && !l.text.includes('— Ibrahim Taha Axiom')), `with readable titles (${enOffline.links.map((l) => l.text).join(' · ')})`);
ok(enOffline.retry === '/lab/', '"Try again" reopens the same address');

await page.goto(`${B}/ar/lab/`, { waitUntil: 'load' });
const arOffline = await page.evaluate(() => ({
  isOffline: document.body.hasAttribute('data-offline-page'),
  lang: document.documentElement.lang,
  dir: document.documentElement.dir,
  h1: document.querySelector('h1')?.textContent,
  paths: [...document.querySelectorAll('[data-offline-saved] a')].map((a) => a.getAttribute('href')),
}));
ok(arOffline.isOffline && arOffline.lang === 'ar' && arOffline.dir === 'rtl' && arOffline.h1 === 'أنت غير متصل بالإنترنت', `offline: an Arabic address gets the Arabic offline page, right to left ("${arOffline.h1}")`);
ok(arOffline.paths.includes('/ar/teaching/') && arOffline.paths.includes('/ar/') && arOffline.paths.every((p) => p.startsWith('/ar/')), `it lists only the saved Arabic pages (${arOffline.paths.join(', ')})`);

await page.evaluate(() => localStorage.setItem('axiom-theme', 'dark'));
await page.goto(`${B}/lab/`, { waitUntil: 'load' });
ok((await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(14, 21, 18)', 'the offline page follows the dark theme chosen on the site');
await page.evaluate(() => localStorage.removeItem('axiom-theme'));

const api = await page.evaluate(async () => {
  const attempt = (init) => fetch('/api/chat', init).then((r) => `answered ${r.status}`, () => 'network error');
  return { post: await attempt({ method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }), get: await attempt() };
});
ok(api.post === 'network error' && api.get === 'network error', `offline: /api/chat is never answered from a cache (POST: ${api.post}, GET: ${api.get})`);

await startServer();
await go(page, '/lab/');
ok(!(await page.evaluate(() => document.body.hasAttribute('data-offline-page'))) && (await page.$eval('h1', (h) => h.textContent.trim().length > 0)), 'back online: the page comes from the network, not the offline page');

// a withdrawn page: once the site answers 404, its saved copy goes too
gone.add('/research/');
const withdrawn = await page.goto(`${B}/research/`, { waitUntil: 'load' });
ok(withdrawn?.status() === 404, 'a withdrawn page shows the server’s 404, not the saved copy');
ok(await until(page, async () => !(await (await caches.open('axiom-pages')).match(location.origin + '/research/'))), 'and its saved copy is deleted, so it is not readable offline any more');
gone.delete('/research/');
await page.close();

// ------------------------------------- install: a real prompt, where the browser sends one
{
  const { page: p } = await open({ realPrompt: true });
  await p.evaluateOnNewDocument(() => addEventListener('beforeinstallprompt', (e) => e.isTrusted && (window.__realPrompt = true), true));
  await go(p, '/');
  if (await until(p, () => window.__realPrompt === true, undefined, 5000)) {
    ok((await shown(p, '[data-app-install]'))[0] === true, 'this browser sent a real beforeinstallprompt, and the install button appeared');
    if (process.env.GITHUB_ACTIONS === 'true') console.log('::notice title=e2e app::the browser sent a real beforeinstallprompt for the site, and the install button appeared');
  } else {
    console.log('ℹ this browser sent no real beforeinstallprompt (it depends on its install heuristics); the simulated one below stands in');
    if (process.env.GITHUB_ACTIONS === 'true') console.log('::notice title=e2e app::the browser sent no real beforeinstallprompt; the simulated one stands in');
  }
  await p.close();
}

// ----------------------------------- install: the floating button, opposite the assistant
/** Where the install button and the assistant's launcher sit, and whether they touch. */
const corners = (p) =>
  p.evaluate(() => {
    const button = document.querySelector('[data-app-install]');
    const b = button.getBoundingClientRect();
    const c = document.querySelector('[data-chat-toggle]').getBoundingClientRect();
    return {
      b: { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width },
      c: { left: c.left, right: c.right, bottom: c.bottom },
      vw: document.documentElement.clientWidth,
      vh: innerHeight,
      touching: !(b.right <= c.left || c.right <= b.left || b.bottom <= c.top || c.bottom <= b.top),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      label: button.textContent.trim(),
      fixed: getComputedStyle(button).position === 'fixed',
    };
  });
const px = (n) => Math.round(n);

{
  const { page: p } = await open();
  await go(p, '/');
  ok((await shown(p, '[data-app-install]'))[0] === false, 'desktop Chrome: no button until the browser says the site can be installed');
  ok(await fakePrompt(p), 'the page takes over beforeinstallprompt (no browser banner on top of the button)');
  ok((await shown(p, '[data-app-install]'))[0] === true, 'then the floating "Install the app" button appears');
  const at = await corners(p);
  ok(at.fixed && at.b.left < at.vw / 2 && at.c.left > at.vw / 2, `English: bottom left, opposite the assistant at the bottom right (button ${px(at.b.left)}–${px(at.b.right)} px, assistant ${px(at.c.left)}–${px(at.c.right)} px)`);
  ok(Math.abs(at.b.bottom - at.c.bottom) <= 1 && at.vh - at.b.bottom >= 15, `level with the assistant's launcher, ${px(at.vh - at.b.bottom)} px from the bottom`);
  ok(at.label === 'Install the app' && at.b.width > 100, `a labelled pill on wide screens ("${at.label}", ${px(at.b.width)} px)`);
  await p.click('[data-app-install]');
  ok((await p.evaluate(() => window.__prompted)) === 1, 'one press opens the browser’s install prompt');
  ok((await shown(p, '[data-app-install]'))[0] === false, 'and the button hides: one prompt per event');
  await p.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  ok((await p.$eval('[data-app-status]', (s) => s.textContent)) === 'The app is installed. Open it from your home screen or app list.', 'after installing, a status message says where to find the app');
  await fakePrompt(p);
  await p.focus('[data-app-install]');
  await p.keyboard.press('Enter');
  ok((await p.evaluate(() => window.__prompted)) === 1, 'the keyboard works too (Enter on the focused button)');
  await p.close();
}
{
  const { page: p } = await open({ width: 390, height: 844 });
  await go(p, '/ar/');
  await fakePrompt(p);
  const at = await corners(p);
  ok(at.b.left > at.vw / 2 && at.c.right < at.vw / 2, `Arabic phone: bottom right, opposite the assistant at the bottom left (button ${px(at.b.left)}–${px(at.b.right)} px of ${at.vw})`);
  ok(at.b.width <= 50 && Math.abs(at.b.bottom - at.c.bottom) <= 1 && !at.touching, `a round icon button level with the launcher (${px(at.b.width)} px), not touching it`);
  ok(at.label === 'ثبّت التطبيق', 'it keeps its Arabic name for screen readers');
  await p.click('[data-app-install]');
  ok((await p.evaluate(() => window.__prompted)) === 1, 'one tap opens the install prompt');
  await p.close();
}
{
  const { page: p } = await open({ width: 320, height: 640 });
  await go(p, '/ar/research/');
  await fakePrompt(p);
  const at = await corners(p);
  ok(at.b.left >= 0 && at.b.right <= at.vw && !at.touching && at.overflow <= 0, `320 px: both round buttons fit without touching (overflow ${at.overflow} px)`);
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const end = await p.evaluate(() => {
    const top = document.querySelector('[data-app-install]').getBoundingClientRect().top;
    const texts = [...document.querySelectorAll('.site-footer *')].filter((el) => !el.children.length && el.textContent.trim() && el.getClientRects().length);
    return { lowest: Math.round(Math.max(...texts.map((el) => el.getBoundingClientRect().bottom))), top: Math.round(top) };
  });
  ok(end.lowest <= end.top, `at the end of the page the button stays below the footer's last line (text ends at ${end.lowest} px, button starts at ${end.top} px)`);
  await p.close();
}

// ------------------------------------- no button where the browser cannot install the site
for (const [label, ua, touchPoints] of [
  ['iPhone', UA.iphone, 0],
  ['iPad', UA.ipad, 5],
  ['Safari on the Mac', UA.macSafari, 0],
  ['Firefox for Android', UA.firefoxAndroid, 0],
]) {
  const { page: p } = await open({ ua, touchPoints, width: 390, height: 844 });
  await go(p, '/');
  await new Promise((r) => setTimeout(r, 300));
  ok((await shown(p, '[data-app-install]'))[0] === false && !(await p.$('dialog[data-app-help]')), `${label}: no button and no instructions dialog (the browser gives pages no way to install)`);
  await p.close();
}

// ------------------------------------------------- hidden where nothing applies
{
  const { page: p } = await open({ width: 390, height: 844, standalone: true });
  await go(p, '/');
  await fakePrompt(p);
  ok((await shown(p, '[data-app-install]'))[0] === false, 'inside the installed app the button never shows');
  ok((await p.evaluate(() => document.documentElement.dataset.app)) === 'standalone', 'and the page knows it runs as an app (html[data-app="standalone"])');
  await p.close();
}
{
  const p = await browser.newPage();
  await p.setJavaScriptEnabled(false);
  await p.goto(`${B}/`, { waitUntil: 'networkidle0' });
  ok((await shown(p, '[data-app-install]'))[0] === false, 'without JavaScript there is no install button');
  await p.close();
}

ok(jsErrors.length === 0, `no JavaScript errors${jsErrors.length ? `: ${jsErrors.join(' | ')}` : ''}`);
await browser.close();
server.close();
console.log(failed ? `\n${failed} app check(s) failed` : '\nAll app checks passed.');
process.exit(failed ? 1 : 0);
