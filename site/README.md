# site/ — Astro website (deployed on Vercel)

**Current state: temporary placeholder.** Two pages ("under construction"): English at `/` and Arabic (RTL) at `/ar/`. They exist only to verify the deployment pipeline end to end. They carry no researcher content and are **not** the final design, which is built in a later phase.

- Astro 7.3.8 (static output), Node 26.x (`engines`).
- `astro.config.mjs`: English default, Arabic under `/ar/` (D-03; URL scheme D-03a still pending), trailing slashes.
- `public/robots.txt` blocks all crawlers and every page has `noindex`. **Remove both at launch.**
- `vercel.json`: Astro preset, `npm ci` / `npm run build`, security headers, and an ignored build step that skips the build when `package.json` is missing or when a commit changes nothing under `site/`.

```bash
npm ci
npm run dev      # http://localhost:4321/
npm run build    # output in dist/
```

Deployment settings and environment variables: [`../docs/deployment.md`](../docs/deployment.md).
