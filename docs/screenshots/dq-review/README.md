# Data-quality decisions: screenshots

All images come from the built site (`site/dist`) in headless Chromium 153, served locally, taken after fonts loaded and all animations finished. They show what the researcher's Data Quality Review decisions (2026-11-06) changed on the pages; the decisions themselves are in [`../../data-quality-register.md`](../../data-quality-register.md), and the test and audit results in [`../../qa-checklist.md`](../../qa-checklist.md#run-for-the-data-quality-decisions-2026-11-06).

Crops of the relevant elements. The file name gives the page, the viewport width in px and the theme.

## Name (DQ-10)

| File | What it shows |
| --- | --- |
| `name-ar-home-320-light.jpg` | Arabic home page at 320 px: the approved Arabic name «ابراهيم محمد طه» wraps onto two lines with Arabic line spacing (1.3), so the descender of the first line stays clear of the second |
| `name-ar-home-1280-dark.jpg` | Arabic home page at 1280 px, dark theme: the name on one line in the Arabic display face, without letter-spacing |
| `name-ar-about-390-light.jpg` | Arabic profile page: the name, then «الاسم الرسمي» with the official full name «ابراهيم محمد ابراهيم محمود طه» |
| `name-en-about-320-dark.jpg` | English profile page at 320 px: "Official name in Arabic" with the Arabic name kept whole on its own line (an isolated right-to-left unit) instead of breaking after its first word |
| `name-en-about-1280-light.jpg` | English profile page at 1280 px: the label and the Arabic name on one line |

## Affiliation note (DQ-07)

| File | What it shows |
| --- | --- |
| `affiliation-ar-about-390-light.jpg` | Arabic profile page: the Sadat Academy affiliation with the researcher's own wording «التعيين في فرع طنطا، والتدريس في المقر الرئيسي بالمعادي في القاهرة». It is approved text, so it carries no draft marking. The organization, department and role above it are still drafts (`data-draft`): the organization shows the inline draft underline, which the site draws on inline text only, and the page-level draft note at the top of the page covers the department and role |
| `affiliation-en-home-1280-light.jpg` | English home page, identity panel: "Appointed to the Tanta branch; teaches at the main campus in Maadi, Cairo" under the organization |
| `affiliation-ar-home-390-dark.jpg` | Arabic home page, identity panel, dark theme: the same note in Arabic |
