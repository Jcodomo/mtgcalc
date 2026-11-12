# Mortgage Suite v57 - Phase 2: shared scenario model and isolated calculation functions

Phase 2 of the controlled order in the v57 spec. It follows the inventory and regression cases in [phase1-report.md](phase1-report.md).
Nothing in this phase changes the live site: the pages still load the 56.5 engine (`assets/js/20-*.js`). The work lives in `src/`,
builds to `dist/engine.js`, and is checked by tests. The new engine goes live only when the interface stops writing 0 to mean
"calculate", which is phase 3/4 work (see "Not done").

## 1. What was done

| Step | Result | Evidence |
|---|---|---|
| Recover the engine | The 44 compiled AMD modules in the 56.5 bundle are back in `src/` as TypeScript, one file per module, and build back to a named-AMD bundle (`tools/engine/recover.mjs`, `build.mjs`). | `npm run test:engine`: 77 data tables and 3,000 random scenarios gave identical results before any change. |
| Readable rewrites | `utils/num`, `calc/cashToClose`, `calc/payment`, `calc/renovation`, `calc/loan`, `calc/aus` rewritten as readable code and proven identical to 56.5 first, then changed only for the fixes below. | Commit `ed74735` (identical), then `b88313f` (fixes). |
| Blank vs zero (D3) | `src/core/model/overrides.ts`: one list of overrides with a rule for an entered 0 (FHA MIP 0 rejected with a warning; PMI 0 allowed; a $0 taxes-and-insurance override flagged for review; supplemental origination 0 = waived). Blank (`null`) means "calculate". | Financial cases 28-32. |
| Funding gaps (D1) | Amounts the loan cannot cover are added to cash to close with the reasons, line by line. | Case "Funding gaps": $55,788.75 = $50,000.00 + $5,788.75. |
| Seller credit (D2) | Credit is applied up to the closing costs; the rest is reported as unused with the reason, not used as down payment. | Case "Credits": allowed $36,000.00, applied $24,426.49, unused $11,573.51. |
| Draws to the cent (D4) | The final draw takes the rounding remainder, so releases add up exactly. | Equivalence run: 654 last-draw cent adjustments, each within $0.0651. |
| Not entered is not PASS (D5) | Blank assets give a reserve status of NOT ENTERED and a risk factor; an entered $0 is a real answer. | Cases "missing-assets" and "assets entered as $0". |
| **Shared scenario model** (this commit) | `src/core/model/scenario.ts`: the saved state has a `schemaVersion` (57), typed shapes for state, scenario, version and audit entry, collision-free IDs, and `migrateState()` for any saved 56.x or v57 state. The store (`src/state/store.ts`) loads through it. | `npm run test:model`: 26 checks, all pass. |

## 2. The scenario model in detail

- **Schema version.** Every saved state carries `schemaVersion: 57`. A state without one is treated as 56.x and migrated once; migrating a v57 state again changes nothing (tested).
- **56.x migration.** Defaults fill any keys a saved scenario is missing (the same merge 56.5 made). Overrides and assets that 56.x stored as 0 become blank, because in 56.x a 0 meant "calculate" or "not entered". Saved versions inside each scenario are migrated the same way. A scenario's `inputs.id` is made to match its key, and compare lists lose missing and duplicate IDs.
- **Nothing is thrown away.** 56.5 started over and lost every saved scenario when the open scenario's ID was missing. The model now opens the first scenario that remains. A scenario with no inputs is skipped with a note, and the rest are kept.
- **Rollback copy.** Before the first migration, the saved 56.x text is copied once to `mortgage-suite-state-v2.before-v57`, and it is never overwritten after that. Damaged JSON is left in place untouched, and a new scenario starts in memory.
- **IDs.** `newId()` combines time, a counter and random characters: 20,000 made in a tight loop were all different. In 56.5, `newScenario()` and `duplicateScenario()` used `scenario-${Date.now()}`. Two made in the same millisecond replaced one another; the test reproduces this with a frozen clock, and the v57 store keeps all three.
- **Import and export.** `exportScenario()` writes a tagged file with the schema version. `importScenario()` gives a plain reason when a file cannot be used: "not valid JSON: …" or "does not contain a scenario". It migrates 56.x files and gives the imported scenario a new ID.
- **Store.** `ScenarioStore` is a thin subclass of the recovered 56.5 class, not a patch inside it. Loading goes through `loadState()`, a migrated state is saved back with its version, and new and duplicated scenarios get model IDs. `store.migration` holds the notes so the interface can show them.

## 3. Tests (all run by `npm test`)

| Suite | Result |
|---|---|
| `test-static.mjs` | 31 pages, all local assets, inline scripts and links. |
| `tests/engine-equivalence.mjs` | 3,000 random scenarios through the 56.5 and v57 engines. Every difference is one of the documented v57 fixes: unfinanced cost in 1,598 scenarios, unused seller credit in 2,030, deposit refunded in 27, last-draw cents in 654, blank assets in 2,220 reserve checks. |
| `tests/financial-regression.mjs` | 56.5 engine: 27 cases, 15 pass, 11 known defects reproduced, 1 needs rule verification. v57 engine: 32 cases, 20 pass, 11 defects fixed, 1 needs rule verification, 0 unexpected. |
| `tests/scenario-model.mjs` | 26 checks: migration, idempotence, nothing discarded, rollback copy, damaged JSON, IDs, import errors, round trip, the store under a frozen clock, and the engine running every migrated scenario. |

## 4. Not done, and why

- **The live site still runs 56.5.** The pages write 0 where they mean "calculate", so switching engines now would turn those zeros into real zero overrides. The switch has to come with the phase 3/4 interface that writes blanks. Until then, defects D1-D5 remain on the live pages.
- **S1-S6 are not verified.** S1, financed payments built from the payment before the reserve is financed, is still marked NEEDS VERIFICATION in the regression cases. Each item needs the official source (HUD-92700 / 4000.1, Fannie Mae HomeStyle, the published 2026 loan limits) before the rule changes. No rule was changed on assumption.
- **Most modules are still recovered compiled code.** 38 of the 46 modules run the original compiled bodies, wrapped with TypeScript imports. They are proven identical, but they are not yet readable rewrites. The same method (rewrite, prove identical, then fix) applies to each.
- **Type checking.** The shapes in `scenario.ts` are typed; the recovered modules carry `// @ts-nocheck`. A strict `tsc` pass over all of `src/` comes after the rewrites.

## 5. Rollback

- **Live site.** The live site is unaffected, so rolling it back needs nothing.
- **When the v57 engine is switched on later:**
  - Restore the previous `assets/js/20-*.js` from git.
  - Copy `mortgage-suite-state-v2.before-v57` back to `mortgage-suite-state-v2` in the browser.
  - The 56.5 loader ignores `schemaVersion`. It would read a migrated state, but its blanks would be cleaned back to 0, which matches 56.5 behaviour.

## 6. Next: phase 3 - the Simple quote screen

The essential quoting fields on one screen, with Simple mode by default:
- Price, down payment, program, rate, ZIP, renovation budget, taxes and insurance.
- Blank means "calculate" in every override field, with an active-overrides list.
- One collapsible live summary drawn from the v57 engine, replacing the six competing cash-to-close displays (D6).
- Advanced settings, income tools, OCR, reports and builders load only when opened (D11).

It is built against `dist/engine.js` and the scenario model above. Its acceptance tests:
- The phase 1 financial cases, run through the screen.
- Keystroke timing against the phase 1 baseline (20-33 ms).
