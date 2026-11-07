// The community and a lighter home page (decision D-23, 2026-11-07).
// profile.community is the single source of the community's links: the home page's community
// section, the contact page and the site assistant all read it. The home page stays light:
// compact research tiles and publications, no contents index; the full detail stays on each
// section's own page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { data, page, routes } from './helpers.mjs';

const WHATSAPP = 'https://chat.whatsapp.com/JPc3Xs3WTeXHnjdUYnHWXd';
const TELEGRAM = 'https://t.me/StatisticalAnalysisEgypt';
const FB_PAGE = 'https://www.facebook.com/share/1bgFz5pT2C/';
const FB_PAGE_SUPERSEDED = 'https://www.facebook.com/share/1B3DbXjPh7/';
const FB_GROUP = 'https://www.facebook.com/share/g/1biRB3jfwp/';
const profile = data('approved/profile.json');
const manifest = data('approved/public-content.manifest.json');
const project = data('approved/projects.json').find((p) => p.id === 'statistical-analysis-egypt');
const HOMES = [
  { route: '/', lang: 'en', base: '' },
  { route: '/ar/', lang: 'ar', base: '/ar' },
];
const NAMES = {
  en: ['Facebook page', 'Facebook group', 'Telegram group', 'WhatsApp group'],
  ar: ['صفحة فيسبوك', 'مجموعة فيسبوك', 'مجموعة تيليجرام', 'مجموعة واتساب'],
};
/** The community section of a built page, or '' when there is none. */
const communityOf = (html) => {
  const at = html.indexOf('<section class="community container" id="community"');
  return at < 0 ? '' : html.slice(at, html.indexOf('</section>', at) + '</section>'.length);
};
const mainOf = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
/** Where a marker sits in a page; fails when it is missing, so order checks cannot pass vacuously. */
const at = (html, marker, route) => {
  const i = html.indexOf(marker);
  assert.ok(i >= 0, `${route}: ${marker} is missing`);
  return i;
};
const hrefs = (html, cls) => [...html.matchAll(new RegExp(`<a class="${cls}"[^>]*?href="([^"]+)"`, 'g'))].map((m) => m[1]);

test('the community: its WhatsApp group, the Facebook page link the owner sent, and a Telegram group', () => {
  assert.deepEqual(
    profile.community.map((c) => [c.kind, c.url]),
    [
      ['facebook-page', FB_PAGE],
      ['facebook-group', FB_GROUP],
      ['telegram-group', TELEGRAM],
      ['whatsapp-group', WHATSAPP],
    ],
  );
  assert.equal(profile.community[2].label.ar, 'الإحصاء وتطبيقاته (مجموعة تيليجرام)');
  // The project entry carries the same links; its summary names WhatsApp and says group.
  assert.deepEqual(
    project.links.map((l) => l.url),
    [TELEGRAM, FB_PAGE, FB_GROUP, WHATSAPP],
  );
  assert.match(project.summary.en, /on Facebook, Telegram and WhatsApp,/);
  assert.match(project.summary.en, /The Telegram group had 46,523 members on 5 November 2026\.$/);
  // The change is on the audit trail, after the earlier records (which stay as they were).
  const last = manifest.approvalHistory.at(-1);
  assert.equal(last.date, '2026-11-07');
  assert.ok(last.scope.includes(WHATSAPP) && last.scope.includes(FB_PAGE) && last.scope.includes(FB_PAGE_SUPERSEDED));
});

