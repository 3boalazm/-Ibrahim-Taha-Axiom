#!/usr/bin/env node
/**
 * Post-build QA for the static output in dist/ (run: npm run qa).
 * Fails (exit 1) on any error. Checks:
 *  1. internal links resolve to built files
 *  2. page metadata: lang/dir, title, description, canonical, hreflang, robots
 *  3. robots.txt matches the launch setting
 *  4. no private/staging/raw files or personal contact data in dist/
 *  5. WCAG contrast of design-token colour pairs (light + dark)
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const launch = JSON.parse(readFileSync(new URL('../src/data/public-settings/launch.json', import.meta.url), 'utf8'));
const indexing = launch.allowIndexing && launch.canonicalOrigin;
// Contact details are allowed only if 'contact' is an approved profile field.
const manifest = JSON.parse(readFileSync(new URL('../src/data/approved/public-content.manifest.json', import.meta.url), 'utf8'));
const profile = JSON.parse(readFileSync(new URL('../src/data/approved/profile.json', import.meta.url), 'utf8'));
const contactApproved = manifest.profile.approvedFields.includes('contact');
const allowedEmails = contactApproved && profile.contact?.email ? [profile.contact.email.toLowerCase()] : [];
const allowedPhones = contactApproved && profile.contact?.phone ? [profile.contact.phone.replace(/\D/g, '')] : [];
const errors = [];
const warn = [];

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const files = walk(DIST).map((f) => relative(DIST, f).replaceAll('\\', '/'));
const pages = files.filter((f) => f.endsWith('.html'));
const externals = new Set();

// ---------------------------------------------------------------- 1 + 2
for (const page of pages) {
  const html = readFileSync(join(DIST, page), 'utf8');
  const isAr = page.startsWith('ar/');
  const is404 = page === '404.html';
  const htmlTag = html.match(/<html[^>]*>/)?.[0] ?? '';
  if (!htmlTag.includes(`lang="${isAr ? 'ar' : 'en'}"`)) errors.push(`${page}: wrong <html lang>`);
  if (!htmlTag.includes(`dir="${isAr ? 'rtl' : 'ltr'}"`)) errors.push(`${page}: wrong <html dir>`);
  if (!/<title>[^<]{3,}<\/title>/.test(html)) errors.push(`${page}: missing <title>`);
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (desc.length < 40) errors.push(`${page}: description missing/too short`);
  if (!is404) {
    if (!/<link rel="canonical" href="https?:\/\/[^"]+"/.test(html)) errors.push(`${page}: missing canonical`);
    for (const h of ['en', 'ar', 'x-default']) if (!html.includes(`hreflang="${h}"`)) errors.push(`${page}: missing hreflang ${h}`);
  }
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1];
  if (!indexing && robots !== 'noindex, nofollow') errors.push(`${page}: robots meta must be noindex while indexing is disabled`);
  if (indexing && robots !== 'index, follow') errors.push(`${page}: robots meta must be "index, follow" while indexing is enabled`);
  if (indexing && !is404) {
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
    if (!canonical.startsWith(launch.canonicalOrigin)) errors.push(`${page}: canonical ${canonical} is not on ${launch.canonicalOrigin}`);
  }
  if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) errors.push(`${page}: expected exactly one <h1>`);
  // Language switcher must point at the equivalent page in the other language.
  const own = `/${page.replace(/index\.html$/, '')}`;
  const counterpart = is404 ? '/ar/' : isAr ? own.replace(/^\/ar\//, '/') : own === '/' ? '/ar/' : `/ar${own}`;
  const sw = html.match(/class="lang-switch" href="([^"]+)"/)?.[1];
  if (sw !== counterpart) errors.push(`${page}: language switch points to ${sw}, expected ${counterpart}`);
  for (const [, href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    if (/^https?:\/\//.test(href)) {
      externals.add(href);
      continue;
    }
    if (href.startsWith('#')) continue;
    if (href.startsWith('mailto:')) {
      // Compare only the address: a prefilled subject (?subject=...) is not a second address.
      const address = href.slice(7).split('?')[0].toLowerCase();
      if (!allowedEmails.includes(address)) errors.push(`${page}: unapproved e-mail link ${href}`);
      continue;
    }
    if (href.startsWith('tel:')) {
      if (!allowedPhones.includes(href.slice(4).replace(/\D/g, ''))) errors.push(`${page}: unapproved phone link ${href}`);
      continue;
    }
    const path = href.split('#')[0].split('?')[0];
    const target = path.endsWith('/') ? `${path.slice(1)}index.html` : path.slice(1);
    if (!files.includes(target) && !files.includes(`${path.slice(1)}/index.html`)) errors.push(`${page}: broken internal link ${href}`);
  }
}

// ---------------------------------------------------------------- 3
const robotsTxt = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '';
if (!robotsTxt) errors.push('robots.txt missing');
else if (!indexing && !/Disallow: \/\s*$/m.test(robotsTxt)) errors.push('robots.txt must disallow all while indexing is disabled');
else if (indexing) {
  if (/^Disallow: \/\s*$/m.test(robotsTxt)) errors.push('robots.txt still disallows all while indexing is enabled');
  if (!robotsTxt.includes(`Sitemap: ${launch.canonicalOrigin}/sitemap-index.xml`)) errors.push('robots.txt must point to the sitemap on the canonical origin');
  const sm = existsSync(join(DIST, 'sitemap-0.xml')) ? readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8') : '';
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!locs.length) errors.push('sitemap-0.xml missing or empty');
  if (locs.some((u) => !u.startsWith(launch.canonicalOrigin))) errors.push('sitemap contains URLs outside the canonical origin');
  if (locs.some((u) => u.includes('/404'))) errors.push('sitemap contains the 404 page');
  console.log(`Sitemap: ${locs.length} URLs`);
}

// ---------------------------------------------------------------- 4
const forbiddenName = /(data-staging|\.env|\.bib$|\.ris$|manifest\.json$|profile\.json$|\.venv|retrieval-log|candidates)/i;
for (const f of files) if (forbiddenName.test(f)) errors.push(`forbidden file in dist: ${f}`);
const textFiles = files.filter((f) => /\.(html|xml|txt|js|css|json)$/.test(f));
for (const f of textFiles) {
  const s = readFileSync(join(DIST, f), 'utf8');
  for (const [m] of s.matchAll(/[\w.+-]+@(gmail|yahoo|hotmail|outlook|sadatacademy)\.[a-z.]+/gi)) {
    if (!allowedEmails.includes(m.toLowerCase())) errors.push(`${f}: unapproved personal e-mail address ${m}`);
  }
  for (const [m] of s.matchAll(/\+20\s?1\d[\d\s-]{7,}\d/g)) {
    if (!allowedPhones.includes(m.replace(/\D/g, ''))) errors.push(`${f}: unapproved phone number ${m}`);
  }
}

// ---------------------------------------------------------------- 5
const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const block = (sel) => tokens.slice(tokens.indexOf(sel)).split('}')[0];
const parse = (b) => Object.fromEntries([...b.matchAll(/--(color-[\w-]+|type-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const light = parse(block(':root {'));
const dark = { ...light, ...parse(block(":root[data-theme='dark']")) };
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const pairs = [
  ['color-ink', 'color-paper', 4.5], ['color-ink-2', 'color-paper', 4.5], ['color-ink-3', 'color-paper', 4.5],
  ['color-ink-2', 'color-surface-1', 4.5], ['color-ink-3', 'color-surface-1', 4.5], ['color-ink-3', 'color-surface-2', 4.5],
  ['color-accent', 'color-paper', 4.5], ['color-accent', 'color-surface-1', 4.5], ['color-accent', 'color-surface-2', 4.5],
  ['color-accent-strong', 'color-accent-soft', 4.5], ['color-paper', 'color-ink', 4.5], ['color-focus', 'color-paper', 3],
  ['color-rule-strong', 'color-paper', 1.5],
];
const contrast = [];
for (const [theme, set] of [['light', light], ['dark', dark]]) {
  for (const [fg, bg, min] of pairs) {
    const r = ratio(set[fg], set[bg]);
    contrast.push(`${theme.padEnd(5)} ${fg} on ${bg}: ${r.toFixed(2)} (min ${min})`);
    if (r < min) errors.push(`contrast ${theme}: ${fg} on ${bg} = ${r.toFixed(2)} < ${min}`);
  }
}

console.log(`QA: ${pages.length} pages, ${files.length} files, ${externals.size} external links, indexing ${indexing ? 'ON' : 'OFF'}, approved contact details: ${contactApproved ? 'yes' : 'no'}`);
console.log(contrast.map((c) => `  ${c}`).join('\n'));
if (externals.size) console.log(`External links:\n${[...externals].sort().map((u) => `  ${u}`).join('\n')}`);
for (const w of warn) console.warn(`WARN ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s):\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`);
  process.exit(1);
}
console.log('\nAll QA checks passed.');
