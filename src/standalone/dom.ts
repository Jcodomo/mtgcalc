// Recovered from the 56.5 compiled engine: AMD module "src/standalone/dom".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = {  };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/standalone/dom: undeclared runtime require of ' + name); };
(function (e, t) {"use strict";function append(e,t){for(const n of t)null!=n&&!1!==n&&e.appendChild("object"==typeof n?n:document.createTextNode(String(n)))}Object.defineProperty(t,"__esModule",{value:!0}),t.h=function h(e,t={},...n){const a=document.createElement(e);for(const[e,n]of Object.entries(t))null!=n&&!1!==n&&("class"===e?a.className=String(n):"style"===e?a.setAttribute("style",String(n)):e.startsWith("on")&&"function"==typeof n?a.addEventListener(e.slice(2).toLowerCase(),n):"value"===e?a.value=String(n):"checked"===e?a.checked=Boolean(n):"disabled"===e?a.disabled=Boolean(n):a.setAttribute(e,String(n)));return append(a,n),a},t.append=append,t.clear=function clear(e){if(e.replaceChildren)return void e.replaceChildren();for(;e.firstChild;){const t=e.firstChild;t.parentNode===e&&e.removeChild(t)}},t.qs=function qs(e,t=document){return t.querySelector(e)}})(requireDep, moduleExports);

export const h = moduleExports.h;
export const append = moduleExports.append;
export const clear = moduleExports.clear;
export const qs = moduleExports.qs;
export default moduleExports;
