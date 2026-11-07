# Installable app: screenshots

All five images come from the built site (`site/dist`) in headless Chromium 153, served locally, with reduced motion.

**The install button is simulated, the same way `site/tests/e2e/app.mjs` does it:** a synthetic `beforeinstallprompt`, the event Chromium browsers send when a site can be installed. "Offline" means the local server was stopped after a few pages had been opened.

No real phone was used, and nothing was installed. Results: [floating install button](../../qa-checklist.md#run-for-the-floating-install-button-2026-11-07); [offline page](../../qa-checklist.md#run-for-the-installable-app-2026-11-07).

The file name gives the language, the viewport width in px and the theme.

| File | What it shows |
| --- | --- |
| `install-button-ar-390-light.jpg` | `/ar/` at 390 × 844. The round green install button, with its download icon, at the bottom right. The assistant's round launcher is opposite it at the bottom left, on the same line |
| `install-button-ar-390-dark.jpg` | `/ar/publications/` at 390 × 844, dark theme. The same pair: the light-green install button at the bottom right, the assistant's launcher at the bottom left |
| `install-button-en-1280-light.jpg` | `/` at 1280 × 800. The pill "Install the app" at the bottom left and "Ask about this site" at the bottom right, level with each other |
| `offline-en-1280-light.jpg` | `/lab/`, never opened, with the server stopped. The offline page shows the mark, "You’re offline", the explanation, "Try again" and "Home", and lists the four saved English pages: Teaching, Research, Publications, Home |
| `offline-ar-390-dark.jpg` | `/ar/talks/`, never opened, offline, at 390 × 844, dark theme. The Arabic offline page «أنت غير متصل بالإنترنت», right to left, with «إعادة المحاولة» and «الرئيسية», listing the saved Arabic pages only: المنشورات، البحث، الرئيسية |

The offline page uses the system fonts on purpose: the worker builds it itself, without downloading the site's web fonts.

The two offline shots are from the first version (`35cb7e3`). The service worker builds the offline page itself, without the install button, so the change of button did not alter it.
