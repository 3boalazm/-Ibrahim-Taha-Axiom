// The installable app: one manifest per language whose icons exist at the sizes they claim,
// maskable icons that keep the artwork inside the safe zone, every page linked to its own
// language's manifest, install controls hidden in the HTML (so nothing shows without JS),
// and a service worker in step with the build that never touches the assistant's API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { inflateSync } from 'node:zlib';
import { DIST, page, readJson, routes } from './helpers.mjs';
import { PLACEHOLDERS, fileFor, precacheList, versionOf } from '../scripts/service-worker.mjs';

const manifests = { en: readJson(join(DIST, 'site.webmanifest')), ar: readJson(join(DIST, 'ar', 'site.webmanifest')) };
const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
const isAr = (route) => route === '/ar/' || route.startsWith('/ar/');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Minimal PNG reader: 8-bit RGB or RGBA, not interlaced (what the icon scripts write). */
function readPng(path) {
  const buf = readFileSync(path);
  assert.equal(buf.toString('latin1', 1, 4), 'PNG', `${path} is not a PNG`);
  let width, height, depth, type, interlace;
  const idat = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o);
    const kind = buf.toString('latin1', o + 4, o + 8);
    const body = buf.subarray(o + 8, o + 8 + len);
    if (kind === 'IHDR') [width, height, depth, type, interlace] = [body.readUInt32BE(0), body.readUInt32BE(4), body[8], body[9], body[12]];
    if (kind === 'IDAT') idat.push(body);
    if (kind === 'IEND') break;
    o += 12 + len;
  }
  return { width, height, depth, type, interlace, idat };
}
function pixels(path) {
  const { width, height, depth, type, interlace, idat } = readPng(path);
  assert.ok(depth === 8 && interlace === 0 && (type === 2 || type === 6), `${path}: unsupported PNG layout`);
  const bpp = type === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const a = x >= bpp ? px[i - bpp] : 0;
      const b = y ? px[i - stride] : 0;
      const c = x >= bpp && y ? px[i - stride - bpp] : 0;
      let v = raw[y * (stride + 1) + 1 + x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[i] = v & 255;
    }
  }
  return { width, height, bpp, px };
}
const hex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');

test('each language installs as its own app', () => {
  for (const [lang, m] of Object.entries(manifests)) {
    const start = lang === 'ar' ? '/ar/' : '/';
    assert.equal(m.id, start, `${lang} id`);
    assert.equal(m.start_url, start, `${lang} start_url`);
    assert.equal(m.scope, '/', `${lang}: one scope, so switching language stays in the app`);
    assert.equal(m.lang, lang);
    assert.equal(m.dir, lang === 'ar' ? 'rtl' : 'ltr');
    assert.equal(m.display, 'standalone');
    assert.equal(m.name, 'Ibrahim Taha Axiom');
    assert.equal(m.theme_color, m.background_color);
    assert.ok(!m.prefer_related_applications, `${lang}: must not point visitors to a store app`);
  }
  assert.equal(manifests.en.short_name, 'Ibrahim Taha');
  assert.equal(manifests.ar.short_name, 'ابراهيم محمد طه', 'the Arabic display name decided in DQ-10');
  // descriptions are the home pages' own, not new text
  for (const [lang, route] of [['en', '/'], ['ar', '/ar/']]) {
    const meta = page(route).match(/<meta name="description" content="([^"]*)"/)[1];
    assert.equal(manifests[lang].description, meta, `${lang} description = the home page description`);
  }
});

test('manifest icons exist at the sizes they claim, any and maskable at 192 and 512', () => {
  for (const [lang, m] of Object.entries(manifests)) {
    for (const icon of m.icons) {
      const file = join(DIST, icon.src);
      assert.ok(existsSync(file), `${lang}: ${icon.src} missing`);
      const { width, height } = readPng(file);
      assert.equal(`${width}x${height}`, icon.sizes, `${lang}: ${icon.src} size`);
      assert.equal(icon.type, 'image/png');
    }
    for (const size of ['192x192', '512x512']) {
      for (const purpose of ['any', 'maskable']) assert.ok(m.icons.some((i) => i.sizes === size && i.purpose === purpose), `${lang}: ${purpose} ${size}`);
    }
  }
});

