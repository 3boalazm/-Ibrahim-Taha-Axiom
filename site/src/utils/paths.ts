import type { Lang } from './schema';

/** English lives at the root, Arabic under /ar/ (D-03, D-03a). Trailing slashes always. */
export function localePath(lang: Lang, path = '/'): string {
  let p = path.startsWith('/') ? path : `/${path}`;
  if (!p.endsWith('/')) p += '/';
  return lang === 'en' ? p : p === '/' ? '/ar/' : `/ar${p}`;
}

/** Strip the locale prefix from a pathname. */
export function basePath(pathname: string): string {
  const p = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (p === '/ar/') return '/';
  return p.startsWith('/ar/') ? p.slice(3) : p;
}

export function langFromPath(pathname: string): Lang {
  return pathname === '/ar' || pathname.startsWith('/ar/') ? 'ar' : 'en';
}

export const otherLang = (lang: Lang): Lang => (lang === 'en' ? 'ar' : 'en');
export const dirOf = (lang: Lang): 'ltr' | 'rtl' => (lang === 'ar' ? 'rtl' : 'ltr');
