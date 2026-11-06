// The researcher's Data Quality Review decisions (2026-11-06), as applied to the data and
// the built site, and the narrowing of DQ-13 once proceedings publication was sourced
// (2026-11-07). Each test names the issue in src/data/review/open-issues.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, bibKeys, data, jsonScript, page, routes } from './helpers.mjs';

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
    // 'Scopus (2 ids)' was a footer label left over from before DQ-05.
    for (const stale of ['58577960300', 'Ibrahim_Taha11', 'E. H. A.', 'Scopus (2 ids)']) assert.ok(!p.includes(stale), `${r} still shows ${stale}`);
  }
});

// ------------------------------------------------------------------ DQ-13, narrowed 2026-11-07
// Both conference papers are documented in the proceedings. Whether Ibrahim presented either
// one orally is not: the researcher answered «not sure», and no source says who delivered them.
const talks = data('approved/talks.json');
const PROCEEDINGS_2018 = 'https://issrconfrence.cu.edu.eg/Content/archive/2018/appliedStat2018.pdf';
const FULLTEXT_2019 = 'https://www.researchgate.net/publication/339943569_New_Shrinkage_Parameters_for_Liu-type_Zero_Inflated_Negative_Binomial_Estimator';
const REFERENCE_2019 = 'https://doi.org/10.1002/cpe.6685';
const SOURCE_LINKS = {
  'conference-2018-nb-ridge': { url: PROCEEDINGS_2018, en: 'Official proceedings (PDF)', ar: 'وقائع المؤتمر (PDF)' },
  'conference-2019-zinb-liu': { url: FULLTEXT_2019, en: 'Full text (ResearchGate)', ar: 'النص الكامل (ResearchGate)' },
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const unescapeHtml = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
/** The visible text of a page's <main>, with tags turned into spaces. */
const mainText = (html) =>
  text(html.match(/<main[\s\S]*?<\/main>/)[0].replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' '));
/** Text of the section links (not the language switch) pointing at `href`. */
const sectionLinks = (html, href) =>
  [...html.matchAll(new RegExp(`<a\\b([^>]*)href="${escapeRe(href)}"([^>]*)>([\\s\\S]*?)</a>`, 'g'))]
    .filter((m) => !/hreflang=/.test(m[1] + m[2]))
    .map((m) => text(m[3].replace(/<[^>]+>/g, ' ')));

test('DQ-13 stays open only for who presented the papers orally; proceedings publication is sourced', () => {
  const i = issue('DQ-13');
  assert.equal(i.status, 'open');
  assert.equal(i.question, 'Did Ibrahim personally present either of these papers orally?');
  assert.doesNotMatch(i.question, /proceedings|published/i, 'publication in the proceedings is no longer asked');
  assert.deepEqual(i.subjects, ['talk:conference-2018-nb-ridge', 'talk:conference-2019-zinb-liu']);
  // The researcher's answer and its attribution stay exactly as given on 2026-11-06.
  assert.deepEqual(i.response, {
    date: '2026-11-06',
    by: 'Ibrahim Taha (researcher)',
    answer: 'Not sure, for all four questions (2018 and 2019: published in proceedings? presented by the researcher?).',
    outcome: 'undetermined',
    source: 'Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat',
  });
  // The wider question that answer was given to stays on record.
  assert.equal(i.history.length, 1);
  assert.equal(i.history[0].date, '2026-11-07');
  assert.ok(i.history[0].change.includes('Were the 2018 and 2019 conference papers published in proceedings, and did the researcher present them?'));
  assert.match(i.current, /verified in the conference proceedings/);
  assert.match(i.current, /Oral presentation by Ibrahim is unconfirmed/);
  for (const url of [PROCEEDINGS_2018, FULLTEXT_2019, REFERENCE_2019]) {
    assert.ok(i.sources.some((s) => s.includes(url)), `DQ-13 cites ${url}`);
  }
  const register = readFileSync(join(DATA, '..', '..', '..', 'docs', 'data-quality-register.md'), 'utf8');
  const section = register.slice(register.indexOf('## DQ-13 · classification · open'), register.indexOf('## DQ-14'));
  assert.ok(section.includes('**Question.** Did Ibrahim personally present either of these papers orally?'));
  assert.ok(section.includes('**Question history** (2026-11-07'));
});

test('both conference papers carry their source links, in English and Arabic, on the page', () => {
  assert.deepEqual(talks.map((t) => t.id).sort(), Object.keys(SOURCE_LINKS).sort(), 'record ids are unchanged');
  for (const t of talks) {
    const want = SOURCE_LINKS[t.id];
    assert.deepEqual(t.links, [{ label: { en: want.en, ar: want.ar }, url: want.url }], t.id);
    assert.match(t.event.en, /^5(3rd|4th) Annual Conference on Statistics, Computer Science, and Operations Research$/, t.id);
    assert.match(t.summary.en, /published in the conference proceedings/, t.id);
    assert.ok(manifest.relationships.some((r) => r.to === `talk:${t.id}`), `${t.id} keeps its graph links`);
    const draft = drafts.find((d) => d.en === t.summary.en);
    assert.ok(draft, `${t.id}: the Arabic summary draft is keyed to the new English text`);
    assert.equal(draft.status, 'draft', 'an edited draft is still a draft');
  }
  for (const [route, lang] of [['/talks/', 'en'], ['/ar/talks/', 'ar']]) {
    const html = page(route);
    for (const want of Object.values(SOURCE_LINKS)) {
      const a = html.match(new RegExp(`<a class="chip" href="${escapeRe(want.url)}"[^>]*>([\\s\\S]*?)</a>`));
      assert.ok(a, `${route} links to ${want.url}`);
      assert.equal(text(a[1]), want[lang], `${route}: label of ${want.url}`);
    }
  }
});

