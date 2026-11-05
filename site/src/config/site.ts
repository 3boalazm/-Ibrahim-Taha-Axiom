import { getEntry } from 'astro:content';
import type { PAGE_KEYS } from '../content.config';
import { courses, hasCvContent, hasProfileContent, launch, projects, researchAreas, talks } from '../utils/content';
import { books, publications } from '../utils/publications';
import type { Lang } from '../utils/schema';

export type PageKey = (typeof PAGE_KEYS)[number];

export const SITE_NAME = launch.siteName;

export const SECTION_PATHS: Record<PageKey, string> = {
  home: '/',
  about: '/about/',
  research: '/research/',
  publications: '/publications/',
  projects: '/projects/',
  teaching: '/teaching/',
  talks: '/talks/',
  books: '/books/',
  cv: '/cv/',
  lab: '/lab/',
  contact: '/contact/',
};

/** Editorial order used for the home "contents" and section numbers. */
export const SECTION_ORDER: PageKey[] = ['about', 'research', 'publications', 'projects', 'teaching', 'talks', 'books', 'cv', 'lab', 'contact'];

/** Core sections are always in the navigation (with honest empty states). */
export const PRIMARY: PageKey[] = ['about', 'research', 'publications', 'teaching', 'lab', 'contact'];
/** Secondary sections join the navigation only once they have approved content. */
export const SECONDARY: PageKey[] = ['projects', 'talks', 'books', 'cv'];   // lab joins the primary set above

/** Number of approved items per section; null = not a countable section. */
export function sectionCount(key: PageKey): number | null {
  switch (key) {
    case 'about':
      return hasProfileContent ? 1 : 0;
    case 'research':
      return researchAreas.length;
    case 'publications':
      return publications.length;
    case 'projects':
      return projects.length;
    case 'teaching':
      return courses.length;
    case 'talks':
      return talks.length;
    case 'books':
      return books.length;
    case 'cv':
      return hasCvContent ? 1 : 0;
    case 'lab':
      return 3; // three estimators live in the experiment
    default:
      return null;
  }
}

export const visibleSecondary = SECONDARY.filter((k) => (sectionCount(k) ?? 0) > 0);
export const navKeys: PageKey[] = [...PRIMARY.slice(0, -1), ...visibleSecondary, 'contact'];

export function sectionNumber(key: PageKey): string {
  const i = SECTION_ORDER.indexOf(key);
  return i < 0 ? '' : String(i + 1).padStart(2, '0');
}

export async function pageCopy(page: PageKey, lang: Lang) {
  const entry = await getEntry('pages', `${lang}/${page}`);
  if (!entry) throw new Error(`Missing page copy: src/content/${lang}/${page}.md`);
  return entry.data;
}
