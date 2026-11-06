// Site search over the built per-language indexes (dist/search-index/{en,ar}.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORIES, prepare, pushHistory, search } from '../src/lib/search.mjs';
import { DIST, requireBuild } from './helpers.mjs';

requireBuild();
const load = (lang) => JSON.parse(readFileSync(join(DIST, 'search-index', `${lang}.json`), 'utf8'));
const EN = load('en');
const AR = load('ar');
const en = prepare(EN.records);
const ar = prepare(AR.records);
const ids = (r) => r.groups.flatMap((g) => g.items.map((i) => i.id));
const cats = (r) => r.groups.map((g) => g.category);

test('both indexes exist, carry their language and the same records', () => {
  assert.equal(EN.lang, 'en');
  assert.equal(AR.lang, 'ar');
  assert.equal(EN.records.length, AR.records.length);
  assert.ok(EN.records.length >= 40, `only ${EN.records.length} records`);
  for (const r of EN.records) assert.ok(CATEGORIES.includes(r.cat), `unknown category ${r.cat}`);
  for (const cat of ['publications', 'areas', 'projects', 'teaching', 'talks', 'pages']) {
    assert.ok(EN.records.some((r) => r.cat === cat), `no ${cat} records`);
  }
});

test('the index holds approved public content only (no e-mail bodies, no private fields)', () => {
  const raw = JSON.stringify(EN) + JSON.stringify(AR);
  for (const bad of ['orcidToken', 'password', 'apiKey', 'secret']) assert.ok(!raw.includes(bad), bad);
});

test('every result URL is a built page (anchors allowed)', () => {
  for (const r of [...EN.records, ...AR.records]) {
    const [path] = r.url.split('#')[0].split('?');
    assert.match(path, /\/$/, `${r.url} should end in a slash before any #anchor`);
    assert.doesNotThrow(() => readFileSync(join(DIST, path, 'index.html')), `${r.url} has no page`);
  }
});

test('English queries: topic, author, DOI prefix, acronym', () => {
  const ridge = search(en, 'ridge', { perCategory: 50 });
  assert.ok(ridge.total >= 8, `ridge → ${ridge.total}`);
  assert.ok(cats(ridge).includes('publications'));
  assert.ok(search(en, 'Abonazel', { perCategory: 50 }).total >= 5);
  assert.ok(ids(search(en, '10.3389')).includes('publication:abonazel2022two'));
  assert.ok(search(en, 'PLS-SEM').total >= 1);
  assert.equal(search(en, 'zzzzqqq').total, 0, 'nonsense must return nothing');
  assert.equal(search(en, '   ').total, 0);
});

test('Arabic queries, with and without diacritics, and Arabic-Indic digits', () => {
  const a = search(ar, 'الحَرْف', { perCategory: 50 }).total;
  const b = search(ar, 'الحرف', { perCategory: 50 }).total;
  assert.ok(a > 0 && a === b, `diacritics changed the result: ${a} vs ${b}`);
  assert.ok(search(ar, 'انحدار', { perCategory: 50 }).total >= 10);
  assert.ok(search(ar, '٢٠٢٣', { perCategory: 50 }).total >= 1);
  assert.ok(search(ar, 'التعدد الخطي', { perCategory: 50 }).total >= 3);
  const contact = search(ar, 'تواصل');
  assert.ok(ids(contact).some((id) => id.startsWith('page:')), 'تواصل should find the contact page');
});

test('mixed-language queries need every term to match', () => {
  const mixed = search(ar, 'ridge انحدار', { perCategory: 50 }).total;
  const ridgeOnly = search(ar, 'ridge', { perCategory: 50 }).total;
  assert.ok(mixed > 0 && mixed <= ridgeOnly, `mixed ${mixed} vs ridge ${ridgeOnly}`);
  assert.ok(search(en, 'Abonazel 2023', { perCategory: 50 }).total >= 1);
});

test('results are grouped in the fixed category order and capped per category', () => {
  const r = search(en, 'regression', { perCategory: 3 });
  const order = cats(r).map((c) => CATEGORIES.indexOf(c));
  assert.deepEqual(order, [...order].sort((x, y) => x - y));
  for (const g of r.groups) assert.ok(g.items.length <= 3);
});

test('search history is de-duplicated, newest first and capped', () => {
  let h = [];
  for (const q of ['ridge', 'beta', 'Ridge', 'panel', 'a', 'b', 'c', 'd']) h = pushHistory(h, q);
  assert.equal(h[0], 'd');
  assert.ok(h.length <= 6);
  assert.equal(h.filter((q) => q.toLowerCase() === 'ridge').length <= 1, true);
});
