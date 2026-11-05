import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const PAGE_KEYS = ['home', 'about', 'research', 'publications', 'projects', 'teaching', 'talks', 'books', 'cv', 'contact'] as const;

/**
 * Page copy for every section, one Markdown file per page and language.
 * This copy describes the website's sections. Researcher facts never live here.
 * They come only from src/data/approved/ through the public-content gate.
 */
const pages = defineCollection({
  loader: glob({ pattern: '{en,ar}/*.md', base: './src/content' }),
  schema: z.object({
    page: z.enum(PAGE_KEYS),
    lang: z.enum(['en', 'ar']),
    title: z.string().min(1),
    navLabel: z.string().min(1),
    description: z.string().min(40).max(200),
    lead: z.string().min(1),
    emptyTitle: z.string().min(1),
    emptyBody: z.string().min(1),
  }),
});

export const collections = { pages };
