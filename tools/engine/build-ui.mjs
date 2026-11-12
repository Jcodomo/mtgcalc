// Builds the v57 quote screen (src/ui57 + the engine and scenario model it imports) into one script, assets/v57/quote.js.
// The built file is committed so the site still needs no build step to serve; `npm test` checks it is current.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const check = process.argv.includes('--check');
/* the standalone preview page, and the screen embedded in the Full Suite (which uses the suite's own store and calculation) */
const TARGETS = [['main.ts', 'quote.js'], ['embed.ts', 'quote-embed.js']];
let stale = false;
for (const [entry, file] of TARGETS) {
  const out = path.join(root, 'assets', 'v57', file);
  const r = await build({ entryPoints: [path.join(root, 'src', 'ui57', entry)], bundle: true, format: 'iife', target: 'es2020', minify: true, legalComments: 'none', write: false, logLevel: 'error' });
  const code = '/* Mortgage Suite v57 quote screen - built from src/ui57/' + entry + ' by tools/engine/build-ui.mjs; do not edit */\n' + r.outputFiles[0].text;
  if (check) {
    let cur = ''; try { cur = readFileSync(out, 'utf8'); } catch { /* missing */ }
    if (cur.replace(/\r\n/g, '\n') !== code) { console.error('assets/v57/' + file + ' is out of date - run npm run build:ui and commit it'); stale = true; }
    else console.log('assets/v57/' + file + ' is current (' + Math.round(code.length / 1024) + ' KB)');
  } else { mkdirSync(path.dirname(out), { recursive: true }); writeFileSync(out, code); console.log('built assets/v57/' + file + ' (' + Math.round(code.length / 1024) + ' KB)'); }
}
if (stale) process.exit(1);
