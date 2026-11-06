/**
 * Static search index, one file per language: /search-index/en.json and
 * /search-index/ar.json. Generated at build time from approved data only.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { buildSearchIndex } from '../../utils/search-index';
import type { Lang } from '../../utils/schema';

export const getStaticPaths: GetStaticPaths = () => [{ params: { lang: 'en' } }, { params: { lang: 'ar' } }];

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Lang;
  const records = await buildSearchIndex(lang);
  return new Response(JSON.stringify({ v: 1, lang, records }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
