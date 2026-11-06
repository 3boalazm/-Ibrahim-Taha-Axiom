#!/usr/bin/env node
/**
 * Renders docs/data-quality-register.md from src/data/review/open-issues.json, the
 * source of truth for data-quality questions and the decisions taken on them.
 * Run: npm run dq:register  (tests/governance.test.mjs fails when the page is stale)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ISSUES_PATH = join(ROOT, 'src', 'data', 'review', 'open-issues.json');
export const REGISTER_PATH = join(ROOT, '..', 'docs', 'data-quality-register.md');

const code = (s) => `\`${s}\``;

/** The register page for the parsed issues file. */
export function renderRegister(data) {
  const list = data.issues;
  const ids = (pred) => list.filter(pred).map((i) => i.id);
  const resolved = ids((i) => i.status === 'resolved');
  const open = ids((i) => i.status === 'open');
  const out = [
    '# Data-quality register',
    '',
    `> Generated from ${code('site/src/data/review/open-issues.json')} by ${code('npm run dq:register')} (updated ${data.updated}). That file is the source of truth: edit it, then regenerate this page. An issue is closed only by a recorded decision of its named owner (who, when, the answer as given, and what changed); the build rejects a resolved issue without one. Nothing here was resolved by guesswork.`,
    '',
    `**${resolved.length} resolved, ${open.length} open** (of ${list.length}).`,
    '',
    '| Category | Resolved | Open |',
    '| --- | --- | --- |',
  ];
  for (const c of [...new Set(list.map((i) => i.category))]) {
    const cell = (status) => ids((i) => i.category === c && i.status === status).join(', ') || '—';
    out.push(`| ${c} | ${cell('resolved')} | ${cell('open')} |`);
  }
  out.push('');
  for (const i of list) {
    out.push(`## ${i.id} · ${i.category} · ${i.status}`, '', `**Question.** ${i.question}`, '');
    // A question narrowed or reworded later keeps its earlier form on record, so an answer
    // given to the earlier form is never read as an answer to the new one.
    for (const h of i.history ?? []) out.push(`- **Question history** (${h.date}, ${h.by}): ${h.change}`);
    out.push(`- **Applies to:** ${i.subjects.map(code).join(', ')}`);
    out.push(`- **${i.status === 'open' ? 'Shown now' : 'Shown before the decision'}:** ${i.current}`);
    if (i.alternatives?.length) out.push(`- **Alternatives on record:** ${i.alternatives.join('; ')}`);
    out.push(`- **Sources:** ${i.sources.join('; ')}`);
    out.push(`- **Decides:** ${i.owner}`);
    const r = i.response;
    if (r) {
      out.push(`- **Answer** (${r.date}, ${r.by}): ${r.answer}`);
      if (r.outcome === 'decided') out.push(`- **Applied:** ${r.applied}`);
      else out.push(`- **Outcome:** the answer does not settle the question, so it stays open and the site keeps showing the value above.`);
      out.push(`- **Source of the answer:** ${r.source}`);
    }
    out.push('');
  }
  return out.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(REGISTER_PATH, renderRegister(JSON.parse(readFileSync(ISSUES_PATH, 'utf8'))));
  console.log(`wrote ${REGISTER_PATH}`);
}
