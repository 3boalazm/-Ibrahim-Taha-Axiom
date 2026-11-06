// The researcher's Data Quality Review decisions (2026-11-06), as applied to the data and
// the built site. Each test names the issue in src/data/review/open-issues.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, bibKeys, data, page, routes } from './helpers.mjs';

const profile = data('approved/profile.json');
const projects = data('approved/projects.json');
const manifest = data('approved/public-content.manifest.json');
const drafts = data('translations/ar.json').entries;
const issues = data('review/open-issues.json').issues;
const bib = readFileSync(join(DATA, 'approved', 'publications.bib'), 'utf8');
const approvedText = ['profile.json', 'projects.json', 'research-metrics.json', 'publications.bib']
  .map((f) => readFileSync(join(DATA, 'approved', f), 'utf8'))
  .join('\n');
/** The body of one bib entry, from its key to the next entry. */
const entry = (key) => bib.slice(bib.indexOf(`{${key},`)).split(/\n@/)[0];
const issue = (id) => issues.find((i) => i.id === id);
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const SHORT_AR = 'ابراهيم محمد طه';
const OFFICIAL_AR = 'ابراهيم محمد ابراهيم محمود طه';

test('15 issues are decided and applied; DQ-13 stays open with the answer on record', () => {
  assert.deepEqual(issues.filter((i) => i.status === 'open').map((i) => i.id), ['DQ-13']);
  assert.equal(issue('DQ-13').response.outcome, 'undetermined');
  assert.equal(issues.filter((i) => i.status === 'resolved').length, 15);
  for (const i of issues) assert.match(i.response.source, /Data Quality Review/, `${i.id} cites the review`);
});

test('DQ-01–04: years, volume and author order stay as decided', () => {
  assert.match(entry('abonazel2023beta'), /year\s*=\s*\{2023\}/);
  assert.match(entry('seliem2024note'), /year\s*=\s*\{2024\}/);
  assert.match(entry('abonazel2022two'), /year\s*=\s*\{2022\}/);
  assert.match(entry('abonazel2022two'), /volume\s*=\s*\{7\}/);
  assert.match(entry('elnady2022tam'), /author\s*=\s*\{Elnady, [^}]*Taha, [^}]*Abdella/);
});

test('DQ-05: only Scopus Author ID 57226774796 remains', () => {
  const scopus = profile.identifiers.filter((i) => i.type === 'Scopus');
  assert.deepEqual(scopus.map((i) => i.value), ['57226774796']);
  assert.ok(!approvedText.includes('58577960300'));
});

test('DQ-06: one ResearchGate address, Ibrahim-Taha-5', () => {
  const url = 'https://www.researchgate.net/profile/Ibrahim-Taha-5';
  assert.equal(profile.identifiers.find((i) => i.type === 'ResearchGate').url, url);
  assert.equal(projects.find((p) => p.id === 'statistical-guides').links[0].url, url);
  assert.equal(data('approved/research-metrics.json').secondary.find((s) => s.source === 'ResearchGate').url, url);
  assert.ok(!approvedText.includes('Ibrahim_Taha11'));
});

test('DQ-07: Tanta branch appointment, teaching at the main campus in Maadi', () => {
  const sadat = profile.affiliations.find((a) => /Sadat Academy/.test(a.organization.en));
  assert.match(sadat.note.en, /Tanta branch/);
  assert.match(sadat.note.en, /Maadi/);
  assert.match(sadat.note.ar, /فرع طنطا/);
  assert.match(sadat.note.ar, /المعادي/);
  assert.match(profile.biography.en, /appointed to its Tanta branch and teaching at the main campus in Maadi/);
  const bio = drafts.find((d) => d.ref === 'profile.biography');
  assert.equal(bio.en, profile.biography.en, 'the Arabic draft is keyed to the current English text');
  assert.match(bio.ar, /فرع طنطا/);
  assert.equal(bio.status, 'draft', 'an edited draft is still a draft');
});

