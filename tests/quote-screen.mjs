// v57 quote screen logic, without a browser: every field points at a real input, override fields follow the blank/zero rules,
// the checks never report a missing figure as passed, and the summary shows exactly what the engine calculated.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist', 'quote-screen-test.mjs');
mkdirSync(path.dirname(out), { recursive: true });
await build({ stdin: { contents: `export * from './src/ui57/fields'; export * from './src/ui57/review'; export { defaultScenario } from './src/core/defaults'; export { runScenario } from './src/core/calc/engine'; export { OVERRIDE_FIELDS, ASSET_FIELDS } from './src/core/model/overrides';`, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const Q = await import(pathToFileURL(out).href);

const results = [], check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
const base = () => Q.defaultScenario('2026-11-12', 'test');
const run = i => Q.runScenario(i);

/* fields */
{
  const d = base(), missing = Q.FIELDS.filter(f => Q.getPath(d, f.path) === undefined).map(f => f.path);
  check('every field points at a scenario input', !missing.length, missing.join(', '));
  const ids = Q.FIELDS.map(f => f.id); check('field ids are unique', new Set(ids).size === ids.length);
  const engineOverrides = new Set([...Q.OVERRIDE_FIELDS.map(f => f.path), ...Q.ASSET_FIELDS]), notDeclared = Q.FIELDS.filter(f => f.override && !engineOverrides.has(f.path) && !/^closing\.overrides\./.test(f.path)).map(f => f.path);
  check('every blank-means-calculate field is one the engine treats that way', !notDeclared.length, notDeclared.join(', '));
  const simple = Q.FIELDS.filter(Q.isSimple).map(f => f.path), spec = ['basePurchasePrice', 'propertyAddress', 'occupancy', 'units', 'loanProgram', 'renovationScope', 'reno.baseCost', 'reno.contingencyPct', 'reno.paymentReserveMonths', 'finalDownPaymentPct', 'interestRate', 'termYears', 'propertyTaxAmount', 'insuranceAmount', 'hoaMonthly', 'fhaMipOverrideRate', 'pmiOverrideRate', 'sellerConcessionPct', 'closing.earnestMoneyDeposit', 'assets.liquidAssets', 'afterRepairValue'];
  const absent = spec.filter(p => !simple.includes(p)); check('every Simple input the spec lists (item 7) is a Simple field', !absent.length, absent.join(', '));
  const badGroup = Q.FIELDS.filter(f => f.group && !Q.GROUPS.includes(f.group)).map(f => f.id); check('every Advanced field belongs to a named purpose group', !badGroup.length, badGroup.join(', '));
  const units = Q.FIELDS.filter(f => (f.kind === 'money' || f.kind === 'pct') && !f.unit).map(f => f.id); check('every dollar and percent field shows its unit', !units.length, units.join(', '));
}

/* checks: nothing missing is reported as passed */
{
  const i = base(), o = run(i), C = Q.checks(i, o), get = id => C.find(c => c.id === id);
  check('no income: DTI is Not entered, not 0% pass', get('dti').status === 'missing');
  check('no assets: funds and reserves are Not entered', get('funds').status === 'missing' && get('reserves').status === 'missing');
  check('renovation with no ARV: ARV is Not entered', get('arv').status === 'missing');
  check('no seller credit: Not applicable', get('credit').status === 'na');
  const s = Q.summary(i, o); check('summary DTI reads Not entered without income', s.primary.find(f => f.id === 'dti').value === 'Not entered');
}
{
  const i = base(); i.borrowers[0].grossMonthlyIncome = 15000; i.borrowers[0].monthlyDebts = 600; i.assets.liquidAssets = 90000; i.afterRepairValue = 650000;
  const o = run(i), C = Q.checks(i, o), get = id => C.find(c => c.id === id);
  check('income entered: DTI pass or fail matches the engine', get('dti').status === (o.aus.overallDti === 'PASS' ? 'pass' : 'fail'));
  check('assets entered: funds to close matches the engine', get('funds').status === (o.aus.assetsRemainingAfterClosing >= 0 ? 'pass' : 'fail'));
  check('ARV entered: value check follows the cushion', get('arv').status === (o.value.valueCushion >= 0 ? 'pass' : 'fail'));
  const s = Q.summary(i, o), fig = id => s.primary.concat(s.more).find(f => f.id === id).value, money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  check('summary payment, loan and cash are the engine figures to the cent', fig('payment') === money(o.payment.totalMonthlyPayment) && fig('loan') === money(o.loan.totalLoan) && fig('cash') === money(o.cash.cashToClose), [fig('payment'), fig('loan'), fig('cash')].join(' '));
}
{
  /* a funding gap is reviewed and sits in cash to close; an unusable credit is reviewed, not cash back */
  const i = base(); i.asIsValue = 400000; i.basePurchasePrice = 500000; i.afterRepairValue = 520000; i.sellerConcessionPct = 0.06;
  const o = run(i), C = Q.checks(i, o), gap = C.find(c => c.id === 'gap'), credit = C.find(c => c.id === 'credit');
  check('funding gap: Review needed, amount and reasons shown, included in cash to close', gap.status === 'review' && o.loan.additionalFundsRequired > 0 && /included in cash to close/.test(gap.detail) && o.cash.additionalFundsRequired === o.loan.additionalFundsRequired, gap.detail.slice(0, 120));
  check('seller credit over what can be used: Review needed with requested / allowed / applied / unused', credit.status === (o.cash.sellerConcessionUnused > 0 || o.purchase.sellerConcessionOverLimit > 0 ? 'review' : 'pass') && /Requested|applied/.test(credit.detail));
}
{
  /* FHA MIP 0 is rejected (the engine keeps the calculated rate); PMI 0 is honored */
  const i = base(); i.fhaMipOverrideRate = 0; const o = run(i), C = Q.checks(i, o);
  check('FHA MIP 0: a Fail item explains it, the calculated rate is used', o.payment.fhaMipRateUsed > 0 && C.some(c => c.status === 'fail' && /MIP/.test(c.title)));
  const A = Q.assumptions(i, o, base()); check('FHA MIP 0 is listed under Assumptions in use', A.some(a => /FHA annual MIP overridden/.test(a.text)));
  const c = base(); c.loanProgram = 'Conventional'; c.finalDownPaymentPct = 0.05; c.pmiOverrideRate = 0; const oc = run(c);
  check('PMI 0 on Conventional: no PMI is charged', oc.payment.monthlyPmi === 0);
}
{
  /* renovation off: costs leave the loan, the budget stays for later and is listed */
  const i = base(), on = run(i); i.renovation = false; const off = run(i), A = Q.assumptions(i, off, base());
  check('renovation off: renovation leaves the loan and payment', off.loan.totalLoan < on.loan.totalLoan && off.payment.totalMonthlyPayment < on.payment.totalMonthlyPayment && !off.renovationOut.active);
  check('renovation off: the kept budget is listed as not counted', A.some(a => a.kind === 'inactive' && /kept but not counted/.test(a.text)));
}

const w = Math.max(...results.map(r => r.name.length));
for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name.padEnd(w) + (r.ok || !r.detail ? '' : '   ' + r.detail));
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length} checks: ${results.length - failed} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
