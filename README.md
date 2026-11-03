# Mortgage Suite: one page per feature (Release 55.14b)

Every feature of the Loan Suite and the Income Calculator as its own HTML page, ready to upload to a website. This package includes the Release 55.14b income, rental, OCR, and shared-theme updates.

## Pages

| File | What it is |
|---|---|
| `index.html` | Hub: links to every page |
| `quick.html` | Quick income worksheet and fast mortgage calculator |
| `income-calculator.html` | Income Calculator: W-2, self-employment, rental, other income, document import with OCR, AUS findings, DTI |
| `income-calculator-standalone.html` | The same Income Calculator as one self-contained file (no `assets/` needed) |
| `doc-organizer.html` | Read, rename, split and combine borrower documents; send reviewed values onward |
| `full-suite.html` | The complete Loan Suite and Income Calculator in one page |
| `loan-suite-quote.html` | Quote, Scenario Control, mortgage calculator |
| `loan-suite-setup.html` | Setup |
| `loan-suite-property.html` | Property |
| `loan-suite-renovation.html` | Renovation |
| `loan-suite-max-mortgage.html` | Max Mortgage |
| `loan-suite-mortgage-rates.html` | Mortgage Rates |
| `loan-suite-closing-costs.html` | Closing Costs |
| `loan-suite-escrow.html` | Escrow |
| `loan-suite-taxes-proration.html` | Taxes & Proration |
| `loan-suite-qualify.html` | Qualify |
| `loan-suite-rental.html` | Rental |
| `loan-suite-credit.html` | Credit workspace |
| `loan-suite-advanced.html` | Advanced (rule tables) |
| `loan-suite-contract-le.html` | Contract, LE & Closing Disclosure reader |
| `loan-suite-scenarios.html` | Saved scenarios, comparison and history |
| `loan-suite-summary.html` | Summary |
| `loan-suite-documents-ocr.html` | Documents & OCR |
| `loan-suite-documents-worksheets.html` | Documents & Worksheets (generators) |
| `loan-suite-draft-le.html` | Draft Loan Estimate, shown inline, with Print / Save PDF |

`assets/` holds the shared engine (scripts and stylesheets) and the companion scripts. Every page except `income-calculator-standalone.html` needs it next to the page.

## Putting it on a website

Upload the whole folder (pages plus `assets/`) to one directory of your site, for example `https://example.com/mortgage/`, and link to the pages you want. The engine downloads once and is then cached, so each further page costs about 37 KB.

**Link to a page directly**, or **embed it** in an existing page:

```html
<iframe src="/mortgage/loan-suite-escrow.html?nav=0" style="width:100%;height:1400px;border:0" title="Escrow"></iframe>
```

URL options for the Loan Suite pages:

- `?nav=0` hides the page navigation, for sites that have their own menu.
- `?chrome=bare` shows only the page content: no header, page navigation or Live Summary.

**Shared loan file.** All pages read and write one saved loan file in the visitor's browser (`localStorage`), so a change on one page shows on the others. That only works when the pages are served from the **same site** (same domain and protocol). Nothing is sent to a server.

**Moving between pages.** Each Loan Suite page has its own page navigation with real links. Anything inside a page that leads to another feature, such as a Live Summary line, "Back to Qualify" or the Income button, opens that feature's page.

**OCR and PDF export** load their libraries (pdf.js, Tesseract.js, html2canvas, jsPDF) from public CDNs the first time they are used, so they need an internet connection. Text-layer PDFs are also read by the built-in reader, which works offline.

## Rebuilding

The pages are generated, not hand-edited:

```
python3 tools/decompile.py tools/source <output-folder>
```

`tools/source/` holds the 55.13 source files the build reads. `tools/decompile.py` splits `full-suite.html` into the shared `assets/` (each script byte-for-byte, each stylesheet recreated as a real `<style>` element so the Loan Report and print views keep their styles), and writes one page per tab with `tools/loan-suite-embed.js` / `.css`. To change a feature, edit `tools/source/`, rebuild, and upload the output.
