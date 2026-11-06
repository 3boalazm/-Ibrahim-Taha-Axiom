#!/usr/bin/env node
/**
 * Browser checks for the motion system (docs/motion-system.md) on the built site.
 *
 *   npm run build
 *   npm i --no-save puppeteer-core@25        # not a project dependency
 *   CHROME_PATH=/usr/bin/google-chrome node tests/e2e/motion.mjs
 *
 * What is asserted is behaviour, not choreography:
 * - with motion: values on screen are exact (hero readout after a glide, lab
 *   readouts on the very next frame), controls stay usable while things move,
 *   every reveal reaches its end state, page transitions run (and are skipped
 *   for a language switch);
 * - with reduced motion: no hidden starting state, no running animation, no
 *   page transition, every control still works instantly;
 * - without JavaScript: nothing is hidden.
 *
 * Same skip rules as keyboard.mjs (exits 0 when the browser is missing, unless
 * E2E_REQUIRED=1).
 */
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { DIST, requireBuild } from '../helpers.mjs';
import { cdf, Z_MAX } from '../../src/lib/normal.mjs';

const required = process.env.E2E_REQUIRED === '1';
const skip = (why) => {
  console.log(`motion e2e skipped: ${why}`);
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
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let f = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const B = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const jsErrors = [];
let failed = 0;
const ok = (cond, msg) => {
  if (!cond) failed++;
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open({ reduced = false, js = true, width = 1280, height = 900 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.setJavaScriptEnabled(js);
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('pageerror', (e) => jsErrors.push(`${page.url()}: ${e.message}`));
  // records whether a cross-document view transition was offered to, and run by, each new page
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('pagereveal', (e) => {
      const vt = e.viewTransition;
      window.__vt = vt ? 'offered' : 'none';
      vt?.ready.then(
        () => (window.__vt = 'ran'),
        () => (window.__vt = 'skipped'),
      );
    });
  });
  return page;
}
const go = (page, path) => page.goto(B + path, { waitUntil: 'networkidle0' });
/** elements that are invisible because of a motion starting state */
const hiddenByMotion = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-reveal], [data-stagger] > *, [data-settle] > *, .graph__canvas, .journey__year, .explorer__item')].filter((el) => {
      const cs = getComputedStyle(el);
      return el.getClientRects().length > 0 && Number(cs.opacity) < 0.99;
    }).length,
  );
const runningAnimations = (page) =>
  page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && Number(a.effect?.getComputedTiming().duration) > 1).length);
const scrollThrough = async (page) => {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.6)) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await sleep(1400); // longest entrance: --motion-slow + capped stagger
};

