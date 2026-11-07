import type { APIRoute } from 'astro';
import { manifestResponse } from '../utils/app-manifest';

/** /site.webmanifest: the English app (src/utils/app-manifest.ts). */
export const GET: APIRoute = () => manifestResponse('en');
