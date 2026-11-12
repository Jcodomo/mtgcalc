# Changelog

## Release 55.15 - OLED dark blue by default, asset depletion worksheet, editable W-2 years

- **OLED dark blue is the default on every page** (Loan Suite, Income Calculator, Quick, Doc Organizer, hub): a deep navy-black palette with dark inputs and light input icons (date pickers, dropdown arrows, spinners). It is applied once for everyone; after that the Look menu or theme switch decides.
- **Asset depletion by guideline:** a Guideline dropdown with Fannie Mae employment-related assets (B3-3.4-06, divided by the loan term), Freddie Mac 240 months (Guide 5307.1) and **Freddie Mac 180 months (Bulletin 2026-10)**, or a custom divisor. Each applies its own deductions (Fannie: down payment, closing and reserves; Freddie: funds to close, gift or borrowed funds and pledged assets), default eligibility by account type, and checks ($30,000 remaining under the 180-month rule, Fannie LTV limits, 12-month seasoning, FHA not allowed). Matches the guideline examples ($972.22 Fannie; $5,000 / $6,666.67 Freddie on $1.2M; $4,166.67 / $6,250 / $8,333.33 on $1.5M).
- **Asset depletion worksheet:** step-by-step calculation with a plain-English explanation, on screen, as its own printout (Print worksheet), and attached to the Income Report whenever asset depletion is used.
- **W-2 years:** each W-2 entry's prior-year and two-years-prior columns have an editable year, for when the latest W-2 on hand is not last year's; the worksheet rules, the report and the Excel export use it.

## Release 55.16 - the Income Calculator is its own page with everything it had in the Full Suite

- **Carried over from the Full Suite's built-in calculator** into the Income Calculator (income-features.js, the original modules): the **VA Income** tab (military base and special pay, BAH, BAS, clothing allowance, service-connected disability compensation, the twelve-month separation rule with re-enlistment, and the **VA residual income test** from VA Lenders Handbook M26-7, chapter 4, with VA / FHA / Conventional treatment); the **Stipulations** builder on the summary; the **asset statement OCR with large-deposit review** and the agency asset guidelines on the Assets tab.
- **Also added:** an **Auto (best fit)** agency choice that uses the agency giving the strongest qualifying result; a **Variable / Other Pay** income type (treated like irregular hours by the income worksheet rules); an optional **job title** on each W-2 entry.
- **The Income Calculator is no longer part of the Full Suite.** Full Suite and the Loan Suite pages have no Income Calculator / Loan Suite switch; anything that would open it opens income-calculator.html. The Documents pages keep their document tools without the calculator's header.

## Release 55.17 - AI document import; OCR into the Loan Suite, Renovation and Income Calculator

- **One AI document import** on the Documents pages (assets/loan-docs-ai.js): choose the document (1003 / URLA, fee sheet, Loan Estimate or Closing Disclosure, contractor estimate, purchase contract, appraisal, credit report, insurance, tax bill, bank statement, lease, income documents or any document), copy the prompt - it lists the exact fields that document can fill - and paste the returned JSON. Every item is listed with a **Place it in** dropdown (about 60 Loan Suite fields in six groups: file and property, loan and value, escrow, closing costs, renovation, assets and rent) and an include box; nothing is applied until you choose Apply. Percentages are converted (6.5% to 0.065). **Read figures from a document on this page** fills the same review table from OCR, without AI. Income documents go to the Income Calculator through the shared OCR handoff and are reviewed there.
- **More OCR dropdown options:** the document reader's destination list grows from 12 to 49 fields, and it recognises fee-sheet, 1003 and contractor-estimate lines (origination, processing, appraisal, credit report, flood and tax service, title, settlement, attorney, survey, recording, inspections, flood insurance, permits, plans, consultant, contractor total, gift funds, rent).
- The older prompt library and JSON quick import are kept, folded under **More prompts and JSON tools**. The Income Calculator's toolbar no longer shows on the Loan Suite Documents pages.

## Release 55.18 - lighter Loan Suite header; draw fees and renovation amount

- **Summary cards redone** (assets/loan-cards.js): one slim row - total loan, monthly payment, cash to close, back-end DTI - with the quote presets, program switch and compare beside it. It repaints only when the loan file changes, and only the figures that changed; the old cards were rebuilt on a one-second timer. Each card still opens the page that owns its figure.
- **Draw fees:** the banner across the top of the page is gone. The same option is a checkbox inside the Renovation section - *Auto-calculate title and inspection draw fees from the draw plan* - always available; ticked, the fees follow the number of draws (5 draws = $1,875 / $375 at the default per-draw fees), unticked they use the amounts entered by hand.
- **Renovation amount:** the setup box and *Contractor / base renovation* are one field and now mirror each other while typing.
- **Less work on an idle page:** two older routines rebuilt the renovation setup card and the property equity card every cycle even when nothing had changed - which also replaced the setup box while you were typing in it. They now rebuild only when their figures change (sections rebuilt while idle: 3 every 5 seconds before, none now).

