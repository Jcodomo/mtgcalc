// Builds guidelines.html (Guideline search) from the Guideline Lookup app (github.com/Jcodomo/guideline-lookup).
// Usage: node tools/guidelines-sync.mjs <path to a guideline-lookup checkout>
// The search, the guide copies and the settings are the app's own; this adds the Mortgage Suite dock, the Ctrl+K
// search and the page transitions, and serves the guide data from assets/guidelines/. Re-run it after the app's
// refresh.bat has rebuilt the guide copies.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const src = process.argv[2];
if (!src || !fs.existsSync(path.join(src, 'index.html'))) { console.error('usage: node tools/guidelines-sync.mjs <guideline-lookup folder>'); process.exit(1); }
const VER = '57.31';

const outData = path.join(root, 'assets/guidelines');
fs.mkdirSync(outData, {recursive: true});
let built = '';
for (const f of ['fannie', 'freddie', 'fha', 'curated', 'changes', 'semantic', 'minilm']) {
  if (!fs.existsSync(path.join(src, 'data', f + '.js'))) continue;
  const js = fs.readFileSync(path.join(src, 'data', f + '.js'), 'utf8');
  const m = js.match(/"built":\s*"([\d-]+)"/); if (m && m[1] > built) built = m[1];
  fs.writeFileSync(path.join(outData, f + '.js'), js);
}

let s = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const R = (a, b) => { if (s.split(a).length !== 2) throw new Error('expected exactly once: ' + a.slice(0, 80)); s = s.replace(a, b); };
R('<title>Guideline Lookup</title>', '<title>Guidelines · Mortgage Suite</title>');
R('<meta name="color-scheme" content="light dark">', '<meta name="color-scheme" content="light dark">\n<link rel="stylesheet" href="assets/mt-motion.css?v=' + VER + '">');
for (const f of ['fannie', 'freddie', 'changes', 'fha', 'curated']) R('<script src="data/' + f + '.js"></script>', '<script src="assets/guidelines/' + f + '.js?v=' + built + '"></script>');
R('<span class="sub">Fannie Mae &middot; Freddie Mac &middot; FHA &middot; VA &middot; instant, offline-first</span>',
  '<span class="sub">Fannie Mae &middot; Freddie Mac &middot; FHA &middot; VA &middot; searched on this computer, nothing is sent</span>');
// the dock and Ctrl+K search of the rest of the suite
s = s.replace(/<\/body>\s*<\/html>\s*$/, '<script src="assets/workflow-ui.js?v=' + VER + '"></script>\n<script src="assets/mt-search.js?v=' + VER + '"></script>\n</body>\n</html>\n');
if (!/workflow-ui\.js/.test(s)) throw new Error('could not add the dock');
R('<html lang="en">', '<html lang="en">\n<!-- Built by tools/guidelines-sync.mjs from Guideline Lookup (github.com/Jcodomo/guideline-lookup). Edit the app there, then re-run the tool. -->');
fs.writeFileSync(path.join(root, 'guidelines.html'), s);
console.log('guidelines.html written; guide data built ' + built);
