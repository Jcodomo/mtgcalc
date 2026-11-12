// v57 quote screen: every field, the section it belongs to, and whether it is a Simple field or part of a named Advanced group.
// Membership is explicit (spec item 8): nothing is hidden by position or label wording.
export type SectionId = 'property' | 'renovation' | 'loan' | 'housing' | 'closing' | 'qualify' | 'results';
export type Kind = 'money' | 'pct' | 'int' | 'num' | 'text' | 'select' | 'check' | 'date';

export interface Field {
  id: string;
  /** dotted path in the scenario inputs */
  path: string;
  label: string;
  section: SectionId;
  /** the Advanced group it belongs to; no group = always shown (Simple) */
  group?: string;
  kind: Kind;
  options?: [string, string][];
  /** unit shown after the value, so dollars, percent, months and years are never ambiguous */
  unit?: string;
  /** blank means "calculate"; the calculated value shows as the placeholder (spec item 18) */
  override?: boolean;
  /** blank means "not entered" and is stored as 0 because the engine reads 0 that way (ARV, as-is value) */
  notEnteredWhenZero?: boolean;
  /** stored as a fraction (0.035) and shown as a percent (3.5) */
  digits?: number;
  /** only shown when this is true for the scenario */
  when?: (i: any) => boolean;
  /** the calculated value an override replaces, for the placeholder and the "Use calculated value" button */
  calc?: (o: any, i: any) => number | null;
  /** a second field shown in the same row (annual / monthly basis) */
  pair?: string;
  hint?: string;
  keywords?: string;
}

export const SECTIONS: { id: SectionId; title: string; hint: string }[] = [
  { id: 'property', title: 'Property & Program', hint: 'What is being bought and with which loan' },
  { id: 'renovation', title: 'Renovation Budget', hint: 'Construction, contingency and financed payments' },
  { id: 'loan', title: 'Loan Terms', hint: 'Down payment, rate, term and mortgage insurance' },
  { id: 'housing', title: 'Monthly Housing Costs', hint: 'Taxes, insurance and HOA' },
  { id: 'closing', title: 'Closing Costs & Funds', hint: 'Seller credit, deposit and closing costs' },
  { id: 'qualify', title: 'Qualification', hint: 'Income, debts, credit and assets' },
  { id: 'results', title: 'Results & Review Items', hint: 'Every check, with what still needs attention' },
];

/** the Advanced groups, by purpose (spec item 8) */
export const GROUPS = ['Detailed renovation fees', 'Draw schedules and releases', 'Escrow and prepaids', 'Taxes and proration', 'MI and upfront fees', 'Rental qualification', 'Assets and reserves', 'Manual overrides', 'Program rules and lender assumptions'] as const;

const reno = (i: any) => !!i.renovation;
const fha = (i: any) => i.loanProgram === 'FHA';
const conv = (i: any) => i.loanProgram === 'Conventional';
const opts = (...v: string[]): [string, string][] => v.map(x => [x, x]);
const closingLine = (key: string) => (o: any) => { const l = (o.closing.lines || []).find((x: any) => x.key === key); return l ? l.amount : null; };

