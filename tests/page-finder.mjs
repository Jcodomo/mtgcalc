// Page finder test: the Ctrl+K search (assets/mt-search.js) on its built-in index of pages and document builders,
// run in Node with no page open. Every page and builder is searched by its name, by its name with a typing mistake,
// and by a word only it has; plus everyday searches in a loan officer's shorthand ("dti", "le", "mip", "rehab budget").
// A search passes when the expected page or builder is in the top 3.  Run: node tests/page-finder.mjs [--fails]
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv.find((a) => a.endsWith('.js') && a.includes('mt-search')) || path.join(root, 'assets/mt-search.js');
const stub = { querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, addEventListener() {}, readyState: 'loading', createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), body: { appendChild() {} } };
const ctx = { window: {}, document: stub, location: { pathname: '/nowhere.html', href: '' }, console, setTimeout, clearTimeout, getComputedStyle: () => ({}), performance };
ctx.window.document = stub; vm.createContext(ctx);
vm.runInContext(readFileSync(file, 'utf8'), ctx);
const S = ctx.window.MTSearch;
const key = (e) => e.href || (e.builder ? 'builder:' + e.builder : e.title);

let seed = 777; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const typo = (q) => q.split(' ').map((w) => { if (w.length < 6) return w; const i = 1 + Math.floor(rnd() * (w.length - 2)), t = rnd(); return t < 0.34 ? w.slice(0, i) + w.slice(i + 1) : t < 0.67 ? w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2) : w.slice(0, i) + w[i] + w.slice(i); }).join(' ');

// the built-in index, as the search sees it (one search per entry kind)
const seen = new Map();
for (const q of ['loan', 'suite', 'document', 'builder', 'income', 'calculator', 'page', 'letter', 'estimate', 'tax', 'property', 'guideline', 'renovation', 'escrow', 'quote', 'organizer', 'profit', 'schedule', 'pay', 'gift', 'lease', 'commitment', 'mortgage', 'addendum', 'contractor', 'encompass', 'new', 'transfer', 'cpa', 'explanation', 'summary', 'w-2'])
  for (const e of S.search(q)) if (e.kind === 'Page' || e.kind === 'Document') seen.set(key(e), e);
const entries = [...seen.values()];
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9& -]/g, ' ').replace(/\s+/g, ' ').trim();
const wordsOf = (e) => new Set(norm(e.text || '').split(' '));
const cases = [];
for (const e of entries) {
  const name = norm(e.title.replace(/^Loan Suite - |^Income Calculator - /, '')).replace(/ & /g, ' ');
  cases.push({ q: name, want: key(e), kind: 'name' });
  const t = typo(name); if (t !== name) cases.push({ q: t, want: key(e), kind: 'name, misspelled' });
  const mine = [...wordsOf(e)].filter((w) => w.length >= 5 && !/^\d+$/.test(w) && entries.every((o) => o === e || !wordsOf(o).has(w)));
  if (mine.length) cases.push({ q: mine[Math.floor(rnd() * mine.length)], want: key(e), kind: 'own word' });
}
const ask = [
  ['dti', 'loan-suite-qualify.html'], ['debt to income', 'loan-suite-qualify.html'], ['mip', 'loan-suite-advanced.html'], ['pmi override', 'loan-suite-advanced.html'],
  ['le', 'loan-suite-draft-le.html'], ['draft loan estimate', 'loan-suite-draft-le.html'], ['rehab budget', 'loan-suite-renovation.html'], ['203k contingency', 'loan-suite-renovation.html'],
  ['1003', 'loan-suite-encompass.html'], ['urla', 'loan-suite-encompass.html'], ['escrow cushion', 'loan-suite-escrow.html'], ['aggregate escrow', 'loan-suite-escrow.html'],
  ['mansion tax', 'loan-suite-taxes-proration.html'], ['transfer tax calc', 'loan-suite-taxes-proration.html'], ['closing cost fees', 'loan-suite-closing-costs.html'],
  ['todays rates', 'loan-suite-mortgage-rates.html'], ['mortgage news daily', 'loan-suite-mortgage-rates.html'], ['max mortgage worksheet', 'loan-suite-max-mortgage.html'],
  ['arv after repair value', 'loan-suite-property.html'], ['compare scenarios', 'loan-suite-scenarios.html'], ['adu rental income', 'loan-suite-rental.html'],
  ['tradelines', 'loan-suite-credit.html'], ['fico', 'loan-suite-credit.html'], ['self employed income', 'income-calculator.html'], ['schedule c income', 'income-calculator.html#tab=schc'],
  ['k-1 partnership', 'income-calculator.html#tab=corp'], ['rental schedule e', 'income-calculator.html#tab=sche'], ['va residual income', 'income-calculator.html#tab=va'],
  ['asset depletion', 'income-calculator.html#tab=assets'], ['ocr paystub', 'income-calculator.html#tab=docs'], ['aus findings du', 'income-calculator.html#tab=aus'],
  ['fannie guidelines search', 'guidelines.html'], ['hud 4000.1', 'guidelines.html'], ['whats new', 'changelog.html'], ['release notes', 'changelog.html'],
  ['rename documents', 'doc-organizer.html'], ['p&l', 'builder:pl'], ['paystub', 'builder:pay'], ['gift letter', 'builder:gift'], ['contractor bid', 'builder:estimate'],
  ['lease agreement', 'builder:lease'], ['commitment conditions', 'builder:commit'],
  ['where do i enter the escrow cushion', 'loan-suite-escrow.html'], ['how much is the transfer tax', 'loan-suite-taxes-proration.html'], ['calculate my dti', 'loan-suite-qualify.html'],
  ['renovaton budget', 'loan-suite-renovation.html'], ['escrw cushion', 'loan-suite-escrow.html'], ['clsoing costs', 'loan-suite-closing-costs.html'], ['guidlines', 'guidelines.html'],
  ['encompas', 'loan-suite-encompass.html'], ['scenaros', 'loan-suite-scenarios.html'], ['morgage rates', 'loan-suite-mortgage-rates.html'], ['ammortization', null],
];
for (const [q, w] of ask) if (w) cases.push({ q, want: w, kind: 'shorthand and plain English' });
const kinds = {}, fails = []; let ok = 0; const t0 = performance.now();
for (const c of cases) {
  const top = S.search(c.q).slice(0, 3).map(key), hit = top.includes(c.want);
  const K = kinds[c.kind] || (kinds[c.kind] = { n: 0, ok: 0 }); K.n++; if (hit) { K.ok++; ok++; } else fails.push(`${c.kind}: "${c.q}" wants ${c.want}, got ${top.join(' | ') || 'nothing'}`);
}
const ms = (performance.now() - t0) / cases.length;
for (const [k, v] of Object.entries(kinds)) console.log(`  ${k.padEnd(28)} ${v.ok}/${v.n}`);
console.log(`page finder: ${ok}/${cases.length} found in the top 3 (${(100 * ok / cases.length).toFixed(1)}%), ${ms.toFixed(2)} ms per search, ${entries.length} pages and builders`);
if (process.argv.includes('--fails')) fails.forEach((f) => console.log('MISS ' + f));
process.exitCode = ok / cases.length >= 0.95 ? 0 : 1;
