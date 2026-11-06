// Shared helpers for the node:test suites. The suites read the built site in dist/
// (run `npm run build` first) and the plain-JS libraries in src/lib/.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DIST = join(ROOT, 'dist');
export const DATA = join(ROOT, 'src', 'data');
export const ORIGIN = 'https://ibrahim-taha-axiom.vercel.app';

export function requireBuild() {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('dist/ is missing: run `npm run build` before `npm test`.');
  }
}

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const data = (name) => readJson(join(DATA, name));

/** HTML of a built route such as '/ar/publications/'. */
export function page(route) {
  requireBuild();
  return readFileSync(join(DIST, route, 'index.html'), 'utf8');
}

/** Every built HTML route ('/', '/ar/', '/publications/x/' …), excluding the 404 page. */
export function routes() {
  requireBuild();
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === 'index.html') out.push('/' + relative(DIST, dir).split('\\').join('/') + (dir === DIST ? '' : '/'));
    }
  };
  walk(DIST);
  return out.map((r) => r.replace(/^\/\/?$/, '/').replace(/^\/\//, '/')).sort();
}

/** Text content of the first element matching a simple regex on the raw HTML. */
export const first = (html, re) => html.match(re)?.[1] ?? null;
export const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

/** The JSON inside <script type="application/json" ATTR>…</script>. */
export function jsonScript(html, attr) {
  const m = html.match(new RegExp(`<script type="application/json"[^>]*${attr}[^>]*>([\\s\\S]*?)</script>`));
  if (!m) throw new Error(`no JSON script with ${attr}`);
  return JSON.parse(m[1]);
}

/** Approved publication keys from the bib file (entry keys after "@type{"). */
export function bibKeys() {
  const bib = readFileSync(join(DATA, 'approved', 'publications.bib'), 'utf8');
  return [...bib.matchAll(/@(\w+)\s*\{\s*([^,\s]+)\s*,/g)].map((m) => ({ type: m[1].toLowerCase(), key: m[2] }));
}
