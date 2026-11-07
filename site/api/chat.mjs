/**
 * Vercel Function: POST /api/chat, the site assistant. The logic is in server/chat-core.mjs;
 * the site content it answers from is server/knowledge.mjs.
 *
 * Needs the GEMINI_API_KEY environment variable in the Vercel project (never in the code).
 * Optional: GEMINI_MODEL (default gemini-2.5-flash) and CHAT_ALLOWED_ORIGINS (comma-separated
 * extra origins, e.g. a custom domain). Without a key it answers 503 "not_configured".
 */
import { handleChat } from '../server/chat-core.mjs';
import knowledge from '../server/knowledge.mjs';

export default {
  fetch(request) {
    return handleChat(request, { env: process.env, knowledge });
  },
};
