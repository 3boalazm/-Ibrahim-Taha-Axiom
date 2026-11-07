# Reviewed Arabic text, the community section after the hero, and the labelled install button: screenshots

All ten images come from built sites in headless Chromium 153, served locally, in the light theme with reduced motion, after scrolling through each page. "Before" is `main` at `5a574dd` (production), `sw.js` VERSION `56e28d9172c7`. "After" is this branch, VERSION `9631f55096eb`. Decision D-24; results: [`../../qa-checklist.md`](../../qa-checklist.md#run-for-the-reviewed-arabic-text-the-community-section-and-the-install-label-2026-11-07).

The file name gives the language, the viewport width in px and what is shown. The install button only appears once the browser offers to install the site, and the sandbox's Chromium never does that by itself. For the install shots, the page received a simulated `beforeinstallprompt` event, the same one the end-to-end tests use.

| File | What it shows |
| --- | --- |
| `home-ar-390-top-before.jpg` | `/ar/` at 390 × 844 on `main`: the hero with a dotted draft underline under «إحصائي وباحث أكاديمي», then the note «ترجمة مبدئية — لم يراجعها الباحث بعد.», then the portrait of the identity panel. |
| `home-ar-390-top-after.jpg` | The same on this branch: no underline and no note. The community section follows the hero directly: «المجتمع», «Statistical Analysis – Egypt», the Arabic summary with no draft label, «عن المشروع», and the four tiles (Facebook page and group, Telegram group, WhatsApp group). The identity panel comes after it. |
| `home-en-1280-top-after.jpg` | `/` at 1280 × 800 on this branch: the hero, then the community section with its four tiles in one row, then "Academic identity". |
| `install-ar-390-before.jpg` | The bottom of `/ar/` at 390 × 844 on `main`: the install button is a round icon at the bottom right, opposite the assistant's round button. |
| `install-ar-390-after.jpg` | The same on this branch: the button now reads «حمّل التطبيق» next to the download icon, still at the bottom right and clear of the assistant's button. |
| `install-en-1280-after.jpg` | The bottom-left corner of `/` at 1280 × 800 on this branch: "Download the app" next to the icon. In English the button is at the bottom left, and the assistant at the bottom right. |
| `lab-ar-1280-head-before.jpg` | The head of `/ar/lab/` at 1280 on `main`: the title, the introduction, the methodological disclaimer, and under it the draft note «ترجمة مبدئية — لم يراجعها الباحث بعد.». |
| `lab-ar-1280-head-after.jpg` | The same on this branch: the methodological disclaimer stays; the draft note is gone. |
| `footer-ar-1280-before.jpg` | The Arabic footer on `main`, with the line «حالة الترجمة»: the explanation of the draft label, the original-language sentence and the count «(83 نصًّا مبدئيًا بانتظار المراجعة.)». |
| `footer-ar-1280-after.jpg` | The Arabic footer on this branch: only «عناوين المنشورات وأسماء الدوريات والأشخاص تبقى بلغتها الأصلية.», with no label and no count. |
