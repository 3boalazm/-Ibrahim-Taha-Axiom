# Preliminary Architecture Recommendation

> Phase 1 · 2026-11-05 · **Status: direction approved (D-04, 2026-11-05: fresh Astro build).** The library choices in §4 are still candidates, to be validated in Phase 2 spikes.
> Basis: [technical-comparison.md](../research/technical-comparison.md) (scoring A 55 / C 45 / B 39) and [feature-matrix.md](../research/feature-matrix.md).

## 1. Recommendation in one paragraph

Build a **new, static-first site on Astro (direction A)**, written from scratch. Use **Astro Scholar** as the engineering and UX reference, **al-folio** as the academic feature and data-model reference, and **Academic Pages** as the URL and collection-structure reference. Design **bilingual routing and RTL in from day one** (D-03 approved: English default + Arabic). Keep all content as **schema-validated files** in the repo. Produce **research metrics** with a scheduled job that pulls terms-compliant APIs into versioned JSON. Keep a clear seam for **server features later** (contact form endpoint now, CMS and admin later) so we never have to re-platform.

## 2. Why not the alternatives (short)
- **Forking al-folio (B):** gives the most features on day one, but brings a Ruby toolchain (absent on this machine), runtime spread across about 19 external gems, per-page-only RTL, no bilingual routing, and a hard path to an admin dashboard.
- **Full-stack app first (C):** the dashboard would be easiest, but it front-loads hosting, database and auth work before the public site (the main value) exists. We can grow into that from A.

## 3. Proposed logical architecture

```
┌──────────────────────────── Content (Git) ────────────────────────────┐
│ publications (BibTeX / CSL-JSON)   people   projects   courses   talks │
│ articles (MD/MDX)   news   cv (YAML/JSON)   site settings   i18n strings│
└───────────────┬───────────────────────────────────────────────────────┘
                │ validated by typed schemas (fail loudly)
┌───────────────▼──────────────── Build (Node) ─────────────────────────┐
│ BibTeX parser → normalized records → CSL citation rendering            │
│ content collections → pages per locale (en: /, ar: /ar/)               │
│ OG image generation · sitemap · RSS · JSON-LD · citation_* meta        │
│ Pagefind index (per locale)                                            │
└───────────────┬───────────────────────────────────────────────────────┘
                │ static output (+ minimal server endpoints when needed)
┌───────────────▼────────────── Delivery ───────────────────────────────┐
│ Static host / CDN (D-07) · contact endpoint (D-08) · cookieless       │
│ analytics (D-10)                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌────────────── Scheduled jobs (CI) ──────────────┐   ┌──── Later ────┐
│ metrics fetch: OpenAlex / Crossref / Semantic   │   │ Git-based CMS │
│ Scholar / ORCID → data/metrics/*.json (dated)   │   │ → admin app   │
│ link check · axe · Lighthouse · visual tests    │   │ (M6)          │
└─────────────────────────────────────────────────┘   └───────────────┘
```

## 4. Key technical choices (candidates, to validate in Phase 2 spikes)

| Concern | Candidate | Rationale | Validate |
|---|---|---|---|
| Framework | Astro (current major) | Static-first, content collections, i18n routing, adapters for server endpoints | Spike: bilingual skeleton |
| Publication parsing | A maintained BibTeX parser library (no regex) | Avoids AS's defects | Compare 2 libraries against tricky BibTeX (nested braces, LaTeX accents, Arabic titles) |
| Citation rendering | citeproc-js + official CSL styles | Same standard al-folio uses (via jekyll-scholar) | Licence check (CSL styles CC BY-SA 3.0); Arabic and mixed-direction output |
| Search | Pagefind | Static, multilingual, proven in AS | Arabic indexing quality |
| Styling | Design tokens + CSS logical properties (utility framework optional) | RTL-safe from day one | Decided with visual design in a later phase |
| Math | KaTeX at build time | Fast, no client JS | — |
| Images | Built-in image pipeline (sharp) | Responsive and modern formats | — |
| Metrics | CI cron → JSON snapshots → build-time charts | Reproducible, no runtime API keys in the browser | API coverage for the researcher's field |
| Contact | Serverless endpoint or form service + spam protection | No raw email exposure | D-08 |
| Quality gates | Type check, schema validation, link check, axe, Lighthouse CI, Playwright visual tests (LTR and RTL) | al-folio-grade CI | — |
| CMS (later) | Git-based CMS (e.g., Keystatic / Decap / TinaCMS) | Works with file content, no DB | D-09 |

## 5. Phase 2 entry criteria (proposed)
1. Decisions approved: D-03 languages ✅ (English default + Arabic) and D-04 stack ✅ (Astro), both 2026-11-05. Still pending: D-05 (publication source), D-11 (MVP scope).
2. Repository visibility and licence decided (D-12).
3. Technical spikes approved: bilingual RTL skeleton, BibTeX → CSL pipeline with test fixtures (synthetic, clearly marked as test data, never shown on the site), Pagefind Arabic check.

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Building academic features from scratch takes longer than forking | Port the *models* (field vocabularies, page types) directly from the references, and timebox spikes |
| Arabic + English bibliographies render with broken direction | Per-entry `lang` field, `dir="auto"` / bidi isolation, visual tests in both directions |
| Metrics API coverage is weak for some fields | Show only verifiable metrics, label their sources and dates, and allow manual overrides with provenance |
| Scope creep into the admin dashboard | Keep M6 behind the MVP, but design content schemas so a CMS can edit them |
