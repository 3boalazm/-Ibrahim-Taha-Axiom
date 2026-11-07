/**
 * Web app manifests, one per language (site/README.md#install-as-an-app).
 *
 * Each language installs as its own app: the English one starts at "/", the Arabic one
 * at "/ar/", reads right to left and names its shortcuts in Arabic. Both share scope "/",
 * so switching language inside an installed app stays in the app. The English id stays
 * "/", the start URL the earlier single manifest had, so existing installs keep their
 * identity.
 *
 * Names, descriptions and shortcut labels come from the site itself (launch.json, the
 * home page copy, the navigation labels), so the manifests cannot say anything the pages
 * do not.
 */
import { SECTION_PATHS, SITE_NAME, pageCopy, type PageKey } from '../config/site';
import { t } from '../i18n/ui';
import { localePath } from './paths';
import type { Lang } from './schema';

/** The pine field of the icons; the splash screen and the task switcher use it. */
export const APP_FIELD = '#101e19';
const SHORTCUTS: PageKey[] = ['publications', 'research', 'lab', 'contact'];

export async function appManifest(lang: Lang) {
  const ui = t(lang);
  const start = localePath(lang, '/');
  const home = await pageCopy('home', lang);
  const shortcuts = await Promise.all(
    SHORTCUTS.map(async (key) => ({
      name: (await pageCopy(key, lang)).navLabel,
      url: localePath(lang, SECTION_PATHS[key]),
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    })),
  );
  return {
    id: start,
    name: SITE_NAME,
    short_name: ui.appShortName,
    description: home.description,
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    start_url: start,
    scope: '/',
    display: 'standalone',
    background_color: APP_FIELD,
    theme_color: APP_FIELD,
    categories: ['education'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // same artwork inside the safe zone, for Android's masks (scripts/maskable-icons.py)
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts,
  };
}

export const manifestResponse = async (lang: Lang) =>
  new Response(JSON.stringify(await appManifest(lang), null, 2) + '\n', {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
