# Public Content Policy — what the website may show

> Applies to `site/` (the Astro website deployed on Vercel). Effective 2026-11-05.
> Principle: **nothing about the researcher appears on the website unless it has been explicitly approved for publication.** A record being *verified* in the Phase 2 research data is **not** the same as being approved.

## 1. The two-key gate

A researcher-specific item is rendered only when **both** of these are true:

1. It exists in an approved data file under `site/src/data/approved/`.
2. Its key or id is listed in `site/src/data/approved/public-content.manifest.json`.

The gate lives in `site/src/utils/content.ts` (profile, research areas, projects, courses, talks, CV) and `site/src/utils/publications.ts` (BibTeX). The build **fails** with a clear message if the manifest approves something that does not exist, if data is malformed, or if a DOI or URL is invalid. Nothing is silently dropped.

| File | Holds | Approved by |
|---|---|---|
| `approved/public-content.manifest.json` | The explicit list of approved items + review metadata | `profile.approvedFields`, `publications.approvedKeys` / `selectedKeys`, `researchAreas` / `projects` / `courses` / `talks.approvedIds`, `cv.approved`, `relationships` |
| `approved/publications.bib` | Approved BibTeX entries (single source for publications and books) | key must be in `publications.approvedKeys` |
| `approved/profile.json` | Name, role, summary, biography, affiliations, education, identifiers, interests, author-name match | field must be in `profile.approvedFields` |
| `approved/research-areas.json`, `projects.json`, `courses.json`, `talks.json` | Bilingual records (`{ "en": …, "ar": … }`) | id must be in the matching `approvedIds` |
| `approved/cv.json` | Structured CV + optional PDF path | `cv.approved: true` |
| `public-settings/launch.json` | Site name, canonical origin, indexing switch | project owner (not researcher data) |

**Current state (2026-11-05):** every approval list is empty. The site shows its full structure with honest "awaiting approval" states and **no researcher-specific records.**

## 2. Never publish

- Records whose Phase 2 status is `candidate`, `conflicted`, `incomplete`, `restricted` or `rejected`, unless the researcher has resolved the issue and approved the record.
- Personal e-mail addresses or phone numbers (the QA script fails the build output if one appears).
- Unpublished manuscripts, restricted or paywalled PDFs, or publisher PDFs without a compatible licence. Link to the DOI instead. A `pdf` link may point only to a legitimate open-access copy whose licence allows linking (or to a file the researcher owns the rights to, placed in `site/public/files/`).
- Invented or inferred content: biography, qualifications, affiliations, awards, research interests, teaching history, abstracts, translations, DOIs or citation metrics.
- Inferred research lines (from Phase 2 `projects.candidates.json`) presented as facts. They become research areas only after the researcher confirms and names them.
- Anything from `data-staging/`. The site never reads that folder, and it is gitignored.

## 3. How to approve content

### A publication
1. Review the entry with the researcher. Resolve its open conflicts first (e.g. year, author order): see `research/data-gaps-and-questions.md`.
2. Copy the reviewed entry into `site/src/data/approved/publications.bib`. Keep the original title, author order and DOI exactly, and keep `langid`.
3. Add its key to `publications.approvedKeys`. Add it to `selectedKeys` too if it should be featured.
4. Set `lastReviewed` (ISO date) and `reviewedBy` in the manifest.
5. `cd site && npm run build && npm run qa`, then commit.

### Profile fields
Fill the field in `profile.json` (both languages where an approved translation exists, otherwise `null`), then add the field name to `profile.approvedFields`. `authorMatch` (for example `{ "last": "Taha", "firstInitial": "I" }`) only highlights the researcher's name in author lists. It needs approval like any other field.

### Relationships (publication ↔ research area / project)
Add `{ "from": "publication:<key>", "to": "area:<id>", "evidence": "<why this link is true>" }` to `relationships`. Links without evidence are rejected by the schema.

## 4. Languages

- English is the default; Arabic is under `/ar/` with full RTL.
- Publication titles, abstracts, author names, journal names and DOIs stay in their **original language**. They are never translated.
- Only **confirmed** translations go into the `ar` / `en` fields. Machine translation is not allowed in approved data.
- When a field exists in one language only, the other-language page shows it in its original language with a visible "available in … only" note.

## 5. Audit trail

Approvals are auditable through Git history of `site/src/data/approved/` plus the manifest's `lastReviewed`, `reviewedBy` and `researcherApproval.reference` (e.g. a dated e-mail or meeting note reference, never the e-mail address itself).
