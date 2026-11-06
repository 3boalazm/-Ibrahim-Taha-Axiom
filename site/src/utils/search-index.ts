/**
 * Builds the static search index for one language (served as
 * /search-index/{lang}.json and loaded by the search dialog on first use).
 *
 * Only approved content goes in: publications, books, research areas,
 * projects, methods, courses, talks and section pages. No abstracts (to keep
 * the file small) and no private data. Both languages' text is indexed so
 * mixed-language queries work; the visible title follows the page language
 * (approved Arabic → labelled draft → original English).
 */
import { SECTION_ORDER, SECTION_PATHS, pageCopy, sectionCount } from '../config/site';
import { courses, methods, pick, projects, researchAreas, talks, arDraft } from './content';
import { publications, type Publication } from './publications';
import { publicationsOfArea, publicationsOfProject, linked } from './relations';
import { localePath } from './paths';
import { t } from '../i18n/ui';
import type { Lang, LocalizedText } from './schema';

export interface SearchRecord {
  id: string;
  cat: 'publications' | 'books' | 'areas' | 'projects' | 'methods' | 'teaching' | 'talks' | 'pages';
  title: string;
  /** Language of the visible title when it differs from the page language. */
  tl?: Lang;
  meta: string;
  url: string;
  year?: number;
  selected?: boolean;
  draft?: boolean;
  /** Searchable text by field: t title · a authors · y year · d DOI · k keywords · v venue · x other. */
  f: Partial<Record<'t' | 'a' | 'y' | 'd' | 'k' | 'v' | 'x', string>>;
}

const both = (v: LocalizedText | null | undefined) => [v?.en, v?.ar ?? arDraft(v?.en)?.text].filter(Boolean).join(' ');
const shown = (v: LocalizedText, lang: Lang) => {
  const r = pick(v, lang);
  return { title: r?.text ?? '', tl: r && r.lang !== lang ? r.lang : undefined, draft: r?.draft || undefined };
};

function pubRecord(p: Publication, lang: Lang, isBook: boolean): SearchRecord {
  const ui = t(lang);
  const type = ui.types[p.type];
  return {
    id: `publication:${p.key}`,
    cat: isBook ? 'books' : 'publications',
    title: p.title,
    tl: p.titleLang && p.titleLang !== lang ? p.titleLang : undefined,
    meta: [type, p.venue, p.year].filter(Boolean).join(' · '),
    url: localePath(lang, `/publications/${p.key}/`),
    year: p.year ?? undefined,
    selected: p.selected || undefined,
    f: {
      t: p.title,
      a: p.authors.map((a) => `${a.first} ${a.last}`).join(' ; '),
      y: p.year ? String(p.year) : undefined,
      d: p.doi ?? undefined,
      k: p.keywords.join(' ; '),
      v: [p.venue, p.publisher].filter(Boolean).join(' ; '),
      x: `${t('en').types[p.type]} ${t('ar').types[p.type]}`,
    },
  };
}

export async function buildSearchIndex(lang: Lang): Promise<SearchRecord[]> {
  const ar = lang === 'ar';
  const ui = t(lang);
  const records: SearchRecord[] = [];
  const count = ui.results;

  for (const p of publications) records.push(pubRecord(p, lang, p.type === 'book' || p.type === 'book-chapter'));

  for (const a of researchAreas) {
    const s = shown(a.title, lang);
    const n = publicationsOfArea(a.id).length;
    records.push({
      id: `area:${a.id}`,
      cat: 'areas',
      ...s,
      meta: [ui.graphKinds.area, n ? count(n) : null].filter(Boolean).join(' · '),
      url: `${localePath(lang, '/research/')}#${a.id}`,
      f: { t: both(a.title), x: both(a.summary) },
    });
  }
  for (const pr of projects) {
    const s = shown(pr.title, lang);
    const n = publicationsOfProject(pr.id).length;
    records.push({
      id: `project:${pr.id}`,
      cat: 'projects',
      ...s,
      meta: [ui.graphKinds.project, pr.period, n ? count(n) : null].filter(Boolean).join(' · '),
      url: `${localePath(lang, '/projects/')}#${pr.id}`,
      f: { t: both(pr.title), x: both(pr.summary) },
    });
  }
  for (const m of methods) {
    const s = shown(m.title, lang);
    const n = linked({ kind: 'method', id: m.id }, 'publication').length;
    records.push({
      id: `method:${m.id}`,
      cat: 'methods',
      ...s,
      meta: [ui.graphKinds.method, n ? count(n) : null].filter(Boolean).join(' · '),
      url: `${localePath(lang, '/research/')}?focus=method:${m.id}#knowledge-graph`,
      f: { t: both(m.title), x: both(m.summary) },
    });
  }
  for (const c of courses) {
    const s = shown(c.title, lang);
    const level = c.level ? pick(c.level, lang)?.text : null;
    records.push({
      id: `course:${c.id}`,
      cat: 'teaching',
      ...s,
      meta: [ui.graphKinds.course, level, c.term].filter(Boolean).join(' · '),
      url: `${localePath(lang, '/teaching/')}#${c.id}`,
      f: { t: both(c.title), x: [both(c.summary), both(c.institution), both(c.level)].join(' ') },
    });
  }
  for (const tk of talks) {
    const s = shown(tk.title, lang);
    const event = pick(tk.event, lang)?.text;
    records.push({
      id: `talk:${tk.id}`,
      cat: 'talks',
      ...s,
      meta: [event, tk.date.slice(0, 4)].filter(Boolean).join(' · '),
      url: `${localePath(lang, '/talks/')}#${tk.id}`,
      year: Number(tk.date.slice(0, 4)) || undefined,
      f: { t: both(tk.title), y: tk.date.slice(0, 4), v: both(tk.event), x: both(tk.summary) },
    });
  }
  for (const key of ['home', ...SECTION_ORDER] as const) {
    if (key !== 'home' && key !== 'contact' && key !== 'lab' && (sectionCount(key) ?? 0) === 0) continue;
    const [en, arc] = await Promise.all([pageCopy(key, 'en'), pageCopy(key, 'ar')]);
    const here = ar ? arc : en;
    records.push({
      id: `page:${key}`,
      cat: 'pages',
      title: key === 'home' ? ui.home : here.navLabel,
      meta: here.description,
      url: localePath(lang, SECTION_PATHS[key]),
      f: { t: [en.navLabel, arc.navLabel, en.title, arc.title, key === 'home' ? `${t('en').home} ${t('ar').home}` : ''].join(' '), x: [en.description, arc.description].join(' ') },
    });
  }
  return records;
}