try {
  // ============================================================ motion allowed
  let page = await open();
  await go(page, '/');
  ok(await page.evaluate(() => document.documentElement.hasAttribute('data-motion') && window.__axiomMotion === true), 'motion layer boots: html[data-motion] and the motion module are live');

  // hero: ARIA jumps to the target, the drawing glides there and ends exact
  await page.focus('[data-normal-plot]');
  await page.keyboard.press('End');
  const aria = await page.$eval('[data-normal-plot]', (p) => p.getAttribute('aria-valuetext'));
  ok(aria.startsWith(`z = ${Z_MAX.toFixed(2)}, Φ(z) = ${cdf(Z_MAX).toFixed(3)}`), 'hero: aria-valuetext is the target value at once (no intermediate values announced)');
  await sleep(450);
  const readout = await page.evaluate(() => [document.querySelector('[data-normal-z]').textContent, document.querySelector('[data-normal-p]').textContent]);
  ok(readout[0] === Z_MAX.toFixed(2) && readout[1] === cdf(Z_MAX).toFixed(3), `hero: after the glide the readout is exact (z = ${readout[0]}, Φ = ${readout[1]})`);
  const marker = await page.evaluate(() => ({
    x: Number(document.querySelector('[data-normal-marker]').getAttribute('x1')),
    w: document.querySelector('[data-normal-plot] svg').viewBox.baseVal.width,
  }));
  ok(marker.x > marker.w * 0.8, `hero: the z marker has travelled to the right tail (x = ${marker.x} of ${marker.w})`);

  // reveal-once: every block below the fold reaches its end state
  await scrollThrough(page);
  const unrevealed = await page.evaluate(() => [...document.querySelectorAll('[data-reveal], [data-stagger]')].filter((el) => !el.classList.contains('is-revealed')).length);
  ok(unrevealed === 0, 'home: every reveal-once block was revealed after scrolling through');
  ok((await hiddenByMotion(page)) === 0, 'home: nothing is left transparent after the entrances');
  ok((await runningAnimations(page)) === 0, 'home: no animation keeps running (no loops)');

  // page transition: same-language navigation offers and runs a view transition
  await go(page, '/research/');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('.site-nav a[href="/publications/"]')]);
  await sleep(400);
  const vt = await page.evaluate(() => window.__vt);
  ok(vt === 'ran', `page transition: navigating Research → Publications runs a view transition (${vt})`);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('a[hreflang="ar"], a[lang="ar"][href^="/ar/"]')]);
  await sleep(400);
  const vtLang = await page.evaluate(() => window.__vt);
  ok(vtLang === 'skipped' || vtLang === 'none', `page transition: a language switch is not animated (${vtLang})`);

  // explorer: the list stays clickable while results move; state and URL are exact
  await go(page, '/publications/');
  await page.click('[data-x-type="book"]');
  const moving = await runningAnimations(page);
  await page.click('[data-x-type="book"]'); // second click lands mid-animation
  await sleep(60);
  ok(moving > 0, `explorer: results animate on a filter change (${moving} animations)`);
  ok((await page.$$eval('[data-x-item]:not([hidden])', (l) => l.length)) === 22 && (await page.evaluate(() => location.search)) === '', 'explorer: a click during the animation is not lost (filter toggled back, URL cleared)');
  await page.click('[data-x-type="book"]');
  await sleep(20);
  ok((await page.$eval('[data-x-count]', (e) => e.textContent)).includes('4'), 'explorer: the result count is the exact new value immediately');

  // lab: readouts and tables are exact on the next frame while the chart moves
  await go(page, '/lab/');
  const payload = await page.$eval('#lab-payload', (s) => JSON.parse(s.textContent));
  const presets = await page.$$eval('[data-lab-preset]', (l) => l.map((b) => Number(b.dataset.labPreset)));
  let exact = true;
  let animated = 0;
  for (const i of presets) {
    await page.click(`[data-lab-preset="${i}"]`);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    animated += await runningAnimations(page);
    const st = payload.states[i];
    const want = `${(st.mc.est.ml.spread / st.mc.est.ridge.spread).toFixed(1)}×`;
    const got = await page.$eval('[data-lab="ratio"]', (e) => e.textContent);
    // first data row, second <td> (the first is the true value): ML mean (sd)
    const cell = await page.$eval('[data-lab-table="mc"] tr', (tr) => tr.querySelectorAll('td')[1].textContent);
    const wantCell = `${st.mc.est.ml.mean[0].toFixed(3)} (${st.mc.est.ml.sd[0].toFixed(3)})`;
    if (got !== want || cell !== wantCell) {
      exact = false;
      console.log(`   preset ${i}: ratio ${got} (want ${want}), table ${cell} (want ${wantCell})`);
    }
  }
  ok(exact, `lab: ratio readout and Monte Carlo table equal the selected precomputed state on the next frame (${presets.length} presets)`);
  ok(animated > 0, 'lab: chart geometry transitions between states');
  await sleep(400);
  ok((await page.$$('[data-lab-coef] svg [data-k]')).length > 0 && (await runningAnimations(page)) === 0, 'lab: transitions finish; keyed chart elements are in place');

  // graph: drawn on entry, selection redraws the node's edges, nothing loops
  await go(page, '/research/');
  await sleep(1800);
  ok(!(await page.$eval('[data-graph]', (r) => r.classList.contains('is-awaiting'))) && (await hiddenByMotion(page)) === 0, 'graph: the map is fully visible after its entrance');
  await page.click('.graph__col--centre .graph__node');
  await sleep(30);
  ok((await runningAnimations(page)) > 0, 'graph: selecting a node animates its edges');
  await sleep(700);
  ok((await runningAnimations(page)) === 0, 'graph: selection motion ends (nodes are never animated continuously)');

  // journey: line and years revealed, current year highlighted (visual only)
  await go(page, '/about/');
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelector('.journey__years').scrollIntoView({ block: 'start' });
  });
  await sleep(1700);
  const j = await page.evaluate(() => ({
    revealed: !document.querySelector('.journey')?.classList.contains('motion-armed') || document.querySelector('.journey')?.classList.contains('is-revealed'),
    current: document.querySelectorAll('.journey__year.is-current').length,
    undatedCurrent: document.querySelectorAll('.journey__year--undated.is-current').length,
    ariaCurrent: document.querySelectorAll('.journey [aria-current]').length,
  }));
  ok(j.revealed && j.current === 1 && j.undatedCurrent === 0 && j.ariaCurrent === 0, 'journey: revealed, exactly one dated year marked current, no ARIA added');
  ok((await hiddenByMotion(page)) === 0, 'journey: no year left transparent');
  await page.close();

  // ============================================================ reduced motion
  page = await open({ reduced: true });
  await go(page, '/');
  ok(!(await page.evaluate(() => document.documentElement.hasAttribute('data-motion'))), 'reduced motion: no data-motion, so no hidden starting states');
  ok((await hiddenByMotion(page)) === 0, 'reduced motion: every block is visible without scrolling');
  ok((await runningAnimations(page)) === 0, 'reduced motion: nothing animates on load');
  await page.focus('[data-normal-plot]');
  await page.keyboard.press('End');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  ok((await page.$eval('[data-normal-z]', (e) => e.textContent)) === Z_MAX.toFixed(2), 'reduced motion: the hero jumps to the new z in one frame');
  await go(page, '/research/');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('.site-nav a[href="/publications/"]')]);
  await sleep(200);
  ok((await page.evaluate(() => window.__vt)) !== 'ran', 'reduced motion: no page transition');
  await page.click('[data-x-type="book"]');
  ok((await runningAnimations(page)) === 0 && (await page.$$eval('[data-x-item]:not([hidden])', (l) => l.length)) === 4, 'reduced motion: explorer filters instantly, without animation');
  await go(page, '/lab/');
  const last = (await page.$$eval('[data-lab-preset]', (l) => l.map((b) => b.dataset.labPreset))).pop();
  await page.click(`[data-lab-preset="${last}"]`);
  ok((await runningAnimations(page)) === 0 && (await page.$eval('[data-lab="ratio"]', (e) => e.textContent)) === '11.3×', 'reduced motion: lab switches state instantly and exactly (ρ = .995 → 11.3×)');
  await go(page, '/about/');
  ok((await hiddenByMotion(page)) === 0, 'reduced motion: journey fully visible');
  await page.close();

  // ============================================================ no JavaScript
  page = await open({ js: false });
  for (const path of ['/', '/publications/', '/about/', '/research/', '/ar/']) {
    await go(page, path);
    const hidden = await hiddenByMotion(page);
    ok(hidden === 0, `no JS: nothing hidden on ${path}`);
  }
  await go(page, '/publications/');
  ok((await page.$$eval('[data-x-item]', (l) => l.filter((li) => li.getClientRects().length > 0).length)) === 22, 'no JS: all 22 publications are listed');
  await page.close();

  ok(jsErrors.length === 0, `no JavaScript errors${jsErrors.length ? `: ${jsErrors.join(' | ')}` : ''}`);
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? `\n${failed} motion check(s) failed` : '\nAll motion checks passed.');
process.exit(failed ? 1 : 0);
