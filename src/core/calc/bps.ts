// Recovered from the 56.5 compiled engine: AMD module "src/core/calc/bps".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck
import * as dep0 from '../utils/num';

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = { 'src/core/utils/num': dep0 };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/core/calc/bps: undeclared runtime require of ' + name); };
(function (e, t, n) {"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.LEAD_SOURCE_BPS=void 0,t.calculateBps=function calculateBps(e,a){var r;const i=null!==(r=t.LEAD_SOURCE_BPS[e.leadSource])&&void 0!==r?r:0,s=(0,n.nonNegative)(e.loanAmountOverride)>0?(0,n.nonNegative)(e.loanAmountOverride):(0,n.nonNegative)(a);let l=0,c="Enter one input";null===e.bps||void 0===e.bps||Number.isNaN(e.bps)?null===e.percent||void 0===e.percent||Number.isNaN(e.percent)?null===e.dollars||void 0===e.dollars||Number.isNaN(e.dollars)?i>0&&(l=i,c=`Lead source suggested BPS (${e.leadSource})`):(l=1e4*(0,n.safeDivide)((0,n.nonNegative)(e.dollars),s,0),c="Manual dollar amount"):(l=1e4*(0,n.nonNegative)(e.percent),c="Manual percentage"):(l=(0,n.nonNegative)(e.bps),c="Manual BPS");const u=l/1e4,d=(0,n.round)(s*u,2),m=(0,n.nonNegative)(e.cap),p=m>0?Math.min(d,m):d;return{suggestedBps:i,loanAmountUsed:s,effectiveBps:(0,n.round)(l,4),percent:u,dollars:d,cappedDollars:p,inputUsed:c,capApplied:m>0&&d>m}},t.LEAD_SOURCE_BPS={"Self Generated":200,Corporate:75,Manual:0}})(requireDep, moduleExports, dep0);

export const LEAD_SOURCE_BPS = moduleExports.LEAD_SOURCE_BPS;
export const calculateBps = moduleExports.calculateBps;
export default moduleExports;
