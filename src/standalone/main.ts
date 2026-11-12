// Recovered from the 56.5 compiled engine: AMD module "src/standalone/main".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck
import * as dep0 from '../state/store';
import * as dep1 from '../ui/sections';
import * as dep2 from './app';

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = { 'src/state/store': dep0, 'src/ui/sections': dep1, 'src/standalone/app': dep2 };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/standalone/main: undeclared runtime require of ' + name); };
(function (e, t, n, a, r) {"use strict";function boot(){const e=document.getElementById("root");if(!e)return;const t=new n.ScenarioStore,i=new r.App(e,t);window.mortgageSuite={store:t,app:i,sectionIds:a.SECTION_IDS}}Object.defineProperty(t,"__esModule",{value:!0}),"loading"===document.readyState?document.addEventListener("DOMContentLoaded",boot):boot()})(requireDep, moduleExports, dep0, dep1, dep2);

export default moduleExports;
