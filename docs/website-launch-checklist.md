# Website Launch Checklist

> Status on 2026-11-05: **content approved and published, search indexing OFF.** The site at https://ibrahim-taha-axiom.vercel.app shows the approved profile, publications, research areas, teaching and CV. Every page still carries `noindex, nofollow` and `robots.txt` disallows all crawling. **SEO launch is not complete while indexing is off.**

## 1. Approvals required before indexing

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Open data questions in `research/data-gaps-and-questions.md` (2 conflicting years, 1 author order, Sadat branch, guide types, Arabic name) | researcher | ⏳ Data was published as exported, so these remain open corrections |
| 2 | Profile fields approved for publication | project owner on behalf of the researcher | ✅ 2026-11-05 |
| 3 | Publication list approved (3 *selected* chosen by most-cited + latest first-authored; adjustable) | project owner on behalf of the researcher | ✅ 2026-11-05 |
| 4 | Approved content entered via the two-key gate (`docs/public-content-policy.md`) and `npm run qa` passes | project owner | ✅ 2026-11-05 |
| 4b | Arabic versions of the biography, role, summary, research areas, teaching and CV (confirmed text, not machine translation) | researcher | ⏳ |
| 5 | Canonical domain decided and connected in Vercel (D-07a) | project owner | ⏳ |
| 6 | Contact channel (D-08) | project owner | ✅ Direct e-mail and phone published (approved 2026-11-05). A contact form remains optional and is not built |
| 7 | Visitor analytics decision (D-10). None is installed | project owner | ⏳ |
| 8 | Final review of the English and Arabic copy in `site/src/content/` | researcher + owner | ⏳ |
| 9 | Visual review of the redesigned pages (home, about, research, publications, teaching, contact, 404) on a phone and a laptop, in both languages and both themes | project owner | ⏳ |
| 10 | A short-launch note for social sharing: confirm the share image `site/public/images/og.jpg` and the wording of the home title/lead | project owner | ⏳ |

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

## 2b. Standing content rules for the visual layer

- Images stay **abstract and impersonal** (`docs/public-content-policy.md` §5). No portrait of the researcher is published until a supplied photograph is approved.
- The figures band on the home page must keep matching the approved data counts: publications, research areas, projects come from the data files; "450+ statistical reports" comes from the researcher's own biography text. If a count changes, the band changes with it — never edit a figure by hand.
- English and Arabic share one design; Arabic runs RTL from `dir="rtl"` with no mirrored CSS, and Arabic typography uses Noto Kufi Arabic for display and IBM Plex Sans Arabic for interface text.

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
