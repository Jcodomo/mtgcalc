# Mortgage Suite v57 - Phase 1: inventory, baseline, regression cases

Status: phase 1 of 6 (spec item 56: "inventory features, benchmark performance, and establish financial regression cases").
Starting point: release 56.5, commit `decd710` on `main`. Nothing in this phase changes the application.

## 1. Architecture as found

| Layer | Files | Size (uncompressed) | Notes |
|---|---|---|---|
| Core engine + standalone UI | `assets/js/20-*.js` | 267 KB | 44 compiled TypeScript AMD modules: `src/core/calc/*` (engine, loan, renovation, payment, cashToClose, closing, escrow, aus, mmw, value, bps, validate, warnings, trace), `src/core/data/*` (FHA limits, MI, concession limits, transfer / mansion / recording taxes, escrow and closing rules, renovation rules, states), `src/state/store` (ScenarioStore), `src/ui/*`. **No TypeScript source is in the repository** - only this compiled output. `runScenario(inputs)` is already a pure, structured function (53 inputs, structured outputs with a calculation trace). |
| LOS interface layers | `assets/js/21-29` | 967 KB (`22` alone 749 KB) | Successive "v14 … v55" UI layers that render cards, summaries and tools around the engine, with 78 `RECALC` references, 15 `eval` global lookups and 52 `setInterval` call sites in `22`. |
| Hidden copy of the old Income Calculator | `assets/js/01-19` | 335 KB | Loaded and initialised on every Loan Suite page although the Income Calculator moved to its own page in 55.16. |
| Styles | `assets/loan-suite-styles.js` | 496 KB | CSS shipped as JavaScript; accumulated per-version overrides. |
| Companion scripts | 14 files in `assets/` | 526 KB | doc-builder 265 KB, doc-center 56 KB, income-enhancements 38 KB, loan-ux, loan-cards, loan-docs-ai, workflow-ui, sync-bridge, mt-live, mt-mnd, mt-addr, mt-data, release56-suite, loan-suite-embed. |
| Income Calculator page | `income-calculator.html` | 530 KB HTML (452 KB inline JS) + 560 KB scripts | Its own global state `S`, `RECALC()` reads values from DOM inputs. |
| Quick | `quick.html` | 50 KB + 381 KB scripts | Own quick engine (`quick-engine.js`). |
| Orphan | `renovation-suite.html` | 512 KB | A separate standalone renovation calculator with its own scenario data; nothing links to it. |

Three calculators therefore hold overlapping mortgage figures today: the Loan Suite engine, the Income Calculator's DTI tab (`S.loan`), and Quick - kept in step by `mt-live.js`, `sync-bridge.js` and `mtgcalc-shared-workflow-v1` in localStorage.

## 2. Performance baseline (56.5)

Environment: Windows 11, Claude desktop app's built-in Chromium browser pane, local `python -m http.server` (no compression, no CDN for local files), fresh localStorage / IndexedDB for each page. An instrumentation script was injected before any application script in a throw-away copy (`__bench565/`, git-ignored). The pane was hidden during some runs, which suppresses animation frames and can understate long tasks; numbers are a baseline for comparison in the same environment, not field data.

| Page | DOMContentLoaded | load | Scripts | JS bytes | DOM nodes | Inputs | Listeners added | Timeouts (first ~5-9 s) | Intervals active | Interval ticks/s | Observers |
|---|---|---|---|---|---|---|---|---|---|---|---|
| full-suite.html | 265 ms | 443 ms | 48 requests (44 local + CDN) | 2,592 KB local + ~0.9 MB CDN libraries | 7,299 | 457 | 861 | 357 | 2 | 1.4 | 10 |
| loan-suite-renovation.html | 286 ms | 447 ms | 48 | 2,592 KB local + CDN | 6,297 | 444 | 1,350 | 865 | 2 | 2.0 | 10 |
| income-calculator.html | 76 ms | 83 ms | 12 + inline | 560 KB + 452 KB inline | 3,146 | 250 | 72 | 61 | 6 | 11 | 2 |

