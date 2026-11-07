/**
 * /chat/knowledge.json: the site assistant's knowledge, generated from approved content
 * at build time (see src/utils/chat-knowledge.ts). Public, like every page it summarises.
 */
import type { APIRoute } from 'astro';
import { buildKnowledge } from '../../utils/chat-knowledge';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await buildKnowledge()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
