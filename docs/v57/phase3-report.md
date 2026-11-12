# Mortgage Suite v57 - Phase 3: the Simple quote screen

Phase 3 of the controlled order. It builds on the engine and scenario model from [phase 2](phase2-report.md).

The new screen is `quote-v57.html`:
- **Page code:** source in `src/ui57/`, built into `assets/v57/quote.js` by `npm run build:ui`, with `assets/v57/quote.css`.
- **Not linked anywhere, and not yet a replacement for the Loan Suite pages.** Integration with the live pages is phase 5.

## 1. Why the screen keeps its own saved copy for now

The live 56.5 pages store 0 in override fields to mean "calculate". The v57 engine and model store blank for "calculate" and 0 for a real zero, so sharing one saved file now would let each side misread the other's edits.

Until integration (phase 5), the screen saves to `mortgage-suite-v57-preview`:
- **Copy from Loan Suite** brings in the open Loan Suite scenario through the 56.x migration and leaves the Loan Suite file untouched (tested).
- At integration the live pages switch to the v57 model and this separate copy goes away. Spec items 3 and 20 call for one model, which this is a step toward, not the end state.

## 2. What the screen does, by spec item

| Spec item | Done in phase 3 |
|---|---|
| 4 Simple by default | A Simple / Advanced switch sits beside the heading. Every fresh open starts in Simple. A separate per-viewer preference (`mt.v57.openAdvanced`) is the only way to open in Advanced. Values stay the same across modes (tested: a consultant fee typed in Advanced is kept and listed in Simple). |
| 5 Genuinely lightweight | **Startup:** Simple mode loads one script (the engine, the scenario model and the screen, 219 KB), one stylesheet and the site search.<br>**Advanced groups:** not built until opened (0 built in Simple, 13 in Advanced).<br>**On demand only:** the document builder (378 KB) loads on its first click, and the Income Calculator is its own page. See section 4. |
| 6 Section order | Property & Program, Renovation Budget, Loan Terms, Monthly Housing Costs, Closing Costs & Funds, Qualification, Results & Review Items. |
| 7 Essential inputs | Every input the spec lists is a Simple field, checked by a test: price, address, occupancy, units, program, renovation type, budget, contingency, financed-payment months, down payment, rate, term, taxes, insurance, HOA, MI, seller credit, deposit, income, debts, assets, and ARV when renovating. Taxes and insurance carry an annual / monthly choice, and every dollar and percent field shows its unit (tested). Estimated closing costs are calculated and shown, with each line overridable in Advanced. |
| 8 Purposeful Advanced sections | Each field's mode is declared in `src/ui57/fields.ts`. Advanced fields sit in named purpose groups: detailed renovation fees, draw schedules and releases, escrow and prepaids, taxes and proration, MI and upfront fees, rental qualification, assets and reserves, manual overrides, program rules and lender assumptions. Each group opens on its own, and a "changed" badge shows when a group differs from the standard. |
| 9 Assumptions in use | One list of the active overrides and changed Advanced settings: financed payments, a hand-entered or estimated tax figure, a renovation budget kept while renovation is off, and an override kept that the current program does not use. Each item opens the exact setting, building its group if needed (tested). |
| 10 / 23 Checks in every mode | The results distinguish Pass, Fail, Review needed, Not entered and Not applicable:<br>- **No income:** the DTI reads "Not entered", never "0% pass" (tested).<br>- **Missing assets:** shown as not entered.<br>- **Missing ARV:** shown as not entered, and an estimate is never shown as an appraisal.<br>- **Engine warnings:** every one appears, with a link to its field. |
| 11 / 12 Look, and where figures come from | The dark navy 56.5 palette; red only for Fail, amber only for review items. Each field is marked override, calculated, not entered or estimate. Calculated rows are tinted, read-only and never look like inputs. |
| 13 Navigation | One bar: Quote, Renovation, Qualification & Income, Scenarios, Documents & Reports, on one scrolling page. Typing never replaces the field you are in, so focus and cursor stay put (tested). |
| 14 One summary | Compact (4 figures: payment, total loan, cash to close, DTI), expanded (base loan, P&I, MI, T&I, closing costs, reserves, ARV cushion, LTV) or hidden, remembered per viewer. On phones it sits above the form and covers nothing (375 px: no sideways scrolling). |
| 15 Search | Ctrl/Cmd+K. The page adds every field to the site search from its field list, so Advanced fields are found without building them. Choosing one opens its group, scrolls to it and puts the cursor in it (tested: "escrow pickup" → Tax pickup). |
| 18 Blank vs zero | Override fields show the calculated value as their placeholder and a **Use calculated value** button:<br>- **FHA MIP 0:** rejected with the reason, and the calculated rate still applies.<br>- **PMI 0:** gives $0 PMI.<br>- **$0 taxes and insurance:** flagged for review (tested). |
| 21 / 22 Funding gaps and credits | **Funding gaps:** shown in the closing section and in the review list with their reasons, and included in cash to close.<br>**Seller credit:** requested, allowed, applied and unused are shown, and an unused credit is never cash back (tested). |
| 25 Predictable program changes | Switching programs says what changed: the rate premium, the down payment minimum, and any override kept but not used. **Renovation off** removes renovation from the loan and payment ($629,354 → $515,491 in the browser test) and keeps the budget for later. Turning renovation back on restores the same loan. |
| 38 / 40 (start) Scenarios | New, duplicate, switch, and a side-by-side table of up to 4 scenarios. Export and import give a plain reason when a file cannot be used (tested). |

