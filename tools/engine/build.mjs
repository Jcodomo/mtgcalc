// Builds src/**/*.ts into one file of named AMD modules - the same module names and dependency lists the 56.5 pages load
// from assets/js/20-*.js - so the engine can be swapped without touching the interface layers.
// Usage: node tools/engine/build.mjs [out-file]   (default dist/engine.js)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tools/engine/modules.json'), 'utf8'));
const out = path.resolve(root, process.argv[2] || 'dist/engine.js');
const tslib = fs.readFileSync(path.join(root, 'src/core/_tslib.ts'), 'utf8');
const helpersDecl = tslib.split('\n').find(l => l.startsWith('var '));

const listTs = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? listTs(path.join(d, e.name)) : e.name.endsWith('.ts') ? [path.join(d, e.name)] : []);
const extra = listTs(path.join(root, 'src')).map(f => path.relative(root, f).split(path.sep).join('/').replace(/\.ts$/, '')).filter(n => n !== 'src/core/_tslib' && !manifest.order.includes(n) && !n.startsWith('src/app/'));
const allModules = [...manifest.order, ...extra.sort()];
const parts = ['/* Mortgage Suite engine - built from src/ by tools/engine/build.mjs. Do not edit; edit src/ and rebuild. */', helpersDecl];
for (const name of allModules) {
  const file = path.join(root, name + '.ts');
  const code = fs.readFileSync(file, 'utf8');
  /* every relative import of this module, resolved to its AMD name */
  const specs = [...code.matchAll(/from\s+'(\.[^']+)'/g)].map(m => m[1]);
  const amd = specs.map(s => path.posix.join(path.posix.dirname(name), s)).map(s => s.replace(/\\/g, '/'));
  const deps = [...new Set(amd.filter(d => d !== 'src/core/_tslib'))];
  const r = await esbuild.transform(code, {loader: 'ts', format: 'cjs', target: 'es2019', sourcefile: name + '.ts', legalComments: 'none'});
  const map = specs.map((s, i) => `${JSON.stringify(s)}: ${amd[i] === 'src/core/_tslib' ? '__tslib' : 'd' + deps.indexOf(amd[i])}`).join(', ');
  parts.push(`define(${JSON.stringify(name)}, ${JSON.stringify(['require', 'exports', ...deps])}, function (__amdRequire, __amdExports${deps.map((d, i) => ', d' + i).join('')}) {
var __tslib = { ${helpersDecl.replace(/^var\s+/, '').match(/(__\w+)=/g).map(h => h.slice(0, -1)).filter((v, i, a) => a.indexOf(v) === i).map(h => `${h}: ${h}`).join(', ')} };
var __deps = { ${map} };
var require = function (p) { if (p in __deps) return __deps[p]; throw new Error(${JSON.stringify(name)} + ': unknown import ' + p); };
var module = { exports: __amdExports }, exports = __amdExports;
${r.code}
return module.exports;
});`);
}
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, parts.join('\n'));
console.log(`built ${allModules.length} modules -> ${path.relative(root, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
