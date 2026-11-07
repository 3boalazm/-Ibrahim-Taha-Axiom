# Installable app: screenshots

All six images come from the built site (`site/dist`) in headless Chromium 153, served locally, with reduced motion.

**The install states are simulated, the same way `site/tests/e2e/app.mjs` simulates them:**
- The steps dialogs use an iPhone user agent (iOS 26 Safari).
- The menu and footer buttons appear after a synthetic `beforeinstallprompt`, the event Chrome fires when a site can be installed.
- "Offline" means the local server was stopped after a few pages had been opened.

No real phone was used, and nothing was installed. Results: [`../../qa-checklist.md`](../../qa-checklist.md#run-for-the-installable-app-2026-11-07).

The file name gives the language, the viewport width in px and the theme.

| File | What it shows |
| --- | --- |
| `install-steps-en-390-light.jpg` | `/` at 390 × 844, iPhone. The steps dialog "Install this site as an app" is centred over the dimmed page, including the header. It has a one-line intro, three numbered steps (Share in the ⋯ menu on iOS 26, "Add to Home Screen" or "View More", leave "Open as Web App" on and tap "Add") and a "Close" button |
| `install-steps-ar-390-dark.jpg` | `/ar/` at 390 × 844, iPhone, dark theme, right to left. The same dialog in Arabic: «ثبّت الموقع كتطبيق», the three steps with "iPhone" and "iOS 26" kept left to right inside the Arabic text, and «إغلاق» at the end of the line (left) |
| `install-menu-ar-390-light.jpg` | `/ar/research/` at 390 × 844, the phone menu open. After the last item («التواصل») a hairline separates the outline button «ثبّت التطبيق» with its download icon, aligned to the right |
| `install-footer-en-1280-light.jpg` | `/publications/` at 1280 × 900, the footer. "Install the app" sits next to "Start a conversation", in the outline style of the dark footer panel. The wide-screen menu bar has no install button |
| `offline-en-1280-light.jpg` | `/lab/`, never opened, with the server stopped. The offline page shows the mark, "You’re offline", the explanation, "Try again" and "Home", and lists the four saved English pages: Teaching, Research, Publications, Home |
| `offline-ar-390-dark.jpg` | `/ar/talks/`, never opened, offline, at 390 × 844, dark theme. The Arabic offline page «أنت غير متصل بالإنترنت», right to left, with «إعادة المحاولة» and «الرئيسية», listing the saved Arabic pages only: المنشورات، البحث، الرئيسية |

The offline page uses the system fonts on purpose: the worker builds it itself, without downloading the site's web fonts.
