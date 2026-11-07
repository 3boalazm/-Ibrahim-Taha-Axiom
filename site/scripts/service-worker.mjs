/**
 * Step 2 of 2 for dist/sw.js, run by the `axiom-service-worker` integration in
 * astro.config.mjs once `astro build` is done (step 1 is src/pages/sw.js.ts).
 *
 * It fills in what exists only once the build is complete:
 *   PRECACHE  both home pages plus every stylesheet and script in dist/_astro, so a
 *             home page opened offline is styled and its menu works
 *   MARK      the brand mark (dist/images/mark.svg), for the offline page
 *   VERSION   a hash of the worker and of every precached file
 * A deploy that changes any of these changes sw.js byte for byte, which is how browsers
 * notice an update. tests/app.test.mjs recomputes VERSION with versionOf().
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const PLACEHOLDERS = { list: '/*__PRECACHE__*/ []', mark: "/*__MARK__*/ ''", version: "'__VERSION__'" };
const START_PAGES = ['/', '/ar/'];

/** The dist file behind a site URL ("/ar/" → dist/ar/index.html). */
export const fileFor = (dist, url) => join(dist, url.endsWith('/') ? `${url}index.html` : url);

export function precacheList(dist) {
  const built = readdirSync(join(dist, '_astro'))
    .filter((name) => /\.(?:css|js)$/.test(name))
    .sort();
  return [...START_PAGES, ...built.map((name) => `/_astro/${name}`)];
}

/** A decorative copy of the mark for the offline page: no title, hidden from assistive technology. */
export function markFor(dist) {
  return readFileSync(join(dist, 'images', 'mark.svg'), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>/g, '')
    .replace(/\s(?:role|aria-labelledby)="[^"]*"/g, '')
    .replace('<svg ', '<svg class="mark" aria-hidden="true" focusable="false" ')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

/** VERSION for a worker source whose VERSION is still the placeholder. */
export function versionOf(dist, source) {
  const hash = createHash('sha256').update(source);
  for (const url of precacheList(dist)) hash.update(`\n${url}\n`).update(readFileSync(fileFor(dist, url)));
  return hash.digest('hex').slice(0, 12);
}

export function finalizeServiceWorker(dist) {
  const path = join(dist, 'sw.js');
  let source = readFileSync(path, 'utf8');
  for (const [name, placeholder] of Object.entries(PLACEHOLDERS)) {
    if (!source.includes(placeholder)) throw new Error(`dist/sw.js: the ${name} placeholder is missing (built twice?)`);
  }
  const list = precacheList(dist);
  const missing = list.filter((url) => !existsSync(fileFor(dist, url)));
  if (missing.length) throw new Error(`dist/sw.js: precached files missing from the build: ${missing.join(', ')}`);
  // function replacements: a "$" in the inserted text must stay literal
  source = source.replace(PLACEHOLDERS.list, () => JSON.stringify(list)).replace(PLACEHOLDERS.mark, () => JSON.stringify(markFor(dist)));
  const version = versionOf(dist, source);
  source = source.replace(PLACEHOLDERS.version, () => `'${version}'`);
  writeFileSync(path, source);
  return { version, files: list.length };
}