## Release 55.19 - free-form entry everywhere; calculation checks against the guide and the Comprehensive calculator

- **Every number box takes free-form entries** - $1,234.56, 1,234, 15%, (1,200) and 1,200- (both read as negative). The Income Calculator's number boxes were strict browser number boxes that rejected $ and commas (typing $1,234 stored 0); all 125+ are now free-form text boxes with a numeric keypad on phones, in every tab including loan setup, the pay stub generator and the VA tab. The VA and asset-statement modules also read 1,234 as 1 before; they now read it as 1,234.
- **Every date box takes typed dates** - 9/15/2026, 9/15/26, 2026-09-15, 09152026, Sep 15 2026, 15 September 2026 - in the Income Calculator and on the Loan Suite pages (setup dates and the header As of / Closing boxes, which previously stored the typed text as is). An unreadable date is outlined and the previous value kept; the calendar buttons still work.
- **Freddie Mac asset depletion subtracts required reserves**, as the Comprehensive calculator and the NMB guide do (matches the guide's example: $820,000 / 240 = $3,416.67).
- **New files start on Fannie Mae again** (Auto (best fit) moved to the end of the agency list - as the first option it had become the default).
- **Checked against the NMB guide's worked examples:** 35-hour salaried $4,853.33; MTA bus operator $7,193.33 base + $1,601.33 overtime and differential = $8,794.67; S-corp 50% owner $9,416.67; asset depletion $2,277.78 (Fannie) and $3,416.67 (Freddie). All 57 NMB workbook cases still match.

## Release 55.20 - Auto agency by default, VA residual income on cash, darker theme

- **Agency: Auto (best fit) by default** on every file - the agency giving the strongest qualifying result is used. You can still choose one by hand, and that choice is kept with the file. The Income Report names the agency actually used, never Auto.
- **VA income:** non-taxable income (VA disability, BAH, BAS, clothing) is grossed up 25% for the debt-to-income ratio under VA, as in the NMB guide and the Comprehensive calculator; **residual income now uses the cash actually received** - every gross-up, including grossed-up Social Security on the Other Income tab, is taken back out. Corrected the residual table: the Northeast row for loans of $80,000 and up had the Midwest figures; it is now $450 / $755 / $909 / $1,025 / $1,062. Matches the guide's worked example: $10,500 for the ratio, 45.24% DTI, $1,025 table x 120% = $1,230 required, $3,288 residual.
- **Darker theme:** every dark blue one step deeper (page, cards, inputs, header, lines) and a deeper button blue.
- **Fixed:** the Loan Suite summary row (total loan, payment, cash to close, DTI and the presets) showed as grey boxes with dark text - the Loan Suite's own button styles were winning. It now shows as designed in both looks.

## Release 55.21 - NYC municipal and MTA pay on the W-2 worksheet

- **New lines in the W-2 Earnings table** (the NMB guide's municipal / MTA section and the Comprehensive calculator's W-2 tab), in the existing layout: **shift / night / weekend differentials** and **swing / report / travel time** (variable pay, averaged with Other Income - lowest of YTD, YTD + 1 year, YTD + 2 years); **Less: retro / back pay in YTD** (a lump-sum union settlement is taken out of YTD base so it does not inflate the run rate).
- **Longevity / service increment ($ per year)** - a contractual step, added to the stated base as annual / 12.
- **Bonus paid once a year?** - Yes averages the two prior years over 24 months, because a mid-year YTD overstates a once-a-year bonus.
- Checked: the Comprehensive calculator's W-2 example ($7,443.33 base with longevity + $1,500 overtime + $294.67 differentials = $9,238.00) and the guide's MTA example with the $8,000 retro check entered separately ($8,794.67). All 57 NMB workbook cases still match.

## Release 55.22 - Schedule L liquidity test, Non-QM tab, AUS guideline library

- **Business liquidity test on Schedule L lines** (1065 / 1120-S): cash, receivables, inventory, government and tax-exempt securities and other current assets against payables, notes due in under a year and other current liabilities, for both years; quick ratio and current ratio. **Liquidity documented?** has a new **Auto - from the Schedule L test** choice (selected as soon as a Schedule L line is entered): a most-recent-year quick ratio of 1.00 or better uses the full K-1 ordinary income, otherwise it is limited to distributions (conventional). Files that used the old two totals keep them.
- **New Non-QM tab** (from the Comprehensive calculator): 12 / 24-month **bank statement income** (deposit ledger, ineligible deposits, fixed or CPA expense factor or personal account, ownership); **DSCR** (amortizing or interest-only, short-term-rental haircut, taxes, insurance, HOA; ratio, pricing tier, net cash flow); the **DSCR prepayment penalty** (5/4/3/2/1, 3/2/1, flat %, six months interest; 1-5 years; penalty-free allowance). Each counts in qualifying income only when Use is ticked; a negative DSCR cash flow counts as a debt.
- **VA residual income:** the 5% reduction for an active-duty or retired veteran or spouse near a military base.
- **Schedule E personal-use test:** a warning when personal-use days exceed the greater of 14 days or 10% of fair rental days.
- **AUS Findings:** a guideline library - how every income type is calculated, by agency (W-2 base and variable pay, NYC municipal / MTA, union, Freddie 1099, Schedules C / F / D, K-1 / 1120-S / 1065, 1120, liquidity, non-taxable gross-up, rental, asset depletion, VA residual income, Non-QM).
- **Checked against the Comprehensive calculator** (recalculated in LibreOffice): quick ratio 4.72 / 5.25 and current ratio 5.28 / 5.85; S-corp $9,416.67; bank statement $15,666.67; DSCR 1.03 with $3,581.43 P&I and $133.57 cash flow; every prepayment-penalty year in every structure; non-taxable gross-up $5,410; VA residual $3,288. Schedule C differs by $8.33 a month because the calculator uses the NMB workbook's mileage rate for 2023 ($0.26) where the Comprehensive calculator uses the IRS figure ($0.28) - the workbook's mileage table needs updating.

## Release 55.23 - Quick is the home page, with ZIP estimates and a renovation loan estimate

- **Quick is the home page** (index.html). The page list moved to pages.html; the page switcher reads Home, All pages, Doc Organizer, Income, Full Suite.
- **ZIP code -> estimates on Quick**, from the Loan Suite's own engine (now loaded on Quick): property taxes (the area's effective tax rate times the price), insurance (rate per $1,000 of value), closing costs from the state closing-cost profile (including New York mortgage recording tax) and cash to close. Taxes and insurance follow the estimate until you type your own figure.
- **Construction / renovation on Quick:** FHA 203(k) or Fannie Mae HomeStyle - renovation amount, contingency (10% by default), mortgage payment reserves (0-6 months), optional after-repair value and an estimating cushion. The same rules as the Loan Suite give the renovation financed, base loan, upfront MIP and estimated loan amount, with and without the cushion (HomeStyle stops at 95% of the after-repair value); the mortgage calculator then prices that loan.
- **Removed:** the fast wage-earner check at the top of the W-2 tab; the Full Suite workspace directory (the wide Open workspace buttons - Rule tables, Mortgage rates, Escrow, Contract & LE and the rest - which repeated the navigation and showed as a pale block in the dark theme); the Income Calculator's Mortgage Rates and Taxes & Escrow tabs (Loan Suite tools, still on the Loan Suite pages); the duplicate chip row on Full Suite. The Full Suite navigation band is dark in the dark theme.

