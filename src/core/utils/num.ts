// Recovered from the 56.5 compiled engine: AMD module "src/core/utils/num".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = {  };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/core/utils/num: undeclared runtime require of ' + name); };
(function (e, t) {"use strict";function num(e,t=0){if("number"==typeof e)return Number.isFinite(e)?e:t;if("string"==typeof e){const n=e.replace(/[$,%\s,]/g,"");if(""===n||"-"===n||"."===n)return t;const a=Number(n);return Number.isFinite(a)?a:t}return t}Object.defineProperty(t,"__esModule",{value:!0}),t.num=num,t.nonNegative=function nonNegative(e){const t=num(e);return t<0?0:t},t.clamp=function clamp(e,t,n){const a=num(e);return a<t?t:a>n?n:a},t.round=function round(e,t=2){const n=num(e),a=Math.pow(10,t);return Math.sign(n)*Math.round(Math.abs(n)*a+Number.EPSILON)/a},t.roundDownTo=function roundDownTo(e,t){const n=num(t);return n<=0?num(e):Math.floor(num(e)/n)*n},t.roundUpTo=function roundUpTo(e,t){const n=num(t);return n<=0?num(e):Math.ceil(num(e)/n)*n},t.safeDivide=function safeDivide(e,t,n=0){const a=num(t);return 0===a?n:num(e)/a},t.sum=function sum(...e){return e.reduce((e,t)=>e+num(t),0)},t.currency=function currency(e,t=0){const n=num(e),a=Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:t,maximumFractionDigits:t});return`${n<0?"-":""}$${a}`},t.percent=function percent(e,t=3){return`${(100*num(e)).toFixed(t).replace(/\.?0+$/,"")}%`}})(requireDep, moduleExports);

export const num = moduleExports.num;
export const nonNegative = moduleExports.nonNegative;
export const clamp = moduleExports.clamp;
export const round = moduleExports.round;
export const roundDownTo = moduleExports.roundDownTo;
export const roundUpTo = moduleExports.roundUpTo;
export const safeDivide = moduleExports.safeDivide;
export const sum = moduleExports.sum;
export const currency = moduleExports.currency;
export const percent = moduleExports.percent;
export default moduleExports;
