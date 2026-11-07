import type { APIRoute } from 'astro';
import { manifestResponse } from '../../utils/app-manifest';

/** /ar/site.webmanifest: the Arabic app, which starts at /ar/ (src/utils/app-manifest.ts). */
export const GET: APIRoute = () => manifestResponse('ar');
