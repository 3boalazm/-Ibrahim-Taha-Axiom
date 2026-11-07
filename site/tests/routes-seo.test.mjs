// Built routes, language/direction, headings, SEO metadata and accessibility markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, ORIGIN, all, bibKeys, data, first, page, routes } from './helpers.mjs';

const SECTIONS = ['/', '/about/', '/research/', '/publications/', '/projects/', '/teaching/', '/talks/', '/books/', '/cv/', '/lab/', '/contact/'];
const pubPages = bibKeys().map((b) => `/publications/${b.key}/`);
const expected = [...SECTIONS, ...pubPages].flatMap((r) => [r, r === '/' ? '/ar/' : `/ar${r}`]).sort();
const built = routes();

test('every section and every publication is built in English and Arabic — nothing else', () => {
  assert.deepEqual(built, expected);
});

test('Arabic pages are lang="ar" dir="rtl"; English pages are lang="en"', () => {
  for (const r of built) {
    const tag = first(page(r), /(<html[^>]*>)/);
    if (r.startsWith('/ar/')) assert.match(tag, /lang="ar"[^>]*dir="rtl"|dir="rtl"[^>]*lang="ar"/, r);
    else assert.match(tag, /lang="en"/, r);
  }
});

test('one h1 per page; headings do not skip from h1 to h3', () => {
  for (const r of built) {
    const html = page(r);
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, `${r}: h1 count`);
    const levels = all(html, /<h([1-6])[\s>]/g).map(Number);
    const firstH3 = levels.indexOf(3);
    if (firstH3 > -1) assert.ok(levels.slice(0, firstH3).includes(2), `${r}: h3 before any h2`);
  }
});

test('canonical, hreflang pairs and x-default point at the production origin', () => {
  for (const r of built) {
    const html = page(r);
    assert.equal(first(html, /<link rel="canonical" href="([^"]+)"/), ORIGIN + r, `${r} canonical`);
    const en = r.startsWith('/ar/') ? r.replace(/^\/ar/, '') : r;
    const ar = en === '/' ? '/ar/' : `/ar${en}`;
    assert.equal(first(html, /<link rel="alternate" hreflang="en" href="([^"]+)"/), ORIGIN + en, `${r} hreflang en`);
    assert.equal(first(html, /<link rel="alternate" hreflang="ar" href="([^"]+)"/), ORIGIN + ar, `${r} hreflang ar`);
    assert.equal(first(html, /<link rel="alternate" hreflang="x-default" href="([^"]+)"/), ORIGIN + en, `${r} x-default`);
  }
});

test('indexing is on: robots meta, robots.txt and a sitemap with every route', () => {
  const launch = data('public-settings/launch.json');
  assert.equal(launch.allowIndexing, true);
  const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
  assert.match(robots, /Allow: \//);
  assert.doesNotMatch(robots, /Disallow: \/\s*$/m);
  for (const r of built) assert.match(page(r), /<meta name="robots" content="index, follow"/, r);
  const locs = all(readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8'), /<loc>([^<]+)<\/loc>/g).map((u) => u.replace(ORIGIN, '')).sort();
  assert.deepEqual(locs, built);
});

test('JSON-LD parses; Open Graph and descriptions are present', () => {
  for (const r of built) {
    const html = page(r);
    for (const block of all(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => JSON.parse(block), r);
    assert.ok(first(html, /<meta name="description" content="([^"]{20,})"/), `${r} description`);
    assert.ok(first(html, /<meta property="og:title" content="([^"]+)"/), `${r} og:title`);
    assert.ok(first(html, /<meta property="og:image" content="([^"]+)"/), `${r} og:image`);
  }
  assert.match(page('/'), /"@type":"Person"/);
});

test('publication pages carry Google Scholar citation meta', () => {
  for (const r of pubPages) {
    const html = page(r);
    assert.ok(first(html, /<meta name="citation_title" content="([^"]+)"/), `${r} citation_title`);
    assert.ok(all(html, /<meta name="citation_author" content="([^"]+)"/g).length >= 1, `${r} citation_author`);
    assert.ok(first(html, /<meta name="citation_publication_date" content="([^"]+)"/), `${r} citation date`);
  }
});

test('identifiers stay left-to-right inside Arabic pages', () => {
  const html = page('/ar/publications/abonazel2023beta/');
  assert.match(html, /<a class="doi" href="https:\/\/doi\.org\/10\.1080\/03610918\.2021\.1960373"/);
  const css = readdirSync(join(DIST, '_astro')).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(DIST, '_astro', f), 'utf8')).join('');
  assert.match(css, /\.doi,\.url\{direction:ltr;unicode-bidi:isolate\}/, 'DOIs and URLs are isolated LTR runs');
  assert.match(html, /class="[^"]*\bltr\b/, 'numeric runs use the .ltr helper');
});

