/**
 * Publications: parsed at build time from the APPROVED BibTeX file with a real
 * BibTeX parser (@retorquere/bibtex-parser), then gated by the manifest.
 *
 * - Titles, names, author order and DOIs are preserved exactly
 *   (sentence-casing is disabled).
 * - Entries not listed in manifest.publications.approvedKeys are never exposed.
 * - Internal website fields never reach the citation exports.
 */
import { parse, parseVerbatim } from '@retorquere/bibtex-parser';
import bibRaw from '../data/approved/publications.bib?raw';
import { manifest, profile } from './content';
import type { Lang } from './schema';

export const INTERNAL_FIELDS = new Set([
  'selected', 'abbr', 'abstract', 'pdf', 'code', 'slides', 'poster', 'video', 'supp', 'website', 'arxiv', 'award',
  'preview', 'additional_info', 'annotation', 'bibtex_show', 'html', 'altmetric', 'dimensions', 'google_scholar_id',
  'inspirehep_id', 'hal', 'pmid', 'eprint', 'blog', 'award_name',
]);

export type PubType = 'journal-article' | 'conference-paper' | 'book' | 'book-chapter' | 'thesis' | 'report' | 'preprint' | 'other';
export const PUB_TYPES: PubType[] = ['journal-article', 'conference-paper', 'book', 'book-chapter', 'thesis', 'report', 'preprint', 'other'];

export interface Author {
  first: string;
  last: string;
  display: string;
  isResearcher: boolean;
}
export interface Publication {
  key: string;
  bibtexType: string;
  type: PubType;
  title: string;
  titleLang: Lang | null;
  authors: Author[];
  year: number | null;
  month: string | null;
  venue: string | null;
  venueLang: Lang | null;
  volume: string | null;
  number: string | null;
  pages: string | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  abstract: string | null;
  keywords: string[];
  links: { kind: 'pdf' | 'code' | 'slides' | 'poster' | 'video' | 'supp' | 'website' | 'arxiv'; href: string }[];
  abbr: string | null;
  award: string | null;
  selected: boolean;
  citation: {
    bibtex: string;
    ris: string;
    /** Plain text for copying (no invisible bidi control characters). */
    text: string;
    /** Same citation split into parts so the page can isolate mixed-direction runs. */
    parts: { lead: string; title: string; venue: string | null; details: string; link: string | null };
  };
}

const ARABIC = /[؀-ۿ]/;
const langOf = (s: string | null | undefined): Lang | null => (!s ? null : ARABIC.test(s) ? 'ar' : 'en');
const LANGID: Record<string, Lang> = { english: 'en', american: 'en', british: 'en', en: 'en', arabic: 'ar', ar: 'ar' };

function typeOf(bibType: string, f: Record<string, unknown>): PubType {
  const t = bibType.toLowerCase();
  if (t === 'article') return 'journal-article';
  if (t === 'inproceedings' || t === 'conference' || t === 'proceedings') return 'conference-paper';
  if (t === 'book') return 'book';
  if (t === 'incollection' || t === 'inbook') return 'book-chapter';
  if (t === 'phdthesis' || t === 'mastersthesis' || t === 'thesis') return 'thesis';
  if (t === 'techreport' || t === 'report') return 'report';
  const hp = String(f.howpublished ?? f.note ?? '').toLowerCase();
  if (/preprint|arxiv|research square|ssrn/.test(hp) || f.eprint) return 'preprint';
  return 'other';
}

function str(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) return v.map(String).join(' and ');
  const s = String(v).trim();
  return s.length ? s : null;
}

function normDoi(raw: string | null, key: string): string | null {
  if (!raw) return null;
  const d = raw.trim().replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:)/i, '').toLowerCase();
  if (!/^10\.\d{4,9}\/\S+$/.test(d)) throw new Error(`[publications] ${key}: invalid DOI "${raw}"`);
  return d;
}

