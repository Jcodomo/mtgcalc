// Recovered from the 56.5 compiled engine: AMD module "src/core/data/meta".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = {  };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/core/data/meta: undeclared runtime require of ' + name); };
(function (e, t) {"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.PLANNING_DISCLAIMER=void 0,t.effectiveRows=function effectiveRows(e,t){return e.filter(e=>!e.meta||!(e.meta.effectiveDate&&e.meta.effectiveDate>t)&&!(e.meta.expirationDate&&e.meta.expirationDate<t))},t.PLANNING_DISCLAIMER="Planning estimate only. The purchase contract and the title/escrow preliminary closing statement are the final authority for transfer tax, mansion tax, mortgage tax, payer responsibility and fee amounts."})(requireDep, moduleExports);

export const PLANNING_DISCLAIMER = moduleExports.PLANNING_DISCLAIMER;
export const effectiveRows = moduleExports.effectiveRows;
export default moduleExports;