- Typing in the renovation budget (Loan Suite): 20-33 ms of synchronous work per keystroke (10 samples: 1, 26, 24, 21, 31, 33, 21, 32, 24, 20 ms).
- Loaded at startup without being used: html2canvas 1.4.1, jsPDF 2.5.1 and pdf.js 3.11.174 (CDN), plus Google Fonts.
- Network calls on open: `api.zippopotam.us` (ZIP lookup), `geo.fcc.gov` (census area) - both before the user asks for anything.
- Long tasks on full-suite.html: 9, 485 ms total, longest 57 ms (pane hidden for part of the run).
- Only 8 intervals are actually created at runtime (2 stay active); the 52 `setInterval` call sites in file 22 mostly sit in code paths that do not run on load. The heavier runtime cost is the 865 timeouts and 1,350 listeners in the first seconds.

Budgets for v57 will be set against these numbers once Phase 2 has a measurable Simple-mode build (spec item 54).

## 3. Confirmed defects (reproduced)

Financial cases are in `tests/financial-regression.mjs` (runs the real 56.5 engine in Node: `node tests/financial-regression.mjs`). Today: 27 cases - 15 pass, 11 fail as known defects, 1 needs rule verification, 0 unexpected.

| # | Defect | Evidence | Spec |
|---|---|---|---|
| D1 | **Unfinanced amounts are left out of cash to close.** When a loan limit or value cap reduces the loan, `cashToClose = requiredInvestment + closingCosts - credit - EMD` never adds the part of the acquisition cost the loan no longer covers. The interface shows an "ARV short" warning but not the money. | FHA over the Nassau limit: shows $107,682, needs $128,462 (gap $20,780). FHA price above as-is: gap $50,000. 110% ARV cap: gap $55,789. HomeStyle LTV cap: gap $68,199. Confirmed on screen: the Quote page shows $46,826.94 on a file that needs ~$76,000 more than the loan covers. | 21 |
| D2 | **Seller credit above closing costs pays the down payment.** The excess reduces the required investment instead of being reported as unused. | Conventional 25% down + 9% credit: borrower brings $88,426 vs $100,000 required ($11,573.51 of credit spent on the down payment). FHA 6% credit: $6,095 vs the $8,750 minimum investment. Unused credit shown: $0. | 22 |
| D3 | **Zero overrides reactivate the default.** `pmiOverrideRate`, `fhaMipOverrideRate`, `taxInsuranceOverrideMonthly` and `reno.supplementalOriginationOverride` only apply when `> 0`; the Income Calculator's "Annual MI rate override (%, 0 = auto)" and `mt-live.js` (`miOverride: x.miRate > 0 ? x.miRate : 0`) do the same. | $0 PMI (lender-paid) still charges $281.25/mo; a waived supplemental origination fee reverts to $1,053.75. | 18 |
| D4 | **Draw releases do not reconcile to the cent.** Each release is rounded separately with no final-cent adjustment. | $123,456.78 in 7 draws releases $123,456.77; $99,999.99 in 6 draws releases $100,000.00. | 26 |
| D5 | **"Not entered" reported as PASS.** With no assets entered, reserves read "PASS by $0". | Regression case `missing-assets`. | 10, 23 |
| D6 | **Six competing cash-to-close displays that disagree.** On the Quote page: `v14LiveSummary`, `v251HeaderStats`, `mtTop`, `v46Extra`, the root summary and `v44LiveSummary`. `mtTop` showed $47,257 while the engine and the others showed $46,826.94. | Browser check, loan-suite-quote.html. | 14, 26 |
| D7 | **Stale synchronized values.** `mt-live.js` sets the calculator's `baseOverride` only when the incoming loan is positive, so clearing the suite's loan leaves the old loan amount as an override; address and FICO are copied only when present, so clearing them never clears the copy. | `tools/source/mt-live.js` lines 72-74. | 19 |
| D8 | **"Auto (best fit)" silently governs.** It is the default, and on every recalculation sets `S.agency` to whichever agency yields the most income. | `income-calculator.html` RECALC, lines ~7069-7073. | 29 |
| D9 | **Declining-income text contradicts the logic.** The rule banner says "a declining trend forces the longer averaging period"; the recommendation actually takes the lowest figure, and the 24-month case is labelled "Declining across both prior years" when it fires only on a rising trend (YTD > prior > two years prior). | `income-calculator.html` lines ~1391-1395 and ~1598. | 28 |
| D10 | **Silent storage failures and unvalidated imports.** ~60 `localStorage.setItem` calls inside `try { } catch (e) { }` across the app; imports have almost no schema / version checks (4 `schemaVersion` references in the whole LOS layer). | Static audit. | 40 |
| D11 | **Startup loads what Simple mode does not need.** Every Loan Suite page loads the hidden 335 KB calculator copy, the PDF/OCR libraries and the document builder, and calls two external lookups on open. | Baseline above. | 5, 51 |
| D12 | **Export can capture the previous document.** The builder rebuilds its preview 180 ms after an edit; Print / Download PDF read the preview immediately. | Edit the title and read the preview: unchanged at 0 and 60 ms, updated at 460 ms. | 34 |
| D13 | **Hidden default renovation budget.** Turning renovation on with no budget silently writes $50,000 into `reno.baseCost`. | `22-*.js` (`o.reno.baseCost=5e4`). | 25 |
| D14 | **Calculation reads the screen.** The Income Calculator's `RECALC` takes borrower names, file number and agency from DOM inputs on every run. | `income-calculator.html` RECALC. | 44 |
| D15 | **Orphaned competing calculator.** `renovation-suite.html` (512 KB) keeps its own scenario data and is not linked. | File audit. | 3 |

