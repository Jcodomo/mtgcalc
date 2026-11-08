/* Mortgage Suite 56.0 - live sync between the Income Calculator and the Loan Suite, on by default.
   - Income Calculator -> Loan Suite: every recalculation publishes the income handoff (sync-bridge.js), and an open Loan Suite
     page imports it at once (storage event) - not only when a field loses focus or the page closes.
   - Loan Suite -> Income Calculator: the loan the suite calculates (base loan, rate, term, program, MI rate, taxes, insurance,
     HOA, price, value) is published on every change and fills the calculator's Loan / PITIA figures, so DTI uses the same
     housing payment.
   One switch for both directions: localStorage 'losSync.v1' (the Loan Suite's own Sync button). 56.0 turns it on once for
   everyone; after that the button decides. */
(function () {
  'use strict';
  if (window.MtLive) return;
  var SYNC = 'losSync.v1', LOAN = 'mt.live.loan.v1', ONCE = 'mt.sync56.default';
  try { if (!localStorage.getItem(ONCE)) { localStorage.setItem(SYNC, '1'); localStorage.setItem(ONCE, '1'); } } catch (e) {}
  function on() { try { return localStorage.getItem(SYNC) !== '0'; } catch (e) { return true; } }
  function setOn(v) { try { localStorage.setItem(SYNC, v ? '1' : '0'); } catch (e) {} paintChip(); if (v) kick(); }
  function G(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }
  function num(v) { var n = +v; return isFinite(n) ? n : 0; }
  function r2(v) { return Math.round(num(v) * 100) / 100; }
  var page = /income-calculator/i.test(location.pathname) ? 'income' : 'suite';
  if (window.LOS_EMBED && LOS_EMBED.page === 'income') page = 'income';

  /* ------------------------------------------------------------ Loan Suite side */
  function suiteStore() { try { return window.mortgageSuite && window.mortgageSuite.store; } catch (e) { return null; } }
  function loanRecord() {
    var st = suiteStore(); if (!st) return null;
    var a = st.activeInputs || {}, o = null;
    try { o = st.cachedOutputs || (st.outputsFor && st.outputsFor(a)); } catch (e) {}
    if (!o || !o.payment || !o.loan) return null;
    var p = o.payment, l = o.loan, prog = String(a.loanProgram || ''), fha = /fha/i.test(prog), va = /\bva\b/i.test(prog), usda = /usda/i.test(prog);
    return {
      program: fha ? 'FHA' : va ? 'VA' : usda ? 'USDA' : 'Conventional',
      price: r2(a.basePurchasePrice), value: r2(a.asIsValue || a.basePurchasePrice), base: r2(l.maximumBaseLoan), total: r2(l.totalLoan),
      rate: Math.round(num(a.interestRate) * 100000) / 1000, term: num(a.termYears) || 30,
      miRate: Math.round(num(fha ? p.fhaMipRateUsed : p.pmiRateUsed) * 100000) / 1000, ufmipRate: Math.round(num(a.ufmipRate) * 100000) / 1000,
      taxes: r2(p.monthlyTaxes), ins: r2(p.monthlyInsurance), hoa: r2(p.hoaMonthly), pi: r2(p.principalAndInterest),
      mi: r2(fha ? p.monthlyFhaMip : p.monthlyPmi), housing: r2(p.totalMonthlyPayment),
      units: num(a.units) || 1, fico: num(a.creditScore), address: String(a.propertyAddress || ''), txn: String(a.transactionType || ''), occ: String(a.occupancy || ''),
      borrower: String(a.borrowerName || '')
    };
  }
  var lastLoan = '';
  function publishLoan(force) {
    if (!on() && !force) return;
    var rec = loanRecord(); if (!rec) return;
    var sig = JSON.stringify(rec); if (sig === lastLoan && !force) return; lastLoan = sig;
    try { localStorage.setItem(LOAN, JSON.stringify({updatedAt: Date.now(), source: location.pathname, loan: rec})); } catch (e) {}
    try { window.MtgcalcSync && window.MtgcalcSync.syncNow(); } catch (e) {}
  }
  function bootSuite(t) {
    var st = suiteStore(); if (!st || !st.subscribe) { if ((t || 0) < 200) setTimeout(function () { bootSuite((t || 0) + 1); }, 100); return; }
    var timer = 0; st.subscribe(function () { clearTimeout(timer); timer = setTimeout(publishLoan, 350); });
    setTimeout(publishLoan, 600);
  }

  /* ------------------------------------------------------- Income Calculator side */
  var lastIncome = '', applying = false;
  function publishIncome() {
    if (!on() || applying) return;
    var b = window.__mtgcalcBridge; if (!b || !b.getIncomePatch) return;
    var sig = ''; try { sig = JSON.stringify(b.getIncomePatch()); } catch (e) { return; }
    if (sig === lastIncome) return; lastIncome = sig;
    try { window.MtgcalcSync && window.MtgcalcSync.syncNow(); } catch (e) {}
    paintChip('Synced ' + new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit', second: '2-digit'}));
  }
  /* the suite's loan into the calculator's Loan / PITIA figures */
  function applyLoan(rec) {
    var S = G('S'); if (!S || !S.loan || !rec || !rec.loan) return false;
    if (S.loan.sync === false || !on()) return false;
    var L = S.loan, x = rec.loan, ch = false;
    function set(k, v) { if (v === undefined || v === null || (typeof v === 'number' && !isFinite(v))) return; if (L[k] !== v) { L[k] = v; ch = true; } }
    set('program', x.program); set('price', x.price); set('value', x.value); set('rate', x.rate); set('term', x.term);
    if (x.base > 0) set('baseOverride', x.base);
    set('miOverride', x.miRate > 0 ? x.miRate : 0); if (x.program === 'FHA' && x.ufmipRate > 0) set('ufmipRate', x.ufmipRate);
    set('taxAnnual', r2(x.taxes * 12)); set('insAnnual', r2(x.ins * 12)); set('hoaMonthly', x.hoa);
    set('units', x.units); if (x.fico) set('fico', x.fico); if (x.address) set('address', x.address);
    if (x.txn) set('txn', /refi/i.test(x.txn) ? 'Refinance' : 'Purchase');
    if (x.occ) set('occ', x.occ);
    if (!ch) return false;
    applying = true;
    /* re-render the loan inputs (DTI tab) unless the user is typing in one of them */
    try { var ae = document.activeElement, dti = document.getElementById('dtiBody'); if (!(ae && dti && dti.contains(ae))) { var RD = G('renderDTI'); if (typeof RD === 'function') RD(); } } catch (e) {}
    try { window.RECALC && window.RECALC(); } catch (e) {}
    applying = false;
    paintChip('Loan synced from the Loan Suite');
    return true;
  }
  function readLoan() { try { return JSON.parse(localStorage.getItem(LOAN) || 'null'); } catch (e) { return null; } }
  function bootIncome(t) {
    if (typeof window.RECALC !== 'function' || !G('S')) { if ((t || 0) < 200) setTimeout(function () { bootIncome((t || 0) + 1); }, 100); return; }
    var timer = 0;
    (function wrap() {
      var base = window.RECALC; if (base.__live) return;
      var w = function () { var r = base.apply(this, arguments); clearTimeout(timer); timer = setTimeout(publishIncome, 400); return r; };
      Object.keys(base).forEach(function (k) { w[k] = base[k]; }); w.__live = true; window.RECALC = w;
      try { (0, eval)('RECALC = window.RECALC'); } catch (e) {}
    })();
    /* other wrappers (income-extras, release56) re-wrap RECALC after us: keep ours outermost-safe by re-checking */
    setInterval(function () { if (window.RECALC && !window.RECALC.__live) { var b = window.RECALC, w = function () { var r = b.apply(this, arguments); clearTimeout(timer); timer = setTimeout(publishIncome, 400); return r; }; Object.keys(b).forEach(function (k) { w[k] = b[k]; }); w.__live = true; window.RECALC = w; } }, 1500);
    applyLoan(readLoan());
    setTimeout(publishIncome, 800);
    mountChip();
  }
  window.addEventListener('storage', function (e) {
    if (e.key === LOAN && page === 'income' && e.newValue) { try { applyLoan(JSON.parse(e.newValue)); } catch (x) {} }
    if (e.key === SYNC) paintChip();
  });

  /* ------------------------------------------- a Live sync switch on the calculator */
  function mountChip() {
    if (document.getElementById('mtLiveChip')) return;
    var host = document.querySelector('.appbar .appbar-right, .appbar .right, .appbar') || document.body;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'mtLiveChip'; b.className = 'mt-live-chip no-print';
    b.addEventListener('click', function () { setOn(!on()); });
    host.appendChild(b);
    if (!document.getElementById('mtLiveCss')) {
      var s = document.createElement('style'); s.id = 'mtLiveCss';
      s.textContent = '.mt-live-chip{display:inline-flex;align-items:center;gap:7px;margin-left:8px;padding:6px 12px;border-radius:999px;border:1px solid rgba(63,207,142,.55);background:rgba(63,207,142,.12);color:#3fcf8e;font:600 12.5px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer;white-space:nowrap}' +
        '.mt-live-chip::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 0 3px rgba(63,207,142,.18)}' +
        '.mt-live-chip.off{border-color:rgba(157,176,200,.45);background:transparent;color:#9db0c8}.mt-live-chip.off::before{box-shadow:none}' +
        '.mt-live-chip:focus-visible{outline:2px solid #5aa2ff;outline-offset:2px}';
      document.head.appendChild(s);
    }
    paintChip();
  }
  var chipNote = '', chipTimer = 0;
  function paintChip(note) {
    var b = document.getElementById('mtLiveChip'); if (!b) return;
    if (note) { chipNote = note; clearTimeout(chipTimer); chipTimer = setTimeout(function () { chipNote = ''; paintChip(); }, 4000); }
    var v = on(); b.classList.toggle('off', !v);
    b.textContent = v ? (chipNote || 'Live sync on') : 'Live sync off';
    b.title = v ? 'Income and the Loan Suite update each other as you type. Click to stop.' : 'The Income Calculator and the Loan Suite are not updating each other. Click to turn live sync on.';
  }
  function kick() { if (page === 'income') { lastIncome = ''; publishIncome(); applyLoan(readLoan()); } else { publishLoan(true); } }

  window.MtLive = {on: on, set: setOn, publishLoan: publishLoan, publishIncome: publishIncome, applyLoan: applyLoan, loanRecord: loanRecord, KEY: LOAN};
  if (page === 'income') bootIncome(0); else bootSuite(0);
})();
