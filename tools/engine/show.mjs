// Prints a recovered module's compiled body, formatted, for reading while rewriting it.
// Usage: node tools/engine/show.mjs src/core/calc/loan.ts [from] [length]
import fs from 'node:fs'; import * as esbuild from 'esbuild';
const [file, from, len] = process.argv.slice(2);
const code = fs.readFileSync(file, 'utf8'); const start = code.indexOf('(function ('); const end = code.indexOf('\nexport ', start);
const r = await esbuild.transform(code.slice(start, end > 0 ? end : undefined), {loader: 'js'});
process.stdout.write(r.code.slice(+from || 0, (+from || 0) + (+len || 1e6)));
