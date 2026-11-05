/**
 * Typed schemas for every piece of public data the site can render.
 * Invalid data fails the build with a clear message (no silent omissions).
 */
import { z } from 'astro/zod';

export const LOCALES = ['en', 'ar'] as const;
export type Lang = (typeof LOCALES)[number];

/** A text value per language. `null` means "not provided / not approved". */
export const Localized = z.object({
  en: z.string().min(1).nullable(),
  ar: z.string().min(1).nullable(),
});
export type LocalizedText = z.infer<typeof Localized>;

const RequiredLocalized = Localized.refine((v) => v.en !== null || v.ar !== null, {
  message: 'At least one language must be provided',
});

const httpUrl = z.string().url().refine((u) => /^https?:\/\//.test(u), { message: 'Only http(s) URLs are allowed' });
const sitePathOrUrl = z.string().refine((u) => u.startsWith('/') || /^https?:\/\//.test(u), {
  message: 'Use a site path (/files/...) or an http(s) URL',
});

export const LaunchSchema = z
  .object({
    siteName: z.string().min(1),
    canonicalOrigin: httpUrl.nullable(),
    allowIndexing: z.boolean(),
    notes: z.string().optional(),
  })
  .refine((v) => !v.allowIndexing || v.canonicalOrigin !== null, {
    message: 'launch.json: allowIndexing=true requires canonicalOrigin (the confirmed domain).',
  });

export const PROFILE_FIELDS = [
  'name',
  'role',
  'summary',
  'biography',
  'affiliations',
  'education',
  'identifiers',
  'interests',
  'authorMatch',
] as const;

export const ManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.string(),
    lastReviewed: z.string().nullable(),
    reviewedBy: z.string().nullable(),
    researcherApproval: z.object({
      status: z.enum(['pending', 'partial', 'approved']),
      reference: z.string().nullable(),
    }),
    profile: z.object({ approvedFields: z.array(z.enum(PROFILE_FIELDS)) }),
    publications: z.object({ approvedKeys: z.array(z.string()), selectedKeys: z.array(z.string()) }),
    researchAreas: z.object({ approvedIds: z.array(z.string()) }),
    projects: z.object({ approvedIds: z.array(z.string()) }),
    courses: z.object({ approvedIds: z.array(z.string()) }),
    talks: z.object({ approvedIds: z.array(z.string()) }),
    cv: z.object({ approved: z.boolean() }),
    relationships: z.array(
      z.object({
        from: z.string().regex(/^(publication|area|project|course|talk):.+$/),
        to: z.string().regex(/^(publication|area|project|course|talk):.+$/),
        evidence: z.string().min(1),
      }),
    ),
  })
  .strict()
  .refine((m) => m.publications.selectedKeys.every((k) => m.publications.approvedKeys.includes(k)), {
    message: 'manifest: every selectedKey must also be an approvedKey',
  });
export type Manifest = z.infer<typeof ManifestSchema>;

export const ProfileSchema = z.object({
  name: Localized,
  role: Localized,
  summary: Localized,
  biography: Localized,
  affiliations: z.array(
    z.object({
      organization: RequiredLocalized,
      department: Localized.optional(),
      role: Localized.optional(),
      from: z.string().optional(),
      to: z.string().nullable().optional(),
      url: httpUrl.optional(),
    }),
  ),
  education: z.array(
    z.object({
      degree: RequiredLocalized,
      institution: RequiredLocalized,
      year: z.number().int().optional(),
      status: Localized.optional(),
    }),
  ),
  identifiers: z.array(
    z.object({
      type: z.enum(['ORCID', 'Google Scholar', 'Scopus', 'ResearcherID', 'OpenAlex', 'ResearchGate', 'GitHub', 'LinkedIn', 'Website', 'Other']),
      value: z.string().min(1),
      url: httpUrl,
    }),
  ),
  interests: z.array(RequiredLocalized),
  authorMatch: z.array(z.object({ last: z.string().min(1), firstInitial: z.string().length(1) })),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const EntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: RequiredLocalized,
  summary: Localized,
  period: z.string().optional(),
  status: Localized.optional(),
  url: httpUrl.optional(),
});
export const EntryListSchema = z.array(EntrySchema);
export type Entry = z.infer<typeof EntrySchema>;

export const CourseSchema = EntrySchema.extend({
  level: Localized.optional(),
  term: z.string().optional(),
  institution: Localized.optional(),
  materials: z.array(z.object({ label: RequiredLocalized, url: sitePathOrUrl })).default([]),
});
export type Course = z.infer<typeof CourseSchema>;

export const TalkSchema = EntrySchema.extend({
  event: RequiredLocalized,
  date: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/),
  location: Localized.optional(),
  slides: sitePathOrUrl.optional(),
});
export type Talk = z.infer<typeof TalkSchema>;

export const CvSchema = z.object({
  pdf: sitePathOrUrl.nullable(),
  sections: z.array(
    z.object({
      id: z.string(),
      heading: RequiredLocalized,
      items: z.array(z.object({ text: RequiredLocalized, period: z.string().optional() })),
    }),
  ),
});
export type Cv = z.infer<typeof CvSchema>;