test('DQ-09: the GitHub data repository is labelled CC BY 4.0; SVM_New is not shown', () => {
  const link = projects.find((p) => p.id === 'com-poisson-penalized-estimation').links.find((l) => l.url.includes('github.com'));
  assert.equal(link.label.en, 'Data repository (GitHub, CC BY 4.0)');
  const label = drafts.find((d) => d.en === link.label.en);
  assert.ok(label, 'the label has an Arabic draft keyed to the new text');
  assert.equal(label.status, 'draft');
  assert.ok(!approvedText.includes('SVM_New'));
});

test('DQ-10: approved Arabic display name and official full name', () => {
  assert.equal(profile.name.ar, SHORT_AR);
  assert.equal(profile.officialName.ar, OFFICIAL_AR);
  assert.ok(manifest.profile.approvedFields.includes('officialName'), 'the second key approves the new field');
});

test('DQ-11: one citation form for the co-author, "Rady, E. A."', () => {
  assert.ok(!bib.includes('E. H. A.'));
  for (const key of ['rady2018ridge', 'rady2019biased']) assert.match(entry(key), /author\s*=\s*\{Rady, E\. A\. and/, key);
  assert.equal((bib.match(/Rady, E\. A\./g) ?? []).length, 3);
});

test('DQ-12: six books and two technical reports among the self-published guides', () => {
  const type = Object.fromEntries(bibKeys().map((b) => [b.key, b.type]));
  for (const key of ['taha2026panels', 'taha2026logistic', 'taha2026sample', 'taha2026regression', 'taha2025comprehensive', 'taha2025comprehensivea']) {
    assert.equal(type[key], 'book', key);
  }
  for (const key of ['taha2026fit', 'taha2026normality']) assert.equal(type[key], 'techreport', key);
  for (const key of ['taha2025comprehensive', 'taha2025comprehensivea']) assert.match(entry(key), /publisher\s*=\s*\{ResearchGate\}/);
});

test('DQ-14: the two weak area links are replaced by statistical-reporting-and-software', () => {
  const to = (from) => manifest.relationships.filter((r) => r.from === from && r.to.startsWith('area:')).map((r) => r.to);
  assert.deepEqual(to('publication:taha2026regression'), ['area:statistical-reporting-and-software']);
  assert.deepEqual(to('publication:taha2026uncertainty'), ['area:statistical-reporting-and-software']);
  for (const from of ['publication:taha2026regression', 'publication:taha2026uncertainty']) {
    assert.match(manifest.relationships.find((r) => r.from === from && r.to.startsWith('area:')).evidence, /DQ-14/);
  }
});

test('built site: Arabic name in the Arabic headings, official name on the profile pages', () => {
  assert.equal(text(page('/ar/').match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]), SHORT_AR);
  const arAbout = page('/ar/about/');
  assert.ok(arAbout.includes(OFFICIAL_AR) && arAbout.includes('الاسم الرسمي'));
  assert.match(page('/about/'), new RegExp(`<bdi[^>]*lang="ar"[^>]*dir="rtl"[^>]*>${OFFICIAL_AR}</bdi>`));
  assert.ok(page('/about/').includes('Appointed to the Tanta branch'));
});

test('built site: structured data and pages carry no superseded identifiers', () => {
  const html = page('/');
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1])].flat());
  const person = ld.find((x) => x['@type'] === 'Person');
  assert.deepEqual(person.alternateName, [SHORT_AR, OFFICIAL_AR]);
  assert.ok(person.sameAs.includes('https://www.researchgate.net/profile/Ibrahim-Taha-5'));
  for (const r of routes()) {
    const p = page(r);
    for (const stale of ['58577960300', 'Ibrahim_Taha11', 'E. H. A.']) assert.ok(!p.includes(stale), `${r} still shows ${stale}`);
  }
});
