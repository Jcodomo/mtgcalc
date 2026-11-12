// Recovered from the 56.5 compiled engine: AMD module "src/core/calc/cashToClose".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck
import * as dep0 from '../utils/num';
import * as dep1 from './trace';

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = { 'src/core/utils/num': dep0, 'src/core/calc/trace': dep1 };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/core/calc/cashToClose: undeclared runtime require of ' + name); };
(function (e, t, n, a) {"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.calculateCashToClose=function calculateCashToClose(e,t,r,i,s){const l=(0,n.nonNegative)(r.requiredInvestment),c=(0,n.nonNegative)(t.sellerConcessionAllowed),u=(0,n.nonNegative)(e.closing.earnestMoneyDeposit),d=(0,n.round)(l+i.buyerClosingCosts-c,2),m=Math.max(0,d),p=Math.max(0,(0,n.round)(m-u,2)),y=d<0?(0,n.round)(Math.abs(d),2):0,v=Math.max(0,(0,n.round)(l+i.buyerClosingCostsLow-c-u,2)),g=Math.max(0,(0,n.round)(l+i.buyerClosingCostsHigh-c-u,2)),b=Math.max(0,(0,n.round)(l+i.estimateOutsideNewYork-c-u,2)),w=Math.max(0,(0,n.round)(l-u,2)),A=Math.min(u,m);s&&s.record("cashToClose","Cash to close","Cash to Close = MAX(0, Required Investment + Buyer Closing Costs - Seller Concession - Earnest Money)",[(0,a.money)("Required investment",l),(0,a.money)("Buyer closing costs",i.buyerClosingCosts),(0,a.money)("Seller concession applied",c),(0,a.money)("Earnest money deposit",u)],p,{resultFormat:"currency",limitsApplied:[...d<0?["Result floored at $0 - the credits exceed the required funds"]:[],...t.sellerConcessionOverLimit>0?[`Seller credit capped at ${(100*t.sellerConcessionLimitPct).toFixed(0)}% of the price (${t.concessionLimitNote})`]:[]],notes:[...t.sellerConcessionOverLimit>0?[`The seller credit entered is ${t.sellerConcessionAmount.toFixed(2)}; only ${c.toFixed(2)} is inside the limit, so ${t.sellerConcessionOverLimit.toFixed(2)} is not applied.`]:[],`Before the earnest money credit: ${m.toFixed(2)}`,`Range: ${v.toFixed(0)} (low closing costs) to ${g.toFixed(0)} (with cushion)`,`Minimum investment after the EMD credit: ${w.toFixed(2)}`]});return{requiredInvestment:l,buyerClosingCosts:i.buyerClosingCosts,sellerConcessionApplied:c,earnestMoneyDeposit:u,cashToCloseBeforeEmd:m,cashToClose:p,cashToCloseLow:v,cashToCloseHigh:g,cashToCloseOutsideNy:b,minimumInvestmentAfterEmd:w,emdCreditApplied:A,deficit:y}}})(requireDep, moduleExports, dep0, dep1);

export const calculateCashToClose = moduleExports.calculateCashToClose;
export default moduleExports;
