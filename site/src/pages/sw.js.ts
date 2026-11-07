import type { APIRoute } from 'astro';
import source from '../pwa/sw.js?raw';
import { SITE_NAME } from '../config/site';
import { ui } from '../i18n/ui';
import type { Lang } from '../utils/schema';

/** Interface strings the offline page needs, in both languages. */
const KEYS = ['offlineTitle', 'offlineBody', 'offlineRetry', 'offlineSaved', 'offlineNone', 'home'] as const;
const PLACEHOLDER = '/*__STRINGS__*/ {}';
const pick = (lang: Lang) => Object.fromEntries(KEYS.map((key) => [key, ui[lang][key]]));

/**
 * /sw.js, step 1 of 2: the service worker (src/pwa/sw.js) with its interface strings.
 * Step 2, scripts/service-worker.mjs, runs when the build is done and adds the precache
 * list, the brand mark and VERSION. The worker is registered only in production builds.
 */
export const GET: APIRoute = () => {
  if (!source.includes(PLACEHOLDER)) throw new Error('src/pwa/sw.js: the strings placeholder is missing');
  const strings = { site: SITE_NAME, en: pick('en'), ar: pick('ar') };
  // a function replacement keeps any "$" in the strings literal
  return new Response(source.replace(PLACEHOLDER, () => JSON.stringify(strings)), {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
};