test('maskable icons keep all artwork inside the safe zone, on the manifest colour', () => {
  for (const size of [192, 512]) {
    const { width, height, bpp, px } = pixels(join(DIST, `icon-maskable-${size}.png`));
    const field = [px[0], px[1], px[2]];
    let reach = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * bpp;
        if (Math.max(Math.abs(px[i] - field[0]), Math.abs(px[i + 1] - field[1]), Math.abs(px[i + 2] - field[2])) > 12) {
          reach = Math.max(reach, Math.hypot(x - (width - 1) / 2, y - (height - 1) / 2) / width);
        }
      }
    }
    // the spec's safe zone is a centred circle with a radius of 40% of the width
    assert.ok(reach > 0.3 && reach <= 0.4, `icon-maskable-${size}: artwork reaches ${(reach * 100).toFixed(1)}% of the width`);
    assert.equal(hex(field), manifests.en.background_color, `icon-maskable-${size}: field colour`);
  }
});

test('shortcuts open existing pages of the same language, named as in the menu', () => {
  for (const [lang, m] of Object.entries(manifests)) {
    assert.ok(m.shortcuts.length >= 3, `${lang}: shortcuts`);
    const nav = page(lang === 'ar' ? '/ar/' : '/').match(/<nav id="site-nav"[\s\S]*?<\/nav>/)[0];
    for (const s of m.shortcuts) {
      assert.equal(isAr(s.url), lang === 'ar', `${lang}: ${s.url} is in the other language`);
      assert.ok(existsSync(fileFor(DIST, s.url)), `${lang}: ${s.url} is not a page`);
      assert.match(nav, new RegExp(`>${escapeRe(s.name)}</span>`), `${lang}: "${s.name}" is not a menu label`);
    }
  }
});

