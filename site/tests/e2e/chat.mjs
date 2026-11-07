#!/usr/bin/env node
/**
 * Browser checks for the site assistant widget on the built site (dist/). /api/chat is not
 * part of the static build, so every request to it is answered here by request
 * interception: the checks cover the widget, not Google.
 *
 *   npm run build
 *   npm i --no-save puppeteer-core@25
 *   CHROME_PATH=/usr/bin/google-chrome node tests/e2e/chat.mjs
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
  console.log(`e2e chat skipped: ${why}`);
  if (required && process.env.GITHUB_ACTIONS === 'true') console.log(`::error title=e2e chat::skipped although E2E_REQUIRED=1: ${why}`);
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
const annotate = (msg) => {
  if (process.env.GITHUB_ACTIONS === 'true') console.log(`::error title=e2e chat::${String(msg).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
};
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    annotate(msg);
  }
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
};
const until = (fn, timeout = 5000) => page.waitForFunction(fn, { timeout, polling: 50 }).then(() => true, () => false);
const go = (path) => page.goto(B + path, { waitUntil: 'networkidle0' });
const panelOpen = (want) => until(new Function(`return document.getElementById('site-chat')?.open === ${want};`));
const count = (sel) => page.$$eval(sel, (l) => l.length);
/** The open panel starts below the sticky site header, and its close button is not covered. */
const clearOfHeader = () =>
  page.evaluate(() => {
    const header = document.querySelector('.site-header').getBoundingClientRect();
    const panel = document.getElementById('site-chat').getBoundingClientRect();
    const close = document.querySelector('[data-chat-close]');
    const c = close.getBoundingClientRect();
    const top = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
    return { gap: Math.round(panel.top - header.bottom), closeOnTop: top === close || close.contains(top) };
  });
/** Bubbles are created by the script; check their styles really apply (scoped CSS would not). */
const bubbleStyle = () =>
  page.evaluate(() => {
    const log = document.querySelector('[data-chat-log]').getBoundingClientRect();
    const u = document.querySelector('.chat__msg--user');
    const b = document.querySelector('.chat__msg--bot:not(.chat__msg--pending)');
    const ur = u.getBoundingClientRect();
    const mid = log.left + log.width / 2;
    const rtl = getComputedStyle(u.parentElement).direction === 'rtl';
    return {
      filled: getComputedStyle(u).backgroundColor !== 'rgba(0, 0, 0, 0)',
      bordered: getComputedStyle(b).borderTopStyle !== 'none',
      atEnd: rtl ? ur.left < mid : ur.right > mid,
    };
  });

// ----------------------------------------------------------- fake /api/chat
const sent = [];
let next = { status: 200, body: { answer: 'ok' } };
await page.setRequestInterception(true);
page.on('request', (r) => {
  if (new URL(r.url()).pathname !== '/api/chat') return r.continue();
  sent.push(JSON.parse(r.postData() ?? '{}'));
  r.respond({ status: next.status, contentType: 'application/json', body: JSON.stringify(next.body) });
});

// ----------------------------------------------------------------- English
await go('/');
ok(await page.$eval('[data-chat]', (el) => !el.hidden), 'the widget appears once its script runs');
ok(await page.$eval('[data-chat-toggle]', (b) => b.getAttribute('aria-expanded') === 'false' && b.getBoundingClientRect().width > 0), 'the launcher is visible and collapsed');
ok(!(await page.$eval('#site-chat', (d) => d.open)), 'the panel starts closed');

await page.click('[data-chat-toggle]');
ok(await panelOpen(true), 'the launcher opens the panel');
ok(await page.evaluate(() => document.activeElement?.id === 'site-chat-input'), 'focus moves to the question box');
ok(await page.$eval('[data-chat-toggle]', (b) => b.getAttribute('aria-expanded') === 'true'), 'the launcher reports the panel as expanded');
ok(await page.$eval('[data-chat-intro]', (el) => !el.hidden && el.querySelectorAll('[data-chat-suggest]').length === 4), 'four example questions are offered');