function safeHref(v: string | null, key: string, field: string): string | null {
  if (!v) return null;
  if (/^https?:\/\//.test(v) || v.startsWith('/')) return v;
  throw new Error(`[publications] ${key}: field "${field}" must be an http(s) URL or a site path`);
}

// ------------------------------------------------------------ citations
function escapeBib(v: string): string {
  return v.replace(/(?<!\\)([&%#_$])/g, '\\$1');
}

function initials(first: string): string {
  if (ARABIC.test(first)) return first;
  return first
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.split('-').map((p) => (p.endsWith('.') && p.length <= 3 ? p : `${p[0]}.`)).join('-'))
    .join(' ');
}

function apaAuthors(authors: Author[]): string {
  const names = authors.map((a) => (ARABIC.test(a.display) || !a.first ? a.display : `${a.last}, ${initials(a.first)}`));
  if (names.length <= 1) return names.join('');
  if (names.length === 2) return `${names[0]}, & ${names[1]}`;
  if (names.length <= 20) return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
  return `${names.slice(0, 19).join(', ')}, … ${names[names.length - 1]}`;
}

function citationParts(p: Omit<Publication, 'citation'>): Publication['citation']['parts'] {
  const venue = p.venue ?? p.publisher;
  let details = '';
  if (p.venue) {
    if (p.volume) details += `, ${p.volume}${p.number ? `(${p.number})` : ''}`;
    if (p.pages) details += `, ${p.pages}`;
  }
  return {
    lead: `${apaAuthors(p.authors)} (${p.year ?? 'n.d.'}).`,
    title: `${p.title.replace(/[.?!]$/, '')}${/[?!]$/.test(p.title) ? '' : '.'}`,
    venue: venue ?? null,
    details: venue ? `${details}.` : '',
    link: p.doi ? `https://doi.org/${p.doi}` : p.url,
  };
}

function citationText(c: Publication['citation']['parts']): string {
  return [c.lead, c.title, c.venue ? `${c.venue}${c.details}` : '', c.link ?? ''].filter(Boolean).join(' ');
}

function risType(t: PubType): string {
  return { 'journal-article': 'JOUR', 'conference-paper': 'CPAPER', book: 'BOOK', 'book-chapter': 'CHAP', thesis: 'THES', report: 'RPRT', preprint: 'GEN', other: 'GEN' }[t];
}

function ris(p: Omit<Publication, 'citation'>): string {
  const L: string[] = [`TY  - ${risType(p.type)}`];
  for (const a of p.authors) L.push(`AU  - ${a.first ? `${a.last}, ${a.first}` : a.last}`);
  L.push(`TI  - ${p.title}`);
  if (p.venue) L.push(`${p.type === 'journal-article' ? 'JO' : 'T2'}  - ${p.venue}`);
  if (p.year) L.push(`PY  - ${p.year}`);
  if (p.volume) L.push(`VL  - ${p.volume}`);
  if (p.number) L.push(`IS  - ${p.number}`);
  if (p.pages) {
    const [sp, ep] = p.pages.split(/[–-]+/);
    L.push(`SP  - ${sp}`);
    if (ep) L.push(`EP  - ${ep}`);
  }
  if (p.publisher) L.push(`PB  - ${p.publisher}`);
  if (p.doi) L.push(`DO  - ${p.doi}`);
  if (p.doi || p.url) L.push(`UR  - ${p.doi ? `https://doi.org/${p.doi}` : p.url}`);
  if (p.abstract) L.push(`AB  - ${p.abstract}`);
  for (const k of p.keywords) L.push(`KW  - ${k}`);
  if (p.titleLang) L.push(`LA  - ${p.titleLang === 'ar' ? 'Arabic' : 'English'}`);
  L.push('ER  - ');
  return L.join('\n');
}

// ---------------------------------------------------------------- parsing
const parsed = parse(bibRaw, { sentenceCase: false, english: false });
if (parsed.errors.length) {
  throw new Error(`[publications] approved BibTeX has parse errors:\n${parsed.errors.map((e) => `  - ${e.error}`).join('\n')}`);
}
const verbatim = new Map(parseVerbatim(bibRaw).entries.map((e) => [e.key, e]));

const approved = new Set(manifest.publications.approvedKeys);
const selected = new Set(manifest.publications.selectedKeys);
const presentKeys = new Set(parsed.entries.map((e) => e.key));
const missing = [...approved].filter((k) => !presentKeys.has(k));
if (missing.length) {
  throw new Error(`[publications] manifest approves keys that are not in approved/publications.bib: ${missing.join(', ')}`);
}

function isResearcher(first: string, last: string): boolean {
  return profile.authorMatch.some((m) => m.last.toLowerCase() === last.toLowerCase() && first.trim().toUpperCase().startsWith(m.firstInitial.toUpperCase()));
}

function build(entry: (typeof parsed.entries)[number]): Publication {
  const f = entry.fields as Record<string, unknown>;
  const key = entry.key;
  const creators = (f.author as { firstName?: string; lastName?: string; name?: string }[] | undefined) ?? [];
  const authors: Author[] = creators.map((c) => {
    const first = c.firstName ?? '';
    const last = c.lastName ?? c.name ?? '';
    return { first, last, display: [first, last].filter(Boolean).join(' '), isResearcher: isResearcher(first, last) };
  });
  const title = str(f.title);
  if (!title) throw new Error(`[publications] ${key}: missing title`);
  const venue = str(f.journal) ?? str(f.booktitle) ?? str(f.school) ?? str(f.institution) ?? str(f.howpublished);
  const langid = str(f.langid)?.toLowerCase() ?? null;
  const yearStr = str(f.year);
  const links: Publication['links'] = [];
  for (const kind of ['pdf', 'code', 'slides', 'poster', 'video', 'supp', 'website'] as const) {
    const href = safeHref(str(f[kind]), key, kind);
    if (href) links.push({ kind, href });
  }
  const arxiv = str(f.arxiv);
  if (arxiv) links.push({ kind: 'arxiv', href: `https://arxiv.org/abs/${arxiv}` });
  const kw = f.keywords;
  const base: Omit<Publication, 'citation'> = {
    key,
    bibtexType: entry.type,
    type: typeOf(entry.type, f),
    title,
    titleLang: (langid && LANGID[langid]) || langOf(title),
    authors,
    year: yearStr && /^\d{4}$/.test(yearStr) ? Number(yearStr) : null,
    month: str(f.month),
    venue,
    venueLang: langOf(venue),
    volume: str(f.volume),
    number: str(f.number) ?? str(f.issue),
    pages: str(f.pages),
    publisher: str(f.publisher),
    doi: normDoi(str(f.doi), key),
    url: safeHref(str(f.url), key, 'url'),
    abstract: str(f.abstract),
    keywords: Array.isArray(kw) ? kw.map(String) : kw ? String(kw).split(/\s*[,;]\s*/).filter(Boolean) : [],
    links,
    abbr: str(f.abbr),
    award: str(f.award),
    selected: selected.has(key),
  };
  // Citation BibTeX: original raw field values, original order, internal fields removed.
  const v = verbatim.get(key);
  const fields = Object.entries((v?.fields ?? {}) as Record<string, string>).filter(([name]) => !INTERNAL_FIELDS.has(name.toLowerCase()));
  const width = Math.max(0, ...fields.map(([n]) => n.length));
  const bibtex = `@${entry.type}{${key},\n${fields.map(([n, val]) => `  ${n.padEnd(width)} = {${escapeBib(String(val))}}`).join(',\n')}\n}`;
  const parts = citationParts(base);
  return { ...base, citation: { bibtex, ris: ris(base), text: citationText(parts), parts } };
}

export const publications: Publication[] = parsed.entries
  .filter((e) => approved.has(e.key))
  .map(build)
  .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));

export const books = publications.filter((p) => p.type === 'book' || p.type === 'book-chapter');
export const selectedPublications = publications.filter((p) => p.selected);

export function groupByYear(list: Publication[]): { year: number | null; items: Publication[] }[] {
  const map = new Map<number | null, Publication[]>();
  for (const p of list) map.set(p.year, [...(map.get(p.year) ?? []), p]);
  return [...map.entries()].sort((a, b) => (b[0] ?? -1) - (a[0] ?? -1)).map(([year, items]) => ({ year, items }));
}

export function getPublication(key: string): Publication | undefined {
  return publications.find((p) => p.key === key);
}
