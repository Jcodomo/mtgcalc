# Mortgage Suite · Release 55.12

This repository contains the Release 55.12 mortgage workflow: Quick, Doc Organizer, Income Calculator and Full Suite, with ZIP lookup, editable quotes, amortization, renovation, shared documents and browser autosave. The navigation uses the same five links and icons on every page. Full Suite includes the All-in-One features, with its older URL retained for compatibility. Schedule E calculation and reporting follow the NMB rental worksheet structure and rental-day denominator, while OCR records retain both rental years.

| Page | URL |
|---|---|
| Landing | `index.html` |
| Quick | `quick.html` |
| Doc Organizer | `doc-organizer.html` |
| Income Calculator | `income-calculator.html` |
| All-in-One compatibility entry | `all-in-one.html` |
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
