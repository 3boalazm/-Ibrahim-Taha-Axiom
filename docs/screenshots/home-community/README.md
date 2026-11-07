# The community section and a lighter home page: screenshots

All eight images come from built sites in headless Chromium 153, served locally, with reduced motion and after scrolling through each page. "Before" is `main` at `fb9289f`, `sw.js` VERSION `841fa583c88d`. Today's `main` (`f077c5c`) builds to the same files, so it shows production too. Everything else is this branch. Decision D-23; results: [`../../qa-checklist.md`](../../qa-checklist.md#run-for-the-community-section-and-a-lighter-home-page-2026-11-07).

The file name gives the language, the viewport width in px and the site's theme. The two full pages are at half scale. In them the studio section is painted on purpose: a full-page capture otherwise skips it, because it uses `content-visibility: auto`.

| File | What it shows |
| --- | --- |
| `home-before-en-1280.jpg` | `/` on `main`, 6736 px long. Six research cards with 16:9 images, summaries and two publications each; the graph teaser beside a projects box; three selected publications with chips, Details, DOI, abstract and citation; the lab; the metrics; a "Contents" index; the invitation to write; the studio section. |
| `home-after-en-1280.jpg` | `/` on this branch, 5536 px long. Six compact area tiles (number, title, count of linked publications) over a full-width graph teaser; three compact publications (year, type, title, authors, venue); the lab and the metrics as before; then the new community section, the invitation to write and the studio section. No contents index. |
| `community-en-1280-light.jpg` | The community section on `/`: "Community", the project's name "Statistical Analysis – Egypt", its approved summary, "About the project", and four tiles in one row: Facebook page, Facebook group, Telegram group, WhatsApp group, each with the platform's mark and its host. |
| `community-ar-1280-dark.jpg` | The same on `/ar/`, dark theme, mirrored: the tiles read from the right, «صفحة فيسبوك» first and «مجموعة واتساب» last. The lead is the labelled Arabic draft of the summary. |
| `community-ar-390-light.jpg` | `/ar/` at 390 × 844: one tile per row, each icon at the right and the host under the name from the right edge. |
| `community-en-320-dark.jpg` | `/` at 320 × 640, dark theme: the tiles fit the width, nothing cut off or overflowing. |
| `research-ar-390-light.jpg` | The research section on `/ar/` at 390 × 844: «ستة مجالات، وكل رابطٍ بدليله», six tiles numbered 01 to 06 at the right (the draft titles underlined as drafts), the count under each title, then the graph teaser with its five counts. |
| `publications-en-1280-light.jpg` | The selected publications on `/`, compact: no chips, buttons, abstract or citation block. Those stay on each publication's page and in the publications list. |
