# Studio credit: screenshots

All four images come from the built site (`site/dist`) in headless Chromium 153, served locally, with reduced motion. Each page is scrolled to its end. The assistant's launcher shows, and so does the install button, after a synthetic `beforeinstallprompt` as in `site/tests/e2e/app.mjs`. Results: [`../../qa-checklist.md`](../../qa-checklist.md#run-for-the-studio-credit-2026-11-07).

The file name gives the language, the viewport width in px and the site's theme. The band itself looks the same in both themes: it wears the studio's identity, not the site's.

| File | What it shows |
| --- | --- |
| `studio-credit-en-1280-light.jpg` | `/` at 1280 × 800. The site's pine footer ends, then the studio's obsidian band:<br>- at the left, "DEVELOPED BY" in JetBrains Mono capitals, "Aboalazm OS Studio" in Montserrat bold and "[BRAND & WEB · CAIRO / REMOTE]";<br>- at the right, the amber pill "Visit the studio ↗".<br>The install button and "Ask about this site" sit in the room kept below. |
| `studio-credit-ar-390-light.jpg` | `/ar/` at 390 × 844, right to left: «من تطوير», the Latin name, «[هوية بصرية وويب · القاهرة / عن بُعد]» in IBM Plex Sans Arabic without tracking, and the full-width amber button «زيارة الاستوديو» with its arrow mirrored. The two round floating buttons sit below. |
| `studio-credit-ar-1280-dark.jpg` | `/ar/` at 1280 × 800, dark theme. The band mirrored: the text at the right, the button at the left. The floating buttons are «ثبّت التطبيق» at the bottom right and «اسأل عن الموقع» at the bottom left. |
| `studio-credit-en-320-dark.jpg` | `/` at 320 × 760, dark theme. The band stacked, with the button full width and nothing cut off or overflowing. |
