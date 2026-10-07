# Mortgage Suite · Release 55.7

This repository contains the Release 55.7 mortgage workflow: Quick, All-in-One, Full Suite, ZIP lookup, editable quote values, loan comparison, amortization, renovation, income, documents, OCR, and browser-saved shared values. Release 55.7 also includes the two-year Schedule E rental worksheet, fair-rental-day proration, the compact Quick W-2 bridge, resilient PDF/OCR reading, shared OCR handoff, compact editable loan metrics, and explicit OCR-to-income assignment controls.

| Page | URL |
|---|---|
| Landing | `index.html` |
| Quick | `quick.html` |
| All-in-One | `all-in-one.html` |
| Full Suite | `full-suite.html` |
| Loan Suite alias | `loan-suite.html` |

The older `quick-income.html`, `income-calculator.html`, and `renovation-suite.html` entry points remain available for compatibility. The primary Release 55 workflow uses the tested combined engine in All-in-One and Full Suite.

## Verification

Run the local static check with the bundled Node runtime:

```text
node test-static.mjs
```

The supplied Release 55 source package also includes the calculation and build tests under `.tmp-10.02/v55/mortgage-suite-los/test/node` used before publishing.

All calculations are planning estimates. Confirm current agency guidelines, limits, rates, and fees before relying on figures.
