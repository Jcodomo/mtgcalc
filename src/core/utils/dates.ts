// Recovered from the 56.5 compiled engine: AMD module "src/core/utils/dates".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = {  };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/core/utils/dates: undeclared runtime require of ' + name); };
(function (e, t) {"use strict";function toISO(e){return`${e.getUTCFullYear()}-${`${e.getUTCMonth()+1}`.padStart(2,"0")}-${`${e.getUTCDate()}`.padStart(2,"0")}`}function parseISO(e){if(!e||!/^\d{4}-\d{2}-\d{2}$/.test(e))return null;const[t,n,a]=e.split("-").map(Number),r=new Date(Date.UTC(t,n-1,a));return r.getUTCFullYear()!==t||r.getUTCMonth()!==n-1||r.getUTCDate()!==a?null:r}function endOfMonth(e,t=0){var n;const a=null!==(n=parseISO(e))&&void 0!==n?n:new Date;return toISO(new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth()+t+1,0)))}Object.defineProperty(t,"__esModule",{value:!0}),t.MONTH_NAMES=void 0,t.toISO=toISO,t.parseISO=parseISO,t.isValidISO=function isValidISO(e){return null!==parseISO(e)},t.today=function today(){return toISO(new Date)},t.endOfMonth=endOfMonth,t.defaultClosingDate=function defaultClosingDate(e){return endOfMonth(e,1)},t.perDiemDays=function perDiemDays(e){const t=parseISO(e);if(!t)return 0;const n=parseISO(endOfMonth(e,0));if(!n)return 0;const a=n.getTime()-t.getTime();return Math.max(0,Math.round(a/864e5)+1)},t.defaultFirstPaymentDate=function defaultFirstPaymentDate(e){const t=parseISO(e);if(!t)return e;return toISO(new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+2,1)))},t.monthLabel=function monthLabel(e,n){const a=((e-1)%12+12)%12;return n?`${t.MONTH_NAMES[a]} ${n}`:t.MONTH_NAMES[a]},t.addDaysISO=function addDaysISO(e,t){const n=parseISO(e);return n?(n.setUTCDate(n.getUTCDate()+t),toISO(n)):e},t.MONTH_NAMES=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]})(requireDep, moduleExports);

export const MONTH_NAMES = moduleExports.MONTH_NAMES;
export const toISO = moduleExports.toISO;
export const parseISO = moduleExports.parseISO;
export const isValidISO = moduleExports.isValidISO;
export const today = moduleExports.today;
export const endOfMonth = moduleExports.endOfMonth;
export const defaultClosingDate = moduleExports.defaultClosingDate;
export const perDiemDays = moduleExports.perDiemDays;
export const defaultFirstPaymentDate = moduleExports.defaultFirstPaymentDate;
export const monthLabel = moduleExports.monthLabel;
export const addDaysISO = moduleExports.addDaysISO;
export default moduleExports;