## 4. Needs verification before changing (not yet confirmed defects)

| # | Item | Why it is not confirmed |
|---|---|---|
| S1 | Financed payments use the payment *before* the reserve is financed (6 months = $32,550.06 vs 6 x final payment $5,652.72 = $33,916.32). | Depends on HUD-92700 line B4 / HomeStyle practice for the circular PITI - needs the official worksheet. |
| S2 | FHA monthly MIP is figured on the base loan; the Income Calculator uses the total loan (earlier note: $272.03 vs $276.79). | Needs the current HUD 4000.1 annual MIP basis. |
| S3 | Financed-payment months clamped to 0-6 for every program in input normalization. | Correct for 203(k) and HomeStyle as commonly applied; CHOICERenovation, VA and DSCR need their own sources. |
| S4 | Draw-count bands, contingency suggestions (10% / 20% utilities off), consultant default $2,000 and fee ranges in `renovationRules`. | Marked in the data as "planning suggestions" / lender guide; need sources and effective dates per program. |
| S5 | Loan-limit tables (`23-los-2026-loan-limits.js`) and conforming / high-balance thresholds. | Need the published 2026 tables to compare. |
| S6 | `mtTop` disagreement in D6 may be a stale value or its own formula. | Cause not yet traced; the disagreement itself is confirmed. |

## 5. Feature inventory (first pass - becomes the parity checklist)

Every item below must have a v57 location before release. "v57 home" is the proposed placement under the five main areas (Quote, Renovation, Qualification & Income, Scenarios, Documents & Reports).

