import type { APIRoute } from 'astro';
import { indexingAllowed } from '../utils/content';

/**
 * robots.txt follows src/data/public-settings/launch.json.
 * While allowIndexing is false, all crawling is disallowed.
 */
export const GET: APIRoute = ({ site }) => {
  const body = indexingAllowed
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`
    : `# Search indexing is disabled until launch approval.\n# See docs/website-launch-checklist.md.\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
