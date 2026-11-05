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

**Current state (2026-11-05, updated):** the project owner gave a **blanket approval** of all reviewed Phase 2 data on behalf of the researcher. Published now:
- the profile (name, role, summary and biography taken from the researcher's own earlier site; affiliations and education from ORCID, Google Scholar and publisher PDFs; academic identifiers; community links; ORCID keywords as interests);
- all **17** publications from the reviewed export, 3 of them *selected*;
- 4 research areas, with evidence-backed links to their publications;
- 2 teaching entries (the verified Teaching Assistant role and the researcher's own training description);
- a structured CV (no PDF).

Added later the same day, on the project owner's explicit request:
- **contact e-mail and phone** (as published on the researcher's own earlier site), shown on the Contact page;
- **2 talks**, the 2018 and 2019 conference papers. No source says who presented them, so the site does not claim it;
- **3 projects** built from evidenced work: the penalized COM-Poisson papers with their Zenodo dataset and GitHub data repository, the Statistical Analysis – Egypt community, and the self-published statistical guides.

Still excluded:
- the preprint duplicate and the 3 held-back duplicate guide rows;
- Arabic translations of researcher text. None exists, so Arabic pages show these sections in English (as a block with a note where needed).

Where sources disagreed (2 publication years, 1 author order) the exported value follows the documented rule in `research/data-quality-report.md`.

## 2. Never publish

- Records whose Phase 2 status is `candidate`, `conflicted`, `incomplete`, `restricted` or `rejected`, unless the researcher has resolved the issue and approved the record.
- Personal e-mail addresses or phone numbers, **unless** they are explicitly approved as the profile's `contact` field. `npm run qa` allows only the approved contact values and fails on any other e-mail or phone in the build output. The researcher's contact e-mail and phone were approved by the project owner on 2026-11-05.
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

## 5. Imagery

- Every image on the site except the portrait (§5 below) is a **generic, abstract still life** (glass surfaces, sculpted density curves, a lattice, a writing desk, embossed contours). They were generated for this project and are stored in `site/public/images/`.
- Images contain **no people**, no religious or political symbols, no figurative depictions of living beings, no alcohol, and no text. This is a hard rule: it keeps the site clear of modesty and religious-content concerns, and it prevents any image from being read as a claim about the researcher or about other people.
- **Portrait of the researcher.** The researcher's own photograph is published on the site. It was supplied directly by the project owner, and the retouched version that is live keeps the person unchanged — same face, pose and clothing — while the *background only* is replaced with the project's material language (bone plaster, engraved brass sine wave and density curve, hairline grid). Retouching must never reshape the face or body, and a stock or generated face is never presented as the researcher.
  - Files: `site/public/images/portrait.webp` (4:5, About page), `portrait-wide.webp` (16:9 crop, home identity band) and `og.jpg` (1200×630 share card). The untouched original is kept as `portrait.jpg`.
  - The portrait is a page image only. It is **not** the site's logo: the brand mark is drawn from the site's subject matter (a normal-density curve on its axis inside a brass ring) and contains no person, so it can sit in a favicon, a share card or a printed cover without implying anything about anyone.
  - The portrait is the only image on the site that shows a person; every other image stays abstract under the rule above.
- Alt text is bilingual and lives in `site/src/utils/imagery.ts`; it describes the picture literally. Decorative-only backgrounds use `alt=""`.
- **Research metrics** (citations, reads, h-index, i10, publication counts from ResearchGate, OpenAlex, Scopus or Google Scholar) are published only from `site/src/data/approved/research-metrics.json`, always with the platform name and the retrieval date, and never described as an institutional or official measure. Platform counts disagree by design — ResearchGate counts uploads, OpenAlex counts indexed works — so they are labelled, not reconciled, and re-verified at every content review.
- Third-party stock photography is not used. If it ever is, its licence, source and attribution go into `THIRD_PARTY_NOTICES.md` and the image must pass the same content rules above.

## 6. Audit trail

Approvals are auditable through Git history of `site/src/data/approved/` plus the manifest's `lastReviewed`, `reviewedBy` and `researcherApproval.reference` (e.g. a dated e-mail or meeting note reference, never the e-mail address itself).