| 56.5 feature | Where it is today | v57 home |
|---|---|---|
| Quote, Setup, Property, Max Mortgage, Mortgage Rates (MND) | Loan Suite File / Loan pages | Quote |
| Renovation budget, fees, draws, holdback, material release, 203(k) max mortgage worksheet (MMW), value projection | Renovation, Max Mortgage pages | Renovation |
| Closing costs, closing lines, escrow (aggregate analysis), taxes & proration, NY transfer / mansion / recording taxes | Closing Costs, Escrow, Taxes & Proration pages | Quote (Closing Costs & Funds) + Advanced |
| Qualify (DTI, AUS checks, reserves), rental income, self-sufficiency, vacating rental, BPS, credit page | Qualify, Rental, Credit, Advanced pages | Qualification & Income |
| Scenarios, compare, saved scenarios, JSON save / load | Scenarios page | Scenarios |
| Summary, Loan Report, Loan Estimate draft and contract LE | Summary, Draft LE, Contract LE pages | Documents & Reports |
| Income Calculator: W-2 (salary, hourly, variable base, OT, bonus, commission, retro, annual bonus), Schedule C, 1065 / 1120-S / 1120, Schedule E, VA income + residual, other income, Non-QM (bank statement, DSCR, P&L), assets + depletion (Fannie / Freddie 240 / 180), AUS findings, summary & guidelines, stipulations, agency comparison, income report (PDF / image / Excel), pay statement | income-calculator.html (10 tabs) | Qualification & Income (loaded on demand) |
| Document center: shared library (IndexedDB), OCR, type detection, send / queue to fields, AI JSON import | doc-center.js, loan-docs-ai.js, Documents pages | Documents & Reports (on demand) |
| Doc Organizer: rename, borrower assignment, dates, duplicates, split / merge, ZIP | doc-organizer.html | Documents & Reports (on demand) |
| Document Builder: addendum (8 styles), lease (6), contractor estimate (8), P&L (5), pay statement (3), gift letter (4 types), commitment letter, MI & renovation fees; logos, OCR drops, wording edits, edit-on-page, one-page fit | doc-builder.js | Documents & Reports (on demand) |
| Address suggestions (Photon), live sync on, MND rates, theme / OLED dark navy, Quick page with ZIP estimates | mt-addr.js, mt-live.js, mt-mnd.js, quick.html | Shared services / Quote |
| Standalone income calculator, all-in-one, pages index, landing | generated pages | Kept as generated outputs |

A field-level checklist (every input path in `src/core/types` and every Income Calculator field) will be generated from the code in Phase 2 so nothing is missed by hand.

## 6. Proposed v57 plan

1. **Engine (Phase 2).** Recover the 44 compiled modules into readable TypeScript under `src/core`, gated by the regression suite at every step (the Node loader proves byte-identical results before any change). Then fix D1-D5 in the engine with tests: an explicit "additional borrower funds" line for unfinanced amounts; requested / allowable / applied / unused credits with the required investment protected; `null` = calculate, `0` = intentional zero, with "Use calculated value"; final-cent draw adjustment; "Not entered" distinct from Pass. Define the shared scenario model (stable IDs, schema version, migration from 56.5 exports).
2. **Simple quote screen (Phase 3).** One page in the original app: the seven sections from spec item 6, Simple / Advanced switch (Simple on every fresh open), the right-hand summary (compact / expanded / hidden), "Assumptions in use", and Ctrl/Cmd+K search over a prebuilt index.
3. **Deferred loading and cleanup (Phase 4).** Simple mode loads the engine, the quote UI and its data only; the Income Calculator, builders, OCR, PDF libraries, doc center, address and rate lookups load when opened. Retire the hidden calculator copy, the competing summaries, the polling and `eval` lookups, and fold `renovation-suite.html` into the parity list.
4. **Integration (Phase 5).** Advanced sections, income handoff (live vs snapshot, traceable), scenarios with clone / checkpoints / recovery, builders reading the shared model with an immutable export snapshot, the document-to-field review queue, rate / points trade-off tools.
5. **Verification and package (Phase 6).** Browser tests, report and print inspection, before / after performance in this same environment, parity checklist, migration notes, rollback (56.5 stays tagged `v56.5`), ZIP.

Tooling: TypeScript + Vite with the built static files committed (or built by the existing GitHub Pages workflow), so the site still needs no npm on the user's side.
