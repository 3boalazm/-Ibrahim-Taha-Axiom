#!/usr/bin/env node
/**
 * Content inventory derived from the approved data — the single source for the counts
 * quoted in README.md, site/README.md and docs/. Run: npm run inventory [-- --json]
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src', 'data');
const json = (p) => JSON.parse(readFileSync(join(DATA, p), 'utf8'));

const bib = readFileSync(join(DATA, 'approved', 'publications.bib'), 'utf8');
const entries = [...bib.matchAll(/@(\w+)\s*\{\s*([^,\s]+)\s*,/g)].map((m) => ({ type: m[1].toLowerCase(), key: m[2] }));
const byType = entries.reduce((acc, e) => ((acc[e.type] = (acc[e.type] ?? 0) + 1), acc), {});
const manifest = json('approved/public-content.manifest.json');
const profile = json('approved/profile.json');
const areas = json('approved/research-areas.json');
const projects = json('approved/projects.json');
const courses = json('approved/courses.json');
const talks = json('approved/talks.json');
const methods = json('approved/methods.json');
const datasets = json('approved/datasets.json');
const metrics = json('approved/research-metrics.json');
const drafts = json('translations/ar.json');
const issues = json('review/open-issues.json');
const issueList = issues.issues ?? issues;
const rels = manifest.relationships;
const kindPair = rels.reduce((acc, r) => {
  const k = `${r.from.split(':')[0]} → ${r.to.split(':')[0]}`;
  acc[k] = (acc[k] ?? 0) + 1;
  return acc;
}, {});
const hasAr = (v) => v && typeof v === 'object' && typeof v.ar === 'string' && v.ar.trim().length > 0;

let pages = null;
const dist = join(ROOT, 'dist');
if (existsSync(dist)) {
  pages = 0;
  const walk = (d) => readdirSync(d).forEach((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith('.html') && pages++));
  walk(dist);
}

const inv = {
  generated: new Date().toISOString().slice(0, 10),
  publications: { total: entries.length, byType, selected: (manifest.publications.selectedKeys ?? []).length || null },
  researchAreas: { total: areas.length, approvedArabicTitles: areas.filter((a) => hasAr(a.title)).length, approvedArabicSummaries: areas.filter((a) => hasAr(a.summary)).length },
  projects: projects.length,
  courses: courses.length,
  talks: talks.length,
  methods: methods.length,
  datasets: datasets.length,
  relationships: { total: rels.length, byKind: kindPair },
  profile: { identifiers: profile.identifiers?.length ?? 0, affiliations: profile.affiliations?.length ?? 0, education: profile.education?.length ?? 0 },
  metrics: { retrieved: metrics.retrieved ?? metrics.openalex?.retrieved ?? null, sources: Object.keys(metrics).filter((k) => typeof metrics[k] === 'object') },
  arabicDrafts: { total: drafts.entries.length, reviewed: drafts.entries.filter((e) => e.status === 'reviewed').length },
  openIssues: { total: issueList.length, open: issueList.filter((i) => i.status !== 'resolved').length },
  approval: { status: manifest.researcherApproval.status, date: manifest.researcherApproval.date },
  builtHtmlFiles: pages,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(inv, null, 2));
} else {
  const typeList = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${n} ${t}`)
    .join(', ');
  const rows = [
    ['Bibliography entries', `${inv.publications.total} (${typeList})`],
    ['Research areas', `${inv.researchAreas.total} (approved Arabic: ${inv.researchAreas.approvedArabicTitles} titles, ${inv.researchAreas.approvedArabicSummaries} summaries; the rest show labelled drafts)`],
    ['Projects', inv.projects],
    ['Courses (teaching)', inv.courses],
    ['Talks', inv.talks],
    ['Methods', inv.methods],
    ['Datasets', inv.datasets],
    ['Verified relationships', `${inv.relationships.total} (${Object.entries(kindPair).map(([k, n]) => `${n} ${k}`).join(', ')})`],
    ['Arabic drafts', `${inv.arabicDrafts.total} (${inv.arabicDrafts.reviewed} reviewed)`],
    ['Open data-quality issues', `${inv.openIssues.open} of ${inv.openIssues.total}`],
    ['Researcher approval', `${inv.approval.status}, ${inv.approval.date}`],
    ['Built HTML files', pages === null ? '(run npm run build)' : `${pages} (EN + AR pages and 404)`],
  ];
  console.log('| Item | Count |\n| --- | --- |');
  for (const [k, v] of rows) console.log(`| ${k} | ${v} |`);
}
