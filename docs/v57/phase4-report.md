# Mortgage Suite v57 - Phase 4 (part 1): lighter live pages, and the Simple screen inside the Full Suite

Phase 4 of the controlled order, covering two pieces of work: loading only what is used, and removing polling. It also covers the change requested during the phase: the Simple quote screen now sits inside the Full Suite, with a Simple / Advanced switch. Shipped as release 56.8.

## 1. Loaded when used, not at startup

| What | Before (56.7) | Now |
|---|---|---|
| PDF writer (html2canvas, jsPDF) and PDF reader (pdf.js), about 0.9 MB from the CDN | Loaded on the first click anywhere, or when the page went idle | Loaded only when a feature needs them: a report or pay-statement export, a builder PDF, or a PDF handed to a reader. `LOS_LIBS.need('pdfout' / 'pdf')`. |
| PDF handed to a reader before the reader has loaded | `loan-ux.js` swapped `pdfjsLib` for a text-only stand-in on every PDF chosen, even after the real reader had loaded, so scanned PDFs could not be read there | One page-level hold: a PDF chosen, dropped or pasted waits for the real reader, then reaches the page's own handler unchanged. The text-only reader is now only the offline fallback. Tested: a PDF made in the browser went to the Documents page reader, the real pdf.js loaded, and "Gross pay: $5,000.00" was read. |
| AMD loader capturing the CDN libraries | Libraries loaded under the Loan Suite's AMD `define` did not become globals | The loader hides `define` while they load, counted so several loads at once are safe. |
| Online ZIP and census lookups | Ran about 0.5 s after every page opened, with no click | Only when you change a ZIP. The stored location comes from the built-in table at open. Tested: no outside requests at open, and changing the ZIP still looks it up online. |
| Document Builder (378 KB) | Loaded on every Loan Suite page and on the Income Calculator | A 4 KB stand-in (`mt-build-lazy.js`):<br>- Routes the suite's Addendum, Lease and Pay buttons to the builder.<br>- Shows the builder row on the Documents pages.<br>- Loads the builder on the first open.<br>Tested: the suite's Addendum button loaded and opened the real builder. |

**Full Suite page at startup**, same browser:
- **Scripts:** 2,592 KB before (phase 1); about 2,380 KB now, measured on the Loan Suite quote page. The Full Suite page's own reading of 172 KB was largely served from the cache, so it isn't a fair comparison.
- **Libraries:** none of the PDF and canvas libraries load.
- **Outside requests:** none at open, apart from the Google Fonts stylesheet.
- **Load event:** 295–213 ms now, against 338–443 ms before.

## 2. Polling removed

- The document center and the builder each re-ran a placement check every 1.5 seconds. Both now run when the page is ready and shortly after clicks, which is when the Documents panels appear.
- The large number of timers in the 56.x interface layers (`assets/js/22-*.js`) is not touched here (see 4).

## 3. The Simple screen inside the Full Suite (`assets/v57/quote-embed.js`, 65 KB)

**Placement:**
- **Pages:** the Full Suite page and the Loan Suite File (Quote & Setup) page. The other Loan Suite pages are unchanged (tested: Documents).
- **One store:** the screen uses the suite's own scenario store and its 56.5 calculation, so Simple and Advanced always show the same scenario and the same figures (tested both ways: an edit in one shows in the other).

**Switch and tabs:**
- **Simple | Advanced** in the top bar. Simple is the new screen with its live summary; Advanced is the full suite.
- **Default:** every fresh visit opens Simple, and the choice is kept for the browser tab.
- **Tabs in Simple:** the suite's main section tabs lead the screen. File, Renovation, Loan, Housing, Costs, Underwriting and Results jump to their Simple section. Documents, Rates, Property and Max mortgage switch to Advanced and open that tab of the full suite (tested: Costs, and Documents).
- **Density switch:** the screen's own Simple / Advanced density switch is gone inside the suite, so there is one switch. Each Advanced group still opens on its own within its section, and search opens the exact field.

**Classic conventions:** until the suite moves to v57 (phase 5), the screen follows 56.5's conventions, behind one named switch (`MODE.classic`):
- **Zeros:** 0 in an override means "calculate", and $0 assets means "not entered".
- **Funding gap:** the 56.5 calculation leaves the unfinanced amount out of cash to close (defect D1). The screen works it out from the loan figures and says so. For example: "plus $12,885 not financed (not in this figure)".
- **Seller credit:** "requested" and "allowed" come from the purchase figures.

**Tests:** 4 automated checks on the 56.5 calculation (26 screen checks in all), plus the browser checks above.

## 4. Not done in this part

- **Hidden calculator copy:** the hidden copy of the old Income Calculator (`assets/js/01-19`, 335 KB) still loads on Loan Suite pages. The sync scripts (`mt-live.js`, `sync-bridge.js`) and the PDF and report code depend on its globals, so it is retired together with them in phase 5.
- **Timers and listeners:** the 56.x interface layers still create most of the startup timers and listeners counted in phase 1. Rewriting those layers is replaced by moving the screens to v57 in phase 5.
- **Competing summaries (D6):** they remain in Advanced. Simple has one summary.
- **Writing blanks for "calculate":** that comes with the v57 switch in phase 5. Until then the Simple screen writes the classic 0.
- **Income Calculator page:** it still loads its own PDF libraries at startup.

## 5. Rollback

Restore `tools/source/full-suite.html`, `loan-ux.js`, `doc-center.js`, `doc-builder.js` and `income-calculator.html` from 56.7, remove `mt-build-lazy.js` and `assets/v57/quote-embed.js`, and rebuild.

Saved scenarios are not changed by any of this. The Simple screen inside the suite writes the same fields, in the same convention, as the classic screens.