test('both home pages have a community section with every community link, in order', () => {
  for (const { route, lang, base } of HOMES) {
    const html = page(route);
    const sec = communityOf(html);
    assert.ok(sec, `${route}: community section`);
    assert.match(sec, /aria-labelledby="community-title"/);
    assert.deepEqual(hrefs(sec, 'community__link'), profile.community.map((c) => c.url), `${route}: links`);
    // Each tile names the platform and the kind of space, in the page language.
    const names = [...sec.matchAll(/class="community__name"[^>]*>([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(names, NAMES[lang], `${route}: tile names`);
    // Same tab and rel="noopener", like the site's other external links; no tracking parameters.
    for (const a of sec.match(/<a class="community__link"[^>]*>/g)) {
      assert.match(a, /rel="noopener"/);
      assert.doesNotMatch(a, /target=/);
    }
    assert.doesNotMatch(sec, /utm_|fbclid|igshid/);
    // A space between the name and the host, so the link's name does not run them together
    // (compressed HTML drops the whitespace between tags).
    assert.equal((sec.match(/class="community__name"[^>]*>[^<]+<\/span> <span class="community__host/g) ?? []).length, 4, `${route}: name and host apart`);
    // The approved project entry is one link away.
    assert.ok(sec.includes(`href="${base}/projects/#statistical-analysis-egypt"`), `${route}: project link`);
    // After the metrics, before the invitation to write.
    assert.ok(at(html, 'aria-labelledby="mcards-title"', route) < at(html, 'id="community"', route), `${route}: after the metrics`);
    assert.ok(at(html, 'id="community"', route) < at(html, 'id="cta-heading"', route), `${route}: before the CTA`);
  }
});

test('the lead is the approved project summary; in Arabic, its labelled draft', () => {
  assert.ok(communityOf(page('/')).includes(project.summary.en));
  const ar = page('/ar/');
  assert.match(communityOf(ar), /<p data-draft[^>]*class="community__lead is-draft"[^>]*>[^<]*واتساب/);
  assert.ok(ar.includes('ترجمة مبدئية'), 'the Arabic home says once that it shows unreviewed drafts');
});

test('no page calls Telegram a channel or shows the superseded Facebook link; the contact page has WhatsApp', () => {
  for (const r of routes()) {
    const html = page(r);
    for (const stale of [FB_PAGE_SUPERSEDED, 'قناة تيليجرام', 'Telegram channel']) assert.ok(!html.includes(stale), `${r} still shows ${stale}`);
  }
  for (const r of ['/contact/', '/ar/contact/', '/projects/', '/ar/projects/']) assert.ok(page(r).includes(`href="${WHATSAPP}"`), `${r}: WhatsApp group`);
});

test('the home page stays light; the detail it dropped is still on the section pages', () => {
  const areaIds = manifest.researchAreas.approvedIds;
  for (const { route, base } of HOMES) {
    const html = page(route);
    const main = mainOf(html);
    // Research: one compact tile per approved area, linking to its entry on the research page.
    assert.deepEqual(hrefs(main, 'dcard'), areaIds.map((id) => `${base}/research/#${id}`), `${route}: area tiles`);
    assert.equal((main.match(/<\/span><\/span> <span class="dcard__meta"/g) ?? []).length, areaIds.length, `${route}: a space between each area's title and its count`);
    assert.doesNotMatch(main, /dcard__media|dcard__pubs|disc__projects|\/images\/(surface|distributions|lattice|strata|matrix|study)/, `${route}: no area images, previews or project list`);
    // Selected publications: compact, each linking to its own page; no citations, abstracts or chips.
    assert.equal((main.match(/class="pub pub--selected pub--compact"/g) ?? []).length, 3, `${route}: three compact publications`);
    assert.doesNotMatch(main, /class="cite"|pub__abstract|pub__related|pub__actions/, `${route}: no inline citations`);
    // No contents index: the header and the footer carry the site's contents.
    assert.ok(!html.includes('home-index'), `${route}: no contents index`);
  }
  // The detail lives on the section pages.
  assert.match(page('/research/'), /\/images\/(surface|distributions|lattice|strata|matrix|study)/);
  assert.equal((page('/publications/').match(/<details class="cite"/g) ?? []).length, 22);
  assert.ok(page('/projects/').includes('id="statistical-analysis-egypt"'));
});
