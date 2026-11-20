/* 57.21: clicking a Live Summary figure (or a stat card, or a Simple-screen summary figure) opens a quick popup first:
   the inputs behind that figure, editable in place - everything recalculates as you type - and "Go to section" for the
   full page. Also keeps the loan file live across browser tabs: a change on the Renovation page in one tab shows on the
   Encompass worksheet in another (and every other page) without a reload. */
(function () {
  'use strict';
  if (window.__mtQuickEdit) return; window.__mtQuickEdit = true;
  var $ = function (id) { return document.getElementById(id); };
  function store() { try { return window.mortgageSuite.store; } catch (e) { return null; } }
  function N(v) { if (typeof v === 'number') return isFinite(v) ? v : 0; var t = String(v == null ? '' : v).trim(), n = parseFloat(t.replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function get(o, p) { return String(p).split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function money(v) { return v == null || v === '' ? '' : Number(v).toLocaleString('en-US', {maximumFractionDigits: 2}); }

  /* path: [label, kind, options] - kind: money | pct (stored as a fraction) | int | text | select | yesno | check */
  var F = {
    basePurchasePrice: ['Purchase price', 'money'], transactionType: ['Transaction', 'select', ['Purchase', 'Refinance']],
    finalDownPaymentPct: ['Down payment', 'pct'], loanProgram: ['Program', 'select', ['FHA', 'Conventional']],
    occupancy: ['Occupancy', 'select', ['Primary Residence', 'Second Home', 'Investment']], units: ['Units', 'int'],
    renovation: ['Renovation loan', 'yesno'], renovationScope: ['Renovation type', 'scope'],
    'reno.baseCost': ['Renovation budget', 'money'], 'reno.contingencyPct': ['Contingency', 'pct'], 'reno.consultant': ['203(k) consultant fee', 'money'],
    'reno.architectural': ['Architect / engineer', 'money'], 'reno.permits': ['Permits', 'money'], 'reno.inspectionFees': ['Inspection fees', 'money'],
    'reno.titleUpdateFees': ['Title update fees', 'money'], 'reno.paymentReserveMonths': ['Payment reserve (months)', 'int'], 'draws.manualDrawCount': ['Number of draws', 'int'],
    asIsValue: ['As-is value', 'money'], afterRepairValue: ['After-repair value', 'money'],
    ufmipRate: ['Upfront MIP rate', 'pct'], fhaAnnualMipRate: ['FHA annual MIP rate', 'pct'], pmiOverrideRate: ['PMI rate (blank = table)', 'pct'], creditScore: ['Credit score', 'int'],
    interestRate: ['Interest rate', 'pct'], termYears: ['Term (years)', 'select', ['10', '15', '20', '25', '30', '40']],
    propertyTaxAmount: ['Property taxes', 'money'], propertyTaxBasis: ['Taxes are', 'select', ['Annual', 'Monthly']],
    insuranceAmount: ['Homeowners insurance', 'money'], insuranceBasis: ['Insurance is', 'select', ['Annual', 'Monthly']],
    hoaMonthly: ['HOA / month', 'money'], 'escrow.annualFlood': ['Flood insurance / year', 'money'],
    'closing.overrides.lenderOrigination': ['Lender origination', 'money'], 'closing.overrides.lenderProcessing': ['Processing', 'money'],
    'closing.overrides.appraisal': ['Appraisal', 'money'], 'closing.overrides.creditReport': ['Credit report', 'money'],
    'closing.overrides.titleInsurance': ['Title insurance', 'money'], 'closing.overrides.titleSearchSettlement': ['Title search / settlement', 'money'],
    'closing.overrides.attorney': ['Attorney', 'money'], 'closing.overrides.inspections': ['Inspections', 'money'], 'closing.overrides.other': ['Other buyer costs', 'money'],
    'closing.originationPointsPct': ['Origination points', 'pct'], 'closing.earnestMoneyDeposit': ['Earnest money deposit', 'money'],
    sellerConcessionPct: ['Seller concession', 'pct'], sellerConcessionAmount: ['Seller concession', 'money'],
    'borrowers.0.grossMonthlyIncome': ['Borrower income / month', 'money'], 'borrowers.0.otherMonthlyIncome': ['Borrower other income / month', 'money'], 'borrowers.0.monthlyDebts': ['Borrower debts / month', 'money'],
    'borrowers.1.grossMonthlyIncome': ['Co-borrower income / month', 'money'], 'borrowers.1.monthlyDebts': ['Co-borrower debts / month', 'money'],
    'assets.liquidAssets': ['Liquid assets', 'money'], 'assets.retirementOtherAssets': ['Retirement / other assets', 'money'], 'assets.giftFunds': ['Gift funds', 'money'],
    zipCode: ['ZIP code', 'text'], isNYC: ['In New York City', 'check']
  };
  var RENO = ['renovation', 'renovationScope', 'reno.baseCost', 'reno.contingencyPct', 'reno.consultant', 'reno.architectural', 'reno.permits', 'reno.inspectionFees', 'reno.titleUpdateFees', 'reno.paymentReserveMonths', 'draws.manualDrawCount'];
  var CLOSING = ['closing.overrides.lenderOrigination', 'closing.overrides.lenderProcessing', 'closing.overrides.appraisal', 'closing.overrides.creditReport', 'closing.overrides.titleInsurance', 'closing.overrides.titleSearchSettlement', 'closing.overrides.attorney', 'closing.overrides.inspections', 'closing.overrides.other', 'closing.originationPointsPct'];
  var HOUSING = ['propertyTaxAmount', 'propertyTaxBasis', 'insuranceAmount', 'insuranceBasis', 'hoaMonthly', 'escrow.annualFlood'];
  var INCOME = ['borrowers.0.grossMonthlyIncome', 'borrowers.0.otherMonthlyIncome', 'borrowers.0.monthlyDebts', 'borrowers.1.grossMonthlyIncome', 'borrowers.1.monthlyDebts'];
  var CONC = '@concession';
  /* first match wins: [test on the figure's name, inputs, a line on how the figure is made] */
  var GROUPS = [
    [/blocking|warning/, [], 'Open the section to see each warning.'],
    [/mortgage insurance|\bmip\b|\bpmi\b/, ['loanProgram', 'fhaAnnualMipRate', 'pmiOverrideRate', 'creditScore', 'finalDownPaymentPct'], 'Monthly MI on the total loan at the program rate.'],
    [/ufmip|upfront/, ['ufmipRate', 'loanProgram', 'finalDownPaymentPct'], 'Upfront MIP = base loan x the upfront rate, financed into the loan.'],
    [/total loan|loan amount/, ['basePurchasePrice', 'finalDownPaymentPct', 'reno.baseCost', 'ufmipRate', 'afterRepairValue'], 'Base loan plus financed upfront MIP.'],
    [/maximum base|required investment|minimum investment|\bltv\b/, ['basePurchasePrice', 'finalDownPaymentPct', 'asIsValue', 'afterRepairValue', 'reno.baseCost', 'loanProgram'], 'Limited by the program maximum on the lower of cost and value.'],
    [/after-repair|arv|value basis|value ratio/, ['asIsValue', 'afterRepairValue', 'basePurchasePrice', 'reno.baseCost'], 'Cost (price + renovation) against the after-repair value.'],
    [/renovation|program budget/, RENO, 'Repairs + contingency + fees and reserves that are financed.'],
    [/purchase price|final price/, ['basePurchasePrice', 'transactionType', CONC, 'finalDownPaymentPct'], ''],
    [/plus closing|closing costs/, CLOSING, 'Lender, title and third-party fees plus prepaids.'],
    [/cash to close|remaining cash|seller credit|earnest|cushion/, ['finalDownPaymentPct', CONC, 'closing.earnestMoneyDeposit', 'closing.originationPointsPct', 'closing.overrides.titleInsurance'], 'Down payment / required investment + closing costs - credits and deposits.'],
    [/interest rate|payment range/, ['interestRate', 'termYears', 'loanProgram'], ''],
    [/principal/, ['interestRate', 'termYears', 'basePurchasePrice', 'finalDownPaymentPct'], 'Payment on the total loan at the note rate and term.'],
    [/tax|insurance/, HOUSING, 'Monthly escrow for taxes, insurance and flood, plus HOA.'],
    [/total payment|monthly payment|amortization/, ['interestRate', 'termYears', 'propertyTaxAmount', 'insuranceAmount', 'hoaMonthly', 'fhaAnnualMipRate'], 'Principal & interest + MI + taxes & insurance + HOA.'],
    [/score|credit/, ['creditScore'], 'The representative (middle) score used for pricing and MI.'],
    [/dti|front|back/, INCOME, 'Housing payment and debts divided by gross monthly income.'],
    [/reserve/, ['assets.liquidAssets', 'assets.retirementOtherAssets', 'assets.giftFunds'], 'Assets left after cash to close, in months of payment.'],
    [/program/, ['loanProgram', 'transactionType', 'occupancy', 'units', 'renovation'], ''],
    [/new york|high-cost|county|limit/, ['zipCode', 'isNYC', 'units'], 'Loan limits and taxes come from the property location.']
  ];
  var SIMPLE = {payment: ['Monthly payment', 'loan'], loan: ['Total loan', 'loan'], cash: ['Cash to close', 'closing'], dti: ['DTI', 'qualify']};
  function groupFor(label) { var t = String(label || '').toLowerCase(); for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][0].test(t)) return GROUPS[i]; return null; }

  function inputs() { var s = store(); return (s && s.activeInputs) || {}; }
  function resolve(path) { if (path !== CONC) return path; return inputs().concessionInputMode === 'amount' ? 'sellerConcessionAmount' : 'sellerConcessionPct'; }
  function scopeOptions() { var p = inputs().loanProgram; return p === 'FHA' ? ['Auto', '203(k) Limited', '203(k) Standard'] : p === 'Conventional' ? ['Auto', 'HomeStyle'] : ['Auto']; }
  function fieldHtml(path) {
    var d = F[path]; if (!d) return '';
    var k = d[1], id = 'qe-' + path.replace(/\W/g, '-'), at = ' id="' + id + '" data-qe="' + path + '" data-k="' + k + '"', ctl;
    if (k === 'select' || k === 'scope') ctl = '<select' + at + '>' + (k === 'scope' ? scopeOptions() : d[2]).map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>';
    else if (k === 'yesno') ctl = '<select' + at + '><option value="yes">Yes</option><option value="no">No</option></select>';
    else if (k === 'check') ctl = '<input type="checkbox"' + at + '>';
    else ctl = '<span class="qe-in' + (k === 'pct' ? ' pct' : k === 'money' ? ' usd' : '') + '"><input' + at + ' inputmode="' + (k === 'text' ? 'text' : 'decimal') + '" autocomplete="off"></span>';
    return '<label class="qe-row" for="' + id + '"><span>' + esc(d[0]) + '</span>' + ctl + '</label>';
  }
  function show(el) {
    var path = el.getAttribute('data-qe'), k = el.getAttribute('data-k'), v = get(inputs(), path);
    if (path === 'renovation') v = v ? 'yes' : 'no';
    if (k === 'check') { el.checked = !!v; return; }
    if (v == null || v === '') { el.value = ''; return; }
    if (k === 'pct') el.value = String(+(N(v) * 100).toFixed(4));
    else if (k === 'money') el.value = money(v);
    else el.value = String(v);
  }
  function read(el) {
    var k = el.getAttribute('data-k'), v = el.value;
    if (k === 'check') return el.checked;
    if (k === 'yesno') return v === 'yes';
    if (k === 'money') return v.trim() === '' ? null : N(v);
    if (k === 'int') return v.trim() === '' ? null : Math.round(N(v));
    if (k === 'pct') return v.trim() === '' ? null : N(v) / 100;
    if (el.getAttribute('data-qe') === 'termYears') return +v;
    return v;
  }
  function commit(el) {
    var s = store(); if (!s) return;
    var path = el.getAttribute('data-qe'), v = read(el), cur = get(inputs(), path);
    if (path === 'renovation' ? !!cur === v : (cur === v || (typeof v === 'number' && Math.abs(N(cur) - v) < 1e-9 && cur != null))) return;
    try { s.setField(path, v, 'Quick edit'); } catch (e) {}
  }

  /* ---------- the popup ---------- */
  var box = null, cur = null, unsub = null;   /* unsub stays null: the store keeps one listener for the popup */
  function css() {
    if ($('mtQECss')) return; var st = document.createElement('style'); st.id = 'mtQECss';
    st.textContent =
      '#mtQE{position:fixed;z-index:2147483000;width:340px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;background:#0b1f3f;color:#e6eefb;border:1px solid #2b5590;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:13px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;animation:mtqeIn .14s ease-out}' +
      '@keyframes mtqeIn{from{opacity:0;transform:translateY(4px) scale(.98)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){#mtQE{animation:none}}' +
      '#mtQE .qe-h{display:flex;align-items:baseline;gap:8px;padding:11px 12px 4px}#mtQE .qe-h b{font-size:13.5px;flex:1}#mtQE .qe-h .qe-v{font-size:17px;font-weight:800;color:#7fb2ff;font-variant-numeric:tabular-nums}' +
      '#mtQE .qe-x{border:0;background:none;color:#9db0c8;font-size:20px;line-height:1;cursor:pointer;padding:0 2px}#mtQE .qe-x:hover{color:#fff}' +
      '#mtQE .qe-how{padding:0 12px 6px;color:#9db0c8;font-size:12px}#mtQE .qe-f{padding:4px 12px 6px;display:grid;gap:5px}' +
      '#mtQE .qe-row{display:grid;grid-template-columns:1fr 132px;align-items:center;gap:8px;margin:0;font-size:12.5px;color:#cfdcef;text-transform:none;letter-spacing:0}' +
      '#mtQE input,#mtQE select{box-sizing:border-box;width:100%;height:28px!important;min-height:0!important;margin:0!important;padding:2px 7px!important;border:1px solid #2b5590!important;border-radius:6px!important;background:#06142e!important;color:#e6eefb!important;font:inherit!important;font-size:13px!important;box-shadow:none!important}' +
      '#mtQE input[type=checkbox]{width:16px;height:16px!important;justify-self:end;accent-color:#7fb2ff}#mtQE input:focus,#mtQE select:focus{outline:2px solid #7fb2ff;outline-offset:0}' +
      '#mtQE .qe-in{position:relative;display:block}#mtQE .qe-in input{text-align:right;font-variant-numeric:tabular-nums}#mtQE .qe-in.usd input{padding-left:16px!important}#mtQE .qe-in.usd:before{content:"$";position:absolute;left:7px;top:50%;transform:translateY(-50%);color:#9db0c8;pointer-events:none;z-index:1}' +
      '#mtQE .qe-in.pct input{padding-right:20px!important}#mtQE .qe-in.pct:after{content:"%";position:absolute;right:7px;top:50%;transform:translateY(-50%);color:#9db0c8;pointer-events:none}' +
      '#mtQE .qe-a{display:flex;gap:8px;justify-content:space-between;align-items:center;padding:8px 12px 12px;border-top:1px solid rgba(43,85,144,.5);margin-top:4px}' +
      '#mtQE .qe-a button{border:1px solid #2b5590;background:transparent;color:#e6eefb;border-radius:999px;padding:6px 13px;font:600 12.5px system-ui,sans-serif;cursor:pointer}#mtQE .qe-a .qe-go{background:#226ccc;border-color:#226ccc;color:#fff}#mtQE .qe-a button:hover{filter:brightness(1.15)}' +
      '#mtQE .qe-none{color:#9db0c8;padding:2px 0 4px}#mtQE .qe-saved{color:#7ff0b1;font-size:11.5px;min-height:14px}' +
      'html[data-mt-mode="light"] #mtQE{background:#fff;color:#13263d;border-color:#c9d6e6}html[data-mt-mode="light"] #mtQE input,html[data-mt-mode="light"] #mtQE select{background:#fff!important;color:#13263d!important;border-color:#c9d6e6!important}html[data-mt-mode="light"] #mtQE .qe-row{color:#3a4d63}html[data-mt-mode="light"] #mtQE .qe-a button{color:#13263d;border-color:#c9d6e6}html[data-mt-mode="light"] #mtQE .qe-a .qe-go{color:#fff}';
    document.head.appendChild(st);
  }
  function figureValue() {
    if (!cur) return '';
    if (cur.fig) { var f = document.querySelector('#qSum [data-fig="' + cur.fig + '"] b'); return f ? f.textContent : ''; }
    var rows = document.querySelectorAll('.v35-live-row[data-v35-label]');
    for (var i = 0; i < rows.length; i++) if (rows[i].getAttribute('data-v35-label') === cur.label && rows[i].offsetParent) { var b = rows[i].querySelector('b'); if (b) return b.textContent; }
    return cur.value || '';
  }
  function refresh() {
    if (!box) return;
    var v = box.querySelector('.qe-v'); if (v) v.textContent = figureValue();
    var a = document.activeElement;
    var sc = box.querySelector('[data-k="scope"]'); if (sc && sc !== a) { var want = scopeOptions(); if ([].map.call(sc.options, function (o) { return o.value; }).join() !== want.join()) sc.innerHTML = want.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join(''); }
    box.querySelectorAll('[data-qe]').forEach(function (el) { if (el !== a) show(el); });
  }
  function close() {
    if (!box) return;
    clearInterval(box.__iv); box.remove(); box = null;
    if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
    var back = cur && cur.el; cur = null;
    if (back && back.isConnected) try { back.focus({preventScroll: true}); } catch (e) {}
  }
  function place(anchor) {
    var r = anchor.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight, vw = innerWidth, vh = innerHeight, left, top;
    if (r.left - w - 12 >= 8) { left = r.left - w - 10; top = r.top + r.height / 2 - 40; }
    else if (r.right + w + 12 <= vw) { left = r.right + 10; top = r.top + r.height / 2 - 40; }
    else { left = Math.min(Math.max(8, r.left), vw - w - 8); top = r.bottom + 8; if (top + h > vh - 8) top = r.top - h - 8; }
    box.style.left = Math.round(left) + 'px'; box.style.top = Math.round(Math.min(Math.max(8, top), vh - h - 8)) + 'px';
  }
  function open(anchor, info) {
    close(); css();
    var g = groupFor(info.label), paths = g ? g[1].map(resolve) : [];
    cur = {el: anchor, label: info.label, fig: info.fig, value: info.value, go: info.go};
    box = document.createElement('div'); box.id = 'mtQE'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', info.label + ' - quick edit');
    box.innerHTML = '<div class="qe-h"><b>' + esc(info.label) + '</b><span class="qe-v"></span><button type="button" class="qe-x" aria-label="Close">×</button></div>' +
      (g && g[2] ? '<div class="qe-how">' + esc(g[2]) + '</div>' : '') +
      '<div class="qe-f">' + (paths.length ? paths.map(fieldHtml).join('') : '<div class="qe-none">Nothing to change here directly - open the section for the detail.</div>') + '<div class="qe-saved" aria-live="polite"></div></div>' +
      '<div class="qe-a"><button type="button" class="qe-done">Done</button><button type="button" class="qe-go">Go to section →</button></div>';
    document.body.appendChild(box);
    refresh(); place(anchor);
    /* the summary redraws a moment after each change: keep the headline figure in step with it */
    box.__iv = setInterval(function () { var v = box && box.querySelector('.qe-v'), t = figureValue(); if (v && t && v.textContent !== t) v.textContent = t; }, 250);
    var s = store();
    if (s && s.subscribe && !s.__mtQE) { s.__mtQE = true; s.subscribe(function () { if (!box) return; clearTimeout(refresh.t); refresh.t = setTimeout(refresh, 60); }); }
    var timer = 0, saved = box.querySelector('.qe-saved');
    var done = function (el) { commit(el); saved.textContent = 'Updated - ' + (F[el.getAttribute('data-qe')] || [''])[0]; clearTimeout(done.t); done.t = setTimeout(function () { if (saved) saved.textContent = ''; }, 1600); };
    box.addEventListener('input', function (e) { var el = e.target.closest('[data-qe]'); if (!el || el.tagName === 'SELECT' || el.type === 'checkbox') return; clearTimeout(timer); timer = setTimeout(function () { done(el); }, 450); });
    box.addEventListener('change', function (e) { var el = e.target.closest('[data-qe]'); if (!el) return; clearTimeout(timer); done(el); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); clearTimeout(timer); done(e.target); }
    });
    box.addEventListener('click', function (e) {
      if (e.target.closest('.qe-x') || e.target.closest('.qe-done')) { close(); return; }
      if (e.target.closest('.qe-go')) { var go = cur && cur.go; close(); if (go) go(); }
    });
    var first = box.querySelector('input:not([type=checkbox]),select'); if (first) try { first.focus({preventScroll: true}); if (first.select) first.select(); } catch (e) {}
  }
  var bypass = false;
  function goRow(label) {
    var run = function () {
      var rows = [].slice.call(document.querySelectorAll('.v35-live-row[data-v35-label]')).filter(function (r) { return r.getAttribute('data-v35-label') === label; });
      var r = rows.filter(function (x) { return x.offsetParent; })[0] || rows[0]; if (!r) return;
      bypass = true; try { r.click(); } finally { bypass = false; }
    };
    if (window.MTEncompass && MTEncompass.isOpen && MTEncompass.isOpen()) { MTEncompass.setView('advanced'); setTimeout(run, 120); } else run();
  }
  window.addEventListener('click', function (e) {
    if (bypass || e.defaultPrevented) return;
    if (e.target.closest && e.target.closest('#mtQE')) return;
    var row = e.target.closest && e.target.closest('.v35-live-row[data-v35-label]');
    if (row) {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;   /* modifier click: straight to the section, as before */
      e.preventDefault(); e.stopImmediatePropagation();
      var label = row.getAttribute('data-v35-label'), b = row.querySelector('b');
      open(row, {label: label, value: b ? b.textContent : '', go: function () { goRow(label); }});
      return;
    }
    var fig = e.target.closest && e.target.closest('#qSum [data-fig]');
    if (fig && SIMPLE[fig.getAttribute('data-fig')]) {
      var m = SIMPLE[fig.getAttribute('data-fig')];
      open(fig, {label: m[0], fig: fig.getAttribute('data-fig'), go: function () { var b = document.querySelector('#quote57 [data-act="go"][data-s="' + m[1] + '"]'); if (b) b.click(); }});
      return;
    }
    if (box && !e.target.closest('#mtQE')) close();
  }, true);   /* on window, so it runs before the suite's own handlers */
  window.addEventListener('resize', function () { if (box && cur && cur.el && cur.el.isConnected) place(cur.el); });
  document.addEventListener('scroll', function (e) { if (box && cur && cur.el && cur.el.isConnected && !(e.target && e.target.closest && e.target.closest('#mtQE'))) place(cur.el); }, {passive: true, capture: true});
  /* the Simple-screen figures read as buttons too */
  (function markFigs() {
    var st = document.createElement('style'); st.textContent = '#qSum [data-fig]{cursor:pointer;border-radius:10px;transition:background .12s}#qSum [data-fig]:hover{background:rgba(127,178,255,.08)}';
    (document.head || document.documentElement).appendChild(st);
  })();

  /* ---------- the loan file, live across tabs ---------- */
  var pending = null;
  function strip(o) { return JSON.stringify(o, function (k, v) { return /updatedAt$|appliedAt$|^v503Auto/.test(k) ? undefined : v; }); }
  function applyRemote() {
    if (!pending) return;
    var a = document.activeElement;
    if (!document.hidden && a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && !(a.closest && a.closest('#mtQE'))) { clearTimeout(applyRemote.t); applyRemote.t = setTimeout(applyRemote, 700); return; }
    var raw = pending; pending = null;
    var s = store(); if (!s || !s.state) return;
    var next; try { next = JSON.parse(raw); } catch (e) { return; }
    if (!next || !next.scenarios || next.schemaVersion !== s.state.schemaVersion) return;
    if (strip(next.scenarios) === strip(s.state.scenarios) && next.activeScenarioId === s.state.activeScenarioId) return;
    ['scenarios', 'activeScenarioId', 'borrowers', 'properties', 'compareIds'].forEach(function (k) { if (k in next) s.state[k] = next[k]; });
    try { s.cacheKey = ''; s.cachedOutputs = null; } catch (e) {}
    /* through setField, so every page add-on (summary, cards, checks) redraws the way it does for a typed change */
    try { var pj = s.activeInputs.projection; s.setField('projection.years', pj ? pj.years : 5, 'Another tab'); } catch (e) { try { s.emit(); } catch (x) {} }
  }
  window.addEventListener('storage', function (e) {
    var s = store(); if (!s || !s.storageKey || e.key !== s.storageKey || !e.newValue) return;
    pending = e.newValue; clearTimeout(applyRemote.t); applyRemote.t = setTimeout(applyRemote, 60);
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && pending) applyRemote(); });
  window.MTQuickEdit = {open: open, close: close, groups: GROUPS};
})();