test('the search dialog is an accessible modal combobox on every page', () => {
  for (const r of ['/', '/ar/', '/publications/', '/ar/lab/']) {
    const html = page(r);
    assert.match(html, /<dialog[^>]*id="site-search"[^>]*aria-labelledby="site-search-title"/, r);
    assert.match(html, /role="combobox"[^>]*aria-controls="site-search-list"|aria-controls="site-search-list"[^>]*role="combobox"/, r);
    assert.match(html, /id="site-search-list"[^>]*role="listbox"|role="listbox"[^>]*id="site-search-list"/, r);
    assert.match(html, /class="search-trigger"[^>]*aria-haspopup="dialog"|aria-haspopup="dialog"[^>]*class="search-trigger"/, r);
  }
});

test('the knowledge graph renders every manifest relationship and a list alternative', () => {
  const html = page('/research/');
  const manifest = data('approved/public-content.manifest.json');
  const drawn = (html.match(/class="graph__edge[" ]/g) ?? []).length;
  // Projects, talks and the dataset share the end column: links between two of them are
  // listed in the panel and the list view rather than drawn.
  const END = new Set(['project', 'talk', 'dataset']);
  const kind = (ref) => ref.split(':')[0];
  const sameColumn = manifest.relationships.filter((x) => END.has(kind(x.from)) && END.has(kind(x.to))).length;
  assert.equal(drawn, manifest.relationships.length - sameColumn, 'one edge per cross-column relationship');
  assert.match(html, /class="graph__list"/);
});

test('no page says its text is unreviewed: no draft note, label, badge or footer line (D-24)', () => {
  // The owner confirmed on 2026-11-07 that the whole site has been reviewed. A new entry with
  // status "draft" in translations/ar.json would bring the labels back, and fail this test.
  const words = /ترجمة مبدئية|لم يراجع|بانتظار المراجعة|حالة الترجمة|Draft translation|not yet reviewed/i;
  // every built page (the 404 page too), and the data the pages load: the search index and
  // the assistant's knowledge
  const files = readdirSync(DIST, { recursive: true }).map(String);
  const htmls = files.filter((f) => f.endsWith('.html'));
  const jsons = files.filter((f) => f.endsWith('.json'));
  assert.ok(htmls.length >= 67 && jsons.length >= 3, `checked ${htmls.length} pages and ${jsons.length} JSON files`);
  for (const f of htmls) {
    const html = readFileSync(join(DIST, f), 'utf8');
    assert.doesNotMatch(html, words, `${f}: unreviewed wording`);
    assert.doesNotMatch(html, /\bdata-draft\b|class="[^"]*\bis-draft\b|class="draft-note/, `${f}: draft markup`);
  }
  // What stays: the Arabic footer still says that titles and names keep their original language.
  assert.match(page('/ar/'), /site-footer__translation[^>]*>\s*<p[^>]*>عناوين المنشورات وأسماء الدوريات والأشخاص تبقى بلغتها الأصلية\.<\/p>/);
  assert.doesNotMatch(page('/'), /site-footer__translation/, 'English pages have no such line');
  for (const f of jsons) assert.doesNotMatch(readFileSync(join(DIST, f), 'utf8'), words, `${f}: unreviewed wording`);
});

test('the contact page sends nothing from the site: mailto only, no form endpoint', () => {
  for (const r of ['/contact/', '/ar/contact/']) {
    const html = page(r);
    assert.doesNotMatch(html, /<form[^>]*action="https?:/, `${r} posts to a server`);
    assert.match(html, /href="mailto:/, `${r} needs a mailto fallback`);
  }
});

test('no stray template output in any page', () => {
  for (const r of built) {
    const text = page(r).replace(/<script[\s\S]*?<\/script>/g, '');
    assert.doesNotMatch(text, />\s*(undefined|NaN|null|\[object Object\])\s*</, r);
  }
});
