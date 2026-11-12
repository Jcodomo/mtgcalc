// Recovered from the 56.5 compiled engine: AMD module "src/core/calc/program".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = {  };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/core/calc/program: undeclared runtime require of ' + name); };
(function (e, t) {"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.calculateProgram=function calculateProgram(e,t){const n="FHA"===e,a=n?t?"FHA_203K":"FHA_PURCHASE":t?"CONV_HOMESTYLE":"CONV_PURCHASE";return{code:a,label:{FHA_203K:"FHA 203(k)",FHA_PURCHASE:"FHA Purchase",CONV_HOMESTYLE:"Conventional HomeStyle",CONV_PURCHASE:"Conventional Purchase"}[a],isFha:n,renovationActive:t,fhaLimitsEnabled:n,ufmipEnabled:n,fhaMipEnabled:n,pmiEnabled:!n,renovationProgramLabel:t?n?"203(k)":"HomeStyle":"No Renovation"}}})(requireDep, moduleExports);

export const calculateProgram = moduleExports.calculateProgram;
export default moduleExports;