next = {
  status: 200,
  body: { answer: 'Ibrahim works on penalized estimation for count regression. See [Publications](/publications/).\n\n- ridge\n- Liu-type <img src=x onerror="window.__xss=1">' },
};
await page.type('#site-chat-input', 'What does Ibrahim research?');
await page.keyboard.press('Enter');
ok(await until(() => document.querySelectorAll('.chat__msg--bot:not(.chat__msg--pending)').length === 1), 'Enter sends the question and the answer appears');
ok(sent.length === 1 && sent[0].lang === 'en' && sent[0].page === '/' && sent[0].question === 'What does Ibrahim research?' && Array.isArray(sent[0].history) && sent[0].history.length === 0, 'the request carries the language, page and question');
ok(await page.$eval('.chat__msg--bot a[href="/publications/"]', (a) => a.textContent === 'Publications').catch(() => false), 'a Markdown link to a site page becomes a link');
ok((await count('.chat__msg--bot li')) === 2, 'a "- " list becomes a list');
ok((await count('.chat__log img')) === 0 && !(await page.evaluate(() => window.__xss)), 'HTML in an answer is shown as text, never run');
ok(await page.$eval('.chat__msg--user', (el) => el.textContent.includes('What does Ibrahim research?')), 'the question is shown');
const enStyle = await bubbleStyle();
ok(enStyle.filled && enStyle.bordered && enStyle.atEnd, 'messages are styled: the question is a filled bubble at the end, the answer has a border');
const enClear = await clearOfHeader();
ok(enClear.gap >= 0 && enClear.closeOnTop, `1280 × 900: the panel starts below the site header (gap ${enClear.gap}px) and its close button is uncovered`);
ok(await page.$eval('[data-chat-intro]', (el) => el.hidden), 'the examples give way to the conversation');
ok(await page.evaluate(() => document.activeElement?.id === 'site-chat-input'), 'focus stays in the question box for the next question');

await page.keyboard.press('Tab');
ok(await page.evaluate(() => document.activeElement?.matches('[data-chat-send]')), 'Tab moves from the question box to Send');
await page.keyboard.press('Escape');
ok(await panelOpen(false), 'Escape closes the panel');
ok(await page.evaluate(() => document.activeElement?.matches('[data-chat-toggle]')), 'focus returns to the launcher');

// The conversation follows the visitor to another page (sessionStorage, this tab only).
await go('/about/');
await page.click('[data-chat-toggle]');
await panelOpen(true);
ok((await count('.chat__msg--user')) === 1 && (await count('.chat__msg--bot')) === 1, 'the conversation is still there on another page');
next = { status: 200, body: { answer: 'His profile is on [About](/about/).' } };
await page.type('#site-chat-input', 'Where is his profile?');
await page.click('[data-chat-send]');
await until(() => document.querySelectorAll('.chat__msg--bot').length === 2);
const second = sent.at(-1);
ok(second.page === '/about/' && second.history.length === 2 && second.history[0].role === 'user' && second.history[1].role === 'assistant', 'later questions send the earlier turns as context');

// Errors are shown as notices, never as answers, and are not kept.
next = { status: 503, body: { error: 'not_configured' } };
await page.type('#site-chat-input', 'Anything?');
await page.click('[data-chat-send]');
ok(await until(() => document.querySelector('.chat__msg--notice')?.textContent.includes('not set up yet')), 'a server that is not configured gives a clear notice');
ok((await count('.chat__msg--bot:not(.chat__msg--pending)')) === 2, 'no answer is invented for a failed request');
next = { status: 429, body: { error: 'rate_limited' } };
await page.type('#site-chat-input', 'Again?');
await page.click('[data-chat-send]');
ok(await until(() => [...document.querySelectorAll('.chat__msg--notice')].some((n) => n.textContent.includes('wait a minute'))), 'too many questions gives a "wait" notice');
await page.reload({ waitUntil: 'networkidle0' });
ok((await count('.chat__msg--notice')) === 0, 'notices are not stored');

