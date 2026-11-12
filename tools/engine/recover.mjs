// One-time recovery of the 56.5 engine (assets/js/20-*.js, compiled TypeScript in AMD form) into src/*.ts.
// Each module's compiled body is kept exactly as it was, inside a function that receives its dependencies, so behaviour
// cannot change. Readable rewrites then replace modules one at a time (see docs/v57/engine.md), each proven identical by
// tests/engine-equivalence.mjs before any behaviour change.   Usage: node tools/engine/recover.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../../tests/engine-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const srcFile = path.join(root, 'assets/js', fs.readdirSync(path.join(root, 'assets/js')).find(f => f.startsWith('20-')));
const text = fs.readFileSync(srcFile, 'utf8');

/* the TypeScript emit helpers at the top of the bundle (__createBinding, __importStar, …) */
const firstDefine = text.indexOf('define(');
const helpers = text.slice(0, firstDefine).replace(/;\s*$/, '');
const helperNames = [...helpers.matchAll(/(?:^|,)\s*(__\w+)=/g)].map(m => m[1]);

const mods = [];
new Function('define', text.slice(firstDefine))((name, deps, factory) => mods.push({name, deps, factory: factory.toString()}));
const engine = loadEngine(srcFile);

const rel = (from, to) => { let r = path.posix.relative(path.posix.dirname(from), to); return r.startsWith('.') ? r : './' + r; };
const outDir = path.join(root, 'src');
if (fs.existsSync(path.join(outDir, 'core/calc/engine.ts')) && !process.argv.includes('--force')) { console.error('src/ already recovered - pass --force to overwrite'); process.exit(1); }

fs.mkdirSync(path.join(outDir, 'core'), {recursive: true});
fs.writeFileSync(path.join(outDir, 'core/_tslib.ts'),
  '// TypeScript emit helpers from the 56.5 compiled engine, kept for the recovered modules that use them.\n// @ts-nocheck\n' +
  'var ' + helpers.replace(/^var\s+/, '') + ';\nexport { ' + helperNames.join(', ') + ' };\n');

const manifest = [];
for (const m of mods) {
  const file = m.name + '.ts', params = m.factory.match(/^function\s*\(([^)]*)\)/)[1].split(',').map(s => s.trim()).filter(Boolean);
  const body = m.factory.replace(/^function\s*\([^)]*\)\s*\{/, '').replace(/\}\s*$/, '');
  const deps = m.deps.filter(d => d !== 'require' && d !== 'exports');
  const usesHelpers = helperNames.filter(h => body.includes(h));
  const exportsObj = engine.require(m.name);
  const names = Object.keys(exportsObj).filter(k => k !== '__esModule' && /^[A-Za-z_$][\w$]*$/.test(k));
  const imports = deps.map((d, i) => `import * as dep${i} from '${rel(m.name, d)}';`);
  if (usesHelpers.length) imports.unshift(`import { ${usesHelpers.join(', ')} } from '${rel(m.name, 'src/core/_tslib')}';`);
  const args = m.deps.map(d => d === 'require' ? 'requireDep' : d === 'exports' ? 'moduleExports' : 'dep' + deps.indexOf(d));
  const ts = [
    `// Recovered from the 56.5 compiled engine: AMD module "${m.name}".`,
    `// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.`,
    `// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.`,
    `// @ts-nocheck`,
    ...imports,
    ``,
    `const moduleExports: Record<string, any> = {};`,
    `const declared: Record<string, unknown> = { ${deps.map((d, i) => `'${d}': dep${i}`).join(', ')} };`,
    `const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('${m.name}: undeclared runtime require of ' + name); };`,
    `(function (${params.join(', ')}) {${body}})(${args.slice(0, params.length).join(', ')});`,
    ``,
    ...names.map(n => `export const ${n} = moduleExports.${n};`),
    `export default moduleExports;`,
    ``];
  fs.mkdirSync(path.dirname(path.join(outDir, file.replace(/^src\//, ''))), {recursive: true});
  fs.writeFileSync(path.join(outDir, file.replace(/^src\//, '')), ts.join('\n'));
  manifest.push({module: m.name, file: 'src/' + file.replace(/^src\//, ''), deps, exports: names, recoveredFrom: path.basename(srcFile)});
}
fs.writeFileSync(path.join(root, 'tools/engine/modules.json'), JSON.stringify({source: path.basename(srcFile), order: mods.map(m => m.name), modules: manifest}, null, 2));
console.log(`recovered ${mods.length} modules into src/ (${helperNames.length} TypeScript helpers); manifest tools/engine/modules.json`);
