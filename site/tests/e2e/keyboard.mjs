#!/usr/bin/env node
/**
 * Browser checks for keyboard and URL-state behaviour on the built site (dist/).
 *
 *   npm run build
 *   npm i --no-save puppeteer-core@25        # not a project dependency
 *   CHROME_PATH=/usr/bin/google-chrome npm run test:e2e
 *
 * Without puppeteer-core or CHROME_PATH the script explains what is missing and exits 0,
 * unless E2E_REQUIRED=1 (set in CI), when it exits 1.
 */
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { DIST, requireBuild } from '../helpers.mjs';

const required = process.env.E2E_REQUIRED === '1';
const skip = (why) => {
  console.log(`e2e skipped: ${why}`);
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
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let f = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const B = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(`${page.url()}: ${e.message}`));
let failed = 0;
const ok = (cond, msg) => {
  if (!cond) failed++;
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const go = (path) => page.goto(B + path, { waitUntil: 'networkidle0' });
const ctrlK = async () => {
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await sleep(150);
};
const visible = () => page.$$eval('[data-x-item]:not([hidden])', (l) => l.length);
const query = () => new URL(page.url()).search;

try {
  // ------------------------------------------------------------- search
  await go('/');
  await ctrlK();
  ok(await page.$eval('#site-search', (d) => d.open), 'Ctrl+K opens the search dialog');
  ok(await page.evaluate(() => document.activeElement?.id === 'site-search-input'), 'focus moves into the search field');
  await page.keyboard.type('ridge');
  await sleep(400);
  ok((await page.$$eval('#site-search-list [role=option]', (o) => o.length)) > 3, '"ridge" lists several results');
  ok(await page.$$eval('#site-search-list mark', (m) => m.length > 0), 'matches are highlighted');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const active = await page.$eval('#site-search-input', (i) => i.getAttribute('aria-activedescendant'));
  ok(active === 'search-o-1', 'ArrowDown moves aria-activedescendant through the options');
  const href = await page.$eval(`#${active}`, (a) => a.getAttribute('href'));
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.keyboard.press('Enter')]);
  ok(page.url().endsWith(href), 'Enter opens the active result');
  ok((await page.evaluate(() => sessionStorage.getItem('axiom-search-history'))) === '["ridge"]', 'the query is remembered for this session only');
  await go('/research/');
  await page.focus('.search-trigger');
  await page.keyboard.press('Enter');
  await sleep(150);
  ok(await page.$eval('#site-search', (d) => d.open), 'the header button opens the dialog');
  await page.keyboard.press('Escape');
  await sleep(150);
  ok(!(await page.$eval('#site-search', (d) => d.open)), 'Escape closes it');
  ok(await page.evaluate(() => document.activeElement?.classList.contains('search-trigger')), 'focus returns to the button');
  await page.keyboard.press('/');
  await sleep(150);
  ok(await page.$eval('#site-search', (d) => d.open), '"/" opens the dialog');
  await page.keyboard.type('zzzqqq');
  await sleep(400);
  ok(await page.$eval('[data-search-empty]', (e) => !e.hidden), 'no results shows the empty state');
  await page.keyboard.press('Escape');
  await go('/ar/');
  await ctrlK();
  for (const q of ['الحَرْف', 'التعدد الخطي', 'Abonazel ٢٠٢٣', 'ridge انحدار']) {
    await page.$eval('#site-search-input', (i) => (i.value = ''));
    await page.type('#site-search-input', q);
    await sleep(450);
    ok((await page.$$eval('#site-search-list a[role=option]', (o) => o.length)) > 0, `Arabic page finds "${q}"`);
  }
  await page.keyboard.press('Escape');

  // ------------------------------------------------------------- explorer
  await go('/publications/?type=book&sort=oldest');
  ok((await visible()) === 4, 'URL state ?type=book shows the four books');
  ok(await page.$eval('[data-x-type="book"]', (b) => b.getAttribute('aria-pressed') === 'true'), 'the type control reflects the URL');
  await go('/publications/');
  await page.click('[data-x-year="2019"]');
  await sleep(100);
  ok(query().includes('from=2019&to=2019') && (await visible()) > 0, 'a year bar filters and updates the URL');
  await page.click('[data-x-year="2019"]');
  await page.select('[data-x="author"]', 'abonazel|mr');
  await page.type('[data-x="q"]', 'two-parameter');
  await sleep(300);
  ok((await visible()) === 1, 'co-author + search combine');
  await page.click('[data-x-view="cards"]');
  ok(await page.$eval('[data-x-list]', (l) => l.dataset.view === 'cards'), 'the view switches to cards');
  await page.click('.explorer__clear');
  await sleep(100);
  ok((await visible()) === 22 && query() === '?view=cards', 'clearing filters keeps the chosen view');

  // ------------------------------------------------------------- graph
  await go('/research/');
  await page.focus('.graph__node[tabindex="0"]');
  await page.keyboard.press('ArrowDown');
  const a = await page.evaluate(() => document.activeElement?.dataset.ref);
  await page.keyboard.press('ArrowRight');
  const b = await page.evaluate(() => document.activeElement?.dataset.ref);
  ok(a?.startsWith('area:') && b?.startsWith('publication:'), 'arrow keys move between graph nodes and columns');
  ok(await page.evaluate(() => [...document.querySelectorAll('.graph__node')].filter((n) => n.tabIndex === 0).length === 1), 'the graph is a single tab stop');
  await page.keyboard.press('Enter');
  await sleep(100);
  ok(!!(await page.$('.graph__node[aria-pressed="true"]')) && (await page.$$('.graph__edge.is-lit')).length > 0, 'Enter selects a node and lights its links');
  await page.keyboard.press('Escape');
  ok(!(await page.$('.graph__node[aria-pressed="true"]')), 'Escape clears the selection');
  await go('/research/?focus=method:ridge-estimation');
  ok((await page.$eval('.graph__node[aria-pressed="true"]', (n) => n.dataset.ref)) === 'method:ridge-estimation', '?focus= preselects a node');
  await go('/ar/research/');
  ok(await page.evaluate(() => document.querySelector('.graph__col--start').getBoundingClientRect().left > document.querySelector('.graph__col--centre').getBoundingClientRect().left), 'RTL: the areas column is on the right');

  // ------------------------------------------------------------- home, about, contact
  await go('/');
  await page.focus('[data-normal-plot]');
  await page.keyboard.press('ArrowRight');
  await sleep(150);
  ok((await page.$eval('[data-normal-plot]', (p) => p.getAttribute('aria-valuetext'))).startsWith('z = 2.06, Φ(z) = 0.980'), 'the normal-curve slider moves with the arrow keys');
  await page.focus('[data-idp-tab]');
  await page.keyboard.press('ArrowRight');
  ok((await page.evaluate(() => document.activeElement?.dataset.idpTab)) === 'education', 'identity tabs follow the arrow keys');
  await go('/about/');
  await page.click('[data-journey-toggle]');
  ok(await page.$$eval('[data-journey-item]', (d) => d.every((x) => x.open)), 'the journey expands all years at once');
  await go('/contact/?path=supervision');
  ok((await page.$eval('input[name=path]:checked', (r) => r.value)) === 'supervision', '?path= preselects the contact path');
  await page.type('#composer-message', 'short');
  await page.click('.composer button[type=submit]');
  ok(await page.$eval('#composer-message', (e) => e.getAttribute('aria-invalid') === 'true'), 'a too-short message is flagged, nothing is sent');

  ok(jsErrors.length === 0, `no JavaScript errors${jsErrors.length ? `: ${jsErrors.join(' | ')}` : ''}`);
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? `\n${failed} e2e check(s) failed` : '\nAll e2e checks passed.');
process.exit(failed ? 1 : 0);
