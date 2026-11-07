/**
 * Public-content gate.
 *
 * Everything the site shows about the researcher passes through here. An item
 * is rendered only if it exists in an approved data file (src/data/approved/)
 * AND it is explicitly listed in public-content.manifest.json. Nothing is ever
 * read from data-staging/.
 */
import launchRaw from '../data/public-settings/launch.json';
import manifestRaw from '../data/approved/public-content.manifest.json';
import profileRaw from '../data/approved/profile.json';
import areasRaw from '../data/approved/research-areas.json';
import projectsRaw from '../data/approved/projects.json';
import coursesRaw from '../data/approved/courses.json';
import talksRaw from '../data/approved/talks.json';
import cvRaw from '../data/approved/cv.json';
import methodsRaw from '../data/approved/methods.json';
import datasetsRaw from '../data/approved/datasets.json';
import arDraftsRaw from '../data/translations/ar.json';
import openIssuesRaw from '../data/review/open-issues.json';
import {
  CourseSchema,
  CvSchema,
  DatasetSchema,
  EntryListSchema,
  LaunchSchema,
  ManifestSchema,
  MethodSchema,
  OpenIssuesSchema,
  ProfileSchema,
  TalkSchema,
  TranslationFileSchema,
  type Lang,
  type LocalizedText,
  type Profile,
} from './schema';
import { z } from 'astro/zod';

export function validate<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new Error(`[content gate] ${file} is invalid:\n${r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return r.data;
}

export const launch = validate(LaunchSchema, launchRaw, 'public-settings/launch.json');
export const manifest = validate(ManifestSchema, manifestRaw, 'approved/public-content.manifest.json');
export const indexingAllowed = launch.allowIndexing && launch.canonicalOrigin !== null;

function approvedOnly<T extends { id: string }>(items: T[], ids: string[], label: string): T[] {
  const known = new Set(items.map((i) => i.id));
  const missing = ids.filter((id) => !known.has(id));
  if (missing.length) {
    throw new Error(`[content gate] manifest approves ${label} that do not exist in the approved data: ${missing.join(', ')}`);
  }
  return items.filter((i) => ids.includes(i.id));
}

// ---------------------------------------------------------------- profile
const fullProfile = validate(ProfileSchema, profileRaw, 'approved/profile.json');
const approvedFields = new Set(manifest.profile.approvedFields);
const NULL_TEXT: LocalizedText = { en: null, ar: null };

/** Only manifest-approved profile fields survive; everything else is blanked. */
export const profile: Profile = {
  name: approvedFields.has('name') ? fullProfile.name : NULL_TEXT,
  officialName: approvedFields.has('officialName') ? fullProfile.officialName : NULL_TEXT,
  role: approvedFields.has('role') ? fullProfile.role : NULL_TEXT,
  summary: approvedFields.has('summary') ? fullProfile.summary : NULL_TEXT,
  biography: approvedFields.has('biography') ? fullProfile.biography : NULL_TEXT,
  affiliations: approvedFields.has('affiliations') ? fullProfile.affiliations : [],
  education: approvedFields.has('education') ? fullProfile.education : [],
  identifiers: approvedFields.has('identifiers') ? fullProfile.identifiers : [],
  community: approvedFields.has('community') ? fullProfile.community : [],
  contact: approvedFields.has('contact') ? fullProfile.contact : {},
  interests: approvedFields.has('interests') ? fullProfile.interests : [],
  authorMatch: approvedFields.has('authorMatch') ? fullProfile.authorMatch : [],
};
export const hasProfileContent =
  !!(profile.name.en || profile.name.ar || profile.role.en || profile.role.ar || profile.summary.en || profile.summary.ar ||
    profile.biography.en || profile.biography.ar) ||
  profile.affiliations.length + profile.education.length + profile.identifiers.length + profile.community.length + profile.interests.length > 0;

// --------------------------------------------------------- other sections
export const researchAreas = approvedOnly(validate(EntryListSchema, areasRaw, 'approved/research-areas.json'), manifest.researchAreas.approvedIds, 'research areas');
export const projects = approvedOnly(validate(EntryListSchema, projectsRaw, 'approved/projects.json'), manifest.projects.approvedIds, 'projects');
export const courses = approvedOnly(validate(z.array(CourseSchema), coursesRaw, 'approved/courses.json'), manifest.courses.approvedIds, 'courses');
export const talks = approvedOnly(validate(z.array(TalkSchema), talksRaw, 'approved/talks.json'), manifest.talks.approvedIds, 'talks').sort((a, b) =>
  b.date.localeCompare(a.date),
);
const cvAll = validate(CvSchema, cvRaw, 'approved/cv.json');
export const cv = manifest.cv.approved ? cvAll : null;
export const hasCvContent = !!cv && (cv.pdf !== null || cv.sections.length > 0);

export const methods = approvedOnly(validate(z.array(MethodSchema), methodsRaw, 'approved/methods.json'), manifest.methods.approvedIds, 'methods');
export const datasets = approvedOnly(validate(z.array(DatasetSchema), datasetsRaw, 'approved/datasets.json'), manifest.datasets.approvedIds, 'datasets');

// ------------------------------------------------------- Arabic drafts
/**
 * AI-assisted Arabic drafts (src/data/translations/ar.json), keyed by the exact
 * English text they translate. If the English changes, the draft no longer
 * matches and the English fallback returns, so a stale draft is never shown.
 */
export const arDrafts = validate(TranslationFileSchema, arDraftsRaw, 'translations/ar.json');
{
  const seen = new Set<string>();
  const dupes = arDrafts.entries.filter((e) => (seen.has(e.en) ? true : (seen.add(e.en), false)));
  if (dupes.length) throw new Error(`[content gate] translations/ar.json repeats English source texts: ${dupes.map((d) => d.ref).join(', ')}`);
}
export const showArDrafts = manifest.translations.ar.showDrafts;
/**
 * Arabic entries still awaiting review. The draft notes, the inline labels and the
 * footer's translation line appear only while there is at least one; reviewed text
 * carries no label.
 */
export const pendingArDrafts = arDrafts.entries.filter((e) => e.status !== 'reviewed').length;
const draftMap = new Map(arDrafts.entries.map((e) => [e.en, e]));

/** The Arabic draft for an exact English string, when drafts are shown. */
export function arDraft(en: string | null | undefined): { text: string; draft: boolean } | null {
  if (!en || !showArDrafts) return null;
  const d = draftMap.get(en);
  return d ? { text: d.ar, draft: d.status !== 'reviewed' } : null;
}

export type Picked = { text: string; lang: Lang; fallback: boolean; draft: boolean };

/**
 * Pick the text for a language. Order: approved text in that language → (for
 * Arabic) a labelled draft → the other language, flagged as a fallback.
 */
export function pick(v: LocalizedText | undefined | null, lang: Lang): Picked | null {
  if (!v) return null;
  const other: Lang = lang === 'en' ? 'ar' : 'en';
  if (v[lang]) return { text: v[lang] as string, lang, fallback: false, draft: false };
  if (lang === 'ar') {
    const d = arDraft(v.en);
    if (d) return { text: d.text, lang: 'ar', fallback: false, draft: d.draft };
  }
  if (v[other]) return { text: v[other] as string, lang: other, fallback: true, draft: false };
  return null;
}

/** True when the value can be shown in Arabic (approved or as a labelled draft). */
export function hasArabic(v: LocalizedText | undefined | null): boolean {
  return !!v && (!!v.ar || !!arDraft(v.en));
}

// --------------------------------------------------- data-quality register
export const openIssues = validate(OpenIssuesSchema, openIssuesRaw, 'review/open-issues.json');
