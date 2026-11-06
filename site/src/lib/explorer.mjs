/**
 * Publication explorer logic: URL state, filtering, sorting and the year
 * histogram. Pure functions over plain item objects, shared by the explorer
 * island (browser) and the tests (node --test). No dependencies.
 *
 * Item shape (built at compile time from the approved BibTeX):
 *   { key, year, type, selected, title, authors: string[], areas: string[], words: string[] }
 * where `words` are normalised tokens of title, authors, venue, keywords,
 * year and DOI, and `authors` are co-author keys (see coauthorKey).
 */
import { queryTokens, synonyms } from './text.mjs';

export const SORTS = ['newest', 'oldest', 'title', 'selected'];
export const VIEWS = ['list', 'compact', 'cards'];
export const DEFAULT_STATE = Object.freeze({ q: '', types: [], from: null, to: null, sel: false, author: '', area: '', sort: 'newest', view: 'list' });

/**
 * Co-author identity key: last name + exact initials, so "Abonazel, M. R."
 * and "Mohamed R. Abonazel" match, while different initials such as "E. A."
 * and "E. H. A." stay distinct: nothing is merged by guess. When two forms are
 * one person, the bibliography is corrected instead (DQ-11: "Rady, E. A.").
 */
export function coauthorKey(first, last) {
  const initials = String(first ?? '')
    .split(/[\s.\-]+/)
    .filter(Boolean)
    .map((p) => p[0].toLowerCase())
    .join('');
  return `${String(last ?? '').trim().toLowerCase()}|${initials}`;
}

const intOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

/** Read state from a query string (unknown or invalid values fall back to defaults). */
export function parseState(search, known = {}) {
  const p = new URLSearchParams(search);
  const types = (p.get('type') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && (!known.types || known.types.includes(s)));
  let from = intOrNull(p.get('from'));
  let to = intOrNull(p.get('to'));
  if (from !== null && to !== null && from > to) [from, to] = [to, from];
  const author = p.get('author') ?? '';
  const area = p.get('area') ?? '';
  const sort = p.get('sort') ?? '';
  const view = p.get('view') ?? '';
  return {
    q: (p.get('q') ?? '').slice(0, 200),
    types,
    from,
    to,
    sel: p.get('sel') === '1',
    author: !known.authors || known.authors.includes(author) ? author : '',
    area: !known.areas || known.areas.includes(area) ? area : '',
    sort: SORTS.includes(sort) ? sort : DEFAULT_STATE.sort,
    view: VIEWS.includes(view) ? view : DEFAULT_STATE.view,
  };
}

/** Write state to a query string, omitting defaults (stable parameter order). */
export function serializeState(s) {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set('q', s.q.trim());
  if (s.types.length) p.set('type', s.types.join(','));
  if (s.from !== null) p.set('from', String(s.from));
  if (s.to !== null) p.set('to', String(s.to));
  if (s.sel) p.set('sel', '1');
  if (s.author) p.set('author', s.author);
  if (s.area) p.set('area', s.area);
  if (s.sort !== DEFAULT_STATE.sort) p.set('sort', s.sort);
  if (s.view !== DEFAULT_STATE.view) p.set('view', s.view);
  const out = p.toString();
  return out ? `?${out}` : '';
}

export function matchesQuery(words, tokens) {
  return tokens.every((t) => {
    const alts = synonyms(t);
    return words.some((w) => w === t || (t.length >= 2 && w.startsWith(t)) || alts.includes(w));
  });
}

/** Apply every filter; `skip` names one filter to ignore (for facet counts). */
export function filterItems(items, s, skip = '') {
  const tokens = s.q.trim() ? queryTokens(s.q) : [];
  return items.filter((it) => {
    if (skip !== 'type' && s.types.length && !s.types.includes(it.type)) return false;
    if (skip !== 'year' && (s.from !== null || s.to !== null)) {
      if (it.year === null) return false;
      if (s.from !== null && it.year < s.from) return false;
      if (s.to !== null && it.year > s.to) return false;
    }
    if (s.sel && !it.selected) return false;
    if (s.author && !it.authors.includes(s.author)) return false;
    if (s.area && !it.areas.includes(s.area)) return false;
    if (tokens.length && !matchesQuery(it.words, tokens)) return false;
    return true;
  });
}

export function sortItems(items, sort) {
  const byNewest = (a, b) => (b.year ?? -1) - (a.year ?? -1) || a.title.localeCompare(b.title, 'en');
  const list = [...items];
  if (sort === 'oldest') list.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title, 'en'));
  else if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));
  else if (sort === 'selected') list.sort((a, b) => Number(b.selected) - Number(a.selected) || byNewest(a, b));
  else list.sort(byNewest);
  return list;
}

/**
 * Counts per year from minYear to maxYear INCLUDING empty years, under every
 * filter except the year range (so the bars show where the other filters land).
 */
export function yearHistogram(items, s, minYear, maxYear) {
  const pool = filterItems(items, s, 'year');
  const out = [];
  for (let y = minYear; y <= maxYear; y++) out.push({ year: y, count: pool.filter((it) => it.year === y).length });
  return out;
}

/** Counts per type under every filter except the type filter. */
export function typeCounts(items, s) {
  const pool = filterItems(items, s, 'type');
  const counts = {};
  for (const it of pool) counts[it.type] = (counts[it.type] ?? 0) + 1;
  return counts;
}
