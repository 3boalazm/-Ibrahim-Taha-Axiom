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
import {
  CourseSchema,
  CvSchema,
  EntryListSchema,
  LaunchSchema,
  ManifestSchema,
  ProfileSchema,
  TalkSchema,
  type Lang,
  type LocalizedText,
  type Profile,
} from './schema';
import { z } from 'astro/zod';

function validate<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
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
  role: approvedFields.has('role') ? fullProfile.role : NULL_TEXT,
  summary: approvedFields.has('summary') ? fullProfile.summary : NULL_TEXT,
  biography: approvedFields.has('biography') ? fullProfile.biography : NULL_TEXT,
  affiliations: approvedFields.has('affiliations') ? fullProfile.affiliations : [],
  education: approvedFields.has('education') ? fullProfile.education : [],
  identifiers: approvedFields.has('identifiers') ? fullProfile.identifiers : [],
  interests: approvedFields.has('interests') ? fullProfile.interests : [],
  authorMatch: approvedFields.has('authorMatch') ? fullProfile.authorMatch : [],
};
export const hasProfileContent =
  !!(profile.name.en || profile.name.ar || profile.role.en || profile.role.ar || profile.summary.en || profile.summary.ar ||
    profile.biography.en || profile.biography.ar) ||
  profile.affiliations.length + profile.education.length + profile.identifiers.length + profile.interests.length > 0;

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

/** Pick the text for a language; fall back to the other language and say so. */
export function pick(v: LocalizedText | undefined | null, lang: Lang): { text: string; lang: Lang; fallback: boolean } | null {
  if (!v) return null;
  const other: Lang = lang === 'en' ? 'ar' : 'en';
  if (v[lang]) return { text: v[lang] as string, lang, fallback: false };
  if (v[other]) return { text: v[other] as string, lang: other, fallback: true };
  return null;
}
