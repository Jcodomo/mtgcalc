// Cash to close: what the borrower brings to closing.
import { nonNegative, round } from '../utils/num';
import { money } from './trace';

export interface CashToCloseResult {
  requiredInvestment: number;
  additionalFundsRequired: number;
  buyerClosingCosts: number;
  sellerConcessionRequested: number;
  sellerConcessionAllowed: number;
  sellerConcessionApplied: number;
  sellerConcessionUnused: number;
  creditNotes: string[];
  earnestMoneyDeposit: number;
  cashToCloseBeforeEmd: number;
  cashToClose: number;
  cashToCloseLow: number;
  cashToCloseHigh: number;
  cashToCloseOutsideNy: number;
  minimumInvestmentAfterEmd: number;
  emdCreditApplied: number;
  /** Deposit above the funds needed - returned to the borrower at closing (56.5 used this for credits above the costs). */
  deficit: number;
}

/**
 * v57 rule (docs/v57 D1, D2):
 *   Funds needed  = Required Investment + Additional Funds (not financed) + Buyer Closing Costs - Seller Credit Applied
 *   Credit applied = MIN(credit allowed by the program limit, buyer closing costs) - a seller credit pays closing costs and
 *                    prepaids only; it never pays the required investment, and any excess is reported as unused.
 *   Cash to Close = MAX(0, Funds needed - Earnest Money); a deposit above the funds needed comes back at closing.
 */
export function calculateCashToClose(inputs: any, purchase: any, loan: any, closing: any, trace?: any): CashToCloseResult {
  const requiredInvestment = nonNegative(loan.requiredInvestment);
  const additional = nonNegative(loan.additionalFundsRequired);
  const requested = nonNegative(purchase.sellerConcessionAmount);
  const allowed = nonNegative(purchase.sellerConcessionAllowed);
  const deposit = nonNegative(inputs.closing.earnestMoneyDeposit);
  const costs = nonNegative(closing.buyerClosingCosts);
  const applied = round(Math.min(allowed, costs), 2);
  const unused = round(allowed - applied, 2);
  const fundsFor = (c: number) => round(requiredInvestment + additional + nonNegative(c) - Math.min(allowed, nonNegative(c)), 2);

  const beforeDeposit = Math.max(0, fundsFor(costs));
  const cashToClose = Math.max(0, round(beforeDeposit - deposit, 2));
  const cashBack = Math.max(0, round(deposit - beforeDeposit, 2));
  const low = Math.max(0, round(fundsFor(closing.buyerClosingCostsLow) - deposit, 2));
  const high = Math.max(0, round(fundsFor(closing.buyerClosingCostsHigh) - deposit, 2));
  const outsideNy = Math.max(0, round(fundsFor(closing.estimateOutsideNewYork) - deposit, 2));
  const minimumAfterDeposit = Math.max(0, round(requiredInvestment + additional - deposit, 2));
  const depositApplied = Math.min(deposit, beforeDeposit);

  const creditNotes: string[] = [];
  if (purchase.sellerConcessionOverLimit > 0) creditNotes.push(`Requested ${requested.toFixed(2)}; the program limit (${(100 * purchase.sellerConcessionLimitPct).toFixed(0)}% - ${purchase.concessionLimitNote}) allows ${allowed.toFixed(2)}, so ${purchase.sellerConcessionOverLimit.toFixed(2)} cannot be credited.`);
  if (unused > 0) creditNotes.push(`${unused.toFixed(2)} of the allowed seller credit is more than the closing costs and prepaids (${costs.toFixed(2)}) and is not used - a seller credit cannot pay the down payment or required investment. Reduce the credit or the price.`);

  if (trace) trace.record('cashToClose', 'Cash to close',
    'Cash to Close = MAX(0, Required Investment + Additional Funds + Buyer Closing Costs - Seller Credit Applied - Earnest Money); Seller Credit Applied = MIN(Allowed Credit, Buyer Closing Costs)',
    [money('Required investment', requiredInvestment), money('Additional funds (not financed)', additional), money('Buyer closing costs', costs), money('Seller credit requested', requested),
      money('Seller credit allowed', allowed), money('Seller credit applied', applied), money('Earnest money deposit', deposit)],
    cashToClose, {
      resultFormat: 'currency',
      limitsApplied: [...(purchase.sellerConcessionOverLimit > 0 ? [`Seller credit capped at ${(100 * purchase.sellerConcessionLimitPct).toFixed(0)}% of the price (${purchase.concessionLimitNote})`] : []),
        ...(unused > 0 ? ['Seller credit limited to the closing costs and prepaids'] : [])],
      notes: [...creditNotes, ...(additional > 0 ? [`Includes ${additional.toFixed(2)} of the purchase and renovation cost that the loan does not cover.`] : []),
        ...(cashBack > 0 ? [`The deposit is ${cashBack.toFixed(2)} more than the funds needed; that amount comes back at closing.`] : []),
        `Before the earnest money credit: ${beforeDeposit.toFixed(2)}`, `Range: ${low.toFixed(0)} (low closing costs) to ${high.toFixed(0)} (with cushion)`,
        `Minimum investment after the EMD credit: ${minimumAfterDeposit.toFixed(2)}`]});

  return {requiredInvestment, additionalFundsRequired: additional, buyerClosingCosts: closing.buyerClosingCosts, sellerConcessionRequested: requested, sellerConcessionAllowed: allowed,
    sellerConcessionApplied: applied, sellerConcessionUnused: unused, creditNotes, earnestMoneyDeposit: deposit, cashToCloseBeforeEmd: beforeDeposit, cashToClose, cashToCloseLow: low,
    cashToCloseHigh: high, cashToCloseOutsideNy: outsideNy, minimumInvestmentAfterEmd: minimumAfterDeposit, emdCreditApplied: depositApplied, deficit: cashBack};
}

export default {calculateCashToClose};