## Release 55.24 - features moved, not removed

- **Mortgage rates (the daily survey and the suite baseline) and Taxes & escrow (tax proration and the escrow cushion)** stay in the Income Calculator: their tab buttons are gone and both open from the calculator's menu (top right). The same tools are on the Loan Suite's Mortgage Rates and Taxes & Proration pages.
- **The quick W-2 check** moved from the top of the W-2 tab to the bottom, folded - it still calculates and pushes to a W-2 worksheet.
- Only the Full Suite's wide Open workspace buttons were removed; every page they opened is in the navigation. The page list is at pages.html (All pages in the page switcher).

## Release 56.0 - one File page, documents across the suite, Non-QM in Other Income, live sync on

- **File is one page:** Quote first, then Setup, then - for a renovation loan - Renovation. Setup and Renovation open as you scroll down to them and fold away from their headers; they are the engine's own cards, so every field and check works as before. The Setup and Renovation pages stay for old links.
- **Loan holds Property, Max Mortgage and Mortgage Rates** (page navigation and the Full Suite's tabs). In the Full Suite, File and Loan open their first page when clicked. The Renovation / Max mortgage pill row is gone, and the File / Loan tab row keeps its contrast in the dark themes (it was pale text on a white bar).
- **Documents, everywhere:** one document library for every page (Loan Suite, Income Calculator, Quick, Doc Organizer), kept in this browser only. Sections: Income, Assets, Property, Loan & costs, Renovation, Credit, Non-QM. New document types: bank and retirement statements, gift letters, earnest money receipts, purchase contracts, LE / CD, fee sheets, mortgage statements (another property), appraisals, tax bills, homeowners and flood insurance, HOA statements, leases / Form 1007, contractor bids, credit reports, business bank statements and P&Ls. Each value read from a document has a destination; Send places it in that field now, or the next time the page that owns it opens. Income documents still go through the Income Calculator's worksheet reader.
- **Non-QM is part of Other Income:** an **Add Non-QM** button with Bank statement, DSCR and Profit and loss. Bank statements and P&Ls can be uploaded: OCR fills one month per statement (transfers in go to the ineligible column) and the P&L revenue, cost of goods sold, expenses and period, and the note compares the P&L's printed net income with the calculation. New P&L income: net profit over 12 or 24 months, times ownership.
- **Live sync on by default** between the Income Calculator and the Loan Suite, both ways and as you type: income goes to the suite, and the suite's loan (base loan, rate, term, MI rate, taxes, insurance, HOA) fills the calculator's PITIA. A Live sync switch is on the calculator; the suite's Sync button controls the same setting.
- **Draw inspection fee per draw:** Conventional HomeStyle $150, FHA 203(k) $375 (Loan Suite and Quick). Switching the program moves a default fee; a fee typed by hand is kept.
- **Mortgage Rates pulls Mortgage News Daily** when it is opened (at most every 4 hours; the button always pulls), dated with MND's own update date. The page is read through public relays (r.jina.ai first); if none answers, the last rates stay and the paste box still works.
- **Income Calculator:** opens on W-2 & Salary. With only Year 1 entered, the W-2 table shows the YTD earnings, the months and the monthly average, and the YTD + prior-year averages show "—" instead of dividing by months with no income. With earnings but no rate, Auto uses the YTD average (it used a $0 base) and the variance no longer reads "Consistent". Plain-text documents can be read.
- **Assets:** the Agency asset guidelines pop-up is gone; the Planning summary and the Asset statement OCR & large-deposit review are calculator cards.
- **Checked:** every input on every Income Calculator tab and on the Loan Suite pages (no script errors, no NaN); payments against independent formulas (FHA $482,500 base / $490,943.75 total / $3,225.15 P&I; conventional $2,128.97); DSCR, bank statement and P&L income; draw fees (3 x $375 = $1,125; 3 x $150 = $450); live sync in both directions with both pages open.
- **Open question:** monthly FHA MIP is figured on the total loan including financed UFMIP in the Income Calculator and on the base loan in the Loan Suite (for example $276.79 vs $272.03 a month), so DTI can differ by a few dollars between the two.

## Release 56.1 - Document Builder in the Income Calculator and the Full Suite

- **Document Builder** (Documents panel > Build a document, the Income Calculator's Documents tab, the Loan Suite's Documents pages): build, preview, print and save as PDF. Every builder starts from the loan file and keeps its own draft in this browser.
- **Addendum:** six styles - the classic Amendment to Contract of Sale (from the $400K master), a clean Arial version, numbered Addendum #__ that lists earlier addenda, Addendum to Purchase Agreement with a signature table, the fill-in Purchase and Sale Agreement form, and a formal addendum with recitals. Up to 4 buyers and 4 sellers (with "By:" for estates). Changes: price, seller concession, add or remove a purchaser, closing date, mortgage commitment date, appraisal, earnest money, repairs or credit, any other terms. Clauses: FHA 203(k) lender verbiage, HomeStyle, FHA amendatory clause, VA escape clause.
- **Concession calculator:** base price, concession in dollars or percent, optional price increase by the concession, maximum allowed concession by program, occupancy and LTV, and the state transfer tax (and NY mansion tax) before and after - from the Loan Suite's own tables (`assets/mt-data.js`, copied from the engine at build time). Sends the price and concession to the addendum or the Loan Suite.
- **Drop a contract** on the addendum: buyers, sellers, address, price (from/to), concession, deposit and contract date are read (OCR for scans).
- **Property search:** each builder can look the address up (OpenStreetMap) to fill city, state, ZIP and county, and open a Google search to confirm it.
- **Lease agreement:** four styles (six-section lease after the supplied lease, detailed residential, month-to-month, accessory unit / room), up to 2 landlords and 4 tenants, drop an existing lease to fill it, send the rent to the Loan Suite.
- **Contractor estimate** (line items by trade, overhead and profit, contingency, permits, deposit and draw schedule; classic or modern) and **profit and loss** (three layouts, certification and signatures; sends to Non-QM P&L income). **Pay statement** opens the existing pay stub generator.
- **Commitment letter** in the layout of the supplied commitment agreement, with the company, NMLS, mortgagee clause and contacts as fields (no lender names built in). Drop a lender's conditional approval: OCR fills the borrowers, loan number, amount, rate, price, value, program, purpose, occupancy, term, dates and property, and lists every condition with a checkbox, category, timing and editable text. Lender-internal items (funder, disclosure, underwriter tasks) start unticked; standard conditions can be added; a name in the conditions can be replaced throughout.
- **MI & renovation fees worksheet:** FHA MIP from the HUD table (base loan and total loan shown side by side), PMI, UFMIP, duration; 203(k) / HomeStyle renovation fees with the supplemental origination fee - matches the Loan Suite's renovation total.
- **Full Suite:** its Addendum and Lease buttons open the new builders; the earlier forms stay available as "Classic addendum / lease form".
- **Income report:** the worksheet pages look like the NMB wage earner calculator (gray sheet, heavy frame, dark section bars); in Auto mode the Method row and unused columns now show the method actually used ("Need 2 yrs to use this amt.").
- **Fixed:** scanned PDFs were not sent to OCR because the built-in reader returned long unreadable text (Documents panel and the Income Calculator's Documents tab); PDF pages now render for OCR even when the tab is in the background; PDF and OCR libraries load correctly on the Loan Suite pages.

## Release 56.2 - open-ended document builders, concession calculator with transfer tax, six contractor estimates, OCR in every builder

- **Free-form fields in every builder:** dates are typed as you like ("3/15/2026", "March 15, 2026", "on or before April 30, 2026", "TBD") with a calendar button beside each; phrases print exactly as typed. State, residence type, rent due day, utilities, loan program, occupancy, loan type, lien, purpose, accounting basis, trade and unit fields take any text with a list of suggestions. Each Property block adds **Address exactly as it should print** (lot and block, a/k/a, unit wording) that replaces the composed address in the document.
- **Seller concession calculator:** an editable **purchase price basis**; the concession is typed as a **percent or a dollar amount and the other box follows** (the percent is of the final price, and whichever you typed stays fixed when the price changes); **Add the concession on top of the price** checkbox (unticked: included in the price); **Include transfer tax** checkbox with an editable rate (blank uses the state table), who pays (table, seller, buyer or 50/50), and **Raise the price to cover the seller's added transfer tax** so the seller nets the same; rounding of the new price; and a **New purchase price** you can type over, with "Use the calculated price" to go back. The side panel shows price change, concession, transfer tax before and after, seller net before and after, and the program's concession limit. Example: $400,000 basis, 3% on top, NJ 1% seller-paid transfer tax → $412,500 price, $12,375 concession, seller nets $396,000 either way.
- **Every addendum section is editable:** a **Wording** panel lists each section the addendum prints (price, concession, transfer tax, parties, dates, deposit, appraisal, repairs, 203(k) / HomeStyle / FHA / VA clauses) for rewording, with Reset; the opening and closing lines are editable too. New optional sections: **who pays the transfer tax** and **concession shown as a percent**.
- **Edit on page:** type straight onto the document in the preview before printing or saving the PDF, in every builder.
- **Six contractor estimate versions** in a dropdown: classic proposal, modern itemized, detailed bid (quantity, unit, unit price), renovation loan bid for 203(k) / HomeStyle (program, lender, consultant, draw schedule, contractor certification), one-page lump-sum bid, and proposal letter and contract. **Sample scopes** (kitchen, bathroom, roof, cosmetic refresh, exterior, full renovation) fill or add lines; new sales tax on materials, start date, time to complete, warranty, opening and acceptance wording.
- **OCR in every builder:** besides the contract, lease and approval drops, the contractor estimate reads a bid (company, phone, email, license, estimate number, date, customer, job site, each priced line, permits, and checks the bid total against the lines), the profit and loss reads a P&L (business, period, basis, income, cost of goods and expense lines), and the MI & renovation worksheet reads an MI quote, Loan Estimate, fee sheet or renovation budget (price, value, loan, term, MIP / PMI rate, UFMIP, renovation cost, contingency, draws, inspection and title fees, consultant, payment). The lease reader now also reads the term dates; a dropped contract with a changed price keeps both prices.
- Drafts from 56.1 carry over (the old concession value and "raise the price" choice become the new boxes).

## Release 56.3 - address suggestions on every address box; every document fits on one page

- **Address suggestions as you type** (assets/mt-addr.js) on every property and address box across the suite: the Loan Suite's property address (a pick fills the street, city, state, ZIP and New York county), the Income Calculator's property address, Schedule E and rental property, employer and other address boxes, and every document builder (the Property blocks fill street, city, state, ZIP and county; landlord and tenant mailing addresses, company and business addresses fill a full line; the commitment letter's two-line addresses fill street and "City, ST ZIP"). Where an address box has City / State / ZIP boxes beside it, they are filled too. Keyboard: arrow keys and Enter; Escape closes.
- Suggestions come from Photon (photon.komoot.io, OpenStreetMap data), US addresses only, ranked by the words you typed and leaning toward the loan file's ZIP. What you type in an address box is sent to Photon after a short pause; **Turn off suggestions** in the list (or in a builder's Property block) stops that, and the choice is kept in this browser. Addresses OpenStreetMap does not know can still be typed in full.
- **One page:** the addendum, lease, contractor estimate, profit and loss and MI worksheet fit on one page - a long page first gets narrower margins, then its text is scaled down evenly (the bar over the preview says by how much). Print and Download PDF produce that one page. Below a readable size (66%) the document keeps its length and the bar says how many pages it runs; the commitment letter, a multi-page lender form, stays at full size. **Fit on one page** can be unticked.
- Addenda with more than four signers put buyers and sellers side by side, and the fill-in style's large type steps down for long terms, so a 4-buyer, 4-seller addendum with 203(k) and FHA wording fits on one page in all six styles.
- Fixed: the Income Calculator rebuilds its panels as you type, which dropped the cursor from the property address box; the suggestion list now follows the rebuilt box and puts the cursor back.

## Release 56.4 - pay statement in the Document Builder, logos, two more styles for each builder

- **The pay stub generator is now the Document Builder's Pay statement**, in the Income Calculator and the Full Suite (the calculator's Pay Statement tab and the Loan Suite's Pay Statement button open it). It keeps the federal (Pub 15-T), New York State, NYC / Yonkers, FICA, SDI and Paid Family Leave withholding and the editable 2026 rate table, and adds: hourly or salary pay; any number of other earnings (commission, bonus, tips…) and after-tax deductions; **another state at a flat rate** with its own disability or local line, or no state tax; employee department and direct-deposit account (last 4); check / advice number; **three layouts** (classic, modern, compact stub); **OCR** of a dropped pay stub (employer, employee, dates, frequency, rate, hours, overtime, bonus, commission and year-to-date earnings, with the rebuilt gross checked against the stub's); and **Send to the Income Calculator employment record** - from the Full Suite it is applied the next time the Income Calculator opens.
- **Fixed:** for salaried pay, the old generator figured the hourly rate as if a period's hours were weekly hours, so a bi-weekly salary's overtime came out at half rate. The pay statement uses salary per period divided by the period's hours. Without overtime the results are unchanged to the cent.
- **Logo** on the pay statement, profit and loss and contractor estimate: upload a PNG, JPG, GIF, WebP or SVG (resized in the browser and kept with the draft), choose small to extra large, and place it left of the name, centered above or top right. The last logo uploaded is offered to the other builders.
- **Two more styles in each builder:** addendum - **Rider to Contract of Sale** with initials beside each paragraph, and a **modern contract amendment** with a table of changes and signature boxes; lease - a **one-page short form** and a **modern lease** with a key-terms table; profit and loss - **annualized** (monthly average and 12-month figures) and **comparative** (this period against a prior period, with change in dollars and percent; prior amounts are entered beside each line); contractor estimate - **grouped by trade** with subtotals and a summary, and a **quote / invoice** with quantity, unit price, a totals box and the deposit due.

## Release 56.5 - gift letters, tenant address choices, faster address matches

- **Gift letter builder** (Document Builder, Income Calculator and Full Suite) with four types: **Conventional** ("a gift … in an amount of up to $"), **Government** (FHA / VA / USDA - an exact amount, with an optional "not a loan, not borrowed" statement), **Full** (with the source of funds: bank, account type, account number, bank address, date transferred and where the funds went) and **Gift of equity** (donors are the legal owners, sales price and equity credited, borrower and donor details side by side). Choosing a type turns on its usual sections, and **every section can be turned off**: opening line, no-repayment line, source of funds, relationship, donor address and phone, borrower address and phone, legal-owner and price statements, the certification note, donor and borrower signature lines and the footer.
- Up to **4 borrowers and 4 donors**, each donor with relationship (a list of common relationships, or type any), address (with address suggestions that fill city, state and ZIP), phone and email; any number of extra statements; every sentence rewordable; a logo; the letter date and footer are optional. OCR reads a dropped gift letter (type, amount, borrowers, donor, relationship, address, phone, property, bank, account and transfer date). The letters follow the common industry wording; lender names and form numbers are left off.
- **Lease:** each tenant has **"Address is the subject property"** (the tenant's address prints as the premises) and **"Leave the address off"** (the address line is dropped) checkboxes, in every lease style.
- **Address suggestions match known addresses instantly:** the loan file's property, the document builders' properties, addresses picked before and full addresses typed into an address box are matched on every keystroke without waiting for the network (tagged "Loan file", "Document builder", "Used before", "Typed before"); OpenStreetMap results join them, now after 0.2 seconds and from the third character.
- The MI & renovation worksheet's program is a typeable box (FHA, FHA 203(k), Conventional, HomeStyle, VA, USDA or anything else). Choices that drive a calculation - pay frequency, filing status, the state tax table, lease type and each builder's style - stay as lists.

## Release 56.6 - documents print and save as PDF without cut-off text, page layout and margin choices, paste a screenshot into any document reader

- **No more cut-off pages.** Long documents used to be photographed as one tall page and sliced every 11 inches, which could split a line of text and dropped the margins on later pages. The Document Builder now sets documents out on real pages before printing or saving: breaks fall between paragraphs, table rows (the table header repeats on the next page), list items (numbering continues) and signature lines; headings stay with what follows them; every page keeps its margins; multi-page documents get "Page 1 of 3" numbers. Preview, Print and Download PDF show the same pages, and each PDF page is exactly one letter-size sheet.
- **Layout choice** above the preview, for every document type: **Fit on one page** (as before - narrower margins, then the text scaled evenly to a readable minimum; a document that still does not fit is now set out on proper pages with full margins instead of running off the page) or **Proper spacing - as many pages as needed**.
- **Margin choice:** Document default, Narrow (0.5 in), Normal (0.75 in) or Wide (1 in) on every side, including documents with a full-width colour header. The choices are remembered in this browser.
- **Export waits for your last edit.** The preview rebuilds a moment after each change; Print and Download PDF now finish that rebuild first, so a value typed just before clicking is always in the output (it could previously export the earlier version).
- **Paste a screenshot** into every document reader: the Document Builder's drop zones (contract, lease, approval, contractor bid, profit and loss, MI quote, pay stub, gift letter), the shared document library, the Income Calculator's Document Import, Non-QM and asset statements, the Loan Suite's document pages and the Doc Organizer. Each has a **Paste screenshot** button, and **Ctrl+V / Cmd+V** with an image on the clipboard goes to the reader last used (or the one on screen). Readers that take images get the image; readers that take only PDF or text get the screenshot's text, read with OCR first. A file copied from the computer can be pasted the same way. Ordinary text pastes into fields are unchanged.

## Release 56.7 - search everywhere, relative dates, Schedule C and Loan Estimate drafts, editable lease sections, commitment letters from a conditions list

- **Search on every page** (Ctrl+K / Cmd+K, or the Search button at the bottom): pages, Income Calculator tabs, document builders and their layouts, sample estimate scopes, and on the open page every section, field and drop-down option. Choosing an option sets it (and says what it was); choosing a field opens its tab or folded section and puts the cursor in it; a builder or page on another page opens there.
- **Dates in words:** any document builder date takes Today, Tomorrow, Yesterday, "30 days ago", "3 months back", "in 2 weeks", "2 years from now", +30d / -3m / +1y, next / last month or year, end of month, end of next month, first of next month. It turns into a date when you leave the box.
- **Lease term:** a fixed-term lease has a Term choice (1 year, 6, 18, 24 or 36 months, or custom). The end date is the day before the same date that many months later (1 year from 3/1/2026 ends 2/28/2027) and follows the start date; typing an end date by hand switches the term to Custom.
- **Last 3 versions kept** for each document: saved when you switch documents, close, print, save a PDF, refill or start over, and 20 seconds after edits. Versions restores one (the current one is kept too).
- **Fill from** the loan file or any saved scenario, on the Loan Suite pages and the Income Calculator (which loads the calculation engine when needed).
- **Schedule C analysis** (new builder): lines 31, 12, 13, 30, amortization, meals and non-recurring income, plus business miles at the depreciation rate; two years averaged, or the most recent year when income declined (by the years entered, whichever column they are in); ownership share; read from a return or pulled from the Income Calculator. **Loan Estimate draft** (new builder, marked DRAFT): sections A-H from the loan file or a fee sheet, every line editable, add or remove lines, cash to close from the same figures.
- **Leases:** two more layouts - **numbered clauses with tenant initials on every page**, and **check-one options** with an optional landlord's agent, notary acknowledgment and security deposit receipt. The clause wording was written for this suite following the structure of the sample leases; no layout names a state (deposit and governing-law wording refers to the law where the premises is located). **Every section of every lease layout** can be left out, renamed or reworded (with {rent}, {deposit}, {start}, {end}, {tenant} and other values filled in), put back to the standard wording, and you can add your own sections.
- **Contractor estimates:** the payment / draw schedule can be left out entirely, the deposit line disappears at 0%, and "Set each draw myself" lets you name each draw, give it a share of the balance (blank shares split the rest), and remove any draw. The Terms heading is left off when there are no terms.
- **Commitment letter from a conditions list:** paste the condition rows copied from your loan system or a spreadsheet (with the header row), or drop or paste a screenshot of the list, and each row becomes a condition - category, borrower-facing wording, internal note, prior-to-docs or at-closing, and "Received / cleared" from the status column. Lender-internal rows (approval, disclosures, funder, escrow) start unticked. Each condition has a **Received / cleared** box. **Email the conditions** opens your email program with the still-needed items unchecked and received items checked off (a long list is copied for pasting); **Copy for email** puts a table with check boxes on the clipboard for Outlook or Gmail; **Copy as spreadsheet rows** gives tab-separated rows for Excel.
- **Pasting:** each reader also has **Paste text / several** - a tray that gathers several screenshots and pasted text (an email, a web page) and reads them in order into one file for readers that take one. Pressing Ctrl+V with text while a builder or the document library is open (and no field is selected) opens the tray with that text. Windows Snipping Tool (Win+Shift+S) and Mac clipboard screenshots paste with Ctrl+V / Cmd+V. The gift letter reader also understands typed labels such as "Donor:" and "Relationship:".
- Tested in the browser: relative dates and the lease term; versions; Fill from on the Income Calculator; Schedule C both year orders; Loan Estimate lines and totals; every lease layout, leaving every section out, rewording, custom sections, the initials line; draw schedules in all estimate layouts; the conditions rows from a real export and a rendered screenshot; email and copy text (clipboard stubbed - no email was sent); all 10 builders and their layouts with no errors. Not tested: a real low-resolution screenshot of a full conditions grid (OCR on small text may miss rows - pasting the copied rows is the reliable route), and the mail link opening a real email program.

## Release 56.8 - the Simple quote screen in the Full Suite, and lighter pages

- **Simple | Advanced in the Full Suite.** The Full Suite and the Loan Suite File page now open on the Simple quote screen:
  - **What it shows:** seven sections, the live summary, assumptions in use, and every check.
  - **One scenario:** it works on the suite's own scenario and calculation, so the two views always agree.
  - **Advanced** is the full suite, as before.
  - **Section tabs:** the suite's section tabs lead the Simple screen. File, Renovation, Loan, Housing, Costs, Underwriting and Results go to their Simple section; Documents, Rates, Property and Max mortgage open the full suite on that tab.
  - **Default:** each fresh visit opens Simple; the choice is kept while the tab stays open.
- **The amount a loan cannot cover is shown.** The classic calculation leaves it out of cash to close. The Simple screen works it out and says "plus $X not financed (not in this figure)" until v57's calculation, which includes it, replaces the classic one.
- **Loaded when used:**
  - **Libraries:** the PDF writer and reader (about 0.9 MB from the CDN) load only when a PDF is made or read, not on the first click.
  - **Document Builder:** loads on first open (a 4 KB stand-in keeps its buttons working).
  - **Lookups:** ZIP and census lookups run only when a ZIP is changed, not when a page opens.
- **Scanned PDFs read properly in the Loan Suite readers.** A PDF waits for the real PDF reader instead of being handed to a text-only stand-in. The libraries also no longer get captured by the suite's module loader.
- **Less polling:** the document center and builder no longer re-check the page every 1.5 seconds.
- **Assets:** the Simple screen shows blank assets as "not entered", not "calculated".

## Release 55.14b - self-employment, rental and more of the income worksheet; one look across the pages

- **Self-employment follows the income worksheet** (sections A-E and Tables!J20:K31), proven against the workbook (16 of 16 cases). Fixed: K-1 amounts were multiplied by the ownership percentage a second time (a 10% partner's $10,748 K-1 counted as $1,075); with only one year of returns entered the income was halved; the 1120 net operating loss is added back and dividends are subtracted, as on the worksheet and Form 1084. Added: Schedule F (farm), Schedule D (recurring capital gains - the worksheet takes the larger year), Schedule C line 6 non-recurring income, 1065 line 4 income from other partnerships, business mileage decided on its own with the worksheet's rate table.
- **Rental follows the income worksheet** (7 of 7 cases): the two-year rental screen takes the purchase date and the years of returns the AUS requires; a property bought during a tax year is annualized over the months owned. The fair-rental-days method is kept for part-year rentals without a purchase date.
- **More from the worksheet:** a Union worker option for combined jobs (lowest of YTD, YTD + 12, YTD + 24 on a 360-day basis), the Freddie Mac 1099 method on 1099 income, and a non-taxable portion % so only that share is grossed up (7 of 7 union and 1099 cases match).
- **One look across the pages:** a shared theme (assets/mtgcalc-theme.css) taken from the Income Calculator - navy bar, light canvas, white cards, the worksheet's yellow input cells. Doc Organizer now uses it instead of its own dark design; the hub and Quick match. Loan Suite pages: the KPI chip row that repeated the cards is gone and the page navigation is one row, so content starts higher; the Renovation page has worksheet-style sections and inputs. Only the default Look is restyled; every other Look keeps its own colours. No features were removed.
- **FHA owner-occupied rentals (2-4 units)** follow the worksheet's 'Rent - FHA Owner Occ.' sheet (5 of 5 cases): line 21 net income plus insurance, mortgage interest, taxes, depreciation and the HOA portion of line 19, annualized for a year the property was bought in.
- **FHA non-owner and VA rentals** follow the worksheet's 'Rent - FHA NOO & VA' sheet (6 of 6 cases): a rental method using Schedule E line 21 plus depreciation, annualized for an FHA property bought during a tax year (VA is not).
- **OCR on tax-return screenshots:** Schedule C line 30 (business use of home) is read from the amount column, not the square footage in its instructions.
- **The Income tab inside Full Suite** is the classic calculator; it now points to the up-to-date Income Calculator, which shares the loan file.
- **Worksheet issues to fix in Excel:** February is always 29 days (copied, to match); the rental end-of-year table is frozen at 2013-2017, which breaks part-year rentals bought after 2017 (the calculator uses the real year end); the mileage rates are keyed to today's year and are out of date (copied, to match); Schedule D takes the higher year, unlike every other section; on 'Rent - FHA Owner Occ.' the last input row is still labelled "Sub-total of Expenses" though it holds Schedule E line 21 (net income) - worth relabelling.

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
