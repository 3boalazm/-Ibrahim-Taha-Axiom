# Deployment & Environment — Vercel

> Decision D-07 (hosting): **Vercel**, approved 2026-11-05. D-07b resolved the same day: a **new** Vercel project `ibrahim-taha-axiom` connected to this repository (the earlier project for the previous site is untouched). Domain (D-07a) is pending.
>
> Current deployment: a temporary EN/AR placeholder (see [`../site/README.md`](../site/README.md)), protected by Vercel Authentication (only team members can view it) and marked `noindex`.

## Layout

```
ibrahim-taha-axiom/          ← Git repository (monorepo-style workspace)
├── site/                    ← Vercel "Root Directory": the future Astro app
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
| Ignored Build Step | from `site/vercel.json`: skip if `site/package.json` is missing |
| Preview deployments | On for pull requests and non-main branches (replaces the gh-pages PR previews used by Astro Scholar) |
| Deployment Protection | Currently Vercel Authentication on all deployments except custom domains. Keep it for previews; make production public only at launch |

## How the Astro app will target Vercel (build phase)

- Adapter: `@astrojs/vercel`. Pages are prerendered (static) by default; only routes that need a server opt out (`export const prerender = false`).
- Server routes expected in the MVP: the contact/collaboration endpoint (D-08). These run as Vercel Functions.
- Bilingual routing (D-03, D-03a) is handled by Astro i18n routing at build time, not by Vercel rewrites.
- Research metrics are produced by a scheduled job into versioned JSON in the repository and read at build time; no API keys are needed in the website runtime.

## Environment variables

The template is [`.env.example`](../.env.example). Real values go in a local `.env` (gitignored) or in **Vercel → Project → Settings → Environment Variables**, scoped per environment:

| Variable | Used by | Production | Preview | Development | Secret? |
|---|---|---|---|---|---|
| `PUBLIC_SITE_URL` | site | ✅ | optional | optional | No |
| `CONTACT_FORM_TO` | site (server route) | ✅ | ✅ (test inbox) | ✅ (test inbox) | Yes |
| `CONTACT_FORM_SECRET` | site (server route) | ✅ | ✅ | ✅ | Yes |
| `PUBLIC_ANALYTICS_ID` | site | ✅ | ❌ | ❌ | No |
| `OPENALEX_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, `INGEST_CONTACT_EMAIL` | local ingestion scripts only | — | — | — | Yes (keys) |

Rules: variables prefixed `PUBLIC_` are exposed to the browser by Astro, so never put secrets in them. Nothing in `.env*` (except the template) is committed.

## Connecting the repository (done)

The project was created with Root Directory `site` and the Astro preset. **Do not import this repository with Vercel's suggested "Services" preset.** It auto-detects the three templates under `references/` and would deploy them as the site. If the project ever needs to be recreated: Add New → Project → import `3boalazm/-Ibrahim-Taha-Axiom` → Root Directory `site` → Application Preset **Astro**.

## Not done yet (by design)
- No custom domain (D-07a).
- No environment variables set on Vercel (none are needed by the placeholder).
- Production stays behind Vercel Authentication until launch.
