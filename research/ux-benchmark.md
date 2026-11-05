# UX Benchmark

> Phase 1 · Ibrahim Taha Axiom · 2026-11-05
> Method: code-level review of templates, components, styles and scripts. The live demos were **not** run in this phase: Ruby is not installed on this machine, and installing dependencies inside `references/` would modify the reference copies. A hands-on review of the live demos is proposed as a Phase 2 step. Scores are 1–5.

## 1. Scorecard

| Dimension | al-folio | Academic Pages | Astro Scholar | Notes |
|---|---|---|---|---|
| First impression / clarity of identity | 4 | 3 | 4 | AS's hero is the most focused. AF's about page is dense but informative. |
| Navigation & wayfinding | 4 | 3 | 4 | AF has the Cmd-K palette. AS has a lean menu, a search modal and a mobile menu. AP has greedy-nav with no search. |
| Publications browsing | **5** | 3 | 2 | AF has inline abstract/BibTeX toggles, author truncation, badges and a filter. |
| Reading experience (articles) | 4 | 2 | **5** | AS has a TOC (mobile and desktop), a copy-code button, tag chips and a calm typography scale. |
| Visual polish & consistency | 4 | 3 | 4 | AS has a few inline styles. AP has 6 palettes, but its visual system is dated. |
| Dark mode quality | 4 | 4 | **5** | AS prevents the flash of the wrong theme and suppresses transitions until ready. AP offers system/light/dark. |
| Mobile behaviour | 4 | 3 | 4 | AP's sidebar collapses behind a "Follow" button. |
| Accessibility posture | **5** (axe CI) | 2 | 4 (claimed Lighthouse 100) | Only AF *enforces* accessibility in CI. |
| Performance posture | 3 (many optional libraries) | 3 (jQuery) | **5** (static, inlined CSS, lazy search) | |
| RTL / Arabic readiness | 3 | 1 | 1 | See §4. |
| Editing experience (author UX) | 3 | 3 | 4 | AS has typed frontmatter. AF needs many config lists. AP needs Python for imports. |

## 2. Patterns worth learning (by journey)

### Visitor: "Who is this researcher?"
- **AS hero:** name, one-line description, photo and 1–2 calls to action, with a short teaser of recent work below.
- **AP identity card:** affiliation, location and academic IDs visible without searching.
- **AF about:** news and selected papers on the landing page signal that the researcher is active.
→ *Ours:* a hero with role and focus, a compact identity strip (affiliation + IDs), then featured work and latest updates.

### Visitor: "Find a specific paper and cite it"
- **AF:** a filter box above the list; each entry shows `abbr` badge, title, authors (own name highlighted, truncated with "+N more"), venue and year, plus buttons `ABS · BIB · PDF · CODE · SLIDES · …`. Panels open inline.
- **AS:** one BibTeX popover at a time with a "Copied!" confirmation (good micro-feedback, but the copied content is incomplete).
- **AP:** a separate page per paper with the formatted citation (good for linking and sharing).
→ *Ours:* AF's list interaction + AP's detail pages + a "Cite" menu with style selection, copy and download (BibTeX, RIS, CSL-JSON).

### Visitor: "Read an article"
- **AS:** sticky TOC on wide screens and collapsible on mobile; code blocks with language label and copy button; author and tag chips; KaTeX rendered at build time.
- **AF:** progress bar, sidebar TOC, Distill layout for long-form papers, related posts.
→ *Ours:* the AS reading layout plus AF's progress bar and related content.

### Visitor: "Search the site"
- **AS:** a modal overlay opened with `/` or a button and closed with `Esc`, with a blurred backdrop and results showing sub-sections.
- **AF:** a Cmd-K command palette that also jumps to socials and actions.
→ *Ours:* one search entry point (`/` and Cmd-K), full-text results grouped by type (publication, article, course…).

### Student or collaborator: "Contact the researcher"
- None of the three provides a real flow: they offer only `mailto:` links and a contact note (AF).
→ *Ours:* typed inquiry flows (collaboration, supervision, speaking, media) with expectations stated up front. This is a clear gap and a product differentiator.

### Researcher: "Update my site"
- **AF:** edit BibTeX and YAML, but features silently disappear when config is incomplete. That is poor feedback.
- **AP:** run notebooks to regenerate Markdown.
- **AS:** edit JSON and Markdown, with schema errors for blog posts only.
→ *Ours:* validated schemas for every collection with clear build errors, and later a CMS (decision D-09).

## 3. Micro-interactions inventory

| Interaction | Where | Keep? |
|---|---|---|
| Author list "+N more" reveal with animation | AF | Yes (without long animation; respect `prefers-reduced-motion`) |
| Abstract / BibTeX inline toggles | AF | Yes |
| Copy BibTeX with "Copied!" feedback | AS | Yes (fixing the incomplete-entry bug) |
| Only one BibTeX panel open at a time | AS | Yes |
| `/` opens search, `Esc` closes | AS | Yes |
| Copy-code button with accessible label | AS | Yes |
| Theme toggle: system / light / dark | AP | Yes |
| No-flash theme bootstrap | AS | Yes |
| Masonry project cards | AF | Optional |
| Scroll progress bar, back-to-top | AF | Yes (articles only) |
| Medium-style image zoom | AF | Optional |
| Talk map | AP | Later |

## 4. RTL & Arabic readiness (detail)

| Check | al-folio | Academic Pages | Astro Scholar |
|---|---|---|---|
| `dir="rtl"` support | ✅ per page via `lang` (`al_rtl`) | ❌ | ❌ |
| Code and math forced LTR inside RTL | ✅ | ❌ | ❌ |
| CSS logical properties | Unknown (in gem) | ❌ Susy floats, physical sides | ❌ 58 physical declarations |
| Translatable UI strings | Partial (site `lang`) | ✅ `ui-text.yml`, no Arabic | ❌ hard-coded English |
| Arabic web font strategy | ❌ | ❌ | ❌ |
| Mixed-direction bibliographies (Arabic + English entries) | ❌ | ❌ | ❌ |
| Arabic-aware search | n/a | n/a | Pagefind supports Arabic stemming/segmenting (to verify in Phase 2) |

**Conclusion:** no reference is RTL-ready as a whole site. If Arabic is required, RTL has to be designed in from the start (logical CSS, `dir` per locale, bidi-safe components, Arabic typography). It cannot be retrofitted from any of the three.

## 5. Things to avoid (UX)
- Very long top navigation and demo-only pages that remain in production (AF `plugins`, `dropdown`; AP `markdown` guide).
- Identity sidebars that compress content on tablets (AP).
- Silent feature absence (AF): the author never learns why something disappeared.
- Inline-styled, non-themable fragments (AS publications).
- Search that does not work in development mode without explanation (AS shows a notice, which is acceptable but should be documented).
