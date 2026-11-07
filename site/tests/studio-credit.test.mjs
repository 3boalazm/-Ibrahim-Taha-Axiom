// The studio credit (src/components/layout/StudioCredit.astro): on every page the last
// band inside the site footer says the website was developed by Aboalazm OS Studio and
// links to the studio's website. It wears the studio's identity (its design tokens and
// typefaces), not the site's, and the floating buttons keep room at its end.
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
/** The credit band of a built page: from its opening tag to the end of the footer. */
const band = (html) => html.slice(html.indexOf('data-studio-credit'), html.indexOf('</footer>'));

test('every page ends its footer with the studio credit, in its own language', () => {
  for (const route of routes()) {
    const html = page(route);
    assert.equal((html.match(/data-studio-credit/g) ?? []).length, 1, `${route}: one credit`);
    const at = html.indexOf('data-studio-credit');
    assert.ok(at > html.indexOf('site-footer__bottom') && at < html.indexOf('</footer>'), `${route}: the last band inside the site footer`);
    const b = band(html);
    assert.match(b, /<bdi lang="en"[^>]*>Aboalazm OS Studio<\/bdi>/, `${route}: the studio's name, isolated as English`);
    const [label, cta, hint] = isAr(route)
      ? ['من تطوير', 'زيارة الاستوديو', '(يفتح في علامة تبويب جديدة)']
      : ['Developed by', 'Visit the studio', '(opens in a new tab)'];
    assert.ok(b.includes(`>${label}</span> <span`), `${route}: "${label}", then a space before the name`);
    assert.ok(b.includes(`>${cta}</span>`), `${route}: the button "${cta}"`);
    assert.ok(b.includes(`> ${hint}</span>`), `${route}: the new-tab hint for screen readers`);
  }
});

test("the button goes to the studio's website, in a new tab", () => {
  for (const route of routes()) {
    const a = band(page(route)).match(/<a class="studio-credit__cta"[^>]*>/)?.[0] ?? '';
    assert.ok(a.includes(`href="${STUDIO_URL}"`), `${route}: ${a}`);
    assert.match(a, /target="_blank"/, `${route}: new tab`);
    assert.match(a, /rel="[^"]*\bnoopener\b/, `${route}: noopener`);
  }
});

test("the band wears the studio's identity, not the site's", () => {
  // the studio's design tokens, as authored …
  for (const decl of ['--os-obsidian: #080710', '--os-accent: #f5a623', '--os-line: rgb(255 255 255 / 0.08)', '--os-ease: cubic-bezier(0.16, 1, 0.3, 1)']) {
    assert.ok(style.includes(decl), decl);
  }
  assert.match(style, /--os-sans: 'Montserrat'/);
  assert.match(style, /--os-mono: 'JetBrains Mono'/);
  // … and none of the site's (colour, font, spacing, motion …): only --os-* and the
  // clearance the floating buttons set
  const foreign = [...style.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]).filter((n) => !n.startsWith('--os-') && n !== '--floating-clearance');
  assert.deepEqual(foreign, [], 'site tokens used in the band');
  // the built rule and the studio's typefaces ship with the site
  const css = bundledCss();
  assert.match(css, /\.studio-credit\[[^\]]+\]\{--os-obsidian:#080710;[^}]*--os-accent:#f5a623;/);
  assert.match(css, /@font-face\{font-family:["']?Montserrat["']?;[^}]*font-weight:700;/);
  assert.match(css, /@font-face\{font-family:["']?JetBrains Mono["']?;[^}]*font-weight:500;/);
  // laid out (and its fonts fetched) only when it nears the viewport
  assert.match(css, /content-visibility:auto;contain-intrinsic-size:auto 11rem/);
});

test('the floating buttons keep room at the end of the band, not under the footer', () => {
  const css = bundledCss();
  assert.match(css, /html:has\(\.chat:not\(\[hidden\]\)\)\{--floating-clearance:4\.5rem\}/, 'set by the assistant launcher');
  assert.match(css, /html:has\(\.app-install:not\(\[hidden\]\)\)\{--floating-clearance:4\.5rem\}/, 'set by the install button');
  assert.match(css, /padding-block:2\.5rem calc\(2\.5rem \+ var\(--floating-clearance,0rem\)\)/, 'used by the band');
  assert.doesNotMatch(css, /site-footer[^{}]*\{[^}]*padding-block-end:4\.5rem/, 'the old room under the footer');
});
