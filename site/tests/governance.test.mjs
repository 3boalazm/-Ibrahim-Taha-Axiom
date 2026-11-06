// Governance data: consent record, manifest relationships, translations, open issues.
import { test } from 'node:test';
import assert from 'node:assert/strict';
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
});

test('open data-quality issues stay open with sources', () => {
  const issues = data('review/open-issues.json');
  const list = issues.issues ?? issues;
  assert.ok(list.length >= 10);
  for (const i of list) {
    assert.match(i.id, /^DQ-\d{2}$/);
    assert.ok(i.sources?.length >= 1, `${i.id} needs at least one source`);
    assert.notEqual(i.status, 'resolved', `${i.id} must not be resolved silently`);
  }
});
