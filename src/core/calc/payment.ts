// Monthly housing payment: principal & interest, mortgage insurance, taxes, insurance and HOA.
import { suggestFhaMipRate, suggestPmiRate, PMI_CANCELLATION_LTV } from '../data/mortgageInsurance';
import { creditTierFromScore } from '../data/qualificationRules';
import { num, nonNegative, round, roundDownTo, safeDivide } from '../utils/num';
import { money, pct, count } from './trace';

/** Level monthly principal & interest on `loan` at `annualRate` for `termYears`; a 0% rate is simply loan / months. */
export function principalAndInterest(loan: unknown, annualRate: unknown, termYears: unknown): number {
  const principal = nonNegative(loan), months = Math.round(12 * nonNegative(termYears));
  if (principal <= 0 || months <= 0) return 0;
  const r = nonNegative(annualRate) / 12;
  if (r === 0) return principal / months;
  const growth = Math.pow(1 + r, months);
  return principal * r * growth / (growth - 1);
}

/** Width of the borrower-facing payment range above the rounded-down payment. */
export function paymentSpread(payment: unknown): number {
  const p = num(payment);
  return p < 5000 ? 200 : p <= 7000 ? 225 : 250;
}

export function calculatePayment({inputs, program, loan, finalPurchasePrice, renovationAmount, trace}: any) {
  const pi = round(principalAndInterest(loan.totalLoan, inputs.interestRate, inputs.termYears), 2);

  /* FHA annual MIP: the planning table's rate unless a rate is entered (56.5: an entered 0 means "use the table") */
  const mipSuggestion = suggestFhaMipRate(loan.maximumBaseLoan, loan.loanToCost, undefined, num(inputs.termYears, 30));
  const mipSuggested = program.fhaMipEnabled ? mipSuggestion.rate : 0;
  const mipOverride = nonNegative(inputs.fhaMipOverrideRate) > 0;
  const mipRate = program.fhaMipEnabled ? (mipOverride ? nonNegative(inputs.fhaMipOverrideRate) : inputs.fhaMipManual ? nonNegative(inputs.fhaAnnualMipRate) : mipSuggestion.rate) : 0;
  const monthlyMip = program.fhaMipEnabled ? round(loan.maximumBaseLoan * mipRate / 12, 2) : 0;

  /* conventional PMI: suggested from credit tier and down payment unless a rate is entered (56.5: 0 means "use the suggestion") */
  const creditTier = creditTierFromScore(nonNegative(inputs.creditScore));
  const pmiSuggested = program.pmiEnabled ? suggestPmiRate(creditTier, nonNegative(inputs.finalDownPaymentPct)) : 0;
  const pmiOverride = nonNegative(inputs.pmiOverrideRate) > 0;
  const pmiRate = program.pmiEnabled ? (pmiOverride ? nonNegative(inputs.pmiOverrideRate) : pmiSuggested) : 0;
  const monthlyPmi = program.pmiEnabled ? round(loan.maximumBaseLoan * pmiRate / 12, 2) : 0;

  /* taxes and insurance: entered annually or monthly; a combined monthly override replaces both (56.5: 0 means "no override") */
  const monthlyTaxes = inputs.propertyTaxBasis === 'Annual' ? round(nonNegative(inputs.propertyTaxAmount) / 12, 2) : nonNegative(inputs.propertyTaxAmount);
  const monthlyInsurance = inputs.insuranceBasis === 'Annual' ? round(nonNegative(inputs.insuranceAmount) / 12, 2) : nonNegative(inputs.insuranceAmount);
  const tiOverride = nonNegative(inputs.taxInsuranceOverrideMonthly), usingTiOverride = tiOverride > 0;
  const taxesAndInsurance = usingTiOverride ? tiOverride : round(monthlyTaxes + monthlyInsurance, 2);
  const hoa = nonNegative(inputs.hoaMonthly);

  const total = round(pi + monthlyMip + monthlyPmi + taxesAndInsurance + hoa, 2);
  const increment = num(inputs.paymentRoundingIncrement, 50) || 50;
  const low = roundDownTo(total, increment), spread = paymentSpread(total), high = low + spread;
  const pmiCancelValue = program.pmiEnabled ? round(safeDivide(loan.maximumBaseLoan, PMI_CANCELLATION_LTV, 0), 2) : 0;
  const currentValue = program.renovationActive ? (nonNegative(inputs.afterRepairValue) || finalPurchasePrice + renovationAmount) : (nonNegative(inputs.asIsValue) || finalPurchasePrice);
  const currentLtv = safeDivide(loan.maximumBaseLoan, currentValue, 0);

  if (trace) {
    trace.record('principalAndInterest', 'Principal & interest', 'P&I = L x [ r(1+r)^n / ((1+r)^n - 1) ]',
      [money('Total loan (L)', loan.totalLoan), pct('Annual rate', inputs.interestRate), count('Term (years)', inputs.termYears)], pi, {resultFormat: 'currency'});
    trace.record('monthlyFhaMip', 'Monthly FHA MIP', program.fhaMipEnabled ? 'Monthly MIP = FHA Base Loan x Annual MIP Rate / 12' : 'Monthly MIP = $0 (Conventional financing)',
      [money('FHA base loan', program.fhaMipEnabled ? loan.maximumBaseLoan : 0), pct('Annual MIP rate', mipRate)], monthlyMip, {
        resultFormat: 'currency',
        overridesApplied: program.fhaMipEnabled && mipOverride ? [`Manual MIP rate override ${(100 * inputs.fhaMipOverrideRate).toFixed(3)}%`] : [],
        notes: program.fhaMipEnabled ? [`Suggested planning rate from LTC ${(100 * loan.loanToCost).toFixed(2)}%: ${(100 * mipSuggested).toFixed(3)}%`] : []});
    trace.record('monthlyPmi', 'Monthly conventional PMI', program.pmiEnabled ? 'Monthly PMI = Conventional Base Loan x Annual PMI Rate / 12' : 'Monthly PMI = $0 (FHA financing)',
      [money('Base loan', program.pmiEnabled ? loan.maximumBaseLoan : 0), pct('Annual PMI rate', pmiRate)], monthlyPmi, {
        resultFormat: 'currency',
        overridesApplied: program.pmiEnabled && pmiOverride ? [`Manual PMI rate override ${(100 * inputs.pmiOverrideRate).toFixed(3)}%`] : [],
        notes: program.pmiEnabled ? ['PMI is an ESTIMATE. The actual rate requires an insurer quote.'] : []});
    trace.record('totalMonthlyPayment', 'Total monthly payment', 'Payment = P&I + MI + Taxes + Insurance + HOA',
      [money('Principal & interest', pi), money('FHA MIP', monthlyMip), money('Conventional PMI', monthlyPmi), money('Taxes + insurance used', taxesAndInsurance), money('HOA / other monthly', hoa)], total, {
        resultFormat: 'currency', overridesApplied: usingTiOverride ? [`Combined monthly taxes + insurance override of ${tiOverride.toFixed(2)} replaces the separate fields`] : []});
    trace.record('paymentRange', 'Borrower payment range', 'Low = ROUNDDOWN(Payment / Increment) x Increment; High = Low + $200 / $225 / $250',
      [money('Exact payment', total), count('Rounding increment', increment), money('Spread applied', spread)], high, {resultFormat: 'currency', notes: [`Low ${low.toFixed(0)} / High ${high.toFixed(0)}`]});
  }

  return {principalAndInterest: pi, monthlyFhaMip: monthlyMip, monthlyPmi, pmiRateUsed: pmiRate, pmiSuggestedRate: pmiSuggested, fhaMipRateUsed: mipRate, fhaMipSuggestedRate: mipSuggested,
    monthlyTaxes, monthlyInsurance, usingTiOverride, monthlyTaxesAndInsuranceUsed: taxesAndInsurance, hoaMonthly: hoa, totalMonthlyPayment: total, paymentLow: low, paymentHigh: high,
    paymentSpread: spread, pmiCancelValue, currentLtv, creditTier};
}

export default {principalAndInterest, paymentSpread, calculatePayment};
