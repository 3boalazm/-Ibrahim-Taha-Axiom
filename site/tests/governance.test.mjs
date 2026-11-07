// Governance data: consent record, manifest relationships, translations, open issues.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bibKeys, data } from './helpers.mjs';

const manifest = data('approved/public-content.manifest.json');
const ids = {
  publication: new Set(bibKeys().map((b) => b.key)),
  area: new Set(data('approved/research-areas.json').map((a) => a.id)),
  project: new Set(data('approved/projects.json').map((p) => p.id)),
  talk: new Set(data('approved/talks.json').map((t) => t.id)),
  method: new Set(data('approved/methods.json').map((m) => m.id)),
  dataset: new Set(data('approved/datasets.json').map((d) => d.id)),
};

test('the researcher approval records identity, date, scope, status and who recorded it', () => {
  const a = manifest.researcherApproval;
  assert.equal(a.status, 'approved');
  assert.equal(a.date, '2026-11-06');
  assert.equal(a.researcher.name, 'Ibrahim Mohamed Taha');
  assert.match(a.researcher.orcid, /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/);
  assert.ok(Array.isArray(a.scope) && a.scope.length >= 3);
  assert.ok(a.recordedBy && a.reference);
  assert.ok(manifest.approvalHistory.length >= 2, 'earlier approvals stay in the history');
});

test('every approved publication key exists in the bib file and vice versa', () => {
  assert.deepEqual([...manifest.publications.approvedKeys].sort(), [...ids.publication].sort());
});

test('relationships connect records that exist, carry evidence, and are not duplicated', () => {
  const seen = new Set();
  for (const r of manifest.relationships) {
    for (const ref of [r.from, r.to]) {
      const [kind, id] = ref.split(':');
      assert.ok(ids[kind], `unknown kind in ${ref}`);
      assert.ok(ids[kind].has(id), `${ref} does not exist`);
    }
    assert.ok(typeof r.evidence === 'string' && r.evidence.length >= 20, `${r.from} → ${r.to} needs evidence`);
    const k = `${r.from}>${r.to}`;
    assert.ok(!seen.has(k), `duplicate ${k}`);
    seen.add(k);
  }
});

test('Arabic drafts carry a status, and a reviewed entry names its reviewer', () => {
  const t = data('translations/ar.json');
  assert.equal(manifest.translations.ar.showDrafts, true);
  assert.ok(t.entries.length > 0);
  for (const e of t.entries) {
    assert.ok(['draft', 'reviewed'].includes(e.status));
    if (e.status === 'reviewed') assert.ok(t.reviewedBy, 'a reviewed entry needs a reviewer');
  }
  // D-24: on 2026-11-07 the project owner confirmed that the whole site has been reviewed. Every
  // entry is marked reviewed; the record quotes the owner and names no reviewer it was not given.
  assert.equal(t.status, 'reviewed');
  assert.ok(t.entries.every((e) => e.status === 'reviewed'), 'every entry reviewed');
  assert.match(t.reviewedBy, /project owner/);
  assert.match(t.reviewedBy, /الموقع اتراجع كله بالفعل/);
  assert.match(t.reviewedBy, /The reviewer was not named\./);
  const record = manifest.approvalHistory.find((h) => h.status === 'Arabic translations marked reviewed');
  assert.ok(record && record.date === '2026-11-07' && record.note.includes('The reviewer was not named.'), 'the review is on the audit trail');
});

test('data-quality issues: nothing resolved silently, every answer on record', () => {
  const issues = data('review/open-issues.json');
  const list = issues.issues ?? issues;
  assert.ok(list.length >= 10);
  for (const i of list) {
    assert.match(i.id, /^DQ-\d{2}$/);
    assert.ok(i.sources?.length >= 1, `${i.id} needs at least one source`);
    const r = i.response;
    if (i.status === 'resolved') {
      assert.equal(r?.outcome, 'decided', `${i.id} must not be resolved without a recorded decision`);
      for (const k of ['date', 'by', 'answer', 'applied', 'source']) assert.ok(r[k], `${i.id}: the decision lacks ${k}`);
    } else {
      assert.equal(i.status, 'open', i.id);
      assert.notEqual(r?.outcome, 'decided', `${i.id} has a recorded decision but is still open`);
      if (r) assert.ok(r.date && r.by && r.answer && r.source, `${i.id}: an undetermined answer is recorded in full`);
    }
  }
});

test('the data-quality register page is generated from the issues file', async () => {
  const { renderRegister, REGISTER_PATH } = await import('../scripts/dq-register.mjs');
  const onDisk = readFileSync(REGISTER_PATH, 'utf8');
  assert.equal(onDisk, renderRegister(data('review/open-issues.json')), 'docs/data-quality-register.md is stale: run npm run dq:register');
});
