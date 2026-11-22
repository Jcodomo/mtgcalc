/* 57.31 — Income rules brought up to date (checked against the guides on 2026-11-22):
   - Fannie Mae restructured its income chapters in 2026 (employment B3-3.2/B3-3.3, other income B3-3.4, self-employed
     B3-3.5-B3-3.7) and rental income on 09/02/2026 (SEL-2026-08: B3-3.8-01 to B3-3.8-06). Every citation and link is
     moved to the new numbers; the summaries for rental, departing residence, ADU, subject rent, short-term rental, the
     45-day rule, employment gaps, offer letters, gifts and reserves are rewritten from the current text.
   - Freddie Mac: Guide sections as published 11/2026 (5303.1, 5303.2, 5305.1, 5306.1 (11/04/2026), 5501.x).
   - Schedule E: a fall of more than 20% from the prior year is flagged; a rise of 10% or more shows, in green, the
     one-year option conventional loans allow (Fannie and Freddie qualify rental income from the most recent return).
   - Lease method: what kind of property it is (departing residence, ADU, subject rent, bought within 45 days, other
     investment), with property-management experience, and the Fannie / Freddie / FHA results side by side.
   - Compare any income type side by side (Fannie / Freddie / FHA), whatever is entered in the file.
   - Employment gap and offer-letter check on the W-2 tab. */
