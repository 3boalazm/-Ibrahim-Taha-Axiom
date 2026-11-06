/**
 * Text normalisation shared by the search index (build time), the search
 * dialog and the publication explorer (browser) and the tests (node --test).
 *
 * Goals: an English or Arabic query should find what a reader means, whatever
 * the diacritics, letter variants, digits or dash characters.
 *   - Unicode NFKD, then all combining marks removed (Latin accents, Arabic
 *     harakat, hamza marks: أ إ آ → ا, ؤ → و, ئ → ي)
 *   - Arabic letter variants: ٱ → ا, ة → ه, ى → ي, Persian ی → ي and ک → ك
 *   - tatweel (ـ) removed; Arabic-Indic and Persian digits → ASCII
 *   - every dash variant → "-"; lower case
 * Tokens drop a leading Arabic article (ال، وال، بال، فال، كال، لل) when at
 * least three letters remain, so «الانحدار» matches «انحدار».
 * Plain JavaScript with no dependencies.
 */

const DASHES = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;
const LETTER_MAP = {
  '\u0671': '\u0627', // ٱ → ا
  '\u0629': '\u0647', // ة → ه
  '\u0649': '\u064A', // ى → ي
  '\u06CC': '\u064A', // ی → ي
  '\u06A9': '\u0643', // ک → ك
};
const TATWEEL = '\u0640';
const AR_PREFIXES = ['وال', 'بال', 'فال', 'كال', 'لل', 'ال'];

/** Normalise one code point (may return '' or several characters). */
function normChar(ch) {
  const cp = ch.codePointAt(0);
  if (cp >= 0x0660 && cp <= 0x0669) return String(cp - 0x0660);
  if (cp >= 0x06f0 && cp <= 0x06f9) return String(cp - 0x06f0);
  if (ch === TATWEEL) return '';
  let out = '';
  for (const c of ch.normalize('NFKD')) {
    if (/\p{M}/u.test(c)) continue;
    out += LETTER_MAP[c] ?? c;
  }
  return out.replace(DASHES, '-').toLowerCase();
}

/** Normalised text (same length semantics as normalizeWithMap().text). */
export function normalize(input) {
  if (input === null || input === undefined) return '';
  let out = '';
  for (const ch of String(input)) out += normChar(ch);
  return out;
}

/**
 * Normalised text plus, for every output character, the [start, end) range
 * of the source character it came from — used to highlight matches in the
 * original, un-normalised string.
 */
export function normalizeWithMap(input) {
  const src = String(input ?? '');
  let text = '';
  const starts = [];
  const ends = [];
  let i = 0;
  for (const ch of src) {
    const n = normChar(ch);
    for (let k = 0; k < n.length; k++) {
      starts.push(i);
      ends.push(i + ch.length);
    }
    text += n;
    i += ch.length;
  }
  return { text, starts, ends };
}

const isArabic = (s) => /[\u0600-\u06FF]/.test(s);

/** Drop a leading Arabic article when at least three letters remain. */
export function stripArabicPrefix(token) {
  if (!isArabic(token)) return token;
  for (const p of AR_PREFIXES) {
    if (token.startsWith(p) && token.length - p.length >= 3) return token.slice(p.length);
  }
  return token;
}

const SPLIT = /[^\p{L}\p{N}]+/u;

/** Normalised tokens, Arabic article removed. */
export function tokenize(input) {
  return normalize(input)
    .split(SPLIT)
    .filter(Boolean)
    .map(stripArabicPrefix);
}

const STOP = new Set(['the', 'of', 'and', 'for', 'in', 'a', 'an', 'on', 'with', 'to', 'by', 'at', 'from', 'في', 'من', 'علي', 'عن', 'و', 'مع', 'الي', 'او']);

/** Query tokens: like tokenize(), minus stop words (unless nothing else is left). */
export function queryTokens(input) {
  const all = tokenize(input);
  const kept = all.filter((t) => !STOP.has(t));
  return kept.length ? kept : all;
}

/**
 * A small bilingual glossary of statistical terms so mixed-language queries
 * work («ridge» finds «الحَرْف», «انحدار» finds "regression"). Entries are
 * already normalised; expansions must match whole tokens.
 */
