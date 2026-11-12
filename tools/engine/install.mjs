// v57 phase 5: puts the engine built from src/ into the Full Suite source, in place of the 56.5 compiled engine.
// The page source keeps the engine as one inline script; tools/decompile.py turns it into assets/js/20-createbinding-*.js
// (the name comes from the script's first characters, which stay the same), so every page picks it up on the next build.
// Usage: node tools/engine/install.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const page = path.join(root, 'tools/source/full-suite.html');
const built = path.join(root, 'dist/engine.js');
execFileSync(process.execPath, [path.join(root, 'tools/engine/build.mjs'), built], { stdio: 'ignore' });
const src = fs.readFileSync(built, 'utf8').replace(/^\/\*[^\n]*\*\/\n/, '');
const min = (await esbuild.transform(src, { minify: true, target: 'es2019', legalComments: 'none' })).code.trim();
if (!min.startsWith('var __createBinding=')) throw new Error('the built engine must start with the __createBinding helper so its file keeps its name');
const html = fs.readFileSync(page, 'utf8');
const start = html.indexOf('<script>var __createBinding=');
if (start < 0) throw new Error('engine script not found in tools/source/full-suite.html');
const end = html.indexOf('</script>', start);
const current = html.slice(start + '<script>'.length, end);
if (process.argv.includes('--check')) {
  if (current !== min) { console.error('the Full Suite engine is not the current src/ build - run node tools/engine/install.mjs and rebuild'); process.exit(1); }
  console.log('the Full Suite runs the current src/ engine (' + Math.round(min.length / 1024) + ' KB)');
} else {
  fs.writeFileSync(page, html.slice(0, start + '<script>'.length) + min + html.slice(end));
  console.log('installed the src/ engine in tools/source/full-suite.html (' + Math.round(min.length / 1024) + ' KB, was ' + Math.round(current.length / 1024) + ' KB)');
}