export const FIELDS: Field[] = [
  /* ---------------- Property & Program */
  { id: 'transactionType', path: 'transactionType', label: 'Transaction', section: 'property', kind: 'select', options: opts('Purchase', 'Refinance') },
  { id: 'basePurchasePrice', path: 'basePurchasePrice', label: 'Purchase price', section: 'property', kind: 'money', unit: '$', keywords: 'price sales price' },
  { id: 'propertyAddress', path: 'propertyAddress', label: 'Property address', section: 'property', kind: 'text', keywords: 'address subject property' },
  { id: 'zipCode', path: 'zipCode', label: 'ZIP code', section: 'property', kind: 'text' },
  { id: 'state', path: 'state', label: 'State', section: 'property', kind: 'text', keywords: 'location' },
  { id: 'nyCounty', path: 'nyCounty', label: 'County (New York)', section: 'property', kind: 'text', when: i => i.state === 'New York', keywords: 'nassau suffolk county mortgage tax' },
  { id: 'isNYC', path: 'isNYC', label: 'In New York City', section: 'property', kind: 'check', when: i => i.state === 'New York' },
  { id: 'occupancy', path: 'occupancy', label: 'Occupancy', section: 'property', kind: 'select', options: opts('Primary Residence', 'Second Home', 'Investment') },
  { id: 'units', path: 'units', label: 'Units', section: 'property', kind: 'int', unit: 'units', hint: '1 to 4' },
  { id: 'loanProgram', path: 'loanProgram', label: 'Program', section: 'property', kind: 'select', options: [['FHA', 'FHA'], ['Conventional', 'Conventional']], hint: 'Changing the program explains what else changed', keywords: 'fha conventional homestyle 203k' },
  { id: 'asIsValue', path: 'asIsValue', label: 'As-is value', section: 'property', kind: 'money', unit: '$', notEnteredWhenZero: true, keywords: 'appraised value' },
  { id: 'afterRepairValue', path: 'afterRepairValue', label: 'After-repair value (ARV)', section: 'property', kind: 'money', unit: '$', notEnteredWhenZero: true, when: reno, keywords: 'arv appraisal subject to completion' },
  { id: 'fhaAreaSelection', path: 'fhaAreaSelection', label: 'FHA area tier', section: 'property', group: 'Program rules and lender assumptions', kind: 'select', options: opts('Auto', 'Standard', 'High-Cost', 'Special Exception'), when: fha, keywords: 'loan limit county limit' },

  /* ---------------- Renovation Budget */
  { id: 'renovation', path: 'renovation', label: 'Renovation loan', section: 'renovation', kind: 'check', hint: 'Off keeps the renovation entries for later but leaves them out of every figure' },
  { id: 'renovationScope', path: 'renovationScope', label: 'Renovation type', section: 'renovation', kind: 'select', options: [['Auto', 'Auto (from program and budget)'], ['203(k) Limited', 'FHA 203(k) Limited'], ['203(k) Standard', 'FHA 203(k) Standard'], ['HomeStyle', 'Fannie Mae HomeStyle']], when: reno, keywords: 'limited standard homestyle' },
  { id: 'reno.baseCost', path: 'reno.baseCost', label: 'Construction budget', section: 'renovation', kind: 'money', unit: '$', when: reno, keywords: 'renovation budget contractor bid rehab cost' },
  { id: 'reno.contingencyPct', path: 'reno.contingencyPct', label: 'Contingency', section: 'renovation', kind: 'pct', unit: '% of construction', digits: 2, when: reno, keywords: 'contingency reserve' },
  { id: 'reno.paymentReserveMonths', path: 'reno.paymentReserveMonths', label: 'Financed payments', section: 'renovation', kind: 'int', unit: 'months', when: reno, hint: 'Mortgage payments financed while the home is uninhabitable', keywords: 'payment reserve mortgage payment reserve' },
  { id: 'reno.consultant', path: 'reno.consultant', label: 'Consultant fee', section: 'renovation', group: 'Detailed renovation fees', kind: 'money', unit: '$', when: reno, keywords: '203k consultant hud consultant' },
  { id: 'reno.architectural', path: 'reno.architectural', label: 'Architectural / engineering', section: 'renovation', group: 'Detailed renovation fees', kind: 'money', unit: '$', when: reno, keywords: 'plans engineer architect' },
  { id: 'reno.permits', path: 'reno.permits', label: 'Permits', section: 'renovation', group: 'Detailed renovation fees', kind: 'money', unit: '$', when: reno },
  { id: 'reno.feasibilityOther', path: 'reno.feasibilityOther', label: 'Feasibility study / other soft costs', section: 'renovation', group: 'Detailed renovation fees', kind: 'money', unit: '$', when: reno },
  { id: 'reno.otherFinanceable', path: 'reno.otherFinanceable', label: 'Other financeable fees', section: 'renovation', group: 'Detailed renovation fees', kind: 'money', unit: '$', when: reno },
  { id: 'reno.energyImprovements', path: 'reno.energyImprovements', label: 'Energy improvements', section: 'renovation', group: 'Detailed renovation fees', kind: 'money', unit: '$', when: reno },
  { id: 'reno.discountPointsRehabPct', path: 'reno.discountPointsRehabPct', label: 'Discount points on the rehabilitation amount', section: 'renovation', group: 'Detailed renovation fees', kind: 'pct', unit: '%', digits: 3, when: reno },
  { id: 'reno.supplementalOriginationOverride', path: 'reno.supplementalOriginationOverride', label: 'Supplemental origination fee', section: 'renovation', group: 'Detailed renovation fees', kind: 'money', unit: '$', override: true, when: reno, calc: o => o.renovationOut.supplementalOrigination, hint: 'Blank = calculated; 0 = waived', keywords: 'supplemental origination 203k fee' },
  { id: 'reno.utilitiesOff', path: 'reno.utilitiesOff', label: 'Utilities off at the property', section: 'renovation', group: 'Detailed renovation fees', kind: 'check', when: reno, hint: 'Raises the suggested contingency' },
  { id: 'reno.syncDrawFees', path: 'reno.syncDrawFees', label: 'Figure inspection and title fees from the draws', section: 'renovation', group: 'Draw schedules and releases', kind: 'check', when: reno },
  { id: 'reno.inspectionFees', path: 'reno.inspectionFees', label: 'Inspection fees', section: 'renovation', group: 'Draw schedules and releases', kind: 'money', unit: '$', when: i => reno(i) && !i.reno.syncDrawFees, keywords: 'draw inspection' },
  { id: 'reno.titleUpdateFees', path: 'reno.titleUpdateFees', label: 'Title update fees', section: 'renovation', group: 'Draw schedules and releases', kind: 'money', unit: '$', when: i => reno(i) && !i.reno.syncDrawFees },
  { id: 'draws.manualOverride', path: 'draws.manualOverride', label: 'Set the number of draws myself', section: 'renovation', group: 'Draw schedules and releases', kind: 'check', when: reno },
  { id: 'draws.manualDrawCount', path: 'draws.manualDrawCount', label: 'Number of draws', section: 'renovation', group: 'Draw schedules and releases', kind: 'int', unit: 'draws', when: i => reno(i) && i.draws.manualOverride },
  { id: 'draws.inspectionFeePerDraw', path: 'draws.inspectionFeePerDraw', label: 'Inspection fee per draw', section: 'renovation', group: 'Draw schedules and releases', kind: 'money', unit: '$', when: reno },
  { id: 'draws.titleFeePerDraw', path: 'draws.titleFeePerDraw', label: 'Title update per draw', section: 'renovation', group: 'Draw schedules and releases', kind: 'money', unit: '$', when: reno },
  { id: 'draws.initialMaterialRelease', path: 'draws.initialMaterialRelease', label: 'Initial material release', section: 'renovation', group: 'Draw schedules and releases', kind: 'money', unit: '$', when: reno, keywords: 'materials deposit holdback' },

  /* ---------------- Loan Terms */
  { id: 'finalDownPaymentPct', path: 'finalDownPaymentPct', label: 'Down payment', section: 'loan', kind: 'pct', unit: '% of price', digits: 2, keywords: 'down payment' },
  { id: 'interestRate', path: 'interestRate', label: 'Interest rate', section: 'loan', kind: 'pct', unit: '%', digits: 3, keywords: 'rate note rate' },
  { id: 'termYears', path: 'termYears', label: 'Term', section: 'loan', kind: 'int', unit: 'years' },
  { id: 'fhaMipOverrideRate', path: 'fhaMipOverrideRate', label: 'FHA annual MIP', section: 'loan', kind: 'pct', unit: '% a year', digits: 3, override: true, when: fha, calc: o => o.payment.fhaMipSuggestedRate, hint: 'Blank = calculated; 0 is not allowed for FHA', keywords: 'mi mip mortgage insurance' },
  { id: 'pmiOverrideRate', path: 'pmiOverrideRate', label: 'PMI', section: 'loan', kind: 'pct', unit: '% a year', digits: 3, override: true, when: conv, calc: o => o.payment.pmiSuggestedRate, hint: 'Blank = calculated; 0 = no PMI', keywords: 'mi pmi mortgage insurance' },
  { id: 'ufmipRate', path: 'ufmipRate', label: 'FHA upfront MIP', section: 'loan', group: 'MI and upfront fees', kind: 'pct', unit: '%', digits: 3, when: fha, keywords: 'ufmip upfront' },
  { id: 'fhaAnnualMipRate', path: 'fhaAnnualMipRate', label: 'FHA annual MIP table rate', section: 'loan', group: 'MI and upfront fees', kind: 'pct', unit: '% a year', digits: 3, when: fha },
  { id: 'baseDownPaymentPct', path: 'baseDownPaymentPct', label: 'Comparison down payment', section: 'loan', group: 'Program rules and lender assumptions', kind: 'pct', unit: '%', digits: 2, hint: 'Used only for the side-by-side comparison' },
  { id: 'paymentRoundingIncrement', path: 'paymentRoundingIncrement', label: 'Payment range rounding', section: 'loan', group: 'Program rules and lender assumptions', kind: 'money', unit: '$' },

  /* ---------------- Monthly Housing Costs */
  { id: 'propertyTaxAmount', path: 'propertyTaxAmount', label: 'Property taxes', section: 'housing', kind: 'money', unit: '$', pair: 'propertyTaxBasis', keywords: 'taxes real estate taxes' },
  { id: 'propertyTaxBasis', path: 'propertyTaxBasis', label: 'Taxes are', section: 'housing', kind: 'select', options: [['Annual', 'a year'], ['Monthly', 'a month']] },
  { id: 'insuranceAmount', path: 'insuranceAmount', label: 'Homeowners insurance', section: 'housing', kind: 'money', unit: '$', pair: 'insuranceBasis', keywords: 'hazard insurance' },
  { id: 'insuranceBasis', path: 'insuranceBasis', label: 'Insurance is', section: 'housing', kind: 'select', options: [['Annual', 'a year'], ['Monthly', 'a month']] },
  { id: 'hoaMonthly', path: 'hoaMonthly', label: 'HOA / common charges', section: 'housing', kind: 'money', unit: '$ a month', keywords: 'hoa condo fees' },
  { id: 'taxSourceType', path: 'taxSourceType', label: 'Where the tax figure comes from', section: 'housing', group: 'Taxes and proration', kind: 'select', options: opts('Title Company Tax Certificate', 'County/City Tax Assessor', 'Property Tax Card', 'MLS / Zillow / Redfin Estimate', 'Manual'), keywords: 'tax source estimate' },
  { id: 'taxHasExemption', path: 'taxHasExemption', label: 'Tax exemption in place', section: 'housing', group: 'Taxes and proration', kind: 'check', keywords: 'star exemption' },
  { id: 'exemptionType', path: 'exemptionType', label: 'Exemption type', section: 'housing', group: 'Taxes and proration', kind: 'text', when: i => i.taxHasExemption },
  { id: 'closing.taxPickupMonths', path: 'closing.taxPickupMonths', label: 'Tax pickup', section: 'housing', group: 'Taxes and proration', kind: 'int', unit: 'months', keywords: 'escrow pickup tax pickup' },
  { id: 'closing.insurancePickupMonths', path: 'closing.insurancePickupMonths', label: 'Insurance pickup', section: 'housing', group: 'Escrow and prepaids', kind: 'int', unit: 'months', keywords: 'escrow pickup insurance pickup prepaid' },
  { id: 'closing.cushionPct', path: 'closing.cushionPct', label: 'Closing cost estimate cushion', section: 'housing', group: 'Escrow and prepaids', kind: 'pct', unit: '%', digits: 1 },
  { id: 'escrow.cushionMonthsOverride', path: 'escrow.cushionMonthsOverride', label: 'Escrow cushion (months)', section: 'housing', group: 'Escrow and prepaids', kind: 'int', unit: 'months', hint: '-1 = the county rule' },
  { id: 'escrow.annualFlood', path: 'escrow.annualFlood', label: 'Flood insurance', section: 'housing', group: 'Escrow and prepaids', kind: 'money', unit: '$ a year' },
  { id: 'closing.useAggregateEscrowForPrepaids', path: 'closing.useAggregateEscrowForPrepaids', label: 'Use the aggregate escrow analysis for prepaids', section: 'housing', group: 'Escrow and prepaids', kind: 'check' },
  { id: 'taxInsuranceOverrideMonthly', path: 'taxInsuranceOverrideMonthly', label: 'Taxes and insurance together', section: 'housing', group: 'Manual overrides', kind: 'money', unit: '$ a month', override: true, calc: o => o.payment.monthlyTaxes + o.payment.monthlyInsurance, hint: 'Blank = calculated from the two lines above; $0 is flagged for review' },

  /* ---------------- Closing Costs & Funds */
  { id: 'concessionInputMode', path: 'concessionInputMode', label: 'Enter the seller credit as', section: 'closing', kind: 'select', options: [['percent', '% of price'], ['amount', 'dollars']] },
  { id: 'sellerConcessionPct', path: 'sellerConcessionPct', label: 'Seller credit', section: 'closing', kind: 'pct', unit: '% of price', digits: 2, when: i => i.concessionInputMode !== 'amount', keywords: 'seller concession ipc credit' },
  { id: 'sellerConcessionAmount', path: 'sellerConcessionAmount', label: 'Seller credit', section: 'closing', kind: 'money', unit: '$', when: i => i.concessionInputMode === 'amount', keywords: 'seller concession ipc credit' },
  { id: 'concessionIncreasesPrice', path: 'concessionIncreasesPrice', label: 'The credit is added to the price', section: 'closing', kind: 'check' },
  { id: 'closing.earnestMoneyDeposit', path: 'closing.earnestMoneyDeposit', label: 'Deposit already paid', section: 'closing', kind: 'money', unit: '$', keywords: 'earnest money emd deposit' },
  { id: 'closing.originationPointsPct', path: 'closing.originationPointsPct', label: 'Origination points', section: 'closing', group: 'Program rules and lender assumptions', kind: 'pct', unit: '% of loan', digits: 3 },
  { id: 'closing.otherStateMortgageTaxRate', path: 'closing.otherStateMortgageTaxRate', label: 'Mortgage tax rate (outside New York)', section: 'closing', group: 'Program rules and lender assumptions', kind: 'pct', unit: '%', digits: 3, when: i => i.state !== 'New York' },
  { id: 'closing.roundingIncrement', path: 'closing.roundingIncrement', label: 'Closing cost range rounding', section: 'closing', group: 'Program rules and lender assumptions', kind: 'money', unit: '$' },
  ...([['lenderOrigination', 'Lender origination / underwriting'], ['lenderProcessing', 'Processing / document preparation'], ['appraisal', 'Appraisal'], ['creditReport', 'Credit report'], ['floodTaxService', 'Flood certificate and tax service'], ['titleInsurance', 'Title insurance'], ['titleSearchSettlement', 'Title search and settlement'], ['attorney', 'Attorney'], ['survey', 'Survey'], ['recording', 'Recording'], ['inspections', 'Inspections'], ['other', 'Other buyer costs']] as [string, string][]).map(([k, l]): Field => ({ id: 'closing.overrides.' + k, path: 'closing.overrides.' + k, label: l, section: 'closing', group: 'Manual overrides', kind: 'money', unit: '$', override: true, calc: closingLine(k), hint: 'Blank = calculated; $0 = no charge', keywords: 'closing cost fee ' + l.toLowerCase() })),

  /* ---------------- Qualification (borrower 1 here; the borrower table adds the others) */
  { id: 'creditScore', path: 'creditScore', label: 'Credit score', section: 'qualify', kind: 'int', keywords: 'fico' },
  { id: 'assets.liquidAssets', path: 'assets.liquidAssets', label: 'Available assets', section: 'qualify', kind: 'money', unit: '$', override: true, hint: 'Blank = not entered; $0 = none', keywords: 'assets bank funds reserves' },
  { id: 'assets.giftFunds', path: 'assets.giftFunds', label: 'Gift funds', section: 'qualify', group: 'Assets and reserves', kind: 'money', unit: '$', override: true, keywords: 'gift letter gift' },
  { id: 'assets.retirementOtherAssets', path: 'assets.retirementOtherAssets', label: 'Retirement and other assets', section: 'qualify', group: 'Assets and reserves', kind: 'money', unit: '$', override: true, keywords: '401k retirement' },
  { id: 'rental.propertyTypeOverride', path: 'rental.propertyTypeOverride', label: 'Property type for rental rules', section: 'qualify', group: 'Rental qualification', kind: 'select', options: opts('Auto', '1 Family', 'Single Family with ADU', '2 Family', '3 Family', '4 Family') },
  { id: 'rental.mainUnit.gross', path: 'rental.mainUnit.gross', label: 'Rent - main unit', section: 'qualify', group: 'Rental qualification', kind: 'money', unit: '$ a month', keywords: 'rental income rent' },
  { id: 'rental.adu.gross', path: 'rental.adu.gross', label: 'Rent - accessory unit', section: 'qualify', group: 'Rental qualification', kind: 'money', unit: '$ a month', keywords: 'adu rent' },
  { id: 'rental.unit2.gross', path: 'rental.unit2.gross', label: 'Rent - unit 2', section: 'qualify', group: 'Rental qualification', kind: 'money', unit: '$ a month', when: i => i.units >= 2 },
  { id: 'rental.unit3.gross', path: 'rental.unit3.gross', label: 'Rent - unit 3', section: 'qualify', group: 'Rental qualification', kind: 'money', unit: '$ a month', when: i => i.units >= 3 },
  { id: 'rental.unit4.gross', path: 'rental.unit4.gross', label: 'Rent - unit 4', section: 'qualify', group: 'Rental qualification', kind: 'money', unit: '$ a month', when: i => i.units >= 4 },
  { id: 'rental.includeVacatingRental', path: 'rental.includeVacatingRental', label: 'Renting out the home being vacated', section: 'qualify', group: 'Rental qualification', kind: 'check', keywords: 'departing residence vacating' },
  { id: 'rental.vacatingGrossRent', path: 'rental.vacatingGrossRent', label: 'Its gross rent', section: 'qualify', group: 'Rental qualification', kind: 'money', unit: '$ a month', when: i => i.rental.includeVacatingRental },
  { id: 'rental.vacatingHousingExpense', path: 'rental.vacatingHousingExpense', label: 'Its housing expense', section: 'qualify', group: 'Rental qualification', kind: 'money', unit: '$ a month', when: i => i.rental.includeVacatingRental },
];

export const byId: Record<string, Field> = Object.fromEntries(FIELDS.map(f => [f.id, f]));
export const isSimple = (f: Field) => !f.group;

/** read a dotted path (array indexes allowed) */
export function getPath(obj: any, path: string): any { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
