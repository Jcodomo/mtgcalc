# Changelog

## 2026-10-09 - Release 55.12 optimization, calculation and cleanup pass

- Final deployment audit: corrected an explicit zero-hours entry being changed to 40 hours, accepted ISO pay-period dates, and stopped redundant header DOM moves from blurring the scenario name input. Verified focus and scroll position remain stable while the background scheduler runs.
- Rechecked the release against independent mortgage payment, FHA MIP term/LTV/loan-band, 11-year MIP duration, amortization, income, Schedule E report, and real text-PDF extraction tests. FHA table reference: https://www.hud.gov/sites/dfiles/OCHCO/documents/2023-05hsgml.pdf.

- FHA annual MIP now follows the HUD table by term, base-loan band and LTV (30-year: 0.50%/0.55%, high balance 0.70%/0.75%; 15-year: 0.15%/0.40%/0.65%) until a rate is picked by hand; picking the table rate again returns the file to automatic. Previously every file stayed at 0.55%. The rate menu gains 0.40% and 0.65%.
- Quick calculator FHA MIP uses the 15-year rates and stops after 11 years (132 payments) at 90% LTV or below.
- Scenario Compare: MIP % and seller concession % are divided by 100 (a typed 0.550 had become a 5% MIP).
- Quick Income Worksheet rewritten: typing no longer loses focus after one character, employer names persist, the history table is real table markup, variable income is averaged over the months each column covers, and a declining trend uses the most recent year. The worksheet collapses until it holds figures.
- Income Calculator: removed the old second bottom bar and the duplicate sync-bridge load; html2canvas/jsPDF deferred and PDF.js lazy-loaded.
- Sync bridge: correct page detection, income re-imported only when it changes, own-page records ignored.
- Full Suite: enhancement sweeps stay on the idle-aware scheduler for the whole page (idle script time 79 ms → 1 ms per 10 s after settling); removed the duplicated metric row, the empty Full-view band, the repeated Renovation/Max mortgage switch and a repeated Live Summary hint; LTV report label states its basis.
- Doc Organizer: one subtitle, no duplicate page buttons, handoff card after Add/Name, CDN libraries deferred, stray Grammarly markup removed.
- Landing cards in one row; bottom navigation smaller and hides while scrolling down. Quick links point to Full Suite.
- Verified: 33 calculation checks against independent formulas, button/menu/select sweep on all 9 pages with no script errors, node test-static.mjs passing.

## 2026-10-09 - Release 55.11 income reconciliation and consistent navigation

- Added one shared five-item bottom navigation with fixed icons: Home, Quick, Doc Organizer, Income Calculator, Full Suite. The overlapping All-in-One launch is consolidated into Full Suite; existing URLs remain available.
- Compacted loan scenario and control cards outside the Full view, and restored a responsive multi-column setup input grid.
- Reconciled Schedule E with the NMB rental formula: rent plus add-backs minus total expenses, divided by months rented; use a single entered year automatically, average two years, or use the recent year when declining. Personal-use days are recorded separately from fair rental days.
- Replaced Schedule E report detail with the requested ordered two-year worksheet, fair rental days and one net rental amount. Optional PITIA remains editable and affects the final qualifying total without adding PITIA or gross-rent rows to the report.
- Corrected W-2 unreimbursed expense deductions and incomplete variable-income history in Auto mode.
- Fixed organizer rental extraction being omitted, nested OCR records being discarded as empty, and interest/depreciation aliases. Expanded Loan Suite assignments to all Schedule E categories for both years.
- Verified representative income scenarios, report output, freeform live edits, entry-point navigation, and real text-PDF extraction with CDNs offline. The supplied workbook contains broken references in several wage/FHA sections; those formulas were not copied into the app.


## 2026-10-07 - Release 55.10 Quick worksheet + Doc Organizer bridge

- Added the older-style Quick Income Worksheet above the live mortgage calculator. It supports multiple employment records, variable-income history, other monthly income, borrower/file metadata, print, local autosave, and a reviewed “Use for mortgage calculator” handoff.
- Added a dedicated Doc Organizer page and landing-page navigation entry. The organizer keeps local PDF/image OCR, renaming, splitting, combining, and ZIP download, while adding direct links to Quick, Income Documents, Loan Documents, All-in-One, and Full Suite.
- Added a shared OCR handoff from reviewed organizer results into the Income Calculator and Loan Suite workflow. Parsed borrower, employer, wage, rental, and asset fields remain reviewable; values are never silently applied.
- Added the existing offline-first PDF reader bridge to the organizer so text PDFs can be read without waiting for a first-load CDN connection; scanned PDFs continue to use the optional PDF.js/Tesseract path.
- Preserved the mortgage calculator, all existing pages, calculations, document generators, and compatibility aliases.

