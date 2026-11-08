/* Mortgage Suite 55.18 - Loan Suite page header, done lighter.
   1. Summary cards: one slim row (total loan, payment, cash to close, back-end DTI) with the quote presets beside it.
      It repaints only when the loan file changes, and only the text that changed - the previous cards were rebuilt
      on a one-second timer. Each card still opens the page that owns its figure.
   2. Draw fees: the banner above the page is gone; the same switch is a checkbox inside the Renovation section.
   3. Renovation amount: the setup box and "Contractor / base renovation" are one field (reno.baseCost) and now mirror
      each other while typing. */
/* 55.19: free-form dates. Date boxes are plain text: 9/15/2026, 9/15/26, 2026-09-15, 09152026, Sep 15 2026 and
   15 September 2026 are all accepted and stored as YYYY-MM-DD (the format every calculation reads). A half-typed date
   is not sent to the calculation; an unreadable one is outlined and the previous value is kept. */
(function () { /* Loan Suite free-form dates */
  'use strict';
  var MON = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
  function y4(y) { y = +y; if (y >= 100) return y; var now = new Date().getFullYear() % 100; return y <= now + 10 ? 2000 + y : 1900 + y; }
  function iso(y, m, d) { y = +y; m = +m; d = +d; if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100)) return null;
    var t = new Date(y, m - 1, d); if (t.getMonth() !== m - 1) return null; return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  function parseDate(v) {
    var s = String(v || '').trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/,/g, ' ').replace(/\s+/g, ' ');
    if (!s) return '';
    var m;
    if ((m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(s))) return iso(m[1], m[2], m[3]);
    if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2}|\d{4})$/.exec(s))) return iso(y4(m[3]), m[1], m[2]);
    if ((m = /^(\d{2})(\d{2})(\d{4})$/.exec(s))) return iso(m[3], m[1], m[2]);
    if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s)) && +m[1] > 1900) return iso(m[1], m[2], m[3]);
    if ((m = /^([a-z]{3,9})\.? (\d{1,2}) (\d{2}|\d{4})$/.exec(s)) && MON[m[1].slice(0, 4)] || m && MON[m[1].slice(0, 3)]) return iso(y4(m[3]), MON[m[1].slice(0, 4)] || MON[m[1].slice(0, 3)], m[2]);
    if ((m = /^(\d{1,2}) ([a-z]{3,9})\.? (\d{2}|\d{4})$/.exec(s)) && (MON[m[2].slice(0, 4)] || MON[m[2].slice(0, 3)])) return iso(y4(m[3]), MON[m[2].slice(0, 4)] || MON[m[2].slice(0, 3)], m[1]);
    return null;
  }
  window.mtParseDate = window.mtParseDate || parseDate;
  var PASS = '__mtDatePass';
  var SEL = 'input[data-date], #suite-root input[data-path$="Date"], #suite-root input[data-path$="date"], #suite-root .v25-topbar input[type=text][placeholder*="YYYY"], #suite-root .v25-topbar input[type=text][value^="20"][value*="-"]';
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t || !t.matches || !t.matches(SEL) || e[PASS]) return;
    var v = parseDate(t.value);
    if (v === null || (v && v !== t.value)) e.stopImmediatePropagation();     /* not finished, or not yet in stored form */
  }, true);
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.matches || !t.matches(SEL)) return;
    var v = parseDate(t.value);
    if (v === null) { t.style.outline = '2px solid #e0533d'; t.title = 'Could not read this date - try MM/DD/YYYY'; e.stopImmediatePropagation(); return; }
    t.style.outline = ''; t.title = '';
    if (t.value !== v) t.value = v;
    { var ev = new Event('input', {bubbles: true}); ev[PASS] = 1; t.dispatchEvent(ev); }   /* the Loan Suite saves on input events attached in code */
  }, true);
})();