(function () {
  'use strict';
  if (typeof GUIDES === 'undefined' || !Array.isArray(GUIDES)) return;
  const VERIFIED = '2026-11-22';
  const FNMA_MAP = {"B3-4.1-04":"b3-4.1-04/virtual-currency","B3-6-01":"b3-6-01/general-information-liabilities","B3-3.6-07":"b3-3.6-07/income-or-loss-reported-irs-form-1065-or-irs-form-1120s-schedule-k-1","B3-3.3-01":"b3-3.3-01/base-income","B3-3.8-01":"b3-3.8-01/general-rental-income-information","B3-6-03":"b3-6-03/monthly-housing-expense-subject-property","B3-3.7-02":"b3-3.7-02/analyzing-returns-s-corporation","B3-3.3-03":"b3-3.3-03/employment-offers-or-contracts","B3-4.3-14":"b3-4.3-14/bridgeswing-loans","B1-1-03":"b1-1-03/allowable-age-credit-documents-and-federal-income-tax-returns","B3-3.7-03":"b3-3.7-03/analyzing-returns-corporation","B3-6-04":"b3-6-04/qualifying-payment-requirements","B3-4.3-08":"b3-4.3-08/employer-assistance","B3-4.3-11":"b3-4.3-11/trade-equity","B3-6-07":"b3-6-07/debts-paid-or-prior-closing","B3-3.1-04":"b3-3.1-04/verbal-verification-employment","B4-1.4-02":"b4-1.4-02/factory-built-housing-modular-prefabricated-panelized-or-sectional-housing","B3-3.4-13":"b3-3.4-13/royalty-payment-income","B4-1.4-10":"b4-1.4-10/value-acceptance","B3-3.4-04":"b3-3.4-04/boarder-income","B4-1.4-07":"b4-1.4-07/mixed-use-property-appraisal-requirements","B3-3.4-17":"b3-3.4-17/unemployment-benefits-income","B4-1.4-01":"b4-1.4-01/factory-built-housing-manufactured-housing","B3-4.3-05":"b3-4.3-05/gifts-equity","B3-3.7-01":"b3-3.7-01/analyzing-partnership-returns-partnership-or-llc","B3-3.4-05":"b3-3.4-05/capital-gains-income","B3-4.2-04":"b3-4.2-04/pooled-savings-community-savings-funds","B3-3.3-07":"b3-3.3-07/restricted-stock-units-and-restricted-stock-employment-income","B3-4.1-02":"b3-4.1-02/interested-party-contributions-ipcs","B3-3.4-16":"b3-3.4-16/trust-income","B3-3.4-01":"b3-3.4-01/general-requirements-other-sources-income","B3-3.2-02":"b3-3.2-02/standards-employment-related-income","B3-3.4-08":"b3-3.4-08/interest-and-dividend-income","B3-3.6-02":"b3-3.6-02/income-reported-irs-form-1040","B3-4.4-01":"b3-4.4-01/du-asset-verification","B3-3.8-05":"b3-3.8-05/rental-income-non-subject-property-departing-residence","B3-3.7-04":"b3-3.7-04/analyzing-profit-and-loss-statements","B3-4.2-05":"b3-4.2-05/foreign-assets","B3-6-06":"b3-6-06/qualifying-impact-other-real-estate-owned","B3-3.4-11":"b3-3.4-11/notes-receivable-income","B3-3.5-03":"b3-3.5-03/irs-forms-quick-reference","B3-3.4-19":"b3-3.4-19/schedule-k-1-income","B3-3.8-06":"b3-3.8-06/rental-income-non-subject-property-investment-properties-purchased-within-45-days-subject-property","B3-3.3-09":"b3-3.3-09/temporary-leave-income","B4-1.4-08":"b4-1.4-08/environmental-hazards-appraisal-requirements","B3-3.6-05":"b3-3.6-05/income-or-loss-reported-irs-form-1040-schedule-e","B3-3.3-05":"b3-3.3-05/military-income","B3-4.3-10":"b3-4.3-10/anticipated-sales-proceeds","B4-1.4-11":"b4-1.4-11/value-acceptance-property-data","B3-4.1-01":"b3-4.1-01/minimum-reserve-requirements","B3-3.8-04":"b3-3.8-04/rental-income-non-subject-property","B3-3.6-03":"b3-3.6-03/income-or-loss-reported-irs-form-1040-schedule-c","B3-4.3-21":"b3-4.3-21/borrowers-earned-real-estate-commission","B3-4.3-19":"b3-4.3-19/cash-value-life-insurance","B3-3.4-18":"b3-3.4-18/va-benefits-income","B3-3.1-03":"b3-3.1-03/income-calculator","B3-3.2-01":"b3-3.2-01/standards-employment-and-income-documentation","B3-3.5-02":"b3-3.5-02/business-structures","B3-3.6-04":"b3-3.6-04/income-or-loss-reported-irs-form-1040-schedule-d","B3-4.1-03":"b3-4.1-03/lender-incentives","B3-3.4-09":"b3-3.4-09/long-term-disability-income","B3-4.3-09":"b3-4.3-09/earnest-money-deposit","B3-3.1-02":"b3-3.1-02/tax-return-and-transcript-documentation-requirements","B3-4.3-04":"b3-4.3-04/personal-gifts","B3-3.3-08":"b3-3.3-08/seasonal-income","B3-3.4-06":"b3-3.4-06/employment-related-assets-qualifying-income","B3-3.4-10":"b3-3.4-10/mortgage-credit-certificates","B3-3.8-03":"b3-3.8-03/rental-income-subject-property-short-term-rental","B3-3.3-04":"b3-3.3-04/housing-parsonage-and-automobile-allowances","B3-3.1-01":"b3-3.1-01/general-income-information","B3-4.3-20":"b3-4.3-20/anticipated-savings-and-cash-hand","B3-3.4-14":"b3-3.4-14/section-8-housing-choice-voucher-homeownership-program-payments","B3-6-05":"b3-6-05/monthly-debt-obligations","B3-4.3-01":"b3-4.3-01/stocks-stock-options-bonds-and-mutual-funds","B4-1.4-09":"b4-1.4-09/special-assessment-or-community-facilities-districts-appraisal-requirements","B3-4.4-02":"b3-4.4-02/requirements-certain-assets-du","B3-4.3-12":"b3-4.3-12/rent-related-credits","B3-4.3-03":"b3-4.3-03/retirement-accounts","B3-3.4-03":"b3-3.4-03/annuity-pension-or-retirement-income","B3-3.3-02":"b3-3.3-02/bonus-commission-overtime-and-tip-income","B4-1.4-06":"b4-1.4-06/community-land-trust-appraisal-requirements","B3-3.6-01":"b3-3.6-01/general-information-analyzing-individual-tax-returns","B4-1.4-05":"b4-1.4-05/leasehold-interests-appraisal-requirements","B3-4.3-18":"b3-4.3-18/sale-personal-assets","B3-6-02":"b3-6-02/debt-income-ratios","B3-3.4-07":"b3-3.4-07/foster-care-income","B3-3.4-15":"b3-3.4-15/social-security-income","B3-3.4-02":"b3-3.4-02/alimony-child-support-equalization-payments-or-separate-maintenance","B3-4.3-13":"b3-4.3-13/sweat-equity","B3-3.5-01":"b3-3.5-01/underwriting-factors-and-documentation-self-employed-borrower","B3-3.4-12":"b3-3.4-12/public-assistance-income","B3-4.3-02":"b3-4.3-02/trust-accounts","B3-3.8-02":"b3-3.8-02/rental-income-subject-property","B3-3.3-06":"b3-3.3-06/mortgage-differential-payments-income","B3-6-08":"b3-6-08/du-requirements-liability-assessment","B3-3.6-06":"b3-3.6-06/income-or-loss-reported-irs-form-1040-schedule-f","B3-4.3-16":"b3-4.3-16/credit-card-financing-and-reward-points","B4-1.4-04":"b4-1.4-04/co-op-appraisal-requirements","B4-1.4-03":"b4-1.4-03/condo-appraisal-requirements","B3-4.2-03":"b3-4.2-03/individual-development-accounts","B3-4.2-01":"b3-4.2-01/verification-deposits-and-assets","B3-4.3-17":"b3-4.3-17/personal-unsecured-loans","B3-4.3-06":"b3-4.3-06/grants-and-lender-contributions","B3-4.3-07":"b3-4.3-07/disaster-relief-grants-or-loans","B3-4.2-02":"b3-4.2-02/depository-accounts","B3-4.3-15":"b3-4.3-15/borrowed-funds-secured-asset"};
  const NUM = (v) => (typeof N === 'function' ? N(v) : (Number(String(v == null ? '' : v).replace(/[$,\s]/g, '')) || 0));
  const $m = (v) => (typeof money === 'function' ? money(v) : '$' + (Math.round((+v || 0) * 100) / 100).toFixed(2));
  const E = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const byId = (id) => document.getElementById(id);
  const CONV = () => S.agency === 'FNMA' || S.agency === 'FHLMC';

  /* ---------------------------------------------------------------- 1. citations moved to the 2026 numbers */
  const CITES = {
    w2: { FNMA: 'B3-3.2-01 / B3-3.3-01', FHLMC: 'Guide 5303.1', FHA: '4000.1 II.A.4.c.ii' },
    variable: { FNMA: 'B3-3.3-02', FHLMC: 'Guide 5303.1(d)', FHA: '4000.1 II.A.4.c.ii' },
    declining: { FNMA: 'B3-3.1-01', FHLMC: 'Guide 5301.1', FHA: '4000.1 II.A.4.c' },
    schc: { FNMA: 'B3-3.5-01 / B3-3.6-03 / Form 1084', FHLMC: 'Guide 5304.1 / Form 91', FHA: '4000.1 II.A.4.c.iii' },
    partnership: { FNMA: 'B3-3.7-01 / B3-3.6-07', FHLMC: 'Guide 5304.1', FHA: '4000.1 II.A.4.c.iii' },
    scorp: { FNMA: 'B3-3.7-02 / B3-3.6-07', FHLMC: 'Guide 5304.1', FHA: '4000.1 II.A.4.c.iii' },
    ccorp: { FNMA: 'B3-3.7-03', FHLMC: 'Guide 5304.1', FHA: '4000.1 II.A.4.c.iii' },
    ss: { FNMA: 'B3-3.4-15', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    retire: { FNMA: 'B3-3.4-03', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    support: { FNMA: 'B3-3.4-02', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    disab: { FNMA: 'B3-3.4-09', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    va: { FNMA: 'B3-3.4-18', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    military: { FNMA: 'B3-3.3-05', FHLMC: 'Guide 5303.1', FHA: '4000.1 II.A.4.c.ii' },
    intdiv: { FNMA: 'B3-3.4-08', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    capgain: { FNMA: 'B3-3.4-05', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    trust: { FNMA: 'B3-3.4-16', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    notes: { FNMA: 'B3-3.4-11', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    royalty: { FNMA: 'B3-3.4-13', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    unemp: { FNMA: 'B3-3.3-08 / B3-3.4-17', FHLMC: 'Guide 5303.1', FHA: '4000.1 II.A.4.c.iv' },
    boarder: { FNMA: 'B3-3.4-04', FHLMC: 'Guide 4501.6(b) (Home Possible) / 5306.1(j)', FHA: '4000.1 II.A.4.c.iv' },
    foster: { FNMA: 'B3-3.4-07', FHLMC: 'Guide 5305.1(e)', FHA: '4000.1 II.A.4.c.iv' },
    allow: { FNMA: 'B3-3.3-04', FHLMC: 'Guide 5303.1 / 5305.1', FHA: '4000.1 II.A.4.c.ii' },
    c1099: { FNMA: 'B3-3.5-01', FHLMC: 'Guide 5304.1', FHA: '4000.1 II.A.4.c.iii' },
    tip: { FNMA: 'B3-3.3-02', FHLMC: 'Guide 5303.1', FHA: '4000.1 II.A.4.c.ii' },
    pubassist: { FNMA: 'B3-3.4-12', FHLMC: 'Guide 5305.1', FHA: '4000.1 II.A.4.c.iv' },
    grossup: { FNMA: 'B3-3.1-01', FHLMC: 'Guide 5305.1(r)', FHA: '4000.1 II.A.4.c.iv' },
    assets: { FNMA: 'B3-3.4-06', FHLMC: 'Guide 5307.1', FHA: '4000.1 II.A.4.c.iv' },
    dti: { FNMA: 'B3-6-02', FHLMC: 'Guide 5401.2', FHA: '4000.1 II.A.5' },
    docs: { FNMA: 'B1-1-03 / B3-3.1-02', FHLMC: 'Guide 5102.4 / 5302.4', FHA: '4000.1 II.A.1.b' },
  };
  GUIDES.forEach((g) => { if (CITES[g.key]) g.cite = Object.assign({}, g.cite, CITES[g.key]); g.verified = VERIFIED; });

  /* ---------------------------------------------------------------- 2. topics rewritten or added from the current text */
  const TOPICS = [
    { key: 'rental', title: 'Rental / Schedule E Income', cat: 'Real Estate',
      cite: { FNMA: 'B3-3.8-01 / B3-3.8-04', FHLMC: 'Guide 5306.1(d)', FHA: '4000.1 II.A.4.c (Rental Income)' },
      FNMA: `Restructured 09/02/2026 (SEL-2026-08). Existing rentals: cash flow from the <b>most recent year's</b> Schedule E (rents − expenses + depreciation, mortgage interest, HOA, taxes, insurance and documented one-time expenses) over 12 months, or the months in service when a lease exception applies, minus the property's full PITIA. A <b>lease</b> (75% of the rent) only when the property was bought during or after the last filed return, was out of service (renovation), is placed in service this year, or another documented reason — <b>never</b> for a departing residence or a property bought within 45 days. Positive rental income needs <b>12 months of property management experience</b> (a 1040 with Schedule E showing 365 fair rental days, a Form 8825, or a lease at least 12 months old); with less, rent only offsets that property's PITIA. A current housing payment must be documented.`,
      FHLMC: `Most recent year's Schedule E (Form 92), divided by 12 — or by the months since purchase or conversion, or the days in service when the property was out of service for documented repairs. A lease (75%) only when the most recent return does not include the property or it was out of service. The full net rental income needs at least <b>one year of investment property management experience</b>; otherwise it only offsets the property's PITI(A). Insurance, interest, taxes and HOA are added back only when they are in the payment used in the DTI.`,
      FHA: `Average the last <b>two years</b> of Schedule E, adding back depreciation, mortgage interest, taxes, insurance and HOA dues; owned under two years: annualize for the time owned. Limited or no rental history: 75% of the lesser of the appraiser's market rent or the lease, and for other real estate an appraisal showing at least <b>25% equity</b>. A net loss is a debt.`,
      rule: `Schedule E method: the most recent year when income fell, the two-year average when it rose — or set "Years of returns the AUS requires" to 1 year to use the most recent year. A fall of more than 20% is flagged in red; a rise of 10% or more shows the one-year option in green for conventional loans.` },
    { key: 'departing', title: 'Departing Residence (Vacated Primary Converted to a Rental)', cat: 'Real Estate',
      cite: { FNMA: 'B3-3.8-05', FHLMC: 'Guide 5306.1(e)', FHA: '4000.1 II.A.4.c (Property being vacated)' },
      FNMA: `Changed 09/02/2026: <b>market rent only</b> — a full appraisal with market rents, Form 1007 for the occupied unit, or a market analysis (Zillow, Redfin, MLS…) with at least <b>three comparable rentals</b>; <b>leases are not permitted</b>. 75% of market rent − PITIA. A positive result may only <b>offset the departing residence's PITIA</b> (it is never added to income); a negative result is a debt. Extra reserves of <b>six months' PITIA</b> for the departing residence when the borrower has under 12 months of property management experience (on top of multiple-financed-property reserves). A current housing payment must be documented.`,
      FHLMC: `A <b>lease is required</b>: current and fully executed, first rent due no later than the subject's first payment date, supported by an appraisal rent analysis or proof of two months' rent (or the security deposit and first month's rent) deposited. 75% of the lease rent − PITIA. Positive income counts in full only when a borrower has <b>one year of investment property management experience</b>; otherwise it only offsets the PITI(A).`,
      FHA: `Only when the borrower is relocating more than <b>100 miles</b> from the current residence, with a lease of at least one year after closing and proof of the security deposit or first month's rent; with no rental history an appraisal must show market rent and at least <b>25% equity</b>. 75% of the lesser of market rent or the lease, minus PITIA. Otherwise the full PITIA is a debt.`,
      rule: `Lease method → Property: Departing residence. The Fannie, Freddie and FHA results are shown side by side; the agency in the header decides which one is used.` },
    { key: 'adu', title: 'Accessory Dwelling Unit (ADU) Rental Income', cat: 'Real Estate',
      cite: { FNMA: 'B3-3.8-02 (ADU limitations)', FHLMC: 'Guide 5306.1(i)', FHA: '4000.1 II.A.4.c (One-Unit with an ADU)' },
      FNMA: `One <b>existing</b> ADU on a one-unit principal residence; <b>purchase or limited cash-out refinance</b> only. Purchase: Form 1007 (and the lease when one transfers); refinance: Schedule E cash flow when the ADU is on the most recent return. 75% of the ADU rent. ADU income is capped at <b>30% of total qualifying income</b>. Short-term rental income cannot come from an ADU.`,
      FHLMC: `The ADU must have legal or legal non-conforming zoning (or no zoning). Purchase or no cash-out refinance. Lease when available, supported by the appraisal's ADU rental analysis — at least <b>three comparable rentals</b>, one of them a rented ADU. 75% of the lease or market rent, capped at <b>30% of total stable monthly income</b>; the housing expense is calculated without the rent. Purchases: a borrower completes <b>landlord education</b> unless one has a year of property or ADU management experience. Rent from one or more ADUs on a non-subject investment property may also count.`,
      FHA: `One-unit with an ADU: a URAR and Form 1007 showing fair market rent (and the lease if available). 75% of the lesser of market rent or the lease; ADU income may not exceed <b>30%</b> of total effective income. Extra reserves apply to a one-unit with an ADU.`,
      rule: `Lease method → Property: ADU. 75% of the rent is added to income (the full PITIA stays in the housing payment), capped at 30% of total qualifying income.` },
    { key: 'subjrent', title: 'Subject Property Rent (Purchase / 2-4 Units / Form 1007)', cat: 'Real Estate',
      cite: { FNMA: 'B3-3.8-02', FHLMC: 'Guide 5306.1(b),(c),(f),(g)', FHA: '4000.1 II.A.4.c (Subject property)' },
      FNMA: `Eligible: 2-4 unit principal residences, 1-4 unit investment properties, one ADU. Purchase: Form 1007 or 1025 (and the lease when it transfers, supported by the form); <b>75% of gross rent − the subject PITIA</b>. Refinance: Schedule E cash flow (12 months, or months in service when a lease exception applies); not on Schedule E: 75% of the lease. Under 12 months of management experience: positive income only offsets the PITIA. Market rents that do not support the lease: written analysis, or use the lesser amount.`,
      FHLMC: `Purchase: 75% of the existing lease (in the property seller's name) or of the appraisal's market rent; each borrower must own a primary residence or have a documented rental housing payment; the full income needs one year of investment property management experience, otherwise it only offsets the PITI(A). Refinance, owned in the prior year: Schedule E (Form 92); bought this year: 75% of the lease.`,
      FHA: `No rental history: 75% of the lesser of the appraiser's fair market rent or the lease; with history, the Schedule E average. Net subject rent is added to income — the mortgage payment is not reduced by it. 3-4 units must pass the <b>self-sufficiency test</b> (net rental income ≥ PITI).`,
      rule: `Lease method → Property: Subject property (purchase / Form 1007).` },
    { key: 'within45', title: 'Investment Property Bought Within 45 Days', cat: 'Real Estate',
      cite: { FNMA: 'B3-3.8-06', FHLMC: 'Guide 5306.1(d)(i)', FHA: '4000.1 II.A.4.c (Other real estate)' },
      FNMA: `New 09/02/2026: 1-4 unit investment properties bought within 45 days of the subject application. Market rent from the appraisal (Form 1004/1025, may be from the original purchase), or Form 1007, or a market analysis with three comparables for multi-unit; <b>leases are not permitted</b>. 75% of market rent − PITIA; a positive result <b>only offsets the PITIA</b>.`,
      FHLMC: `Bought on or up to 45 days before the Note Date and not yet rented: the appraisal may establish market rent instead of a lease. 75% of market rent − PITIA; full income needs one year of management experience and a current primary residence or documented rent.`,
      FHA: `Limited rental history: appraisal with market rent and at least 25% equity; 75% of the lesser of market rent or lease.`,
      rule: `Lease method → Property: Bought within 45 days.` },
    { key: 'str', title: 'Short-Term Rental (Subject Investment Property)', cat: 'Real Estate',
      cite: { FNMA: 'B3-3.8-03', FHLMC: 'Guide 5306.1 (no separate short-term rule)', FHA: 'Not eligible (investment)' },
      FNMA: `New 09/02/2026: <b>one-unit investment properties</b> that are legally permitted (registered and licensed) as short-term rentals; not from an ADU. Purchase: Form 1007 on long-term rents, or validated MLS / property-manager data on three comparable short-term rentals (rates and days rented); the monthly gross rent is multiplied by <b>50%</b>, minus PITIA. Refinance: the most recent 1040 with Schedules 1 and E, cash flow averaged over 12 months.`,
      FHLMC: `No separate short-term rental section: the investment property rules of 5306.1 apply (Schedule E for properties owned in the prior year; a lease for new rentals). Verify current guideline and lender overlays.`,
      FHA: `FHA does not insure investment properties; short-term rental income from the subject is not used.`,
      rule: `Enter short-term rental purchases with the lease method at a 50% factor.` },
    { key: 'gap', title: 'Employment Gaps & Returning to Work', cat: 'Employment',
      cite: { FNMA: 'B3-3.2-02', FHLMC: 'Guide 5303.1(b)', FHA: '4000.1 II.A.4.c.ii (Addressing Gaps in Employment)' },
      FNMA: `A reliable pattern of employment over the most recent two years; a shorter history may be eligible with positive offsetting factors. Gaps in the most recent 12 months may show unstable employment — the lender must analyze whether current employment will continue. Borrowers qualifying with <b>multiple jobs</b> from different employers may have <b>no gap over one month in the most recent 12 months</b> (unless the work is seasonal).`,
      FHLMC: `Generally a two-year history of primary employment. Less than two years needs the Seller's written justification. Example: a borrower <b>returning to the workforce after an extended absence</b>, for any reason, with a stable employment history directly before the absence. Gaps are part of the stability analysis; frequent job changes are fine when income stays consistent.`,
      FHA: `A gap of <b>six months or more</b> (extended absence): current income counts when the borrower has been in the current line of work at least <b>six months</b> at case number assignment and has a <b>two-year work history before the absence</b>. Gaps over one month need an explanation.`,
      rule: `The W-2 tab's employment gap check compares the dates against each agency.` },
    { key: 'offer', title: 'Offer Letter / Income Starting After Closing', cat: 'Employment',
      cite: { FNMA: 'B3-3.3-03', FHLMC: 'Guide 5303.2', FHA: '4000.1 II.A.4.c.ii' },
      FNMA: `Fully executed, non-contingent offer or contract naming the employer, position, pay and start date; not from a family member or interested party. <b>Option 1</b>: a paystub before delivery (start no earlier than 30 days before or no later than 90 days after the note). <b>Option 2</b> (no paystub): purchase, principal residence, one unit, fixed base income only, plus extra reserves of <b>six months' PITIA</b> or enough to cover the DTI debts and PITIA for the months between the note date and the start date <b>plus one</b>.`,
      FHLMC: `New primary employment or a future raise with the current employer; non-fluctuating salary or hourly (new hourly employer: guaranteed minimum hours). <b>Option one</b>: start no later than <b>90 days</b> after the Note Date; purchase or no cash-out refinance of a 1-unit primary residence; extra funds equal to the housing expense plus other debts × (months from the note to the start <b>+ 1</b>), reducible by income received in between. <b>Option two</b>: start before the Delivery Date, no limit on days, all occupancy types.`,
      FHA: `Handbook 4000.1 has no separate rule for employment that starts after closing: income generally must be effective and verified before closing. Verify current guideline and lender overlays.`,
      rule: `The W-2 tab's offer-letter check works out the extra reserves for Fannie and Freddie.` },
    { key: 'gifts', title: 'Gift Funds & Minimum Borrower Contribution', cat: 'Assets',
      cite: { FNMA: 'B3-4.3-04 / B3-4.3-05', FHLMC: 'Guide 5501.3 / 5501.4', FHA: '4000.1 II.A.4.d' },
      FNMA: `Updated 02/04/2026: donors include relatives and non-relatives with a familial relationship — domestic partner, fiancé(e), <b>former relative</b>, or someone with a <b>long-standing familial-like or mentorship relationship</b>; not anyone tied to the builder, agent or another interested party (a seller who is an acceptable donor may give). Not allowed on investment property. No minimum contribution at 80% LTV or less, or on a one-unit principal residence; 2-4 unit principal or second home over 80%: <b>5%</b> from the borrower's own funds. A gift of equity cannot be used for reserves.`,
      FHLMC: `Gifts are allowed on primary residences and second homes, not investment property (all funds must be the borrower's own). Second homes using gift funds: 5% of value from the borrower's personal funds. Related persons who have lived with the borrower for a year may pool funds with a signed statement.`,
      FHA: `Gifts from family, employer or union, close friend with a documented relationship, charity or government; gift letter and evidence of transfer. Minimum required investment 3.5% may be a gift.`,
      rule: `` },
    { key: 'reserves', title: 'Reserves', cat: 'Assets',
      cite: { FNMA: 'B3-4.1-01', FHLMC: 'Guide 5501.2', FHA: '4000.1 II.A.4.b / II.A.5' },
      FNMA: `Months of the subject PITIA left after closing; DU sets the amount. Other financed properties add 2%, 4% or 6% of their unpaid balances (by the number of financed properties). Departing residence with under 12 months of management experience: six months of its PITIA on top. Offer letter without a paystub: six months' PITIA or the months to the start date + 1.`,
      FHLMC: `Months of the monthly payment amount (PITI plus MI, leasehold, HOA, secondary financing) at the Note Rate for the subject; LPA states the amount; manual underwriting tables apply otherwise.`,
      FHA: `TOTAL sets reserves; 3-4 units need three months' PITI after closing; a one-unit with an ADU and manual downgrades have their own reserve rules.`,
      rule: `` },
  ];
  TOPICS.forEach((t) => {
    t.verified = VERIFIED;
    const i = GUIDES.findIndex((g) => g.key === t.key);
    if (i >= 0) GUIDES[i] = Object.assign({}, GUIDES[i], t);
    else { const at = GUIDES.findIndex((g) => g.key === (t.cat === 'Assets' ? 'assets' : t.cat === 'Employment' ? 'declining' : 'ss')); GUIDES.splice(at >= 0 ? at : GUIDES.length, 0, t); }
  });

  /* guide links: the Fannie topic page for the first code cited (the old map had moved or broken pages) */
  if (typeof guideUrls === 'function') {
    const old = guideUrls;
    guideUrls = window.guideUrls = function (g) {
      const u = old(g), m = String(g.cite && g.cite.FNMA || '').match(/[AB]\d-[\d.]+(?:-\d+)?/);
      if (m && FNMA_MAP[m[0]]) u.FNMA = 'https://selling-guide.fanniemae.com/sel/' + FNMA_MAP[m[0]];
      return u;
    };
  }

  /* ---------------------------------------------------------------- 3. rental: what kind of property the lease is for */
  const KINDS = {
    invest: 'Other investment property (new lease)', subject: 'Subject property (purchase / Form 1007)', departing: 'Departing residence (being vacated)',
    adu: 'ADU on a one-unit primary residence', within45: 'Investment bought within 45 days', str: 'Short-term rental (subject, purchase)',
  };
  const AGS = ['FNMA', 'FHLMC', 'FHA'];
  const AGN = { FNMA: 'Fannie Mae', FHLMC: 'Freddie Mac', FHA: 'FHA', VA: 'VA' };
  let capDepth = 0;
  /* the lease method for one agency: {monthly (added to income when >= 0, a debt when < 0), note, ok} */
  function leaseFor(p, ag) {
    const kind = p.kind || 'invest', rent = NUM(p.leaseRent), pm = !!p.pm;
    /* the property's PITIA is kept in leasePitia (income-enhancements copies the Schedule E column's PITIA into p.pitia on every
       recalculation); a subject or ADU with none entered uses the housing payment on the DTI tab */
    if (p.leasePitia == null && NUM(p.pitia)) p.leasePitia = NUM(p.pitia);
    let pitia = NUM(p.leasePitia);
    if (!pitia && (kind === 'subject' || kind === 'adu') && S.dti) pitia = ['pi', 'taxes', 'ins', 'hoa', 'mi', 'otherHousing'].reduce((a, k) => a + NUM(S.dti[k]), 0);
    const f = (kind === 'str' ? 50 : NUM(p.vacancy) || 75) / 100, net = rent * f, anri = net - pitia;
    const offset = (why) => anri > 0 ? { monthly: 0, note: `${$m(net)} − PITIA ${$m(pitia)} = ${$m(anri)}: ${why} — it only offsets the PITIA` } : { monthly: anri, note: `${$m(net)} − PITIA ${$m(pitia)} = ${$m(anri)} (a debt)` };
    const full = (pre) => ({ monthly: anri, note: `${pre || ''}${Math.round(f * 100)}% of ${$m(rent)} = ${$m(net)} − PITIA ${$m(pitia)} = ${$m(anri)}` });
    if (ag === 'VA') ag = 'FHA';
    if (kind === 'adu') {
      let inc = net, cap = Infinity;
      if (!capDepth) { capDepth++; try { const t = calcTotals(); cap = Math.max(0, t.income - (t.__adu || 0)) * 0.3 / 0.7; } finally { capDepth--; } }
      const capped = inc > cap; if (capped) inc = cap;
      return { monthly: capDepth ? 0 : inc, adu: true, note: `75% of ${$m(rent)} = ${$m(net)} added to income${capped ? `, capped at 30% of total income (${$m(cap)})` : ''}; the PITIA stays in the housing payment` + (ag === 'FHLMC' && !pm ? '. Purchase: landlord education certificate needed' : '') };
    }
    if (kind === 'departing') {
      if (ag === 'FNMA') return Object.assign(offset('Fannie Mae never adds departing-residence rent to income'), { cond: `Market rent from Form 1007 or 3 comparables (no lease)${pm ? '' : '; plus 6 months of its PITIA in reserves'}` });
      if (ag === 'FHLMC') return pm ? Object.assign(full(), { cond: 'Executed lease + 2 months of rent (or deposit and first month) received' }) : Object.assign(offset('no year of management experience'), { cond: 'Executed lease + 2 months of rent (or deposit and first month) received' });
      return p.relocate100 && p.equity25 ? Object.assign(full(), { cond: '1-year lease + deposit or first month; appraisal with 25% equity' }) : { monthly: -pitia, note: 'FHA: only when relocating more than 100 miles with 25% equity — the full PITIA is a debt', cond: '' };
    }
    if (kind === 'within45') {
      if (ag === 'FNMA') return Object.assign(offset('bought within 45 days'), { cond: 'Market rent from the appraisal / Form 1007 (no lease)' });
      if (ag === 'FHLMC') return pm ? full() : offset('no year of management experience');
      return p.equity25 ? full() : { monthly: -pitia, note: 'FHA: limited rental history needs 25% equity — the full PITIA is a debt' };
    }
    if (kind === 'str') {
      if (ag === 'FNMA') return pm ? full('Short-term rental at 50%: ') : offset('under 12 months of management experience');
      if (ag === 'FHLMC') return pm ? full('Investment rules (verify short-term rental overlays): ') : offset('no year of management experience');
      return { monthly: -pitia, note: 'FHA does not insure investment properties', na: true };
    }
    if (kind === 'subject') {
      if (ag === 'FHA') return p.occ2to4 ? { monthly: net, note: `75% of ${$m(rent)} = ${$m(net)} added to income (2-4 unit owner-occupied; PITIA in the housing payment)` } : { monthly: 0, note: 'FHA does not insure investment properties', na: true };
      if (p.occ2to4) return pm || ag === 'FHLMC' ? { monthly: net, note: `75% of ${$m(rent)} = ${$m(net)} added to income (2-4 unit owner-occupied; PITIA in the housing payment)` + (ag === 'FHLMC' && !pm ? '; verify landlord education for purchases' : '') } : { monthly: Math.min(net, pitia), note: `75% of ${$m(rent)} = ${$m(net)}; under 12 months of management experience it may only offset the PITIA (${$m(pitia)})` };
      return pm ? full() : offset('under 12 months of management experience');
    }
    if (ag === 'FHA') return p.equity25 ? full() : { monthly: -pitia, note: 'FHA: limited rental history on other real estate needs 25% equity — the full PITIA is a debt' };
    return pm ? full() : offset(ag === 'FNMA' ? 'under 12 months of management experience' : 'no year of management experience');
  }
  window.MTLeaseFor = leaseFor;

  if (typeof calcSchE === 'function') {
    const base = calcSchE;
    calcSchE = window.calcSchE = function (p) {
      if (p && p.method === 'lease') {
        const r = leaseFor(p, S.agency);
        return { net: r.monthly * 12, gross: Math.max(0, NUM(p.leaseRent) * ((p.kind === 'str' ? 50 : NUM(p.vacancy) || 75) / 100)), monthly: r.monthly, basis: `${KINDS[p.kind || 'invest']} — ${AGN[S.agency] || S.agency}: ${r.note}`, mos: 12, yearsUsed: 0, pitia: NUM(p.leasePitia), adu: !!r.adu, cond: r.cond || '' };
      }
      return base(p);
    };
  }
  if (typeof calcTotals === 'function') {
    const baseT = calcTotals;
    calcTotals = window.calcTotals = function () {
      const t = baseT();
      t.__adu = (S.sche || []).filter((p) => p.use !== false && p.method === 'lease' && p.kind === 'adu').reduce((a, p) => a + Math.max(0, calcSchE(p).monthly), 0);
      return t;
    };
  }

  /* ---------------------------------------------------------------- 4. Schedule E: trend alert and the one-year option */
  function yearMonthly(p, y) {
    if (p.method === 'fha') return (NUM(y.depr) + NUM(y.line21)) / 12;
    if (p.method === 'fhaoo') return (NUM(y.ins) + NUM(y.mortInt) + NUM(y.taxes) + NUM(y.depr) + NUM(y.otherAdd) + NUM(y.line21)) / 12;
    const days = Math.max(0, Math.min(366, NUM(y.fairDays))), mos = days > 0 ? Math.min(12, days / 365 * 12) : 12;
    return (NUM(y.rents) + NUM(y.ins) + NUM(y.mortInt) + NUM(y.taxes) + NUM(y.depr) + NUM(y.otherAdd) - NUM(y.totalExp)) / mos;
  }
  const has = (y) => !!y && ['rents', 'ins', 'mortInt', 'taxes', 'depr', 'otherAdd', 'totalExp', 'line21'].some((k) => NUM(y[k]) !== 0);
  function trendOf(p) {
    if (!p || p.method === 'lease' || !p.y1 || !p.y2 || !has(p.y1) || !has(p.y2)) return null;
    const a = yearMonthly(p, p.y1), b = yearMonthly(p, p.y2);
    const pct = a > 0 ? Math.round((b - a) / a * 1e6) / 1e6 : (b > a ? Infinity : b < a ? -Infinity : 0);
    const m = /^(\d{4})/.exec(String(p.purchased || '')), bought = m ? +m[1] : 0;
    const ownedBoth = !bought || bought < NUM(p.y1.yr);
    return { a, b, pct, y1: NUM(p.y1.yr), y2: NUM(p.y2.yr), ownedBoth, avg: (a + b) / 2 };
  }
  window.MTRentalTrend = trendOf;
  function trendHTML(p) {
    const t = trendOf(p); if (!t) return '';
    const pc = (v) => (v === Infinity ? 'up from a loss' : v === -Infinity ? 'down to a loss' : (v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%');
    if (t.pct < -0.2) return `<div class="notice danger se-trend" role="alert" style="border-color:#dc2626;background:rgba(220,38,38,.12)"><span><b>Rental income fell ${t.pct === -Infinity ? 'to a loss' : (-t.pct * 100).toFixed(1) + '%'}</b> from ${t.y1} (${$m(t.a)}/mo) to ${t.y2} (${$m(t.b)}/mo) — more than 20%. Only the most recent year can be used, and the drop needs a written explanation and analysis that the lower income is stable (Fannie B3-3.1-01, Freddie 5301.1). If it is still falling, the income may not be usable.</span></div>`;
    if (t.pct >= 0.1 && (p.method === 'sche') && t.ownedBoth) {
      if (!CONV()) return `<div class="notice info se-trend"><span>Rental income rose ${pc(t.pct)} (${t.y1} ${$m(t.a)}/mo → ${t.y2} ${$m(t.b)}/mo). With a conventional loan (Fannie or Freddie) the most recent year alone could be used — ${$m(t.b - t.avg)}/mo more than the two-year average.</span></div>`;
      const on = NUM(p.ausYears) === 1;
      return `<div class="notice good se-trend" style="border-color:#16a34a;background:rgba(22,163,74,.13);color:inherit"><span><b style="color:#16a34a">${on ? 'Using one year of returns' : 'Recommended: one year of returns'}</b> — rental income rose ${pc(t.pct)} (${t.y1} ${$m(t.a)}/mo → ${t.y2} ${$m(t.b)}/mo). ${AGN[S.agency]} qualifies rental income from the <b>most recent</b> year's Schedule E (Fannie B3-3.8-04, Freddie 5306.1(d)(ii)): ${$m(t.b)}/mo instead of the two-year average ${$m(t.avg)}/mo (<b>+${$m(t.b - t.avg)}/mo</b>), when the AUS asks for one year of returns.</span>${on ? '' : `<button type="button" class="btn btn-green no-print" style="margin-left:10px;white-space:nowrap" onclick="MTUseOneYear('${E(p.id)}')">Use the most recent year</button>`}</div>`;
    }
    return '';
  }
  window.MTUseOneYear = function (id) { const p = (S.sche || []).find((x) => x.id === id); if (!p) return; p.ausYears = 1; if (typeof renderSchE === 'function') renderSchE(); RECALC(); };

  /* lease method: the kind of property, management experience and the agencies side by side */
  function leaseHTML(p) {
    const opt = (v, t) => `<option value="${v}" ${(p.kind || 'invest') === v ? 'selected' : ''}>${t}</option>`;
    const chk = (k, label) => `<label style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input type="checkbox" ${p[k] ? 'checked' : ''} onchange="MTLeaseSet('${E(p.id)}','${k}',this.checked)">${label}</label>`;
    const src = p.kind === 'departing' ? 'Market rent (Form 1007 / 3 comparables; Freddie & FHA: the lease)' : p.kind === 'within45' ? 'Market rent from the appraisal' : p.kind === 'adu' ? 'ADU rent (lease or appraisal ADU rent analysis)' : p.kind === 'str' ? 'Monthly market rent (Form 1007 or 3 short-term comparables)' : 'Gross monthly rent (lease or Form 1007)';
    const rows = AGS.map((ag) => { const r = leaseFor(p, ag); const v = r.na ? 'n/a' : (r.monthly >= 0 ? '+' + $m(r.monthly) + ' income' : $m(r.monthly) + ' debt');
      return `<tr${ag === (S.agency === 'VA' ? 'FHA' : S.agency) ? ' style="font-weight:700"' : ''}><td>${AGN[ag]}</td><td class="num">${v}</td><td style="font-size:12px">${E(r.note.replace(/<[^>]+>/g, ''))}${r.cond ? `<br><span class="muted">Needs: ${E(r.cond)}</span>` : ''}</td></tr>`; }).join('');
    return `<div class="se-lease" data-lease="${E(p.id)}">
      <div class="grid g3">
        <div class="field"><label>Property</label><select class="cell-input" onchange="MTLeaseSet('${E(p.id)}','kind',this.value)">${Object.keys(KINDS).map((k) => opt(k, KINDS[k])).join('')}</select></div>
        <div class="field"><label>${src}</label><input class="cell-input" type="text" inputmode="decimal" value="${NUM(p.leaseRent)}" oninput="MTLeaseSet('${E(p.id)}','leaseRent',this.value,1)"></div>
        <div class="field"><label>Vacancy factor (%)</label><input class="cell-input" type="text" inputmode="decimal" value="${p.kind === 'str' ? 50 : NUM(p.vacancy) || 75}" ${p.kind === 'str' ? 'disabled title="Short-term rentals: 50%"' : ''} oninput="MTLeaseSet('${E(p.id)}','vacancy',this.value,1)"></div>
        <div class="field"><label>Full PITIA of this property ($/mo)</label><input class="cell-input" type="text" inputmode="decimal" value="${NUM(p.leasePitia == null ? p.pitia : p.leasePitia)}" placeholder="${p.kind === 'subject' || p.kind === 'adu' ? 'blank: the DTI tab housing payment' : ''}" oninput="MTLeaseSet('${E(p.id)}','leasePitia',this.value,1)"></div>
        <div class="field" style="grid-column:span 2;display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;padding-top:16px">${chk('pm', '12+ months of property management experience')}${p.kind === 'subject' ? chk('occ2to4', 'Borrower lives in one unit (2-4 units)') : ''}${['departing', 'within45', 'invest'].includes(p.kind || 'invest') ? chk('equity25', 'FHA: 25%+ equity (appraisal)') : ''}${p.kind === 'departing' ? chk('relocate100', 'FHA: relocating 100+ miles') : ''}</div>
      </div>
      <div class="tbl-scroll"><table class="matrix"><thead><tr><th>Agency</th><th class="num">Qualifying effect</th><th>How</th></tr></thead><tbody data-lease-rows="${E(p.id)}">${rows}</tbody></table></div>
    </div>`;
  }
  window.MTLeaseSet = function (id, k, v, num) {
    const p = (S.sche || []).find((x) => x.id === id); if (!p) return;
    p[k] = num ? NUM(v) : v; if (k === 'kind' && v === 'adu') p.subject = true;
    if (num) { RECALC(); return; }
    if (typeof renderSchE === 'function') renderSchE(); RECALC();
  };

  if (typeof renderSchE === 'function') {
    const baseR = renderSchE;
    renderSchE = window.renderSchE = function () {
      baseR.apply(this, arguments);
      (S.sche || []).forEach((p) => {
        const bar = byId(`se-${p.id}-bar`); if (!bar) return;
        const art = bar.closest('article');
        if (p.method === 'lease' && art) {
          const tw = art.querySelector('.se-table-wrap'); if (tw) tw.style.display = 'none';
          const ex = art.querySelector('.se-expenses'); if (ex) ex.style.display = 'none';
          art.querySelectorAll('.se-meta .field').forEach((f) => { if (/Tax years used|Prior tax year|Current tax year|Years of returns/.test(f.textContent)) f.style.display = 'none'; });
          const help = art.querySelector('.se-help'); if (help) help.innerHTML = '<span>Lease / 75% method: pick what kind of property it is. The table shows what Fannie Mae, Freddie Mac and FHA allow; the agency in the header is the one used in the totals.</span>';
          bar.insertAdjacentHTML('beforebegin', leaseHTML(p));
        }
        bar.insertAdjacentHTML('afterend', `<div id="se-${p.id}-trend">${trendHTML(p)}</div>`);
        if (p.method === 'lease') leaseBar(p);
      });
    };
  }
  /* the result bar under a lease property: income-enhancements paints it from its own (older) lease formula */
  function leaseBar(p) {
    const r = calcSchE(p), gl = byId(`se-${p.id}-grossline`), nl = byId(`se-${p.id}-netline`), bs = byId(`se-${p.id}-basis`), bar = byId(`se-${p.id}-bar`), g = byId(`se-${p.id}-gross`);
    if (gl) gl.textContent = r.monthly >= 0 ? `Qualifying rental income: ${$m(r.monthly)} / month` : `Net rental loss (a debt): ${$m(r.monthly)} / month`;
    if (nl) nl.textContent = `${AGN[S.agency] || S.agency} rules — the agency in the header`;
    if (bs) bs.textContent = r.basis;
    if (g) g.textContent = $m(r.monthly);
    if (bar) bar.className = `result-bar ${r.monthly >= 0 ? 'green' : 'amber'}`;
  }
  if (typeof paintSchE === 'function') {
    const baseP = paintSchE;
    paintSchE = window.paintSchE = function () {
      baseP.apply(this, arguments);
      (S.sche || []).forEach((p) => {
        const t = byId(`se-${p.id}-trend`); if (t) { const h = trendHTML(p); if (t.innerHTML !== h) t.innerHTML = h; }
        if (p.method === 'lease') leaseBar(p);
        const rows = document.querySelector(`[data-lease-rows="${p.id}"]`);
        if (rows && p.method === 'lease') { const tmp = document.createElement('tbody'); tmp.innerHTML = /<tbody[^>]*>([\s\S]*)<\/tbody>/.exec(leaseHTML(p))[1]; rows.innerHTML = tmp.innerHTML; }
      });
    };
  }

  /* findings and the guide topics that apply to this file */
  if (typeof findings === 'function') {
    const baseF = findings;
    findings = window.findings = function () {
      const out = baseF.apply(this, arguments);
      (S.sche || []).filter((p) => p.use !== false).forEach((p) => {
        const t = trendOf(p); if (!t) return;
        if (t.pct < -0.2) out.push({ k: 'bad', t: `Rental Income Down More Than 20% (${E(p.addr || 'property')})`, m: `Schedule E net rental income fell from ${$m(t.a)}/mo (${t.y1}) to ${$m(t.b)}/mo (${t.y2}). Use the most recent year and document why it fell and that it is stable.` });
        else if (t.pct >= 0.1 && p.method === 'sche' && t.ownedBoth && CONV() && NUM(p.ausYears) !== 1) out.push({ k: 'good', t: `One Year of Returns Recommended (${E(p.addr || 'property')})`, m: `Rental income rose ${(t.pct === Infinity ? 'from a loss' : (t.pct * 100).toFixed(1) + '%')}; the most recent year gives ${$m(t.b - t.avg)}/mo more than the two-year average.` });
      });
      return out;
    };
  }
  if (typeof activeGuideKeys === 'function') {
    const baseK = activeGuideKeys;
    activeGuideKeys = window.activeGuideKeys = function () {
      const k = baseK.apply(this, arguments);
      (S.sche || []).forEach((p) => { if (p.method === 'lease') k.add({ departing: 'departing', adu: 'adu', subject: 'subjrent', within45: 'within45', str: 'str' }[p.kind] || 'rental'); });
      const ec = S.empCheck || {}; if (ec.prevEnd || ec.start) k.add('gap'); if (ec.offerStart) k.add('offer');
      return k;
    };
  }

  /* ---------------------------------------------------------------- 5. compare any income type side by side */
  function compareHTML(key) {
    const g = GUIDES.find((x) => x.key === key); if (!g) return '';
    const u = typeof guideUrls === 'function' ? guideUrls(g) : {};
    return `<div class="mt-cmp-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:10px">${AGS.map((a) => `
      <div class="card" style="padding:12px 14px;${a === (S.agency === 'VA' ? 'FHA' : S.agency) ? 'outline:2px solid var(--accent,#2787e8)' : ''}">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span class="gl-agency ag-${a.toLowerCase()}">${AGN[a].toUpperCase()}</span>
        <a class="btn-link" target="_blank" rel="noopener" href="${E(u[a] || '#')}" style="font-size:12px">${E(g.cite[a] || '')}</a></div>
        <div style="margin-top:6px;font-size:13px;line-height:1.5">${g[a] || '<span class="muted">No separate rule.</span>'}</div></div>`).join('')}</div>
      ${g.rule ? `<div class="rule" style="margin-top:8px"><b>Applied in this worksheet:</b> ${g.rule}</div>` : ''}
      <div class="muted" style="font-size:11.5px;margin-top:6px">Checked against the guides on ${E(g.verified || VERIFIED)}. AUS findings and lender overlays control.</div>`;
  }
  window.MTCompareIncome = compareHTML;
  function mountCompare() {
    const head = byId('guideHead'); if (!head || byId('mtCmpBox')) return;
    const cats = [...new Set(GUIDES.map((g) => g.cat))];
    head.insertAdjacentHTML('afterend', `<div class="card no-print" id="mtCmpBox" style="padding:12px 14px;margin:10px 0 14px">
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>Compare an income type side by side</b>
      <select id="mtCmpSel" class="cell-input" style="min-width:280px" onchange="document.getElementById('mtCmpOut').innerHTML=MTCompareIncome(this.value)">
        <option value="">Choose an income type…</option>${cats.map((c) => `<optgroup label="${E(c)}">${GUIDES.filter((g) => g.cat === c).map((g) => `<option value="${g.key}">${E(g.title)}</option>`).join('')}</optgroup>`).join('')}</select>
      <span class="muted" style="font-size:12px">Fannie Mae, Freddie Mac and FHA rules for any income type, whether or not it is in this file.</span></div>
      ${(Date.now() - Date.parse(VERIFIED)) / 864e5 > 182 ? `<div class="notice warn" style="margin-top:8px"><span>These agency summaries were checked on ${VERIFIED}, more than six months ago. Open <a href="guidelines.html">Guidelines</a> → <b>Check for changes</b> (or refresh the guide copies) and confirm against the current guides.</span></div>` : ''}
      <div id="mtCmpOut"></div></div>`);
  }

  /* ---------------------------------------------------------------- 6. employment gap and offer-letter check */
  const pd = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')) || /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || '')); if (!m) return null; return m[0].includes('-') ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(+m[3], +m[1] - 1, +m[2]); };
  const monthsBetween = (a, b) => (b - a) / (365.25 / 12 * 86400000);
  function empResult() {
    const ec = S.empCheck || (S.empCheck = {});
    const end = pd(ec.prevEnd), start = pd(ec.start), app = pd(ec.app) || new Date(), out = [];
    if (end && start) {
      const gap = Math.max(0, monthsBetween(end, start)), inLine = Math.max(0, monthsBetween(start, app)), before = NUM(ec.histBefore);
      const g = gap.toFixed(1), recent = monthsBetween(end, app) <= 12;
      out.push(['FNMA', gap <= 1 ? 'ok' : recent && ec.multi ? 'bad' : recent ? 'warn' : 'ok', gap <= 1 ? `Gap of ${g} months: no gap concern.` : recent && ec.multi ? `Gap of ${g} months in the last 12 months with income from more than one job: not allowed over one month (B3-3.2-02) unless seasonal.` : recent ? `Gap of ${g} months in the last 12 months: analyze and document that the current job will continue; letter of explanation.` : `Gap of ${g} months, more than 12 months ago: explain it; current two-year pattern decides.`]);
      out.push(['FHLMC', gap <= 1 ? 'ok' : 'warn', gap <= 1 ? `Gap of ${g} months: no gap concern.` : `Gap of ${g} months: written justification of stability; for a return after an extended absence, document the stable history directly before it (5303.1(b)).`]);
      const fhaOk = gap < 6 || (inLine >= 6 && before >= 24);
      out.push(['FHA', gap < 1 ? 'ok' : gap < 6 ? 'warn' : fhaOk ? 'ok' : 'bad', gap < 1 ? `Gap of ${g} months: no gap concern.` : gap < 6 ? `Gap of ${g} months: explanation letter.` : fhaOk ? `Extended absence (${g} months): ${inLine.toFixed(1)} months back at work and ${before} months of history before the gap — current income can count.` : `Extended absence (${g} months): needs at least 6 months in the current line of work (now ${inLine.toFixed(1)}) and 24 months of work history before the absence (entered: ${before}).`]);
    }
    const os = pd(ec.offerStart), note = pd(ec.note);
    if (os && note) {
      const mos = Math.max(0, Math.ceil(monthsBetween(note, os) - 1e-9)), pit = NUM(ec.pitia), debts = NUM(ec.debts), days = Math.round((os - note) / 86400000);
      const fnma = Math.min(6 * pit, (pit + debts) * (mos + 1)), fhlmc = (pit + debts) * (mos + 1) - NUM(ec.interim);
      out.push(['FNMA', days <= 90 ? 'ok' : 'bad', days > 90 ? `Start ${days} days after the note: Fannie allows no later than 90 days.` : `Offer letter, start ${days} days after the note. Option 2 (no paystub before delivery): purchase, principal residence, one unit, fixed base pay; extra reserves of either 6 months' PITIA (${$m(6 * pit)}) or the DTI debts + PITIA × ${mos + 1} months (${$m((pit + debts) * (mos + 1))}) — documenting the smaller, ${$m(fnma)}, is enough.`]);
      out.push(['FHLMC', days <= 90 ? 'ok' : 'warn', days > 90 ? `Start ${days} days after the note: option one ends at 90 days; option two needs the start before delivery.` : `Option one: extra funds of (housing ${$m(pit)} + debts ${$m(debts)}) × ${mos + 1} months = ${$m(Math.max(0, fhlmc))}${NUM(ec.interim) ? ` after ${$m(NUM(ec.interim))} of income received before the start` : ''}.`]);
      out.push(['FHA', 'warn', `No 4000.1 rule for pay that starts after closing: the income generally must be effective and verified first (verify lender overlays).`]);
    }
    return out;
  }
  function empHTML() {
    const ec = S.empCheck || (S.empCheck = {}), inp = (k, label, ph) => `<div class="field"><label>${label}</label><input class="cell-input" type="text" ${ph ? `placeholder="${ph}"` : 'inputmode="decimal"'} value="${E(ec[k] == null ? '' : ec[k])}" onchange="MTEmpSet('${k}',this.value)"></div>`;
    const col = { ok: '#16a34a', warn: '#d97706', bad: '#dc2626' };
    const res = empResult();
    return `<div class="card-top"><span class="tag">Check</span><b style="margin-left:8px">Employment gap & offer letter</b><span class="spacer"></span>${typeof guideBtn === 'function' ? guideBtn('gap', 'Guidelines') : ''}</div>
      <div class="card-body"><div class="grid g4">
        ${inp('prevEnd', 'Previous job ended', 'MM/DD/YYYY')}${inp('start', 'Current job started', 'MM/DD/YYYY')}${inp('app', 'Application date (blank = today)', 'MM/DD/YYYY')}${inp('histBefore', 'Months of work history before the gap')}
        <div class="field" style="padding-top:18px"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" ${ec.multi ? 'checked' : ''} onchange="MTEmpSet('multi',this.checked)">Qualifying with more than one job</label></div>
        ${inp('offerStart', 'Offer letter: start date', 'MM/DD/YYYY')}${inp('note', 'Note (closing) date', 'MM/DD/YYYY')}${inp('pitia', 'New PITIA ($/mo)')}${inp('debts', 'Other monthly debts in the DTI ($/mo)')}${inp('interim', 'Income received before the start (Freddie)')}
      </div>
      ${res.length ? `<div class="tbl-scroll"><table class="matrix" style="margin-top:8px"><tbody>${res.map(([a, k, m]) => `<tr><td style="white-space:nowrap"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${col[k]};margin-right:6px"></span>${AGN[a]}</td><td style="font-size:12.5px">${E(m)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted" style="font-size:12px;margin-top:6px">Enter the dates of a gap between jobs, or an offer letter\'s start date, to see what Fannie Mae, Freddie Mac and FHA need.</div>'}</div>`;
  }
  window.MTEmpCheck = empResult;
  window.MTEmpSet = function (k, v) { (S.empCheck || (S.empCheck = {}))[k] = v; paintEmp(); if (typeof renderGuides === 'function') try { renderGuides(); } catch (e) {} if (typeof scheduleAutosave === 'function') try { scheduleAutosave(); } catch (e) {} };
  function paintEmp() { const host = byId('mtEmpCheck'); if (host) host.innerHTML = empHTML(); }
  function mountEmp() {
    const panel = byId('panel-w2'); if (!panel || byId('mtEmpCheck')) return;
    const d = document.createElement('div'); d.className = 'card no-print'; d.id = 'mtEmpCheck'; d.style.marginTop = '14px'; panel.appendChild(d); paintEmp();
  }

  /* ---------------------------------------------------------------- 7. a document read onto a worksheet: the right form, shown at once
     - an entity worksheet takes the form of the document applied to it: Form 1120 -> C corporation, a 1120-S K-1 -> S corporation,
       a 1065 K-1 -> partnership. Before, every new entity worksheet stayed a 1065, so a C corporation's taxable income, tax and NOL
       went onto lines that form does not show or count. A "Goes to" choice only a 1120 has (taxable income, total tax, NOL) makes
       it a 1120 too. An entity that already holds figures keeps its form and the user is told.
     - Schedule E: the two-year view moves the figures into their year column after the base reader has drawn the worksheet; it is
       drawn again so the inputs show them. */
  if (typeof applyDoc === 'function' && !window.__mtRulesApply) {
    const baseApply = applyDoc;
    const FORM_OF = { k1_1065: '1065', k1_1120s: '1120S', f1120: '1120' }, ONLY1120 = ['taxable', 'tax', 'nol'];
    applyDoc = window.applyDoc = function (id, quiet) {
      const d = (typeof DOCS !== 'undefined' ? DOCS : []).find((x) => x.id === id);
      const [k, rid] = String(d && d.target || '').split('|');
      const before = k === 'corp' ? (S.corp || []).map((r) => r.id) : null;
      const wasEmpty = k === 'corp' && rid && rid !== 'NEW' && typeof isEmptyRec === 'function' ? (() => { const r = (S.corp || []).find((x) => x.id === rid); return r ? isEmptyRec('corp', r) : false; })() : false;
      const out = baseApply.apply(this, arguments);
      try {
        if (d && k === 'corp') {
          const used = (d.fields || []).filter((f) => f.apply && f.slot && !f.readonly).map((f) => f.slot);
          const form = used.some((s) => ONLY1120.includes(s)) ? '1120' : FORM_OF[d.type];
          const [, nid] = String(d.target || '').split('|'), rec = (S.corp || []).find((x) => x.id === nid);
          if (rec && form && rec.form !== form) {
            if (!before.includes(rec.id) || wasEmpty) { rec.form = form; if (typeof renderCorp === 'function') renderCorp(); if (typeof RECALC === 'function') RECALC(); }
            else if (!quiet && typeof toast === 'function') toast(`This worksheet is a Form ${rec.form}; the document is a Form ${form}. Change the form on the worksheet if it is the same business.`);
          }
        }
        if (d && (k === 'sche' || d.type === 'schede') && typeof renderSchE === 'function') { renderSchE(); if (typeof RECALC === 'function') RECALC(); }
      } catch (e) {}
      return out;
    };
    window.__mtRulesApply = true;
  }

  function mount() { try { mountCompare(); } catch (e) {} try { mountEmp(); } catch (e) {} try { if (typeof renderSchE === 'function') renderSchE(); if (typeof renderGuides === 'function') renderGuides(); if (typeof RECALC === 'function') RECALC(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else setTimeout(mount, 0);
  window.MTIncomeRules = { verified: VERIFIED, leaseFor, trendOf, empResult, compareHTML, topics: TOPICS.map((t) => t.key) };
})();