## 2026-10-07 - Release 55.9 offline-first OCR pass

- PDF file inputs now install the local reader during capture, before inline handlers run, so text PDFs no longer fail when the first-load CDN reader is unavailable.
- Text-layer extraction is attempted locally first with ASCII85 and Flate/Raw-Flate stream support; PDF.js remains an optional background fallback for scanned/image-only PDFs.
- Expanded Loan Suite OCR assignment coverage for W-2/paystub, Schedule C, Schedule E, Social Security/SSDI, pension, VA, support/alimony, interest/dividends, royalties, 1099/contract income, and asset statement balances.
- Preserved review-before-apply behavior, universal prompt/JSON workflow, shared handoff to the Income Calculator, and all existing calculations and document generators.

## 2026-10-07 - Release 55.8 PDF/OCR resilience pass

- Added lazy PDF.js loading with CDN fallbacks so PDF imports do not fail immediately when the preferred reader is unavailable.
- Added a conservative browser-native PDF text-layer fallback for ordinary text PDFs; scanned/image-only PDFs still surface a clear OCR guidance message.
- Added ASCII85 + Flate stream support for common generated PDFs, cache-busted the Loan Suite bridge, and mounted OCR assignment controls on the visible shared document cards (not only the hidden legacy review panel).
- Preserved the shared OCR workspace, explicit assignment fields, review/apply flow, and all existing calculations and controls.

## 2026-10-07 - Release 55.7 OCR-to-income handoff

- Added explicit Loan Suite OCR assignment controls for borrower, W-2/paystub, Schedule C, and Schedule E destinations.
- Added reviewable handoff actions that send assigned OCR values to the Income Calculator Documents tab without silently applying values.
- Added shared handoff metadata, source text, assignment context, and copyable income JSON for audit/review.
- Preserved the existing Loan Suite OCR parser, AI JSON path, document assignment controls, and all calculation behavior.

## 2026-10-07 - Release 55.5 OCR and Schedule E quality pass

- Schedule E now presents the prior/current tax-year rental worksheet in the same line-item layout as the supplied NMB reference, including fair-rental days, personal-use days, PITIA, gross cash flow, and the two-year average used for planning.
- Restored the compact Quick W-2 bridge while retaining the complete W-2 worksheet and live mortgage handoff.
- Improved income-document PDF reading by ordering text items by visual row/column before field extraction; added a secondary Tesseract CDN fallback for scanned PDFs and images.
- Added OCR label normalization for common scan errors across W-2, paystub, Schedule C, and Schedule E labels without changing extracted amounts.
- Retained JSON extraction aliases and manual review/apply controls so OCR results remain editable and verifiable.

## 2026-10-07 - Release 55.4 income workflow pass

- Added a compact Quick W-2 bridge to the Income Calculator. It supports hourly, weekly, bi-weekly, semi-monthly, monthly, and annual pay, YTD/prior-year averaging, variable pay, and a push-to-worksheet action without removing the full W-2 worksheet.
- Reworked Schedule E into a rental worksheet with prior/current tax-year columns, fair-rental-day and personal-use-day proration, PITIA inputs, gross rental cash flow, net cash flow after PITIA, and a transparent two-year average basis.
- Preserved legacy rental records during migration and kept lease-method records on the existing calculation path.
- Expanded document JSON compatibility for Schedule E aliases (`scheduleE`, `rentals`, `priorYear`, `currentYear`, `y1`, `y2`) and retained the existing local PDF/OCR pipeline and review/apply workflow.
- Added static coverage for the additive enhancement script; all existing page links, aliases, and calculations remain in place.

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
## Release 55.6 — shared OCR + compact editable loan metrics

- Added a shared browser OCR handoff so reviewed JSON imported from the income calculator can be copied/opened from the loan-suite document workspace and routed back to the Income Calculator Documents tab.
- Loan-suite metric cards are now tighter at desktop and responsive widths while remaining keyboard-accessible, clickable, and routed to their existing detail/edit workspaces.
- Preserved all existing calculation and document-generation behavior; the bridge is additive and stores only the user-reviewed OCR payload locally.
