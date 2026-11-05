# Website Launch Checklist

> Status on 2026-11-05: **launched, search indexing ON** (approved by the project owner) on the Vercel production domain **https://ibrahim-taha-axiom.vercel.app**. Every page carries `index, follow` with canonical URLs on that domain, `robots.txt` allows crawling and points to `/sitemap-index.xml` (54 URLs with EN/AR hreflang). A custom domain (D-07a) is still pending: see §5.

## 1. Approvals required before indexing

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Open data questions in `research/data-gaps-and-questions.md` (2 conflicting years, 1 author order, Sadat branch, guide types, Arabic name) | researcher | ⏳ Data was published as exported, so these remain open corrections |
| 2 | Profile fields approved for publication | project owner on behalf of the researcher | ✅ 2026-11-05 |
| 3 | Publication list approved (3 *selected* chosen by most-cited + latest first-authored; adjustable) | project owner on behalf of the researcher | ✅ 2026-11-05 |
| 4 | Approved content entered via the two-key gate (`docs/public-content-policy.md`) and `npm run qa` passes | project owner | ✅ 2026-11-05 |
| 4b | Arabic versions of the biography, role, summary, research areas, teaching and CV (confirmed text, not machine translation) | researcher | ⏳ |
| 5 | Canonical domain decided and connected in Vercel (D-07a) | project owner | ⏳ Indexing started on `ibrahim-taha-axiom.vercel.app` meanwhile (owner's decision, 2026-11-05) |
| 6 | Contact channel (D-08) | project owner | ✅ Direct e-mail and phone published (approved 2026-11-05). A contact form remains optional and is not built |
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

## 4. After indexing is enabled (to do by the owner)
- Verify `https://<domain>/robots.txt` and `/sitemap-index.xml`.
- Add the domain to Google Search Console and Bing Webmaster Tools, then submit the sitemap.
- Publication pages emit Google Scholar `citation_*` meta tags. Ask the researcher to keep their Scholar and ORCID profiles linked to the site URL.
- Re-run the Phase 2 metrics job before showing any citation metrics (always dated and source-labelled).

## 5. Moving from vercel.app to a custom domain later
Indexing started on `ibrahim-taha-axiom.vercel.app`. When a custom domain is chosen:
1. Add the domain to the Vercel project and make it the primary production domain. Set `ibrahim-taha-axiom.vercel.app` to **redirect (308/301)** to it, so search engines transfer the existing ranking.
2. In `site/src/data/public-settings/launch.json`, set `canonicalOrigin` to the new domain (keep `allowIndexing: true`), then run `npm run build && npm run qa` and push.
3. In Google Search Console, add the new domain property and use *Change of Address*. Resubmit `/sitemap-index.xml`.
