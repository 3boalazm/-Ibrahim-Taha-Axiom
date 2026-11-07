# Deployment & Environment — Vercel

> Decision D-07 (hosting): **Vercel**, approved 2026-11-05. D-07b resolved the same day: a **new** Vercel project `ibrahim-taha-axiom` connected to this repository (the earlier project for the previous site is untouched). Domain (D-07a) is pending.
>
> Current deployment: the bilingual website with approved researcher content ([`public-content-policy.md`](public-content-policy.md)), live and **open to search engines** at **https://ibrahim-taha-axiom.vercel.app** (canonical origin, `index, follow`, sitemap in `robots.txt`). See [`website-launch-checklist.md`](website-launch-checklist.md) for moving to a custom domain later. Per-deployment and preview URLs require a Vercel login and are not indexed.

## Layout

```
ibrahim-taha-axiom/          ← Git repository (monorepo-style workspace)
├── site/                    ← Vercel "Root Directory": the Astro website
│   └── vercel.json          ← build config + ignored-build-step guard
├── scripts/ingestion/       ← local research-data tooling (never deployed)
├── data-staging/            ← local only, gitignored (never deployed)
├── references/ research/ product/ docs/   ← workspace material (never deployed)
```

Only `site/` is deployed. Everything else in the repository is outside the Vercel Root Directory and is never uploaded as part of the website build output.

## Vercel project settings

| Setting | Value |
|---|---|
| Git repository | `3boalazm/-Ibrahim-Taha-Axiom` |
| Production branch | `main` |
| Root Directory | `site` |
| Framework preset | Astro (also set in `site/vercel.json`) |
| Install / Build command | `npm ci` / `npm run build` (from `site/vercel.json`) |
| Node.js version | 26.x (pinned with `engines.node` in `site/package.json`) |
| Ignored Build Step | from `site/vercel.json`: skip if `site/package.json` is missing **or if the commit changes nothing under `site/`** (`git diff --quiet HEAD^ HEAD -- .`) |
| Preview deployments | On for pull requests and non-main branches (replaces the gh-pages PR previews used by Astro Scholar) |
| Deployment Protection | Vercel Authentication on previews and per-deployment URLs. The production `*.vercel.app` alias is public, so never deploy unreviewed researcher data to `main` |
| Skip unaffected deployments | Project setting is on, but it has no effect in this repo layout (it targets monorepo workspaces). Skipping is done by the Ignored Build Step above |

## How the Astro app targets Vercel

- **Now:** static output (`astro build` → `dist/`), served by Vercel's CDN with the Astro preset, plus one Vercel Function: `site/api/chat.mjs`, the site assistant (`POST /api/chat`).
  - It uses the Node.js runtime, with `maxDuration` 30 s in `vercel.json`, and its logic lives in `site/server/`.
  - Vercel builds the files in the Root Directory's `api/` folder as functions alongside the framework output, so no Astro adapter is needed. `robots.txt` and the sitemap are generated at build time from `site/src/data/public-settings/launch.json`.
- **Later (D-08):** when the contact channel is decided, add `@astrojs/vercel` and opt only the contact endpoint out of prerendering (`export const prerender = false`). It must never report success without actually delivering the message.
- Bilingual routing (D-03, D-03a: English unprefixed, Arabic under `/ar/`) is handled by Astro at build time, not by Vercel rewrites.
- Research metrics, if approved, are produced by a scheduled job into versioned JSON in the repository and read at build time. No API keys are needed for the metrics. The website's only runtime secret is the assistant's `GEMINI_API_KEY`.
- `PUBLIC_SITE_URL` (optional Vercel env var) overrides the canonical origin. Otherwise `launch.json` → `canonicalOrigin` is used, falling back to `https://ibrahim-taha-axiom.vercel.app`.

## Release procedure
1. `cd site && npm ci && npm run build && npm run qa` (all checks must pass).
2. Commit and push to `main`. Vercel builds only when `site/` changed (ignored build step).
3. Verify `https://ibrahim-taha-axiom.vercel.app/`, `/ar/`, `/robots.txt`.

## Environment variables

The template is [`.env.example`](../.env.example). Real values go in a local `.env` (gitignored) or in **Vercel → Project → Settings → Environment Variables**, scoped per environment:

| Variable | Used by | Production | Preview | Development | Secret? |
|---|---|---|---|---|---|
| `PUBLIC_SITE_URL` | site | ✅ | optional | optional | No |
| `CONTACT_FORM_TO` | site (server route) | ✅ | ✅ (test inbox) | ✅ (test inbox) | Yes |
| `CONTACT_FORM_SECRET` | site (server route) | ✅ | ✅ | ✅ | Yes |
| `PUBLIC_ANALYTICS_ID` | site | ✅ | ❌ | ❌ | No |
| `GEMINI_API_KEY` | site assistant (`site/api/chat.mjs`) | ✅ | ✅ | optional | Yes |
| `GEMINI_MODEL` | site assistant (default `gemini-2.5-flash`) | optional | optional | optional | No |
| `CHAT_ALLOWED_ORIGINS` | site assistant (extra origins, comma-separated; the deployment's own host and the production address are always allowed) | optional | optional | optional | No |
| `OPENALEX_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, `INGEST_CONTACT_EMAIL` | local ingestion scripts only | — | — | — | Yes (keys) |

Rules: variables prefixed `PUBLIC_` are exposed to the browser by Astro, so never put secrets in them. Nothing in `.env*` (except the template) is committed.

## Connecting the repository (done)

The project was created with Root Directory `site` and the Astro preset. **Do not import this repository with Vercel's suggested "Services" preset.** It auto-detects the three templates under `references/` and would deploy them as the site. If the project ever needs to be recreated: Add New → Project → import `3boalazm/-Ibrahim-Taha-Axiom` → Root Directory `site` → Application Preset **Astro**.

## Not done yet (by design)
- No custom domain (D-07a).
- `GEMINI_API_KEY` must be added on Vercel by the owner, for Production and Preview, followed by a redeploy. Until then the assistant shows a "not configured" notice and the rest of the site is unaffected. The site needs no other variable.

Search indexing has been on since launch (2026-11-05): `allowIndexing: true` in `site/src/data/public-settings/launch.json`. See [website-launch-checklist.md](website-launch-checklist.md) to pause it.
