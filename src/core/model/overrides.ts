// Blank versus zero (v57).
// Every manual override is stored as `null` = "calculate it" or a number = "use this". Zero is a real value: a $0 fee
// or 0% PMI means exactly that - except where a program does not permit zero, which is rejected with an explanation and
// the calculated value is used instead. 56.5 stored 0 to mean "calculate"; migrate56Inputs converts those files.
import { num, nonNegative, clamp } from '../utils/num';

export type ZeroRule = 'allowed' | 'prohibited' | 'review';
export interface OverrideField {
  path: string;
  label: string;
  unit: 'rate' | 'dollars' | 'dollars-monthly';
  max?: number;
  zero: ZeroRule;
  zeroNote: string;
}

export const OVERRIDE_FIELDS: OverrideField[] = [
  {path: 'fhaMipOverrideRate', label: 'FHA annual MIP rate', unit: 'rate', max: 0.05, zero: 'prohibited',
    zeroNote: 'FHA charges annual MIP on every forward loan, so 0% cannot be used; the calculated rate applies. Leave the field blank to use the calculated rate.'},
  {path: 'pmiOverrideRate', label: 'Conventional PMI rate', unit: 'rate', max: 0.05, zero: 'allowed',
    zeroNote: '0% means no monthly PMI is charged (lender-paid MI, or no MI required).'},
  {path: 'taxInsuranceOverrideMonthly', label: 'Monthly taxes + insurance', unit: 'dollars-monthly', zero: 'review',
    zeroNote: '$0 replaces the separate tax and insurance figures with nothing - confirm the property really has no taxes or hazard insurance in the payment.'},
  {path: 'reno.supplementalOriginationOverride', label: 'Supplemental origination fee', unit: 'dollars', zero: 'allowed',
    zeroNote: '$0 means the fee is waived.'},
];

/** Asset fields: null = not entered (checks report "Not entered"); 0 = the borrower has none. */
export const ASSET_FIELDS = ['assets.liquidAssets', 'assets.retirementOtherAssets', 'assets.giftFunds'];

export function getPath(obj: any, path: string): any { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
export function setPath(obj: any, path: string, value: unknown): void {
  const keys = path.split('.'), last = keys.pop() as string;
  const target = keys.reduce((o, k) => (o[k] == null || typeof o[k] !== 'object' ? (o[k] = {}) : o[k]), obj);
  target[last] = value;
}
export const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** After the 56.5 input cleaning (which turns blanks into 0), put the blanks back for overrides and asset fields. */
export function keepBlanks(raw: any, cleaned: any): any {
  for (const f of OVERRIDE_FIELDS) {
    const v = getPath(raw, f.path);
    setPath(cleaned, f.path, isBlank(v) ? null : f.max != null ? clamp(num(v), 0, f.max) : nonNegative(num(v)));
  }
  for (const p of ASSET_FIELDS) { const v = getPath(raw, p); setPath(cleaned, p, isBlank(v) ? null : nonNegative(num(v))); }
  return cleaned;
}

/** The value an override takes in the calculation: null when blank, or when zero is prohibited for that field. */
export function overrideValue(inputs: any, path: string): number | null {
  const f = OVERRIDE_FIELDS.find(x => x.path === path); const v = getPath(inputs, path);
  if (isBlank(v)) return null;
  const n = nonNegative(num(v));
  if (n === 0 && f && f.zero === 'prohibited') return null;
  return n;
}

/** Messages for zero overrides that are prohibited or need review - shown with the validation warnings. */
export function overrideWarnings(inputs: any): {code: string; severity: 'error' | 'warning'; title: string; detail: string; module: string}[] {
  const out: any[] = [];
  for (const f of OVERRIDE_FIELDS) {
    const v = getPath(inputs, f.path);
    if (isBlank(v) || nonNegative(num(v)) !== 0) continue;
    if (f.zero === 'prohibited') out.push({code: 'OVERRIDE_ZERO_REJECTED', severity: 'error', title: `${f.label}: 0 is not allowed`, detail: f.zeroNote, module: 'payment'});
    if (f.zero === 'review') out.push({code: 'OVERRIDE_ZERO_REVIEW', severity: 'warning', title: `${f.label} set to $0`, detail: f.zeroNote, module: 'payment'});
  }
  return out;
}

/**
 * Converts scenario inputs saved by 56.5 (or earlier) to v57 meaning: an override of 0 meant "calculate" and becomes
 * null; asset fields left at 0 were never entered and become null. Returns a new object; the input is not changed.
 */
export function migrate56Inputs(inputs: any): any {
  const out = JSON.parse(JSON.stringify(inputs || {}));
  for (const f of OVERRIDE_FIELDS) { const v = getPath(out, f.path); if (v === 0 || v === '0' || v === '' ) setPath(out, f.path, null); }
  for (const p of ASSET_FIELDS) { const v = getPath(out, p); if (v === 0 || v === '0' || v === '') setPath(out, p, null); }
  return out;
}
