/**
 * Site search: ranking over the static index built by
 * src/pages/search-index/[lang].json.ts. Runs in the browser (search dialog)
 * and in node (tests). No dependencies; every record is scored field by field.
 *
 * A record matches only if EVERY query token matches some field:
 *   exact word 1.0 · word prefix 0.7 (tokens of 2+ characters) · glossary
 *   synonym 0.8 — multiplied by the field weight below.
 * Years and DOI fragments match exactly or by prefix like any other token.
 */
import { queryTokens, synonyms, tokenize } from './text.mjs';

/** Category order in the results, shared with the dialog. */
export const CATEGORIES = ['publications', 'books', 'areas', 'projects', 'methods', 'teaching', 'talks', 'pages'];

/** Field weights: title > DOI > authors > year > keywords > venue > other text. */
export const WEIGHTS = { t: 8, d: 7, a: 6, y: 5, k: 4, v: 3, x: 2 };

/** Pre-tokenise an index once (records carry normalised text per field). */
export function prepare(records) {
  return records.map((r) => ({
    ...r,
    _f: Object.fromEntries(Object.keys(WEIGHTS).map((f) => [f, r.f?.[f] ? tokenize(r.f[f]) : []])),
  }));
}

function tokenScore(words, token) {
  let best = 0;
  const alts = synonyms(token);
  for (const w of words) {
    if (w === token) return 1;
    if (token.length >= 2 && w.startsWith(token)) best = Math.max(best, 0.7);
    else if (alts.includes(w)) best = Math.max(best, 0.8);
  }
  return best;
}

/**
 * Search prepared records.
 * @returns {{ tokens: string[], total: number, groups: { category: string, items: object[] }[] }}
 */
export function search(prepared, query, { perCategory = 6 } = {}) {
  const tokens = queryTokens(query);
  if (!tokens.length) return { tokens, total: 0, groups: [] };
  const hits = [];
  for (const r of prepared) {
    let score = 0;
    let ok = true;
    let titleHits = 0;
    for (const t of tokens) {
      let best = 0;
      for (const [f, w] of Object.entries(WEIGHTS)) {
        const s = tokenScore(r._f[f], t) * w;
        if (s > best) best = s;
        if (f === 't' && s > 0) titleHits++;
      }
      if (best === 0) {
        ok = false;
        break;
      }
      score += best;
    }
    if (!ok) continue;
    if (titleHits === tokens.length) score += 2;
    if (r.selected) score += 0.5;
    hits.push({ r, score });
  }
  hits.sort((a, b) => b.score - a.score || (b.r.year ?? 0) - (a.r.year ?? 0) || a.r.title.localeCompare(b.r.title));
  const groups = [];
  for (const c of CATEGORIES) {
    const items = hits.filter((h) => h.r.cat === c).map((h) => h.r);
    if (items.length) groups.push({ category: c, items: items.slice(0, perCategory), more: Math.max(0, items.length - perCategory) });
  }
  return { tokens, total: hits.length, groups };
}

/** Session-only history helpers (the dialog stores at most `max` queries). */
export function pushHistory(list, query, max = 6) {
  const q = query.trim();
  if (!q) return list;
  return [q, ...list.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, max);
}
