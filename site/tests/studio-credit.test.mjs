// The studio section (src/components/layout/StudioCredit.astro): on every page, a section
// of its own after the page's content and right before the site footer, saying the website
// was developed by Aboalazm OS Studio and linking to the studio's website. It wears the
// studio's identity (its design tokens and typefaces), not the site's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, ROOT, page, routes } from './helpers.mjs';

const STUDIO_URL = 'https://aboalazm-os.vercel.app/';
const isAr = (route) => route === '/ar/' || route.startsWith('/ar/');
const source = readFileSync(join(ROOT, 'src', 'components', 'layout', 'StudioCredit.astro'), 'utf8');
const style = source.slice(source.indexOf('<style>'), source.indexOf('</style>'));
const bundledCss = () =>
  readdirSync(join(DIST, '_astro'))
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(DIST, '_astro', f), 'utf8'))
    .join('\n');
const OPEN = '<section class="studio-credit"';
const FOOTER = '<footer class="site-footer"';
/** The studio section of a built page, from its opening tag to its closing tag. */
const section = (html) => {
  const at = html.indexOf(OPEN);
  return html.slice(at, html.indexOf('</section>', at) + '</section>'.length);
};

test('every page has the studio section after its content, right before the footer', () => {
  for (const route of routes()) {
    const html = page(route);
    assert.equal((html.match(/data-studio-credit/g) ?? []).length, 1, `${route}: one studio section`);
    const at = html.indexOf(OPEN);
    assert.ok(at > html.indexOf('</main>') && at < html.indexOf(FOOTER), `${route}: after </main>, before the footer`);
    assert.equal(html.slice(at + section(html).length, html.indexOf(FOOTER)).trim(), '', `${route}: nothing between it and the footer`);
    assert.ok(!html.slice(html.indexOf(FOOTER)).includes('data-studio-credit'), `${route}: not inside the footer`);
  }
});

test('a real section: its own heading, in the page language, outside the site search', () => {
  for (const route of routes()) {
    const s = section(page(route));
    assert.match(s, /^<section class="studio-credit" aria-labelledby="studio-credit-title" data-studio-credit data-pagefind-ignore/, `${route}: labelled by its heading, ignored by the search index`);
    const [label, cta, hint] = isAr(route)
      ? ['من تطوير', 'زيارة الاستوديو', '(يفتح في علامة تبويب جديدة)']
      : ['Developed by', 'Visit the studio', '(opens in a new tab)'];
    const h2 = s.match(/<h2 class="studio-credit__by" id="studio-credit-title"[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '';
    assert.ok(h2.includes(`>${label}</span> <span`), `${route}: the heading starts "${label}", then a space`);
    assert.match(h2, /<bdi lang="en"[^>]*>Aboalazm OS Studio<\/bdi>/, `${route}: the studio's name, isolated as English`);
    assert.ok(s.includes(`>${cta}</span>`), `${route}: the button "${cta}"`);
    assert.ok(s.includes(`> ${hint}</span>`), `${route}: the new-tab hint for screen readers`);
  }
});

test("the button goes to the studio's website, in a new tab", () => {
  for (const route of routes()) {
    const a = section(page(route)).match(/<a class="studio-credit__cta"[^>]*>/)?.[0] ?? '';
    assert.ok(a.includes(`href="${STUDIO_URL}"`), `${route}: ${a}`);
    assert.match(a, /target="_blank"/, `${route}: new tab`);
    assert.match(a, /rel="[^"]*\bnoopener\b/, `${route}: noopener`);
  }
});

test("the section wears the studio's identity, not the site's", () => {
  // the studio's design tokens, as authored …
  for (const decl of ['--os-obsidian: #080710', '--os-accent: #f5a623', '--os-line: rgb(255 255 255 / 0.08)', '--os-radius-panel: 24px', '--os-ease: cubic-bezier(0.16, 1, 0.3, 1)']) {
    assert.ok(style.includes(decl), decl);
  }
  assert.match(style, /--os-sans: 'Montserrat'/);
  assert.match(style, /--os-mono: 'JetBrains Mono'/);
  // … its own layout values (--credit-*, a prefix the site does not use) and none of the site's (colour, font, spacing, motion …)
  const foreign = [...style.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]).filter((n) => !n.startsWith('--os-') && !n.startsWith('--credit-'));
  assert.deepEqual(foreign, [], 'site tokens used in the section');
  const siteCss = readdirSync(join(ROOT, 'src', 'styles')).map((f) => readFileSync(join(ROOT, 'src', 'styles', f), 'utf8')).join('\n');
  assert.ok(!/--(os|credit)-/.test(siteCss), 'the site defines no --os-* or --credit-* values of its own');
  // the built rule and the studio's typefaces ship with the site
  const css = bundledCss();
  assert.match(css, /\.studio-credit\[[^\]]+\]\{--os-obsidian:#080710;[^}]*--os-accent:#f5a623;/);
  assert.match(css, /@font-face\{font-family:["']?Montserrat["']?;[^}]*font-weight:700;/);
  assert.match(css, /@font-face\{font-family:["']?JetBrains Mono["']?;[^}]*font-weight:500;/);
  // laid out (and its fonts fetched) only when it nears the viewport, with its height reserved until then
  assert.match(css, /content-visibility:auto;contain-intrinsic-block-size:auto calc\(/);
});

test('the footer keeps the room the floating buttons need at the end of the page', () => {
  const css = bundledCss();
  assert.match(css, /html:has\(\.chat:not\(\[hidden\]\)\) \.site-footer\{padding-block-end:4\.5rem\}/, 'set by the assistant launcher');
  assert.match(css, /html:has\(\.app-install:not\(\[hidden\]\)\) \.site-footer\{padding-block-end:4\.5rem\}/, 'set by the install button');
});
