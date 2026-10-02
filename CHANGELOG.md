# Changelog

## 2026-10-02 - Release 55.3 fix-up pass

- Header behaves as before: All-in-One, Full Suite and Loan Suite open at the top with the full Loan Suite header on screen. Startup no longer jumps 1,300 px down to the Quote card or focuses a field; explicit ?tab= links still jump to their section.
- Removed the 55.2 header overrides (forced heights, paint containment, forced bar colours, app width cap); kept the stable scrollbar, no sideways drift, compact card rhythm and reduced-motion rules.
- Layout: Scenario Control metrics in two aligned rows of four; the draw-fee notice shows only on Renovation and Closing; the calculator's amortization table starts collapsed behind Show schedule (page about 380 px shorter).
- Mortgage calculator: Loan amount is editable everywhere. In All-in-One and Full Suite it re-solves the file and the field shows the solved figure; on Quick it solves the down payment.
- Quick matches the app theme: Light, Dark and every Look palette carry over, including the calculator.
- Automatic file name follows the figures ($Loan - LTV% - Rate% - Program); a typed name is never changed.
- County stays selected after a ZIP lookup outside New York.
- Verified in Chromium on these files: Release 55 features 73/73, Income Calculator 41/41, Loan Suite math 23/23, navigation 52/52, landing click-through 18/18, every dropdown and input swept with no errors, node test-static.mjs passing.

## 2026-10-02 - Release 55.2 layout pass

- Made the application and suite headers opaque and stable so content does not show through while scrolling.
- Tightened card padding, vertical rhythm, top-bar height, and wide-screen max widths while preserving responsive scaling.
- Kept all inputs, menus, navigation, calculations, and live-summary behavior unchanged.

## 2026-10-02 - Release 55.1 performance pass

- Added a shared rendering pass to all eight entry points to prevent horizontal reflow, reserve scrollbar space, and reduce animation-driven scroll judder.
- Kept calculation and navigation code unchanged; reduced transition duration only when motion is enabled and respected reduced-motion preferences.
- Retained all Release 55 features, direct routes, and compatibility aliases.

## 2026-10-02 · 10.02 / Release 55 reapplied

- Replaced the published primary pages with the supplied Release 55 build.
- Restored the tested Quick, All-in-One, Full Suite, and Loan Suite workflows.
- Preserved legacy direct entry points so existing bookmarks continue to open.
- Re-ran the static page/script/navigation check.
- Re-ran the supplied Release 55 Node tests: 18 passing, 0 failing.
- Kept browser-saved shared values, editable quote popups, locks, ZIP lookup, loan comparison, amortization, renovation, income, OCR, and document workflows from the supplied build.
