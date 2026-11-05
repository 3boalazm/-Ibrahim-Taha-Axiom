# Licensing & Reuse Review

> Phase 1 · Ibrahim Taha Axiom · 2026-11-05
> This is an engineering review, **not legal advice**. Licences were read from each project's `LICENSE` file and from `package-lock.json` metadata. Items marked *verify* were not confirmable from the snapshots.

## 1. Project licences

| Reference | Licence | Copyright line in `LICENSE` | Notes |
|---|---|---|---|
| al-folio | MIT | © 2025 Maruan Al-Shedivat | Runtime gems (`al_*`, `al_folio_*`) are separate packages, and their licences are not in this snapshot (*verify* before depending on them). |
| Academic Pages | MIT | © 2016 Michael Rose | Inherited from Minimal Mistakes. Later contributors' changes are distributed under the same file. The README mentions `LICENSE.md`, but the file is `LICENSE`. |
| Astro Scholar | MIT | © 2026 Shravan Goswami | |

**What MIT requires:** if we copy a "substantial portion" of code, we must keep the copyright notice and permission text with it. Learning from patterns and writing our own implementation creates no obligation. Crediting the references in an acknowledgements file is still good practice.

**Policy proposed for this project:**
1. Default: **re-implement**, do not copy. The references are study material.
2. If a snippet is copied (even adapted), record it in `THIRD_PARTY_NOTICES.md` with source path, upstream URL, commit and licence text.
3. Never copy demo content, images, media or text from the references.

## 2. Third-party components bundled in the references

| Component | Found in | Licence | Implication if we use it ourselves |
|---|---|---|---|
| Font Awesome Free | AP `assets/webfonts`, `_sass/vendor/font-awesome`; AF via `al_icons` CDN | Icons CC BY 4.0, fonts SIL OFL 1.1, code MIT | Attribution for icons, and keep the OFL with font files |
| Academicons | AP `assets/fonts`, `assets/css`; AF via CDN | SIL OFL 1.1 (fonts) | Keep the OFL with font files; *verify* the CSS licence |
| Susy grid | AP `_sass/vendor/susy` | BSD-3-Clause | Not planned for reuse |
| Breakpoint (Sass) | AP `_sass/vendor/breakpoint` | MIT/GPL (*verify*) | Not planned for reuse |
| jQuery | AP `package.json` | MIT | Not planned |
| Leaflet.markercluster | AP `talkmap/leaflet_dist` | MIT | Possible later (talk map) |
| Plotly.js, Mermaid | AP (CDN), AF via `al_charts` | MIT | Fine |
| Atkinson Hyperlegible | AS `public/fonts` | SIL OFL 1.1 | Keep the OFL with font files; does not cover Arabic |
| Pagefind | AS devDependency | MIT | Fine |
| satori, resvg-js | AS dependency | **MPL-2.0** (file-level copyleft) | Fine to use as unmodified build tools. Modifications to their files must stay MPL. |
| sharp | AS dependency | Apache-2.0 | Keep the NOTICE if we redistribute |
| libvips binaries (via sharp) | AS transitive | **LGPL-3.0-or-later** | Used only at build time and dynamically loaded. Do not statically bundle. Keep notices if we redistribute binaries. |
| jekyll-scholar, citeproc and CSL styles | AF | jekyll-scholar MIT. Official CSL styles are **CC BY-SA 3.0**. citeproc licence *verify* | If we ship CSL style files, keep attribution and the share-alike licence for those files. |
| RenderCV | AF `requirements.txt` | MIT (*verify*) | Possible CV PDF tool |

Astro Scholar npm tree (from `package-lock.json`): 379 MIT, 14 Apache-2.0, 14 MPL-2.0, 14 packages with LGPL-3.0 components (all libvips platform binaries), and the rest ISC/BSD/CC0/BlueOak/Python-2.0/0BSD. **No GPL or AGPL packages were found.**

## 3. Content and media: do not reuse

| Item | Reference | Reason |
|---|---|---|
| Demo bios, posts, projects, publications (Einstein, Nietzsche, Kant…) | All | Placeholder content; we must not create fake research data |
| `public/luffy.webp` | AS | Third-party character artwork, most likely copyrighted |
| Wikipedia portrait URLs in `authors.json` | AS | Mixed licences per image |
| Unsplash photos, Pexels video, Pixabay audio, tutorial video, Einstein CV PDF | AF `assets/` | Third-party media with their own licences, and irrelevant to us |
| Theme screenshots, profile placeholders, sample PDFs | AP `images/`, `files/` | Template demo assets |
| Brand names and logos ("al-folio", "Academic Pages", "Astro Scholar") | All | Not ours to use as branding |

## 4. Third-party services & terms of use

| Service used by a reference | Risk | Recommendation |
|---|---|---|
| Google Scholar scraping (`scholarly`, AF `update-citations.yml`) | Automated access is against Scholar's terms; scrapes are frequently blocked or CAPTCHA'd | **Avoid.** Use OpenAlex (CC0 data), Crossref, Semantic Scholar API (licence terms apply) and ORCID public API. Link to the Scholar profile instead. |
| Altmetric / Dimensions badge embeds (AF) | Embed terms and possible tracking | Optional. Review terms, and load only with consent if they set cookies. |
| github-stats / profile-trophy (AF) | Free instances go offline (trophies already dead) | Avoid runtime dependence; precompute at build time if needed |
| Disqus / Facebook comments (AP, AF) | Tracking, GDPR | Prefer Giscus or no comments |
| Google Analytics (AP, AF) | Cookies and consent | Prefer cookieless analytics (Umami, Plausible, Cloudflare) |
| Loops newsletter (AF) | Personal data processing | Only if a newsletter is approved; needs a privacy notice |

## 5. Our own project licence (open question)

Our repository's licence and visibility (public or private, MIT or all-rights-reserved for content) are undecided. Code and content can be licensed separately (for example code under MIT and content under CC BY-NC or all rights reserved). See decision D-12.