test('every page links the manifest of its language and names the app for iOS', () => {
  const all = [...routes().map((r) => [r, page(r)]), ['/404.html', readFileSync(join(DIST, '404.html'), 'utf8')]];
  for (const [route, html] of all) {
    const lang = isAr(route) ? 'ar' : 'en';
    const links = [...html.matchAll(/<link rel="manifest" href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(links, [lang === 'ar' ? '/ar/site.webmanifest' : '/site.webmanifest'], route);
    assert.equal(html.match(/<meta name="apple-mobile-web-app-title" content="([^"]+)"/)?.[1], manifests[lang].short_name, route);
  }
  assert.ok(all.length >= 67);
});

test('install controls are hidden in the HTML: without JS nothing shows', () => {
  for (const route of routes()) {
    const html = page(route);
    const buttons = html.match(/<button[^>]*\bdata-app-install\b[^>]*>/g) ?? [];
    assert.equal(buttons.length, 2, `${route}: footer and phone-menu buttons`);
    for (const b of buttons) assert.match(b, /\shidden[\s>]/, `${route}: ${b}`);
    assert.match(html.match(/<div[^>]*data-app-install-slot[^>]*>/)?.[0] ?? '', /\shidden[\s>]/, `${route}: menu slot`);
    assert.equal((html.match(/<dialog[^>]*data-app-help/g) ?? []).length, 1, `${route}: one steps dialog`);
  }
});

test('sw.js is complete and in step with the build', () => {
  for (const p of Object.values(PLACEHOLDERS)) assert.ok(!sw.includes(p), `placeholder left: ${p}`);
  assert.ok(!/__(?:VERSION|PRECACHE|STRINGS|MARK)__/.test(sw), 'no placeholder of any kind');
  new vm.Script(sw, { filename: 'sw.js' }); // parses
  const listed = JSON.parse(sw.match(/^const PRECACHE = (\[.*\]);$/m)[1]);
  assert.deepEqual(listed, precacheList(DIST));
  for (const url of listed) assert.ok(existsSync(fileFor(DIST, url)), `precached but not built: ${url}`);
  assert.ok(listed.includes('/') && listed.includes('/ar/'), 'both home pages work offline');
  for (const name of readdirSync(join(DIST, '_astro')).filter((n) => /\.(?:css|js)$/.test(n))) {
    assert.ok(listed.includes(`/_astro/${name}`), `not precached: ${name}`);
  }
  const version = sw.match(/^const VERSION = '([0-9a-f]{12})';$/m)?.[1];
  assert.ok(version, 'VERSION is a 12-digit hash');
  assert.equal(versionOf(DIST, sw.replace(`const VERSION = '${version}';`, `const VERSION = ${PLACEHOLDERS.version};`)), version, 'VERSION recomputes');
  const mark = JSON.parse(sw.match(/^const MARK = (".*");$/m)[1]);
  assert.match(mark, /^<svg class="mark" aria-hidden="true"/);
  assert.ok(!/<title|aria-labelledby/.test(mark), 'the decorative mark has no name');
});

test('the offline page has its strings in both languages', () => {
  const strings = JSON.parse(sw.match(/^const STRINGS = (\{.*\});$/m)[1]);
  assert.equal(strings.site, 'Ibrahim Taha Axiom');
  for (const lang of ['en', 'ar']) {
    for (const key of ['offlineTitle', 'offlineBody', 'offlineRetry', 'offlineSaved', 'offlineNone', 'home']) {
      assert.ok(typeof strings[lang][key] === 'string' && strings[lang][key].length > 1, `${lang}.${key}`);
    }
  }
  assert.match(strings.ar.offlineTitle, /[\u0600-\u06FF]/, 'Arabic strings are Arabic');
});

test('the worker leaves the assistant, other origins, non-GET and Range requests alone', () => {
  const listeners = {};
  const self = { location: new URL('https://ibrahim-taha-axiom.vercel.app/sw.js'), addEventListener: (type, fn) => (listeners[type] = fn), registration: {}, clients: {} };
  const noNetwork = () => Promise.reject(new TypeError('no network in this test'));
  vm.runInContext(sw, vm.createContext({ self, URL, Request, Response, Headers, TextDecoder, caches: {}, fetch: noNetwork, console }));
  const handled = (url, { method = 'GET', mode = 'cors', headers = {} } = {}) => {
    let responded = false;
    const settle = (p) => Promise.resolve(p).catch(() => undefined);
    listeners.fetch({ request: { url, method, mode, headers: new Headers(headers) }, respondWith: (p) => ((responded = true), settle(p)), waitUntil: settle, preloadResponse: Promise.resolve() });
    return responded;
  };
  const site = 'https://ibrahim-taha-axiom.vercel.app';
  assert.equal(handled(`${site}/api/chat`, { method: 'POST' }), false, 'POST /api/chat');
  assert.equal(handled(`${site}/api/chat`), false, 'GET /api/chat');
  assert.equal(handled(`${site}/api/chat`, { mode: 'navigate' }), false, 'opening /api/chat');
  assert.equal(handled(`${site}/contact/`, { method: 'POST', mode: 'navigate' }), false, 'a form POST');
  assert.equal(handled('https://doi.org/10.1002/cpe.6685'), false, 'another origin');
  assert.equal(handled(`${site}/images/portrait.webp`, { headers: { range: 'bytes=0-99' } }), false, 'a Range request');
  assert.equal(handled(`${site}/sw.js`), false, 'the worker itself');
  assert.equal(handled(`${site}/publications/`, { mode: 'navigate' }), true, 'a page');
  assert.equal(handled(`${site}/_astro/BaseLayout.css`), true, 'a built asset');
  assert.equal(handled(`${site}/search-index/en.json`), true, 'the search index');
  assert.equal(handled(`${site}/images/portrait.webp`), true, 'an image');
});
