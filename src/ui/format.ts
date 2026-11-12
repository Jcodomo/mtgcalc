// Recovered from the 56.5 compiled engine: AMD module "src/ui/format".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck
import * as dep0 from '../core/utils/num';

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = { 'src/core/utils/num': dep0 };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/ui/format: undeclared runtime require of ' + name); };
(function (e, t, n) {"use strict";function fmtCurrency(e,t=0){const a=(0,n.num)(e);return`${a<0?"-":""}$${Math.abs(a).toLocaleString("en-US",{minimumFractionDigits:t,maximumFractionDigits:t})}`}Object.defineProperty(t,"__esModule",{value:!0}),t.fmtCurrency=fmtCurrency,t.fmtCurrency2=function fmtCurrency2(e){return fmtCurrency(e,2)},t.fmtPercent=function fmtPercent(e,t=3){return`${(100*(0,n.num)(e)).toFixed(t)}%`},t.fmtNumber=function fmtNumber(e,t=0){return(0,n.num)(e).toLocaleString("en-US",{minimumFractionDigits:t,maximumFractionDigits:t})},t.fmtRange=function fmtRange(e,t,n=0){return`${fmtCurrency(e,n)} - ${fmtCurrency(t,n)}`},t.parseFieldValue=function parseFieldValue(e,t){switch(e){case"currency":case"number":return(0,n.num)(t);case"percent":return(0,n.num)(t)/100;case"checkbox":return"true"===t;default:return t}},t.toInputValue=function toInputValue(e,t){if(null==t)return"";switch(e){case"currency":return 0===t?"":String((0,n.num)(t));case"number":return String((0,n.num)(t));case"percent":{const e=100*(0,n.num)(t);return 0===e?"":String(Number(e.toFixed(6)))}default:return null==t?"":String(t)}}})(requireDep, moduleExports, dep0);

export const fmtCurrency = moduleExports.fmtCurrency;
export const fmtCurrency2 = moduleExports.fmtCurrency2;
export const fmtPercent = moduleExports.fmtPercent;
export const fmtNumber = moduleExports.fmtNumber;
export const fmtRange = moduleExports.fmtRange;
export const parseFieldValue = moduleExports.parseFieldValue;
export const toInputValue = moduleExports.toInputValue;
export default moduleExports;