(function () {
  'use strict';
  if (window.__mtCards) return; window.__mtCards = true;
  var $ = function (id) { return document.getElementById(id); };
  function store() { try { return window.mortgageSuite && window.mortgageSuite.store; } catch (e) { return null; } }
  function outs() { var s = store(); try { var o = s && s.outputs; return typeof o === 'function' ? o.call(s) : o; } catch (e) { return null; } }
  function N(v) { v = parseFloat(v); return isFinite(v) ? v : 0; }
  function usd(v) { var n = N(v); return (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US'); }
  function pct(v) { var n = N(v); if (Math.abs(n) <= 1.5) n *= 100; return n.toFixed(1) + '%'; }
  document.documentElement.classList.add('mt-fastcards');

  var PRESETS = [['fha35', 'FHA 3.5%'], ['conv5', 'Conventional 5%'], ['fha203', 'FHA 203(k)'], ['convhs', 'HomeStyle']];
  var CARDS = [['loan', 'Total loan', 'MAX MORTGAGE'], ['pay', 'Monthly payment', 'QUOTE'], ['cash', 'Cash to close', 'CLOSING'], ['dti', 'Back-end DTI', 'QUALIFY']];
  function go(key) {
    try { if (window.V50 && V50.go) { V50.go(key); return; } } catch (e) {}
    var t = Array.prototype.find.call(document.querySelectorAll('#suite-root .tabs .tab'), function (el) { return (el.getAttribute('data-v50-key') || '').toUpperCase() === key; });
    if (t) t.click();
  }
  function build() {
    var el = document.createElement('div'); el.id = 'mtTop'; el.className = 'mt-top no-print';
    el.innerHTML = '<div class="mt-kpis">' + CARDS.map(function (c) {
      return '<button type="button" class="mt-kpi" data-go="' + c[2] + '" data-k="' + c[0] + '"><span>' + c[1] + '</span><b data-v="' + c[0] + '">—</b><small data-s="' + c[0] + '"></small></button>';
    }).join('') + '</div><div class="mt-presets" role="group" aria-label="Quote presets">' +
      PRESETS.map(function (p) { return '<button type="button" class="mt-pill" data-preset="' + p[0] + '">' + p[1] + '</button>'; }).join('') +
      '<button type="button" class="mt-pill mt-act" data-switch>Switch program</button><button type="button" class="mt-pill mt-act" data-compare>Compare both</button></div>';
    el.addEventListener('click', function (e) {
      var k = e.target.closest('[data-go]'), p = e.target.closest('[data-preset]');
      if (k) return go(k.getAttribute('data-go'));
      if (p) { try { window.V48 && V48.preset && V48.preset(p.getAttribute('data-preset')); } catch (x) {} return soon(); }
      var s = store(); if (!s) return;
      if (e.target.closest('[data-switch]')) { var to = /fha/i.test(s.activeInputs.loanProgram || '') ? 'Conventional' : 'FHA'; try { s.switchProgram(to); } catch (x) {} return soon(); }
      if (e.target.closest('[data-compare]')) { try { if (s.compareProgramScenario) { s.compareProgramScenario(); go('SCENARIOS'); } } catch (x) {} }
    });
    return el;
  }
  var cache = {};
  function setText(el, sel, v) { var n = el.querySelector(sel); if (n && cache[sel] !== v) { cache[sel] = v; n.textContent = v; } }
  function paint() {
    var host = document.querySelector('#suite-root .cols-main .v31-main'); if (!host) return false;
    var el = $('mtTop'); if (!el) { el = build(); cache = {}; }
    var anchor = $('v50Top');                       /* keep the slim row where the old cards were */
    var want = anchor && anchor.parentNode === host ? anchor.nextSibling : host.firstChild;
    if (el.parentNode !== host || (el !== want && el.previousSibling !== anchor)) host.insertBefore(el, want);
    var o = outs(), i = (store() || {}).activeInputs; if (!o || !i) return true;
    var L = o.loan || {}, P = o.payment || {}, C = o.cash || {}, A = o.aus || {}, fha = /fha/i.test(i.loanProgram || '');
    setText(el, '[data-v="loan"]', usd(L.totalLoan));
    setText(el, '[data-s="loan"]', fha ? 'Base ' + usd(L.maximumBaseLoan) + ' + UFMIP ' + usd(L.ufmip) : 'Base loan, no upfront fee');
    setText(el, '[data-v="pay"]', usd(P.totalMonthlyPayment));
    setText(el, '[data-s="pay"]', 'P&I ' + usd(P.principalAndInterest) + ' · ' + (fha ? 'MIP ' + usd(P.monthlyFhaMip) : N(P.monthlyPmi) ? 'PMI ' + usd(P.monthlyPmi) : 'no MI'));
    setText(el, '[data-v="cash"]', usd(C.cashToClose));
    setText(el, '[data-s="cash"]', N(C.emdCreditApplied) ? 'After ' + usd(C.emdCreditApplied) + ' deposit' : 'After credits and deposits');
    var hasInc = N(A.totalQualifyingIncome) > 0;
    setText(el, '[data-v="dti"]', hasInc ? pct(A.backEndDti) : 'Enter income');
    setText(el, '[data-s="dti"]', hasInc ? 'Front ' + pct(A.frontEndDti) + ' · cap ' + pct(A.backEndLimit) : 'From the Income Calculator');
    var over = hasInc && N(A.backEndLimit) > 0 && N(A.backEndDti) > N(A.backEndLimit), dc = el.querySelector('[data-k="dti"]');
    dc.classList.toggle('warn', !hasInc || over);
    var reno = !!i.renovation, active = fha && !reno ? 'fha35' : !fha && !reno ? 'conv5' : fha ? 'fha203' : 'convhs';
    if (cache.preset !== active) { cache.preset = active; Array.prototype.forEach.call(el.querySelectorAll('[data-preset]'), function (b) { b.classList.toggle('on', b.getAttribute('data-preset') === active); }); }
    setText(el, '[data-switch]', fha ? 'Switch to Conventional (+0.375%)' : 'Switch to FHA (−0.375%)');
    return true;
  }

  /* draw fees: the option lives in the Renovation section */
  function drawFeeOption() {
    var s = store(); if (!s) return;
    var card = Array.prototype.find.call(document.querySelectorAll('#suite-root .card'), function (c) { var h = c.querySelector('h3'); return h && /^\W*Renovation\b/.test(h.textContent.trim()) && !/program setup/i.test(h.textContent) && c.id !== 'v21RenoGate' && c.offsetParent; });
    var box = $('mtDrawFees');
    if (!card) { return; }
    if (!box || !card.contains(box)) {
      if (box) box.remove();
      box = document.createElement('label'); box.id = 'mtDrawFees'; box.className = 'mt-drawfees no-print';
      box.innerHTML = '<input type="checkbox"> <span><b>Auto-calculate title &amp; inspection draw fees</b> from the draw plan <em>(off = the fees are entered by hand)</em></span>';
      var h = card.querySelector('h3'); h && h.nextSibling ? card.insertBefore(box, h.nextSibling) : card.appendChild(box);
      box.querySelector('input').addEventListener('change', function () {
        var on = this.checked, cur = !!((s.activeInputs.reno || {}).syncDrawFees), badge = $('v5SyncBadge');
        if (on === cur) return;
        if (badge) badge.click(); else { try { s.setField('reno.syncDrawFees', on, 'Draw fees'); } catch (e) {} }
        setTimeout(drawFeeOption, 60);
      });
    }
    var cb = box.querySelector('input'), on = !!((s.activeInputs.reno || {}).syncDrawFees);
    if (cb.checked !== on) cb.checked = on;
  }

  /* renovation amount: the setup box and the contractor base box are the same field - mirror them while typing */
  var AMOUNT = '#suite-root input[onchange*="reno.baseCost"], #suite-root input[data-path="reno.baseCost"]';
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t.matches || !t.matches(AMOUNT)) return;
    Array.prototype.forEach.call(document.querySelectorAll(AMOUNT), function (o) { if (o !== t && o.value !== t.value) o.value = t.value; });
  }, true);
  function syncAmounts() {
    var s = store(); if (!s) return; var v = N((s.activeInputs.reno || {}).baseCost);
    Array.prototype.forEach.call(document.querySelectorAll(AMOUNT), function (o) {
      if (document.activeElement === o) return;
      if (N(String(o.value).replace(/[$,\s]/g, '')) !== v) o.value = String(v);
    });
  }

  var queued = false;
  function soon() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; paint(); drawFeeOption(); syncAmounts(); }); }
  var tries = 0;
  (function boot() {
    var s = store();
    if (s && s.subscribe && paint()) {
      try { s.subscribe(soon); } catch (e) {}
      soon();
      /* page switches inside the Full Suite re-render sections without a store change */
      document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#suite-root .tabs .tab, #lseNav a, #v23SuitePrimaryNav button')) setTimeout(soon, 120); }, true);
      setInterval(function () { if (!document.hidden && !$('mtTop')) soon(); }, 2000);
      return;
    }
    if (tries++ < 160) setTimeout(boot, 150);
  })();
  window.MtCards = {paint: paint, refresh: soon};
})();