test('visible labels say Conference Papers / أوراق المؤتمرات, and the /talks/ URL stays', () => {
  const cases = [
    { lang: 'en', home: '/talks/', label: 'Conference Papers', count: '2 conference papers', kind: 'Conference paper', column: 'Projects, conference papers and data' },
    { lang: 'ar', home: '/ar/talks/', label: 'أوراق المؤتمرات', count: '2 ورقة مؤتمر', kind: 'ورقة مؤتمر', column: 'المشروعات وأوراق المؤتمرات والبيانات' },
  ];
  for (const c of cases) {
    const html = page(c.home);
    assert.ok(html.match(/<title>([^<]*)<\/title>/)[1].startsWith(`${c.label} — `), `${c.home} title`);
    assert.equal(text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]), c.label, `${c.home} h1`);
    assert.ok(mainText(html).includes(c.count), `${c.home} header count`);
    // Search categories travel in the dialog's data-i18n attribute.
    const i18n = JSON.parse(unescapeHtml(html.match(/data-i18n="([^"]*)"/)[1]));
    assert.equal(i18n.categories.talks, c.label, `${c.lang} search category`);
    // Every section link to the page, in the header, footer and home contents, uses the new label.
    for (const r of routes().filter((x) => (c.lang === 'ar') === x.startsWith('/ar/'))) {
      for (const label of sectionLinks(page(r), c.home)) {
        // The home contents wrap the label with its section number and count ("06 … 2 entries").
        assert.ok(label === c.label || new RegExp(`^\\d{2} ${escapeRe(c.label)} `).test(label), `${r}: link to ${c.home} reads “${label}”`);
      }
    }
    const research = page(c.lang === 'ar' ? '/ar/research/' : '/research/');
    assert.equal(jsonScript(research, 'data-graph-data').i18n.kinds.talk, c.kind, `${c.lang} graph kind`);
    assert.ok(research.includes(c.column), `${c.lang} graph column`);
  }
  assert.ok(sectionLinks(page('/'), '/talks/').length > 0, 'the home page links to the section');
});

test('no page or structured data claims Ibrahim presented the conference papers', () => {
  // Structured data: no events, performers or presentations anywhere on the site.
  const flat = (o, out = []) => {
    if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) (out.push(k, typeof v === 'string' ? v : ''), flat(v, out));
    return out;
  };
  for (const r of routes()) {
    for (const m of page(r).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const values = flat(JSON.parse(m[1]));
      for (const bad of ['Event', 'performer', 'attendee', 'workPerformed', 'PresentationDigitalDocument']) {
        assert.ok(!values.includes(bad), `${r}: structured data has ${bad}`);
      }
    }
  }
  // Wherever the two records appear, a sentence about presenting them must say it is unconfirmed.
  const EN_CLAIM = /\b(present(ed|s|ing|ations?|ers?)|oral(ly)?|talks?|lectures?|speakers?|delivered|gave)\b/i;
  const EN_NEG = /\b(not (been )?confirmed|unconfirmed)\b/i;
  const AR_CLAIM = /^[وفبل]?(?:[يتأن]?قدم(?:ه|ها|هما|ت|وا)?|(?:ال)?تقديم(?:ه|ها|هما)?|(?:ال)?مقدم|ألق(?:ى|اه|اها|اهما)|(?:ال)?محاضر\S*|شفهي\S*)$/;
  const AR_NEG = /لم يتأكد|غير مؤكد/;
  /** Checks every sentence; returns how many mention presenting (all of them negated). */
  const check = (where, body) => {
    const plain = body.replace(/[\u064B-\u0652\u0670]/g, ''); // Arabic diacritics
    let mentions = 0;
    for (const s of plain.split(/(?<=[.!?؟])\s+/)) {
      if (EN_CLAIM.test(s)) (mentions++, assert.match(s, EN_NEG, `${where}: “${s}” is not marked unconfirmed`));
      if (s.split(/[\s،,.:;()«»]+/).some((w) => AR_CLAIM.test(w))) (mentions++, assert.match(s, AR_NEG, `${where}: “${s}” is not marked unconfirmed`));
    }
    return mentions;
  };
  // The checker itself catches an affirmative claim in either language.
  assert.throws(() => check('probe', 'Ibrahim presented the paper at the 53rd conference.'));
  assert.throws(() => check('probe', 'قدّم ابراهيم الورقة في المؤتمر.'));
  assert.throws(() => check('probe', 'ألقاها ابراهيم في المؤتمر.'));
  assert.equal(check('probe', 'Oral presentation by Ibrahim is not confirmed.'), 1);
  const routesWithRecords = ['/talks/', '/about/', '/research/', '/publications/rady2018ridge/', '/publications/rady2019shrinkage/'];
  for (const r of routesWithRecords.flatMap((x) => [x, `/ar${x}`])) {
    const mentions = check(r, mainText(page(r)));
    if (r.endsWith('/talks/')) assert.ok(mentions >= 3, `${r} says, in the lead and in each item, that the presenter is unconfirmed`);
  }
  for (const lang of ['en', 'ar']) {
    const index = JSON.parse(readFileSync(join(DATA, '..', '..', 'dist', 'search-index', `${lang}.json`), 'utf8'));
    const records = index.records.filter((x) => x.cat === 'talks');
    assert.equal(records.length, 2, `${lang} search index has both records`);
    for (const x of records) check(`search-index/${lang}.json ${x.id}`, JSON.stringify([x.title, x.meta, x.f]));
  }
});
