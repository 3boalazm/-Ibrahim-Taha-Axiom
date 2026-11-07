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
  'officialName',
  'role',
  'summary',
  'biography',
  'affiliations',
  'education',
  'identifiers',
  'community',
  'contact',
  'interests',
  'authorMatch',
] as const;

/** Community spaces (profile.community[].kind): platform, then the kind of space. */
export const COMMUNITY_KINDS = ['facebook-page', 'facebook-group', 'telegram-group', 'whatsapp-group'] as const;
export type CommunityKind = (typeof COMMUNITY_KINDS)[number];
/** The host each kind of link has to live on. */
export const COMMUNITY_HOSTS: Record<CommunityKind, RegExp> = {
  'facebook-page': /^(www\.)?facebook\.com$/,
  'facebook-group': /^(www\.)?facebook\.com$/,
  'telegram-group': /^t\.me$/,
  'whatsapp-group': /^chat\.whatsapp\.com$/,
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use an ISO date (YYYY-MM-DD)' });
/** Node references used by relationships: kind:id. */
export const NODE_KINDS = ['publication', 'area', 'project', 'course', 'talk', 'method', 'dataset'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];
const nodeRef = z.string().regex(/^(publication|area|project|course|talk|method|dataset):[a-z0-9-]+$/, {
  message: 'Use kind:id with kind in publication|area|project|course|talk|method|dataset',
});
/** Fields a relationship may quote as machine-checkable evidence. */
export const EVIDENCE_FIELDS = ['title', 'keywords', 'abstract', 'supp', 'links'] as const;

export const ManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.string(),
    lastReviewed: isoDate.nullable(),
    reviewedBy: z.string().nullable(),
    researcherApproval: z
      .object({
        status: z.enum(['pending', 'partial', 'approved']),
        reference: z.string().nullable(),
        /** Who gave the approval (identity as published, with ORCID). */
        researcher: z.object({ name: z.string().min(1), orcid: z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/) }).optional(),
        date: isoDate.optional(),
        scope: z.array(z.string().min(1)).optional(),
        exclusions: z.array(z.string().min(1)).default([]),
        recordedBy: z.string().optional(),
        basis: z.string().optional(),
      })
      .refine((a) => a.status !== 'approved' || (!!a.researcher && !!a.date && !!a.scope?.length && !!a.recordedBy && !!a.basis), {
        message: 'researcherApproval: an approved record needs researcher, date, scope, recordedBy and basis',
      }),
    /** Earlier approval records, kept for the audit trail (never rewritten). */
    approvalHistory: z
      .array(z.object({ date: isoDate, status: z.string().min(1), by: z.string().min(1), scope: z.string().min(1), note: z.string().optional() }))
      .default([]),
    profile: z.object({ approvedFields: z.array(z.enum(PROFILE_FIELDS)) }),
    publications: z.object({ approvedKeys: z.array(z.string()), selectedKeys: z.array(z.string()) }),
    researchAreas: z.object({ approvedIds: z.array(z.string()) }),
    projects: z.object({ approvedIds: z.array(z.string()) }),
    courses: z.object({ approvedIds: z.array(z.string()) }),
    talks: z.object({ approvedIds: z.array(z.string()) }),
    /** Method and dataset nodes of the knowledge graph (derived from approved records). */
    methods: z.object({ approvedIds: z.array(z.string()), basis: z.string().min(1) }),
    datasets: z.object({ approvedIds: z.array(z.string()), basis: z.string().min(1) }),
    cv: z.object({ approved: z.boolean() }),
    metrics: z.object({ approved: z.boolean(), source: z.string(), note: z.string() }),
    /** Display policy for Arabic drafts (src/data/translations/ar.json). */
    translations: z.object({ ar: z.object({ showDrafts: z.boolean(), note: z.string().min(1) }) }),
    relationships: z.array(
      z.object({
        from: nodeRef,
        to: nodeRef,
        evidence: z.string().min(1),
        /** Optional verbatim evidence, checked at build against the source record. */
        source: z.object({ field: z.enum(EVIDENCE_FIELDS), quote: z.string().min(2) }).optional(),
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
  /** The official full name, when it differs from the display name (DQ-10: the Arabic full name). */
  officialName: Localized.default({ en: null, ar: null }),
  role: Localized,
  summary: Localized,
  biography: Localized,
  affiliations: z.array(
    z.object({
      organization: RequiredLocalized,
      department: Localized.optional(),
      role: Localized.optional(),
      /** A short qualifier such as branch and teaching location (DQ-07). */
      note: Localized.optional(),
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
  /**
   * Public community / outreach links (not academic identifiers). `kind` names the
   * platform and the kind of space; the home page labels each link with it, and the
   * link has to live on that platform's host.
   */
  community: z
    .array(
      z
        .object({ label: RequiredLocalized, url: httpUrl, kind: z.enum(COMMUNITY_KINDS) })
        .refine((c) => COMMUNITY_HOSTS[c.kind].test(new URL(c.url).hostname), {
          message: "community: the link's host does not match its kind",
        }),
    )
    .default([]),
  /** Direct contact details. Shown only when 'contact' is an approved profile field. */
  contact: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().regex(/^\+?[\d\s-]{7,20}$/).optional(),
    })
    .default({}),
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
  links: z.array(z.object({ label: RequiredLocalized, url: httpUrl })).default([]),
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

/** A statistical method used as a knowledge-graph node (site taxonomy, not a researcher claim). */
export const MethodSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: RequiredLocalized,
  summary: Localized,
});
export type Method = z.infer<typeof MethodSchema>;

export const DatasetSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: RequiredLocalized,
  summary: Localized,
  doi: z.string().regex(/^10\.\d{4,9}\/\S+$/).optional(),
  url: httpUrl,
  licence: z.string().optional(),
});
export type Dataset = z.infer<typeof DatasetSchema>;

