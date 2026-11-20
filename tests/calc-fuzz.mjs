// 57.19 calculation stress test: thousands of random loan files (every program, renovation on and off, odd and extreme
// figures, blanks and text where numbers go) through the v57 engine, each checked against formulas worked out here
// independently. A fixed seed makes every run identical. Runs against dist/engine.js (`npm run build:engine` first).
import { loadEngine } from './engine-loader.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'engine.js');
const base = loadEngine(dist);
const D = base.require('src/core/defaults'), E = base.require('src/core/calc/engine');

let seed = 57190001;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => lo + (hi - lo) * rnd();
const r2 = (v) => Math.round(v * 100) / 100;

const failures = {}, fail = (name, detail) => { (failures[name] = failures[name] || []).push(detail); };
const N = +(process.argv[2] || 4000);
let runs = 0, crashes = 0;
const PROGRAMS = ['FHA', 'Conventional', 'VA', 'USDA', 'FHA 203k', 'Conventional HomeStyle'];

function scanNumbers(o, where, seen = new Set()) {
  if (!o || typeof o !== 'object' || seen.has(o)) return;
  seen.add(o);
  for (const [k, v] of Object.entries(o)) {
    if (k === 'traces') continue;
    if (typeof v === 'number' && !Number.isFinite(v)) fail('no NaN or Infinity in any result', `${where}.${k} = ${v}`);
    else if (v && typeof v === 'object') scanNumbers(v, where + '.' + k, seen);
  }
}