## 3. Tests

| Suite | Result |
|---|---|
| `tests/quote-screen.mjs` (new, in `npm test`) | 22 checks:<br>- Every field points at a real input and every Simple input from item 7 is present.<br>- Override fields match the engine's rules, and units are shown.<br>- Missing figures are never passed.<br>- The summary equals the engine to the cent.<br>- Funding gap, credits, MIP 0, PMI 0 and renovation off all behave as above. |
| `build-ui.mjs --check` | The committed `assets/v57/quote.js` is rebuilt and compared, so the site never serves a bundle older than its source. |
| Earlier suites | Static pages (32), engine equivalence (3,000 scenarios), financial regression (32 cases), scenario model (26 checks): all pass. |
| In the browser (by hand, this session) | All in the section 2 table, plus:<br>- **Saving:** the live Loan Suite file left unchanged.<br>- **Documents:** the builder loading on demand and reading this screen's scenario.<br>- **Summary sizes:** compact, expanded and hidden all work. |

## 4. Before and after (same browser, same machine, local server)

| | 56.5 Loan Suite quote page | v57 quote screen |
|---|---|---|
| Scripts at startup | 44 local + 9 CDN | 2 (quote screen + search) |
| Script size at startup | 2,592 KB | about 235 KB |
| DOMContentLoaded | 156 ms | 23 ms |
| Load event | 338 ms | 29 ms |
| Page elements | 6,903 | 646 |
| One keystroke, through every figure on screen | 20-33 ms (phase 1) | 7.4 ms average, 14.7 ms slowest (36 updates) |

Note: these are measured in this development environment. Phase 6 repeats them for the release package.

## 5. Not done yet

- **One saved file:** see section 1. The live pages and this screen do not share scenarios until phase 5.
- **Renovation worksheet (spec 16):** the screen shows the budget broken down (construction, contingency, fees, soft costs, supplemental origination, financed payments, escrow, total). Borrower-paid items, and proof that no cost is counted twice between renovation and closing costs, still need their own worksheet and tests.
- **Programs (spec 17):** the engine has FHA (203(k) Limited / Standard) and Conventional (HomeStyle). VA, CHOICERenovation and DSCR are not offered, and no rules were invented for them.
- **Imported values awaiting review (spec 12):** this origin marker arrives with the document-to-field queue in phase 5.
- **Navigation:** Qualification & Income opens the existing Income Calculator page. Documents & Reports opens the existing builder on this scenario.
- **S1-S6** from phase 1 are still unverified against official sources.

## 6. Rollback

The screen is a new page plus new files (`quote-v57.html`, `assets/v57/`, `src/ui57/`). Deleting them, or simply not linking them, leaves the site exactly as 56.7. It writes only `mortgage-suite-v57-preview` and two per-viewer preferences. It never writes the Loan Suite file.

## 7. Next: phase 4 - deferred loading and removing patches on the live pages

Bring the live Loan Suite pages onto the same footing:
- Load the Income Calculator, builders, OCR and PDF libraries only when opened.
- Retire the hidden calculator copy, the competing summaries (D6) and the polling.
- Prepare the live pages to write blanks, so phase 5 can move them onto the v57 model and this screen.