/** Arabic drafts: keyed by the exact English text they translate (the fingerprint). */
export const TranslationFileSchema = z.object({
  schemaVersion: z.literal(1),
  language: z.literal('ar'),
  status: z.enum(['draft', 'reviewed']),
  prepared: isoDate,
  method: z.string().min(1),
  reviewedBy: z.string().nullable(),
  entries: z.array(
    z.object({
      ref: z.string().min(1),
      en: z.string().min(1),
      ar: z.string().min(1),
      status: z.enum(['draft', 'reviewed']),
    }),
  ),
});
export type TranslationFile = z.infer<typeof TranslationFileSchema>;

/** Data-quality register: unresolved questions, recorded with sources, never silently resolved. */
/** The named owner's answer to a data-quality question, with where it came from. */
const IssueResponse = z.object({
  date: isoDate,
  by: z.string().min(1),
  /** The answer as given. */
  answer: z.string().min(1),
  /** 'decided' settles the question; 'undetermined' records an answer that does not. */
  outcome: z.enum(['decided', 'undetermined']),
  /** What changed in the data or on the site because of the decision. */
  applied: z.string().min(1).optional(),
  source: z.string().min(1),
});

export const OpenIssuesSchema = z.object({
  schemaVersion: z.literal(1),
  updated: isoDate,
  issues: z.array(
    z
      .object({
        id: z.string().regex(/^DQ-\d{2}$/),
        category: z.enum(['year', 'author-order', 'identity', 'classification', 'metadata', 'relationship', 'documentation']),
        status: z.enum(['open', 'resolved']),
        subjects: z.array(z.string().min(1)),
        question: z.string().min(1),
        /** Changes to the question itself (e.g. narrowed after new evidence), oldest first. */
        history: z.array(z.object({ date: isoDate, by: z.string().min(1), change: z.string().min(1) })).default([]),
        current: z.string().min(1),
        alternatives: z.array(z.string()).default([]),
        sources: z.array(z.string().min(1)).min(1),
        owner: z.string().min(1),
        response: IssueResponse.optional(),
      })
      // Nothing is resolved silently: 'resolved' needs a recorded decision saying what was
      // applied, and a recorded decision cannot be left marked open.
      .refine((i) => (i.status === 'resolved') === (i.response?.outcome === 'decided'), {
        message: "status 'resolved' requires response.outcome 'decided', and a decided response requires status 'resolved'",
      })
      .refine((i) => i.response?.outcome !== 'decided' || !!i.response.applied, {
        message: "a decided response must say what was applied (response.applied)",
      }),
  ),
});
export type OpenIssues = z.infer<typeof OpenIssuesSchema>;
