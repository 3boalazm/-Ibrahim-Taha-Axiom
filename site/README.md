# site/ — future Astro website (deployed on Vercel)

This folder will hold the Astro app once the build phase starts. **It contains no website code yet** — only the Vercel configuration, so a Vercel project can be connected now without producing failed or empty deployments.

- `vercel.json`: Astro preset, `npm ci` / `npm run build`, trailing slashes (matching the IA draft), baseline security headers.
- **Ignored build step:** while `site/package.json` does not exist, every Git push is skipped by Vercel ("Canceled by Ignored Build Step"). The first commit that adds the Astro app starts real deployments automatically.

Setup steps and settings are documented in [`../docs/deployment.md`](../docs/deployment.md).
