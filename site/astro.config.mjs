// @ts-check
import { defineConfig } from 'astro/config';

// Temporary placeholder configuration. The real site is built in a later phase.
// - English is the default locale (D-03); Arabic lives under /ar/ (D-03a, pending).
// - `site` will come from PUBLIC_SITE_URL once the domain is decided (D-07a).
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || undefined,
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar'],
    routing: { prefixDefaultLocale: false },
  },
});
