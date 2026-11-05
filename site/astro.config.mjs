// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Canonical origin: PUBLIC_SITE_URL (Vercel env) > launch.json canonicalOrigin
// > the existing Vercel production alias (until the domain is decided, D-07a).
const launch = JSON.parse(readFileSync(new URL('./src/data/public-settings/launch.json', import.meta.url), 'utf8'));
const site = process.env.PUBLIC_SITE_URL || launch.canonicalOrigin || 'https://ibrahim-taha-axiom.vercel.app';

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar'],
    routing: { prefixDefaultLocale: false },
  },
  // `npm run dev` must accept the sandbox preview host, which is proxied
  // through a different origin than localhost. Development only: Vercel builds
  // static output and never runs this server.
  vite: {
    server: { host: true, allowedHosts: true },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', ar: 'ar' } },
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
