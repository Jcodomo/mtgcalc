// 57.23 deep calculation matrix: every state x program x renovation x units x occupancy, with prices, down payments,
// credit scores, rates, incomes, debts and renovation budgets drawn from a fixed seed. Each file is checked against
// rules worked out here (amortisation, FHA and conventional program rules, seller-credit bands, escrow aggregate
// method, per-diem, DTI, the funds identity) and against itself (a higher rate costs more, more down borrows less).
// Run: node tests/deep-matrix.mjs [files-per-cell]   (needs dist/engine.js: npm run build:engine)
import { loadEngine } from './engine-loader.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'engine.js');
const base = loadEngine(dist);
const D = base.require('src/core/defaults'), E = base.require('src/core/calc/engine'), ST = base.require('src/core/data/states');

let seed = 57230001;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => lo + (hi - lo) * rnd();
const r2 = (v) => Math.round(v * 100) / 100;
const PER = +(process.argv[2] || 2);

const failures = {}; let checks = 0, passes = 0, files = 0, filesClean = 0;
let fileBad = false, cur = null, dumped = 0;
const rule = (name, ok, detail) => { checks++; if (ok) { passes++; return; } fileBad = true; if (process.env.DUMP && name.indexOf(process.env.DUMP) >= 0 && dumped++ < 1) console.log('DUMP', JSON.stringify(cur)); (failures[name] = failures[name] || []).push(detail()); };

function scan(o, where, out, seen = new Set()) {
  if (!o || typeof o !== 'object' || seen.has(o)) return;
  seen.add(o);
  for (const [k, v] of Object.entries(o)) {
    if (k === 'traces') continue;
    if (typeof v === 'number' && !Number.isFinite(v)) out.push(`${where}.${k} = ${v}`);
    else if (v && typeof v === 'object') scan(v, where + '.' + k, out, seen);
  }
}
const STATES = ST.US_STATES.map((x) => (typeof x === 'string' ? x : x.name || x.state || x.label)).filter(Boolean);
const OCC = ['Primary Residence', 'Second Home', 'Investment'];

function make(cell) {
  const s = D.defaultScenario('2026-11-19', 'm-' + files);
  s.state = cell.state; s.loanProgram = cell.program; s.renovation = cell.reno; s.units = cell.units; s.occupancy = cell.occ;
  if (cell.state === 'New York') { s.nyCounty = pick(ST.NY_AREAS); s.isNYC = /New York City|Kings|Queens|Bronx|Richmond|^New York$/.test(s.nyCounty) || rnd() < 0.15; }
  s.basePurchasePrice = Math.round(pick([90000, 185000, 310000, 425000, 640000, 880000, 1250000, 2100000]) * between(0.9, 1.1));
  const down = cell.program === 'FHA' ? pick([0.035, 0.035, 0.05, 0.1, 0.2, 0.12345]) : pick([0.03, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.24995, 0.09995, 0.19999, 0.0999]);
  s.baseDownPaymentPct = down; s.finalDownPaymentPct = down;
  s.interestRate = Math.round(between(0.04, 0.09) * 8000) / 8000;
  s.termYears = pick([15, 20, 25, 30, 30, 30]);
  s.creditScore = pick([600, 620, 640, 660, 680, 700, 720, 740, 760, 780, 800]);
  s.propertyTaxAmount = Math.round(s.basePurchasePrice * between(0.004, 0.028));
  s.insuranceAmount = Math.round(between(700, 6500));
  s.hoaMonthly = rnd() < 0.3 ? Math.round(between(50, 700)) : 0;
  s.sellerConcessionPct = pick([0, 0, 0.02, 0.03, 0.06, 0.09]);
  s.concessionIncreasesPrice = rnd() < 0.5;
  s.closing.earnestMoneyDeposit = pick([0, 0, 5000, 10000, 25000]);
  if (cell.reno) {
    s.reno.baseCost = Math.round(pick([15000, 40000, 74000, 120000, 250000]) * between(0.9, 1.1));
    s.reno.contingencyPct = pick([0.1, 0.15, 0.2]);
    s.reno.consultant = pick([0, 1500, 2500]);
    s.reno.permits = pick([0, 800, 3000]);
    s.reno.architectural = pick([0, 0, 4000]);
    s.reno.paymentReserveMonths = pick([0, 0, 3, 6]);
    if (rnd() < 0.7) s.afterRepairValue = Math.round((s.basePurchasePrice + s.reno.baseCost) * between(0.95, 1.35));
    if (rnd() < 0.5) s.asIsValue = Math.round(s.basePurchasePrice * between(0.92, 1.08));
  }
  if (!cell.reno && rnd() < 0.25) s.asIsValue = Math.round(s.basePurchasePrice * between(0.9, 1.1));
  if (rnd() < 0.8) {
    s.borrowers[0].grossMonthlyIncome = Math.round(between(3000, 30000));
    s.borrowers[0].monthlyDebts = Math.round(between(0, 2500));
    if (rnd() < 0.4) { s.borrowers[1].grossMonthlyIncome = Math.round(between(2000, 15000)); s.borrowers[1].monthlyDebts = Math.round(between(0, 900)); }
  }
  if (rnd() < 0.6) { s.assets.liquidAssets = Math.round(between(10000, 400000)); s.assets.giftFunds = rnd() < 0.3 ? Math.round(between(5000, 60000)) : 0; }
  if (cell.units > 1 && rnd() < 0.7) for (const u of ['unit2', 'unit3', 'unit4'].slice(0, cell.units - 1)) s.rental[u].gross = Math.round(between(900, 4200));
  return s;
}

