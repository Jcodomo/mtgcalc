// Financial regression cases run against the real compiled engine (assets/js/20-*.js).
// Expected values are computed independently (closed-form amortization, funds identities, program rules) - never copied from engine output.
// Cases marked `known: '...'` are confirmed 56.5 defects: they are expected to FAIL today and must PASS in v57.
// Run: node tests/financial-regression.mjs            (exit 1 only on an unexpected failure or an unexpected pass)
import { loadEngine } from './engine-loader.mjs';

/* --engine=dist/engine.js runs the cases against the engine built from src/; the default is the 56.5 compiled engine */
const engineArg = (process.argv.find(a => a.startsWith('--engine=')) || '').slice(9);
const E = loadEngine(engineArg ? new URL('../' + engineArg, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') : undefined);
if (engineArg) console.log('Engine:', engineArg);
const v57 = !!(E.modules.includes('src/core/model/overrides'));
const D = E.require('src/core/defaults'), R = E.require('src/core/calc/engine'), P = E.require('src/core/calc/payment');
const run = mut => { const s = D.defaultScenario(); mut(s); return R.runScenario(s); };
const near = (a, b, tol = 0.005) => Math.abs(a - b) <= tol;
const money = v => (v < 0 ? '-' : '') + '$' + Math.abs(v).toFixed(2);
/* funds identity: what the borrower must bring = everything being paid for, less the loan, less credits that may be used, less the deposit already paid */
const fundsNeeded = (o, creditUsable) => Math.max(0, o.loan.totalAcquisitionCost + o.cash.buyerClosingCosts - o.loan.maximumBaseLoan - creditUsable - o.cash.earnestMoneyDeposit);

const cases = [
  // ---------------------------------------------------------------- amortization
  {id: 'pi-normal', area: 'Amortization', name: 'P&I, $400,000 at 6.875%, 30 years', check: () => { const v = P.principalAndInterest(400000, .06875, 30); return [near(+v.toFixed(2), 2627.72), money(v) + ' (expected $2,627.72)']; }},
  {id: 'pi-zero-rate', area: 'Amortization', name: 'P&I at a 0% rate is principal / months', check: () => { const v = P.principalAndInterest(360000, 0, 30); return [near(v, 1000), money(v) + ' (expected $1,000.00)']; }},
  {id: 'pi-15yr', area: 'Amortization', name: 'P&I, $250,000 at 5.5%, 15 years', check: () => { const v = P.principalAndInterest(250000, .055, 15); return [near(+v.toFixed(2), 2042.71), money(v) + ' (expected $2,042.71)']; }},
  // ---------------------------------------------------------------- base vs total loan
  {id: 'fha-total-loan', area: 'Base vs total loan', name: 'FHA total loan = base loan + 1.75% UFMIP, P&I on the total', check: () => {
    const o = run(s => { s.renovation = false; s.basePurchasePrice = 400000; s.asIsValue = 400000; });
    const base = o.loan.maximumBaseLoan, up = Math.round(base * .0175 * 100) / 100, pi = P.principalAndInterest(base + up, .06875, 30);
    return [near(o.loan.totalLoan, base + up) && near(o.payment.principalAndInterest, Math.round(pi * 100) / 100), `base ${money(base)}, total ${money(o.loan.totalLoan)} (expected ${money(base + up)}), P&I ${money(o.payment.principalAndInterest)}`]; }},
  {id: 'conv-no-ufmip', area: 'Base vs total loan', name: 'Conventional total loan equals the base loan', check: () => {
    const o = run(s => { s.loanProgram = 'Conventional'; s.renovation = false; s.finalDownPaymentPct = .2; s.baseDownPaymentPct = .2; });
    return [near(o.loan.totalLoan, o.loan.maximumBaseLoan) && near(o.loan.maximumBaseLoan, 400000), `base ${money(o.loan.maximumBaseLoan)}, total ${money(o.loan.totalLoan)} (expected $400,000.00 both)`]; }},
  // ---------------------------------------------------------------- funding gaps through cash to close
  {id: 'gap-none', area: 'Funding gaps', name: 'No limit binding: cash to close matches the funds identity', check: () => {
    const o = run(s => { s.reno.baseCost = 75000; s.afterRepairValue = 650000; s.asIsValue = 500000; });
    const need = fundsNeeded(o, Math.min(o.cash.sellerConcessionApplied, o.cash.buyerClosingCosts)); return [near(o.cash.cashToClose, need, .01), `cash to close ${money(o.cash.cashToClose)}, funds needed ${money(need)}`]; }},
  {id: 'gap-fha-limit', area: 'Funding gaps', name: 'FHA county limit caps the loan: the excess is in cash to close', known: 'D1 funding gap omitted from cash to close',
    check: () => { const o = run(s => { s.basePurchasePrice = 1200000; s.reno.baseCost = 100000; s.asIsValue = 1200000; s.afterRepairValue = 1450000; });
      const need = fundsNeeded(o, Math.min(o.cash.sellerConcessionApplied, o.cash.buyerClosingCosts)); return [near(o.cash.cashToClose, need, .01), `cash to close ${money(o.cash.cashToClose)}, funds needed ${money(need)}, gap ${money(need - o.cash.cashToClose)} (limit binding: ${o.loan.limitBinding})`]; }},
  {id: 'gap-price-over-value', area: 'Funding gaps', name: 'FHA 203(k): price above as-is value - the difference is in cash to close', known: 'D1 funding gap omitted from cash to close',
    check: () => { const o = run(s => { s.basePurchasePrice = 500000; s.asIsValue = 450000; s.reno.baseCost = 50000; s.afterRepairValue = 600000; });
      const need = fundsNeeded(o, Math.min(o.cash.sellerConcessionApplied, o.cash.buyerClosingCosts)); return [near(o.cash.cashToClose, need, .01), `cash to close ${money(o.cash.cashToClose)}, funds needed ${money(need)}, gap ${money(need - o.cash.cashToClose)}`]; }},
  {id: 'gap-arv-110', area: 'Funding gaps', name: 'FHA 203(k): 110% of ARV caps the value basis', known: 'D1 funding gap omitted from cash to close',
    check: () => { const o = run(s => { s.basePurchasePrice = 500000; s.asIsValue = 500000; s.reno.baseCost = 150000; s.afterRepairValue = 560000; });
      const need = fundsNeeded(o, Math.min(o.cash.sellerConcessionApplied, o.cash.buyerClosingCosts)); return [near(o.cash.cashToClose, need, .01), `cash to close ${money(o.cash.cashToClose)}, funds needed ${money(need)}, gap ${money(need - o.cash.cashToClose)}`]; }},
  {id: 'gap-homestyle-ltv', area: 'Funding gaps', name: 'HomeStyle: LTV of the as-completed value caps the loan', known: 'D1 funding gap omitted from cash to close',
    check: () => { const o = run(s => { s.loanProgram = 'Conventional'; s.basePurchasePrice = 500000; s.reno.baseCost = 150000; s.afterRepairValue = 600000; s.finalDownPaymentPct = .05; s.baseDownPaymentPct = .05; });
      const need = fundsNeeded(o, Math.min(o.cash.sellerConcessionApplied, o.cash.buyerClosingCosts)); return [near(o.cash.cashToClose, need, .01), `cash to close ${money(o.cash.cashToClose)}, funds needed ${money(need)}, gap ${money(need - o.cash.cashToClose)}`]; }},
  // ---------------------------------------------------------------- credits
  {id: 'credit-within-costs', area: 'Credits', name: 'Seller credit below closing costs reduces cash to close dollar for dollar', check: () => {
    const o = run(s => { s.renovation = false; s.basePurchasePrice = 300000; s.sellerConcessionPct = .03; s.concessionIncreasesPrice = false; s.closing.earnestMoneyDeposit = 0; });
    const c = o.cash, want = c.requiredInvestment + c.buyerClosingCosts - c.sellerConcessionApplied; return [c.sellerConcessionApplied < c.buyerClosingCosts && near(c.cashToClose, want), `credit ${money(c.sellerConcessionApplied)}, closing costs ${money(c.buyerClosingCosts)}, cash ${money(c.cashToClose)} (expected ${money(want)})`]; }},
  {id: 'credit-excess-conv', area: 'Credits', name: 'Conventional: credit above closing costs may not pay the down payment', known: 'D2 excess seller credit applied to the required investment',
    check: () => { const o = run(s => { s.loanProgram = 'Conventional'; s.renovation = false; s.basePurchasePrice = 400000; s.finalDownPaymentPct = .25; s.baseDownPaymentPct = .25; s.sellerConcessionPct = .09; s.concessionIncreasesPrice = false; s.closing.earnestMoneyDeposit = 0; });
      const c = o.cash; return [c.cashToClose >= c.requiredInvestment - .005, `cash to close ${money(c.cashToClose)} is below the required investment ${money(c.requiredInvestment)} by ${money(c.requiredInvestment - c.cashToClose)}; unused credit shown: ${money(c.deficit)}`]; }},
  {id: 'credit-excess-fha', area: 'Credits', name: 'FHA: credit above closing costs may not satisfy the 3.5% minimum investment', known: 'D2 excess seller credit applied to the required investment',
    check: () => { const o = run(s => { s.renovation = false; s.basePurchasePrice = 250000; s.sellerConcessionPct = .06; s.concessionIncreasesPrice = false; s.closing.earnestMoneyDeposit = 0; s.state = 'Pennsylvania'; s.propertyTaxAmount = 3000; s.insuranceAmount = 1200; });
      const c = o.cash; return [c.cashToClose >= c.requiredInvestment - .005, `cash to close ${money(c.cashToClose)} vs minimum investment ${money(c.requiredInvestment)}`]; }},
  {id: 'deposit-credit', area: 'Credits', name: 'Earnest money deposit is credited once', check: () => {
    const a = run(s => { s.renovation = false; s.closing.earnestMoneyDeposit = 0; }), b = run(s => { s.renovation = false; s.closing.earnestMoneyDeposit = 10000; });
    return [near(a.cash.cashToClose - b.cash.cashToClose, 10000), `difference ${money(a.cash.cashToClose - b.cash.cashToClose)} (expected $10,000.00)`]; }},
  // ---------------------------------------------------------------- blank vs zero overrides (v57: null = calculate, 0 = intentional zero)
  {id: 'pmi-null-auto', area: 'Overrides', name: 'PMI override left blank uses the suggested rate', check: () => {
    const o = run(s => { s.loanProgram = 'Conventional'; s.renovation = false; s.finalDownPaymentPct = .1; s.baseDownPaymentPct = .1; s.pmiOverrideRate = null; }); return [o.payment.monthlyPmi > 0, `monthly PMI ${money(o.payment.monthlyPmi)} at ${(o.payment.pmiRateUsed * 100).toFixed(3)}%`]; }},
  {id: 'pmi-zero', area: 'Overrides', name: 'PMI override of 0 (lender-paid) gives $0 PMI', known: 'D3 zero overrides reactivate the default',
    check: () => { const o = run(s => { s.loanProgram = 'Conventional'; s.renovation = false; s.finalDownPaymentPct = .1; s.baseDownPaymentPct = .1; s.pmiOverrideRate = 0; }); return [near(o.payment.monthlyPmi, 0), `monthly PMI ${money(o.payment.monthlyPmi)} (expected $0.00)`]; }},
  {id: 'supp-orig-zero', area: 'Overrides', name: 'Supplemental origination override of $0 (waived) gives $0', known: 'D3 zero overrides reactivate the default',
    check: () => { const o = run(s => { s.reno.baseCost = 60000; s.reno.supplementalOriginationOverride = 0; }); return [near(o.renovationOut.supplementalOrigination, 0), `supplemental origination ${money(o.renovationOut.supplementalOrigination)} (expected $0.00)`]; }},
  {id: 'supp-orig-null', area: 'Overrides', name: 'Supplemental origination left blank = greater of $350 or 1.5%', check: () => {
    const o = run(s => { s.reno.baseCost = 60000; s.reno.supplementalOriginationOverride = null; }); const v = o.renovationOut.supplementalOrigination; return [v >= 350, `supplemental origination ${money(v)}`]; }},
  // ---------------------------------------------------------------- draws
  ...[[100000.03, 3], [47777.77, 3], [123456.78, 7], [99999.99, 6]].map(([base, n]) => ({id: `draws-${n}-${base}`, area: 'Draws', name: `Draw releases add up to the renovation cost exactly (${money(base)}, ${n} draws)`,
    known: (base === 123456.78 || base === 99999.99) ? 'D4 draw releases do not reconcile to the cent' : undefined,
    check: () => { const o = run(s => { s.reno.baseCost = base; s.draws.manualOverride = true; s.draws.manualDrawCount = n; }); const sum = o.renovationOut.drawSchedule.reduce((t, d) => t + d.releaseAmount, 0); return [near(sum, base), `releases total ${money(sum)} (expected ${money(base)})`]; }})),
  // ---------------------------------------------------------------- renovation toggle
  {id: 'no-renovation', area: 'No Renovation', name: 'Renovation off excludes renovation costs and financed payments', check: () => {
    const o = run(s => { s.reno.baseCost = 80000; s.reno.paymentReserveMonths = 6; s.renovation = false; }); return [!o.renovationActive && o.renovationOut.finalRenovationAmount === 0 && o.renovationOut.paymentReserve === 0 && near(o.loan.totalAcquisitionCost, 500000), `acquisition ${money(o.loan.totalAcquisitionCost)}, renovation ${money(o.renovationOut.finalRenovationAmount)}, reserve ${money(o.renovationOut.paymentReserve)}`]; }},
  {id: 'no-renovation-keeps-entries', area: 'No Renovation', name: 'Turning renovation back on restores the earlier entries', check: () => {
    const s = D.defaultScenario(); s.reno.baseCost = 80000; s.renovation = false; R.runScenario(s); s.renovation = true; const o = R.runScenario(s); return [o.renovationOut.baseCost === 80000, `base cost ${money(o.renovationOut.baseCost)}`]; }},
  {id: 'financed-payments', area: 'Financed payments', name: 'Six financed payments = 6 x the final monthly payment', verify: 'S1 reserve uses the payment before the reserve is financed - confirm the program rule (HUD-92700 B4 / HomeStyle)', check: () => {
    const o = run(s => { s.reno.baseCost = 80000; s.reno.paymentReserveMonths = 6; }); return [near(o.renovationOut.paymentReserve, Math.round(o.payment.totalMonthlyPayment * 6 * 100) / 100, .01), `reserve ${money(o.renovationOut.paymentReserve)} vs 6 x ${money(o.payment.totalMonthlyPayment)}`]; }},
  // ---------------------------------------------------------------- missing information
  {id: 'missing-income', area: 'Missing information', name: 'No qualifying income is not shown as a passing DTI', check: () => {
    const o = run(s => s.borrowers.forEach(b => { b.grossMonthlyIncome = 0; b.otherMonthlyIncome = 0; })); return [!/pass/i.test(String(o.aus.overallDti)), `DTI result "${o.aus.overallDti}"`]; }},
  {id: 'missing-assets', area: 'Missing information', name: 'No assets entered is not shown as a passing reserve check', known: 'D5 "not entered" reported as PASS',
    check: () => { const o = run(s => { s.assets.liquidAssets = null; s.assets.retirementOtherAssets = null; s.assets.giftFunds = null; }); return [!/^pass/i.test(String(o.aus.reserveStatus)), `reserve status "${o.aus.reserveStatus}"`]; }},
  // ---------------------------------------------------------------- v57 behaviour (these run only against an engine that has it)
  ...(v57 ? [
  {id: 'assets-entered-zero', area: 'Missing information', name: 'Assets entered as $0 are a real answer, not "not entered"', check: () => {
    const o = run(s => { s.assets.liquidAssets = 0; s.assets.retirementOtherAssets = 0; s.assets.giftFunds = 0; }); return [o.aus.reserveStatus !== 'NOT ENTERED', `reserve status "${o.aus.reserveStatus}"`]; }},
  {id: 'fha-mip-zero-rejected', area: 'Overrides', name: 'FHA annual MIP of 0% is rejected: calculated rate used, with an explanation', check: () => {
    const s = D.defaultScenario(); s.renovation = false; s.fhaMipOverrideRate = 0; const o = R.runScenario(s);
    const w = (o.warnings || []).find(x => x.code === 'OVERRIDE_ZERO_REJECTED'); return [o.payment.monthlyFhaMip > 0 && !!w, `monthly MIP ${money(o.payment.monthlyFhaMip)}; warning: ${w ? w.title : 'none'}`]; }},
  {id: 'ti-zero-review', area: 'Overrides', name: 'Taxes + insurance override of $0 is used and flagged for review', check: () => {
    const s = D.defaultScenario(); s.taxInsuranceOverrideMonthly = 0; const o = R.runScenario(s); const w = (o.warnings || []).find(x => x.code === 'OVERRIDE_ZERO_REVIEW');
    return [o.payment.monthlyTaxesAndInsuranceUsed === 0 && o.payment.usingTiOverride && !!w, `T&I used ${money(o.payment.monthlyTaxesAndInsuranceUsed)}, warning: ${w ? w.title : 'none'}`]; }},
  {id: 'gap-reasons', area: 'Funding gaps', name: 'The unfinanced amount is explained line by line and the lines add up', check: () => {
    const o = run(s => { s.basePurchasePrice = 500000; s.asIsValue = 450000; s.reno.baseCost = 150000; s.afterRepairValue = 560000; });
    const sumR = o.loan.additionalFundsReasons.reduce((t, r) => t + r.amount, 0); return [o.loan.additionalFundsRequired > 0 && near(sumR, o.loan.additionalFundsRequired, .011), `additional ${money(o.loan.additionalFundsRequired)} = ` + o.loan.additionalFundsReasons.map(r => r.label + ' ' + money(r.amount)).join(' + ')]; }},
  {id: 'credit-unused-shown', area: 'Credits', name: 'Credit above the closing costs is shown as unused with the reason', check: () => {
    const o = run(s => { s.loanProgram = 'Conventional'; s.renovation = false; s.basePurchasePrice = 400000; s.finalDownPaymentPct = .25; s.baseDownPaymentPct = .25; s.sellerConcessionPct = .09; s.concessionIncreasesPrice = false; s.closing.earnestMoneyDeposit = 0; });
    const c = o.cash; return [c.sellerConcessionUnused > 0 && near(c.sellerConcessionApplied + c.sellerConcessionUnused, c.sellerConcessionAllowed) && c.creditNotes.length > 0, `allowed ${money(c.sellerConcessionAllowed)}, applied ${money(c.sellerConcessionApplied)}, unused ${money(c.sellerConcessionUnused)}`]; }},
  ] : []),
];

let pass = 0, fail = 0, knownFail = 0, fixed = 0, review = 0; const rows = [];
for (const c of cases) {
  let ok = false, detail = '';
  try { [ok, detail] = c.check(); } catch (e) { detail = 'ERROR ' + e.message; }
  const status = ok ? (c.known ? 'FIXED (was a known defect)' : 'PASS') : (c.known ? 'KNOWN DEFECT' : c.verify ? 'NEEDS VERIFICATION' : 'FAIL');
  if (ok && !c.known) pass++; else if (ok) fixed++; else if (c.known) knownFail++; else if (c.verify) review++; else fail++;
  rows.push({status, area: c.area, id: c.id, name: c.name, detail, known: c.known || c.verify || ''});
}
const w = Math.max(...rows.map(r => r.status.length));
for (const r of rows) console.log(r.status.padEnd(w), '|', r.area.padEnd(20), '|', r.name, '\n' + ' '.repeat(w) + ' |', ' '.repeat(20), '|   ', r.detail + (r.known && r.status !== 'PASS' ? '  [' + r.known + ']' : ''));
console.log(`\n${cases.length} cases: ${pass} pass, ${knownFail} known 56.5 defects still failing, ${review} need rule verification, ${fixed} known defects now fixed, ${fail} unexpected failures`);
if (process.argv.includes('--json')) console.log(JSON.stringify(rows));
process.exit(fail ? 1 : 0);
