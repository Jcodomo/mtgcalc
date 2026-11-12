// Cash to close: what the borrower brings to closing.
import { nonNegative, round } from '../utils/num';
import { money } from './trace';

export interface CashToCloseResult {
  requiredInvestment: number;
  buyerClosingCosts: number;
  sellerConcessionApplied: number;
  earnestMoneyDeposit: number;
  cashToCloseBeforeEmd: number;
  cashToClose: number;
  cashToCloseLow: number;
  cashToCloseHigh: number;
  cashToCloseOutsideNy: number;
  minimumInvestmentAfterEmd: number;
  emdCreditApplied: number;
  deficit: number;
}

/**
 * 56.5 rule, kept unchanged by this rewrite:
 *   Cash to Close = MAX(0, Required Investment + Buyer Closing Costs - Seller Concession - Earnest Money)
 * (See docs/v57 D1 and D2: this leaves out amounts a loan limit stops the loan from covering, and lets a seller credit
 * larger than the closing costs pay down the required investment. Both are corrected in a separate, tested change.)
 */
export function calculateCashToClose(inputs: any, purchase: any, loan: any, closing: any, trace?: any): CashToCloseResult {
  const requiredInvestment = nonNegative(loan.requiredInvestment);
  const credit = nonNegative(purchase.sellerConcessionAllowed);
  const deposit = nonNegative(inputs.closing.earnestMoneyDeposit);
  const net = round(requiredInvestment + closing.buyerClosingCosts - credit, 2);
  const beforeDeposit = Math.max(0, net);
  const cashToClose = Math.max(0, round(beforeDeposit - deposit, 2));
  const deficit = net < 0 ? round(Math.abs(net), 2) : 0;
  const low = Math.max(0, round(requiredInvestment + closing.buyerClosingCostsLow - credit - deposit, 2));
  const high = Math.max(0, round(requiredInvestment + closing.buyerClosingCostsHigh - credit - deposit, 2));
  const outsideNy = Math.max(0, round(requiredInvestment + closing.estimateOutsideNewYork - credit - deposit, 2));
  const minimumAfterDeposit = Math.max(0, round(requiredInvestment - deposit, 2));
  const depositApplied = Math.min(deposit, beforeDeposit);

  if (trace) trace.record('cashToClose', 'Cash to close', 'Cash to Close = MAX(0, Required Investment + Buyer Closing Costs - Seller Concession - Earnest Money)',
    [money('Required investment', requiredInvestment), money('Buyer closing costs', closing.buyerClosingCosts), money('Seller concession applied', credit), money('Earnest money deposit', deposit)],
    cashToClose, {
      resultFormat: 'currency',
      limitsApplied: [
        ...(net < 0 ? ['Result floored at $0 - the credits exceed the required funds'] : []),
        ...(purchase.sellerConcessionOverLimit > 0 ? [`Seller credit capped at ${(100 * purchase.sellerConcessionLimitPct).toFixed(0)}% of the price (${purchase.concessionLimitNote})`] : [])],
      notes: [
        ...(purchase.sellerConcessionOverLimit > 0 ? [`The seller credit entered is ${purchase.sellerConcessionAmount.toFixed(2)}; only ${credit.toFixed(2)} is inside the limit, so ${purchase.sellerConcessionOverLimit.toFixed(2)} is not applied.`] : []),
        `Before the earnest money credit: ${beforeDeposit.toFixed(2)}`,
        `Range: ${low.toFixed(0)} (low closing costs) to ${high.toFixed(0)} (with cushion)`,
        `Minimum investment after the EMD credit: ${minimumAfterDeposit.toFixed(2)}`]});

  return {requiredInvestment, buyerClosingCosts: closing.buyerClosingCosts, sellerConcessionApplied: credit, earnestMoneyDeposit: deposit, cashToCloseBeforeEmd: beforeDeposit,
    cashToClose, cashToCloseLow: low, cashToCloseHigh: high, cashToCloseOutsideNy: outsideNy, minimumInvestmentAfterEmd: minimumAfterDeposit, emdCreditApplied: depositApplied, deficit};
}

export default {calculateCashToClose};
