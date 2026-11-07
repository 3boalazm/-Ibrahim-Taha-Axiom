/**
 * The site assistant's knowledge: a plain-text rendering of the site's approved content,
 * built at build time and served as /chat/knowledge.json. The assistant's server function
 * (api/chat.mjs) reads it and gives it to the model with every question, so the model can
 * only draw facts from what the site itself publishes.
 *
 * Everything here comes through the same content gate as the pages (src/utils/content.ts,
 * publications.ts, metrics.ts): nothing from data-staging, nothing a manifest has not
 * approved, and no profile field outside manifest.profile.approvedFields. Publication titles
 * and abstracts are kept in their original language; they are never translated.
 */
import { SECTION_ORDER, SECTION_PATHS, SITE_NAME, pageCopy, sectionCount } from '../config/site';
import { arDrafts, courses, cv, datasets, launch, methods, openIssues, profile, projects, researchAreas, talks } from './content';
import { publications, books } from './publications';
import { areasOf, methodsOf, projectsOf, publicationsOfTalk } from './relations';
import { metrics } from './metrics';
import { t } from '../i18n/ui';
import type { LocalizedText } from './schema';

const en = (v: LocalizedText | null | undefined) => v?.en ?? v?.ar ?? '';
/** English text, plus the approved Arabic in brackets when there is one. */
const both = (v: LocalizedText | null | undefined) => (v?.en && v?.ar ? `${v.en} [Arabic: ${v.ar}]` : en(v));
const line = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(' | ');
const titleOf = <T extends { id: string; title: LocalizedText }>(list: T[], id: string) => en(list.find((x) => x.id === id)?.title) || id;

export interface ChatKnowledge {
  v: 1;
  site: string;
  chars: number;
  text: string;
}
/** Sections whose count is a number of listed items (the others are single pages). */
const COUNTED = new Set(['research', 'publications', 'projects', 'teaching', 'talks', 'books']);

