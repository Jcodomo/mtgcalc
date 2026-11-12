// Recovered from the 56.5 compiled engine: AMD module "src/core/calc/trace".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = {  };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/core/calc/trace: undeclared runtime require of ' + name); };
(function (e, t) {"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.text=t.count=t.pct=t.money=t.TraceCollector=void 0;t.TraceCollector=class TraceCollector{constructor(){this.map={}}add(e){return this.map[e.key]=e,e.result}record(e,t,n,a,r,i={}){return this.add({key:e,label:t,formula:n,inputs:a,result:r,...i})}get(){return this.map}};t.money=(e,t)=>({label:e,value:t,format:"currency"});t.pct=(e,t)=>({label:e,value:t,format:"percent"});t.count=(e,t)=>({label:e,value:t,format:"number"});t.text=(e,t)=>({label:e,value:t,format:"text"})})(requireDep, moduleExports);

export const TraceCollector = moduleExports.TraceCollector;
export const money = moduleExports.money;
export const pct = moduleExports.pct;
export const count = moduleExports.count;
export const text = moduleExports.text;
export default moduleExports;