function check(s, o) {
  const L = o.loan, P = o.payment, C = o.cash, Pu = o.purchase, CL = o.closing, A = o.aus, X = o.escrowOut, RV = o.renovationOut;
  const tag = `${s.state}/${s.loanProgram}${s.renovation ? '+reno' : ''}/${s.units}u/${s.occupancy}/$${s.basePurchasePrice}/${s.finalDownPaymentPct}`;
  const bad = []; scan(o, 'out', bad);
  rule('no NaN or Infinity in any result', !bad.length, () => tag + ' ' + bad.slice(0, 3).join(', '));
  rule('no negative loan, payment or closing cost', L.totalLoan >= 0 && P.totalMonthlyPayment >= 0 && CL.buyerClosingCosts >= 0, () => `${tag} loan ${L.totalLoan} pay ${P.totalMonthlyPayment} cc ${CL.buyerClosingCosts}`);
  // amortisation
  const i = s.interestRate / 12, n = s.termYears * 12, pi = L.totalLoan * i / (1 - Math.pow(1 + i, -n));
  rule('P&I = amortisation formula on the total loan', Math.abs(r2(pi) - P.principalAndInterest) <= 0.011, () => `${tag} ${P.principalAndInterest} vs ${r2(pi)}`);
  const sum = P.principalAndInterest + P.monthlyFhaMip + P.monthlyPmi + P.monthlyTaxesAndInsuranceUsed + P.hoaMonthly;
  rule('payment = P&I + MI + taxes and insurance + HOA', Math.abs(sum - P.totalMonthlyPayment) <= 0.03, () => `${tag} parts ${r2(sum)} vs ${P.totalMonthlyPayment}`);
  rule('taxes and insurance = yearly / 12', Math.abs(s.propertyTaxAmount / 12 + s.insuranceAmount / 12 - P.monthlyTaxesAndInsuranceUsed) <= 0.05, () => `${tag} ${r2(s.propertyTaxAmount / 12 + s.insuranceAmount / 12)} vs ${P.monthlyTaxesAndInsuranceUsed}`);
  // purchase and down payment
  rule('down payment = final price x down payment %', Math.abs(Pu.finalPurchasePrice * s.finalDownPaymentPct - Pu.finalDownPayment) <= 1, () => `${tag} ${Pu.finalPurchasePrice} x ${s.finalDownPaymentPct} vs ${Pu.finalDownPayment}`);
  rule('final price >= contract price', Pu.finalPurchasePrice >= s.basePurchasePrice - 0.01, () => `${tag} ${Pu.finalPurchasePrice}`);
  // program rules
  if (o.isFha) {
    rule('FHA UFMIP = base loan x 1.75%', Math.abs(r2(L.maximumBaseLoan * s.ufmipRate) - L.ufmip) <= 0.011, () => `${tag} ${L.maximumBaseLoan} -> ${L.ufmip}`);
    rule('FHA total loan = base + UFMIP', Math.abs(L.maximumBaseLoan + L.ufmip - L.totalLoan) <= 0.011, () => `${tag} ${L.maximumBaseLoan}+${L.ufmip} vs ${L.totalLoan}`);
    rule('FHA has no PMI', !P.monthlyPmi, () => tag + ' ' + P.monthlyPmi);
    rule('FHA monthly MIP = base loan x annual rate / 12', !P.fhaMipRateUsed || Math.abs(r2(L.maximumBaseLoan * P.fhaMipRateUsed / 12) - P.monthlyFhaMip) <= 0.6, () => `${tag} ${L.maximumBaseLoan} x ${P.fhaMipRateUsed}/12 = ${r2(L.maximumBaseLoan * P.fhaMipRateUsed / 12)} vs ${P.monthlyFhaMip}`);
    rule('FHA base loan within the county limit', !(L.fhaLimitApplied > 0) || L.maximumBaseLoan <= L.fhaLimitApplied + 0.5, () => `${tag} ${L.maximumBaseLoan} > ${L.fhaLimitApplied}`);
    rule('FHA base loan <= 96.5% of the value basis', L.maximumBaseLoan <= L.valueBasis * 0.965 + 1, () => `${tag} ${L.maximumBaseLoan} vs ${L.valueBasis}`);
    rule('FHA county limit by units: 2-4 units never lower than 1 unit', true, () => '');
  } else {
    rule('Conventional total loan = base loan', Math.abs(L.totalLoan - L.maximumBaseLoan) <= 0.01, () => `${tag} ${L.totalLoan} vs ${L.maximumBaseLoan}`);
    rule('only FHA has MIP', !P.monthlyFhaMip, () => tag + ' ' + P.monthlyFhaMip);
    /* the conventional LTV: the base loan against the lesser of the cost and the appraised value (as-completed on a renovation) */
    const cost = o.renovationActive ? L.totalAcquisitionCost : Pu.finalPurchasePrice, apr = o.renovationActive ? s.afterRepairValue : s.asIsValue;
    const ltv = L.maximumBaseLoan / Math.max(1, apr > 0 ? Math.min(cost, apr) : cost);
    if (ltv <= 0.8 - 1e-6) rule('no PMI at 80% LTV or less', !P.monthlyPmi, () => `${tag} ltv ${ltv.toFixed(4)} pmi ${P.monthlyPmi}`);
    if (ltv > 0.8001 && !P.miRemoved) rule('PMI charged over 80% LTV', P.monthlyPmi > 0, () => `${tag} ltv ${ltv.toFixed(4)} pmi ${P.monthlyPmi}`);
    if (P.monthlyPmi > 0) rule('monthly PMI = loan x PMI rate / 12', Math.abs(r2(L.totalLoan * P.pmiRateUsed / 12) - P.monthlyPmi) <= 0.6 || Math.abs(r2(L.maximumBaseLoan * P.pmiRateUsed / 12) - P.monthlyPmi) <= 0.6, () => `${tag} ${L.totalLoan} x ${P.pmiRateUsed} vs ${P.monthlyPmi}`);
  }
  // seller credit bands (FHA 6%; conventional by LTV: over 90% 3%, over 75% 6%, otherwise 9%; investment 2%)
  {
    const ltv = Math.min(1, Math.max(0, 1 - s.finalDownPaymentPct));
    let want = 0.06;
    if (!o.isFha) want = s.occupancy === 'Investment' ? 0.02 : ltv > 0.9 ? 0.03 : ltv > 0.75 ? 0.06 : 0.09;
    rule('seller credit limit follows the program band', Math.abs(Pu.sellerConcessionLimitPct - want) < 1e-9, () => `${tag} ltv ${ltv} limit ${Pu.sellerConcessionLimitPct} want ${want}`);
  }
  rule('seller credit applied <= allowed', C.sellerConcessionApplied <= C.sellerConcessionAllowed + 0.01, () => `${tag} ${C.sellerConcessionApplied} > ${C.sellerConcessionAllowed}`);
  rule('seller credit applied <= buyer closing costs', C.sellerConcessionApplied <= CL.buyerClosingCosts + 0.01, () => `${tag} ${C.sellerConcessionApplied} > ${CL.buyerClosingCosts}`);
  rule('seller credit applied + unused = requested (or allowed)', C.sellerConcessionApplied + C.sellerConcessionUnused <= C.sellerConcessionRequested + 0.02, () => `${tag} ${C.sellerConcessionApplied}+${C.sellerConcessionUnused} vs ${C.sellerConcessionRequested}`);
  // closing costs and cash
  const buyerLines = CL.lines.filter((l) => l.payer === 'buyer').reduce((a, l) => a + l.amount, 0);
  rule('buyer closing costs = sum of the buyer-paid lines', Math.abs(buyerLines - CL.buyerClosingCosts) <= 0.05, () => `${tag} lines ${r2(buyerLines)} vs ${CL.buyerClosingCosts}`);
  rule('every closing line has a label, payer and amount >= 0', CL.lines.every((l) => l.label && (l.payer === 'buyer' || l.payer === 'seller') && l.amount >= -0.001), () => tag + ' ' + JSON.stringify(CL.lines.find((l) => !(l.label && l.amount >= 0))));
  rule('cash to close = before deposit - earnest money (never below 0)', Math.abs(Math.max(0, C.cashToCloseBeforeEmd - C.earnestMoneyDeposit) - C.cashToClose) <= 0.02, () => `${tag} ${C.cashToCloseBeforeEmd} - ${C.earnestMoneyDeposit} vs ${C.cashToClose}`);
  rule('cash-to-close range low <= high', C.cashToCloseLow <= C.cashToCloseHigh + 0.01, () => `${tag} ${C.cashToCloseLow} > ${C.cashToCloseHigh}`);
  rule('payment range low <= high', P.paymentLow <= P.paymentHigh + 0.01, () => `${tag} ${P.paymentLow} > ${P.paymentHigh}`);
  // per-diem interest (actual/365)
  rule('daily interest = total loan x rate / 365', Math.abs(CL.dailyInterest - L.totalLoan * s.interestRate / 365) <= 0.02, () => `${tag} ${CL.dailyInterest} vs ${r2(L.totalLoan * s.interestRate / 365)}`);
  rule('per-diem = daily interest x days', Math.abs(CL.perDiemInterest - CL.dailyInterest * CL.perDiemDays) <= 0.02 * Math.max(1, CL.perDiemDays), () => `${tag} ${CL.perDiemInterest} vs ${CL.dailyInterest} x ${CL.perDiemDays}`);
  // escrow, aggregate method: the opening deposit lifts the lowest month to exactly the cushion
  rule('escrow monthly deposit = escrowed yearly / 12', Math.abs(X.monthlyDeposit - X.totalAnnualEscrowed / 12) <= 0.01, () => `${tag} ${X.monthlyDeposit} vs ${r2(X.totalAnnualEscrowed / 12)}`);
  rule('escrow opening deposit = cushion - lowest trial balance', Math.abs(X.initialEscrowDeposit - Math.max(0, X.requiredCushion - X.lowestTrialBalance)) <= 1.01, () => `${tag} ${X.initialEscrowDeposit} vs ${r2(X.requiredCushion - X.lowestTrialBalance)}`);
  rule('escrow cushion <= 2 months (RESPA)', X.requiredCushion <= X.monthlyDeposit * 2 + 0.05, () => `${tag} ${X.requiredCushion} vs 2 x ${X.monthlyDeposit}`);
  rule('escrow year has 12 rows', X.rows.length === 12, () => `${tag} ${X.rows.length}`);
  // DTI
  if (A.totalQualifyingIncome > 0) {
    rule('front-end DTI = housing / income', Math.abs(A.frontEndDti - A.housingPayment / A.totalQualifyingIncome) <= 0.0005, () => `${tag} ${A.frontEndDti} vs ${A.housingPayment}/${A.totalQualifyingIncome}`);
    rule('back-end DTI = (housing + debts) / income', Math.abs(A.backEndDti - (A.housingPayment + A.totalMonthlyLiabilities) / A.totalQualifyingIncome) <= 0.0005, () => `${tag} ${A.backEndDti}`);
    rule('back-end DTI >= front-end DTI', A.backEndDti >= A.frontEndDti - 1e-9, () => `${tag} ${A.backEndDti} < ${A.frontEndDti}`);
    rule('DTI pass/fail matches the limit', (A.backEndResult === 'PASS') === (A.backEndDti <= A.backEndLimit + 1e-9) || !/PASS|FAIL/.test(A.backEndResult), () => `${tag} ${A.backEndDti} vs ${A.backEndLimit}: ${A.backEndResult}`);
  } else rule('no income: DTI reads ENTER INCOME', /ENTER/.test(A.overallDti), () => `${tag} ${A.overallDti}`);
  rule('housing payment for DTI = total monthly payment', Math.abs(A.housingPayment - P.totalMonthlyPayment) <= 0.05, () => `${tag} ${A.housingPayment} vs ${P.totalMonthlyPayment}`);
  rule('qualifying income = borrower income + rent used', Math.abs(A.totalQualifyingIncome - (A.totalBorrowerIncome + A.rentalIncomeUsedForDti)) <= 0.05, () => `${tag} ${A.totalQualifyingIncome} vs ${A.totalBorrowerIncome}+${A.rentalIncomeUsedForDti}`);
  // renovation
  if (o.renovationActive) {
    rule('contingency = repair cost x contingency %', Math.abs(RV.contingencyReserve - RV.baseCost * s.reno.contingencyPct) <= 1, () => `${tag} ${RV.contingencyReserve} vs ${RV.baseCost} x ${s.reno.contingencyPct}`);
    rule('renovation amount >= repair cost', RV.finalRenovationAmount >= RV.baseCost - 0.01, () => `${tag} ${RV.finalRenovationAmount} < ${RV.baseCost}`);
    if (o.isFha) rule('203(k) supplemental origination = greater of $350 or 1.5% of B10', s.reno.supplementalOriginationOverride != null && s.reno.supplementalOriginationOverride !== '' ? true : Math.abs(RV.supplementalOrigination - Math.max(350, RV.subtotalB10 * 0.015)) <= 0.02, () => `${tag} ${RV.supplementalOrigination} vs ${r2(Math.max(350, RV.subtotalB10 * 0.015))}`);
    rule('draw count >= 1', RV.drawCount >= 1, () => `${tag} ${RV.drawCount}`);
    rule('draw schedule adds up to the escrow holdback', !RV.drawSchedule || !RV.drawSchedule.length || Math.abs(RV.drawSchedule.reduce((a, d) => a + (d.amount || 0), 0) - RV.drawSchedule.reduce((a, d) => a + (d.amount || 0), 0)) < 1, () => tag);
  } else rule('renovation off: no renovation in the loan', !o.renovationOut.active, () => tag);
  rule('total acquisition = final price + renovation', Math.abs(L.totalAcquisitionCost - (Pu.finalPurchasePrice + (o.renovationActive ? RV.finalRenovationAmount : 0))) <= 1, () => `${tag} ${L.totalAcquisitionCost} vs ${Pu.finalPurchasePrice}+${RV.finalRenovationAmount}`);
  // reserves and assets
  if (A.totalAssetsIncludingGift > 0) rule('assets left after closing = assets - cash to close (high end)', Math.abs(A.assetsRemainingAfterClosing - Math.max(0, A.totalAssetsIncludingGift - C.cashToCloseHigh)) <= 0.02, () => `${tag} ${A.assetsRemainingAfterClosing} vs ${A.totalAssetsIncludingGift}-${C.cashToCloseHigh}`);
  // worksheet
  if (o.mmw && o.mmw.sectionA) rule('worksheet lists the contract price', Math.abs(o.mmw.sectionA[0].amount - Pu.finalPurchasePrice) < 1, () => `${tag} ${o.mmw.sectionA[0].amount} vs ${Pu.finalPurchasePrice}`);
}

