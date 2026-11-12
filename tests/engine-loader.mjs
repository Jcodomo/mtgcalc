// Loads the compiled 56.5 engine (assets/js/20-*.js, AMD modules) into a Node VM so financial cases run against the real code.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function loadEngine(file) {
  const src = readFileSync(file || path.join(root, 'assets/js', readdirSync(path.join(root, 'assets/js')).find(f => f.startsWith('20-'))), 'utf8');
  const defs = {}, cache = {};
  const stubEl = () => ({ addEventListener() {}, appendChild() {}, setAttribute() {}, style: {}, classList: { add() {}, remove() {}, toggle() {} } });
  const ctx = { console, Math, Date, JSON, Intl, Number, String, Object, Array, isFinite, parseFloat, parseInt, setTimeout, clearTimeout,
    document: { readyState: 'complete', getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: stubEl, addEventListener() {}, body: stubEl(), documentElement: stubEl() },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, navigator: { userAgent: 'node' } };
  ctx.window = ctx; ctx.self = ctx;
  ctx.define = (name, deps, factory) => { defs[name] = { deps, factory }; };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'engine.js' });
  const req = name => {
    if (cache[name]) return cache[name];
    const d = defs[name]; if (!d) throw new Error('module not found: ' + name);
    const exports = {}; cache[name] = exports;
    const args = d.deps.map(x => x === 'require' ? req : x === 'exports' ? exports : req(x));
    const r = d.factory.apply(null, args); if (r !== undefined) cache[name] = r;
    return cache[name];
  };
  return { require: req, modules: Object.keys(defs) };
}
