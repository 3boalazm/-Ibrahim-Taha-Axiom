# Site assistant: screenshots

Both images come from the built site (`site/dist`) in headless Chromium 153, served locally, after fonts loaded, with reduced motion and animations paused. The assistant panel is open with one question and its answer.

**The answers are mocked.** The audit script intercepts `POST /api/chat` in the browser and returns a fixed answer, so no request reached Google and no Gemini output is shown. The images show the layout and styling of a conversation, not the quality of real answers. The live Google call has not been tested from the development sandbox; see [`../../qa-checklist.md`](../../qa-checklist.md#run-for-the-site-assistant-2026-11-07).

The file name gives the language, the viewport width in px and the theme.

| File | What it shows |
| --- | --- |
| `assistant-en-1280-light.jpg` | `/research/` at 1280 × 900. The panel opens above the "Ask about this site" launcher in the bottom-right corner and below the sticky site header. It has the title "Site assistant", "New chat", the close button, and the notice that answers are AI-generated from the site's content (Google Gemini), can be wrong, and that questions are sent to Google. The question "What does Ibrahim research?" is a filled bubble on the right. The answer is a bordered bubble that links Research and Publications; its second paragraph starts "General explanation (not from the site):" |
| `assistant-ar-390-dark.jpg` | `/ar/talks/` at 390 × 844, dark theme, right to left. The round launcher sits bottom-left, and the panel spans the width between the header and the launcher. It has the title «مساعد الموقع», «محادثة جديدة», the close button, and the Arabic notice. The question «هل قدّم أوراق المؤتمرات بنفسه؟» is a filled bubble on the left. The answer says the two papers are in the conference proceedings and that his oral presentation is not confirmed, and links «أوراق المؤتمرات» |

The first version of these screenshots showed two bugs, which the browser checks had missed:
- the messages were unstyled, because Astro's scoped CSS does not reach elements created by a script;
- on phones the panel's top edge sat under the sticky header. At 320 px in Arabic the close button was also pushed off the left edge by an example question that could not wrap.

Both are fixed, and `site/tests/e2e/chat.mjs` now checks them.