await page.click('[data-chat-toggle]');
await panelOpen(true);
await page.click('[data-chat-new]');
ok((await count('.chat__msg')) === 0 && (await page.$eval('[data-chat-intro]', (el) => !el.hidden)), '"New chat" clears the conversation');
ok(await page.evaluate(() => sessionStorage.getItem('axiom-chat:en') === '[]'), 'and the stored copy');

// ------------------------------------------------------------------ Arabic
await go('/ar/');
const ar = await page.$eval('[data-chat-toggle]', (b) => ({ left: b.getBoundingClientRect().left, label: b.textContent.trim() }));
ok(ar.left < 640 && ar.label === 'اسأل عن الموقع', 'Arabic: the launcher sits at the inline end (left) with an Arabic label');
await page.click('[data-chat-toggle]');
await panelOpen(true);
ok(await page.$eval('#site-chat', (d) => d.getBoundingClientRect().left < 640 && getComputedStyle(d).direction === 'rtl'), 'Arabic: the panel opens on the left, right to left');
next = { status: 200, body: { answer: 'تجد المنشورات في [صفحة المنشورات](/ar/publications/).' } };
await page.type('#site-chat-input', 'أين المنشورات؟');
await page.keyboard.press('Enter');
await until(() => document.querySelectorAll('.chat__msg--bot:not(.chat__msg--pending)').length === 1);
ok(sent.at(-1).lang === 'ar' && sent.at(-1).page === '/ar/', 'Arabic: the request says so');
ok(await page.$eval('.chat__msg--bot a', (a) => a.getAttribute('href') === '/ar/publications/').catch(() => false), 'Arabic: the answer links the Arabic page');
const arStyle = await bubbleStyle();
ok(arStyle.filled && arStyle.bordered && arStyle.atEnd, 'Arabic: the question bubble sits at the inline end (left)');
await page.setViewport({ width: 1280, height: 700 });
const shortClear = await clearOfHeader();
ok(shortClear.gap >= 0 && shortClear.closeOnTop, `1280 × 700: the panel still clears the site header (gap ${shortClear.gap}px)`);

// ------------------------------------------------------------ 320 px, no JS
await page.setViewport({ width: 320, height: 640 });
await go('/ar/talks/');
await page.click('[data-chat-toggle]');
await panelOpen(true);
const narrow = await page.evaluate(() => {
  const d = document.getElementById('site-chat').getBoundingClientRect();
  return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, left: d.left, right: d.right };
});
ok(narrow.overflow <= 0 && narrow.left >= 0 && narrow.right <= 320, `320 px: the open panel fits the screen (overflow ${narrow.overflow}px)`);
await page.evaluate(() => window.scrollTo(0, 400));
const narrowClear = await clearOfHeader();
ok(narrowClear.gap >= 0 && narrowClear.closeOnTop, `320 × 640, Arabic, scrolled: the panel clears the sticky header (gap ${narrowClear.gap}px) and its close button is uncovered`);
ok(await page.$eval('[data-chat-toggle]', (b) => b.getBoundingClientRect().width <= 56 && b.getAttribute('aria-expanded') === 'true'), '320 px: the launcher is a round icon button that keeps its name');

const noJs = await browser.newPage();
await noJs.setJavaScriptEnabled(false);
await noJs.goto(`${B}/`, { waitUntil: 'networkidle0' });
ok(await noJs.$eval('[data-chat]', (el) => el.hidden && getComputedStyle(el).display === 'none'), 'without JavaScript there is no assistant button');
await noJs.close();

ok(jsErrors.length === 0, `no JavaScript errors${jsErrors.length ? `: ${jsErrors.join(' | ')}` : ''}`);
await browser.close();
server.close();
console.log(failed ? `\n${failed} chat check(s) failed` : '\nAll chat checks passed.');
process.exit(failed ? 1 : 0);
