// Proves the engine built from src/ (dist/engine.js) gives exactly the same results as the 56.5 compiled engine
// (assets/js/20-*.js): every output field of runScenario for a fixed set of seeded random scenarios, plus every data
// table and constant the modules export. Usage: node tests/engine-equivalence.mjs [count=3000] [built-file]
// Used while recovering and rewriting modules; once v57 behaviour changes are made, the comparison is limited with
// --only-unchanged (fields named in tests/engine-intended-changes.json are reported separately, not as failures).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from './engine-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const count = +process.argv[2] || 3000;
const built = path.resolve(root, process.argv[3] || 'dist/engine.js');
const orig = loadEngine(path.join(root, 'assets/js', fs.readdirSync(path.join(root, 'assets/js')).find(f => f.startsWith('20-'))));
const next = loadEngine(built);

/* small seeded PRNG so every run checks the same scenarios */
let seed = 20261112; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = a => a[Math.floor(rnd() * a.length)], between = (lo, hi, step = 1) => Math.round((lo + rnd() * (hi - lo)) / step) * step, chance = p => rnd() < p;
const STATES = ['New York', 'New Jersey', 'Connecticut', 'Pennsylvania', 'Florida', 'California', 'Texas', 'Illinois', 'Massachusetts', 'Maryland', 'Ohio', 'Georgia'];
const COUNTIES = ['Nassau', 'Suffolk', 'Westchester', 'Kings', 'Queens', 'Erie', 'Albany', 'Monroe'];

function scenario(D) {
  const s = chance(.1) ? D.blankScenario() : D.defaultScenario();
  s.asOfDate = '2026-11-12'; s.closingDate = '2026-12-31';
  s.loanProgram = pick(['FHA', 'Conventional']); s.renovation = chance(.7); s.transactionType = chance(.85) ? 'Purchase' : 'Refinance';
  s.occupancy = pick(['Primary Residence', 'Primary Residence', 'Second Home', 'Investment']); s.units = pick([1, 1, 1, 2, 3, 4]);
  s.state = pick(STATES); s.nyCounty = pick(COUNTIES); s.isNYC = chance(.15); s.creditScore = between(580, 820);
  s.basePurchasePrice = between(90000, 2200000, 500); s.asIsValue = chance(.6) ? between(s.basePurchasePrice * .8, s.basePurchasePrice * 1.15, 100) : 0;
  s.afterRepairValue = chance(.6) ? between(s.basePurchasePrice * .9, s.basePurchasePrice * 1.6, 100) : 0;
  const dp = pick([.035, .035, .05, .1, .15, .2, .25, .3]); s.baseDownPaymentPct = dp; s.finalDownPaymentPct = dp;
  s.concessionInputMode = pick(['percent', 'dollar']); s.sellerConcessionPct = pick([0, 0, .01, .03, .06, .09]); s.sellerConcessionAmount = between(0, 40000, 50); s.concessionIncreasesPrice = chance(.3);
  s.interestRate = pick([0, .0525, .06, .06875, .0725, .0799]); s.termYears = pick([15, 20, 30, 30]);
  s.propertyTaxAmount = chance(.8) ? between(1500, 30000, 10) : between(100, 2500, 5); s.propertyTaxBasis = pick(['Annual', 'Annual', 'Monthly']);
  s.insuranceAmount = between(600, 6000, 10); s.insuranceBasis = pick(['Annual', 'Monthly']); s.hoaMonthly = chance(.3) ? between(50, 900, 5) : 0;
  s.taxInsuranceOverrideMonthly = chance(.1) ? between(200, 3000) : 0; s.fhaMipOverrideRate = chance(.1) ? pick([.0015, .005, .0055, .0075]) : 0; s.pmiOverrideRate = chance(.1) ? pick([.002, .005, .0075, .011]) : 0;
  s.paymentRoundingIncrement = pick([1, 10, 25, 50, 100]); s.ufmipRate = pick([.0175, .0175, .0225]);
  const r = s.reno; r.baseCost = between(0, 250000, 100); r.contingencyPct = pick([0, .1, .15, .2]); r.utilitiesOff = chance(.2); r.architectural = chance(.3) ? between(0, 8000) : 0;
  r.consultant = chance(.5) ? between(500, 4000) : 0; r.permits = chance(.4) ? between(0, 6000) : 0; r.feasibilityOther = chance(.2) ? between(0, 3000) : 0; r.otherFinanceable = chance(.2) ? between(0, 5000) : 0;
  r.supplementalOriginationOverride = chance(.15) ? between(350, 3000) : 0; r.discountPointsRehabPct = chance(.15) ? pick([.005, .01, .02]) : 0; r.paymentReserveMonths = pick([0, 0, 0, 1, 3, 6, 8]);
  r.energyImprovements = chance(.1) ? between(0, 9000) : 0; r.syncDrawFees = chance(.5); r.inspectionFees = between(0, 2500); r.titleUpdateFees = between(0, 600);
  const d = s.draws; d.manualOverride = chance(.4); d.manualDrawCount = between(0, 14); d.inspectionFeePerDraw = pick([150, 200, 375]); d.titleFeePerDraw = pick([0, 75, 125]); d.initialMaterialRelease = chance(.2) ? between(0, 20000) : 0;
  s.closing.originationPointsPct = pick([0, 0, .005, .01]); s.closing.earnestMoneyDeposit = chance(.7) ? between(0, 50000, 100) : 0; s.closing.taxPickupMonths = pick([2, 3, 6]); s.closing.insurancePickupMonths = pick([12, 14]);
  s.assets.liquidAssets = chance(.7) ? between(0, 300000, 100) : 0; s.assets.retirementOtherAssets = chance(.4) ? between(0, 400000, 100) : 0; s.assets.giftFunds = chance(.2) ? between(0, 60000, 100) : 0;
  (s.borrowers || []).forEach((b, i) => { b.grossMonthlyIncome = i === 0 || chance(.4) ? between(0, 25000, 10) : 0; b.otherMonthlyIncome = chance(.2) ? between(0, 3000) : 0; b.monthlyDebts = chance(.6) ? between(0, 3500) : 0; });
  const rent = s.rental; ['mainUnit', 'adu', 'unit2', 'unit3', 'unit4'].forEach(k => { if (rent[k]) rent[k].gross = chance(.25) ? between(800, 4500, 25) : 0; });
  rent.includeVacatingRental = chance(.1); rent.vacatingGrossRent = between(0, 3500); rent.vacatingHousingExpense = between(0, 2500);
  s.bps.bps = chance(.3) ? between(0, 300) : s.bps.bps;
  return s;
}
const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' && !isFinite(v)) ? String(v) : v));
function diff(a, b, p = '', out = []) {
  if (out.length > 8) return out;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') { if (a !== b && !(Number.isNaN(a) && Number.isNaN(b))) out.push(`${p || '(root)'}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); return out; }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) diff(a[k], b[k], p ? p + '.' + k : k, out);
  return out;
}

