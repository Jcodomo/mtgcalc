# Changelog

## Release 55.13b - this round

- **Self-employment W-2 line:** 1120 C-corporation worksheets now have "W-2 Wages Received From This Business (added in full)", counted in full rather than by ownership, like the 1065 and 1120-S worksheets already had. If the same employer is also on the W-2 tab, the card warns you to count the wages in one place only. Applied to the Income Calculator and to the calculator inside the Loan Suite (both builds).
- **Tax-return screenshots (OCR):** amounts on tax forms are read only when they look like money (commas, cents or the trailing period tax software prints). Box and line numbers, form and section references ("line 29", "section 179", "Form 8829"), years and percentages are ignored. Two-column rows take the amount right after the label, and K-1 boxes whose amount sits on the next row are read correctly.
- **Form detection:** forms are recognized by their own title first (K-1, Schedule E, Schedule C, 1065, 1120-S, 1120), so a Schedule C or Schedule E page that mentions another form in its instructions is no longer filed as a K-1. Schedule E page 2 now shows line 32 total partnership and S-corp income as a cross-check.
- **No empty worksheets:** a document with only cross-check figures (a 1040, Schedule E page 2) no longer creates an empty rental or business record.
- **2023+ Form 1040 wage line** ("Total amount from Form(s) W-2, box 1") is recognized.
- **Restored pages:** all-in-one.html, loan-suite.html, quick-income.html, renovation-suite.html (legacy) and the original landing page (landing.html) are back, so every page of the 55.12 repo is present.
- **40-character names:** scenario names are limited to 40 characters everywhere. Doc Organizer renamed files are limited to 40 before the extension, shortening the employer or bank first and keeping the borrower, document type and dates.

## Release 55.13 - one page per feature, OCR fixes

### Split into pages
- Every Loan Suite tab is its own page (`loan-suite-*.html`, 19 pages). The Income Calculator, Quick, Doc Organizer and Full Suite are separate pages too, with a hub `index.html`.
- The engine lives once in `assets/` (scripts byte-for-byte; stylesheets recreated as real `<style>` elements so reports and print views keep their styles). Each page is about 37 KB.
- Pages share one saved loan file. Links that lead to another feature open that feature's page. `?nav=0` hides the page navigation; `?chrome=bare` shows only the page content.
- `income-calculator-standalone.html`: the Income Calculator as one self-contained file.

### Fixed
- **Text-layer PDFs were read as one line.** The built-in PDF reader runs first and joined every string on a page, so labels and amounts from different rows ran together (Net Pay YTD was read as Regular YTD, the ZIP code as hours). It now follows the PDF text-positioning operators and rebuilds rows by position (Income Calculator and `loan-ux.js`).
- **The offline PDF stand-in collapsed rows again.** It gave every row the same position, so readers that group by position merged them. Each row now has its own baseline (`loan-ux.js`; fixes Documents & OCR).
- **Rate and hours swapped** on stubs that print "Hours Rate"; the column header now decides the order (Income Calculator and the suite's document parser).
- **Qualifying income of $0** when a stub gave no weekly hours: Auto chose "current pay" (rate x hours = 0). Current pay is now used only when there is a current-pay figure; otherwise the YTD average governs (both calculators).
- **Doc Organizer:** PDF text kept its rows (the borrower name is now found on PDFs), and the income handoff uses the year-to-date amount on each earnings row instead of hours or the current period.
- **Draft LE** showed only the Scenarios list; the page now shows the three-page draft Loan Estimate inline, live, with Print / Save PDF.
- **Credit** opens its Credit workspace; **Scenarios** opens with its card expanded.

### Verified (Chromium)
All 25 pages load with no errors or missing files. Original Full Suite and the split pages give identical outputs across four scenarios; independent math 10/10. OCR on a text PDF, a photo and a scanned PDF gives the same correct figures in the Income Calculator, the single-file Income Calculator and Documents & OCR, and applies to the W-2 worksheet. Page links, the shared loan file, Live Summary links, Back to Qualify, the income handoff and both URL options checked.

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
