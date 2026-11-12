# Mortgage Suite v57 - Phase 5 (part 1): the suite on the v57 calculation

## Done

- **Engine swap.** `tools/engine/install.mjs` minifies the engine built from `src/` and puts it in place of the 56.5 compiled engine in `tools/source/full-suite.html`. The generated file keeps its name, `assets/js/20-createbinding-*.js`, so every Loan Suite page runs it. `npm test` checks that the installed engine is the current `src/` build.
  - **Tests on the installed file:** the financial regression run on it gives 32 cases, 11 defects fixed and 0 unexpected.
  - **Equivalence:** the 3,000-scenario run against the 56.5 engine (frozen in `tests/fixtures/engine-56.5.js`) has every difference explained by a v57 fix.
- **Saved data.** On first open, the v57 store converts a saved 56.x state: 0 in override and asset fields becomes blank, meaning "calculate" / "not entered". The original text is kept once under `mortgage-suite-state-v2.before-v57`. Tested with a real saved scenario: after conversion, cash to close is $59,811.19, which includes the $12,885.25 the loan cannot cover.
- **Classic screens.** They cannot tell blank from 0, so the store reads a 0 from them as blank in those fields. The Simple screen passes `{ exact: true }` and can enter an intentional 0.
  - **Tested:** all 19 Loan Suite pages start on the v57 store with the same cash to close.
  - **Tested:** no field shows null or NaN.
  - **Tested:** clearing an override in Advanced stores blank.
- **Also in this part:** spreadsheet and long pastes, better OCR, commitment letter layouts, income report pages, the Simple Income Calculator (see CHANGELOG 57.0).

## Measured

- **Income Calculator:** ready at 74 ms (was 144 ms) and fully loaded at 84 ms (was 152 ms); no PDF libraries at startup.
- **Recalculation:** about 2.8 ms in both views. The Income Calculator's recalculation was already fast; the time went to loading libraries.
- **OCR on hard screenshots** (small, compressed text), words found before → after: dark 0 → 8 of 18; light 0 → 5; blue grid 3 → 14. Tiny shrunk text is still hard; copying the rows is the reliable route.
- **Engine file:** 390 KB minified, against 267 KB for 56.5. Most of the difference is the per-module wrappers, which can be slimmed later.

## Not done yet (phase 5, next parts)

- **Hidden calculator copy:** retire it, along with the sync scripts (`mt-live.js`, `sync-bridge.js`) and their stale-value paths (D7).
- **Income handoff:** live versus snapshot handoff, traceable from income to loan.
- **Scenarios:** checkpoints and recovery.
- **Builders:** read an export snapshot.
- **Review queue:** a document-to-field review queue.
- **Rate tools:** rate, points and cash trade-off tools.
- **Guideline checks:** S1-S6 against official sources.

## Rollback

1. Restore `tools/source/full-suite.html` from 56.9 and rebuild.
2. In the browser, copy `mortgage-suite-state-v2.before-v57` back to `mortgage-suite-state-v2`.
