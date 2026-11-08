/* Mortgage Suite 55.23 - Quick, powered by the Loan Suite's own engine (assets/js engine bundle, loaded on this page).
   1. ZIP code -> estimated property taxes and insurance (the engine's ZIP / state market tables, applied to the price),
      plus estimated closing costs and cash to close from the engine's closing-cost profiles (incl. NY mortgage tax).
      Taxes and insurance fill in until you type your own figure.
   2. Construction / renovation: FHA 203(k) or Fannie Mae HomeStyle. The renovation amount, a contingency (10% by default),
      mortgage payment reserves and an estimating cushion go through the same rules as the Loan Suite (203(k) value basis,
      HomeStyle 95% of the after-repair value) to give the estimated loan amount, which the calculator then uses. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[$,%\s]/g, '')); return isFinite(n) ? n : 0; }
  function usd(v) { var n = Math.round(num(v)); return (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US'); }
  function mod(n) { try { return window.__amdGet && window.__amdGet(n); } catch (e) { return null; } }
  var KEY = 'quick.reno.v1', autoTI = {tax: null, ins: null, zip: ''};
  var R = (function () { try { return Object.assign({prog: 'none', amount: 0, cont: 10, months: 0, cushion: 5, arv: 0}, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return {prog: 'none', amount: 0, cont: 10, months: 0, cushion: 5, arv: 0}; } })();
  function saveR() { try { localStorage.setItem(KEY, JSON.stringify(R)); } catch (e) {} }

  function scenario(v, reno, cushion) {
    var D = mod('src/core/defaults'); if (!D) return null;
    var s = D.defaultScenario(), zip = ($('qZip') || {}).value || '', state = ($('qState') || {}).value || '', county = (($('qCounty') || {}).dataset || {}).raw || '';
    var M = mod('src/core/data/marketData'), z = M && zip.length === 5 ? M.lookupZip(zip) : null;
    s.zipCode = zip || s.zipCode; s.state = state || (z && z.state) || s.state; s.nyCounty = county || (z && z.county) || ''; s.isNYC = !!(z && z.isNYC);
    s.basePurchasePrice = num(v.price); s.asIsValue = num(v.price);
    s.baseDownPaymentPct = s.finalDownPaymentPct = Math.max(0, Math.min(1, num(v.downPct)));
    s.interestRate = num(v.rate) / 100; s.termYears = num(v.term) || 30;
    s.propertyTaxAmount = num(v.taxYr); s.insuranceAmount = num(v.insYr); s.hoaMonthly = num(v.hoa);
    s.loanProgram = reno ? (reno === 'hs' ? 'Conventional' : 'FHA') : (/FHA/.test(v.program) ? 'FHA' : 'Conventional');
    s.renovation = !!reno;
    if (reno) {
      var amt = num(R.amount) * (1 + (cushion ? num(R.cushion) / 100 : 0));
      s.reno.baseCost = amt; s.reno.contingencyPct = Math.max(0, num(R.cont)) / 100; s.reno.paymentReserveMonths = Math.max(0, Math.min(6, Math.round(num(R.months))));
      s.afterRepairValue = num(R.arv) || (num(v.price) + amt);
      if (reno === 'hs') { s.reno.consultant = 0; }
    } else { s.reno.baseCost = 0; s.afterRepairValue = num(v.price); }
    return s;
  }
  function run(s) { var E = mod('src/core/calc/engine'); try { return E && s ? E.runScenario(s) : null; } catch (e) { return null; } }

  /* 1. ZIP -> taxes, insurance, closing costs */
  function estimates(v) {
    var M = mod('src/core/data/marketData'), zip = ($('qZip') || {}).value || ''; if (!M || zip.length !== 5) return null;
    var z = M.lookupZip(zip); if (!z || !z.valid) return null;
    var mk = M.lookupMarket(z.state) || {}, price = num(v.price);
    /* offline fallback: when the online ZIP lookup is unavailable, fill state and county from the engine's ZIP table */
    var st = $('qState'), co = $('qCounty');
    if (st && !st.value && z.state) { st.value = z.state; if (co && !co.value && z.county) { co.value = z.county + ' County'; co.dataset.raw = z.county; }
      var msg = $('qZipMsg'); if (msg && /unavailable|offline/i.test(msg.textContent)) { msg.className = 'zipmsg'; msg.textContent = 'Found ' + z.areaLabel + ' (offline ZIP table).'; } }
    return {area: z.areaLabel, rate: z.effectiveTaxRate, per1000: mk.insurancePer1000 || 0, tax: Math.round(price * z.effectiveTaxRate), ins: Math.round(price / 1000 * (mk.insurancePer1000 || 0))};
  }
  function fillTI(c, v, est) {
    if (!est) return;
    var zip = ($('qZip') || {}).value || '', zipChanged = !!autoTI.zip && zip !== autoTI.zip, upd = {};
    var free = function (cur, lastAuto, placeholder) { return zipChanged || cur === lastAuto || (lastAuto === null && (cur === placeholder || !cur)); };
    if (free(num(v.taxYr), autoTI.tax, 7200) && num(v.taxYr) !== est.tax) upd.taxYr = est.tax;
    if (free(num(v.insYr), autoTI.ins, 1800) && num(v.insYr) !== est.ins) upd.insYr = est.ins;
    if (free(num(v.taxYr), autoTI.tax, 7200)) autoTI.tax = est.tax;
    if (free(num(v.insYr), autoTI.ins, 1800)) autoTI.ins = est.ins;
    autoTI.zip = zip;
    if (upd.taxYr != null || upd.insYr != null) { c.set(upd); try { c.refresh(); } catch (e) {} }
  }

  /* 2. construction / renovation */
  function card() {
    if ($('qReno')) return $('qReno');
    var host = $('qCalc'); if (!host) return null;
    var el = document.createElement('section'); el.id = 'qReno'; el.className = 'qreno';
    el.innerHTML = '<div class="qreno-head"><div><b>Estimates and construction / renovation</b><span>Planning estimates from the Loan Suite engine - confirm taxes with a tax bill, insurance with a quote and fees with a Loan Estimate.</span></div></div>' +
      '<div class="qreno-est" id="qEst"><div><span>Property taxes / yr</span><b id="qEstTax">—</b><small id="qEstTaxNote"></small></div><div><span>Insurance / yr</span><b id="qEstIns">—</b><small id="qEstInsNote"></small></div><div><span>Closing costs</span><b id="qEstClose">—</b><small id="qEstCloseNote"></small></div><div><span>Cash to close</span><b id="qEstCash">—</b><small>Down payment + closing costs</small></div></div>' +
      '<div class="qreno-grid">' +
      '<label>Renovation program<select id="qRProg"><option value="none">None - purchase only</option><option value="203k">FHA 203(k)</option><option value="hs">Fannie Mae HomeStyle</option></select></label>' +
      '<label>Renovation amount (contractor bid)<input id="qRAmt" inputmode="decimal" placeholder="$0"></label>' +
      '<label>Contingency (%)<input id="qRCont" inputmode="decimal"></label>' +
      '<label>Mortgage payment reserves (months, 0-6)<input id="qRMon" inputmode="numeric"></label>' +
      '<label>After-repair value <em>optional</em><input id="qRArv" inputmode="decimal" placeholder="price + renovation"></label>' +
      '<label>Estimating cushion on the renovation (%)<input id="qRCush" inputmode="decimal"></label></div>' +
      '<div id="qRBody"></div>';
    host.parentNode.insertBefore(el, host.nextSibling);
    var bind = function (id, key) { var i = $(id); i.value = key === 'prog' ? R[key] : (key === 'arv' && !num(R[key]) ? '' : (key === 'amount' ? (num(R.amount) ? usd(R.amount) : '') : String(R[key]))); i.addEventListener(key === 'prog' ? 'change' : 'input', function () { R[key] = key === 'prog' ? i.value : num(i.value); saveR(); soon(true); }); };
    bind('qRProg', 'prog'); bind('qRAmt', 'amount'); bind('qRCont', 'cont'); bind('qRMon', 'months'); bind('qRArv', 'arv'); bind('qRCush', 'cushion');
    if (!$('qRenoCss')) { var st = document.createElement('style'); st.id = 'qRenoCss'; st.textContent =
      '.qreno{margin:14px 0;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--panel);color:var(--ink)}' +
      '.qreno-head b{display:block;font-size:15px}.qreno-head span{font-size:12.5px;color:var(--mute)}' +
      '.qreno-est{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.qreno-est>div{padding:9px 11px;border:1px solid var(--line);border-radius:10px}' +
      '.qreno-est span,.qreno-out span{display:block;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--mute)}.qreno-est b{font-size:17px;font-variant-numeric:tabular-nums}.qreno-est small{display:block;font-size:11px;color:var(--mute)}' +
      '.qreno-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.qreno-grid label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--mute)}.qreno-grid em{text-transform:none;font-weight:400;font-style:normal}' +
      '.qreno-grid input,.qreno-grid select{font:600 14px/1.3 inherit;padding:8px 10px;border-radius:9px;border:1px solid var(--line);background:var(--bg);color:var(--ink);text-transform:none;letter-spacing:0}' +
      '.qreno table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}.qreno td{padding:6px 8px;border-top:1px solid var(--line)}.qreno td:last-child{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.qreno tr.tot td{font-weight:800}.qreno tr.cush td{color:var(--acc)}' +
      '.qreno .qnote{margin-top:10px;font-size:12px;color:var(--mute)}@media(max-width:760px){.qreno-est,.qreno-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}';
      document.head.appendChild(st); }
    return el;
  }
  function setT(id, v) { var e = $(id); if (e && e.textContent !== v) e.textContent = v; }
  var last = '', applied = '';
  function paint(force) {
    var c = window.QuickCalc; if (!c || !mod('src/core/calc/engine')) return;
    if (!card()) return;
    var v = c.values(), est = estimates(v);
    fillTI(c, v, est); v = c.values();
    var sig = JSON.stringify([v.price, v.downPct, v.rate, v.term, v.taxYr, v.insYr, v.hoa, v.program, ($('qZip') || {}).value, R]);
    if (!force && sig === last) return; last = sig;
    setT('qEstTax', usd(v.taxYr)); setT('qEstTaxNote', est ? (est.area + ' · ' + (100 * est.rate).toFixed(2) + '% of price') : 'Enter a ZIP code to estimate');
    setT('qEstIns', usd(v.insYr)); setT('qEstInsNote', est ? ('$' + est.per1000.toFixed(2) + ' per $1,000 of value') : '');
    var reno = R.prog !== 'none' && num(R.amount) > 0 ? R.prog : '';
    var o = run(scenario(v, reno, false));
    if (o) { setT('qEstClose', usd(o.closing.buyerClosingCosts)); setT('qEstCloseNote', (o.stateRules && o.stateRules.state ? o.stateRules.state + ' profile' : 'State profile') + (num(o.closing.mortgageRecordingTax) ? ' · incl. ' + usd(o.closing.mortgageRecordingTax) + ' mortgage tax' : ''));
      setT('qEstCash', usd(o.cash.cashToClose)); }
    var body = $('qRBody'); if (!body) return;
    if (!reno || !o) {
      body.innerHTML = R.prog !== 'none' ? '<p class="qnote">Enter the renovation amount to estimate the loan.</p>' : '';
      if (applied) { c.set({}, null); applied = ''; }
      return;
    }
    var oc = num(R.cushion) > 0 ? run(scenario(v, reno, true)) : null, RO = o.renovationOut, L = o.loan, P = o.payment;
    var fees = num(RO.finalRenovationAmount) - num(RO.baseCost) - num(RO.contingencyReserve) - num(RO.paymentReserve);
    var rows = [['Renovation amount', usd(RO.baseCost)], ['+ Contingency (' + num(R.cont) + '%)', usd(RO.contingencyReserve)], ['+ Mortgage payment reserves (' + Math.round(num(R.months)) + ' mo)', usd(RO.paymentReserve)],
      ['+ Draw fees, consultant and other financed costs', usd(fees)], ['= Renovation financed', usd(RO.finalRenovationAmount), 'tot'],
      [(reno === 'hs' ? 'Base loan (HomeStyle, up to 95% of after-repair value)' : 'Base loan (203(k) value basis)'), usd(L.maximumBaseLoan)]];
    if (num(L.ufmip)) rows.push(['+ Upfront MIP', usd(L.ufmip)]);
    rows.push(['Estimated loan amount', usd(L.totalLoan), 'tot']);
    if (oc) rows.push(['With a ' + num(R.cushion) + '% cushion on the renovation' + (Math.round(num(oc.loan.totalLoan)) <= Math.round(num(L.totalLoan)) ? ' (program maximum reached)' : ''), usd(oc.loan.totalLoan), 'cush']);
    rows.push(['Estimated payment (PITI + MI)', usd(P.totalMonthlyPayment)]);
    var warn = (o.warnings || []).filter(function (w) { return w && (w.severity === 'blocking' || w.level === 'error' || w.blocking); }).map(function (w) { return w.message || w.text || ''; }).filter(Boolean).slice(0, 2);
    body.innerHTML = '<table>' + rows.map(function (r) { return '<tr class="' + (r[2] || '') + '"><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('') + '</table>' +
      '<p class="qnote">The calculator above now prices this renovation loan.' + (warn.length ? ' ' + warn.join(' ') : '') + ' Open the Full Suite for the line-by-line renovation worksheet and draw schedule.</p>';
    var ext = {base: num(L.maximumBaseLoan), loan: num(L.totalLoan), upfront: num(L.ufmip), upfrontLabel: num(L.ufmip) ? 'Upfront MIP' : '',
      miMonthly: num(P.monthlyFhaMip) || num(P.monthlyPmi), miLabel: num(P.monthlyFhaMip) ? 'FHA MIP' : (num(P.monthlyPmi) ? 'PMI' : ''), miLife: !!num(P.monthlyFhaMip), miUntilLtv: num(P.monthlyPmi) ? 0.78 : 0, miMonths: 0};
    var es = JSON.stringify(ext);
    if (es !== applied) { applied = es; c.set({program: reno === 'hs' ? 'Conventional' : 'FHA'}, ext); }
  }
  var q = 0; function soon(f) { if (q) return; q = requestAnimationFrame(function () { q = 0; paint(f); }); }
  var tries = 0; (function boot() {
    if (window.QuickCalc && mod('src/core/calc/engine')) { paint(true); setInterval(function () { if (!document.hidden) paint(false); }, 700); ['qZip', 'qState'].forEach(function (id) { var e = $(id); e && e.addEventListener('change', function () { setTimeout(function () { soon(true); }, 900); }); }); return; }
    if (tries++ < 120) setTimeout(boot, 120);
  })();
  window.QuickEngine = {paint: function () { paint(true); }, state: R, scenario: scenario, run: run};
})();