export const GLOSSARY = [
  ['ridge', 'حرف', 'ريدج'],
  ['liu', 'ليو'],
  ['lasso', 'لاسو'],
  ['elastic', 'مرنه'],
  ['regression', 'انحدار'],
  ['bayesian', 'bayes', 'بيزي'],
  ['panel', 'panels', 'بانل'],
  ['cointegration', 'تكامل'],
  ['multicollinearity', 'collinearity', 'تعدد'],
  ['poisson', 'بواسون'],
  ['beta', 'بيتا'],
  ['simulation', 'محاكاه'],
  ['monte', 'مونت'],
  ['carlo', 'كارلو'],
  ['prior', 'قبلي'],
  ['size', 'حجم'],
  ['selection', 'اختيار'],
  ['estimator', 'estimators', 'estimation', 'مقدر', 'مقدرات', 'تقدير'],
  ['statistics', 'statistical', 'احصاء', 'احصائي', 'احصائيه'],
  ['econometrics', 'قياسي'],
  ['teaching', 'تدريس'],
  ['conference', 'مؤتمر'],
  ['thesis', 'رساله'],
  ['book', 'books', 'كتاب', 'كتب'],
  ['guide', 'guides', 'دليل', 'ادله'],
  ['dataset', 'data', 'بيانات'],
  ['logistic', 'لوجستي'],
  ['normality', 'normal', 'طبيعي'],
  ['sample', 'عينه'],
  ['shrinkage', 'انكماش'],
  ['penalized', 'penalised', 'penalty', 'جزائي', 'جزائيه'],
  ['structural', 'بنائيه'],
  ['equation', 'equations', 'معادلات'],
  ['management', 'اداره', 'اداريه'],
  ['education', 'تعليم'],
];
/**
 * One-way expansions for words of Arabic compound terms, so «التعدد الخطي»
 * (multicollinearity) or «التكامل المشترك» (cointegration) still match English
 * titles when every query word must match.
 */
export const ONE_WAY = {
  خطي: ['linear', 'multicollinearity', 'collinearity'],
  خطيه: ['linear', 'multicollinearity', 'collinearity'],
  مشترك: ['cointegration'],
  معممه: ['generalized', 'generalised'],
  كارلو: ['carlo'],
  قبلي: ['prior'],
  نماذج: ['models', 'model'],
  نموذج: ['model', 'models'],
  حجم: ['size'],
  مطابقه: ['fit', 'goodness'],
  جوده: ['goodness', 'quality'],
  اختيار: ['selection'],
};
const SYN = new Map();
for (const group of GLOSSARY)
  for (const term of group) {
    const prev = SYN.get(term) ?? [];
    SYN.set(term, [...new Set([...prev, ...group.filter((t) => t !== term)])]);
  }
for (const [term, alts] of Object.entries(ONE_WAY)) SYN.set(term, [...new Set([...(SYN.get(term) ?? []), ...alts])]);

/** Glossary alternatives for a normalised token (whole-token matches only). */
export const synonyms = (token) => SYN.get(token) ?? [];

/**
 * Ranges [start, end) in the ORIGINAL string where any query token matches at
 * the start of a word (or right after a leading Arabic article). Overlapping
 * ranges are merged.
 */
export function matchRanges(original, tokens) {
  if (!original || !tokens?.length) return [];
  const { text, starts, ends } = normalizeWithMap(original);
  const ranges = [];
  const re = /[\p{L}\p{N}]+/gu;
  let m;
  while ((m = re.exec(text))) {
    const word = m[0];
    const offsets = [0];
    for (const p of AR_PREFIXES) if (word.startsWith(p) && word.length - p.length >= 3) offsets.push(p.length);
    for (const t of tokens) {
      const alts = [t, ...synonyms(t)];
      for (const off of offsets) {
        const rest = word.slice(off);
        const hit = alts.find((a, i) => (i === 0 ? rest.startsWith(a) : rest === a));
        if (hit) {
          const len = hit === t ? Math.min(t.length, rest.length) : rest.length;
          const a = m.index + off;
          ranges.push([starts[a], ends[a + len - 1]]);
          break;
        }
      }
    }
  }
  ranges.sort((x, y) => x[0] - y[0] || y[1] - x[1]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

/** Split text into { text, hit } segments for safe DOM highlighting. */
export function highlightSegments(original, tokens) {
  const ranges = matchRanges(original, tokens);
  const out = [];
  let i = 0;
  for (const [a, b] of ranges) {
    if (a > i) out.push({ text: original.slice(i, a), hit: false });
    out.push({ text: original.slice(a, b), hit: true });
    i = b;
  }
  if (i < original.length) out.push({ text: original.slice(i), hit: false });
  return out;
}

/**
 * Arabic counted noun after a numeral (MSA): 1 → one, 2 → dual, 3–10 → plural,
 * 11–99 → accusative singular, round hundreds/thousands → genitive singular (one).
 * The rule looks at the last two digits, so 103 → plural and 115 → accusative.
 * @param {number} n
 * @param {{ one: string, two: string, few: string, many: string }} forms
 */
export function arNoun(n, forms) {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  const r = n % 100;
  if (r >= 3 && r <= 10) return forms.few;
  if (r >= 11) return forms.many;
  return forms.one;
}
