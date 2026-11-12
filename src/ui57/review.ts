// v57 quote screen: the checks (Pass / Fail / Review Needed / Not Entered / Not Applicable), the "Assumptions in use" list,
// and the summary figures - all read from the engine's outputs, so the screen shows nothing the engine did not calculate.
import { FIELDS, Field, getPath } from './fields';

export type Status = 'pass' | 'fail' | 'review' | 'missing' | 'na';
export const STATUS_LABEL: Record<Status, string> = { pass: 'Pass', fail: 'Fail', review: 'Review needed', missing: 'Not entered', na: 'Not applicable' };
export interface Check { id: string; title: string; status: Status; detail: string; field?: string; }

export const usd = (n: number | null | undefined, cents = false) => n == null || !isFinite(n) ? '-' : (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
export const pct = (n: number | null | undefined, d = 2) => n == null || !isFinite(n) ? '-' : (n * 100).toFixed(d).replace(/\.?0+$/, '') + '%';

/** engine warnings already covered by a check of their own */
const COVERED = new Set(['MISSING_APPRAISAL_VALUE']);
const WARNING_FIELD: [RegExp, string][] = [[/TAX/, 'taxSourceType'], [/FHA_.*(LIMIT|COST|AREA)/, 'fhaAreaSelection'], [/MIP/, 'fhaMipOverrideRate'], [/PMI/, 'pmiOverrideRate'], [/CONCESSION|CREDIT/, 'sellerConcessionPct'], [/APPRAISAL|ARV|VALUE/, 'afterRepairValue'], [/RENO|CONTINGENCY|DRAW/, 'reno.baseCost'], [/RATE/, 'interestRate'], [/INCOME/, 'income'], [/ASSET|RESERVE/, 'assets.liquidAssets']];

export function checks(i: any, o: any): Check[] {
  const L: Check[] = [], add = (c: Check) => L.push(c), reno = !!i.renovation;
  if (!(i.basePurchasePrice > 0)) add({ id: 'price', title: 'Purchase price', status: 'missing', detail: 'Enter the purchase price.', field: 'basePurchasePrice' });
  if (reno && !(i.reno.baseCost > 0)) add({ id: 'budget', title: 'Renovation budget', status: 'missing', detail: 'Renovation is on but no construction budget is entered.', field: 'reno.baseCost' });

  /* financing: anything the loan cannot cover is in cash to close, with the reasons */
  const gap = o.loan.additionalFundsRequired || 0;
  if (gap > 0) add({ id: 'gap', title: 'Funding gap', status: 'review', detail: `The loan cannot cover ${usd(gap, true)}; it is included in cash to close. ` + (o.loan.additionalFundsReasons || []).map((r: any) => (typeof r === 'string' ? r : `${r.label || r.reason}: ${usd(r.amount, true)}`)).join('; '), field: 'finalDownPaymentPct' });
  else add({ id: 'gap', title: 'Loan covers the project', status: 'pass', detail: o.loan.fhaLimitStatus && o.isFha ? o.loan.fhaLimitStatus + '.' : 'No amount is left unfinanced.' });

  /* value */
  if (reno) {
    if (!(i.afterRepairValue > 0)) add({ id: 'arv', title: 'After-repair value', status: 'missing', detail: 'No ARV is entered, so value support is not checked. An estimate is not an appraisal.', field: 'afterRepairValue' });
    else if (o.value.valueCushion != null) add({ id: 'arv', title: 'Value supports the loan', status: o.value.valueCushion >= 0 ? 'pass' : 'fail', detail: o.value.valueCushion >= 0 ? `Cushion of ${usd(o.value.valueCushion)} under ${o.value.arvLimitLabel}.` : `Short by ${usd(-o.value.valueCushion)} against ${o.value.arvLimitLabel}; an ARV of at least ${usd(o.value.minimumArvNeeded)} is needed.`, field: 'afterRepairValue' });
  } else add({ id: 'arv', title: 'After-repair value', status: 'na', detail: 'Not a renovation loan.' });

  /* seller credit: requested, allowed, applied, unused */
  const req = o.cash.sellerConcessionRequested || 0;
  if (!(req > 0)) add({ id: 'credit', title: 'Seller credit', status: 'na', detail: 'No seller credit requested.' });
  else if ((o.purchase.sellerConcessionOverLimit || 0) > 0 || (o.cash.sellerConcessionUnused || 0) > 0) add({ id: 'credit', title: 'Seller credit', status: 'review', detail: `Requested ${usd(req, true)}, allowed ${usd(o.cash.sellerConcessionAllowed, true)}, applied ${usd(o.cash.sellerConcessionApplied, true)}, unused ${usd(o.cash.sellerConcessionUnused, true)}. ` + (o.cash.creditNotes || []).join(' '), field: 'sellerConcessionPct' });
  else add({ id: 'credit', title: 'Seller credit', status: 'pass', detail: `${usd(o.cash.sellerConcessionApplied, true)} applied to closing costs (limit ${pct(o.purchase.sellerConcessionLimitPct)}).` });

  /* qualification */
  const a = o.aus;
  if (a.overallDti === 'ENTER INCOME') add({ id: 'dti', title: 'Debt-to-income', status: 'missing', detail: 'Enter qualifying income. The DTI is not 0% - it is not calculated yet.', field: 'income' });
  else add({ id: 'dti', title: 'Debt-to-income', status: a.overallDti === 'PASS' ? 'pass' : 'fail', detail: `Housing ${pct(a.frontEndDti)} (limit ${pct(a.frontEndLimit)}), total ${pct(a.backEndDti)} (limit ${pct(a.backEndLimit)}).`, field: 'income' });
  const assetsIn = i.assets && i.assets.liquidAssets != null;
  if (!assetsIn) add({ id: 'funds', title: 'Funds to close', status: 'missing', detail: `Enter available assets to check them against ${usd(o.cash.cashToClose)} cash to close.`, field: 'assets.liquidAssets' });
  else add({ id: 'funds', title: 'Funds to close', status: a.assetsRemainingAfterClosing >= 0 ? 'pass' : 'fail', detail: a.assetsRemainingAfterClosing >= 0 ? `${usd(a.assetsRemainingAfterClosing)} left after closing.` : `Short ${usd(-a.assetsRemainingAfterClosing)} for cash to close.`, field: 'assets.liquidAssets' });
  const rs = String(a.reserveStatus || '');
  add({ id: 'reserves', title: 'Reserves', status: /^NOT ENTERED/.test(rs) ? 'missing' : /^PASS/.test(rs) ? 'pass' : /^FAIL/.test(rs) ? 'fail' : 'review', detail: /^NOT ENTERED/.test(rs) ? 'Enter available assets to check reserves.' : `${rs}. ${a.reserveMonthsAvailable != null ? a.reserveMonthsAvailable.toFixed(1) + ' months available, ' + a.requiredReserveMonths + ' required.' : ''}`, field: 'assets.liquidAssets' });
  if (!a.selfSufficiencyApplies) add({ id: 'selfsuff', title: 'FHA self-sufficiency', status: 'na', detail: 'Applies to 3-4 unit FHA properties only.' });
  else add({ id: 'selfsuff', title: 'FHA self-sufficiency', status: /^PASS/.test(a.selfSufficiencyStatus) ? 'pass' : 'fail', detail: a.selfSufficiencyStatus, field: 'rental.mainUnit.gross' });

  /* everything else the engine raised */
  for (const w of o.warnings || []) {
    if (COVERED.has(w.code)) continue;
    const f = (WARNING_FIELD.find(([re]) => re.test(w.code)) || [])[1];
    add({ id: 'w-' + w.code, title: titleCase(w.title || w.code), status: w.severity === 'error' ? 'fail' : 'review', detail: w.detail || '', field: f });
  }
  return L;
}
const titleCase = (s: string) => /[a-z]/.test(s) ? s : s.charAt(0) + s.slice(1).toLowerCase();

export interface Assumption { text: string; field: string; kind: 'override' | 'setting' | 'estimate' | 'inactive'; }
/** active overrides and material advanced settings, so hidden controls never hide their effect (spec item 9) */
export function assumptions(i: any, o: any, d: any): Assumption[] {
  const L: Assumption[] = [];
  const show = (f: Field) => !f.when || f.when(i);
  for (const f of FIELDS) {
    if (!show(f)) continue;
    const v = getPath(i, f.path), dv = getPath(d, f.path);
    if (f.override) { if (v != null && f.group !== 'Assets and reserves' && f.id !== 'assets.liquidAssets') L.push({ text: `${f.label} overridden: ${fmt(f, v)}` + (f.calc ? ` (calculated ${fmt(f, f.calc(o, i))})` : ''), field: f.id, kind: 'override' }); continue; }
    if (f.group && f.kind !== 'text' && JSON.stringify(v) !== JSON.stringify(dv)) L.push({ text: `${f.label}: ${fmt(f, v)} (standard ${fmt(f, dv)})`, field: f.id, kind: 'setting' });
  }
  if (i.renovation && i.reno.paymentReserveMonths > 0) L.unshift({ text: `${i.reno.paymentReserveMonths} financed payment${i.reno.paymentReserveMonths > 1 ? 's' : ''} (${usd(o.renovationOut.paymentReserve)})`, field: 'reno.paymentReserveMonths', kind: 'setting' });
  if (/Manual|Estimate/i.test(i.taxSourceType)) L.push({ text: `Property taxes are ${/Estimate/.test(i.taxSourceType) ? 'an online estimate' : 'entered by hand'} - not from a tax certificate`, field: 'taxSourceType', kind: 'estimate' });
  if (!i.renovation && i.reno && i.reno.baseCost > 0) L.push({ text: `Renovation is off - the ${usd(i.reno.baseCost)} budget is kept but not counted`, field: 'renovation', kind: 'inactive' });
  if (i.loanProgram !== 'FHA' && i.fhaMipOverrideRate != null) L.push({ text: 'An FHA MIP override is kept but not used under Conventional', field: 'fhaMipOverrideRate', kind: 'inactive' });
  if (i.loanProgram !== 'Conventional' && i.pmiOverrideRate != null) L.push({ text: 'A PMI override is kept but not used under FHA', field: 'pmiOverrideRate', kind: 'inactive' });
  if (i.conventionalRatePremiumApplied > 0) L.push({ text: `Conventional rate premium of ${pct(i.conventionalRatePremiumApplied, 3)} is in the rate`, field: 'interestRate', kind: 'setting' });
  return L;
}

export function fmt(f: Field, v: any): string {
  if (v == null || v === '') return 'blank';
  if (f.id === 'escrow.cushionMonthsOverride' && v < 0) return 'the county rule';
  if (f.kind === 'check') return v ? 'on' : 'off';
  if (f.kind === 'pct') return pct(v, f.digits ?? 2);
  if (f.kind === 'money') return usd(v, Math.abs(v) < 1000 && v % 1 !== 0);
  if (f.kind === 'select') { const o = (f.options || []).find(x => x[0] === v); return o ? o[1] : String(v); }
  return String(v) + (f.unit && f.kind !== 'text' ? ' ' + f.unit : '');
}

export interface Figure { id: string; label: string; value: string; note?: string; tone?: 'bad' | 'warn' | 'muted'; }
/** the summary: four primary figures, the rest on demand (spec item 14) */
export function summary(i: any, o: any): { primary: Figure[]; more: Figure[] } {
  const a = o.aus, noIncome = a.overallDti === 'ENTER INCOME', assetsIn = i.assets && i.assets.liquidAssets != null;
  const primary: Figure[] = [
    { id: 'payment', label: 'Monthly payment', value: usd(o.payment.totalMonthlyPayment, true), note: 'P&I, MI, taxes, insurance, HOA' },
    { id: 'loan', label: 'Total loan', value: usd(o.loan.totalLoan, true), note: o.loan.ufmip > 0 ? `incl. ${usd(o.loan.ufmip, true)} upfront MIP` : '' },
    { id: 'cash', label: 'Cash to close', value: usd(o.cash.cashToClose, true), note: o.loan.additionalFundsRequired > 0 ? `incl. ${usd(o.loan.additionalFundsRequired)} not financed` : '', tone: o.loan.additionalFundsRequired > 0 ? 'warn' : undefined },
    { id: 'dti', label: 'DTI (total)', value: noIncome ? 'Not entered' : pct(a.backEndDti), note: noIncome ? 'enter income' : `limit ${pct(a.backEndLimit)}`, tone: noIncome ? 'muted' : a.backEndResult === 'PASS' ? undefined : 'bad' },
  ];
  const more: Figure[] = [
    { id: 'base', label: 'Base loan', value: usd(o.loan.totalLoan - (o.loan.ufmip || 0), true) },
    { id: 'pi', label: 'Principal & interest', value: usd(o.payment.principalAndInterest, true) },
    { id: 'mi', label: o.isFha ? 'FHA MIP' : 'PMI', value: usd(o.isFha ? o.payment.monthlyFhaMip : o.payment.monthlyPmi, true) },
    { id: 'ti', label: 'Taxes & insurance', value: usd(o.payment.monthlyTaxesAndInsuranceUsed, true), note: o.payment.usingTiOverride ? 'overridden' : '' },
    { id: 'closingcosts', label: 'Closing costs', value: usd(o.cash.buyerClosingCosts, true) },
    { id: 'reserves', label: 'Reserves', value: !assetsIn ? 'Not entered' : `${(a.reserveMonthsAvailable || 0).toFixed(1)} mo`, note: assetsIn ? `${a.requiredReserveMonths} required` : '', tone: !assetsIn ? 'muted' : /^FAIL/.test(a.reserveStatus) ? 'bad' : undefined },
    { id: 'arv', label: 'ARV cushion', value: !i.renovation ? 'N/A' : !(i.afterRepairValue > 0) ? 'Not entered' : usd(o.value.valueCushion), tone: !i.renovation ? 'muted' : !(i.afterRepairValue > 0) ? 'muted' : o.value.valueCushion < 0 ? 'bad' : undefined, note: i.renovation && i.afterRepairValue > 0 && o.value.valueCushion < 0 ? 'shortfall' : '' },
    { id: 'ltv', label: 'LTV / loan-to-cost', value: pct(o.loan.ltvOnFinalValue, 1) },
  ];
  if (o.cash.sellerConcessionUnused > 0) more.push({ id: 'unused', label: 'Unused seller credit', value: usd(o.cash.sellerConcessionUnused, true), tone: 'warn' });
  return { primary, more };
}
