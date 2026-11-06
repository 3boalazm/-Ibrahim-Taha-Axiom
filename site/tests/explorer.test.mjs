// Publication explorer: URL state, filters, sorts and facets (src/lib/explorer.mjs),
// run on the item payload embedded in the built publications page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STATE, coauthorKey, filterItems, parseState, serializeState, sortItems, typeCounts, yearHistogram } from '../src/lib/explorer.mjs';
import { bibKeys, jsonScript, page } from './helpers.mjs';

const items = jsonScript(page('/publications/'), 'data-x-items');
const state = (over) => ({ ...DEFAULT_STATE, ...over });
const keys = (list) => list.map((i) => i.key);

test('the explorer lists every approved bib entry exactly once', () => {
  const bib = bibKeys().map((b) => b.key).sort();
  assert.deepEqual(keys(items).sort(), bib);
  assert.deepEqual(keys(jsonScript(page('/ar/publications/'), 'data-x-items')).sort(), bib, 'Arabic page lists the same records');
});

test('URL state round-trips and drops defaults', () => {
  const s = state({ q: 'beta ridge', types: ['journal-article', 'book'], from: 2019, to: 2023, sel: true, author: 'abonazel|mr', area: 'beta-regression', sort: 'oldest', view: 'cards' });
  const qs = serializeState(s);
  assert.deepEqual(parseState(qs), s);
  assert.equal(serializeState(DEFAULT_STATE), '');
  assert.equal(serializeState(state({ q: '  ' })), '', 'blank search is not written');
});

test('invalid URL values fall back to defaults; reversed years are swapped', () => {
  const s = parseState('?sort=random&view=grid&from=abc&to=2020&type=nope', { types: ['book'], authors: [], areas: [] });
  assert.equal(s.sort, 'newest');
  assert.equal(s.view, 'list');
  assert.equal(s.from, null);
  assert.equal(s.to, 2020);
  assert.deepEqual(s.types, []);
  const r = parseState('?from=2025&to=2019');
  assert.deepEqual([r.from, r.to], [2019, 2025]);
  assert.equal(parseState('?author=nobody|x', { authors: ['abonazel|mr'] }).author, '');
});

test('filters: type, year range, selected, co-author, area, query — and they combine', () => {
  const books = filterItems(items, state({ types: ['book'] }));
  assert.equal(books.length, bibKeys().filter((b) => b.type === 'book').length);
  const y2019 = filterItems(items, state({ from: 2019, to: 2019 }));
  assert.ok(y2019.length > 0 && y2019.every((i) => i.year === 2019));
  const sel = filterItems(items, state({ sel: true }));
  assert.deepEqual(keys(sel).sort(), keys(items.filter((i) => i.selected)).sort());
  const ab = filterItems(items, state({ author: 'abonazel|mr' }));
  assert.ok(ab.length >= 5 && ab.every((i) => i.authors.includes('abonazel|mr')));
  const combo = filterItems(items, state({ author: 'abonazel|mr', area: 'beta-regression', q: 'two-parameter' }));
  assert.deepEqual(keys(combo), ['abonazel2022two']);
});

test('the Arabic glossary finds the same publications as the English term', () => {
  const en = keys(filterItems(items, state({ q: 'ridge' }))).sort();
  const ar = keys(filterItems(items, state({ q: 'الحرف' }))).sort();
  assert.ok(en.length >= 3);
  assert.deepEqual(ar, en);
});

test('co-author keys keep different initials apart and match name orders', () => {
  assert.equal(coauthorKey('Mohamed R.', 'Abonazel'), coauthorKey('M. R.', 'Abonazel'));
  assert.notEqual(coauthorKey('E. A.', 'Rady'), coauthorKey('E. H. A.', 'Rady'));
});

test('sorts: newest, oldest, A–Z, selected first', () => {
  const years = (l) => l.map((i) => i.year ?? 0);
  const newest = years(sortItems(items, 'newest'));
  assert.deepEqual(newest, [...newest].sort((a, b) => b - a));
  const oldest = sortItems(items, 'oldest').filter((i) => i.year !== null).map((i) => i.year);
  assert.deepEqual(oldest, [...oldest].sort((a, b) => a - b));
  const titles = sortItems(items, 'title').map((i) => i.title);
  assert.deepEqual(titles, [...titles].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
  const sel = sortItems(items, 'selected');
  const firstUnselected = sel.findIndex((i) => !i.selected);
  assert.ok(sel.slice(firstUnselected).every((i) => !i.selected), 'selected items come first');
});

test('facets: the year histogram includes empty years; type counts ignore the type filter', () => {
  const years = items.map((i) => i.year).filter((y) => y !== null);
  const min = Math.min(...years);
  const max = Math.max(...years);
  const h = yearHistogram(items, state({ from: 2026, to: 2026 }), min, max);
  assert.equal(h.length, max - min + 1);
  assert.equal(h.reduce((a, b) => a + b.count, 0), items.filter((i) => i.year !== null).length, 'year range must not shrink its own histogram');
  assert.ok(h.some((b) => b.count === 0), 'expected at least one empty year');
  const t = typeCounts(items, state({ types: ['book'] }));
  assert.ok(Object.keys(t).length > 1, 'type counts should ignore the type filter');
});