export async function buildKnowledge(): Promise<ChatKnowledge> {
  const ui = t('en');
  const out: string[] = [];
  const section = (heading: string) => out.push('', `## ${heading}`);

  out.push(
    `SITE: ${SITE_NAME}, the bilingual (English and Arabic) academic website of ${en(profile.name) || 'the researcher'}.`,
    launch.canonicalOrigin ? `Address: ${launch.canonicalOrigin}` : '',
    'Every page also exists in Arabic under /ar/ (for example /ar/publications/).',
  );

  // ------------------------------------------------------------------ profile
  section('PROFILE (page: /about/)');
  out.push(line(`Name: ${en(profile.name)}`, profile.name.ar && `Arabic name as displayed: ${profile.name.ar}`, profile.officialName.ar && `official full Arabic name: ${profile.officialName.ar}`));
  if (en(profile.role)) out.push(`Role: ${en(profile.role)}`);
  if (en(profile.summary)) out.push(`Summary: ${en(profile.summary)}`);
  if (en(profile.biography)) out.push(`Biography: ${en(profile.biography)}`);
  if (profile.affiliations.length) {
    out.push('Affiliations:');
    for (const a of profile.affiliations) {
      out.push(`- ${line(both(a.organization), a.department && en(a.department), a.role && en(a.role), a.note && en(a.note), (a.from || a.to) && `${a.from ?? ''}–${a.to ?? 'present'}`)}`);
    }
  }
  if (profile.education.length) {
    out.push('Education:');
    for (const e of profile.education) out.push(`- ${line(en(e.degree), en(e.institution), e.year && String(e.year), e.status && en(e.status))}`);
  }
  if (profile.interests.length) out.push(`Research interests: ${profile.interests.map(en).join('; ')}`);
  if (profile.identifiers.length) out.push(`Academic profiles: ${profile.identifiers.map((i) => `${i.type} ${i.value} (${i.url})`).join('; ')}`);
  if (profile.community.length) out.push(`Community: ${profile.community.map((c) => `${en(c.label)} (${c.url})`).join('; ')}`);
  if (profile.contact.email || profile.contact.phone) {
    out.push(`Contact (page: /contact/): ${line(profile.contact.email && `email ${profile.contact.email}`, profile.contact.phone && `phone ${profile.contact.phone}`)}`);
  }

  // ---------------------------------------------------------- research areas
  section('RESEARCH AREAS (page: /research/)');
  for (const a of researchAreas) out.push(`- ${line(`[area:${a.id}] ${both(a.title)}`, en(a.summary))}`);

  section('METHODS (shown on /research/ and on publication pages)');
  for (const m of methods) out.push(`- ${line(`[method:${m.id}] ${en(m.title)}`, en(m.summary))}`);

  // ------------------------------------------------------------ publications
  section(`PUBLICATIONS (page: /publications/; ${publications.length} entries, each at /publications/<key>/)`);
  for (const p of publications) {
    const where = [p.venue, p.volume && `vol. ${p.volume}${p.number ? `(${p.number})` : ''}`, p.pages && `pp. ${p.pages}`, p.publisher].filter(Boolean).join(', ');
    out.push(
      `- ${line(
        `[publication:${p.key}] "${p.title}"`,
        ui.types[p.type],
        p.authors.map((a) => `${a.first} ${a.last}`.trim()).join(', '),
        p.year ? String(p.year) : 'year not given',
        where,
        p.doi ? `DOI ${p.doi}` : 'no DOI',
        p.selected && 'selected work',
        `page /publications/${p.key}/`,
      )}`,
    );
    const areas = areasOf(p.key).map((id) => titleOf(researchAreas, id));
    const meths = methodsOf(p.key).map((id) => titleOf(methods, id));
    const projs = projectsOf(p.key).map((id) => titleOf(projects, id));
    if (areas.length || meths.length || projs.length) out.push(`  ${line(areas.length && `Areas: ${areas.join('; ')}`, meths.length && `Methods: ${meths.join('; ')}`, projs.length && `Projects: ${projs.join('; ')}`)}`);
    if (p.keywords.length) out.push(`  Keywords: ${p.keywords.join('; ')}`);
    if (p.abstract) out.push(`  Abstract: ${p.abstract.replace(/\s+/g, ' ').trim()}`);
  }

  section(`BOOKS AND GUIDES (page: /books/; ${books.length} of the publications above)`);
  for (const b of books) out.push(`- [publication:${b.key}] "${b.title}" (${b.year ?? 'year not given'})`);

  // ------------------------------------------------------- conference papers
  section('CONFERENCE PAPERS (page: /talks/, titled "Conference Papers")');
  for (const tk of talks) {
    out.push(`- ${line(`[talk:${tk.id}] "${en(tk.title)}"`, en(tk.event), tk.date, en(tk.summary))}`);
    for (const l of tk.links) out.push(`  Source: ${en(l.label)} (${l.url})`);
    for (const key of publicationsOfTalk(tk.id)) out.push(`  Publication record: /publications/${key}/`);
  }
  out.push('Note: both papers are verified in the conference proceedings. Whether Ibrahim presented either paper orally is not confirmed (open question DQ-13); the site names no presenter.');

  // ---------------------------------------------------------------- projects
  section('PROJECTS (page: /projects/)');
  for (const p of projects) {
    out.push(`- ${line(`[project:${p.id}] ${both(p.title)}`, p.period, p.status && en(p.status), en(p.summary))}`);
    for (const l of p.links) out.push(`  Link: ${en(l.label)} (${l.url})`);
  }

  section('TEACHING (page: /teaching/)');
  for (const c of courses) {
    out.push(`- ${line(`[course:${c.id}] ${both(c.title)}`, c.level && en(c.level), c.term, c.institution && en(c.institution), c.period, en(c.summary))}`);
    for (const m of c.materials) out.push(`  Material: ${en(m.label)} (${m.url})`);
  }

  section('DATASETS');
  for (const d of datasets) out.push(`- ${line(`[dataset:${d.id}] ${en(d.title)}`, en(d.summary), d.doi && `DOI ${d.doi}`, d.url, d.licence && `licence ${d.licence}`)}`);

  // ---------------------------------------------------------------------- CV
  section('CV (page: /cv/)');
  if (cv) {
    for (const s of cv.sections) {
      out.push(`${en(s.heading)}:`);
      for (const i of s.items) out.push(`- ${line(en(i.text), i.period)}`);
    }
    out.push(cv.pdf ? `CV PDF: ${cv.pdf}` : 'CV PDF: not published.');
  } else {
    out.push('No CV is published.');
  }

  // ----------------------------------------------------------------- metrics
  section('RESEARCH METRICS (shown on the home page; each platform separately, never combined or compared)');
  out.push(
    `- ${metrics.sourceLabel} (${metrics.url}), retrieved ${metrics.retrieved}, scope: ${metrics.scope}: works ${metrics.figures.works}, citations ${metrics.figures.citations}, h-index ${metrics.figures.hIndex}, i10-index ${metrics.figures.i10Index}.`,
  );
  for (const s of metrics.secondary) {
    out.push(`- ${s.source} (${s.url}), retrieved ${s.retrieved}: publications ${s.figures.publications}, reads ${s.figures.reads}, citations ${s.figures.citations}.`);
  }
  out.push(`Note: ${metrics.note}`);

  // ------------------------------------------------------------------- pages
  section('SITE PAGES (English paths; Arabic pages add /ar in front)');
  out.push('- Home: /');
  for (const key of SECTION_ORDER) {
    const copy = await pageCopy(key, 'en');
    const n = COUNTED.has(key) ? sectionCount(key) : null;
    out.push(`- ${line(`${copy.title}: ${SECTION_PATHS[key]}`, n !== null && `${n} item${n === 1 ? '' : 's'}`, copy.description)}`);
  }
  const lab = await pageCopy('lab', 'en');
  out.push(
    `About the lab (${SECTION_PATHS.lab}): ${lab.lead ?? lab.description} It is an illustrative controlled experiment with precomputed results, not the published COM-Poisson method.`,
  );
  out.push('Search: every page has a search dialog (Ctrl/⌘ K or /) over publications, books, areas, projects, methods, teaching and pages.');

  // ------------------------------------------------------------------- gaps
  section('KNOWN GAPS AND OPEN QUESTIONS (what the site does not have or has not settled)');
  if (!cv?.pdf) out.push('- No CV PDF is published (the CV page is text only).');
  const noDoi = publications.filter((p) => !p.doi);
  if (noDoi.length) out.push(`- ${noDoi.length} of ${publications.length} publications have no DOI: ${noDoi.map((p) => `"${p.title}"`).join('; ')}.`);
  const noAbstract = publications.filter((p) => !p.abstract);
  if (noAbstract.length) out.push(`- ${noAbstract.length} publications have no abstract on the site.`);
  for (const i of openIssues.issues.filter((x) => x.status === 'open')) out.push(`- Open question ${i.id}: ${i.question} Current state: ${i.current}`);
  const drafts = arDrafts.entries.filter((e) => e.status !== 'reviewed').length;
  out.push(
    drafts
      ? `- Arabic: ${drafts} pieces of Arabic text are AI-assisted drafts not yet reviewed by the researcher, labelled as such on the page; publication titles and abstracts are never translated.`
      : '- Arabic: the Arabic text of the site has been reviewed. Publication titles and abstracts are never translated, and journal and personal names stay in their original form.',
  );
  const sectionTitles = await Promise.all(SECTION_ORDER.map(async (key) => (await pageCopy(key, 'en')).title));
  out.push(`- The site's sections are exactly: ${sectionTitles.join(', ')}. There is no news, events or blog section.`);

  const text = out.filter((l) => l !== '').join('\n').replace(/\n## /g, '\n\n## ');
  // No build date: server/knowledge.mjs is a committed copy, and it should change only when the content does.
  return { v: 1, site: SITE_NAME, chars: text.length, text };
}
