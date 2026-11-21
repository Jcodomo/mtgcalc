// 57.23 same-business recognition (assets/mt-bizid.js): name variants of one business must match (case, punctuation,
// LLC / Inc / Corp, "&" and "and", a typo, a dropped word), different businesses must not, the EIN decides when both
// documents carry one, and the tax year and name are read from generated forms of every kind.
// Run: node tests/bizid-matrix.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {}, console, Date };
vm.createContext(ctx);
vm.runInContext(readFileSync(path.join(root, 'assets/mt-bizid.js'), 'utf8'), ctx);
const B = ctx.window.MTBizId;

let seed = 57230777;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const fails = {}; let n = 0, pass = 0;
const ok = (name, cond, detail) => { n++; if (cond) { pass++; return; } (fails[name] = fails[name] || []).push(detail); };

const NAMES = ['Bright Path Consulting LLC', 'Hudson Valley Plumbing Inc', 'Maple & Oak Design Co', 'Summit Ridge Partners LP', 'Northstar Logistics Corp',
  'Coastal Dental Group PLLC', 'Greenleaf Landscaping', 'Atlas Roofing & Siding LLC', 'Riverside Family Medicine PC', 'Blue Harbor Seafood Company',
  'Keystone Electrical Contractors Inc', 'Pinecrest Realty Group', 'Silver Spoon Catering LLC', 'Ironwood Fitness Studio', 'Lakeshore Auto Repair Inc',
  'Golden Gate Imports Ltd', 'Redwood Analytics Corporation', 'Sunrise Daycare Center LLC', 'Prairie Wind Farms LLP', 'Metro Express Courier Inc',
  'Harbor View Dental PLLC', 'Hudson Valley Electric Inc', 'Summit Ridge Plumbing LLC', 'Bright Path Tutoring LLC', 'Northstar Freight Inc',
  'Oak Street Bakery', 'Elm Street Bakery', 'Acme Widgets Inc', 'Apex Widgets Inc', 'Johnson & Sons Construction', 'Johnson Brothers Construction'];
const variants = (nm) => {
  const core = nm.replace(/\s+(LLC|Inc|Co|LP|Corp|PLLC|PC|Company|Ltd|Corporation|LLP)$/, '');
  const out = [nm, nm.toUpperCase(), nm.toLowerCase(), core, core.toUpperCase(), nm.replace(/LLC$/, 'L.L.C.').replace(/Inc$/, 'Inc.').replace(/Corp$/, 'Corporation'),
    nm.replace(/&/g, 'and'), nm.replace(/ and /g, ' & '), nm.replace(/,?\s+(LLC|Inc|Corp)$/, ', $1'), '  ' + nm + '  ', nm.replace(/\s+/g, '  ')];
  // one typo in a long word
  const w = core.split(' '), i = w.findIndex((x) => x.length >= 6);
  if (i >= 0) { const t = w[i]; w[i] = t.slice(0, 2) + t[3] + t[2] + t.slice(4); out.push(w.join(' ')); }
  return out;
};
const id = (name, ein = '') => ({ name, key: B.norm(name), ein });