for (let i = 0; i < N; i++) {
  const s = D.defaultScenario('2026-11-19', 'fuzz-' + i);
  const extreme = rnd() < 0.08;
  s.loanProgram = pick(PROGRAMS);
  s.renovation = rnd() < 0.4;
  s.basePurchasePrice = extreme ? pick([0, 1, 50, 999999999, -5000, 25000]) : Math.round(between(60000, 2500000));
  s.baseDownPaymentPct = extreme ? pick([0, 1, 1.5, -0.2, 0.999]) : pick([0, 0.03, 0.035, 0.05, 0.1, 0.2, 0.25, between(0, 0.5)]);
  s.finalDownPaymentPct = s.baseDownPaymentPct;
  s.interestRate = extreme ? pick([0, 0.0001, 0.25, -0.01]) : r2(between(0.02, 0.11) * 1e5) / 1e5;
  s.termYears = extreme ? pick([0, 1, 50]) : pick([10, 15, 20, 25, 30, 40]);
  s.propertyTaxAmount = extreme ? pick([0, -100, 1e7]) : Math.round(between(0, 40000));
  s.insuranceAmount = extreme ? pick([0, 1e6]) : Math.round(between(500, 9000));
  s.hoaMonthly = rnd() < 0.3 ? Math.round(between(0, 900)) : 0;
  s.sellerConcessionPct = rnd() < 0.3 ? pick([0.03, 0.06, 0.09]) : 0;
  s.creditScore = pick([580, 620, 660, 700, 740, 780, 820]);
  s.units = pick([1, 1, 1, 2, 3, 4]);
  if (s.renovation && s.reno) {
    for (const k of Object.keys(s.reno)) if (typeof s.reno[k] === 'number' && /amount|budget|cost|base/i.test(k)) s.reno[k] = extreme ? pick([0, 1e8]) : Math.round(between(0, 150000));
  }
  if (rnd() < 0.15) s.asIsValue = Math.round(s.basePurchasePrice * between(0.8, 1.3));
  if (rnd() < 0.15) s.afterRepairValue = Math.round(s.basePurchasePrice * between(0.9, 1.6));

  let o;
  try { o = E.runScenario(s); runs++; } catch (e) { crashes++; fail('the engine never crashes', `${s.loanProgram} price ${s.basePurchasePrice}: ${String(e.message || e).slice(0, 120)}`); continue; }
  if (!o || !o.loan || !o.payment) { fail('every file gives a loan and a payment', s.loanProgram); continue; }
  scanNumbers(o, s.loanProgram);
  const L = o.loan, P = o.payment, C = o.cash;
  if (L.totalLoan < 0 || P.totalMonthlyPayment < 0 || P.principalAndInterest < 0) fail('no negative loan or payment', `${L.totalLoan} / ${P.totalMonthlyPayment}`);
  if (extreme) continue;   // the formula checks below are for ordinary files

  // principal and interest: the standard amortisation formula on the total loan
  const rate = s.interestRate / 12, n = s.termYears * 12;
  const pi = rate ? L.totalLoan * rate / (1 - Math.pow(1 + rate, -n)) : L.totalLoan / n;
  if (Math.abs(r2(pi) - P.principalAndInterest) > 0.011) fail('P&I = amortisation formula on the total loan', `${s.loanProgram} loan ${L.totalLoan} @ ${s.interestRate} x ${n}: engine ${P.principalAndInterest} vs ${r2(pi)}`);
  // the payment adds up
  const sum = P.principalAndInterest + P.monthlyFhaMip + P.monthlyPmi + P.monthlyTaxesAndInsuranceUsed + P.hoaMonthly + (P.monthlyFundingFee || 0);
  if (Math.abs(sum - P.totalMonthlyPayment) > 0.03) fail('monthly payment = P&I + MI + taxes & insurance + HOA', `${s.loanProgram}: parts ${r2(sum)} vs total ${P.totalMonthlyPayment}`);
  // taxes and insurance per month
  if (!P.usingTiOverride && s.propertyTaxBasis !== 'monthly' && s.insuranceBasis !== 'monthly') {
    const ti = s.propertyTaxAmount / 12 + s.insuranceAmount / 12;
    if (Math.abs(ti - P.monthlyTaxesAndInsuranceUsed) > 0.05 && P.monthlyTaxesAndInsuranceUsed > 0) fail('taxes & insurance = yearly amounts / 12', `${r2(ti)} vs ${P.monthlyTaxesAndInsuranceUsed}`);
  }
  // FHA: the upfront premium is financed on top of the base loan
  if (o.isFha) {
    if (Math.abs(r2(L.maximumBaseLoan * s.ufmipRate) - L.ufmip) > 0.011) fail('FHA UFMIP = base loan x UFMIP rate', `${L.maximumBaseLoan} x ${s.ufmipRate} = ${r2(L.maximumBaseLoan * s.ufmipRate)} vs ${L.ufmip}`);
    if (Math.abs(L.maximumBaseLoan + L.ufmip - L.totalLoan) > 0.011) fail('FHA total loan = base loan + UFMIP', `${L.maximumBaseLoan} + ${L.ufmip} vs ${L.totalLoan}`);
    if (P.monthlyPmi) fail('FHA has no PMI', String(P.monthlyPmi));
    if (L.maximumBaseLoan > L.fhaLimitApplied + 0.01 && L.fhaLimitApplied > 0) fail('FHA base loan within the county limit', `${L.maximumBaseLoan} > ${L.fhaLimitApplied}`);
  } else if (P.monthlyFhaMip) fail('only FHA has MIP', `${s.loanProgram}: ${P.monthlyFhaMip}`);
  // cash to close is the money in, less the earnest money already paid
  if (C && Math.abs(C.cashToCloseBeforeEmd - C.earnestMoneyDeposit - C.cashToClose) > 0.02 && C.cashToClose >= 0) fail('cash to close = before deposit - earnest money', `${C.cashToCloseBeforeEmd} - ${C.earnestMoneyDeposit} vs ${C.cashToClose}`);
  if (C && C.sellerConcessionApplied > C.sellerConcessionAllowed + 0.01) fail('seller credit applied never exceeds what is allowed', `${C.sellerConcessionApplied} > ${C.sellerConcessionAllowed}`);
  if (C && C.cashToCloseLow > C.cashToCloseHigh + 0.01) fail('cash-to-close range low <= high', `${C.cashToCloseLow} > ${C.cashToCloseHigh}`);
  if (P.paymentLow > P.paymentHigh + 0.01) fail('payment range low <= high', `${P.paymentLow} > ${P.paymentHigh}`);
}

const names = Object.keys(failures);
for (const k of names) { console.log(`FAIL ${k} (${failures[k].length}x)`); failures[k].slice(0, 4).forEach((d) => console.log('     ' + d)); }
console.log(`\n${runs} random loan files calculated, ${crashes} crashes, ${names.length} rule${names.length === 1 ? '' : 's'} broken`);
process.exit(names.length ? 1 : 0);
