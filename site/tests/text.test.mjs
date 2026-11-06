// Normalisation, tokenising, the bilingual glossary and highlighting (src/lib/text.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arNoun, highlightSegments, matchRanges, normalize, queryTokens, synonyms, tokenize } from '../src/lib/text.mjs';

test('Arabic normalisation folds diacritics, alef/yaa/taa-marbuta forms, tatweel and digits', () => {
  assert.equal(normalize('الحَرْف'), normalize('الحرف'));
  assert.equal(normalize('إحصاء'), normalize('احصاء'));
  assert.equal(normalize('أبو'), normalize('ابو'));
  assert.equal(normalize('مستوى'), normalize('مستوي'));
  assert.equal(normalize('دراسة'), normalize('دراسه'));
  assert.equal(normalize('تـــحليل'), normalize('تحليل'));
  assert.equal(normalize('٢٠٢٣'), '2023');
  assert.equal(normalize('۲۰۲۳'), '2023', 'Persian digits too');
});

test('Latin normalisation is case- and accent-insensitive', () => {
  assert.equal(normalize('Conway–Maxwell–Poisson'), normalize('conway-maxwell-poisson'));
  assert.equal(normalize('Décision'), normalize('decision'));
});

test('tokenize splits mixed-language text and keeps numbers', () => {
  const t = tokenize('Ridge انحدار 2023 PLS-SEM');
  for (const w of ['ridge', '2023', 'pls', 'sem']) assert.ok(t.includes(w), `missing ${w} in ${t}`);
  assert.ok(t.some((w) => w.includes('انحدار') || w.includes('نحدار')), `Arabic token missing in ${t}`);
});

test('query tokens strip the Arabic definite article', () => {
  assert.deepEqual(queryTokens('الانحدار'), queryTokens('انحدار'));
});

test('the glossary links Arabic statistical terms to English ones', () => {
  const ridge = queryTokens('الحرف')[0];
  assert.ok(synonyms(ridge).includes('ridge'), `حرف → ${synonyms(ridge)}`);
  const multi = queryTokens('التعدد الخطي');
  assert.ok(multi.length >= 1);
});

test('highlighting maps matches back onto the original text, diacritics intact', () => {
  const original = 'تقدير الحَرْف (Ridge) لانحدار بيتا';
  const tokens = queryTokens('الحرف');
  const ranges = matchRanges(original, tokens);
  assert.ok(ranges.length > 0, 'expected a match');
  const segs = highlightSegments(original, tokens);
  assert.equal(segs.map((s) => s.text).join(''), original, 'segments must rebuild the original string');
  const marked = segs.filter((s) => s.hit).map((s) => s.text).join('');
  assert.match(marked, /حَرْف|Ridge/);
});

test('arNoun follows MSA number agreement', () => {
  const f = { one: 'منشور', two: 'منشوران', few: 'منشورات', many: 'منشورًا' };
  const cases = { 1: 'منشور', 2: 'منشوران', 3: 'منشورات', 10: 'منشورات', 11: 'منشورًا', 22: 'منشورًا', 99: 'منشورًا', 100: 'منشور', 103: 'منشورات', 115: 'منشورًا', 200: 'منشور' };
  for (const [n, want] of Object.entries(cases)) assert.equal(arNoun(Number(n), f), want, `n=${n}`);
});
