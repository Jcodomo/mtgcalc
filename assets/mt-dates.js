/* Mortgage Suite 57.20 - dates you can set yourself in Taxes & Proration, Escrow and the tax impounds, plus a
   Transfer Tax Calculator.
   - Taxes & Escrow (proration): the closing date and the first payment date follow the loan file automatically; type a
     date to override it, "Use the loan file's date" goes back. A "Custom due dates" billing cycle takes your own
     instalment dates and shares.
   - Date-driven escrow card (Closing / Escrow): closing, first payment and first tax due are boxes you can type in;
     a typed first payment or first tax due date switches that one to custom, "Auto" switches it back.
   - Transfer Tax Calculator: under the proration card - state, NYC, price; transfer tax, mansion tax and who pays,
     from the same tables the Loan Suite uses. */
(function () {
  'use strict';
  if (window.MTDates) return;
  var $ = function (id) { return document.getElementById(id); };
  function suite() { try { return window.mortgageSuite.store; } catch (e) { return null; } }
  function N(v) { var t = String(v == null ? '' : v).trim(), neg = /^\(.*\)$|^-|-$/.test(t), n = parseFloat(t.replace(/[^0-9.]/g, '')); return isFinite(n) ? (neg ? -n : n) : 0; }
  function usd(v) { var n = N(v); return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  var MON = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  /* typed dates: 9/15/2026, 9/15/26, 2026-09-15, 09152026, Sep 15 2026, 15 September 2026, today, +30 */
  function iso(txt) {
    var t = String(txt || '').trim().toLowerCase().replace(/,/g, ' ').replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/\s+/g, ' '); if (!t) return '';
    var now = new Date(), m, mk = function (y, mo, d) { var x = new Date(y, mo - 1, d); return x.getFullYear() === y && x.getMonth() === mo - 1 && x.getDate() === d ? y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2) : ''; };
    var yy = function (y) { y = +y; return y < 100 ? 2000 + y : y; }, mon = function (w) { if (w.length < 3) return 0; for (var i = 0; i < 12; i++) if (MON[i].indexOf(w) === 0 || (w === 'sept' && i === 8)) return i + 1; return 0; };
    if (t === 'today') return mk(now.getFullYear(), now.getMonth() + 1, now.getDate());
    if ((m = t.match(/^([+-])\s*(\d+)$/))) { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (m[1] === '-' ? -1 : 1) * +m[2]); return mk(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
    if ((m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return mk(+m[1], +m[2], +m[3]);
    if ((m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/))) return mk(yy(m[3]), +m[1], +m[2]);
    if ((m = t.match(/^(\d{2})(\d{2})(\d{4})$/))) return mk(+m[3], +m[1], +m[2]);
    if ((m = t.match(/^([a-z]{3,})\.? (\d{1,2})(?: (\d{2}|\d{4}))?$/)) && mon(m[1])) return mk(m[3] ? yy(m[3]) : now.getFullYear(), mon(m[1]), +m[2]);
    if ((m = t.match(/^(\d{1,2}) ([a-z]{3,})\.?(?: (\d{2}|\d{4}))?$/)) && mon(m[2])) return mk(m[3] ? yy(m[3]) : now.getFullYear(), mon(m[2]), +m[1]);
    return '';
  }
  function show(d) { var m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[2] + '/' + m[3] + '/' + m[1] : String(d || ''); }
  /* month/day only (tax instalments): 12/1, Dec 1, 05-10 -> "MM-DD" */
  function md(txt) { var t = String(txt || '').trim().toLowerCase(), m; if ((m = t.match(/^(\d{1,2})[-/.](\d{1,2})$/))) { var mo = +m[1], d = +m[2]; return mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2) : ''; } var full = iso(t + (/\d{4}$/.test(t) ? '' : ' 2001')); return full ? full.slice(5) : ''; }
  function fileClosing() {
    var s = suite(); try { if (s && s.activeInputs && s.activeInputs.closingDate) return s.activeInputs.closingDate; } catch (e) {}
    try { var w = JSON.parse(localStorage.getItem('mtgcalc-shared-workflow-v1') || 'null'); if (w && w.suiteInputs && w.suiteInputs.closingDate) return w.suiteInputs.closingDate; } catch (e) {}
    return '';
  }
  function fileFirstPayment() { var s = suite(); try { var o = typeof s.outputs === 'function' ? s.outputs() : s.outputs; return (o && o.escrowOut && o.escrowOut.firstPaymentDate) || ''; } catch (e) { return ''; } }
  function css() {
    if ($('mtDatesCss')) return; var s = document.createElement('style'); s.id = 'mtDatesCss';
    s.textContent = '.mtd-src{font-size:11.5px;margin-top:4px;color:#9db0c8}.mtd-src a{color:#7fb2ff;cursor:pointer;text-decoration:underline}.mtd-src b{color:#7ff0b1;font-weight:600}.mtd-src b.cus{color:#f0c46b}' +
      '.mtd-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:12px}@media(max-width:760px){.mtd-row{grid-template-columns:1fr 1fr}}' +
      '.mtd-due{margin-top:12px;border:1px dashed #2b5590;border-radius:10px;padding:10px 12px}.mtd-due table{width:100%;border-collapse:collapse}.mtd-due td{padding:3px 6px 3px 0}.mtd-due input{width:100%}' +
      '.mtd-due .mtd-x{background:none;border:0;color:#f08080;cursor:pointer;font-size:16px}.mtd-btn{margin-top:6px;background:#123a75;color:#e6eefb;border:1px solid #2b5590;border-radius:7px;padding:5px 10px;cursor:pointer;font:inherit;font-size:12.5px}' +
      '.mtd-tt{margin-top:16px}.mtd-tt .mtd-out{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:12px}@media(max-width:760px){.mtd-tt .mtd-out{grid-template-columns:1fr 1fr}}' +
      '.mtd-esc input{width:100%;background:transparent;border:1px solid #2b5590;border-radius:6px;color:inherit;font:inherit;font-weight:700;padding:3px 6px}.mtd-esc .mtd-chip{display:inline-block;margin-top:3px;font-size:10.5px;cursor:pointer;color:#9db0c8}.mtd-esc .mtd-chip b{color:#7ff0b1}.mtd-esc .mtd-chip b.cus{color:#f0c46b}' +
      '.mtd-bad{outline:2px solid #e5484d!important}' +
      '#mtAggCard{margin-top:14px}#mtAggCard .mt-agg-sum{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:10px 0}@media(max-width:760px){#mtAggCard .mt-agg-sum{grid-template-columns:1fr 1fr}}' +
      '#mtAggCard .mt-agg-sum div{border:1px solid #23406b;border-radius:8px;padding:7px 9px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9db0c8}#mtAggCard .mt-agg-sum b{display:block;font-size:15px;color:#e6eefb;text-transform:none;letter-spacing:0;margin-top:2px}' +
      '#mtAggCard table{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}#mtAggCard th{text-align:left;color:#9db0c8;font-weight:600;padding:5px 6px;border-bottom:1px solid #23406b}#mtAggCard table tr{display:table-row}#mtAggCard td{display:table-cell;padding:5px 6px;border-bottom:1px solid rgba(43,85,144,.35)}' +
      '#mtAggCard td.n,#mtAggCard th.n{text-align:right}#mtAggCard tr.mta-out td{color:#f0c46b}#mtAggCard tr.mta-low td{display:table-cell;background:rgba(127,240,177,.08)}#mtAggCard tr.mta-low td:last-child{color:#7ff0b1;font-weight:700}#mtAggCard tr.mta-start td{color:#9db0c8;font-style:italic}' +
      '#mtAggCard tfoot td{font-weight:700;border-top:1px solid #2b5590;border-bottom:0}#mtAggCard .mt-agg-note{font-size:11.5px;color:#9db0c8;margin-top:8px}#mtAggCard .mt-agg-wrap{overflow-x:auto}' +
      '#mtAggCard .mt-agg-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}#mtAggCard .mt-agg-tog{margin-top:0}';
    document.head.appendChild(s);
  }
  function badFlash(el) { el.classList.add('mtd-bad'); setTimeout(function () { el.classList.remove('mtd-bad'); }, 1400); }

  /* ------------------------------------------------ Taxes & Escrow (proration) ------------------------------------ */
  var CUSTOM = 'Custom due dates (enter below)';
  function hookTaxpro() {
    var T = window.TAXPRO; if (!T || !T.render || T.__mtd) return !!(T && T.__mtd);
    T.__mtd = true;
    var origSet = T.set, origRender = T.render, origCalc = T.calc;
    T.set = function (k, v) {
      if (k === 'closing' || k === 'firstPayment' || k === 'sellerPaidThrough' || k === 'prorateTo') {
        var raw = String(v || '').trim(), d = raw ? iso(raw) : '';
        if (raw && !d) { var bad = document.activeElement; if (bad) badFlash(bad); return; }
        if (k === 'firstPayment') T.state.firstPaymentAuto = !d;     /* blank = the automatic date */
        v = d;
      }
      if (k === 'prorateTo') { T.state.prorateTo = v; try { localStorage.setItem('taxProration.v1', JSON.stringify(T.state)); } catch (e) {} T.render(); return; }
      return origSet.call(T, k, v);
    };
    /* "Prorate to": the proration (seller credit / buyer reimbursement) counts to this date instead of closing; the escrow
       aggregate keeps using closing and the first payment */
    T.calc = function () {
      var st = T.state, pr = st.prorateTo;
      if (!pr || pr === st.closing) return origCalc.apply(T, arguments);
      var full = origCalc.apply(T, arguments), keep = st.closing; st.closing = pr;
      var p; try { p = origCalc.apply(T, arguments); } finally { st.closing = keep; }
      if (full && p) { full.sellerOwes = p.sellerOwes; full.buyerReimburses = p.buyerReimburses; full.basis = p.basis + ' (prorated to ' + show(pr) + ')'; }
      return full;
    };
    T.render = function () { syncAuto(T); var r = origRender.apply(T, arguments); try { decorate(T); } catch (e) {} return r; };
    T.render();
    return true;
  }
  function dueRows(T) { return T.state.customDue && T.state.customDue.length ? T.state.customDue : [{due: '01-01', pct: 0.5}, {due: '07-01', pct: 0.5}]; }
  function customCycle(T) {
    T.CYCLES[CUSTOM] = dueRows(T).filter(function (r) { return /^\d{2}-\d{2}$/.test(r.due) && N(r.pct) > 0; }).map(function (r) { return {due: r.due, covers: r.due, pct: N(r.pct)}; });
  }
  /* the custom instalments also go to the loan file's escrow (the suite turns a named cycle into due months by itself) */
  function pushCustomToEscrow(T) {
    var s = suite(); if (!s || T.state.cycle !== CUSTOM) return;
    var i = s.activeInputs || {}, annual = N(T.state.annual), annualIns = i.insuranceBasis === 'Annual' ? N(i.insuranceAmount) : N(i.insuranceAmount) * 12, closeM = +(String(i.closingDate || '').slice(5, 7)) || 1;
    var list = dueRows(T).filter(function (r) { return /^\d{2}-\d{2}$/.test(r.due) && N(r.pct) > 0; }).map(function (r, k) { return {month: +r.due.slice(0, 2), amount: Math.round(annual * N(r.pct) * 100) / 100, label: 'Property tax installment ' + (k + 1)}; });
    if (annualIns > 0) list.push({month: closeM, amount: annualIns, label: 'Hazard insurance renewal'});
    if (i.escrow && N(i.escrow.annualFlood) > 0) list.push({month: closeM, amount: N(i.escrow.annualFlood), label: 'Flood insurance renewal'});
    escSet([['escrow.customDisbursements', list], ['escrow.useCustomDisbursements', true]]);
  }
  function fpAuto(T) { var s = suite(); try { if (s && s.activeInputs && s.activeInputs.escrow) return s.activeInputs.escrow.autoFirstPaymentDate !== false; } catch (e) {} return T.state.firstPaymentAuto !== false; }
  function syncAuto(T) {
    var s = T.state; customCycle(T);
    if (!suite()) {   /* the Income Calculator page: no loan file store, so follow the shared loan file's closing date */
      var c = fileClosing(); if (c && !s.closing) s.closing = c;
      if (s.firstPaymentAuto !== false) s.firstPayment = '';
    }
  }
  function decorate(T) {
    var body = $('taxBody'); if (!body) return; css();
    var s = T.state, closingField = Array.prototype.filter.call(body.querySelectorAll('.field'), function (f) { var l = f.querySelector('label'); return l && /^\s*closing date\s*$/i.test(l.textContent); })[0], closingIn = closingField && closingField.querySelector('input');
    if (closingIn && !closingIn.parentNode.querySelector('.mtd-src')) {
      var src = document.createElement('div'); src.className = 'mtd-src';
      src.innerHTML = suite() ? '<b>Synced</b> with the loan file both ways - a date typed here is the file\'s closing date. To prorate to another date, use Prorate to.' : 'Type the closing date';
      closingIn.parentNode.appendChild(src);
    }
    var grid = body.querySelector('.grid.g4');
    if (grid && !body.querySelector('.mtd-row')) {
      var row = document.createElement('div'); row.className = 'mtd-row';
      var fp = s.firstPayment || '', auto = fpAuto(T);
      row.innerHTML = '<div class="field"><label>Prorate to (optional)</label><input class="cell-input" type="text" inputmode="numeric" autocomplete="off" placeholder="Blank = the closing date" value="' + esc(show(s.prorateTo || '')) + '" data-mtd-in="prorateTo">' +
        '<div class="mtd-src">' + (s.prorateTo ? '<b class="cus">Custom</b> proration date - <a data-mtd="pr-clear">prorate to closing</a>' : '<b>Auto</b> - prorates to the closing date') + '</div></div>' +
        '<div class="field"><label>First payment date</label><input class="cell-input" type="text" inputmode="numeric" autocomplete="off" placeholder="Auto - 1st of the month after next" value="' + esc(show(fp)) + '" data-mtd-in="firstPayment">' +
        '<div class="mtd-src">' + (auto ? '<b>Auto</b> from closing - type a date to override' : '<b class="cus">Custom</b> - <a data-mtd="fp-auto">use the automatic date</a>') + '</div></div>' +
        '<div class="field"><label>Escrow cushion (months)</label><input class="cell-input" type="text" inputmode="decimal" autocomplete="off" value="' + esc(N(s.cushionMonths)) + '" data-mtd-in="cushionMonths"></div>';
      grid.parentNode.insertBefore(row, grid.nextSibling);
      if (s.cycle === CUSTOM) {
        var due = document.createElement('div'); due.className = 'mtd-due';
        var rows = dueRows(T), total = rows.reduce(function (a, r) { return a + N(r.pct); }, 0);
        due.innerHTML = '<b>Custom tax due dates</b><div class="mtd-src" style="margin:2px 0 6px">Each instalment\'s due date (month/day) and its share of the annual tax; the loan file\'s escrow uses them too. Shares should add to 100%' + (Math.abs(total - 1) > 0.001 ? ' - <b class="cus">now ' + Math.round(total * 1000) / 10 + '%</b>' : '') + '.</div>' +
          '<table>' + rows.map(function (r, i) { return '<tr><td><input class="cell-input" data-mtd-due="' + i + '" value="' + esc(r.due.replace('-', '/')) + '" placeholder="MM/DD"></td><td><input class="cell-input" data-mtd-pct="' + i + '" value="' + esc(Math.round(N(r.pct) * 10000) / 100) + '%" inputmode="decimal"></td><td><button class="mtd-x" data-mtd-del="' + i + '" title="Remove">×</button></td></tr>'; }).join('') + '</table>' +
          '<button class="mtd-btn" data-mtd="due-add">Add a due date</button>';
        row.parentNode.insertBefore(due, row.nextSibling);
      }
    }
    if (!body.querySelector('.mtd-tt')) body.appendChild(ttCard());
    var sel = body.querySelector('select'); if (sel && !Array.prototype.some.call(sel.options, function (o) { return o.value === CUSTOM || o.text === CUSTOM; })) { var o = document.createElement('option'); o.textContent = CUSTOM; if (s.cycle === CUSTOM) o.selected = true; sel.appendChild(o); }
  }
  function setCustom(T) { T.set('cycle', CUSTOM); setTimeout(function () { pushCustomToEscrow(T); }, 0); }
  document.addEventListener('change', function (e) {
    var T = window.TAXPRO, t = e.target; if (!T || !t.closest) return;
    var k = t.getAttribute('data-mtd-in');
    if (k) { if (k === 'cushionMonths') T.set('cushionMonths', N(t.value)); else T.set(k, t.value); return; }
    if (t.matches && t.matches('#taxBody select') && t.value === CUSTOM) { setTimeout(function () { pushCustomToEscrow(T); }, 0); return; }
    var di = t.getAttribute('data-mtd-due'), pi = t.getAttribute('data-mtd-pct');
    if (di != null || pi != null) {
      var rows = dueRows(T).map(function (r) { return {due: r.due, pct: r.pct}; });
      if (di != null) { var d = md(t.value); if (!d) { badFlash(t); return; } rows[+di].due = d; }
      if (pi != null) { var p = N(t.value); if (!(p > 0)) { badFlash(t); return; } rows[+pi].pct = p > 1 ? p / 100 : p; }
      T.state.customDue = rows; setCustom(T);
    }
  }, true);
  document.addEventListener('click', function (e) {
    var T = window.TAXPRO, a = e.target.closest && e.target.closest('[data-mtd],[data-mtd-del]'); if (!a) return;
    var k = a.getAttribute('data-mtd');
    if (T && k === 'pr-clear') T.set('prorateTo', '');
    else if (T && k === 'fp-auto') T.set('firstPayment', '');
    else if (T && k === 'due-add') { var rows = dueRows(T).slice(); rows.push({due: '10-01', pct: 0}); T.state.customDue = rows; setCustom(T); }
    else if (T && a.hasAttribute('data-mtd-del')) { var r2 = (T.state.customDue || []).slice(); r2.splice(+a.getAttribute('data-mtd-del'), 1); T.state.customDue = r2.length ? r2 : [{due: '01-01', pct: 1}]; setCustom(T); }
    else if (k === 'esc-fp-auto') escSet([['escrow.autoFirstPaymentDate', true]]);
    else if (k === 'esc-tax-auto') escSet([['escrow.useCustomDisbursements', false]]);
    else if (k === 'tt-file') { ttState.auto = true; ttSave(); ttPaint(); }
  });

  /* ------------------------------------------------ Transfer Tax Calculator --------------------------------------- */
  var TT_KEY = 'mt.transferTaxCalc.v1', ttState = (function () { try { return JSON.parse(localStorage.getItem(TT_KEY) || 'null') || {auto: true}; } catch (e) { return {auto: true}; } })();
  function ttSave() { try { localStorage.setItem(TT_KEY, JSON.stringify(ttState)); } catch (e) {} }
  function tables() { var M = window.MTData || {}; if ((!M.transferTaxes || !M.luxuryTaxes) && window.__amdGet) { try { M = {transferTaxes: __amdGet('src/core/data/transferTaxes'), luxuryTaxes: __amdGet('src/core/data/luxuryTaxes')}; } catch (e) {} } return M; }
  function fileDeal() {
    var s = suite(), i = null; try { i = s && s.activeInputs; } catch (e) {}
    if (!i) { try { var w = JSON.parse(localStorage.getItem('mtgcalc-shared-workflow-v1') || 'null'); i = w && w.suiteInputs; } catch (e) {} }
    return i ? {state: i.state || '', nyc: !!i.isNYC, price: N(i.basePurchasePrice)} : null;
  }
  function ttCalc() {
    var M = tables(), T = M.transferTaxes, L = M.luxuryTaxes, st = ttState.state, price = N(ttState.price), nyc = st === 'New York' && !!ttState.nyc;
    if (!st || !(price > 0)) return null;
    var tr = null;
    if (T) { if (st === 'New York' && T.nyTransferTaxRate) tr = {rate: T.nyTransferTaxRate(price, nyc), payer: 'Seller', buyerShare: 0, note: nyc ? 'NY State plus NYC real property transfer tax.' : 'NY State transfer tax (the 0.65% rate from $3M applies in NYC only).'}; else if (T.lookupTransferTax) { var row = T.lookupTransferTax(st); if (row) tr = {rate: row.rate || 0, payer: row.payer || '', buyerShare: row.buyerShare || 0, note: row.note || ''}; } }
    var lx = null; if (L && L.lookupLuxuryTaxRow) { try { var r = L.lookupLuxuryTaxRow(st, price, undefined, nyc); if (r && r.rate) lx = r; } catch (e) {} }
    var tAmt = tr ? Math.round(price * tr.rate * 100) / 100 : 0, buyerT = tr ? (/buyer/i.test(tr.payer) && !/seller/i.test(tr.payer) ? tAmt : tAmt * (tr.buyerShare || 0)) : 0;
    var lAmt = lx ? Math.round(price * lx.rate * 100) / 100 : 0, lPayer = lx ? (lx.payer || 'Buyer') : '', buyerL = lx && /buyer/i.test(lPayer) ? lAmt : 0;
    return {tr: tr, tAmt: tAmt, lx: lx, lAmt: lAmt, lPayer: lPayer, buyer: buyerT + buyerL, seller: (tAmt - buyerT) + (lAmt - buyerL)};
  }
  var STATES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
  function ttCard() {
    var c = document.createElement('div'); c.className = 'card mtd-tt'; c.id = 'mtTransferTax';
    c.innerHTML = '<div class="card-top"><span class="tag">Taxes</span><span class="doc-name">Transfer Tax Calculator</span></div><div class="card-body" id="mtTTBody"></div>';
    setTimeout(ttPaint, 0); return c;
  }
  function ttPaint() {
    var b = $('mtTTBody'); if (!b) return; css();
    if (ttState.auto !== false) { var f = fileDeal(); if (f) { ttState.state = f.state || ttState.state; ttState.nyc = f.nyc; ttState.price = f.price || ttState.price; } }
    var r = ttCalc(), pct = function (v) { return (Math.round(v * 100000) / 1000) + '%'; };
    b.innerHTML = '<div class="grid g4"><div class="field"><label>State</label><select class="cell-input" data-tt="state"><option value="">Choose…</option>' + STATES.map(function (s) { return '<option' + (s === ttState.state ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Sale price ($)</label><input class="cell-input" data-tt="price" type="text" inputmode="decimal" autocomplete="off" value="' + (N(ttState.price) ? usd(ttState.price) : '') + '" placeholder="$0"></div>' +
      (ttState.state === 'New York' ? '<div class="field"><label>New York City</label><select class="cell-input" data-tt="nyc"><option value="0"' + (ttState.nyc ? '' : ' selected') + '>No - rest of the state</option><option value="1"' + (ttState.nyc ? ' selected' : '') + '>Yes - the five boroughs</option></select></div>' : '') +
      '</div><div class="mtd-src">' + (ttState.auto !== false ? '<b>Synced</b> with the loan file (state, NYC and price) - change any box to try other figures' : '<b class="cus">Your figures</b> - <a data-mtd="tt-file">use the loan file\'s</a>') + '</div>' +
      (r ? '<div class="mtd-out"><div class="calcbox"><div class="muted small">Transfer tax' + (r.tr ? ' (' + pct(r.tr.rate) + ')' : '') + '</div><div class="mnd-big">' + usd(r.tAmt) + '</div><div class="muted small">' + (r.tr ? 'Paid by ' + esc(r.tr.payer || 'seller') : 'No state transfer tax on file') + '</div></div>' +
        '<div class="calcbox"><div class="muted small">Mansion tax' + (r.lx ? ' (' + pct(r.lx.rate) + ')' : '') + '</div><div class="mnd-big">' + usd(r.lAmt) + '</div><div class="muted small">' + (r.lx ? 'Paid by ' + esc(r.lPayer) : 'None at this price') + '</div></div>' +
        '<div class="calcbox' + (r.buyer > 0 ? ' warn' : '') + '"><div class="muted small">Buyer pays</div><div class="mnd-big">' + usd(r.buyer) + '</div></div>' +
        '<div class="calcbox"><div class="muted small">Seller pays</div><div class="mnd-big">' + usd(r.seller) + '</div></div></div>' +
        (r.tr && r.tr.note ? '<div class="note" style="margin-top:10px">' + esc(r.tr.note) + '</div>' : '') : '<p class="muted" style="margin-top:10px">Choose a state and enter a price.</p>');
  }
  document.addEventListener('change', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-tt'); if (!k) return;
    ttState.auto = false;
    if (k === 'price') { var v = N(e.target.value); if (!(v >= 0)) { badFlash(e.target); return; } ttState.price = v; }
    else if (k === 'nyc') ttState.nyc = e.target.value === '1'; else ttState[k] = e.target.value;
    ttSave(); ttPaint();
  });

  /* ------------------------------------------------ Date-driven escrow card -------------------------------------- */
  function escSet(pairs) { var s = suite(); if (!s) return; pairs.forEach(function (p) { try { s.setField(p[0], p[1], 'Escrow dates'); } catch (e) {} }); }
  function enhanceEscrow() {
    var card = $('v17EscrowCard'), s = suite(); if (!card || !s) return;
    var grid = card.querySelector('.v17-mini-grid'); if (!grid) return; css();
    var i = s.activeInputs, o = typeof s.outputs === 'function' ? s.outputs() : s.outputs, eo = (o && o.escrowOut) || {};
    var sig = [i.closingDate, i.escrow && i.escrow.autoFirstPaymentDate, eo.firstPaymentDate, eo.firstTaxDueDate, i.escrow && i.escrow.useCustomDisbursements, eo.initialEscrowDeposit].join('|');
    if (grid.__sig === sig && grid.querySelector('input')) return;
    if (grid.contains(document.activeElement)) return;
    grid.__sig = sig; grid.classList.add('mtd-esc');
    var cells = grid.children; if (cells.length < 3) return;
    var put = function (cell, key, val, chip) { var b = cell.querySelector('b'); if (!b) return; b.innerHTML = '<input data-esc="' + key + '" value="' + esc(show(val)) + '" placeholder="MM/DD/YYYY" autocomplete="off">' + (chip ? '<div class="mtd-chip">' + chip + '</div>' : ''); };
    put(cells[0], 'closing', i.closingDate, '<b>Loan file</b> date');
    put(cells[1], 'firstPayment', eo.firstPaymentDate, i.escrow && i.escrow.autoFirstPaymentDate ? '<b>Auto</b> from closing' : '<b class="cus">Custom</b> · <a data-mtd="esc-fp-auto">auto</a>');
    put(cells[2], 'firstTax', eo.firstTaxDueDate, i.escrow && i.escrow.useCustomDisbursements ? '<b class="cus">Custom</b> schedule · <a data-mtd="esc-tax-auto">auto</a>' : '<b>Auto</b> from the county schedule');
    if (cells[3]) { var ib = cells[3].querySelector('b'); if (ib) ib.textContent = usd(eo.initialEscrowDeposit); }
  }
  document.addEventListener('change', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-esc'); if (!k) return;
    var d = iso(e.target.value); if (!d) { badFlash(e.target); return; }
    var s = suite(); if (!s) return; var i = s.activeInputs;
    if (k === 'closing') escSet([['closingDate', d]]);
    else if (k === 'firstPayment') escSet([['escrow.autoFirstPaymentDate', false], ['escrow.firstPaymentDate', d]]);
    else if (k === 'firstTax') {
      /* the tax instalments, starting in the chosen month and spread evenly over the year; insurance renews at closing */
      var o = typeof s.outputs === 'function' ? s.outputs() : s.outputs, eo = (o && o.escrowOut) || {};
      var annualTax = i.propertyTaxBasis === 'Annual' ? N(i.propertyTaxAmount) : N(i.propertyTaxAmount) * 12, annualIns = i.insuranceBasis === 'Annual' ? N(i.insuranceAmount) : N(i.insuranceAmount) * 12;
      var cur = (i.escrow && i.escrow.useCustomDisbursements ? i.escrow.customDisbursements : []).filter(function (x) { return /tax/i.test(x.label || ''); }).length;
      var n = cur || (eo.taxDisbursementMonths && eo.taxDisbursementMonths.length) || 2, m0 = +d.slice(5, 7), closeM = +(String(i.closingDate || d).slice(5, 7)) || m0, list = [];
      for (var k2 = 0; k2 < n; k2++) list.push({month: ((m0 - 1 + Math.round(k2 * 12 / n)) % 12) + 1, amount: Math.round(annualTax / n * 100) / 100, label: n > 1 ? 'Property tax installment ' + (k2 + 1) : 'Property tax'});
      if (annualIns > 0) list.push({month: closeM, amount: annualIns, label: 'Hazard insurance renewal'});
      if (i.escrow && N(i.escrow.annualFlood) > 0) list.push({month: closeM, amount: N(i.escrow.annualFlood), label: 'Flood insurance renewal'});
      escSet([['escrow.customDisbursements', list], ['escrow.useCustomDisbursements', true]]);
    }
  }, true);

  /* ---------------- aggregate escrow analysis: listed right below Taxes & escrow, with the month-by-month schedule ---------------- */
  var AGG_KEY = 'mt.aggSchedule.hidden';
  function aggCard() {
    var s = suite(), anchor = $('v17EscrowCard') || $('v20Escrow'); if (!s || !anchor || !anchor.parentNode) return;
    var o = typeof s.outputs === 'function' ? s.outputs() : s.outputs, eo = (o && o.escrowOut) || {}, rows = eo.rows || [];
    var card = $('mtAggCard');
    if (!card) { css(); card = document.createElement('div'); card.id = 'mtAggCard'; card.className = 'v17-escrow-card mt-agg'; }
    if (card.previousElementSibling !== anchor) anchor.parentNode.insertBefore(card, anchor.nextSibling);
    var i = s.activeInputs || {}, escrowed = !(i.escrow && i.escrow.escrowsWaived) && i.escrowPayments !== false;
    var sig = JSON.stringify([rows, eo.initialEscrowDeposit, eo.requiredCushion, eo.cushionMonths, escrowed]);
    if (card.__sig === sig) return; card.__sig = sig;
    var hidden = false; try { hidden = localStorage.getItem(AGG_KEY) === '1'; } catch (e) {}
    if (!rows.length) { card.innerHTML = '<div class="mt-agg-head"><b>Aggregate escrow analysis</b></div><div class="mt-agg-note">Enter taxes and insurance to see the twelve-month escrow schedule.</div>'; return; }
    var low = Infinity, lowIdx = -1, start = N(eo.initialEscrowDeposit), dep = 0, dis = 0;
    rows.forEach(function (r, k) { dep += N(r.deposit); dis += N(r.disbursements); if (N(r.balance) < low - 0.004) { low = N(r.balance); lowIdx = k; } });
    var body = '<tr class="mta-start"><td>At closing</td><td></td><td class="n"></td><td>Initial escrow deposit</td><td class="n"></td><td class="n">' + usd(start) + '</td></tr>';
    rows.forEach(function (r, k) {
      var bal = N(r.balance) + start;   /* the engine\'s trial balance starts at zero; the account starts with the deposit */
      body += '<tr class="' + (N(r.disbursements) > 0 ? 'mta-out' : '') + (k === lowIdx ? ' mta-low' : '') + '"><td>' + esc(r.monthLabel) + '</td><td>' + esc(show(r.dueDate)) + '</td><td class="n">' + usd(r.deposit) + '</td><td>' + esc((r.disbursementLabels || []).join(', ')) + '</td><td class="n">' + (N(r.disbursements) > 0 ? '-' + usd(r.disbursements) : '') + '</td><td class="n">' + usd(bal) + '</td></tr>';
    });
    card.innerHTML = '<div class="mt-agg-head"><div><b>Aggregate escrow analysis</b><div class="mt-agg-note" style="margin-top:2px">Twelve months from the first payment' + (eo.firstPaymentDate ? ' on ' + esc(show(eo.firstPaymentDate)) : '') + '. Changes to closing, first payment or tax due dates update it straight away.</div></div><button type="button" class="mt-agg-tog mtd-btn">' + (hidden ? 'Show schedule' : 'Hide schedule') + '</button></div>' +
      '<div class="mt-agg-sum"><div>Monthly deposit<b>' + usd(eo.monthlyDeposit) + '</b></div><div>Annual escrowed<b>' + usd(eo.totalAnnualEscrowed) + '</b></div><div>Cushion (' + esc(eo.cushionMonths) + ' mo)<b>' + usd(eo.requiredCushion) + '</b></div><div>Lowest balance<b>' + usd(low + start) + '</b></div><div>Initial deposit<b>' + usd(start) + '</b></div></div>' +
      '<div class="mt-agg-wrap"' + (hidden ? ' hidden' : '') + '><table><thead><tr><th>Month</th><th>Payment due</th><th class="n">Deposit</th><th>Paid out</th><th class="n">Amount</th><th class="n">Balance</th></tr></thead><tbody>' + body + '</tbody>' +
      '<tfoot><tr><td colspan="2">Twelve-month totals</td><td class="n">' + usd(dep) + '</td><td></td><td class="n">' + (dis ? '-' + usd(dis) : '') + '</td><td class="n">' + usd(rows.length ? N(rows[rows.length - 1].balance) + start : start) + '</td></tr></tfoot></table></div>' +
      '<div class="mt-agg-note">The lowest balance' + (lowIdx >= 0 ? ' (' + esc(rows[lowIdx].monthLabel) + ')' : '') + ' must not fall below the cushion; the initial deposit is what makes that true.' + (eo.disbursementScheduleNote ? ' Tax schedule: ' + esc(eo.disbursementScheduleNote) + '.' : '') + '</div>';
    card.querySelector('.mt-agg-tog').onclick = function () { var w = card.querySelector('.mt-agg-wrap'), h = !w.hidden; w.hidden = h; this.textContent = h ? 'Show schedule' : 'Hide schedule'; try { localStorage.setItem(AGG_KEY, h ? '1' : '0'); } catch (e) {} };
  }

  /* ------------------------------------------------ start ----------------------------------------------------------- */
  var t = 0; function soon() { clearTimeout(t); t = setTimeout(function () { var T = window.TAXPRO; if (T && T.__mtd && $('taxBody') && !document.activeElement.closest('#taxBody')) T.render(); else ttPaint(); enhanceEscrow(); aggCard(); }, 150); }
  function start() {
    var n = 0; (function wait() { var a = hookTaxpro(); var s = suite(); if (s && s.subscribe && !wait.sub) { wait.sub = true; try { s.subscribe(soon); } catch (e) {} } if ((!a || !wait.sub) && ++n < 80) setTimeout(wait, 250); })();
    setInterval(function () { if (!document.hidden) { enhanceEscrow(); aggCard(); } }, 2000);
  }
  window.MTDates = {iso: iso, md: md, transferTax: ttCalc};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