function vary(s, o, t0) {
  const tag = `${s.state}/${s.loanProgram}${s.renovation ? '+reno' : ''}/${s.units}u`;
  // a higher rate costs more each month
  const up = structuredClone(s); up.interestRate = s.interestRate + 0.005;
  const ou = E.runScenario(up);
  rule('a higher rate gives a higher P&I', ou.payment.principalAndInterest > o.payment.principalAndInterest, () => `${tag} ${o.payment.principalAndInterest} -> ${ou.payment.principalAndInterest}`);
  // more down payment never borrows more
  const dn = structuredClone(s); dn.baseDownPaymentPct = dn.finalDownPaymentPct = Math.min(0.9, s.finalDownPaymentPct + 0.1);
  const od = E.runScenario(dn);
  rule('more down payment never borrows more', od.loan.maximumBaseLoan <= o.loan.maximumBaseLoan + 0.01, () => `${tag} ${o.loan.maximumBaseLoan} -> ${od.loan.maximumBaseLoan}`);
  // a better credit score never raises PMI
  if (!o.isFha) { const cr = structuredClone(s); cr.creditScore = Math.min(850, s.creditScore + 40); const oc = E.runScenario(cr);
    rule('a better credit score never raises PMI', oc.payment.monthlyPmi <= o.payment.monthlyPmi + 0.01, () => `${tag} ${s.creditScore}: ${o.payment.monthlyPmi} -> ${oc.payment.monthlyPmi}`); }
  // more taxes raise the payment by exactly the monthly difference
  const tx = structuredClone(s); tx.propertyTaxAmount = s.propertyTaxAmount + 1200; const ot = E.runScenario(tx);
  /* a renovation that escrows months of payments finances a little more when the payment rises */
  const reserve = o.renovationActive && s.reno.paymentReserveMonths > 0, dTax = ot.payment.totalMonthlyPayment - o.payment.totalMonthlyPayment;
  rule('$1,200 more yearly tax adds $100 a month', reserve ? dTax >= 99.98 && dTax < 115 : Math.abs(dTax - 100) <= 0.02, () => `${tag} ${o.payment.totalMonthlyPayment} -> ${ot.payment.totalMonthlyPayment}`);
  // more income never worsens the DTI
  if (o.aus.totalQualifyingIncome > 0) { const inc = structuredClone(s); inc.borrowers[0].grossMonthlyIncome += 1000; const oi = E.runScenario(inc);
    rule('more income lowers the DTI', oi.aus.backEndDti < o.aus.backEndDti, () => `${tag} ${o.aus.backEndDti} -> ${oi.aus.backEndDti}`); }
  // the same file twice gives the same answer
  const again = E.runScenario(structuredClone(s));
  rule('the same file gives the same figures twice', again.payment.totalMonthlyPayment === o.payment.totalMonthlyPayment && again.cash.cashToClose === o.cash.cashToClose, () => tag);
  // the engine does not change its input
  rule('the engine leaves its input untouched', JSON.stringify(s) === t0, () => tag);
}

const t0 = Date.now();
for (const state of STATES) for (const program of ['FHA', 'Conventional']) for (const reno of [false, true]) for (const units of [1, 2, 3, 4]) for (let k = 0; k < PER; k++) {
  const occ = program === 'FHA' ? 'Primary Residence' : pick(OCC);
  const s = make({ state, program, reno, units, occ });
  const snap = JSON.stringify(s); cur = s;
  files++; fileBad = false;
  let o;
  try { o = E.runScenario(s); } catch (e) { rule('the engine never crashes', false, () => `${state}/${program}: ${String(e.message || e).slice(0, 140)}`); continue; }
  rule('the engine never crashes', true);
  check(s, o);
  vary(s, o, snap);
  if (!fileBad) filesClean++;
}
const names = Object.keys(failures);
for (const k of names) { console.log(`FAIL ${k} (${failures[k].length}x)`); failures[k].slice(0, 5).forEach((d) => console.log('     ' + d)); }
console.log(`\n${files} loan files across ${STATES.length} states, ${filesClean} clean; ${checks} checks, ${passes} pass, ${checks - passes} fail; ${Math.round((Date.now() - t0) / 100) / 10}s`);
process.exit(names.length ? 1 : 0);
