# Website Launch Checklist

> Status on 2026-11-05: **publicly accessible, search indexing OFF.** The site at https://ibrahim-taha-axiom.vercel.app is reachable by anyone with the link, but every page carries `noindex, nofollow` and `robots.txt` disallows all crawling. **SEO launch is not complete while indexing is off.**

## 1. Approvals required before indexing

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Researcher answers the questions in `research/data-gaps-and-questions.md` (identity, years, author order, branch, guides…) | researcher | ⏳ |
| 2 | Researcher approves the profile fields to publish (name, role, bio, affiliations, identifiers, interests) | researcher | ⏳ |
| 3 | Researcher approves the publication list (and which are *selected*) | researcher | ⏳ |
| 4 | Approved content entered via the two-key gate (`docs/public-content-policy.md`) and `npm run qa` passes | project owner | ⏳ |
| 5 | Canonical domain decided and connected in Vercel (D-07a) | project owner | ⏳ |
| 6 | Contact channel decided (D-08). Until then the Contact page shows no form and no personal details | project owner | ⏳ |
| 7 | Visitor analytics decision (D-10). None is installed | project owner | ⏳ |
| 8 | Final review of the English and Arabic copy in `site/src/content/` | researcher + owner | ⏳ |

## 2. The one-step change that enables indexing

Edit **one file**, `site/src/data/public-settings/launch.json`:

```json
{
  "siteName": "Ibrahim Taha Axiom",
  "canonicalOrigin": "https://YOUR-CONFIRMED-DOMAIN",
  "allowIndexing": true
}
```

Commit and push. On the next deployment:
- every page switches from `noindex, nofollow` to `index, follow`;
- `robots.txt` switches to `Allow: /` and points to `/sitemap-index.xml`;
- canonical URLs, hreflang and the sitemap use `canonicalOrigin`.

The build refuses `allowIndexing: true` without a `canonicalOrigin`, so the domain must be set in the same edit (or earlier). To pause indexing again, set `allowIndexing` back to `false`.

## 3. Pre-launch QA (run every time)

```bash
cd site
npm ci
npm run build
npm run qa
```

`npm run qa` fails on:
- broken internal links;
- a wrong `lang`/`dir`, a missing title, description, canonical or hreflang;
- a wrong language-switch target, a robots meta or `robots.txt` that doesn't match the launch setting;
- private/staging files in `dist/`;
- personal e-mail addresses or phone numbers;
- WCAG contrast failures in the design tokens.

Manual checks: 375 px and desktop in EN and AR, light and dark, keyboard-only navigation, axe-core (0 violations at Phase 3 handoff).

## 4. After indexing is enabled
- Verify `https://<domain>/robots.txt` and `/sitemap-index.xml`.
- Add the domain to Google Search Console and Bing Webmaster Tools, then submit the sitemap.
- Publication pages emit Google Scholar `citation_*` meta tags. Ask the researcher to keep their Scholar and ORCID profiles linked to the site URL.
- Re-run the Phase 2 metrics job before showing any citation metrics (always dated and source-labelled).