let failures = 0;
/* 1. every exported data table / constant (functions are compared by behaviour below) */
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tools/engine/modules.json'), 'utf8'));
let tables = 0;
for (const m of manifest.modules) {
  const A = orig.require(m.module), Bm = next.require(m.module);
  for (const k of m.exports) { if (typeof A[k] === 'function') { if (typeof Bm[k] !== 'function') { failures++; console.log('MISSING FUNCTION', m.module, k); } continue; }
    tables++; const d = diff(strip(A[k]), strip(Bm[k])); if (d.length) { failures++; console.log('TABLE DIFFERS', m.module + '.' + k, d.slice(0, 3)); } }
}
/* 2. runScenario on seeded random scenarios, both engines, every output field.
   In v57 mode (the built engine has src/core/model/overrides) each scenario is migrated the way a 56.5 file is, and every
   difference must be explained by one of the v57 fixes (docs/v57 D1-D5) under that fix's own condition. */
const v57 = next.modules.includes('src/core/model/overrides');
const migrate = v57 ? next.require('src/core/model/overrides').migrate56Inputs : (x => x);
const runA = orig.require('src/core/calc/engine').runScenario, runB = next.require('src/core/calc/engine').runScenario;
const DA = orig.require('src/core/defaults'), DB = next.require('src/core/defaults');
let shown = 0, errorsBoth = 0; const explained = {D1: 0, D2: 0, D4: 0, D5: 0, cashBack: 0};
const pathsOf = (a, b) => { const out = []; (function walk(x, y, p) { if (out.length > 400) return; if (typeof x !== typeof y || x === null || y === null || typeof x !== 'object') { if (x !== y && !(Number.isNaN(x) && Number.isNaN(y))) out.push(p); return; } for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], p ? p + '.' + k : k); })(a, b, ''); return out; };
function unexplained(a, b, sb) {
  const paths = pathsOf(a, b); if (!paths.length) return [];
  const L = b.loan, C = b.cash, gap = L.additionalFundsRequired > 0, credit = C.sellerConcessionUnused > 0, back = C.deficit > 0;
  const assetsBlank = ['liquidAssets', 'retirementOtherAssets', 'giftFunds'].every(k => sb.assets[k] === null || sb.assets[k] === undefined);
  const cashChanged = paths.some(p => p.startsWith('cash.'));
  if (gap) explained.D1++; if (credit) explained.D2++; if (back) explained.cashBack++;
  const lastDraw = (b.renovationOut.drawSchedule || []).length - 1;
  return paths.filter(p => {
    if (p === 'loan.additionalFundsRequired' || p === 'loan.additionalFundsReasons' || p.startsWith('loan.additionalFundsReasons.')) return false;           // D1 new fields
    /* the credit cap also applies to the low / high / outside-NY versions, each against its own closing-cost figure */
    const variant = {'cash.cashToCloseLow': b.closing.buyerClosingCostsLow, 'cash.cashToCloseHigh': b.closing.buyerClosingCostsHigh, 'cash.cashToCloseOutsideNy': b.closing.estimateOutsideNewYork}[p];
    if (variant !== undefined && C.sellerConcessionAllowed > variant) { explained.D2++; return false; }
    if (p.startsWith('cash.')) return !(gap || credit || back || /^cash\.(additionalFundsRequired|sellerConcession(Requested|Allowed|Unused)|creditNotes)/.test(p) || /^cash\.(sellerConcessionApplied|deficit)$/.test(p));  // D1 / D2
    /* the final draw absorbs the rounding of the others: up to half a cent per draw, at most 12 draws */
    if (p.startsWith('renovationOut.drawSchedule.')) { const m = p.match(/drawSchedule\.(\d+)\.(\w+)/); if (m && +m[1] === lastDraw && /releaseAmount|cumulativeRelease|remainingHoldback/.test(m[2]) && Math.abs(getP(a, p) - getP(b, p)) <= 0.0651) { explained.D4++; return false; } return true; }
    if (p.startsWith('aus.')) { if (assetsBlank) explained.D5++; return !(cashChanged || assetsBlank); }                                                       // reserves follow cash to close, or D5
    if (p.startsWith('mmw.')) return !(cashChanged || gap);                                                                                                       // worksheet shows cash to close
    if (p.startsWith('traces.') || p.startsWith('warnings.')) return false;                                                                                       // wording follows the changes above
    return true;
  });
}
const getP = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
for (let i = 0; i < count; i++) {
  const s0 = seed; const sa = scenario(DA); seed = s0; const sb = migrate(scenario(DB));
  let a, b, ea, eb;
  try { a = strip(runA(sa)); } catch (e) { ea = e.message; }
  try { b = strip(runB(sb)); } catch (e) { eb = e.message; }
  if (ea || eb) { if (ea !== eb) { failures++; if (shown++ < 5) console.log(`scenario ${i}: error mismatch`, ea, '|', eb); } else errorsBoth++; continue; }
  if (!v57) { const d = diff(a, b); if (d.length) { failures++; if (shown++ < 5) console.log(`scenario ${i} differs:`, d.slice(0, 4)); } continue; }
  const u = unexplained(a, b, sb); if (u.length) { failures++; if (shown++ < 5) console.log(`scenario ${i}: unexplained differences`, u.slice(0, 5).map(p => `${p}: ${JSON.stringify(getP(a, p))} vs ${JSON.stringify(getP(b, p))}`)); }
}
/* 3. the store: a scenario saved, edited and reloaded behaves the same */
const SA = orig.require('src/state/store'), SB = next.require('src/state/store');
const sa1 = SA.newSavedScenario(DA.defaultScenario()), sb1 = SB.newSavedScenario(DB.defaultScenario());
const norm = x => JSON.parse(JSON.stringify(x).replace(/"\d{4}-\d{2}-\d{2}T[^"]+"/g, '"<time>"').replace(/"a-\d{10,}"/g, '"<audit-id>"'));
if (v57) sa1.inputs = migrate(sa1.inputs);
const sd = diff(norm(sa1), norm(sb1)); if (sd.length) { failures++; console.log('newSavedScenario differs', sd); }

console.log(`${tables} data tables/constants compared, ${count} random scenarios run through both engines (${errorsBoth} raised the same error in both), store checked: ${failures ? failures + ' DIFFERENCES' : v57 ? 'every difference explained by a v57 fix' : 'identical'}`);
if (v57) console.log(`v57 fixes exercised: unfinanced cost in ${explained.D1} scenarios, unused seller credit in ${explained.D2}, deposit refunded in ${explained.cashBack}, last-draw cent adjustments ${explained.D4}, blank assets in ${explained.D5} reserve checks`);
process.exit(failures ? 1 : 0);
