# Studio credit: screenshots

All four images come from the built site (`site/dist`) in headless Chromium 153, served locally, with reduced motion. Each page is scrolled so the studio section sits in the middle of the viewport: the end of the page's content shows above it, and the top of the site's footer below it. The assistant's launcher shows, and so does the install button, after a synthetic `beforeinstallprompt` as in `site/tests/e2e/app.mjs`. Results: [`../../qa-checklist.md`](../../qa-checklist.md#follow-up-a-section-before-the-footer-2026-11-07).

The file name gives the language, the viewport width in px and the site's theme. The section itself looks the same in both themes: it wears the studio's identity, not the site's.

| File | What it shows |
| --- | --- |
| `studio-credit-en-1280-light.jpg` | `/` at 1280 × 800. The home page's last card, then the studio's rounded obsidian panel inside the page width:<br>- at the left, "DEVELOPED BY" in JetBrains Mono capitals, "Aboalazm OS Studio" in Montserrat bold and "[BRAND & WEB · CAIRO / REMOTE]";<br>- at the right, the amber pill "Visit the studio ↗".<br>Below it, the top of the site's pine footer, with the install button and "Ask about this site" over it. |
| `studio-credit-ar-390-light.jpg` | `/ar/` at 390 × 760, right to left: «من تطوير», the Latin name, «[هوية بصرية وويب · القاهرة / عن بُعد]» in IBM Plex Sans Arabic without tracking, and the amber button «زيارة الاستوديو» across the panel, its arrow mirrored. The footer starts below, with the two round floating buttons. |
| `studio-credit-ar-1280-dark.jpg` | `/ar/` at 1280 × 800, dark theme. The panel mirrored: the text at the right, the button at the left; its hairline border sets it off the dark page. The floating buttons are «ثبّت التطبيق» at the bottom right and «اسأل عن الموقع» at the bottom left. |
| `studio-credit-en-320-dark.jpg` | `/` at 320 × 760, dark theme. The panel stacked: the name and the label line on two lines each, the button full width, nothing cut off or overflowing. |
