# Mortgage Suite · Release 55.10

This repository contains the Release 55.10 mortgage workflow: Quick, Doc Organizer, All-in-One, Full Suite, ZIP lookup, editable quote values, loan comparison, amortization, renovation, income, documents, OCR, and browser-saved shared values. Release 55.10 adds a legacy-style Quick Income Worksheet above the live mortgage calculator, a dedicated local-first Doc Organizer, reviewable OCR handoff into the Income Calculator and Loan Suite, and a consistent navigation path across the workflow.

| Page | URL |
|---|---|
| Landing | `index.html` |
| Quick | `quick.html` |
| Doc Organizer | `doc-organizer.html` |
| All-in-One | `all-in-one.html` |
| Full Suite | `full-suite.html` |
| Loan Suite alias | `loan-suite.html` |

The older `quick-income.html`, `income-calculator.html`, and `renovation-suite.html` entry points remain available for compatibility. The primary Release 55 workflow uses the tested combined engine in All-in-One and Full Suite. In the Doc Organizer and Loan Suite Documents workspaces, extracted values are assigned and reviewed before they are sent to the Income Calculator; ordinary text PDFs with ASCII85/Flate streams are parsed locally before any network reader is attempted. Image-only scans still use the optional cached PDF.js/Tesseract path, with the universal prompt and paste-JSON workflow available when an OCR engine is not cached.

## Verification

Run the local static check with the bundled Node runtime:

```text
node test-static.mjs
```

The supplied Release 55 source package also includes the calculation and build tests under `.tmp-10.02/v55/mortgage-suite-los/test/node` used before publishing.

All calculations are planning estimates. Confirm current agency guidelines, limits, rates, and fees before relying on figures.