// 1. every variant of one business matches every other variant
for (const nm of NAMES) { const v = variants(nm); for (const a of v) for (const b of v) ok('variants of one business match', B.same(id(a), id(b)), `"${a}" vs "${b}"`); }
// 2. different businesses never match on name alone
for (let i = 0; i < NAMES.length; i++) for (let j = 0; j < NAMES.length; j++) if (i !== j) {
  const a = pick(variants(NAMES[i])), b = pick(variants(NAMES[j]));
  ok('different businesses do not match', !B.same(id(a), id(b)), `"${a}" vs "${b}"`);
}
// 3. the EIN decides when both carry one
for (let k = 0; k < 400; k++) {
  const nm = pick(NAMES), e1 = `${10 + Math.floor(rnd() * 89)}-${1000000 + Math.floor(rnd() * 8999999)}`, e2 = `${10 + Math.floor(rnd() * 89)}-${1000000 + Math.floor(rnd() * 8999999)}`;
  ok('same EIN matches even when the names differ', B.same(id(nm, e1), id(pick(NAMES), e1)), nm);
  ok('different EINs never match even with the same name', e1 === e2 || !B.same(id(nm, e1), id(nm, e2)), nm);
  ok('one EIN missing falls back to the name', B.same(id(nm, e1), id(pick(variants(nm)), '')), nm);
}
// 4. reading forms: business name, EIN and tax year from generated documents
const money = (v) => Math.round(v).toLocaleString('en-US') + pick(['.', '.00', '']);
const ein = () => `${10 + Math.floor(rnd() * 89)}-${1000000 + Math.floor(rnd() * 8999999)}`;
const forms = {
  schedc: (nm, e, y) => `SCHEDULE C\n(Form 1040)\nProfit or Loss From Business\n(Sole Proprietorship)\n${y}\nDepartment of the Treasury\nInternal Revenue Service\nName of proprietor\nJANE Q SAMPLE\nSocial security number (SSN)\nA Principal business or profession, including product or service (see instructions)\nCONSULTING\nC Business name. If no separate business name, leave blank.\n${nm}\nD Employer ID number (EIN) (see instr.)\n${e}\n1 Gross receipts or sales 1 ${money(200000)}\n31 Net profit or (loss). Subtract line 30 from line 29. 31 ${money(80000)}\nCat. No. 11334P Schedule C (Form 1040) ${y}`,
  k1_1065: (nm, e, y) => `Schedule K-1\n(Form 1065)\n${y}\nPartner's Share of Income, Deductions, Credits, etc.\nPart I Information About the Partnership\nA Partnership's employer identification number\n${e}\nB Partnership's name, address, city, state, and ZIP code\n${nm}\n100 MAIN ST\nALBANY NY 12203\nPart III Partner's Share of Current Year Income\n1 Ordinary business income (loss) ${money(50000)}\nwww.irs.gov/Form1065 Cat. No. 11394R Schedule K-1 (Form 1065) ${y}`,
  k1_1120s: (nm, e, y) => `Schedule K-1\n(Form 1120-S)\n${y}\nShareholder's Share of Income, Deductions, Credits, etc.\nPart I Information About the Corporation\nA Corporation's employer identification number\n${e}\nB Corporation's name, address, city, state, and ZIP code\n${nm}\n22 OAK AVE\nTROY NY 12180\nPart III Shareholder's Share of Current Year Income\n1 Ordinary business income (loss) ${money(90000)}\nCat. No. 11520D Schedule K-1 (Form 1120-S) ${y}`,
  w2: (nm, e, y) => `Form W-2 Wage and Tax Statement ${y}\nOMB No. 1545-0008\nb Employer identification number (EIN)\n${e}\nc Employer's name, address, and ZIP code\n${nm}\n45 RIVER RD\nSPRINGFIELD IL 62701\n1 Wages, tips, other compensation\n${money(85000)}\nCopy B-To Be Filed With Employee's FEDERAL Tax Return. Department of the Treasury - Internal Revenue Service`,
};
const YEARS = [2021, 2022, 2023, 2024, 2025];
for (let k = 0; k < 600; k++) {
  const type = pick(Object.keys(forms)), nm = pick(NAMES).toUpperCase(), e = ein(), y = pick(YEARS);
  const r = B.ident(forms[type](nm, e, y), type);
  ok(`${type}: business name read`, B.same({ name: r.name, key: r.key }, id(nm)), `${nm} -> "${r.name}"`);
  ok(`${type}: EIN read`, r.ein === e, `${e} -> ${r.ein}`);
  ok(`${type}: tax year read`, r.year === y, `${y} -> ${r.year}`);
}
// 5. grouping a pile of documents: two or three years of each business land in one group each
for (let k = 0; k < 300; k++) {
  const biz = [...NAMES].sort(() => rnd() - 0.5).slice(0, 2 + Math.floor(rnd() * 3));
  const docs = [];
  biz.forEach((nm, bi) => { const e = rnd() < 0.5 ? ein() : ''; const yrs = 2 + Math.floor(rnd() * 2); for (let t = 0; t < yrs; t++) docs.push({ bi, ident: id(pick(variants(nm)), rnd() < 0.5 ? e : '') }); });
  docs.sort(() => rnd() - 0.5);
  const g = B.group(docs, (d) => d.ident);
  const pure = g.every((x) => new Set(x.items.map((d) => d.bi)).size === 1);
  ok('grouping: each group holds one business', pure, biz.join(' | '));
  ok('grouping: one group per business', g.length === biz.length, `${biz.length} businesses -> ${g.length} groups: ${g.map((x) => x.ident.name).join(' | ')}`);
}

const names = Object.keys(fails);
for (const k of names) { console.log(`FAIL ${k} (${fails[k].length}x)`); fails[k].slice(0, 6).forEach((d) => console.log('     ' + d)); }
console.log(`\nsame-business recognition: ${n} checks, ${pass} pass, ${n - pass} fail`);
process.exit(names.length ? 1 : 0);
