/* Mortgage Suite 56.3 - Document Builder (Income Calculator, Full Suite and the Loan Suite pages).
   Builds, previews, prints and saves as PDF: contract addenda (five styles, up to 4 buyers and 4 sellers, a seller-concession
   and transfer-tax calculator, 203(k) / HomeStyle / FHA / VA clauses, a contract dropped in to fill the parties), residential
   leases (four styles), contractor estimates, profit and loss statements, commitment letters (filled from a lender's
   conditional approval read with OCR, with each condition kept or dropped) and a mortgage insurance & renovation fee
   worksheet. Every builder starts from the loan file on this browser and keeps its own draft. Nothing leaves the browser
   except a property search the user starts (OpenStreetMap / Google). */
(function () {
  'use strict';
  if (window.MTBuild) return;
  var $ = function (id) { return document.getElementById(id); };
  function G(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function N(v) { if (typeof v === 'number') return isFinite(v) ? v : 0; var t = String(v == null ? '' : v).trim().toLowerCase(), neg = /^\(.*\)$/.test(t) || /^-/.test(t), m = 1;
    if (/k$/.test(t)) { m = 1e3; t = t.slice(0, -1); } else if (/m$/.test(t)) { m = 1e6; t = t.slice(0, -1); }
    t = t.replace(/[()$,\s%]/g, '').replace(/^-/, ''); var n = parseFloat(t); return isFinite(n) ? (neg ? -n : n) * m : 0; }
  function usd(v, d) { var n = N(v); d = d == null ? 2 : d; return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d}); }
  function short$(v) { var n = N(v); if (n >= 1e6 && n % 1e4 === 0) return '$' + (n / 1e6).toString() + 'M'; if (n >= 1000 && n % 1000 === 0) return '$' + (n / 1000) + 'K'; if (n >= 1000 && n % 100 === 0) return '$' + (n / 1000).toFixed(1) + 'K'; return usd(n); }
  function pct(v, d) { return (N(v) * 100).toFixed(d == null ? 2 : d) + '%'; }
  function longDate(s) { var d = parseDate(s); return d ? d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}) : (s || ''); }
  function ordDate(s) { var d = parseDate(s); if (!d) return s || ''; var n = d.getDate(), suf = n % 10 === 1 && n !== 11 ? 'ST' : n % 10 === 2 && n !== 12 ? 'ND' : n % 10 === 3 && n !== 13 ? 'RD' : 'TH'; return d.toLocaleDateString('en-US', {month: 'long'}).toUpperCase() + ' ' + n + suf; }
  function slashDate(s) { var d = parseDate(s); return d ? (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() : (s || ''); }
  function parseDate(s) { if (!s) return null; s = String(s).trim(); var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/); if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[1] - 1, +m[2]);
    if (!/^[A-Za-z]{3,9}\.?\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}$|^\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{4}$/.test(s)) return null; var d = new Date(s.replace(/(\d)(st|nd|rd|th)/, '$1').replace('.', '')); return isNaN(d) ? null : d; }
  function iso(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addDays(s, n) { var d = parseDate(s) || new Date(); d.setDate(d.getDate() + n); return iso(d); }
  /* dates are typed freely ("3/15/2026", "March 15, 2026", "on or before April 30, 2026", "TBD"); phrases are printed as typed */
  function isPhrase(s) { return !!s && !parseDate(s) || /^\s*(on|by|no later|within|prior|before|after|tbd|to be)/i.test(String(s || '')); }
  function when(s, fmt) { return isPhrase(s) ? String(s).trim() : (fmt || longDate)(s); }
  function occNorm(o) { return /invest/i.test(o) ? 'Investment' : /second|vacation/i.test(o) ? 'Second Home' : 'Primary Residence'; }
  function joinNames(a, last) { a = a.filter(Boolean); if (a.length < 2) return a.join(''); return a.slice(0, -1).join(', ') + (last || ' and ') + a[a.length - 1]; }
  function uid() { return 'b' + Math.random().toString(36).slice(2, 9); }
  function store() { try { return window.mortgageSuite && window.mortgageSuite.store; } catch (e) { return null; } }
  function say(t) { try { if (window.LOS && LOS.say) return LOS.say('Document builder', t, 'good', 4500); } catch (e) {} try { var T = G('toast'); if (typeof T === 'function') return T(t); } catch (e) {} }

  /* ---------------------------------------------------------------- the loan file */
  var STATES = {AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'};
  var STATE_NAMES = Object.keys(STATES).map(function (k) { return STATES[k]; }).sort();
  function stateName(s) { s = String(s || '').trim(); if (STATES[s.toUpperCase()]) return STATES[s.toUpperCase()]; var hit = STATE_NAMES.filter(function (n) { return n.toLowerCase() === s.toLowerCase(); })[0]; return hit || s; }
  function stateAbbr(s) { var n = stateName(s); return Object.keys(STATES).filter(function (k) { return STATES[k] === n; })[0] || s; }
  function file() {
    var f = {borrowers: [], address: '', city: '', state: '', zip: '', county: '', price: 0, concession: 0, program: '', occupancy: 'Primary Residence', downPct: 0, rate: 0, term: 30, loan: 0, base: 0, payment: 0, taxes: 0, ins: 0, mi: 0, emd: 0, closingDate: '', value: 0, reno: null};
    var st = store();
    if (st && st.activeInputs) {
      var a = st.activeInputs, o = null; try { o = st.cachedOutputs || st.outputsFor(a); } catch (e) {}
      f.borrowers = String(a.borrowerName || '').split(/\s*(?:&|,| and )\s*/i).filter(Boolean);
      f.address = a.propertyAddress || ''; f.city = a.city || ''; f.state = a.state || ''; f.zip = a.zipCode || ''; f.county = a.nyCounty || '';
      f.price = N(a.basePurchasePrice); f.concession = N(a.sellerConcessionAmount); f.program = a.loanProgram || ''; f.occupancy = a.occupancy || f.occupancy;
      f.downPct = N(a.finalDownPaymentPct); f.rate = N(a.interestRate) * 100; f.term = N(a.termYears) || 30; f.value = N(a.asIsValue) || f.price;
      f.emd = N(a.closing && a.closing.earnestMoneyDeposit); f.closingDate = a.closingDate || '';
      if (o && o.loan) { f.loan = N(o.loan.totalLoan); f.base = N(o.loan.maximumBaseLoan); }
      if (o && o.payment) { f.payment = N(o.payment.totalMonthlyPayment); f.pi = N(o.payment.principalAndInterest); f.taxes = N(o.payment.monthlyTaxes); f.ins = N(o.payment.monthlyInsurance); f.mi = N(o.payment.monthlyFhaMip) || N(o.payment.monthlyPmi); f.miRate = N(o.payment.fhaMipRateUsed) || N(o.payment.pmiRateUsed); f.ufmip = N(o.loan && o.loan.ufmip); }
      if (o && o.renovationOut && o.renovationOut.active) f.reno = o.renovationOut;
      f.renovation = !!a.renovation; f.inputs = a; f.outputs = o;
    } else {
      var live = null; try { live = JSON.parse(localStorage.getItem('mt.live.loan.v1') || 'null'); } catch (e) {}
      var L = live && live.loan; if (L) { f.price = L.price; f.value = L.value; f.loan = L.total; f.base = L.base; f.rate = L.rate; f.term = L.term; f.program = L.program; f.taxes = L.taxes; f.ins = L.ins; f.mi = L.mi; f.miRate = L.miRate / 100; f.pi = L.pi; f.payment = L.housing; f.address = L.address || ''; f.occupancy = L.occ || f.occupancy; if (L.borrower) f.borrowers = L.borrower.split(/\s*(?:&|,| and )\s*/i).filter(Boolean); }
      var wf = null; try { wf = JSON.parse(localStorage.getItem('mtgcalc-shared-workflow-v1') || 'null'); } catch (e) {}
      var si = wf && wf.suiteInputs; if (si) { f.state = f.state || si.state || ''; f.zip = f.zip || si.zipCode || ''; f.address = f.address || si.propertyAddress || ''; f.concession = N(si.sellerConcessionAmount); f.downPct = N(si.finalDownPaymentPct); f.city = si.city || ''; f.county = si.nyCounty || ''; f.emd = N(si.closing && si.closing.earnestMoneyDeposit); f.closingDate = si.closingDate || ''; if (!f.price) f.price = N(si.basePurchasePrice); }
    }
    var S = G('S'); if (S && S.w2) { var b = [S.b1, S.b2].filter(Boolean); if (b.length && !f.borrowers.length) f.borrowers = b; if (!f.address && S.loan && S.loan.address) f.address = S.loan.address; }
    return f;
  }
  function fullAddress(o) { var cityLine = [o.city, [stateAbbr(o.state || ''), o.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '); return [o.address, cityLine].filter(Boolean).join(', '); }

  /* ------------------------------------------------------------ reference tables */
  function D() { var M = window.MTData || {}; if (!M.transferTaxes && window.__amdGet) { try { M = {transferTaxes: __amdGet('src/core/data/transferTaxes'), concessionLimits: __amdGet('src/core/data/concessionLimits'), luxuryTaxes: __amdGet('src/core/data/luxuryTaxes')}; } catch (e) {} } return M; }
  function transferTax(state, price, nyc) {
    var M = D(), T = M.transferTaxes, nm = stateName(state); if (!T || !nm) return null;
    if (nm === 'New York' && T.nyTransferTaxRate) { var r = T.nyTransferTaxRate(price, !!nyc); return {rate: r, payer: 'Seller', buyerShare: 0, note: nyc ? 'NY State plus NYC real property transfer tax' : 'NY State transfer tax' + (price >= 3e6 ? ' (higher rate at $3M+ in NYC)' : '')}; }
    var row = T.lookupTransferTax ? T.lookupTransferTax(nm) : null; if (!row) return null;
    return {rate: row.rate || 0, payer: row.payer, buyerShare: row.buyerShare || 0, note: row.note || ''};
  }
  function mansionTax(state, price) { var M = D(), L = M.luxuryTaxes; if (!L || !L.lookupLuxuryTaxRow) return null; var r = L.lookupLuxuryTaxRow(stateName(state), price); return r && r.rate ? r : null; }
  function concessionLimit(program, occ, ltv) { var M = D(), C = M.concessionLimits; var p = /fha/i.test(program) ? 'FHA' : /\bva\b/i.test(program) ? 'VA' : /usda/i.test(program) ? 'USDA' : 'Conventional';
    if (p === 'VA') return {limitPct: .04, note: 'VA: seller concessions up to 4% (closing costs and prepaids are not counted)'};
    if (p === 'USDA') return {limitPct: .06, note: 'USDA: up to 6%'};
    if (C && C.concessionLimitFor) return C.concessionLimitFor(p, occ, ltv);
    return {limitPct: p === 'FHA' ? .06 : ltv > .9 ? .03 : ltv > .75 ? .06 : .09, note: ''}; }

  /* --------------------------------------------------------------------- drafts */
  var KEY = 'mt.builder.v1', drafts = {};
  try { drafts = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { drafts = {}; }
  var saveT = 0; function persist() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(drafts)); } catch (e) {} }, 300); }

  /* ======================================================================== UI */
  var B = {}, cur = 'addendum';
  var CSS = [
    '#mtB{position:fixed;inset:0;z-index:2147483150;display:none;background:rgba(3,12,32,.72)}#mtB.open{display:block}',
    '#mtB .mb{position:absolute;inset:12px;display:grid;grid-template-columns:200px minmax(330px,470px) 1fr;grid-template-rows:auto 1fr;border-radius:14px;overflow:hidden;background:#06142e;color:#e6eefb;border:1px solid #123058;box-shadow:0 30px 80px rgba(0,0,0,.5);font:13.5px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}',
    '#mtB .mb-top{grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #123058;background:#081a3a}',
    '#mtB .mb-top h2{margin:0;font-size:16px;flex:1}#mtB .mb-top .sub{font-size:12px;color:#9db0c8;font-weight:500;margin-left:8px}',
    '#mtB .mb-nav{overflow:auto;border-right:1px solid #123058;padding:8px}#mtB .mb-nav button{all:unset;box-sizing:border-box;display:block;width:100%;padding:9px 11px;border-radius:9px;cursor:pointer;font-weight:600;color:#c9d7ee;margin-bottom:2px}',
    '#mtB .mb-nav button small{display:block;font-weight:500;font-size:11.5px;color:#8ea3c0}#mtB .mb-nav button[aria-current="true"]{background:#123a75;color:#fff}#mtB .mb-nav button:hover{background:#0c2550}#mtB .mb-nav button:focus-visible{outline:2px solid #5aa2ff}',
    '#mtB .mb-form{overflow:auto;padding:12px 14px 40px;border-right:1px solid #123058}#mtB .mb-prev{display:flex;flex-direction:column;background:#30384a;min-width:0}',
    '#mtB .mb-prev iframe{flex:1;border:0;width:100%;background:#7b8394}',
    '#mtB fieldset{border:1px solid #1c3a66;border-radius:11px;padding:10px 12px 12px;margin:0 0 12px}#mtB legend{padding:0 6px;font-weight:700;font-size:12.5px;color:#9fc4ff;letter-spacing:.02em}',
    '#mtB .g{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px}#mtB .g3{grid-template-columns:1fr 1fr 1fr}#mtB .w{grid-column:1/-1}',
    '#mtB label.f{display:grid;gap:3px;font-size:11.5px;font-weight:600;color:#9db0c8;min-width:0}',
    '#mtB input[type=text],#mtB input[type=date],#mtB input:not([type]),#mtB select,#mtB textarea{box-sizing:border-box;width:100%;min-width:0;padding:7px 9px;border-radius:8px;border:1px solid #23446f;background:#041026;color:#eef4ff;font:500 13.5px/1.3 inherit}',
    '#mtB textarea{min-height:64px;resize:vertical}#mtB input:focus,#mtB select:focus,#mtB textarea:focus{outline:2px solid #5aa2ff;outline-offset:0;border-color:#5aa2ff}',
    '#mtB .ck{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#dfe8f7;font-weight:500;cursor:pointer}#mtB .ck input{margin-top:3px;accent-color:#5aa2ff}',
    '#mtB .btn{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;border:1px solid #2b5590;font-weight:600;font-size:12.5px;cursor:pointer;color:#dfe8f7;position:relative;overflow:hidden;white-space:nowrap}',
    '#mtB .btn.pri{background:#5aa2ff;border-color:#5aa2ff;color:#04122b}#mtB .btn:hover{border-color:#5aa2ff}#mtB .btn:focus-visible{outline:2px solid #8cc0ff;outline-offset:2px}#mtB .btn input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer}',
    '#mtB .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}#mtB .note{font-size:12px;color:#9db0c8;margin:6px 0 0}#mtB .ok{color:#3fcf8e}#mtB .bad{color:#ff8a7a}#mtB .warn{color:#f0b357}',
    '#mtB .kv{display:grid;grid-template-columns:1fr auto;gap:3px 12px;font-size:12.5px;margin-top:8px;padding:9px 11px;border-radius:9px;background:#081d40;border:1px solid #1c3a66}#mtB .kv b{text-align:right;font-variant-numeric:tabular-nums}',
    '#mtB .drop{border:1.5px dashed #2b5590;border-radius:11px;padding:10px 12px;display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:12px}#mtB .drop.over{border-color:#5aa2ff;background:#0b2350}',
    '#mtB .list .it{border:1px solid #1c3a66;border-radius:9px;padding:8px 9px;margin-bottom:6px}#mtB .list .it .hd{display:flex;gap:8px;align-items:center}',
    '#mtB .x{all:unset;cursor:pointer;color:#ff8a7a;font-weight:700;padding:2px 7px;border-radius:6px}#mtB .x:hover{background:#2a1020}',
    '#mtB .sr{margin-top:6px;border:1px solid #1c3a66;border-radius:9px;overflow:hidden}#mtB .sr button{all:unset;box-sizing:border-box;display:block;width:100%;padding:7px 9px;font-size:12.5px;cursor:pointer;border-top:1px solid #142d52}#mtB .sr button:first-child{border-top:0}#mtB .sr button:hover{background:#0c2550}',
    '#mtB .cond{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:start;padding:6px 0;border-top:1px solid #142d52}#mtB .cond textarea{min-height:44px;font-size:12.5px}#mtB .cond select{width:auto;font-size:12px;padding:4px 6px}',
    '@media (max-width:980px){#mtB .mb{grid-template-columns:1fr;grid-template-rows:auto auto auto 1fr;inset:0;border-radius:0}#mtB .mb-nav{display:flex;overflow:auto;border-right:0;border-bottom:1px solid #123058}#mtB .mb-nav button{width:auto;flex:none}#mtB .mb-nav button small{display:none}#mtB .mb-form{border-right:0;max-height:none}#mtB .mb-prev{min-height:70vh}}',
    '#mtB .dtw{display:flex;gap:4px;position:relative}#mtB .dtw input[type=text]{flex:1}#mtB .pkb{all:unset;box-sizing:border-box;display:grid;place-items:center;width:34px;border:1px solid #23446f;border-radius:8px;cursor:pointer;color:#9fc4ff}#mtB .pkb:hover{border-color:#5aa2ff}#mtB .pkb:focus-visible{outline:2px solid #5aa2ff}',
    '#mtB .dtw input.pk{position:absolute;right:0;bottom:0;width:34px;height:2px;opacity:0;pointer-events:none;border:0;padding:0}',
    '#mtB .sync{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:end}#mtB .sync .eq{padding-bottom:9px;color:#8ea3c0;font-weight:700}#mtB .man{font-size:11.5px;color:#f0b357;font-weight:600}',
    '#mtB .wd .it textarea{min-height:52px;font-size:12.5px}#mtB .wd .it .hd b{font-size:12px}#mtB .wd .ed{color:#f0b357;font-size:11px;font-weight:600}',
    '#mtB .mb-top .btn[aria-pressed="true"]{background:#f0b357;border-color:#f0b357;color:#1d1300}#mtB .mb-prev .pe{padding:6px 12px;font-size:12px;background:#f0b357;color:#1d1300;font-weight:600}',
    '#mtB .fitbar{display:flex;gap:12px;align-items:center;padding:6px 12px;font-size:12px;background:#0b2350;color:#cfe0f7;border-bottom:1px solid #123058}#mtB .fitbar label{display:flex;gap:6px;align-items:center;font-weight:600;white-space:nowrap;cursor:pointer}#mtB .fitbar input{accent-color:#5aa2ff}#mtB .fitbar.warn{background:#3a2a06;color:#f6d79a}',
    '@media print{#mtB{display:none!important}}'
  ].join('\n');

  function field(b, k, label, opt) {
    opt = opt || {}; var s = drafts[b], v = s[k] == null ? '' : s[k], t = opt.type || 'text', cls = 'f' + (opt.wide ? ' w' : '');
    var a = ' data-b="' + b + '" data-k="' + k + '"' + (opt.addr != null ? ' data-addr="' + opt.addr + '"' : '') + (opt.addrLine ? ' data-addr-line="1"' : '') + (opt.addrPair ? ' data-addr-pair="' + opt.addrPair + '"' : '');
    if (t === 'select') return '<label class="' + cls + '">' + label + '<select' + a + '>' + opt.options.map(function (o) { o = Array.isArray(o) ? o : [o, o]; return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    if (t === 'textarea') return '<label class="' + cls + '">' + label + '<textarea' + a + ' rows="' + (opt.rows || 3) + '" placeholder="' + esc(opt.ph || '') + '">' + esc(v) + '</textarea></label>';
    if (t === 'check') return '<label class="ck' + (opt.wide ? ' w' : '') + '"><input type="checkbox"' + a + (v ? ' checked' : '') + '><span>' + label + '</span></label>';
    /* dates: typed freely, with a calendar button that fills the box */
    if (t === 'date') return '<label class="' + cls + '">' + label + '<span class="dtw"><input type="text" data-fdate="1"' + a + ' value="' + esc(v) + '" placeholder="' + esc(opt.ph || '3/15/2026, March 15, 2026 or a phrase') + '" autocomplete="off">' +
      '<button type="button" class="pkb" data-a="pick" aria-label="Pick ' + esc(label) + ' from a calendar" title="Calendar"><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M4 1h1.5v1.5h5V1H12v1.5h1.5A1.5 1.5 0 0 1 15 4v9.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5V4a1.5 1.5 0 0 1 1.5-1.5H4zM2.5 6v7.5h11V6z"/></svg></button><input type="date" class="pk" tabindex="-1" aria-hidden="true"></span></label>';
    /* open lists: pick a suggestion or type anything */
    var list = opt.list ? ' list="mtBdl-' + b + '-' + k + '"' : '', dl = opt.list ? '<datalist id="mtBdl-' + b + '-' + k + '">' + opt.list.map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>' : '';
    return '<label class="' + cls + '">' + label + '<input type="text"' + (t === 'money' || t === 'num' || t === 'pct' ? ' inputmode="decimal"' : '') + list + a + ' value="' + esc(v) + '" placeholder="' + esc(opt.ph || (opt.list ? 'Pick or type' : '')) + '" autocomplete="off">' + dl + '</label>';
  }
  function dateFromPicker(isoStr) { var d = parseDate(isoStr); return d ? (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() : ''; }
  function dropZone(kind, title, desc) { return '<div class="drop" data-drop="' + kind + '"><div><b>' + title + '</b><div class="note" style="margin:2px 0 0">' + desc + ' Scanned pages and photos are read with OCR.</div></div><label class="btn">Choose file<input type="file" accept=".pdf,image/*,.txt" data-a="' + kind + '"></label></div><div id="mtB' + kind + '" class="note"></div>'; }
  function people(b, k, label, max, opt) {
    opt = opt || {}; var arr = drafts[b][k] = drafts[b][k] || ['']; var h = '<fieldset><legend>' + label + ' (up to ' + max + ')</legend>';
    arr.forEach(function (p, i) {
      var o = typeof p === 'object' ? p : {name: p};
      h += '<div class="g" style="margin-bottom:6px"><label class="f">' + label.replace(/s$|\(s\)$/, '') + ' ' + (i + 1) + '<input data-b="' + b + '" data-list="' + k + '" data-i="' + i + '" data-f="name" value="' + esc(o.name || '') + '"></label>' +
        (opt.extra ? '<label class="f">' + opt.extra[1] + '<input data-b="' + b + '" data-list="' + k + '" data-i="' + i + '" data-f="' + opt.extra[0] + '"' + (opt.extra[0] === 'mail' ? ' data-addr-line="1"' : '') + ' value="' + esc(o[opt.extra[0]] || '') + '" placeholder="' + esc(opt.extra[2] || '') + '"></label>' : '<div class="row" style="align-items:end">' + (arr.length > 1 ? '<button type="button" class="x" data-a="rm" data-b="' + b + '" data-list="' + k + '" data-i="' + i + '" aria-label="Remove">Remove</button>' : '') + '</div>') + '</div>';
      if (opt.extra && arr.length > 1) h += '<div class="row" style="justify-content:flex-end;margin:-4px 0 6px"><button type="button" class="x" data-a="rm" data-b="' + b + '" data-list="' + k + '" data-i="' + i + '">Remove</button></div>';
    });
    if (arr.length < max) h += '<button type="button" class="btn" data-a="add" data-b="' + b + '" data-list="' + k + '">+ Add ' + label.toLowerCase().replace(/s$|\(s\)$/, '') + '</button>';
    return h + '</fieldset>';
  }
  function names(arr) { return (arr || []).map(function (p) { return typeof p === 'object' ? p.name : p; }).filter(function (s) { return s && String(s).trim(); }); }

  /* --------------------------------------------- property search (OSM + Google) */
  function propertyBlock(b, prefix) {
    prefix = prefix || ''; var s = drafts[b];
    return '<fieldset><legend>Property</legend><div class="g">' + field(b, prefix + 'address', 'Street address - start typing for suggestions', {wide: 1, ph: '106 Main St, Unit 2', addr: prefix}) + field(b, prefix + 'city', 'City / town') +
      field(b, prefix + 'state', 'State', {list: STATE_NAMES, ph: 'NY or New York'}) + field(b, prefix + 'zip', 'ZIP') + field(b, prefix + 'county', 'County') +
      field(b, prefix + 'addrFree', 'Address exactly as it should print (optional - replaces the lines above in the document)', {type: 'textarea', wide: 1, rows: 2, ph: 'e.g. 106 Main Street a/k/a Section 12 Block 4 Lot 22, Town of Hempstead, NY 11550'}) + '</div>' +
      '<div class="row" style="margin-top:8px"><button type="button" class="btn" data-a="psearch" data-b="' + b + '" data-p="' + prefix + '">Search address</button>' +
      '<button type="button" class="btn" data-a="pgoogle" data-b="' + b + '" data-p="' + prefix + '">Check on Google</button><button type="button" class="btn" data-a="pfile" data-b="' + b + '" data-p="' + prefix + '">Use loan file address</button></div>' +
      '<div class="sr" id="mtBsr-' + b + prefix + '" hidden></div><p class="note">Type a street address and pick a suggestion to fill the city, state, ZIP and county (OpenStreetMap). Google opens a search in a new tab so you can confirm it. <button type="button" class="x" style="color:#9fc4ff" data-a="addrToggle">' + (window.MTAddr && MTAddr.isOff() ? 'Turn address suggestions on' : 'Turn address suggestions off') + '</button></p></fieldset>';
  }
  function psearch(b, p) {
    var s = drafts[b], q = [s[p + 'address'], s[p + 'city'], s[p + 'state'], s[p + 'zip']].filter(Boolean).join(', '), box = $('mtBsr-' + b + p);
    if (!q || !box) return; box.hidden = false; box.innerHTML = '<button type="button" disabled>Searching…</button>';
    fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=us&limit=6&q=' + encodeURIComponent(q), {headers: {'Accept-Language': 'en-US'}})
      .then(function (r) { return r.json(); }).then(function (list) {
        list = (list || []).filter(function (x) { return x.address; });
        if (!list.length) { box.innerHTML = '<button type="button" disabled>No match - check the spelling, or use Check on Google.</button>'; return; }
        box.innerHTML = list.map(function (x, i) { return '<button type="button" data-a="ppick" data-b="' + b + '" data-p="' + p + '" data-i="' + i + '">' + esc(x.display_name) + '</button>'; }).join('');
        box._list = list;
      }).catch(function () { box.innerHTML = '<button type="button" disabled>The address search did not answer - use Check on Google.</button>'; });
  }
  function ppick(b, p, i) {
    var box = $('mtBsr-' + b + p), x = box && box._list && box._list[i]; if (!x) return; var a = x.address, s = drafts[b];
    var street = [a.house_number, a.road].filter(Boolean).join(' ');
    if (street) s[p + 'address'] = street; s[p + 'city'] = a.city || a.town || a.village || a.hamlet || a.suburb || s[p + 'city'] || '';
    s[p + 'state'] = stateName(a.state || ''); s[p + 'zip'] = (a.postcode || '').slice(0, 5); s[p + 'county'] = String(a.county || '').replace(/ County$/, '');
    persist(); renderForm(); refresh();
  }
  function pfile(b, p) { var f = file(), s = drafts[b]; s[p + 'address'] = f.address; s[p + 'city'] = f.city; s[p + 'state'] = stateName(f.state); s[p + 'zip'] = f.zip; s[p + 'county'] = f.county; persist(); renderForm(); refresh(); }
  function addrOf(s, p) { p = p || ''; var free = String(s[p + 'addrFree'] || '').trim(); if (free) return free.replace(/\s*\n\s*/g, ', '); return fullAddress({address: s[p + 'address'], city: s[p + 'city'], state: s[p + 'state'], zip: s[p + 'zip']}); }

  /* ================================================================= ADDENDUM */
  var ADD_STYLES = [['master', 'Amendment to Contract of Sale - classic (Times)'], ['clean', 'Amendment to Contract of Sale - clean (Arial)'], ['numbered', 'Addendum #__ to Contract of Sale - numbered paragraphs'],
    ['purchase', 'Addendum to Purchase Agreement - headings and signature table'], ['fillin', 'Addendum to Real Estate Purchase and Sale Agreement - fill-in form'], ['letter', 'Formal addendum - letterhead with recitals']];
  var CLAUSES = {
    k203: 'The Buyer has applied for FHA Section 203(k) financing, and this Contract is contingent upon mortgage approval and the Buyer\'s acceptance of any additional required improvements as decided by the Lender/Mortgagee.',
    homestyle: 'The Buyer is financing this purchase with a Fannie Mae HomeStyle Renovation mortgage. This Contract is contingent upon the Buyer obtaining that financing and upon the Buyer\'s acceptance of the renovation scope, costs and any additional repairs or improvements required by the Lender.',
    fha: 'It is expressly agreed that notwithstanding any other provisions of this contract, the purchaser shall not be obligated to complete the purchase of the property described herein or to incur any penalty by forfeiture of earnest money deposits or otherwise unless the purchaser has been given in accordance with HUD/FHA or VA requirements a written statement by the Federal Housing Commissioner, Department of Veterans Affairs, or a Direct Endorsement lender setting forth the appraised value of the property of not less than {value}. The purchaser shall have the privilege and option of proceeding with consummation of the contract without regard to the amount of the appraised valuation. The appraised valuation is arrived at to determine the maximum mortgage the Department of Housing and Urban Development will insure. HUD does not warrant the value nor the condition of the property. The purchaser should satisfy himself/herself that the price and condition of the property are acceptable.',
    va: 'It is expressly agreed that, notwithstanding any other provisions of this contract, the purchaser shall not incur any penalty by forfeiture of earnest money or otherwise or be obligated to complete the purchase of the property described herein, if the contract purchase price or cost exceeds the reasonable value of the property established by the Department of Veterans Affairs. The purchaser shall, however, have the privilege and option of proceeding with the consummation of this contract without regard to the amount of the reasonable value established by the Department of Veterans Affairs.'
  };
  B.addendum = {
    label: 'Addendum', sub: 'Price, concession, parties, clauses',
    init: function () {
      var f = file(), d = {style: 'master', date: dateFromPicker(iso()), contractDate: '', number: '1', priorDocs: '', title: '', caps: true, shortMoney: false,
        buyers: f.borrowers.length ? f.borrowers.map(function (n) { return {name: n}; }) : [{name: ''}], sellers: [{name: '', by: ''}],
        address: f.address, city: f.city, state: stateName(f.state), zip: f.zip, county: f.county, addrFree: '',
        doPrice: !!f.price, fromPrice: f.price || '', toPrice: '', priceManual: false, doConc: !!f.concession, concDrv: 'amt', concAmt: f.concession || '', concPct: '', concOnTop: false, concShowPct: false, roundTo: '0',
        ttOn: true, ttRate: '', ttPayer: '', ttCover: true, doTT: false,
        program: f.program || 'FHA', occupancy: f.occupancy, downPct: f.downPct ? (f.downPct * 100).toFixed(2) : '3.5', nyc: false,
        doAddBuyer: false, addBuyerName: '', doRemoveBuyer: false, removeBuyerName: '', doClosing: false, closingDate: f.closingDate || '', doMortgage: false, mortgageDate: '',
        doAppraisal: false, appraisalValue: '', doRepairs: false, repairsText: '', doEmd: false, emd: f.emd || '',
        k203: /203|fha/i.test(f.program) && f.renovation, homestyle: false, fhaClause: false, vaClause: false, custom: [''], remain: true, leadText: '', remainText: '', over: {}};
      if (d.k203 && !/fha/i.test(f.program)) d.k203 = false;
      B.addendum.sync(d);
      return d;
    },
    /* drafts from 56.1 kept the concession as one value plus a mode */
    fix: function (s) {
      if (s.concDrv == null) { if (s.concMode === 'percent') { s.concDrv = 'pct'; s.concPct = s.concValue || ''; } else { s.concDrv = 'amt'; s.concAmt = s.concValue || ''; } s.concOnTop = !!s.priceUp; s.priceManual = false; }
      if (s.ttOn == null) { s.ttOn = true; s.ttCover = true; s.ttPayer = ''; s.ttRate = ''; }
      if (!s.over) s.over = {}; if (s.roundTo == null) s.roundTo = '0';
    },
    form: function () {
      var b = 'addendum', s = drafts[b], c = B.addendum.calc(s), ny = stateName(s.state) === 'New York';
      return dropZone('contract', 'Drop the purchase contract or an earlier addendum', 'PDF, photo or text. Buyers, sellers, address, price, date, deposit and concession are read into the form.') +
        '<fieldset><legend>Document</legend><div class="g">' + field(b, 'style', 'Style', {type: 'select', options: ADD_STYLES, wide: 1}) + field(b, 'date', 'Addendum date', {type: 'date'}) + field(b, 'contractDate', 'Contract dated', {type: 'date'}) +
        (s.style === 'numbered' ? field(b, 'number', 'Addendum number') + field(b, 'priorDocs', 'Earlier documents it amends', {type: 'textarea', wide: 1, rows: 2, ph: 'Attorney Review Addendum dated February 5, 2026; Addendum #1 dated February 10, 2026'}) : '') +
        field(b, 'title', 'Title (blank = the style\'s title)', {wide: 1, ph: 'e.g. RIDER TO CONTRACT OF SALE'}) + field(b, 'caps', 'Terms in capitals (classic styles)', {type: 'check'}) + field(b, 'shortMoney', 'Short amounts ($400K)', {type: 'check'}) + '</div></fieldset>' +
        people(b, 'buyers', 'Buyers', 4) + people(b, 'sellers', 'Sellers', 4, {extra: ['by', 'Signing for (optional)', 'By: name, Executor']}) + propertyBlock(b) +
        '<fieldset><legend>Purchase price & seller concession</legend><div class="g">' + field(b, 'fromPrice', 'Purchase price basis (contract price)', {type: 'money', wide: 1, ph: '400,000'}) + '</div>' +
        '<div class="sync" style="margin-top:8px"><label class="f">Concession (%)<input type="text" inputmode="decimal" data-b="addendum" data-k="concPct" value="' + esc(s.concPct) + '" placeholder="3" autocomplete="off"></label><span class="eq" aria-hidden="true">=</span><label class="f">Concession ($)<input type="text" inputmode="decimal" data-b="addendum" data-k="concAmt" value="' + esc(s.concAmt) + '" placeholder="12,000" autocomplete="off"></label></div>' +
        '<p class="note" style="margin-top:4px">Type either box - the other follows. The percent is of the final purchase price. You typed the <b id="mtBdrv">' + (s.concDrv === 'pct' ? 'percent' : 'dollar amount') + '</b>, so it stays fixed when the price changes.</p>' +
        '<div class="g" style="margin-top:8px">' + field(b, 'concOnTop', 'Add the concession on top of the price (unticked: the concession is included in the price)', {type: 'check', wide: 1}) +
        field(b, 'ttOn', 'Include transfer tax', {type: 'check', wide: 1}) +
        (s.ttOn ? field(b, 'ttRate', 'Transfer tax rate (%) - blank uses the state table', {type: 'pct', ph: c.ttTable != null ? (c.ttTable * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') : 'No table entry'}) +
          field(b, 'ttPayer', 'Paid by', {type: 'select', options: [['', 'As the state table says' + (c.ttTablePayer ? ' (' + c.ttTablePayer + ')' : '')], ['Seller', 'Seller'], ['Buyer', 'Buyer'], ['Split', 'Split 50/50']]}) +
          (s.concOnTop ? field(b, 'ttCover', 'Raise the price to cover the seller\'s added transfer tax (seller nets the same)', {type: 'check', wide: 1}) : '') : '') +
        (s.concOnTop ? field(b, 'roundTo', 'Round the new price up to', {type: 'select', options: [['0', 'No rounding (to the cent)'], ['1', 'Whole dollar'], ['100', '$100'], ['500', '$500'], ['1000', '$1,000']]}) : '') + '</div>' +
        '<div class="g" style="margin-top:8px"><label class="f w">New purchase price <span class="man" id="mtBman"' + (s.priceManual ? '' : ' hidden') + '>typed by you</span><span id="mtBcalcd"' + (s.priceManual ? ' hidden' : '') + '>(calculated - type to set it yourself)</span><input type="text" inputmode="decimal" data-b="addendum" data-k="toPrice" value="' + esc(s.priceManual ? s.toPrice : (c.price ? c.price.toFixed(2) : '')) + '" autocomplete="off"></label>' +
        '<div class="w" id="mtBpc"' + (s.priceManual ? '' : ' hidden') + '><button type="button" class="btn" data-a="priceCalc">Use the calculated price</button></div>' +
        field(b, 'program', 'Loan program', {list: ['FHA', 'FHA 203(k)', 'Conventional', 'HomeStyle', 'VA', 'USDA']}) + field(b, 'occupancy', 'Occupancy', {list: ['Primary Residence', 'Second Home', 'Investment']}) + field(b, 'downPct', 'Down payment (%)', {type: 'pct'}) +
        '<span id="mtBnyc" class="w"' + (ny ? '' : ' hidden') + '>' + field(b, 'nyc', 'Property is in New York City', {type: 'check'}) + '</span></div><div id="mtBconc"></div>' +
        '<div class="row" style="margin-top:8px"><button type="button" class="btn" data-a="concUse">Put price and concession in the addendum</button><button type="button" class="btn" data-a="concLoan">Send price and concession to the Loan Suite</button></div></fieldset>' +
        '<fieldset><legend>What the addendum changes</legend><div class="g">' +
        field(b, 'doPrice', 'Purchase price', {type: 'check'}) + field(b, 'doConc', 'Seller concession', {type: 'check'}) + field(b, 'concShowPct', 'Show the concession percent too', {type: 'check'}) + field(b, 'doTT', 'Who pays the transfer tax', {type: 'check'}) +
        field(b, 'doAddBuyer', 'Add a purchaser', {type: 'check'}) + field(b, 'addBuyerName', 'Name to add') + field(b, 'doRemoveBuyer', 'Remove a purchaser', {type: 'check'}) + field(b, 'removeBuyerName', 'Name to remove') +
        field(b, 'doClosing', 'Closing date', {type: 'check'}) + field(b, 'closingDate', 'New closing date', {type: 'date', ph: 'on or about May 1, 2026'}) + field(b, 'doMortgage', 'Mortgage commitment date', {type: 'check'}) + field(b, 'mortgageDate', 'Commitment due by', {type: 'date'}) +
        field(b, 'doAppraisal', 'Appraisal gap / value', {type: 'check'}) + field(b, 'appraisalValue', 'Appraised value', {type: 'money'}) + field(b, 'doEmd', 'Earnest money', {type: 'check'}) + field(b, 'emd', 'Deposit amount', {type: 'money'}) +
        field(b, 'doRepairs', 'Repairs / credit', {type: 'check', wide: 1}) + field(b, 'repairsText', 'Repairs or credit terms', {type: 'textarea', wide: 1, rows: 2}) + '</div></fieldset>' +
        '<fieldset><legend>Financing clauses</legend>' + field(b, 'k203', 'FHA 203(k) verbiage (lender-required wording)', {type: 'check'}) + field(b, 'homestyle', 'Fannie Mae HomeStyle renovation verbiage', {type: 'check'}) +
        field(b, 'fhaClause', 'FHA amendatory clause', {type: 'check'}) + field(b, 'vaClause', 'VA escape clause', {type: 'check'}) + field(b, 'remain', '"All other terms remain the same" line', {type: 'check'}) + '</fieldset>' +
        '<fieldset><legend>Other terms</legend><div class="list">' + s.custom.map(function (c, i) { return '<div class="it"><div class="hd"><b style="flex:1">Term ' + (i + 1) + '</b>' + (s.custom.length > 1 ? '<button type="button" class="x" data-a="rm" data-b="addendum" data-list="custom" data-i="' + i + '">Remove</button>' : '') + '</div><textarea data-b="addendum" data-list="custom" data-i="' + i + '" rows="2" placeholder="Any other change, in your words">' + esc(c) + '</textarea></div>'; }).join('') +
        '</div><button type="button" class="btn" data-a="add" data-b="addendum" data-list="custom">+ Add a term</button></fieldset>' +
        '<fieldset class="wd"><legend>Wording - edit any section</legend><p class="note" style="margin:0 0 8px">Each section prints exactly as it reads here. Change the words freely; Reset brings back the wording built from the form.</p>' +
        field(b, 'leadText', 'Opening line', {wide: 1, ph: 'THE CONTRACT OF SALE SHALL BE AMENDED AS FOLLOWS:'}) + '<div id="mtBwording" class="list" style="margin-top:8px"></div>' +
        field(b, 'remainText', 'Closing line', {type: 'textarea', wide: 1, rows: 2, ph: 'ALL OTHER TERMS AND CONDITIONS OF THE CONTRACT OF SALE REMAIN THE SAME.'}) + '</fieldset>';
    },
    /* transfer tax: the rate typed here, or the state table at that price */
    ttAt: function (s, price) {
      if (s.ttRate !== '' && s.ttRate != null && isFinite(parseFloat(s.ttRate))) return N(s.ttRate) / 100;
      var t = transferTax(s.state, price, s.nyc); return t ? t.rate : 0;
    },
    calc: function (s) {
      var basis = N(s.fromPrice), p = N(s.concPct) / 100, a = N(s.concAmt), drv = s.concDrv === 'pct' ? 'pct' : 'amt', top = !!s.concOnTop, A = B.addendum;
      var tab = transferTax(s.state, basis, s.nyc), payer = s.ttPayer || (tab ? tab.payer : 'Seller') || 'Seller';
      var sellerShare = !s.ttOn ? 0 : /^buyer/i.test(payer) ? 0 : /split/i.test(payer) ? .5 : tab && !s.ttPayer && tab.buyerShare ? 1 - tab.buyerShare : 1;
      var price = basis, cover = top && s.ttOn && s.ttCover !== false, manual = !!s.priceManual && N(s.toPrice) > 0;
      if (manual) price = N(s.toPrice);
      else if (top) {
        var r0 = cover ? A.ttAt(s, basis) * sellerShare : 0;
        for (var k = 0; k < 6; k++) { var r = cover ? A.ttAt(s, price) * sellerShare : 0; price = drv === 'pct' ? (1 - p - r > 0 ? basis * (1 - r0) / (1 - p - r) : basis) : (1 - r > 0 ? (basis * (1 - r0) + a) / (1 - r) : basis + a); }
        var rt = N(s.roundTo); price = rt ? Math.ceil(price / rt - 1e-9) * rt : Math.round(price * 100) / 100;
      }
      var conc = Math.round((drv === 'pct' ? price * p : a) * 100) / 100;
      var down = N(s.downPct) / 100, loan = price * (1 - down), ltv = price ? loan / price : 0, lim = concessionLimit(s.program, occNorm(s.occupancy), ltv), max = price * lim.limitPct;
      var rate0 = s.ttOn ? A.ttAt(s, basis) : 0, rate1 = s.ttOn ? A.ttAt(s, price) : 0, tt0 = basis * rate0, tt1 = price * rate1;
      var m0 = mansionTax(s.state, basis), m1 = mansionTax(s.state, price);
      return {base: basis, price: price, conc: conc, concPct: price ? conc / price : 0, drv: drv, top: top, manual: manual, ltv: ltv, loan: loan, limit: lim, max: max, over: conc - max,
        ttOn: !!s.ttOn, rate0: rate0, rate1: rate1, tt0: tt0, tt1: tt1, payer: payer, sellerShare: sellerShare, sellerTT0: tt0 * sellerShare, sellerTT1: tt1 * sellerShare, buyerTT1: tt1 * (1 - sellerShare),
        ttTable: tab ? tab.rate : null, ttTablePayer: tab ? tab.payer : '', ttNote: tab ? tab.note : '',
        net0: basis - tt0 * sellerShare, net1: price - conc - tt1 * sellerShare, m0: m0 ? basis * m0.rate : 0, m1: m1 ? price * m1.rate : 0, mansion: m1};
    },
    /* keeps the % and $ boxes and the new price in step with each other */
    sync: function (s) {
      var c = B.addendum.calc(s), pctTxt = c.price ? String(+(c.concPct * 100).toFixed(4)) : '';
      if (c.drv === 'pct') s.concAmt = s.concPct === '' ? '' : c.conc.toFixed(2); else s.concPct = s.concAmt === '' ? '' : pctTxt;
      if (!s.priceManual) s.toPrice = c.price ? c.price.toFixed(2) : '';
      var ae = document.activeElement;
      ['concAmt', 'concPct', 'toPrice'].forEach(function (k) { var el = document.querySelector('#mtB [data-b="addendum"][data-k="' + k + '"]'); if (el && el !== ae) el.value = s[k]; });
      var d = $('mtBdrv'); if (d) d.textContent = c.drv === 'pct' ? 'percent' : 'dollar amount';
      var tr = document.querySelector('#mtB [data-b="addendum"][data-k="ttRate"]'); if (tr) tr.placeholder = c.ttTable != null ? String(+(c.ttTable * 100).toFixed(4)) : 'No table entry';
      var nyc = $('mtBnyc'); if (nyc) nyc.hidden = stateName(s.state) !== 'New York';
      [['mtBman', !s.priceManual], ['mtBcalcd', !!s.priceManual], ['mtBpc', !s.priceManual]].forEach(function (x) { var e = $(x[0]); if (e) e.hidden = x[1]; });
      return c;
    },
    side: function () {
      var s = drafts.addendum, c = B.addendum.calc(s), el = $('mtBconc'); if (!el) return;
      var ttLine = !c.ttOn ? '<span>Transfer tax</span><b>Not included</b>' : !c.rate0 && !c.rate1 ? '<span>Transfer tax</span><b>' + (s.state ? 'No table entry - type a rate' : 'Enter the state') + '</b>' :
        '<span>Transfer tax at ' + usd(c.base, 0) + ' (' + pct(c.rate0, 3) + ')</span><b>' + usd(c.tt0) + '</b><span>Transfer tax at ' + usd(c.price, 0) + ' (' + pct(c.rate1, 3) + ')</span><b>' + usd(c.tt1) + '</b><span>Change in transfer tax</span><b class="' + (c.tt1 - c.tt0 > 0.005 ? 'warn' : '') + '">' + usd(c.tt1 - c.tt0) + '</b>' +
        '<span>Paid by</span><b>' + esc(c.payer) + (c.sellerShare > 0 && c.sellerShare < 1 ? ' (seller ' + pct(c.sellerShare, 0) + ')' : '') + '</b>';
      el.innerHTML = '<div class="kv"><span>Purchase price basis</span><b>' + usd(c.base) + '</b><span>New purchase price' + (c.manual ? ' (typed)' : c.top ? ' (concession on top)' : ' (concession included)') + '</span><b>' + usd(c.price) + '</b><span>Price change</span><b>' + usd(c.price - c.base) + '</b>' +
        '<span>Seller concession</span><b>' + usd(c.conc) + ' (' + pct(c.concPct, 3) + ')</b>' + ttLine +
        '<span>Seller nets before (price' + (c.sellerTT0 ? ' less transfer tax' : '') + ')</span><b>' + usd(c.net0) + '</b><span>Seller nets after (less concession' + (c.sellerTT1 ? ' and transfer tax' : '') + ')</span><b class="' + (c.net1 - c.net0 < -0.005 ? 'warn' : 'ok') + '">' + usd(c.net1) + '</b>' +
        '<span>Loan ' + pct(c.ltv) + ' LTV</span><b>' + usd(c.loan) + '</b><span>Maximum concession (' + pct(c.limit.limitPct, 0) + ')</span><b class="' + (c.over > 0.005 ? 'bad' : 'ok') + '">' + usd(c.max) + (c.over > 0.005 ? ' - over by ' + usd(c.over) : '') + '</b>' +
        (c.m1 || c.m0 ? '<span>Mansion tax (' + esc(c.mansion ? c.mansion.payer : 'Buyer') + ')</span><b>' + usd(c.m0) + ' → ' + usd(c.m1) + '</b>' : '') + '</div>' +
        '<p class="note">' + esc(c.limit.note || '') + (c.ttOn && c.ttNote ? ' · Transfer tax: ' + esc(c.ttNote) + '. Local or county transfer taxes may be added.' : '') + '</p>';
      B.addendum.wording();
    },
    /* the Wording list: every section the addendum prints, each one editable */
    wording: function () {
      var box = $('mtBwording'), s = drafts.addendum; if (!box || box.contains(document.activeElement)) return;
      var classic = s.style === 'master' || s.style === 'clean', T = B.addendum.terms(s, true);
      box.innerHTML = T.length ? T.map(function (t) { var ov = s.over && s.over[t.key] != null && s.over[t.key] !== '';
        return '<div class="it"><div class="hd"><b style="flex:1">' + esc(t.h) + (ov ? ' <span class="ed">edited</span>' : '') + '</b>' + (ov ? '<button type="button" class="x" data-a="overReset" data-key="' + t.key + '">Reset</button>' : '') + '</div>' +
          '<textarea data-b="addendum" data-over="' + t.key + '" rows="' + (classic ? 2 : 3) + '" aria-label="' + esc(t.h) + ' wording">' + esc(ov ? s.over[t.key] : classic ? t.short0 : t.t0) + '</textarea></div>'; }).join('') :
        '<p class="note" style="margin:0">Tick a change above (price, concession, closing date…) and its wording appears here to edit.</p>';
    },
    concUse: function () { var s = drafts.addendum, c = B.addendum.calc(s); s.doPrice = Math.abs(c.price - c.base) > 0.004 || !!s.doPrice; s.doConc = c.conc > 0; persist(); renderForm(); refresh(); say('Price ' + usd(c.price) + ' and concession ' + usd(c.conc) + ' are in the addendum.'); },
    concLoan: function () {
      var s = drafts.addendum, c = B.addendum.calc(s), st = store();
      if (st && st.setField) { st.setField('basePurchasePrice', c.price, 'Addendum'); st.setField('sellerConcessionAmount', c.conc, 'Addendum'); say('Loan Suite: price ' + usd(c.price) + ', concession ' + usd(c.conc) + '.'); return; }
      var q = []; try { q = JSON.parse(localStorage.getItem('mt.docs.queue.v1') || '[]'); } catch (e) {}
      q.push({dest: 'loan:basePurchasePrice', value: c.price, label: 'Purchase price', doc: 'Addendum', at: Date.now()}, {dest: 'loan:sellerConcessionAmount', value: c.conc, label: 'Seller concession', doc: 'Addendum', at: Date.now()});
      try { localStorage.setItem('mt.docs.queue.v1', JSON.stringify(q)); } catch (e) {}
      say('Price and concession will be placed when the Loan Suite opens.');
    },
    terms: function (s, raw) {
      var c = B.addendum.calc(s), out = [], money = function (v) { return s.shortMoney ? short$(v) : usd(v); }, buyers = names(s.buyers);
      var price = c.price, conc = c.conc, cp = s.concShowPct && price ? +(c.concPct * 100).toFixed(3) + '% of the Purchase Price, ' : '', cps = s.concShowPct && price ? +(c.concPct * 100).toFixed(3) + '% (' : '';
      var push = function (key, h, t, short, extra) { var o = {key: key, h: h, t0: t, short0: short, t: t, short: short}; if (!raw && s.over && s.over[key] != null && s.over[key] !== '') { o.t = o.short = s.over[key]; o.edited = true; } for (var x in extra || {}) o[x] = extra[x]; out.push(o); };
      if (s.doAddBuyer && s.addBuyerName) push('addBuyer', 'Addition of Purchaser', 'The parties agree to add ' + s.addBuyerName + ' as an additional purchaser under the Agreement. All rights and obligations of the Buyer shall be held jointly and severally by ' + joinNames(buyers.indexOf(s.addBuyerName) < 0 ? buyers.concat(s.addBuyerName) : buyers) + '.', 'ADD ' + s.addBuyerName + ' AS A PURCHASER');
      if (s.doRemoveBuyer && s.removeBuyerName) push('removeBuyer', 'Removal of Purchaser', 'The parties agree to remove ' + s.removeBuyerName + ' as a purchaser under the Agreement. The remaining Buyer(s) assume all rights and obligations of the Buyer.', 'REMOVE ' + s.removeBuyerName + ' AS A PURCHASER');
      if (s.doPrice && price) push('price', 'Purchase Price', 'The parties agree to amend the Purchase Price in the Agreement ' + (c.base && Math.abs(c.base - price) > 0.004 ? 'from ' + usd(c.base) + ' to ' : 'to ') + usd(price) + '.', 'ADJUST PURCHASE PRICE TO ' + money(price), {price: price});
      if (s.doConc && conc) push('conc', 'Seller Concession', 'Seller agrees to credit Buyer at closing ' + cp + 'the amount of ' + usd(conc) + ', toward Buyer\'s closing costs, prepaid items and other costs allowed by Buyer\'s lender' + (c.top ? '' : ', which credit is included in the Purchase Price') + '.', (cps ? cps + money(conc) + ')' : money(conc)) + ' SELLER CONCESSION', {conc: conc});
      if (s.doTT && c.ttOn) { var who = /buyer/i.test(c.payer) ? 'Buyer' : /split/i.test(c.payer) ? 'Buyer and Seller in equal shares' : 'Seller';
        push('tt', 'Transfer Tax', 'The ' + (stateName(s.state) || 'state') + ' real property transfer tax' + (c.tt1 ? ', estimated at ' + usd(c.tt1) + ' on the Purchase Price,' : '') + ' shall be paid by ' + who + ' at closing.', 'TRANSFER TAX' + (c.tt1 ? ' OF ' + money(c.tt1) : '') + ' TO BE PAID BY ' + who.toUpperCase()); }
      if (s.doEmd && N(s.emd)) push('emd', 'Earnest Money', 'The earnest money deposit shall be ' + usd(s.emd) + ', to be held in escrow as provided in the Agreement.', 'EARNEST MONEY DEPOSIT OF ' + money(s.emd));
      if (s.doClosing && s.closingDate) { var cd = when(s.closingDate), ph = isPhrase(s.closingDate); push('closing', 'Closing Date', 'The closing date is amended to ' + (ph ? '' : 'on or about ') + cd + '.', 'CLOSING DATE ' + (ph ? '' : 'ON OR ABOUT ') + cd.toUpperCase()); }
      if (s.doMortgage && s.mortgageDate) push('mortgage', 'Mortgage Commitment', 'The date by which Buyer must obtain a mortgage commitment is extended to ' + when(s.mortgageDate) + '.', 'MORTGAGE COMMITMENT DATE EXTENDED TO ' + when(s.mortgageDate).toUpperCase());
      if (s.doAppraisal && N(s.appraisalValue)) push('appraisal', 'Appraisal', 'The property has appraised at ' + usd(s.appraisalValue) + '. The parties agree that the Purchase Price stated in this Addendum governs, and Buyer waives any appraisal contingency to the extent of that value.', 'APPRAISED VALUE OF ' + money(s.appraisalValue) + ' ACKNOWLEDGED');
      if (s.doRepairs && s.repairsText) push('repairs', 'Repairs / Credit', s.repairsText, s.repairsText);
      if (s.k203) push('k203', 'FHA 203(k) Financing', CLAUSES.k203, CLAUSES.k203);
      if (s.homestyle) push('homestyle', 'HomeStyle Renovation Financing', CLAUSES.homestyle, CLAUSES.homestyle);
      if (s.fhaClause) push('fha', 'FHA Amendatory Clause', CLAUSES.fha.replace('{value}', usd(price)), CLAUSES.fha.replace('{value}', usd(price)));
      if (s.vaClause) push('va', 'VA Escape Clause', CLAUSES.va, CLAUSES.va);
      (s.custom || []).forEach(function (x, i) { if (x && x.trim()) out.push({key: 'custom' + i, h: 'Additional Terms', t: x, short: x, t0: x, short0: x, custom: true}); });
      return raw ? out.filter(function (t) { return !t.custom; }) : out;
    },
    doc: function (s) {
      var T = B.addendum.terms(s), buyers = names(s.buyers), sellers = (s.sellers || []).filter(function (p) { return p && p.name; }), addr = addrOf(s), st = s.style;
      var caps = function (t) { return s.caps ? String(t).toUpperCase() : t; };
      var sigs = function (role, list, n) { var h = ''; for (var i = 0; i < Math.max(n, list.length); i++) { var p = list[i] || {}; h += '<div class="sig"><div class="sl"></div><span class="dt">Dated: <i></i></span><div class="sn">' + role + (p.name ? ' &nbsp;<span class="pn">' + esc(p.name) + (p.by ? '<br>By: ' + esc(p.by) : '') + '</span>' : '') + '</div></div>'; } return h; };
      var bl = buyers.map(function (n) { return {name: n}; });
      if (st === 'master' || st === 'clean') {
        var price = T.filter(function (t) { return t.price; })[0], conc = T.filter(function (t) { return t.conc; })[0], lines = [];
        if (price || conc) lines.push('PLEASE ' + (price ? price.short : '') + (price && conc ? ' WITH A ' : conc ? 'PROVIDE A ' : '') + (conc ? conc.short : ''));
        T.forEach(function (t) { if (t !== price && t !== conc) lines.push(t.short); });
        if (s.remain) lines.push(s.remainText || 'ALL OTHER TERMS AND CONDITIONS OF THE CONTRACT OF SALE REMAIN THE SAME.');
        return page(st === 'master' ? 'tnr' : 'ari', '<h1 class="u">' + esc(s.title || 'AMENDMENT TO CONTRACT OF SALE') + '</h1>' +
          '<table class="hdr"><tr><td><u>DATE:</u></td><td>' + esc(caps(when(s.date, ordDate))) + '</td></tr><tr><td><u>SELLERS:</u></td><td>' + esc(caps(sellers.map(function (p) { return p.name + (p.by ? ' (by ' + p.by + ')' : ''); }).join(', '))) + '</td></tr>' +
          '<tr><td><u>BUYERS:</u></td><td>' + esc(caps(joinNames(buyers))) + '</td></tr><tr><td><u>PREMISES:</u></td><td>' + esc(caps(addr)) + '</td></tr>' + (s.contractDate ? '<tr><td><u>CONTRACT:</u></td><td>' + esc(caps('Dated ' + when(s.contractDate))) + '</td></tr>' : '') + '</table>' +
          '<p class="lead">' + esc(caps(s.leadText || 'THE CONTRACT OF SALE SHALL BE AMENDED AS FOLLOWS:')) + '</p>' + lines.map(function (l) { return '<p class="term">' + esc(caps(l)) + '</p>'; }).join('') +
          (bl.length + sellers.length > 4 ? '<div class="sigs two"><div>' + sigs('Purchaser', bl, bl.length) + '</div><div>' + sigs('Seller', sellers, sellers.length) + '</div></div>' : '<div class="sigs">' + sigs('Purchaser', bl, Math.max(2, bl.length)) + sigs('Seller', sellers, Math.max(2, sellers.length)) + '</div>'), CSS_ADD_MASTER);
      }
      if (st === 'numbered') {
        var docs = [s.contractDate ? 'The Contract of Sale dated ' + when(s.contractDate) : 'The Contract of Sale'].concat((s.priorDocs || '').split(/;|\n/).map(function (x) { return x.trim(); }).filter(Boolean));
        var items = T.map(function (t) { return t.t; }); if (s.remain) items.push(s.remainText || 'Unless modified herein, all other provisions of ' + joinNames(docs).replace(/^The /, 'the ') + ' shall remain in full force and effect.');
        return page('tnr', '<h1 class="b">' + esc(s.title || 'ADDENDUM #' + (s.number || '1') + ' TO CONTRACT OF SALE') + '</h1><table class="hdr b"><tr><td>BUYER' + (buyers.length > 1 ? 'S' : '') + ':</td><td>' + esc(joinNames(buyers)) + '</td></tr><tr><td>SELLER' + (sellers.length > 1 ? 'S' : '') + ':</td><td>' + esc(sellers.map(function (p) { return p.name; }).join(', ')) + '</td></tr><tr><td>PROPERTY:</td><td>' + esc(addr) + '</td></tr></table>' +
          '<p>' + esc(s.leadText || joinNames(docs) + (docs.length > 1 ? ' are' : ' is') + ' hereby amended as follows:') + '</p><ol>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
          '<div class="sig2' + (bl.length + sellers.length > 3 ? ' two' : '') + '">' + bl.map(function (p) { return '<div class="r"><div><div class="sl"></div>' + esc(p.name) + '</div><div>Buyer</div></div>'; }).join('') + sellers.map(function (p) { return '<div class="r"><div><div class="sl"></div>' + esc(p.name) + (p.by ? '<br>By: ' + esc(p.by) : '') + '</div><div>Seller</div></div>'; }).join('') + '</div><p style="margin-top:28px">Dated: ' + esc(when(s.date)) + '</p>', CSS_ADD_NUM);
      }
      if (st === 'purchase') {
        var it = T.map(function (t) { return '<p><b>' + esc(t.h) + '.</b> ' + esc(t.t) + '</p>'; }); if (s.remain) it.push('<p><b>All Other Terms.</b> ' + esc(s.remainText || 'All other terms and conditions of the Agreement shall remain in full force and effect.') + '</p>');
        it = it.map(function (x, i) { return x.replace('<p><b>', '<p><b>' + (i + 1) + '. '); });
        var rows = Math.max(bl.length, sellers.length, 1), tr = '';
        for (var i = 0; i < rows; i++) tr += '<tr><td>' + (bl[i] ? '<div class="sl"></div>' + esc(bl[i].name) : '') + '</td><td>' + (sellers[i] ? '<div class="sl"></div>' + esc(sellers[i].name) + (sellers[i].by ? '<br>By: ' + esc(sellers[i].by) : '') : '') + '</td></tr>';
        return page('tnr', '<h1 class="big">' + esc(s.title || 'ADDENDUM TO PURCHASE AGREEMENT') + '</h1><p><b>DATE:</b> ' + esc(when(s.date)) + '</p><p><b>BUYER:</b> ' + esc(buyers.join(', ')) + '</p><p><b>SELLER:</b> ' + esc(sellers.map(function (p) { return p.name; }).join(', ')) + '</p><p><b>PROPERTY ADDRESS:</b> ' + esc(addr) + '</p>' +
          '<p>' + esc(s.leadText || 'This Addendum is made a part of the Purchase Agreement' + (s.contractDate ? ' dated ' + when(s.contractDate) : '') + ' (the "Agreement"), for the property identified above.') + '</p>' + it.join('') +
          '<table class="st"><tr><th>BUYER' + (bl.length > 1 ? 'S' : '') + '</th><th>SELLER' + (sellers.length > 1 ? 'S' : '') + '</th></tr>' + tr + '<tr><td>Date: ______________________</td><td>Date: ______________________</td></tr></table>', CSS_ADD_PURCHASE);
      }
      if (st === 'fillin') {
        var body = T.map(function (t) { return t.t; }).join('\n\n');
        return page('tnr', '<h1 class="bu">' + esc(s.title || 'ADDENDUM TO REAL ESTATE PURCHASE AND SALE AGREEMENT') + '</h1><p class="ind">The undersigned parties to a Purchase and Sale Agreement dated <span class="fl">' + esc(when(s.contractDate) || ' ') + '</span>, by and between <span class="fl">' + esc(joinNames(buyers)) + '</span> ("Purchaser"), and <span class="fl">' + esc(sellers.map(function (p) { return p.name; }).join(', ')) + '</span> ("Seller"), for the purchase and sale of that certain property municipally known as <span class="fl">' + esc(addr) + '</span> ("Property"), hereby mutually agree to amend said Agreement as follows:</p>' +
          '<div class="big"' + (body.length > 900 ? ' style="font-size:11pt;margin:.15in 0 .25in .3in;min-height:0"' : body.length > 450 ? ' style="font-size:13.5pt;margin:.2in 0 .3in .35in;min-height:1in"' : '') + '>' + esc(body).replace(/\n/g, '<br>') + '</div>' + (s.remain ? '<p class="ind">' + esc(s.remainText || 'All other terms and conditions of the Sales Contract to remain the same.') + '</p>' : '') +
          '<p><b>BUYER(S):</b></p>' + bl.concat(bl.length ? [] : [{}]).map(function (p) { return '<div class="r2"><span class="sl2">' + esc(p.name || '') + '</span>Date: <span class="sl3"></span></div>'; }).join('') +
          '<p><b>SELLER(S):</b></p>' + (sellers.length ? sellers : [{}]).map(function (p) { return '<div class="r2"><span class="sl2">' + esc(p.name || '') + '</span>Date: <span class="sl3"></span></div>'; }).join(''), CSS_ADD_FILL);
      }
      /* letter: formal recitals */
      return page('geo', '<div class="lh">' + esc(addr) + '</div><h1>' + esc(s.title || 'ADDENDUM TO CONTRACT OF SALE') + '</h1>' +
        '<p>This Addendum is entered into on ' + esc(when(s.date)) + ' by and between ' + esc(joinNames(buyers)) + ' ("Buyer") and ' + esc(sellers.map(function (p) { return p.name; }).join(', ')) + ' ("Seller").</p>' +
        '<p><b>RECITALS.</b> Buyer and Seller are parties to a contract of sale' + (s.contractDate ? ' dated ' + esc(when(s.contractDate)) : '') + ' for the premises known as ' + esc(addr) + ' (the "Contract"), and now wish to amend the Contract as set out below.</p>' +
        '<p>' + (s.leadText ? esc(s.leadText) : '<b>NOW, THEREFORE,</b> the parties agree as follows:') + '</p><ol>' + T.map(function (t) { return '<li><b>' + esc(t.h) + '.</b> ' + esc(t.t) + '</li>'; }).join('') + (s.remain ? '<li><b>Ratification.</b> ' + esc(s.remainText || 'Except as amended here, the Contract remains unchanged and in full force and effect. If this Addendum and the Contract conflict, this Addendum controls.') + '</li>' : '') + '</ol>' +
        '<div class="grid2"><div><b>BUYER' + (bl.length > 1 ? 'S' : '') + '</b>' + bl.map(function (p) { return '<div class="sl"></div>' + esc(p.name) + '<br><span class="d">Date: __________</span>'; }).join('') + '</div><div><b>SELLER' + (sellers.length > 1 ? 'S' : '') + '</b>' + sellers.map(function (p) { return '<div class="sl"></div>' + esc(p.name) + (p.by ? '<br>By: ' + esc(p.by) : '') + '<br><span class="d">Date: __________</span>'; }).join('') + '</div></div>', CSS_ADD_LETTER);
    }
  };
  var CSS_PAGE = '@page{size:letter;margin:0}*{box-sizing:border-box}html{background:#7b8394}body{margin:0;padding:18px 0}.pg{width:8.5in;min-height:11in;margin:0 auto 18px;background:#fff;color:#000;padding:1in 1in .8in;position:relative;box-shadow:0 4px 18px rgba(0,0,0,.35)}' +
    '@media print{html,body{background:#fff;padding:0}.pg{margin:0;box-shadow:none;page-break-after:always}.pg:last-child{page-break-after:auto}}.tnr{font-family:"Times New Roman",Times,serif;font-size:12pt}.ari{font-family:Arial,Helvetica,sans-serif;font-size:11pt}.geo{font-family:Georgia,"Times New Roman",serif;font-size:11.5pt}.cal{font-family:Calibri,"Segoe UI",Arial,sans-serif;font-size:11pt}';
  CSS_PAGE += '.fitw{transform-origin:0 0}.pg.fitted{height:11in;min-height:0;overflow:hidden}.pg.fitc{padding:.45in .55in!important}.pg.fitc .hd.m{margin:-.45in -.55in 14px}';
  var CSS_ADD_MASTER = '.sigs.two{display:grid;grid-template-columns:1fr 1fr;gap:.35in;margin-top:.2in}.sigs.two .sig{width:auto;margin:0 0 .22in}.sigs.two .sig .sl{width:100%}.sigs.two .sig .dt{position:static;display:block;margin-top:2px}' + 'h1.u{text-align:center;font-weight:400;font-size:12pt;text-decoration:underline;margin:.6in 0 .3in}.ari h1.u{text-decoration:none}table.hdr{border-collapse:collapse;margin:0 0 .25in .1in}table.hdr td{padding:5px 10px 9px 0;vertical-align:top}.ari table.hdr td:first-child u{text-decoration:none}' +
    'p.lead{margin:.15in 0 .2in}p.term{margin:0 0 .15in}.ari p.lead,.ari p.term{text-align:center;font-size:9.5pt}.sigs{margin-top:.25in}.sig{position:relative;margin:0 0 .28in .1in;width:6.4in}.sig .sl{border-bottom:1px solid #000;width:4.1in;height:22px}.sig .dt{position:absolute;left:4.25in;top:4px}.sig .dt i{display:inline-block;width:1.1in;border-bottom:1px solid #000}.sig .sn{margin-top:2px}.sig .pn{font-size:9pt;color:#333}';
  var CSS_ADD_NUM = '.sig2.two{display:grid;grid-template-columns:1fr 1fr;gap:.1in .35in;margin-top:.45in}.sig2.two .r{width:auto;margin-bottom:.3in}.sig2.two .sl{width:2.2in}' + 'h1.b{text-align:center;font-size:12.5pt;margin:.4in 0 .3in}table.hdr{border-collapse:collapse;margin-bottom:.25in}table.hdr td{padding:1px 10px 1px 0;vertical-align:top}table.hdr td:first-child{font-weight:700}p,li{line-height:1.35}ol{padding-left:.25in}li{margin:0 0 .12in;padding-left:4px}.sig2{margin-top:.7in}.sig2 .r{display:flex;justify-content:space-between;width:5.2in;margin-bottom:.45in}.sig2 .sl{border-bottom:1px solid #000;width:3.1in;height:18px;margin-bottom:2px}';
  var CSS_ADD_PURCHASE = 'h1.big{text-align:center;font-size:18pt;margin:.3in 0 .45in}p{line-height:1.35;margin:0 0 .13in}table.st{width:100%;border-collapse:collapse;margin-top:.45in}table.st th,table.st td{border:1px solid #000;text-align:left;font-weight:400;padding:4px 6px;vertical-align:bottom;width:50%}table.st .sl{border-bottom:1px solid #000;width:2.4in;height:22px;margin-bottom:2px}';
  var CSS_ADD_FILL = 'h1.bu{text-align:center;font-size:13pt;text-decoration:underline;margin:.2in 0 .35in}p.ind{text-indent:.6in;line-height:1.6}.fl{border-bottom:1px solid #000;padding:0 6px;font-family:Arial,sans-serif;font-size:10.5pt}.big{font-family:Arial,sans-serif;font-size:19pt;line-height:1.25;margin:.3in 0 .5in .45in;min-height:2in}.r2{display:flex;align-items:flex-end;gap:10px;margin:.18in 0}.sl2{display:inline-block;width:3in;border-bottom:1px solid #000;min-height:18px;font-family:Arial,sans-serif;font-size:10pt}.sl3{display:inline-block;width:2.1in;border-bottom:1px solid #000;margin-left:6px}';
  var CSS_ADD_LETTER = '.lh{text-align:right;font-size:9.5pt;color:#555;border-bottom:2px solid #1f3a5f;padding-bottom:6px;margin-bottom:.3in}h1{font-size:15pt;text-align:center;letter-spacing:.06em;color:#1f3a5f;margin:0 0 .3in}p,li{line-height:1.45;margin:0 0 .12in}ol{padding-left:.3in}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:.4in;margin-top:.5in}.grid2 .sl{border-bottom:1px solid #000;height:30px;margin:.12in 0 2px}.grid2 .d{font-size:9.5pt;color:#444}';
  function page(font, body, css, extra) { return '<!doctype html><html><head><meta charset="utf-8"><title>Document</title><style>' + CSS_PAGE + (css || '') + (extra || '') + '</style></head><body><div class="pg ' + font + '"><div class="fitw">' + body + '</div></div></body></html>'; }
  function pages(font, list, css) { return '<!doctype html><html><head><meta charset="utf-8"><title>Document</title><style>' + CSS_PAGE + (css || '') + '</style></head><body>' + list.map(function (b) { return '<div class="pg ' + font + '"><div class="fitw">' + b + '</div></div>'; }).join('') + '</body></html>'; }

  /* ==================================================================== LEASE */
  var LEASE_STYLES = [['standard', 'Lease agreement - six sections (I-VI)'], ['detailed', 'Residential lease - detailed clauses'], ['monthly', 'Month-to-month rental agreement'], ['unit', 'Accessory unit / room rental agreement']];
  function box(on) { return on ? '&#9746;' : '&#9744;'; }
  B.lease = {
    label: 'Lease agreement', sub: 'Four styles, up to 4 tenants',
    init: function () {
      var f = file();
      return {style: 'standard', date: iso(), landlords: [{name: '', mail: ''}], tenants: [{name: '', mail: ''}], address: f.address, city: f.city, state: stateName(f.state), zip: f.zip, county: f.county, unit: '',
        residence: 'House', residenceOther: '', beds: '', baths: '', leaseType: 'fixed', start: iso(), end: addDays(iso(), 364), noticeDays: '30',
        rent: '', dueDay: '1st', depOn: true, deposit: '', lastOn: false, last: '', otherOn: false, other: '', utilities: '', additional: '',
        lateFee: '50', graceDays: '5', pets: 'No pets without the Landlord\'s written consent.', occupants: '', parking: '', shared: 'Kitchen, laundry and yard are shared with the occupants of the main dwelling.'};
    },
    form: function () {
      var b = 'lease', s = drafts[b];
      return dropZone('leasefile', 'Drop an existing lease', 'Reads the landlord, tenants, address, term dates, rent and deposit.') +
        '<fieldset><legend>Document</legend><div class="g">' + field(b, 'style', 'Style', {type: 'select', options: LEASE_STYLES, wide: 1}) + field(b, 'date', 'Agreement date', {type: 'date'}) + '</div></fieldset>' +
        people(b, 'landlords', 'Landlords', 2, {extra: ['mail', 'Mailing address', 'Street, city, state ZIP']}) + people(b, 'tenants', 'Tenants', 4, {extra: ['mail', 'Mailing address', 'Street, city, state ZIP']}) + propertyBlock(b) +
        '<fieldset><legend>Premises</legend><div class="g">' + field(b, 'unit', 'Unit / apartment') + field(b, 'residence', 'Residence type', {list: ['Apartment', 'House', 'Condo', 'Two-family house', 'Townhouse', 'Basement apartment', 'Room']}) +
        (s.residence === 'Other' ? field(b, 'residenceOther', 'Describe') : '') + field(b, 'beds', 'Bedrooms') + field(b, 'baths', 'Bathrooms') + '</div></fieldset>' +
        '<fieldset><legend>Term</legend><div class="g">' + field(b, 'leaseType', 'Lease type', {type: 'select', options: [['fixed', 'Fixed term'], ['monthly', 'Month-to-month']]}) +
        field(b, 'start', 'Starts', {type: 'date'}) + (s.leaseType === 'fixed' ? field(b, 'end', 'Ends', {type: 'date'}) : field(b, 'noticeDays', 'Notice to end (days)')) + '</div></fieldset>' +
        '<fieldset><legend>Payment</legend><div class="g">' + field(b, 'rent', 'Monthly rent', {type: 'money'}) + field(b, 'dueDay', 'Due on the', {list: ['1st', '5th', '10th', '15th', 'last']}) + field(b, 'depOn', 'Security deposit', {type: 'check'}) + field(b, 'deposit', 'Deposit amount', {type: 'money'}) +
        field(b, 'lastOn', 'Last month\'s rent at signing', {type: 'check'}) + field(b, 'last', 'Last month amount', {type: 'money'}) + field(b, 'otherOn', 'Other charge', {type: 'check'}) + field(b, 'other', 'Describe') + '</div></fieldset>' +
        '<fieldset><legend>Utilities and terms</legend><div class="g">' + field(b, 'utilities', 'Tenant pays all utilities except', {wide: 1, ph: 'Gas, electric', list: ['None', 'Water and sewer', 'Gas and electric', 'Heat and hot water', 'Water, sewer and trash']}) + field(b, 'additional', 'Additional terms', {type: 'textarea', wide: 1, rows: 2}) +
        (s.style === 'detailed' || s.style === 'unit' ? field(b, 'lateFee', 'Late fee ($)', {type: 'money'}) + field(b, 'graceDays', 'Grace period (days)') + field(b, 'occupants', 'Maximum occupants') + field(b, 'parking', 'Parking') + field(b, 'pets', 'Pets', {wide: 1}) : '') +
        (s.style === 'unit' ? field(b, 'shared', 'Shared areas', {type: 'textarea', wide: 1, rows: 2}) : '') + '</div></fieldset>' +
        '<div class="row"><button type="button" class="btn" data-a="leaseRent">Send the rent to the Loan Suite rental</button></div>';
    },
    doc: function (s) {
      var ll = (s.landlords || []).filter(function (p) { return p.name; }), tt = (s.tenants || []).filter(function (p) { return p.name; }), addr = addrOf(s) + (s.unit ? ', ' + s.unit : '');
      var monthly = s.style === 'monthly' || s.leaseType === 'monthly', title = s.style === 'monthly' ? 'MONTH-TO-MONTH RENTAL AGREEMENT' : s.style === 'unit' ? 'ACCESSORY UNIT RENTAL AGREEMENT' : s.style === 'detailed' ? 'RESIDENTIAL LEASE AGREEMENT' : 'LEASE AGREEMENT';
      var u = function (v, w) { return '<span class="fl" style="min-width:' + (w || 1.4) + 'in">' + esc(v || '') + '</span>'; };
      var party = function (role, list, tag) { return (list.length ? list : [{}]).map(function (p) { return '<p class="ind2"><u>' + role + '</u>: ' + u(p.name, 1.8) + ' with a mailing address of ' + u(p.mail, 3.2) + ' (' + tag + ')' + '</p>'; }).join(''); };
      var sec = [], n = 0, R = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];
      var S = function (h, body) { sec.push('<p class="sh"><b>' + R[n++] + '. ' + h + '.</b> ' + body + '</p>'); };
      S('THE PARTIES', 'This ' + (s.style === 'monthly' ? 'Rental' : 'Lease') + ' Agreement ("Agreement") is made on ' + u(longDate(s.date), 1.8) + ' between:');
      sec.push(party('Landlord', ll, '"Landlord"') + '<p class="ind2">and</p>' + party('Tenant(s)', tt, '"Tenant"'));
      S('PREMISES', 'The Landlord rents to the Tenant, in exchange for the payments in Section IV, the following property:');
      sec.push('<p class="ind">a.) <u>Property Address</u>: ' + u(addr, 4) + '.</p><p class="ind">b.) <u>Residence Type</u>: ' + ['Apartment', 'House', 'Condo'].map(function (t) { return box(s.residence === t) + ' ' + t; }).join(' &nbsp;') + ' &nbsp;' + box(!!s.residence && ['Apartment', 'House', 'Condo'].indexOf(s.residence) < 0) + ' Other: ' + u(s.residence === 'Other' ? s.residenceOther : ['Apartment', 'House', 'Condo'].indexOf(s.residence) < 0 ? s.residence : '', 1.3) + '</p>' +
        '<p class="ind">c.) <u>Bedroom(s)</u>: ' + u(s.beds, .5) + ' &nbsp;<u>Bathroom(s)</u>: ' + u(s.baths, .5) + '</p>');
      S('LEASE TYPE', 'This Agreement is a: (check one)');
      sec.push('<p class="ind2">' + box(!monthly) + ' - <u>Fixed Lease</u>. The Tenant may occupy the Premises from ' + u(!monthly ? longDate(s.start) : '', 1.6) + ' through ' + u(!monthly ? longDate(s.end) : '', 1.6) + ' (the "Lease Term"). Before the Lease Term ends the Landlord and Tenant will discuss renewal; if no renewal is agreed, the Tenant must vacate the Premises at the end of the Lease Term.</p>' +
        '<p class="ind2">' + box(monthly) + ' - <u>Month-to-Month Lease</u>. The Tenant may occupy the Premises on a month-to-month basis starting ' + u(monthly ? longDate(s.start) : '', 1.6) + ', ending when either party gives ' + u(monthly ? s.noticeDays : '', .5) + ' days\' written notice (the "Lease Term").</p>');
      S('PAYMENT TERMS', 'During the Lease Term the Tenant agrees to pay: (check all that apply)');
      sec.push('<p class="ind2">' + box(!!N(s.rent)) + ' - <u>Monthly Rent</u>. ' + u(N(s.rent) ? usd(s.rent) : '', 1.4) + ' due on the ' + u(s.dueDay, .5) + ' day of each month.</p>' +
        '<p class="ind2">' + box(s.depOn) + ' - <u>Security Deposit</u>. ' + u(s.depOn && N(s.deposit) ? usd(s.deposit) : '', 1.4) + ' due when this Agreement is signed.</p>' +
        '<p class="ind2">' + box(s.lastOn) + ' - <u>Last Month\'s Rent</u>. ' + u(s.lastOn && N(s.last) ? usd(s.last) : '', 1.4) + ' due when this Agreement is signed.</p>' +
        '<p class="ind2">' + box(s.otherOn) + ' - <u>Other</u>. ' + u(s.otherOn ? s.other : '', 3) + '.</p>');
      S('UTILITIES', 'The Tenant is responsible for all utilities and services to the Premises except: ' + u(s.utilities || 'None', 3.5) + '.');
      if (s.style === 'detailed' || s.style === 'unit') {
        S('LATE CHARGES', 'Rent not received within ' + esc(s.graceDays || '5') + ' days of its due date carries a late charge of ' + esc(N(s.lateFee) ? usd(s.lateFee) : '$0.00') + ', where permitted by law.');
        S('USE AND OCCUPANCY', 'The Premises are to be used only as a private residence' + (s.occupants ? ' by no more than ' + esc(s.occupants) + ' occupants' : '') + '. The Tenant will not sublet or assign this Agreement without the Landlord\'s written consent.' + (s.parking ? ' Parking: ' + esc(s.parking) + '.' : ''));
        S('PETS', esc(s.pets || 'No pets without the Landlord\'s written consent.'));
        if (s.style === 'unit') S('SHARED AREAS', esc(s.shared || ''));
        S('MAINTENANCE AND REPAIRS', 'The Tenant will keep the Premises clean and in good condition and will promptly report needed repairs. The Landlord will make repairs needed to keep the Premises safe and habitable, except damage caused by the Tenant or the Tenant\'s guests.');
        S('ENTRY', 'The Landlord may enter the Premises at reasonable times, with reasonable notice as required by law, to inspect, repair or show the Premises, and at any time in an emergency.');
        S('SECURITY DEPOSIT RETURN', 'The security deposit, less any lawful deductions for unpaid rent or damage beyond normal wear and tear, will be returned within the time required by the law of the State of ' + esc(stateName(s.state) || '__________') + '.');
        S('GOVERNING LAW', 'This Agreement is governed by the laws of the State of ' + esc(stateName(s.state) || '__________') + '.');
      }
      S('ADDITIONAL TERMS', u(s.additional || (s.style === 'standard' ? '' : 'None'), 4) + '.');
      var rowsN = Math.max(ll.length, tt.length, 1), sig = '<table class="sg">';
      for (var i = 0; i < rowsN; i++) { var L = ll[i] || {}, T = tt[i] || {};
        sig += '<tr><td>' + (L.name || i === 0 ? 'Landlord\'s Signature: <span class="bl"></span><br>Print Name: ' + u(L.name, 1.6) : '') + '</td><td>' + (T.name || i === 0 ? 'Tenant\'s Signature: <span class="bl"></span><br>Print Name: ' + u(T.name, 1.6) : '') + '</td></tr>'; }
      sig += '</table>';
      return page('ari', '<h1>' + title + '</h1>' + sec.join('') + sig, CSS_LEASE);
    }
  };
  var CSS_LEASE = '.pg{padding:.75in .85in .7in}h1{text-align:center;font-size:17pt;margin:0 0 .2in}p{margin:0 0 .09in;line-height:1.32;font-size:11.5pt}p.sh{margin-top:.14in}p.ind{margin-left:.35in}p.ind2{margin-left:.55in}.fl{display:inline-block;border-bottom:1px solid #000;font-size:8.5pt;padding:0 3px;vertical-align:baseline;line-height:1.3}u{text-underline-offset:2px}table.sg{width:100%;margin-top:.2in;font-size:11.5pt;border-collapse:collapse}table.sg td{padding:6px 10px 14px 0;width:50%;line-height:1.7}.bl{display:inline-block;width:1.7in;border-bottom:2px solid #2f6fd6;vertical-align:baseline}';

  /* ======================================================= CONTRACTOR ESTIMATE */
  var TRADES = ['Kitchen', 'Bathroom', 'Roofing', 'Electrical', 'Plumbing', 'HVAC', 'Windows and doors', 'Flooring', 'Painting', 'Siding / exterior', 'Gutters and downspouts', 'Masonry', 'Foundation / structural', 'Drywall / plaster', 'Insulation', 'Trim and carpentry', 'Stairs and railings', 'Appliances', 'Decks / porches', 'Walks and driveways', 'Landscaping / site work', 'Demolition and debris', 'Lead paint / health and safety', 'Well / septic', 'Permits and plans', 'Other'];
  var EST_STYLES = [['classic', 'Classic proposal - labor and materials'], ['modern', 'Modern itemized - color header'], ['qty', 'Detailed bid - quantity, unit and unit price'], ['reno', 'Renovation loan bid - 203(k) / HomeStyle'], ['lump', 'Lump-sum bid - one page, scope and total'], ['letter', 'Proposal letter and contract - acceptance block']];
  var EST_PRESETS = {
    kitchen: ['Kitchen remodel', [['Demolition and debris', 'Remove existing cabinets, counters, flooring and fixtures; haul away debris'], ['Kitchen', 'Supply and install base and wall cabinets, hardware and countertops'], ['Plumbing', 'Sink, faucet, dishwasher and supply/drain connections'], ['Electrical', 'GFCI receptacles, under-cabinet and recessed lighting, appliance circuits'], ['Flooring', 'Install new kitchen flooring with underlayment'], ['Painting', 'Patch, prime and paint walls and ceiling'], ['Appliances', 'Range, refrigerator, dishwasher and range hood']]],
    bath: ['Bathroom remodel', [['Demolition and debris', 'Remove tub/shower, vanity, toilet, tile and flooring'], ['Plumbing', 'New valve, tub/shower, toilet, vanity sink and faucet'], ['Bathroom', 'Cement board, waterproofing, wall and floor tile'], ['Electrical', 'GFCI receptacle, vanity light and exhaust fan vented to exterior'], ['Painting', 'Prime and paint walls, ceiling and trim']]],
    roof: ['Roof replacement', [['Demolition and debris', 'Tear off existing roofing to the deck; dumpster and disposal'], ['Roofing', 'Replace damaged sheathing as needed; ice and water shield, underlayment, architectural shingles, ridge vent, flashing'], ['Gutters and downspouts', 'New seamless gutters and downspouts']]],
    cosmetic: ['Cosmetic refresh', [['Painting', 'Interior paint throughout - walls, ceilings and trim'], ['Flooring', 'Refinish hardwood; new LVP in kitchen and baths'], ['Electrical', 'Replace light fixtures, switches and receptacles; smoke and CO detectors'], ['Trim and carpentry', 'Replace interior doors and hardware; repair trim']]],
    exterior: ['Exterior, siding and windows', [['Siding / exterior', 'Remove and replace siding, house wrap, trim and soffit'], ['Windows and doors', 'Replace windows and exterior doors, capped and sealed'], ['Painting', 'Exterior paint and caulking'], ['Walks and driveways', 'Repair walks, steps and driveway']]],
    full: ['Full renovation (FHA 203(k) / HomeStyle)', [['Permits and plans', 'Building permits, plans and inspections'], ['Demolition and debris', 'Interior demolition and debris removal'], ['Roofing', 'Roof replacement'], ['Electrical', 'Upgrade service to 200 amp; rewire as needed to code'], ['Plumbing', 'Replace supply and drain lines; new water heater'], ['HVAC', 'New furnace / boiler and distribution'], ['Kitchen', 'New kitchen cabinets, counters and appliances'], ['Bathroom', 'Remodel bathroom(s)'], ['Flooring', 'New flooring throughout'], ['Drywall / plaster', 'Repair or replace drywall'], ['Painting', 'Interior and exterior paint'], ['Lead paint / health and safety', 'Lead-safe work practices; handrails, smoke and CO detectors']]]
  };
  B.estimate = {
    label: 'Contractor estimate', sub: 'Six layouts, line items, draws',
    init: function () { var f = file(); return {style: 'classic', title: '', company: '', license: '', phone: '', email: '', companyAddr: '', number: 'EST-' + iso().replace(/-/g, '').slice(2), date: dateFromPicker(iso()), validDays: '30', customer: f.borrowers.join(' & '), custPhone: '', custEmail: '',
      address: f.address, city: f.city, state: stateName(f.state), zip: f.zip, county: f.county, addrFree: '', lender: '', loanNo: '', consultant: '', program: f.renovation ? (/fha/i.test(f.program) ? 'FHA 203(k)' : 'Fannie Mae HomeStyle') : '',
      startDate: '', duration: '', items: [{trade: 'Kitchen', desc: '', qty: '', unit: '', labor: '', materials: ''}], permits: '', ohp: '10', contingency: '0', tax: '0', deposit: '10', draws: '4', warranty: '1 year on workmanship; manufacturer warranties on materials.',
      intro: 'We propose to furnish all labor and materials to complete the work described below, in accordance with the drawings, specifications and the lender\'s work write-up where applicable.',
      notes: 'Price includes labor, materials and cleanup. Work to be completed in a workmanlike manner and to code. Owner to choose finishes before ordering.', accept: 'The above prices, specifications and conditions are satisfactory and are hereby accepted. You are authorized to do the work as specified. Payment will be made as outlined above.', signer: ''}; },
    fix: function (s) { (s.items || []).forEach(function (i) { if (i.qty == null) { i.qty = ''; i.unit = ''; } }); if (s.tax == null) s.tax = '0'; },
    calc: function (s) { var lab = 0, mat = 0; (s.items || []).forEach(function (i) { lab += N(i.labor); mat += N(i.materials); }); var sub = lab + mat, ohp = sub * N(s.ohp) / 100, tax = mat * N(s.tax) / 100, cont = (sub + ohp) * N(s.contingency) / 100, total = sub + ohp + tax + cont + N(s.permits);
      return {labor: lab, materials: mat, sub: sub, ohp: ohp, tax: tax, cont: cont, permits: N(s.permits), total: total, deposit: total * N(s.deposit) / 100}; },
    form: function () {
      var b = 'estimate', s = drafts[b], q = s.style === 'qty';
      return dropZone('estfile', 'Drop a contractor\'s bid or estimate', 'Reads the company, phone, email, license, estimate number, date, customer and each priced line.') +
        '<fieldset><legend>Version</legend><div class="g">' + field(b, 'style', 'Estimate version', {type: 'select', options: EST_STYLES, wide: 1}) +
        '<label class="f w">Start from a sample scope<span class="row" style="flex-wrap:nowrap"><select id="mtBpreset" aria-label="Sample scope" style="flex:1"><option value="">Choose a scope…</option>' + Object.keys(EST_PRESETS).map(function (k) { return '<option value="' + k + '">' + EST_PRESETS[k][0] + '</option>'; }).join('') + '</select><button type="button" class="btn" data-a="estPreset">Replace lines</button><button type="button" class="btn" data-a="estPresetAdd">Add lines</button></span></label>' +
        field(b, 'title', 'Heading (blank = the version\'s heading)', {wide: 1, ph: s.style === 'reno' ? 'RENOVATION BID / WORK WRITE-UP' : s.style === 'letter' ? 'PROPOSAL AND CONTRACT' : 'ESTIMATE'}) + '</div></fieldset>' +
        '<fieldset><legend>Contractor</legend><div class="g">' + field(b, 'company', 'Company', {wide: 1}) + field(b, 'number', 'Estimate #') + field(b, 'license', 'License #') + field(b, 'phone', 'Phone') + field(b, 'email', 'Email') + field(b, 'companyAddr', 'Company address', {wide: 1, addrLine: 1}) + field(b, 'date', 'Date', {type: 'date'}) + field(b, 'validDays', 'Valid for (days)') + '</div></fieldset>' +
        '<fieldset><legend>Customer</legend><div class="g">' + field(b, 'customer', 'Customer / bill to', {wide: 1}) + field(b, 'custPhone', 'Customer phone') + field(b, 'custEmail', 'Customer email') +
        (s.style === 'reno' ? field(b, 'program', 'Renovation program', {list: ['FHA 203(k)', 'FHA Limited 203(k)', 'Fannie Mae HomeStyle', 'Freddie Mac CHOICERenovation', 'VA Renovation']}) + field(b, 'lender', 'Lender') + field(b, 'loanNo', 'Loan / FHA case #') + field(b, 'consultant', '203(k) consultant') : '') + '</div></fieldset>' + propertyBlock(b) +
        '<fieldset><legend>Schedule</legend><div class="g">' + field(b, 'startDate', 'Start', {type: 'date', ph: 'Within 10 days of closing'}) + field(b, 'duration', 'Time to complete', {list: ['30 days', '60 days', '90 days', '6 months'], ph: '90 days'}) + '</div></fieldset>' +
        '<fieldset><legend>Scope of work</legend><datalist id="mtBtrades">' + TRADES.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist><div class="list">' + (s.items || []).map(function (it, i) {
          var a = function (f) { return ' data-b="estimate" data-list="items" data-i="' + i + '" data-f="' + f + '"'; };
          return '<div class="it"><div class="hd"><input list="mtBtrades"' + a('trade') + ' value="' + esc(it.trade || '') + '" style="flex:1;font-weight:700" aria-label="Trade or category" placeholder="Trade - pick or type" autocomplete="off">' + (s.items.length > 1 ? '<button type="button" class="x" data-a="rm" data-b="estimate" data-list="items" data-i="' + i + '">Remove</button>' : '') + '</div>' +
            '<textarea' + a('desc') + ' rows="2" placeholder="Describe the work" style="margin-top:6px" aria-label="Description">' + esc(it.desc || '') + '</textarea><div class="g' + (q ? ' g3' : '') + '" style="margin-top:6px">' +
            (q ? '<label class="f">Quantity<input inputmode="decimal"' + a('qty') + ' value="' + esc(it.qty || '') + '"></label><label class="f">Unit<input list="mtBunits"' + a('unit') + ' value="' + esc(it.unit || '') + '" placeholder="sq ft" autocomplete="off"></label><span></span>' : '') +
            '<label class="f">Labor<input inputmode="decimal"' + a('labor') + ' value="' + esc(it.labor || '') + '"></label><label class="f">Materials<input inputmode="decimal"' + a('materials') + ' value="' + esc(it.materials || '') + '"></label></div></div>'; }).join('') +
        '</div><datalist id="mtBunits"><option value="sq ft"><option value="lin ft"><option value="each"><option value="lot"><option value="hours"><option value="squares"><option value="sq yd"></datalist><button type="button" class="btn" data-a="add" data-b="estimate" data-list="items">+ Add a line</button></fieldset>' +
        '<fieldset><legend>Totals and payment</legend><div class="g">' + field(b, 'permits', 'Permits and fees ($)', {type: 'money'}) + field(b, 'ohp', 'Overhead & profit (%)', {type: 'pct'}) + field(b, 'tax', 'Sales tax on materials (%)', {type: 'pct'}) + field(b, 'contingency', 'Contingency (%)', {type: 'pct'}) + field(b, 'deposit', 'Deposit at signing (%)', {type: 'pct'}) + field(b, 'draws', 'Number of draws') + field(b, 'signer', 'Signed by (contractor)') + '</div><div id="mtBest"></div>' +
        '<div class="row" style="margin-top:8px"><button type="button" class="btn" data-a="estUse">Use total as the renovation cost</button></div></fieldset>' +
        '<fieldset><legend>Wording</legend><div class="g">' + (s.style === 'letter' || s.style === 'reno' ? field(b, 'intro', 'Opening paragraph', {type: 'textarea', wide: 1, rows: 3}) : '') + field(b, 'notes', 'Terms and notes', {type: 'textarea', wide: 1, rows: 3}) + field(b, 'warranty', 'Warranty', {type: 'textarea', wide: 1, rows: 2}) +
        (s.style === 'letter' || s.style === 'lump' || s.style === 'reno' ? field(b, 'accept', 'Acceptance wording', {type: 'textarea', wide: 1, rows: 3}) : '') + '</div></fieldset>';
    },
    preset: function (k, add) { var p = EST_PRESETS[k], s = drafts.estimate; if (!p) return; var rows = p[1].map(function (r) { return {trade: r[0], desc: r[1], qty: '', unit: '', labor: '', materials: ''}; });
      var keep = (s.items || []).filter(function (i) { return i.desc || N(i.labor) || N(i.materials); }); s.items = add ? keep.concat(rows) : rows; if (k === 'full' && !add) s.style = 'reno'; persist(); renderForm(); refresh(); say(p[0] + ': ' + rows.length + ' lines ' + (add ? 'added' : 'in place') + ' - enter the labor and materials for each.'); },
    side: function () { var c = B.estimate.calc(drafts.estimate), el = $('mtBest'); if (el) el.innerHTML = '<div class="kv"><span>Labor</span><b>' + usd(c.labor) + '</b><span>Materials</span><b>' + usd(c.materials) + '</b><span>Overhead & profit</span><b>' + usd(c.ohp) + '</b>' + (c.tax ? '<span>Sales tax</span><b>' + usd(c.tax) + '</b>' : '') + '<span>Contingency</span><b>' + usd(c.cont) + '</b><span>Permits</span><b>' + usd(c.permits) + '</b><span>Total</span><b>' + usd(c.total) + '</b><span>Deposit / each draw</span><b>' + usd(c.deposit) + ' / ' + usd((c.total - c.deposit) / Math.min(50, Math.max(1, Math.round(N(drafts.estimate.draws) || 1)))) + '</b></div>'; },
    doc: function (s) {
      var c = B.estimate.calc(s), addr = addrOf(s), draws = Math.min(50, Math.max(1, Math.round(N(s.draws) || 1))), st = s.style || 'classic', lines = (s.items || []).filter(function (i) { return i.trade || i.desc || N(i.labor) || N(i.materials); });
      var title = s.title || (st === 'reno' ? 'RENOVATION BID' : st === 'letter' ? 'PROPOSAL AND CONTRACT' : st === 'lump' ? 'BID PROPOSAL' : 'ESTIMATE');
      var info = [s.companyAddr, s.phone, s.email, s.license ? 'License # ' + s.license : ''].filter(Boolean).map(esc).join(' &middot; '), amt = function (i) { return N(i.labor) + N(i.materials); };
      var after = c.total - c.deposit, sched = ''; for (var d = 1; d <= draws; d++) sched += '<tr><td>Draw ' + d + (d === draws ? ' (final, on completion and inspection)' : '') + '</td><td class="n">' + usd(after / draws) + '</td></tr>';
      var payTbl = '<h3>Payment schedule</h3><table class="ps"><tr><td>Deposit at signing (' + esc(s.deposit || 0) + '%)</td><td class="n">' + usd(c.deposit) + '</td></tr>' + sched + '</table>';
      var totTbl = '<table class="tot"><tr><td>Labor</td><td class="n">' + usd(c.labor) + '</td></tr><tr><td>Materials</td><td class="n">' + usd(c.materials) + '</td></tr><tr><td>Subtotal</td><td class="n">' + usd(c.sub) + '</td></tr>' + (c.ohp ? '<tr><td>Overhead & profit (' + esc(s.ohp) + '%)</td><td class="n">' + usd(c.ohp) + '</td></tr>' : '') + (c.tax ? '<tr><td>Sales tax on materials (' + esc(s.tax) + '%)</td><td class="n">' + usd(c.tax) + '</td></tr>' : '') + (c.cont ? '<tr><td>Contingency (' + esc(s.contingency) + '%)</td><td class="n">' + usd(c.cont) + '</td></tr>' : '') + (c.permits ? '<tr><td>Permits and fees</td><td class="n">' + usd(c.permits) + '</td></tr>' : '') + '<tr class="g"><td>TOTAL</td><td class="n">' + usd(c.total) + '</td></tr></table>';
      var sched2 = (s.startDate || s.duration ? '<p class="terms"><b>Schedule:</b> ' + (s.startDate ? 'Work to start ' + esc(isPhrase(s.startDate) ? s.startDate : 'on or about ' + longDate(s.startDate)) + '. ' : '') + (s.duration ? 'Estimated time to complete: ' + esc(s.duration) + '.' : '') + '</p>' : '');
      var terms = '<h3>Terms</h3><p class="terms">' + esc(s.notes || '').replace(/\n/g, '<br>') + '</p>' + (s.warranty ? '<p class="terms"><b>Warranty:</b> ' + esc(s.warranty) + '</p>' : '') + sched2;
      var sigs = '<div class="sigs"><div><div class="sl"></div>Contractor' + (s.signer ? ' - ' + esc(s.signer) : '') + ' &nbsp; Date</div><div><div class="sl"></div>Customer acceptance &nbsp; Date</div></div>';
      var meta = '<table class="meta"><tr><td><b>Customer</b><br>' + esc(s.customer || '') + (s.custPhone ? '<br>' + esc(s.custPhone) : '') + (s.custEmail ? '<br>' + esc(s.custEmail) : '') + '</td><td><b>Job site</b><br>' + esc(addr) + '</td><td><b>Date</b><br>' + esc(when(s.date)) + '<br><b>Valid</b> ' + esc(s.validDays || '30') + ' days</td></tr></table>';
      var head = function (cls) { return '<div class="hd ' + (cls || '') + '"><div><div class="co">' + esc(s.company || 'Contractor name') + '</div><div class="ci">' + info + '</div></div><div class="tt">' + esc(title) + '<br><span>' + esc(s.number) + '</span></div></div>'; };
      if (st === 'lump') {
        return page('cal', head() + meta + '<h3>Scope of work</h3><ul class="sc">' + (lines.map(function (i) { return '<li><b>' + esc(i.trade) + '</b>' + (i.desc ? ' - ' + esc(i.desc).replace(/\n/g, '<br>') : '') + '</li>'; }).join('') || '<li>Add scope lines</li>') + '</ul>' +
          '<div class="lump"><span>Total price for the work above</span><b>' + usd(c.total) + '</b></div>' + payTbl + terms + (s.accept ? '<p class="terms">' + esc(s.accept) + '</p>' : '') + sigs, CSS_EST);
      }
      if (st === 'letter') {
        return page('geo', '<div class="lh"><div class="co">' + esc(s.company || 'Contractor name') + '</div><div class="ci">' + info + '</div></div><p>' + esc(when(s.date)) + '</p><p>' + esc(s.customer || '') + '<br>' + esc(addr) + '</p><h1 class="lt">' + esc(title) + (s.number ? ' <span>No. ' + esc(s.number) + '</span>' : '') + '</h1>' +
          '<p>' + esc(s.intro || '') + '</p><ol class="lt">' + lines.map(function (i) { return '<li><b>' + esc(i.trade) + '.</b> ' + esc(i.desc || '').replace(/\n/g, '<br>') + (amt(i) ? ' <span class="amt">' + usd(amt(i)) + '</span>' : '') + '</li>'; }).join('') + '</ol>' +
          '<p>We propose to do the work above for the sum of <b>' + usd(c.total) + '</b>' + (c.ohp || c.cont || c.permits || c.tax ? ' (including ' + [c.ohp ? 'overhead and profit' : '', c.tax ? 'sales tax' : '', c.cont ? 'a ' + esc(s.contingency) + '% contingency' : '', c.permits ? 'permits and fees' : ''].filter(Boolean).join(', ') + ')' : '') + ', payable ' + esc(s.deposit || 0) + '% (' + usd(c.deposit) + ') at signing and the balance in ' + draws + ' draw' + (draws > 1 ? 's' : '') + ' of ' + usd(after / draws) + ' as the work is completed.</p>' +
          terms + '<p>This proposal may be withdrawn if not accepted within ' + esc(s.validDays || '30') + ' days.</p><div class="sigs"><div><div class="sl"></div>' + esc(s.signer || 'Authorized signature') + ', ' + esc(s.company || '') + '</div><div></div></div><h3>Acceptance of proposal</h3><p class="terms">' + esc(s.accept || '') + '</p>' + '<div class="sigs"><div><div class="sl"></div>Customer &nbsp; Date</div><div><div class="sl"></div>Customer &nbsp; Date</div></div>', CSS_EST);
      }
      var cols = st === 'qty' ? '<th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Labor</th><th>Materials</th><th>Amount</th>' : st === 'reno' ? '<th>#</th><th>Category / work item</th><th>Labor</th><th>Materials</th><th>Total</th>' : '<th>#</th><th>Scope of work</th><th>Labor</th><th>Materials</th><th>Amount</th>';
      var rows = lines.map(function (i, k) { var a = amt(i), q = N(i.qty); return '<tr><td class="c">' + (k + 1) + '</td><td><b>' + esc(i.trade) + '</b>' + (i.desc ? '<br>' + esc(i.desc).replace(/\n/g, '<br>') : '') + '</td>' +
        (st === 'qty' ? '<td class="n">' + (i.qty ? esc(i.qty) : '') + '</td><td>' + esc(i.unit || '') + '</td><td class="n">' + (q ? usd(a / q) : '') + '</td>' : '') + '<td class="n">' + usd(i.labor) + '</td><td class="n">' + usd(i.materials) + '</td><td class="n">' + usd(a) + '</td></tr>'; }).join('');
      var n = st === 'qty' ? 8 : 5;
      if (st === 'reno') {
        return page('cal', head('r') + '<table class="meta"><tr><td><b>Borrower / owner</b><br>' + esc(s.customer || '') + '</td><td><b>Property</b><br>' + esc(addr) + '</td><td><b>Date</b><br>' + esc(when(s.date)) + '</td></tr><tr><td><b>Program</b><br>' + esc(s.program || '') + '</td><td><b>Lender / loan #</b><br>' + esc([s.lender, s.loanNo].filter(Boolean).join(' / ')) + '</td><td><b>Consultant</b><br>' + esc(s.consultant || '') + '</td></tr></table>' +
          (s.intro ? '<p class="terms">' + esc(s.intro) + '</p>' : '') + '<table class="it"><thead><tr>' + cols + '</tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="c">Add work items</td></tr>') + '</tbody></table>' + totTbl +
          '<h3>Draw schedule</h3><table class="ps"><tr><td>Deposit / materials draw (' + esc(s.deposit || 0) + '%)</td><td class="n">' + usd(c.deposit) + '</td></tr>' + sched + '</table><p class="terms">Draws are released by the lender after each inspection. A holdback may be retained until the final inspection and lien waivers are received.' + (c.cont ? ' The contingency reserve is released only for documented additional work approved by the lender.' : '') + '</p>' + terms +
          '<h3>Contractor certification</h3><p class="terms">I certify that this bid covers all work in the work write-up, that the work will be completed in compliance with local codes and the lender\'s requirements, and that I hold the licenses and insurance required for this work.</p>' + (s.accept ? '<p class="terms">' + esc(s.accept) + '</p>' : '') + sigs.replace('Customer acceptance', 'Borrower'), CSS_EST);
      }
      return page('cal', head(st === 'modern' ? 'm' : '') + meta + '<table class="it' + (st === 'qty' ? ' q' : '') + '"><thead><tr>' + cols + '</tr></thead><tbody>' + (rows || '<tr><td colspan="' + n + '" class="c">Add scope lines</td></tr>') + '</tbody></table>' + totTbl + payTbl + terms + sigs, CSS_EST);
    }
  };
  var CSS_EST = '.pg{padding:.6in .7in}.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1f3a5f;padding-bottom:10px;margin-bottom:14px}.hd.m{border:0;background:#1f3a5f;color:#fff;margin:-.6in -.7in 14px;padding:.4in .7in .25in}.hd.r{border-bottom:3px double #2d5a27}.hd.r .tt,.hd.r .co{color:#2d5a27}.co{font-size:19pt;font-weight:700}.ci{font-size:9pt;color:#555;margin-top:3px}.hd.m .ci{color:#d6e2f2}.tt{text-align:right;font-size:18pt;font-weight:700;color:#1f3a5f;letter-spacing:.08em}.hd.m .tt{color:#fff}.tt span{font-size:10pt;letter-spacing:0;color:#666}.hd.m .tt span{color:#d6e2f2}' +
    'table{width:100%;border-collapse:collapse;font-size:10pt}table.meta td{vertical-align:top;padding:4px 8px 10px 0;width:33%}table.it th{background:#1f3a5f;color:#fff;padding:5px 6px;text-align:left}table.it td{border-bottom:1px solid #ccd5e0;padding:6px;vertical-align:top}table.it.q{font-size:9pt}.n{text-align:right;white-space:nowrap}.c{text-align:center}table.tot{width:3.4in;margin:10px 0 0 auto}table.tot td{padding:3px 6px}table.tot tr.g td{border-top:2px solid #1f3a5f;font-weight:700;font-size:11.5pt}' +
    'h3{font-size:11pt;color:#1f3a5f;margin:16px 0 6px}table.ps{width:4.2in}table.ps td{padding:3px 6px;border-bottom:1px solid #e3e8ef}.terms{font-size:9.5pt;line-height:1.4;margin:0 0 6px}.sigs{display:grid;grid-template-columns:1fr 1fr;gap:.5in;margin-top:.45in;font-size:9.5pt}.sigs .sl{border-bottom:1px solid #000;height:28px;margin-bottom:3px}' +
    'ul.sc{margin:4px 0 10px;padding-left:.25in;font-size:10.5pt;line-height:1.45}.lump{display:flex;justify-content:space-between;align-items:center;border:2px solid #1f3a5f;border-radius:6px;padding:10px 14px;margin:12px 0;font-size:12pt}.lump b{font-size:16pt;color:#1f3a5f}' +
    '.lh{border-bottom:2px solid #1f3a5f;padding-bottom:8px;margin-bottom:18px}.geo p{line-height:1.45;margin:0 0 10px}h1.lt{font-size:14pt;letter-spacing:.06em;color:#1f3a5f;margin:14px 0 10px}h1.lt span{font-size:10pt;color:#666;letter-spacing:0}ol.lt li{margin:0 0 6px;line-height:1.4}ol.lt .amt{float:right;font-weight:700;padding-left:12px}';
  /* ==================================================================== P & L */
  var PL_EXP = ['Advertising', 'Car and truck', 'Contract labor', 'Insurance', 'Interest', 'Legal and professional', 'Office expense', 'Rent or lease', 'Repairs and maintenance', 'Supplies', 'Taxes and licenses', 'Travel', 'Meals', 'Utilities', 'Wages', 'Other'];
  B.pl = {
    label: 'Profit and loss', sub: 'Year-to-date or annual P&L',
    init: function () { var f = file(), y = new Date().getFullYear(); return {style: 'summary', business: '', owner: f.borrowers.join(' & '), bizAddr: '', from: y + '-01-01', to: iso(), own: '100', preparer: '', prepTitle: 'Owner', prepDate: iso(), basis: 'Cash',
      income: [{label: 'Gross receipts / sales', amt: ''}], cogs: [{label: 'Cost of goods sold', amt: ''}], expenses: PL_EXP.slice(0, 6).map(function (l) { return {label: l, amt: ''}; })}; },
    calc: function (s) { var sum = function (a) { return (a || []).reduce(function (t, r) { return t + N(r.amt); }, 0); }; var inc = sum(s.income), cogs = sum(s.cogs), exp = sum(s.expenses), gp = inc - cogs, net = gp - exp, from = parseDate(s.from), to = parseDate(s.to);
      var months = from && to ? Math.max(1, Math.round(((to - from) / 86400000 + 1) / 30.4375)) : 12; return {inc: inc, cogs: cogs, gp: gp, exp: exp, net: net, months: months, monthly: net / months * N(s.own) / 100}; },
    form: function () {
      var b = 'pl', s = drafts[b], list = function (k, title, addLabel) { return '<fieldset><legend>' + title + '</legend><div class="list">' + (s[k] || []).map(function (r, i) { return '<div class="g" style="grid-template-columns:1fr 130px auto;margin-bottom:5px"><input data-b="pl" data-list="' + k + '" data-i="' + i + '" data-f="label" value="' + esc(r.label) + '" aria-label="Line"><input inputmode="decimal" data-b="pl" data-list="' + k + '" data-i="' + i + '" data-f="amt" value="' + esc(r.amt) + '" placeholder="0.00" aria-label="Amount"><button type="button" class="x" data-a="rm" data-b="pl" data-list="' + k + '" data-i="' + i + '" aria-label="Remove">×</button></div>'; }).join('') + '</div><button type="button" class="btn" data-a="add" data-b="pl" data-list="' + k + '">' + addLabel + '</button></fieldset>'; };
      return dropZone('plfile', 'Drop a profit and loss statement', 'Reads the business name, period and each income, cost and expense line with its amount.') +
        '<fieldset><legend>Business</legend><div class="g">' + field(b, 'style', 'Layout', {type: 'select', options: [['summary', 'Accountant summary'], ['detailed', 'Detailed statement (% of income)'], ['condensed', 'Condensed one-page']], wide: 1}) +
        field(b, 'business', 'Business name', {wide: 1}) + field(b, 'owner', 'Owner(s)') + field(b, 'own', 'Ownership (%)', {type: 'pct'}) + field(b, 'bizAddr', 'Business address', {wide: 1, addrLine: 1}) + field(b, 'from', 'Period from', {type: 'date'}) + field(b, 'to', 'Period to', {type: 'date'}) +
        field(b, 'basis', 'Accounting basis', {list: ['Cash', 'Accrual', 'Modified cash']}) + field(b, 'preparer', 'Prepared by') + field(b, 'prepTitle', 'Title', {list: ['Owner', 'Member', 'President', 'CPA', 'Bookkeeper', 'Tax preparer']}) + field(b, 'prepDate', 'Date prepared', {type: 'date'}) + '</div></fieldset>' +
        list('income', 'Income', '+ Add income line') + list('cogs', 'Cost of goods sold', '+ Add cost line') + list('expenses', 'Operating expenses', '+ Add expense') + '<div id="mtBpl"></div>' +
        '<div class="row" style="margin-top:8px"><button type="button" class="btn" data-a="plUse">Send to Non-QM profit and loss income</button></div>';
    },
    side: function () { var c = B.pl.calc(drafts.pl), el = $('mtBpl'); if (el) el.innerHTML = '<div class="kv"><span>Total income</span><b>' + usd(c.inc) + '</b><span>Gross profit</span><b>' + usd(c.gp) + '</b><span>Total expenses</span><b>' + usd(c.exp) + '</b><span>Net profit (' + c.months + ' months)</span><b class="' + (c.net < 0 ? 'bad' : '') + '">' + usd(c.net) + '</b><span>Monthly x ownership</span><b>' + usd(c.monthly) + '</b></div>'; },
    doc: function (s) {
      var c = B.pl.calc(s), det = s.style === 'detailed', rows = function (a) { return (a || []).filter(function (r) { return r.label || N(r.amt); }).map(function (r) { return '<tr><td class="i">' + esc(r.label) + '</td><td class="n">' + usd(r.amt) + '</td>' + (det ? '<td class="n p">' + (c.inc ? pct(N(r.amt) / c.inc, 1) : '') + '</td>' : '') + '</tr>'; }).join(''); };
      var tot = function (l, v, cls) { return '<tr class="' + (cls || 't') + '"><td>' + l + '</td><td class="n">' + usd(v) + '</td>' + (det ? '<td class="n p">' + (c.inc ? pct(v / c.inc, 1) : '') + '</td>' : '') + '</tr>'; };
      var head = '<div class="h"><div class="b">' + esc(s.business || 'Business name') + '</div>' + (s.bizAddr ? '<div class="a">' + esc(s.bizAddr) + '</div>' : '') + '<div class="t">Profit and Loss Statement</div><div class="a">' + esc(longDate(s.from)) + ' through ' + esc(longDate(s.to)) + ' &middot; ' + esc(s.basis) + ' basis</div></div>';
      var body = s.style === 'condensed' ? '<table><tr><td>Total income</td><td class="n">' + usd(c.inc) + '</td></tr><tr><td>Less: cost of goods sold</td><td class="n">' + usd(c.cogs) + '</td></tr>' + tot('Gross profit', c.gp) + '<tr><td>Less: operating expenses</td><td class="n">' + usd(c.exp) + '</td></tr>' + tot('Net profit', c.net, 'g') + '</table>' :
        '<table>' + (det ? '<tr class="hh"><td></td><td class="n">Amount</td><td class="n">% of income</td></tr>' : '') + '<tr class="s"><td colspan="3">INCOME</td></tr>' + rows(s.income) + tot('Total income', c.inc) +
        (c.cogs ? '<tr class="s"><td colspan="3">COST OF GOODS SOLD</td></tr>' + rows(s.cogs) + tot('Total cost of goods sold', c.cogs) : '') + tot('Gross profit', c.gp) +
        '<tr class="s"><td colspan="3">OPERATING EXPENSES</td></tr>' + rows(s.expenses) + tot('Total operating expenses', c.exp) + tot('NET PROFIT', c.net, 'g') + '</table>';
      return page('cal', head + body + '<p class="cert">I certify that this profit and loss statement for ' + esc(s.business || 'the business') + ' is true and complete to the best of my knowledge and was prepared from the business\'s records.</p>' +
        '<div class="sg"><div><div class="sl"></div>' + esc(s.preparer || s.owner || '') + (s.prepTitle ? ', ' + esc(s.prepTitle) : '') + '</div><div><div class="sl"></div>Date ' + esc(slashDate(s.prepDate)) + '</div></div>' +
        (s.owner && s.owner !== s.preparer ? '<div class="sg"><div><div class="sl"></div>' + esc(s.owner) + ', Owner (' + esc(s.own || 100) + '%)</div><div><div class="sl"></div>Date</div></div>' : ''), CSS_PL);
    }
  };
  var CSS_PL = '.h{text-align:center;margin-bottom:.25in}.h .b{font-size:17pt;font-weight:700}.h .t{font-size:13pt;font-weight:700;margin-top:8px;letter-spacing:.04em}.h .a{font-size:9.5pt;color:#555}table{width:100%;border-collapse:collapse;font-size:10.5pt}td{padding:3px 6px}td.i{padding-left:22px}.n{text-align:right;white-space:nowrap}.p{color:#666;font-size:9pt}tr.s td{font-weight:700;padding-top:12px;border-bottom:1px solid #999}tr.t td{font-weight:700;border-top:1px solid #000}tr.g td{font-weight:700;font-size:12pt;border-top:2px solid #000;border-bottom:3px double #000}tr.hh td{font-size:9pt;color:#666}.cert{margin-top:.35in;font-size:9.5pt;line-height:1.4}.sg{display:grid;grid-template-columns:2fr 1fr;gap:.4in;margin-top:.3in;font-size:9.5pt}.sg .sl{border-bottom:1px solid #000;height:26px;margin-bottom:3px}';

  /* ========================================================= COMMITMENT LETTER */
  var COND_LIB = [
    ['prior', 'Property', 'Home Owner\'s Insurance (HOI) - Provide the declarations page for homeowners insurance showing coverage equal to replacement cost value, with a replacement cost estimator or other proof of replacement cost, and 12 months paid. Must list {mortgagee} as loss payee.'],
    ['prior', 'Property', 'Appraisal - Satisfactory full appraisal with value of no less than {value}. Subject to review, repairs and additional conditions, if applicable.'],
    ['prior', 'Property', 'AIR Disclosure/Proof of Delivery - Provide borrower signed acknowledgment of receipt of appraisal at least 3 days prior to closing.'],
    ['prior', 'Legal', 'Commitment Letter - Commitment letter to be signed by all borrowers.'],
    ['prior', 'Legal', 'Prelim Title Report - Provide preliminary title report with all schedules and tax search. Subject to review and approval by title and/or {short} legal department.'],
    ['prior', 'Credit', 'AUS - Subject to continual approval by the automated underwriting system.'],
    ['prior', 'Credit', 'Inquiry LOE - Provide written confirmation of whether new credit has been accepted or extended as a result of the inquiries listed on the credit report.'],
    ['prior', 'Assets', 'Bank Statements - Copy of all pages of the most recent 2 months statements for all accounts used to qualify. All large deposits must be documented from an acceptable source.'],
    ['prior', 'Assets', 'EMD - Provide the cancelled earnest money check with the statement showing the withdrawal, and two months statements before the check cleared to source the funds.'],
    ['prior', 'Assets', 'Gift Funds - Fully completed gift letter executed by an acceptable donor, with proof of donor ability and transfer to the borrower or closing agent.'],
    ['prior', 'Income', 'Transcripts - Provide IRS validation of W-2s and/or tax returns for the most recent 2 years or the number of years required by AUS.'],
    ['prior', 'Income', 'Paystubs - Most recent paystub(s) covering 30 days with year-to-date earnings.'],
    ['closing', 'Closing', 'Final 1003 - Signed final 1003 underwritten as {occupancy}.'],
    ['closing', 'Closing', 'Final VOE - Closer to confirm verbal verification of employment/self employment completed within 10 days prior to closing.'],
    ['closing', 'Closing', 'Max PITIA - Maximum payment of principal, interest, taxes and insurance (PITI) not to exceed {pitia}.'],
    ['closing', 'Closing', 'Max Cash to Close - Cash to close from borrower not to exceed {cash}.'],
    ['closing', 'Closing', 'Contract of Sale - All parties to sign contract and any riders/addendums; any changes to the contract, rider or addendum to be initialed by all parties.'],
    ['closing', 'Closing', 'Sales Price/Loan Amount - Closing Disclosure to reflect sales price of {price} and final loan amount of {loan}.']
  ];
  B.commit = {
    label: 'Commitment letter', sub: 'From a conditional approval',
    init: function () {
      var f = file();
      var d = {stateCode: stateAbbr(f.state) || 'NY', date: iso(), company: '', short: '', companyAddr1: '', companyAddr2: '', phone: '', nmls: '', mortgagee: '', loanNumber: '',
        borrowers: f.borrowers.length ? f.borrowers.map(function (n) { return {name: n}; }) : [{name: ''}], mail1: '', mail2: '',
        address: f.address, city: f.city, state: stateName(f.state), zip: f.zip, county: f.county,
        loanType: 'Fixed Rate', lien: 'first mortgage', amount: f.loan ? f.loan.toFixed(2) : '', rate: f.rate ? f.rate.toFixed(3) : '', apr: '', term: String(Math.round((f.term || 30) * 12)), balloon: 'N', negAm: 'N', payment: f.pi ? f.pi.toFixed(2) : '', purpose: 'Purchase', occupancy: f.occupancy || 'Primary Residence',
        locked: '', points: '', origination: '', commitFee: '', acceptDays: '7', expires: addDays(iso(), 90), lockExpires: '', price: f.price || '', value: f.value || '', pitia: f.payment ? f.payment.toFixed(2) : '', cash: '',
        pmiReq: /conv/i.test(f.program) && f.downPct < .2, escrow: true, escTaxes: f.taxes ? f.taxes.toFixed(2) : '', escHaz: f.ins ? f.ins.toFixed(2) : '', escMI: f.mi ? f.mi.toFixed(2) : '', flood: false,
        processor: '', procPhone: '', procEmail: '', lo: '', loNmls: '', loPhone: '', loEmail: '', underwriter: '', returnDays: '10', findText: '', replaceText: '', conditions: []};
      COND_LIB.forEach(function (c) { d.conditions.push({id: uid(), group: c[0], cat: c[1], text: c[2], on: true}); });
      return d;
    },
    form: function () {
      var b = 'commit', s = drafts[b];
      var conds = function (g, title) {
        var list = s.conditions.filter(function (c) { return c.group === g; });
        return '<fieldset><legend>' + title + ' (' + list.filter(function (c) { return c.on; }).length + ' of ' + list.length + ' kept)</legend>' + list.map(function (c) {
          return '<div class="cond"><input type="checkbox" data-cond="' + c.id + '" data-f="on"' + (c.on ? ' checked' : '') + ' aria-label="Keep this condition"><div><input data-cond="' + c.id + '" data-f="cat" value="' + esc(c.cat) + '" style="margin-bottom:4px;font-weight:700" aria-label="Category"><textarea data-cond="' + c.id + '" data-f="text" rows="2" aria-label="Condition">' + esc(c.text) + '</textarea>' + (c.src ? '<div class="note">From the approval: ' + esc(c.src) + '</div>' : '') + '</div>' +
            '<div style="display:grid;gap:4px"><select data-cond="' + c.id + '" data-f="group" aria-label="When"><option value="prior"' + (c.group === 'prior' ? ' selected' : '') + '>Prior to closing</option><option value="closing"' + (c.group === 'closing' ? ' selected' : '') + '>At closing</option></select><button type="button" class="x" data-a="condDel" data-id="' + c.id + '">Delete</button></div></div>';
        }).join('') + '<div class="row" style="margin-top:6px"><button type="button" class="btn" data-a="condAdd" data-g="' + g + '">+ Add condition</button></div></fieldset>';
      };
      return dropZone('approval', 'Drop the lender\'s conditional approval', 'PDF or image. Fills the loan terms, borrowers and property, and lists every condition so you choose which stay.') +
        '<fieldset><legend>Issued by (your company)</legend><div class="g">' + field(b, 'company', 'Company name', {wide: 1}) + field(b, 'short', 'Short name used in the text', {ph: 'e.g. the Lender'}) + field(b, 'nmls', 'Company NMLS #') +
        field(b, 'companyAddr1', 'Street address', {addrPair: 'companyAddr2'}) + field(b, 'companyAddr2', 'City, state ZIP') + field(b, 'phone', 'Toll-free / main phone') + field(b, 'stateCode', 'Title prefix (state)', {ph: 'NY'}) + field(b, 'mortgagee', 'Mortgagee clause (blank = company, ISAOA/ATIMA and address)', {type: 'textarea', wide: 1, rows: 2}) + '</div></fieldset>' +
        people(b, 'borrowers', 'Borrowers', 4) + '<fieldset><legend>Borrower mailing address</legend><div class="g">' + field(b, 'mail1', 'Street', {addrPair: 'mail2'}) + field(b, 'mail2', 'City, state ZIP') + '</div></fieldset>' + propertyBlock(b) +
        '<fieldset><legend>Loan terms</legend><div class="g">' + field(b, 'date', 'Commitment date', {type: 'date'}) + field(b, 'loanNumber', 'Loan number') + field(b, 'loanType', 'Loan type', {list: ['Fixed Rate', 'Adjustable Rate', 'FHA Fixed Rate', 'FHA 203(k) Fixed Rate', 'VA Fixed Rate', 'USDA Fixed Rate', 'Fannie Mae HomeStyle', 'Non-QM Fixed Rate', 'Jumbo Fixed Rate']}) + field(b, 'lien', 'Lien', {list: ['first mortgage', 'second mortgage']}) +
        field(b, 'amount', 'Loan amount', {type: 'money'}) + field(b, 'rate', 'Interest rate (%)', {type: 'pct'}) + field(b, 'apr', 'APR (%)', {type: 'pct'}) + field(b, 'term', 'Loan term (months)') + field(b, 'payment', 'Monthly payment (P&I)', {type: 'money'}) + field(b, 'purpose', 'Loan purpose', {list: ['Purchase', 'Refinance', 'Cash-Out Refinance', 'Rate/Term Refinance', 'Streamline Refinance', 'Construction']}) +
        field(b, 'occupancy', 'Occupancy', {list: ['Primary Residence', 'Second Home', 'Investment']}) + field(b, 'balloon', 'Balloon', {list: ['N', 'Y']}) + field(b, 'negAm', 'Negative amortization', {list: ['N', 'Y']}) + field(b, 'locked', 'Rate locked on', {type: 'date'}) + field(b, 'lockExpires', 'Lock expires', {type: 'date'}) +
        field(b, 'points', 'Total points paid by borrower') + field(b, 'origination', 'Origination fee') + field(b, 'commitFee', 'Commitment fee') + field(b, 'acceptDays', 'Days to accept') + field(b, 'expires', 'Must close by', {type: 'date'}) + field(b, 'returnDays', 'Days to sign and return') + '</div></fieldset>' +
        '<fieldset><legend>Insurance and escrow</legend><div class="g">' + field(b, 'pmiReq', 'PMI is required', {type: 'check'}) + field(b, 'escrow', 'Escrow account will be established', {type: 'check'}) + field(b, 'escTaxes', 'Monthly taxes', {type: 'money'}) + field(b, 'escHaz', 'Monthly hazard insurance', {type: 'money'}) + field(b, 'escMI', 'Monthly mortgage insurance', {type: 'money'}) + field(b, 'flood', 'Property is in a flood zone', {type: 'check'}) + '</div></fieldset>' +
        '<fieldset><legend>Amounts used in conditions</legend><div class="g">' + field(b, 'price', 'Sales price', {type: 'money'}) + field(b, 'value', 'Appraised value', {type: 'money'}) + field(b, 'pitia', 'Maximum PITIA', {type: 'money'}) + field(b, 'cash', 'Maximum cash to close', {type: 'money'}) + '</div></fieldset>' +
        '<fieldset><legend>Contacts</legend><div class="g">' + field(b, 'processor', 'Loan processor') + field(b, 'procPhone', 'Processor phone') + field(b, 'procEmail', 'Processor email') + field(b, 'lo', 'Loan officer') + field(b, 'loNmls', 'Loan officer NMLS') + field(b, 'loPhone', 'Loan officer phone') + field(b, 'loEmail', 'Loan officer email') + field(b, 'underwriter', 'Underwriter') + '</div></fieldset>' +
        '<fieldset><legend>Conditions</legend><div class="row"><button type="button" class="btn" data-a="condAll">Keep all</button><button type="button" class="btn" data-a="condNone">Drop all</button><button type="button" class="btn" data-a="condBorrower">Borrower items only</button><button type="button" class="btn" data-a="condLib">Add standard conditions</button></div>' +
        '<div class="g" style="margin-top:8px">' + field(b, 'findText', 'Replace this name in the conditions', {ph: 'e.g. the approving lender\'s name'}) + field(b, 'replaceText', 'With') + '</div><div class="row" style="margin-top:6px"><button type="button" class="btn" data-a="condReplace">Replace in all conditions</button></div></fieldset>' +
        conds('prior', 'Conditions to be satisfied prior to closing') + conds('closing', 'Conditions to be satisfied at closing');
    },
    fill: function (t, c) {
      var s = drafts.commit;
      return String(t).replace(/\{value\}/g, N(s.value) ? usd(s.value, 0) : '$________').replace(/\{price\}/g, N(s.price) ? usd(s.price) : '$________').replace(/\{loan\}/g, N(s.amount) ? usd(s.amount) : '$________')
        .replace(/\{pitia\}/g, N(s.pitia) ? usd(s.pitia) : '$________').replace(/\{cash\}/g, N(s.cash) ? usd(s.cash) : '$________').replace(/\{occupancy\}/g, s.occupancy || 'Primary Residence')
        .replace(/\{short\}/g, s.short || s.company || 'the Lender').replace(/\{mortgagee\}/g, (s.company || 'the Lender') + ' ISAOA ATIMA' + (s.companyAddr1 ? ', ' + s.companyAddr1 + ', ' + s.companyAddr2 : ''));
    },
    doc: function (s) {
      var co = s.company || 'Company Name', sh = s.short || s.company || 'the Lender', bor = names(s.borrowers), title = (s.stateCode ? s.stateCode.toUpperCase() + ' ' : '') + 'COMMITMENT AGREEMENT';
      var yn = function (on) { return on ? '<u>&nbsp;X&nbsp;</u>' : '<u>&nbsp;&nbsp;&nbsp;&nbsp;</u>'; }, F = function (t) { return esc(B.commit.fill(t)); };
      var head = '<div class="logo"><div class="mk"></div><div><div class="nm">' + esc(co) + '</div>' + (s.nmls ? '<div class="sb">NMLS # ' + esc(s.nmls) + '</div>' : '') + '</div></div><h1>' + esc(title) + '</h1>';
      var prior = s.conditions.filter(function (c) { return c.on && c.group === 'prior' && c.text.trim(); }), at = s.conditions.filter(function (c) { return c.on && c.group === 'closing' && c.text.trim(); });
      var ol = function (l) { return '<ol>' + l.map(function (c) { return '<li>' + (c.cat ? esc(c.cat) + '- ' : '') + F(c.text) + '</li>'; }).join('') + '</ol>'; };
      var mort = s.mortgagee ? esc(s.mortgagee).replace(/\n/g, '<br>') : esc(co) + '<br>ISAOA/ATIMA<br><b>' + esc(s.companyAddr1 || '') + '</b><br><b>' + esc(s.companyAddr2 || '') + '</b>' + (s.phone ? '<br>Toll Free: ' + esc(s.phone) : '');
      var body = head +
        '<p>' + esc(when(s.date, slashDate)) + '</p><div class="two"><div>' + bor.map(esc).join('<br>') + '<br>' + esc(s.mail1 || '') + '<br>' + esc(s.mail2 || '') + '</div><div>Loan Number: ' + esc(s.loanNumber || '') + '</div></div>' +
        '<div class="two" style="margin-top:14px"><div><b>Subject Property:</b><br>' + (String(s.addrFree || '').trim() ? esc(s.addrFree).replace(/\n/g, '<br>') : esc(s.address || '') + '<br>' + esc([s.city, [stateAbbr(s.state), s.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '))) + '</div><div><b>Loan Type:</b> ' + esc(s.loanType) + '</div></div>' +
        '<p style="margin-top:16px">Dear Borrower(s):</p><p>' + esc(co) + ' is pleased to advise you that your application for a loan secured by a <b>' + esc(s.lien) + '</b> on the above referenced subject property has been approved subject to the following terms and conditions:</p>' +
        '<table class="terms"><tr><td>Loan Amount:</td><td>' + (N(s.amount) ? usd(s.amount) : '') + '</td><td>Interest Rate/APR</td><td>' + (s.rate ? N(s.rate).toFixed(3) + '%' : '') + (s.apr ? ' / ' + N(s.apr).toFixed(3) + '%' : '') + (/adjust/i.test(s.loanType) ? ' (ARM)' : ' (Fixed)') + '</td></tr>' +
        '<tr><td>Loan Term:</td><td>' + esc(s.term) + '</td><td>Interest Rate Locked:</td><td>' + esc(s.locked ? when(s.locked, slashDate) : '') + '</td></tr><tr><td>Balloon:</td><td>' + esc(s.balloon) + '</td><td>ARM - Initial Fixed Period:</td><td></td></tr>' +
        '<tr><td>Negative Amortization:</td><td>' + esc(s.negAm) + '</td><td>ARM - Adjustment Period:</td><td></td></tr><tr><td>Monthly Payment:</td><td>' + (N(s.payment) ? usd(s.payment) : '') + '</td><td>ARM - Periodic/Life Caps:</td><td>&nbsp;/</td></tr>' +
        '<tr><td>Loan Purpose:</td><td>' + esc(s.purpose) + '</td><td>ARM - Margin/Index/Source:</td><td>&nbsp;/ /</td></tr><tr><td>Occupancy:</td><td>' + esc(s.occupancy) + '</td><td>Total Points paid by Borrower:</td><td>' + esc(s.points || '$ (%)') + '</td></tr>' +
        '<tr><td></td><td></td><td>Origination Fee:</td><td>' + esc(s.origination || '') + '</td></tr><tr><td></td><td></td><td>Commitment Fee:</td><td>' + esc(s.commitFee || '$') + '</td></tr></table>' +
        '<p><b>Commitment</b>: The commitment fee is not included in the origination, discount or total points shown above. You have ' + esc(s.acceptDays || '7') + ' calendar days from the date of this commitment agreement to accept this commitment by signing and returning it to us.</p>' +
        '<p><b>Expiration:</b> If your closing does not take place prior to ' + esc(when(s.expires, slashDate)) + ', we have no obligation to honor the terms of this agreement. You may request an extension; however, we are not obligated to accept this request.</p>' +
        '<p><b>Rate Lock:</b> If your rate is locked, your rate lock and points expire on ' + esc(s.lockExpires ? when(s.lockExpires, slashDate) : '//') + '. You may request a rate lock extension; however, in no event will the interest rate and points be less than those stated in this commitment. There may be a cost to extend the lock at the same terms, or your lock may be subject to prevailing market rates and points at the time of the extension request. If your rate is not locked or expires, your interest rate will be determined at or before closing. The maximum interest rate at closing cannot be more than 1% higher than the rate disclosed in this commitment. If the prevailing rate and points exceed your current lock, this commitment will be subject to requalification and may become null and void.</p>' +
        '<p><b>Private Mortgage Insurance</b> (PMI): PMI ' + yn(s.pmiReq) + ' is or ' + yn(!s.pmiReq) + ' is not required as a condition of making this loan. If PMI is required you may request that your servicer terminate your PMI when the unpaid principal balance represents 80% or less of the sales price or appraised value at the time of loan origination, if you meet certain criteria. Your PMI will be canceled automatically when the principal balance represents 78% of the sales price or appraised value at the time of loan origination, if you are current on your payments on the anticipated cancellation date.</p>' +
        '<p><b>Escrow</b>: At closing an escrow account ' + yn(s.escrow) + 'will or ' + yn(!s.escrow) + 'will not be established. If established, you will be required to make an initial deposit into this account at closing. Your total monthly payment will include monies to be deposited so that these funds will be used by the servicer of your mortgage to pay taxes and insurance on the subject property when due. Based on current information, your escrow payment will consist of the following:</p>' +
        '<table class="esc"><tr><td>Taxes:</td><td>' + usd(s.escTaxes) + '</td></tr><tr><td>Hazard Insurance:</td><td>' + usd(s.escHaz) + '</td></tr><tr><td>Mortgage Insurance:</td><td>' + usd(s.escMI) + '</td></tr></table>' +
        '<p><b>Assumption</b>: Your loan is not assumable.</p><p><b>Closing Costs:</b> You will be required to pay closing costs and fees at the closing. You have been provided with a Loan Estimate of these costs and fees. You will receive a Closing Disclosure at least three (3) days prior to your closing that will include your final loan terms and closing costs, as well as your projected total monthly payment.</p>' +
        '<p><b>Prepayment Penalty</b>: Your loan is not subject to a prepayment penalty.</p><p><b>Evidence of Title</b>: Evidence of Title is to be provided to the Lender and must indicate no liens, encumbrances, or any adverse covenants or conditions to title unless approved by Lender. The Evidence of Title must be issued from a firm or source, and in a form acceptable to Lender. Borrower may be charged for the cost of providing such Title and the cost of recording documents, all of which will be ordered by Lender unless requested otherwise.</p>' +
        '<p><b>Hazard Insurance:</b> If the subject property is not in a cooperative project or a condominium project that carries insurance for your unit, <b>you are required to purchase property insurance as a condition of receiving the loan. You may secure insurance from a company or agent of your own choosing.</b> You must provide us with evidence of a fully paid hazard insurance policy prior to closing. We require the insurer have a minimum Best Rating of "B", and that your coverage is at minimum full replacement cost of the subject property. (Properties in a project may require that you purchase HO-6 coverage to insure the interior of your unit. Please refer to the conditions below.)</p>' +
        '<p>The mortgagee clause on your policy must read:</p><p>' + mort + '</p>' +
        '<p><b>Flood Insurance:</b> Your property ' + yn(s.flood) + 'is or ' + yn(!s.flood) + 'is not in a flood zone. If your property is in a federally designated flood zone, prior to closing you must provide us with copies of a satisfactory flood insurance policy and a paid receipt for the first year\'s premium. Coverage must be in the amount of full replacement cost, or the maximum available (whichever is less). If your loan requires the placement of flood insurance, the premium must be escrowed.</p>' +
        '<p><b>Refundability</b>: The commitment fee, if applicable, will be due at loan closing, but not before. Your Commitment Fee and/or points are non-refundable.</p>' +
        '<p><b>Cancelation:</b> ' + esc(sh) + ' reserves the right to cancel this commitment should any of the following occur after the acceptance of this commitment:</p><ol class="tab"><li>Adding or removing any applicant;</li><li>If any statement or communication received from the borrower is discovered to be false in any way;</li><li>Any change to the applicant\'s employment status, credit reputation, monthly income, or availability of assets required to consummate the transaction;</li><li>Failure to comply with any conditions the applicant is responsible for satisfying;</li><li>A change to the interest rate that has an adverse impact on the applicant\'s ability to repay;</li><li>If conditions change on the secondary market through no fault of ' + esc(sh) + '.</li></ol>' +
        '<p><b>Documentation:</b> The following is a list of information and conditions that we may require you to produce and/or satisfy prior to closing your loan:</p><ol class="tab"><li>If the subject property is a 1-4 family dwelling: title report and insurance, property survey, copy of Certificate of Occupancy for use, satisfactory final inspection (if new construction), evidence of appropriate hazard insurance, evidence of flood insurance as appropriate, master policy insurance certificate (for condominiums), termite inspection report, radon test, well water test report and septic inspection report.</li><li>If the subject property is a Co-Op: proprietary lease recognition agreement, pledge of shares of stock, warranty and representation that no outstanding claims against the proprietary lease or stock will exist at closing, and a copy of the certificate of occupancy and title policy for the entire building if conversion has occurred within the last six (6) months.</li></ol>' +
        (prior.length ? '<p><b>Conditions to be satisfied prior to closing:</b></p>' + ol(prior) : '') + (at.length ? '<p><b>Conditions to be satisfied at closing:</b></p>' + ol(at) : '') +
        '<p><b>Contact Us</b>: If you have any questions about this commitment or its conditions, or to schedule your closing, please contact your Loan Processor' + (s.processor ? ', ' + esc(s.processor) : '') + (s.procPhone ? ', by phone at ' + esc(s.procPhone) : '') + (s.procEmail ? ' or by email at ' + esc(s.procEmail) : '') + '.</p>' +
        '<p>If you have any questions regarding your rate, product, or terms of your loan, please contact your mortgage loan officer' + (s.lo ? ', ' + esc(s.lo) : '') + (s.loNmls ? ', NMLS: ' + esc(s.loNmls) : '') + (s.loPhone ? ' by phone at ' + esc(s.loPhone) : '') + (s.loEmail ? ' or by email at ' + esc(s.loEmail) : '') + '.</p>' +
        '<p>Please provide the above required documents and conditions to your Loan Processor for review prior to closing.</p><p><b>This commitment is binding upon both parties, subject to satisfactory fulfillment of all conditions contained herein. You are not obligated to accept this commitment. This agreement cannot be changed orally.</b></p>' +
        '<p>Please sign, date and return this commitment to your Loan Processor within ' + esc(s.returnDays || '10') + ' days of your receipt.</p><p style="margin-top:22px">Sincerely,</p><div class="lsig"></div><div>Lender\'s Signature</div>' +
        '<p style="margin-top:14px">' + esc(co) + (s.nmls ? '<br>NMLS # ' + esc(s.nmls) : '') + (s.underwriter ? '<br>' + esc(s.underwriter) + ' - Underwriter' : '') + (s.companyAddr1 ? '<br>' + esc(s.companyAddr1) : '') + (s.companyAddr2 ? '<br>' + esc(s.companyAddr2) : '') + '</p>' +
        '<table class="bs">' + [0, 2].map(function (k) { return '<tr><td>Borrower<br><span>' + esc(bor[k] || '') + '</span></td><td>Date</td><td>Borrower<br><span>' + esc(bor[k + 1] || '') + '</span></td><td>Date</td></tr>'; }).join('') + '</table>';
      return page('cmt', body, CSS_COMMIT);
    }
  };
  var CSS_COMMIT = '.cmt{font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;font-size:10.5pt}.pg.cmt{padding:.5in .75in .6in}.logo{display:flex;justify-content:center;align-items:center;gap:8px}.logo .mk{width:26px;height:30px;background:linear-gradient(135deg,#2f4f8f 50%,transparent 50%),#2f4f8f;clip-path:polygon(0 30%,55% 0,100% 30%,100% 100%,60% 100%,60% 45%,0 45%)}.logo .nm{font-family:Georgia,"Times New Roman",serif;font-size:19pt;font-weight:700;color:#2f4f8f;line-height:1}.logo .sb{font-family:Georgia,serif;font-size:8pt;color:#555;letter-spacing:.06em}' +
    'h1{text-align:center;font-weight:400;font-size:20pt;margin:4px 0 14px}p{margin:0 0 8px;line-height:1.32}.two{display:flex;justify-content:space-between}.two>div:last-child{width:3.1in}table.terms{width:100%;border-collapse:collapse;margin:6px 0 12px}table.terms td{padding:0 4px 0 0;vertical-align:top}table.terms td:nth-child(1){width:1.85in}table.terms td:nth-child(2){width:1.6in}table.terms td:nth-child(3){width:2.05in}' +
    'table.esc{margin:4px 0 10px 1.6in;border-collapse:collapse}table.esc td{padding:0 40px 0 0}ol{margin:4px 0 10px;padding-left:.45in}ol li{margin:0 0 3px;line-height:1.3;padding-left:4px}.lsig{border-bottom:1px solid #000;width:3in;height:30px}table.bs{width:100%;border-collapse:collapse;margin-top:26px}table.bs td{border-top:1px solid #000;padding:2px 6px 34px;vertical-align:top;width:25%}table.bs td:nth-child(2n){text-align:right;width:15%}table.bs span{font-size:10pt}';
  var COND_HEAD = /(Prior\s*to\s*Approval|Prior\s*to\s*Docs|Prior\s*to\s*Funding|At\s*Closing|Prior\s*to\s*Purchase)\s*\(\s*["“”']*\s*(PTA|PTD|PTF|AC|PTP)\s*["“”']*\s*\)\s*Conditions:?/gi;
  function flipName(n) { n = String(n || '').trim(); var m = n.match(/^([A-Za-z'.-]+),\s*(.+)$/); return m ? m[2].trim() + ' ' + m[1] : n; }
  function parseApproval(text) {
    var T = String(text || '').replace(/\r/g, ''), o = {conds: []};
    var g = function (re) { var m = T.match(re); return m ? String(m[1]).trim() : ''; };
    o.b1 = flipName(g(/\bBorrower:\s*([A-Za-z'.-]+,\s*[A-Za-z'.-]+)/)); o.b2 = flipName(g(/Co-?Borr(?:ower)?:\s*([A-Za-z'.-]+,\s*[A-Za-z'.-]+)/));
    o.loanNumber = g(/Loan\s*(?:#|No\.?|Number):?\s*([A-Z0-9][A-Z0-9-]{5,})/i);
    o.amount = g(/Approved\s*Loan\s*Amount:?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) || g(/Loan\s*Amount:?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    o.rate = g(/Note\s*Rate:?\s*([\d.]+)\s*%/i); o.price = g(/Sales\s*Price:?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i); o.value = g(/Appraised\s*Value:?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    o.program = g(/Loan\s*Program:?\s*([A-Za-z0-9 ().\/-]+?)(?=\s{2,}|\s+Purpose|\n|$)/i); o.purpose = g(/Purpose:?\s*(Purchase|Cash[- ]?Out\s*Refi\w*|Rate\/Term\s*Refi\w*|No\s*Cash[- ]Out\s*Refi\w*|Refinance)/i);
    o.occupancy = g(/Occupancy:?\s*(Primary\s*Residence|Second\s*Home|Investment\s*Property|Investment)/i).replace(/Primary\s*Residence/i, 'Primary Residence').replace(/Second\s*Home/i, 'Second Home');
    o.loanType = g(/Loan\s*Type:?\s*(FHA|VA|USDA|Conventional|Conv)\b/i); o.amort = g(/Amortization\s*Type:?\s*(Fixed|ARM|Adjustable)/i); o.term = g(/Term\s*\/\s*Due\s*In:?\s*(\d{2,3})/i);
    o.approved = g(/Approved:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i); o.mustClose = g(/Must\s*Close\s*By:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i); o.piti = g(/Proposed\s*PIT[I1l|]?:?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    o.impounds = g(/Impounds:?\s*(Not\s*Waived|Waived)/i); o.processor = g(/Processor:[ \t]*([A-Z][A-Za-z.'-]+(?:[ \t][A-Z][A-Za-z.'-]+){0,2})/);
    var pm = T.match(/Property:\s*([^\n]+?)\s*\n\s*([A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5})/); if (pm) { o.street = pm[1].replace(/\s{2,}.*$/, '').replace(/\s+(Note\s*Rate|Qual\s*Rate|Expires|Lock|Property\s*Type)\b.*$/i, '').trim(); var cz = pm[2].match(/^(.+?),\s*([A-Z]{2})\s+(\d{5})/); if (cz) { o.city = cz[1].trim(); o.state = cz[2]; o.zip = cz[3]; } }
    var marks = [], m; COND_HEAD.lastIndex = 0; while ((m = COND_HEAD.exec(T))) marks.push({i: m.index, end: m.index + m[0].length, code: m[2].toUpperCase()});
    marks.forEach(function (k, n) {
      var chunk = T.slice(k.end, n + 1 < marks.length ? marks[n + 1].i : T.length)
        .replace(/Underwriting\s*Conditional\s*Approval\s*p\d+[^\n]*/gi, '').replace(/Section\s*2\s*[-–]\s*Underwriting\s*Conditions/gi, '');
      var items = chunk.split(/\n\s*[-–—_~=]{1,3}\s*(?=\n|$)/);
      /* conditions whose separator line was lost in OCR: split again where a new "Category -" starts a line or follows a closing asterisk */
      var SPLIT = /(?:\n|\*\s+)(?=(?:FHA\s*203\s*\(?k\)?|FHA|VA|USDA|Conv(?:entional)?|Assets|Credit|Income|Property|Title|Legal|Approval|Disclosures|Escrow\s*\/\s*Closing\s*Agent|Closing\s*Agent|Funder\s*Task|FUNDER\s*TO\s*CLEAR\s*PTD|Post\s*Closer|Closing)\s*[-–—:]\s)/;
      items = [].concat.apply([], items.map(function (it) { return it.split(SPLIT); }));
      items.forEach(function (it) {
        var t = it.replace(/\s*\n\s*/g, ' ').replace(/\s+\*+\s*$/, '').replace(/\s{2,}/g, ' ').trim().replace(/^[-–—*]+\s*/, '');
        if (t.length < 8 || /^[A-Za-z0-9 \/&().]{1,40}\s*[-–—]\s*\*?$/.test(t)) return;
        var cm = t.match(/^([A-Za-z0-9][A-Za-z0-9 /&().]{1,40}?)\s*[-–—]\s+(.+)$/), cat = cm ? cm[1].trim() : '', body = cm ? cm[2].trim() : t;
        if (!body || /^\*?$/.test(body)) return;
        body = body.replace(/^\*+\s*/, '');
        var internal = /^(Funder|FUNDER|Post\s*Closer|Approval|Disclosures)/i.test(cat) || /^(Underwriter|Underwriters|Funder|UW\b|Reno\s*Funder|Processor\s*Cert)/i.test(body) || /\bby\s+U\/W\b|\bUnderwriter\s+to\b/i.test(body);
        o.conds.push({id: uid(), group: k.code === 'AC' || k.code === 'PTF' || k.code === 'PTP' ? 'closing' : 'prior', cat: cat, text: body, on: !internal && k.code !== 'PTP', src: k.code});
      });
    });
    return o;
  }
  function applyApproval(o) {
    var s = drafts.commit, set = function (k, v) { if (v) s[k] = v; };
    if (o.b1) s.borrowers = [{name: o.b1}].concat(o.b2 ? [{name: o.b2}] : []);
    set('loanNumber', o.loanNumber); set('amount', o.amount && N(o.amount).toFixed(2)); set('rate', o.rate); set('price', o.price && N(o.price).toFixed(2)); set('value', o.value && N(o.value).toFixed(0));
    set('purpose', o.purpose && (/purchase/i.test(o.purpose) ? 'Purchase' : /cash/i.test(o.purpose) ? 'Cash-Out Refinance' : 'Refinance')); set('occupancy', o.occupancy && (/second/i.test(o.occupancy) ? 'Second Home' : /invest/i.test(o.occupancy) ? 'Investment' : 'Primary Residence'));
    set('term', o.term); set('pitia', o.piti && N(o.piti).toFixed(2)); set('processor', o.processor);
    if (o.mustClose) s.expires = iso(parseDate(o.mustClose)); if (o.approved) s.date = iso(parseDate(o.approved));
    var prog = (o.program || '') + ' ' + (o.loanType || ''); s.loanType = /203\s*\(?k/i.test(prog) ? 'FHA 203(k) Fixed Rate' : /homestyle/i.test(prog) ? 'Fannie Mae HomeStyle' : /\bfha\b/i.test(prog) ? 'FHA Fixed Rate' : /\bva\b/i.test(prog) ? 'VA Fixed Rate' : /usda/i.test(prog) ? 'USDA Fixed Rate' : /arm|adjust/i.test((o.amort || '') + prog) ? 'Adjustable Rate' : 'Fixed Rate';
    if (o.impounds) s.escrow = !/^waived/i.test(o.impounds);
    if (o.street) { s.address = o.street; s.city = o.city || s.city; s.state = stateName(o.state || s.state); s.zip = o.zip || s.zip; }
    if (o.amount && o.rate && o.term) { var L = N(o.amount), r = N(o.rate) / 1200, n = N(o.term); if (L && r && n) s.payment = (L * r / (1 - Math.pow(1 + r, -n))).toFixed(2); }
    if (o.conds.length) s.conditions = o.conds.concat(s.conditions.filter(function (c) { return c.lib; }));
    return o;
  }

  /* ============================================= MI & RENOVATION FEE WORKSHEET */
  function fhaAnnual(base, ltv, termMonths) {
    var big = base > 726200;
    if (termMonths > 180) return big ? (ltv > .95 ? .0075 : .007) : (ltv > .95 ? .0055 : .005);
    return big ? (ltv > .9 ? .0065 : ltv > .78 ? .004 : .0015) : (ltv > .9 ? .004 : .0015);
  }
  B.mi = {
    label: 'MI & renovation fees', sub: 'PMI, FHA MIP, draw fees',
    init: function () {
      var f = file(), a = f.inputs || {}, d = a.draws || {}, r = a.reno || {};
      return {program: /fha/i.test(f.program) ? 'FHA' : /\bva\b/i.test(f.program) ? 'VA' : 'Conventional', price: f.price || '', value: f.value || f.price || '', ltvValue: f.outputs && f.outputs.loan && f.renovation ? N(f.outputs.loan.valueBasis).toFixed(2) : '', downPct: f.downPct ? (f.downPct * 100).toFixed(2) : '3.5', base: f.base ? f.base.toFixed(2) : '', termYears: String(f.term || 30),
        ufmip: '1.75', miRate: f.miRate ? (f.miRate * 100).toFixed(3) : '', fico: '', renoOn: !!f.renovation, renoProgram: /fha/i.test(f.program) ? '203k' : 'homestyle', renoCost: N(r.baseCost) || '', contingency: r.contingencyPct != null ? (N(r.contingencyPct) * 100).toString() : '10',
        draws: N(d.manualDrawCount) || 5, feePerDraw: N(d.inspectionFeePerDraw) || (/fha/i.test(f.program) ? 375 : 150), titlePerDraw: N(d.titleFeePerDraw) || 75, inspTotal: r.syncDrawFees === false && r.inspectionFees != null ? N(r.inspectionFees) : '', titleTotal: r.syncDrawFees === false && r.titleUpdateFees != null ? N(r.titleUpdateFees) : '', consultant: N(r.consultant) || '', permits: N(r.permits) || '', architect: N(r.architectural) || '', reserveMonths: N(r.paymentReserveMonths) || 0, payment: f.payment ? f.payment.toFixed(2) : ''};
    },
    calc: function (s) {
      var price = N(s.price), value = N(s.value) || price, basis = N(s.ltvValue) || Math.min(price || value, value || price), base = N(s.base) || basis * (1 - N(s.downPct) / 100), ltv = basis ? base / basis : 0, n = N(s.termYears) * 12, fha = s.program === 'FHA', va = s.program === 'VA';
      var up = fha ? base * N(s.ufmip) / 100 : 0, total = base + up, rate = N(s.miRate) / 100 || (fha ? fhaAnnual(base, ltv, n) : 0);
      var miBase = base * rate / 12, miTotal = total * rate / 12;
      var cost = N(s.renoCost), cont = cost * N(s.contingency) / 100, insp = s.inspTotal !== '' && s.inspTotal != null ? N(s.inspTotal) : N(s.draws) * N(s.feePerDraw), title = s.titleTotal !== '' && s.titleTotal != null ? N(s.titleTotal) : N(s.draws) * N(s.titlePerDraw);
      /* 203(k) supplemental origination: greater of $350 or 1.5% of the rehabilitation costs (the Loan Suite's subtotal, before this fee) */
      var supp = s.renoProgram === '203k' ? Math.max(350, (cost + cont + insp + title + N(s.consultant) + N(s.permits) + N(s.architect)) * .015) : 0;
      var reserve = N(s.payment) * N(s.reserveMonths), renoTotal = s.renoOn ? cost + cont + insp + title + supp + N(s.consultant) + N(s.permits) + N(s.architect) + reserve : 0;
      return {base: base, ltv: ltv, up: up, total: total, rate: rate, miBase: miBase, miTotal: miTotal, fha: fha, va: va, cost: cost, cont: cont, insp: insp, title: title, supp: supp, reserve: reserve, renoTotal: renoTotal,
        drop: fha ? (ltv <= .9 ? 'Annual MIP ends after 11 years (LTV 90% or less at origination)' : 'Annual MIP for the life of the loan (LTV over 90%)') : va ? 'VA loans have no monthly mortgage insurance' : ltv > .8 ? 'Borrower may request removal at 80% of original value; automatic at 78%' : 'No mortgage insurance at 80% LTV or less'};
    },
    form: function () {
      var b = 'mi', s = drafts[b];
      return dropZone('mifile', 'Drop an MI quote, Loan Estimate, fee sheet or renovation budget', 'Reads the price, value, loan amount, term, MI or MIP rate, UFMIP, renovation cost, contingency, draws and fees.') +
        '<fieldset><legend>Loan</legend><div class="g">' + field(b, 'program', 'Program', {type: 'select', options: ['FHA', 'Conventional', 'VA']}) + field(b, 'termYears', 'Term (years)') + field(b, 'price', 'Purchase price', {type: 'money'}) + field(b, 'value', 'Appraised / as-is value', {type: 'money'}) + field(b, 'ltvValue', 'Value for LTV (renovation: value basis; blank = lower of price and value)', {type: 'money', wide: 1}) +
        field(b, 'downPct', 'Down payment (%)', {type: 'pct'}) + field(b, 'base', 'Base loan (blank = price less down)', {type: 'money'}) + (s.program === 'FHA' ? field(b, 'ufmip', 'UFMIP (%)', {type: 'pct'}) : '') +
        field(b, 'miRate', s.program === 'FHA' ? 'Annual MIP (%) - blank uses the HUD table' : 'Annual PMI (%) - from the MI quote', {type: 'pct'}) + field(b, 'payment', 'Monthly payment (for reserves)', {type: 'money'}) + '</div></fieldset>' +
        '<fieldset><legend>Renovation</legend><div class="g">' + field(b, 'renoOn', 'Renovation loan', {type: 'check', wide: 1}) + field(b, 'renoProgram', 'Renovation program', {type: 'select', options: [['203k', 'FHA 203(k)'], ['homestyle', 'Fannie Mae HomeStyle']]}) + field(b, 'renoCost', 'Renovation / contractor cost', {type: 'money'}) +
        field(b, 'contingency', 'Contingency (%)', {type: 'pct'}) + field(b, 'draws', 'Number of draws') + field(b, 'feePerDraw', 'Inspection fee per draw', {type: 'money'}) + field(b, 'titlePerDraw', 'Title update per draw', {type: 'money'}) + field(b, 'inspTotal', 'Inspection fees total (blank = draws x fee)', {type: 'money'}) + field(b, 'titleTotal', 'Title updates total (blank = draws x fee)', {type: 'money'}) + field(b, 'consultant', 'Consultant fee', {type: 'money'}) +
        field(b, 'permits', 'Permits', {type: 'money'}) + field(b, 'architect', 'Architect / engineer', {type: 'money'}) + field(b, 'reserveMonths', 'Payment reserve (months)') + '</div><p class="note">Inspection fee per draw: HomeStyle $150, FHA 203(k) $375. Changing the program here does not change the Loan Suite.</p></fieldset><div id="mtBmi"></div>';
    },
    side: function () { var c = B.mi.calc(drafts.mi), el = $('mtBmi'); if (el) el.innerHTML = '<div class="kv"><span>Base loan / LTV</span><b>' + usd(c.base) + ' / ' + pct(c.ltv) + '</b>' + (c.fha ? '<span>UFMIP</span><b>' + usd(c.up) + '</b><span>Total loan</span><b>' + usd(c.total) + '</b>' : '') + '<span>Annual MI rate</span><b>' + pct(c.rate, 3) + '</b><span>Monthly MI on the base loan</span><b>' + usd(c.miBase) + '</b>' + (c.fha ? '<span>Monthly MI on the total loan</span><b>' + usd(c.miTotal) + '</b>' : '') + (drafts.mi.renoOn ? '<span>Renovation total financed</span><b>' + usd(c.renoTotal) + '</b>' : '') + '</div>'; },
    doc: function (s) {
      var c = B.mi.calc(s), row = function (l, v, n) { return '<tr><td>' + l + '</td><td class="n">' + v + '</td><td class="nt">' + (n || '') + '</td></tr>'; };
      var mi = '<h2>' + (c.fha ? 'FHA mortgage insurance premium' : c.va ? 'VA - no mortgage insurance' : 'Private mortgage insurance') + '</h2><table>' + row('Purchase price', usd(s.price)) + row('Appraised / as-is value', usd(s.value)) + row('Base loan amount', usd(c.base), 'Loan-to-value ' + pct(c.ltv)) +
        (c.fha ? row('Upfront MIP (' + esc(s.ufmip) + '%)', usd(c.up), 'Financed into the loan') + row('Total loan amount', usd(c.total)) : '') +
        row('Annual ' + (c.fha ? 'MIP' : 'PMI') + ' rate', pct(c.rate, 3), c.fha && !N(s.miRate) ? 'HUD table for a ' + esc(s.termYears) + '-year term, base loan ' + (c.base > 726200 ? 'over' : 'up to') + ' $726,200' : 'Entered') +
        row('Monthly ' + (c.fha ? 'MIP' : 'PMI') + ' on the base loan', usd(c.miBase), '') + (c.fha ? row('Monthly MIP on the total loan', usd(c.miTotal), 'Some lenders figure the first year on the balance including financed UFMIP') : '') + row('Duration', '', esc(c.drop)) + '</table>';
      var reno = s.renoOn ? '<h2>Renovation fees - ' + (s.renoProgram === '203k' ? 'FHA 203(k)' : 'Fannie Mae HomeStyle') + '</h2><table>' + row('Renovation / contractor cost', usd(c.cost)) + row('Contingency (' + esc(s.contingency) + '%)', usd(c.cont)) +
        row('Draw inspection fees', usd(c.insp), N(s.inspTotal) || s.inspTotal === 0 ? 'Entered total' : esc(s.draws) + ' draws x ' + usd(s.feePerDraw) + ' (HomeStyle $150, FHA $375 per draw)') + row('Title update fees', usd(c.title), N(s.titleTotal) || s.titleTotal === 0 ? 'Entered total' : esc(s.draws) + ' draws x ' + usd(s.titlePerDraw)) +
        (s.renoProgram === '203k' ? row('Supplemental origination fee', usd(c.supp), 'Greater of $350 or 1.5% of the rehabilitation costs') : '') + (N(s.consultant) ? row('Consultant fee', usd(s.consultant)) : '') + (N(s.permits) ? row('Permits', usd(s.permits)) : '') + (N(s.architect) ? row('Architect / engineer', usd(s.architect)) : '') +
        (c.reserve ? row('Mortgage payment reserve', usd(c.reserve), esc(s.reserveMonths) + ' months x ' + usd(s.payment)) : '') + '<tr class="t"><td>Total renovation amount</td><td class="n">' + usd(c.renoTotal) + '</td><td></td></tr></table>' : '';
      return page('cal', '<h1>Mortgage Insurance & Renovation Fees</h1><p class="sub">' + esc(s.program) + ' &middot; ' + esc(s.termYears) + '-year term &middot; prepared ' + esc(longDate(iso())) + '</p>' + mi + reno + '<p class="sub" style="margin-top:20px">Estimates for planning. Confirm mortgage insurance with the MI certificate or the FHA case, and renovation fees with the lender\'s fee sheet.</p>', '.pg{padding:.6in .7in}h1{font-size:18pt;margin:0;color:#1f3a5f}h2{font-size:12pt;color:#1f3a5f;border-bottom:2px solid #1f3a5f;padding-bottom:3px;margin:20px 0 6px}.sub{font-size:9.5pt;color:#555;margin:4px 0}table{width:100%;border-collapse:collapse;font-size:10.5pt}td{padding:4px 6px;border-bottom:1px solid #e1e6ee;vertical-align:top}.n{text-align:right;white-space:nowrap;width:1.4in;font-weight:600}.nt{font-size:9pt;color:#555;width:3.1in}tr.t td{border-top:2px solid #1f3a5f;font-weight:700}');
    }
  };

  /* ================================================================ shell / UI */
  var ORDER = ['addendum', 'lease', 'estimate', 'pl', 'commit', 'mi'];
  var RERENDER = {style: 1, leaseType: 1, program: 1, concOnTop: 1, ttOn: 1, renoOn: 0};
  function mount() {
    if ($('mtB')) return;
    if (!$('mtBcss')) { var st = document.createElement('style'); st.id = 'mtBcss'; st.textContent = CSS; document.head.appendChild(st); }
    var w = document.createElement('div'); w.id = 'mtB'; w.className = 'no-print'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Document builder');
    w.innerHTML = '<div class="mb"><div class="mb-top"><h2>Document builder<span class="sub" id="mtBsub"></span></h2><button type="button" class="btn" data-a="reset">Start over from the loan file</button><button type="button" class="btn" data-a="pageEdit" aria-pressed="false" title="Type straight onto the document before printing">Edit on page</button><button type="button" class="btn" data-a="print">Print</button><button type="button" class="btn pri" data-a="pdf">Download PDF</button><button type="button" class="btn" data-a="close" aria-label="Close the document builder">Close</button></div>' +
      '<nav class="mb-nav" aria-label="Documents"></nav><div class="mb-form"></div><div class="mb-prev"><div class="fitbar" id="mtBfit"></div><div class="pe" id="mtBpe" hidden>Editing on the page - click into the document and type. Print and Download PDF use your edits. Changing the form afterwards rebuilds the page.</div><iframe title="Document preview" id="mtBframe"></iframe></div></div>';
    document.body.appendChild(w);
    wire(w);
  }
  function renderNav() { var n = document.querySelector('#mtB .mb-nav'); n.innerHTML = ORDER.map(function (k) { return '<button type="button" data-a="nav" data-k="' + k + '" aria-current="' + (k === cur) + '">' + B[k].label + '<small>' + B[k].sub + '</small></button>'; }).join('') + '<button type="button" data-a="paystub">Pay statement<small>Opens the pay stub generator</small></button>' +
      (window.V14 && V14.__mtbOrig && (cur === 'addendum' || cur === 'lease') ? '<button type="button" data-a="classic">Classic ' + (cur === 'addendum' ? 'addendum' : 'lease') + ' form<small>The earlier Loan Suite form</small></button>' : ''); $('mtBsub').textContent = ' · ' + B[cur].label; }
  function renderForm() {
    var f = document.querySelector('#mtB .mb-form'), ae = document.activeElement, key = ae && f.contains(ae) ? ['b', 'k', 'list', 'i', 'f', 'cond'].map(function (a) { return ae.getAttribute('data-' + a) || ''; }).join('|') : '', st = f.scrollTop;
    f.innerHTML = B[cur].form();
    f.scrollTop = st;
    if (key) { var el = Array.prototype.filter.call(f.querySelectorAll('input,select,textarea'), function (x) { return ['b', 'k', 'list', 'i', 'f', 'cond'].map(function (a) { return x.getAttribute('data-' + a) || ''; }).join('|') === key; })[0]; if (el) { el.focus(); try { if (el.setSelectionRange && el.type === 'text') el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} } }
    if (B[cur].side) B[cur].side();
    restoreStatus();
    if (window.MTAddr) [].forEach.call(f.querySelectorAll('[data-addr],[data-addr-line],[data-addr-pair]'), function (el) { MTAddr.attach(el, {onPick: function (a) { addrPick(el, a); }}); });
  }
  /* an address suggestion picked in a builder fills that builder's fields */
  function addrPick(el, a) {
    var b = el.getAttribute('data-b'), s = drafts[b]; if (!s) return;
    if (el.hasAttribute('data-addr')) { var p = el.getAttribute('data-addr') || ''; s[p + 'address'] = a.street; s[p + 'city'] = a.city; s[p + 'state'] = a.state; s[p + 'zip'] = a.zip; s[p + 'county'] = a.county; if (b === 'addendum') B.addendum.sync(s); }
    else { var v = el.hasAttribute('data-addr-pair') ? a.street : a.line;
      if (el.hasAttribute('data-list')) { var arr = s[el.getAttribute('data-list')], i = +el.getAttribute('data-i'), f = el.getAttribute('data-f'); if (typeof arr[i] !== 'object') arr[i] = {name: arr[i] || ''}; arr[i][f] = v; } else s[el.getAttribute('data-k')] = v;
      if (el.hasAttribute('data-addr-pair')) s[el.getAttribute('data-addr-pair')] = a.cityLine; }
    persist(); renderForm(); refresh(true);
  }
  var rT = 0;
  function refresh(now) { clearTimeout(rT); rT = setTimeout(function () { var fr = $('mtBframe'); if (!fr) return; if (editing) { editDirty = true; if (B[cur].side) B[cur].side(); return; } var y = 0; try { y = fr.contentWindow.scrollY; } catch (e) {} fr.srcdoc = B[cur].doc(drafts[cur]); fr.onload = function () { fit(); try { fr.contentWindow.scrollTo(0, y); } catch (e) {} }; if (B[cur].side) B[cur].side(); }, now ? 0 : 180); }
  /* the preview fits the pane; printing and the PDF use the full page size */
  function fit() { var fr = $('mtBframe'); if (!fr || !fr.contentDocument || !fr.contentDocument.body) return; fr.contentDocument.body.style.zoom = ''; onePage(fr.contentDocument); var z = Math.min(1, (fr.clientWidth - 28) / 816); fr.contentDocument.body.style.zoom = z > 0 ? z : 1; }
  /* One page: a page that runs long first gets narrower margins, then its content is scaled down evenly until it fits.
     Below MIN_SCALE the text would be too small to read, so the document keeps its natural length and the bar says so. */
  var FIT_KEY = 'mt.builder.fit', MIN_SCALE = .66;
  function fitOn() { try { return localStorage.getItem(FIT_KEY) !== '0'; } catch (e) { return true; } }
  function onePage(doc) {
    var res = {pages: 0, scaled: 1, over: 0};
    [].forEach.call(doc.querySelectorAll('.pg'), function (pg) {
      var w = pg.querySelector(':scope > .fitw'); res.pages++; if (!w) return;
      pg.classList.remove('fitted', 'fitc'); w.style.transform = ''; w.style.width = '';
      if (!fitOn()) { var nat = Math.ceil(pg.scrollHeight / 1056 - .02); if (nat > 1) res.over = Math.max(res.over, nat); return; }
      var avail = function () { var cs = doc.defaultView.getComputedStyle(pg); return 1056 - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 2; };
      if (w.scrollHeight <= avail()) return;
      pg.classList.add('fitc'); var a = avail(), h = w.scrollHeight;
      if (h <= a) { pg.classList.add('fitted'); return; }
      var z = a / h;
      for (var k = 0; k < 8 && z >= MIN_SCALE - .05; k++) { w.style.width = (100 / z) + '%'; w.style.transform = 'scale(' + z + ')'; h = w.scrollHeight; if (h * z <= a) break; z = Math.min(z - .005, a / h); }
      if (z < MIN_SCALE || w.scrollHeight * z > a + 1) { pg.classList.remove('fitc'); w.style.transform = ''; w.style.width = ''; res.over = Math.max(res.over, Math.ceil(pg.scrollHeight / 1056 - .02)); return; }
      pg.classList.add('fitted'); res.scaled = Math.min(res.scaled, z);
    });
    var bar = $('mtBfit'); if (bar) { bar.className = 'fitbar' + (res.over ? ' warn' : '');
      bar.innerHTML = '<label><input type="checkbox" data-a="fitToggle"' + (fitOn() ? ' checked' : '') + '> Fit on one page</label><span>' +
        (res.over ? (fitOn() ? 'Too long to fit on one page at a readable size - runs ' + res.over + ' pages. Shorten or untick sections to bring it to one page.' : 'Runs ' + res.over + ' pages.') : !fitOn() ? 'One page.' : res.scaled < .999 ? 'Fits on one page (text at ' + Math.round(res.scaled * 100) + '%).' : 'Fits on one page.') + '</span>'; }
    return res;
  }
  function unfit(fn) { var fr = $('mtBframe'), b = fr && fr.contentDocument && fr.contentDocument.body, z = b ? b.style.zoom : ''; if (b) b.style.zoom = ''; var r = fn(); var done = function () { if (b) b.style.zoom = z; }; if (r && r.then) r.then(done, done); else setTimeout(done, 400); return r; }
  window.addEventListener('resize', function () { if ($('mtB') && $('mtB').classList.contains('open')) fit(); });
  function setVal(t, ev) {
    var b = t.getAttribute('data-b'), v = t.type === 'checkbox' ? t.checked : t.value;
    if (t.hasAttribute('data-cond')) { var c = drafts.commit.conditions.filter(function (x) { return x.id === t.getAttribute('data-cond'); })[0]; if (c) { c[t.getAttribute('data-f')] = v; if (t.getAttribute('data-f') === 'group' || t.getAttribute('data-f') === 'on') { persist(); renderForm(); } } persist(); refresh(); return; }
    if (!b || !drafts[b]) return;
    if (t.hasAttribute('data-over')) { var s0 = drafts[b]; s0.over = s0.over || {}; s0.over[t.getAttribute('data-over')] = v; persist(); refresh(); return; }
    if (t.hasAttribute('data-list')) { var arr = drafts[b][t.getAttribute('data-list')], i = +t.getAttribute('data-i'), f = t.getAttribute('data-f');
      if (f) { if (typeof arr[i] !== 'object') arr[i] = {name: arr[i] || ''}; arr[i][f] = v; } else arr[i] = v; persist(); refresh(); if (B[b].side) B[b].side(); return; }
    var k = t.getAttribute('data-k'), s = drafts[b]; s[k] = v;
    if (b === 'addendum') {
      if (k === 'concPct') s.concDrv = 'pct'; else if (k === 'concAmt') s.concDrv = 'amt';
      if (k === 'toPrice') s.priceManual = String(v).trim() !== '';
      B.addendum.sync(s);
    }
    if (b === 'mi' && k === 'renoProgram') drafts.mi.feePerDraw = v === '203k' ? 375 : 150;
    persist();
    if (RERENDER[k] && (t.tagName === 'SELECT' || t.type === 'checkbox')) renderForm(); else if (B[b].side) B[b].side();
    refresh();
  }
  function wire(w) {
    w.addEventListener('input', function (e) { if (e.target.matches('input:not([type=checkbox]):not([type=file]):not(.pk):not(#mtBpreset),textarea')) setVal(e.target, e); });
    w.addEventListener('change', function (e) {
      var t = e.target, a = t.getAttribute('data-a');
      if (t.type === 'file') { var fl = t.files && t.files[0]; t.value = ''; if (fl) readInto(a, fl); return; }
      /* the calendar fills the typed date box next to it */
      if (t.classList.contains('pk')) { var box = t.parentNode.querySelector('input[data-fdate]'); if (box && t.value) { box.value = dateFromPicker(t.value); setVal(box); } return; }
      if (t.id === 'mtBpreset') return;
      if (a === 'fitToggle') { try { localStorage.setItem(FIT_KEY, t.checked ? '1' : '0'); } catch (x) {} pageEdit(false); refresh(true); return; }
      if (t.matches('select,input[type=checkbox]')) setVal(t, e);
    });
    w.addEventListener('click', function (e) {
      var t = e.target.closest('[data-a]'); if (!t || t.tagName === 'INPUT' || t.tagName === 'SELECT') return; var a = t.getAttribute('data-a');
      if (a === 'close') return close();
      if (a === 'pick') { var pk = t.parentNode.querySelector('input.pk'), tx = t.parentNode.querySelector('input[data-fdate]'), d0 = parseDate(tx && tx.value); pk.value = d0 ? iso(d0) : ''; try { pk.showPicker(); } catch (x) { pk.style.pointerEvents = 'auto'; pk.focus(); pk.click(); } return; }
      if (a === 'pageEdit') return pageEdit(!editing);
      if (a === 'addrToggle') { if (window.MTAddr) MTAddr.setOff(!MTAddr.isOff()); renderForm(); return; }
      if (a === 'nav') { pageEdit(false); cur = t.getAttribute('data-k'); ensure(cur); renderNav(); renderForm(); refresh(true); return; }
      if (a === 'classic') { close(); V14.__mtbOrig.call(V14, cur === 'addendum' ? 'v14AddModal' : 'v14LeaseModal'); return; }
      if (a === 'paystub') { close(); if (typeof window.switchTab === 'function' && document.getElementById('subpanel-docs-paystub')) { window.switchTab('paystub'); } else if (window.V15 && V15.openPay) V15.openPay(); else location.href = 'income-calculator.html?tab=paystub'; return; }
      if (a === 'reset') { if (!confirm('Start this ' + B[cur].label.toLowerCase() + ' over from the loan file? Your changes to it are cleared.')) return; pageEdit(false); drafts[cur] = B[cur].init(); persist(); renderForm(); refresh(true); return; }
      if (a === 'print') { var fr = $('mtBframe'); unfit(function () { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (x) {} }); return; }
      if (a === 'pdf') return unfit(pdf);
      if (a === 'add') { var b = t.getAttribute('data-b'), L = t.getAttribute('data-list'), arr = drafts[b][L]; arr.push(L === 'items' ? {trade: '', desc: '', qty: '', unit: '', labor: '', materials: ''} : L === 'custom' ? '' : (L === 'income' || L === 'cogs' || L === 'expenses') ? {label: L === 'expenses' ? (PL_EXP.filter(function (x) { return !arr.some(function (r) { return r.label === x; }); })[0] || 'Other') : '', amt: ''} : {name: ''}); persist(); renderForm(); refresh(); return; }
      if (a === 'rm') { var b2 = t.getAttribute('data-b'), L2 = t.getAttribute('data-list'); drafts[b2][L2].splice(+t.getAttribute('data-i'), 1); persist(); renderForm(); refresh(); return; }
      if (a === 'psearch') return psearch(t.getAttribute('data-b'), t.getAttribute('data-p') || '');
      if (a === 'ppick') return ppick(t.getAttribute('data-b'), t.getAttribute('data-p') || '', +t.getAttribute('data-i'));
      if (a === 'pfile') return pfile(t.getAttribute('data-b'), t.getAttribute('data-p') || '');
      if (a === 'pgoogle') { var s = drafts[t.getAttribute('data-b')], p = t.getAttribute('data-p') || ''; window.open('https://www.google.com/search?q=' + encodeURIComponent(addrOf(s, p)), '_blank', 'noopener'); return; }
      if (a === 'priceCalc') { drafts.addendum.priceManual = false; B.addendum.sync(drafts.addendum); persist(); renderForm(); refresh(); return; }
      if (a === 'overReset') { var ad = drafts.addendum; if (ad.over) delete ad.over[t.getAttribute('data-key')]; persist(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); B.addendum.wording(); refresh(); return; }
      if (a === 'concUse') return B.addendum.concUse();
      if (a === 'concLoan') return B.addendum.concLoan();
      if (a === 'estPreset' || a === 'estPresetAdd') { var ps = $('mtBpreset'); if (!ps || !ps.value) { if (ps) ps.focus(); return; } return B.estimate.preset(ps.value, a === 'estPresetAdd'); }
      if (a === 'estUse') { var c = B.estimate.calc(drafts.estimate); sendLoan([['reno.baseCost', c.sub + c.ohp + c.tax], ['reno.permits', c.permits]], 'Contractor estimate'); return; }
      if (a === 'leaseRent') { if (N(drafts.lease.rent)) sendLoan([['rental.mainUnit.gross', N(drafts.lease.rent)]], 'Lease'); return; }
      if (a === 'plUse') return plUse();
      if (/^cond/.test(a)) return condAct(a, t);
    });
    w.addEventListener('dragover', function (e) { var z = e.target.closest && e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
    w.addEventListener('dragleave', function (e) { var z = e.target.closest && e.target.closest('[data-drop]'); if (z) z.classList.remove('over'); });
    w.addEventListener('drop', function (e) { var z = e.target.closest && e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); z.classList.remove('over'); var fl = e.dataTransfer.files && e.dataTransfer.files[0]; if (fl) readInto(z.getAttribute('data-drop'), fl); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('mtB') && $('mtB').classList.contains('open')) close(); });
  }
  /* type straight onto the page: the preview holds still until editing is turned off; Print and PDF use the page as edited */
  var editing = false, editDirty = false;
  function pageEdit(on) {
    var was = editing; editing = !!on; var fr = $('mtBframe'), bt = document.querySelector('#mtB [data-a="pageEdit"]'), bar = $('mtBpe');
    try { fr.contentDocument.designMode = editing ? 'on' : 'off'; } catch (e) {}
    if (bt) { bt.setAttribute('aria-pressed', String(editing)); bt.textContent = editing ? 'Done editing page' : 'Edit on page'; }
    if (bar) bar.hidden = !editing;
    if (editing) { editDirty = false; try { fr.contentWindow.focus(); } catch (e) {} }
    else if (was && editDirty) { editDirty = false; refresh(true); }
  }
  function ensure(k) { if (!drafts[k]) { drafts[k] = B[k].init(); persist(); } else if (B[k].fix) B[k].fix(drafts[k]); }
  function condAct(a, t) {
    var s = drafts.commit, L = s.conditions;
    if (a === 'condAll') L.forEach(function (c) { c.on = true; });
    else if (a === 'condNone') L.forEach(function (c) { c.on = false; });
    else if (a === 'condBorrower') L.forEach(function (c) { c.on = !/^(Funder|Post\s*Closer|Approval|Disclosures|Escrow|Title|Closing\s*Agent)/i.test(c.cat) && !/^(Underwriter|Funder|UW\b|Reno\s*Funder|Processor)/i.test(c.text); });
    else if (a === 'condLib') COND_LIB.forEach(function (c) { if (!L.some(function (x) { return x.text === c[2]; })) L.push({id: uid(), group: c[0], cat: c[1], text: c[2], on: true, lib: true}); });
    else if (a === 'condAdd') L.push({id: uid(), group: t.getAttribute('data-g'), cat: '', text: '', on: true});
    else if (a === 'condDel') { var i = L.findIndex(function (c) { return c.id === t.getAttribute('data-id'); }); if (i >= 0) L.splice(i, 1); }
    else if (a === 'condReplace') { if (!s.findText) return; var re = new RegExp(s.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); L.forEach(function (c) { c.text = c.text.replace(re, s.replaceText || ''); c.cat = c.cat.replace(re, s.replaceText || ''); }); }
    persist(); renderForm(); refresh();
  }
  function sendLoan(pairs, from) {
    var st = store();
    if (st && st.setField) { pairs.forEach(function (p) { try { st.setField(p[0], p[1], from); } catch (e) {} }); say(from + ': ' + pairs.length + ' value(s) placed in the Loan Suite.'); return; }
    var q = []; try { q = JSON.parse(localStorage.getItem('mt.docs.queue.v1') || '[]'); } catch (e) {}
    pairs.forEach(function (p) { q.push({dest: 'loan:' + p[0], value: p[1], label: p[0], doc: from, at: Date.now()}); });
    try { localStorage.setItem('mt.docs.queue.v1', JSON.stringify(q)); } catch (e) {}
    say(from + ': placed when the Loan Suite opens.');
  }
  function plUse() {
    var s = drafts.pl, c = B.pl.calc(s), S = G('S');
    if (S && window.NQM && S.nonqm) { var P = S.nonqm.pl; P.revenue = c.inc; P.cogs = c.cogs; P.expenses = c.exp; P.months = c.months > 18 ? 24 : 12; P.own = N(s.own) || 100; P.from = longDate(s.from); P.to = longDate(s.to); P.use = true; S.nonqm.shown = S.nonqm.shown || {}; S.nonqm.shown.pl = true; try { window.RECALC(); NQM.render(); } catch (e) {} say('Profit and loss sent to Other Income > Non-QM.'); return; }
    var q = []; try { q = JSON.parse(localStorage.getItem('mt.docs.queue.v1') || '[]'); } catch (e) {}
    [['calc:nqm.pl.revenue', c.inc], ['calc:nqm.pl.cogs', c.cogs], ['calc:nqm.pl.expenses', c.exp]].forEach(function (p) { q.push({dest: p[0], value: p[1], label: p[0], doc: 'Profit and loss', at: Date.now()}); });
    try { localStorage.setItem('mt.docs.queue.v1', JSON.stringify(q)); } catch (e) {}
    say('Placed in the Income Calculator\'s Non-QM P&L when it opens.');
  }

  /* -------------------------------------------------- reading dropped files */
  function readText(fl) { if (window.MTDocs && MTDocs.readText) return MTDocs.readText(fl); return fl.text(); }
  var lastStatus = {};
  function status(id, html, cls) { lastStatus[id] = {html: html, cls: cls}; var el = $(id); if (el) { el.className = 'note ' + (cls || ''); el.innerHTML = html; } }
  function restoreStatus() { Object.keys(lastStatus).forEach(function (id) { var el = $(id), s = lastStatus[id]; if (el && !el.innerHTML) { el.className = 'note ' + (s.cls || ''); el.innerHTML = s.html; } }); }
  function splitNames(s) { return String(s || '').replace(/\(.*?\)/g, '').split(/\s*(?:,|&|\band\b|;)\s*/i).map(function (x) { return x.replace(/["“”]/g, '').trim(); }).filter(function (x) { return x && x.length > 2 && !/^(the|seller|buyer|purchaser)s?$/i.test(x); }).slice(0, 4); }
  function splitAddr(a) { a = String(a || '').replace(/\s+/g, ' ').trim(); var m = a.match(/^(.*?),\s*([^,]+?),?\s+([A-Z]{2}|[A-Za-z .]+?)\.?\s+(\d{5})/); return m ? {address: m[1].trim(), city: m[2].trim(), state: stateName(m[3].replace(/\./g, '')), zip: m[4]} : {address: a}; }
  function parseContract(t) {
    var T = String(t || '').replace(/\r/g, ''), o = {}, g = function (re) { var m = T.match(re); return m ? m[1].trim() : ''; };
    o.buyers = splitNames(g(/(?:^|\n)\s*(?:BUYERS?|PURCHASERS?)\s*(?:\(S\))?\s*[:\-]\s*([^\n]+)/i) || g(/and\s+([A-Z][^()\n]{3,80}?)\s*\(\s*["“]?(?:Purchaser|Buyer)/i));
    o.sellers = splitNames(g(/(?:^|\n)\s*SELLERS?\s*(?:\(S\))?\s*[:\-]\s*([^\n]+)/i) || g(/between\s+([A-Z][^()\n]{3,80}?)\s*\(\s*["“]?Seller/i));
    var ad = g(/(?:PREMISES|PROPERTY(?:\s*ADDRESS)?|known as|located at)\s*[:\-]?\s*([^\n]{6,120}?\d{5})/i); if (ad) o.addr = splitAddr(ad);
    var pr = T.match(/(?:purchase|sales?|contract)\s*price[^$]{0,70}?\$\s?([\d,]+(?:\.\d{1,2})?)(\s*K\b)?(?:[^$]{0,12}?\bto\s*\$\s?([\d,]+(?:\.\d{1,2})?))?/i);
    if (pr) { o.price = N(pr[1]) * (pr[2] ? 1000 : 1); if (pr[3]) o.newPrice = N(pr[3]); }
    o.concession = N(g(/seller(?:'s)?\s*(?:concession|credit|contribution)[^$]{0,60}?\$\s?([\d,]+(?:\.\d{2})?)/i) || g(/credit\s*(?:the\s*)?(?:Buyer|Purchaser)[^$]{0,60}?\$\s?([\d,]+(?:\.\d{2})?)/i) || g(/\$\s?([\d,]+(?:\.\d{2})?)\s*seller(?:'s)?\s*concession/i));
    o.emd = N(g(/(?:earnest\s*money|down\s*payment|deposit)[^$\n]{0,40}\$\s?([\d,]+(?:\.\d{2})?)/i));
    var d = g(/(?:dated|date of (?:this )?(?:contract|agreement)|made (?:this|on))\s*[:\-]?\s*([A-Z][a-z]+\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i); if (d) { var pd = parseDate(d.replace(/(\d)(st|nd|rd|th)/, '$1')); if (pd) o.date = iso(pd); }
    return o;
  }
  function parseLeaseDoc(t) {
    var T = String(t || ''), o = {}, g = function (re) { var m = T.match(re); return m ? m[1].trim() : ''; };
    o.landlord = g(/Landlord\s*(?:Name)?\s*[:\-]\s*([A-Z][A-Za-z .'-]{2,60}?)(?=\s+with|\s*\n|\s{2,})/); o.tenant = g(/Tenant\(?s?\)?\s*(?:Name\(?s?\)?)?\s*[:\-]\s*([A-Z][A-Za-z .'&,-]{2,80}?)(?=\s+with|\s*\n|\s{2,}|\s*\()/);
    var ad = g(/Property\s*Address\s*[:\-]?\s*([^\n]{6,120}?\d{5})/i); if (ad) o.addr = splitAddr(ad);
    var DT = '([A-Z][a-z]+\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})', tm = T.match(new RegExp('(?:from|commenc\\w*|beginning|starting)\\s*(?:on)?\\s*' + DT + '[\\s\\S]{0,40}?(?:through|to|until|ending(?:\\s*on)?)\\s*' + DT, 'i'));
    if (tm) { o.start = tm[1].replace(/(\d)(st|nd|rd|th)/, '$1'); o.end = tm[2].replace(/(\d)(st|nd|rd|th)/, '$1'); }
    o.rent = N(g(/(?:Monthly\s*Rent|rent\s*of)[^$\n]{0,20}\$\s?([\d,]+(?:\.\d{2})?)/i)); o.deposit = N(g(/Security\s*Deposit[^$\n]{0,20}\$\s?([\d,]+(?:\.\d{2})?)/i));
    return o;
  }
  /* a line that ends in an amount: "Kitchen cabinets and install ..... $12,450.00" */
  var AMT_LINE = /^(.{2,140}?)[\s.:_-]*\(?-?(\$\s?\d+(?:,\d{3})*(?:\.\d{2})?|\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})\)?\s*$/;
  function amtLines(T) { return String(T || '').replace(/\r/g, '').split('\n').map(function (l) { var m = l.trim().match(AMT_LINE); return m ? {label: m[1].replace(/[\s.:_$-]+$/, '').trim(), amt: N(m[2]) * (/\(\s*\$?\s?[\d,.]+\s*\)\s*$|-\$?\s?[\d,.]+\s*$/.test(l.trim()) ? -1 : 1), raw: l.trim()} : null; }).filter(function (x) { return x && x.label && /[A-Za-z]/.test(x.label); }); }
  var TRADE_WORDS = [['Kitchen', /kitchen|cabinet|counter/i], ['Bathroom', /bath|vanity|shower|tub|tile/i], ['Roofing', /roof|shingle/i], ['Electrical', /electri|wiring|panel|amp\b|fixture|lighting/i], ['Plumbing', /plumb|water heater|pipe|drain|faucet|toilet/i], ['HVAC', /hvac|furnace|boiler|heat|a\/c|air cond|duct/i],
    ['Windows and doors', /window|door/i], ['Flooring', /floor|carpet|lvp|hardwood|laminate/i], ['Painting', /paint|stain/i], ['Siding / exterior', /siding|soffit|fascia|exterior/i], ['Gutters and downspouts', /gutter|downspout/i], ['Masonry', /mason|brick|stucco|chimney|concrete/i], ['Foundation / structural', /foundation|structur|beam|joist|footing/i],
    ['Drywall / plaster', /drywall|sheetrock|plaster/i], ['Insulation', /insulat/i], ['Decks / porches', /deck|porch/i], ['Walks and driveways', /walk|driveway|asphalt/i], ['Landscaping / site work', /landscap|grading|site work|tree/i], ['Demolition and debris', /demo|debris|dumpster|haul/i], ['Permits and plans', /permit|plan|architect|engineer/i], ['Appliances', /appliance|range|refrigerator|dishwasher/i]];
  function tradeOf(t) { for (var i = 0; i < TRADE_WORDS.length; i++) if (TRADE_WORDS[i][1].test(t)) return TRADE_WORDS[i][0]; return 'Other'; }
  function grab(T, re) { var m = String(T || '').match(re); return m ? String(m[1]).trim() : ''; }
  function parseEstimate(text) {
    var T = String(text || '').replace(/\r/g, ''), o = {items: []}, top = T.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    o.company = (top.filter(function (l) { return !/estimate|proposal|quote|invoice|bid|date|phone|tel|email|@|www\.|lic|^\d|page \d/i.test(l) && /[A-Za-z]{3}/.test(l) && l.length < 60; })[0] || '');
    o.phone = grab(T, /(?:Phone|Tel|Ph|Cell|Office)?\.?:?\s*(\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/i); o.email = grab(T, /([\w.+-]+@[\w-]+\.[\w.-]+)/);
    o.license = grab(T, /Lic(?:ense)?\.?\s*(?:#|No\.?|Number)?\s*:?\s*([A-Z0-9][A-Z0-9-]{3,})/i); o.number = grab(T, /(?:Estimate|Proposal|Quote|Bid|Invoice)\s*(?:#|No\.?|Number)\s*:?\s*([A-Z0-9][A-Z0-9-]{1,})/i);
    o.date = grab(T, /\bDate\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|[A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4})/); o.customer = grab(T, /(?:Customer|Client|Bill\s*To|Owner|Prepared\s*For|Homeowner)\s*:?\s*([A-Z][^\n]{2,60})/);
    var ad = grab(T, /(?:Job\s*(?:Site|Address|Location)|Project\s*Address|Property|Site\s*Address|Location)\s*:?\s*([^\n]{6,120}?\d{5})/i); if (ad) o.addr = splitAddr(ad);
    var SKIP = /(sub\s*-?\s*total|^total|grand total|balance|deposit|amount due|tax|payment|paid|due|draw|contingency|overhead|profit|o\s*&\s*p|valid|phone|date|estimate\s*#|license)/i;
    amtLines(T).forEach(function (l) {
      if (/total/i.test(l.label) && !o.total && /^(grand\s*)?total|total\s*(estimate|price|cost|bid|amount)/i.test(l.label)) o.total = l.amt;
      if (/permit/i.test(l.label) && !/[a-z]{3,}.*and.*permit/i.test(l.label)) { o.permits = (o.permits || 0) + l.amt; return; }
      if (SKIP.test(l.label) || l.amt <= 0) return;
      var mat = /material|supplies|fixture|appliance/i.test(l.label) && !/labor|install/i.test(l.label);
      o.items.push({trade: tradeOf(l.label), desc: l.label, qty: '', unit: '', labor: mat ? '' : l.amt.toFixed(2), materials: mat ? l.amt.toFixed(2) : ''});
    });
    return o;
  }
  function parsePL(text) {
    var T = String(text || '').replace(/\r/g, ''), o = {income: [], cogs: [], expenses: []}, sec = 'income';
    var top = T.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    o.business = top.filter(function (l) { return !/profit|loss|p\s*&\s*l|income statement|statement|period|through|for the|page|^\d/i.test(l) && /[A-Za-z]{3}/.test(l) && l.length < 70; })[0] || '';
    var per = T.match(/(?:from|period|for the (?:period|year)[^\n]*?)\s*:?\s*([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:-|–|to|through|thru)\s*([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i) || T.match(/([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:-|–|to|through|thru)\s*([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (per) { o.from = per[1]; o.to = per[2]; } else { var yr = grab(T, /(?:year|12 months)\s*(?:ended|ending)\s*(?:December\s*31,?\s*)?(\d{4})/i); if (yr) { o.from = '1/1/' + yr; o.to = '12/31/' + yr; } }
    o.basis = /accrual/i.test(T) ? 'Accrual' : /cash basis/i.test(T) ? 'Cash' : '';
    T.split('\n').forEach(function (raw) {
      var l = raw.trim(); if (!l) return;
      if (/^(cost of (goods|sales)|cogs)\b/i.test(l) && !AMT_LINE.test(l)) { sec = 'cogs'; return; }
      if (/^(operating\s*)?expenses?\b|^(general|operating) (and|&) admin/i.test(l) && !AMT_LINE.test(l)) { sec = 'expenses'; return; }
      if (/^(income|revenue|sales)\b/i.test(l) && !AMT_LINE.test(l)) { sec = 'income'; return; }
      var m = l.match(AMT_LINE); if (!m) return; var lab = m[1].replace(/[\s.:_$-]+$/, '').trim(), amt = Math.abs(N(m[2]));
      if (!/[A-Za-z]/.test(lab) || /total|net (profit|income|loss)|gross profit|ordinary (business )?income/i.test(lab)) { if (/total\s*(cost of|cogs)/i.test(lab)) sec = 'expenses'; if (/total\s*(income|revenue|sales)/i.test(lab) && !o.income.length) o.income.push({label: 'Gross receipts / sales', amt: amt.toFixed(2)}); return; }
      if (sec === 'income' && /cost of (goods|sales)|cogs|purchases/i.test(lab)) { o.cogs.push({label: lab, amt: amt.toFixed(2)}); return; }
      o[sec].push({label: lab, amt: amt.toFixed(2)});
    });
    return o;
  }
  function parseMIdoc(text) {
    var T = String(text || '').replace(/\r/g, ''), o = {}, m$ = '\\$?\\s?([\\d,]+(?:\\.\\d{2})?)', g = function (re) { return grab(T, re); };
    o.price = g(new RegExp('(?:Sales|Purchase)\\s*Price\\s*:?\\s*' + m$, 'i')); o.value = g(new RegExp('(?:Appraised|As[- ]Is|Estimated\\s*Property)\\s*Value\\s*:?\\s*' + m$, 'i'));
    o.base = g(new RegExp('(?:Base\\s*Loan(?:\\s*Amount)?|Loan\\s*Amount)\\s*:?\\s*' + m$, 'i')); o.term = g(/(?:Loan\s*)?Term\s*:?\s*(\d{2})\s*(?:years|yrs|yr)/i) || (g(/Term\s*:?\s*(\d{3})\s*(?:months|mos)/i) ? String(N(g(/Term\s*:?\s*(\d{3})\s*(?:months|mos)/i)) / 12) : '');
    o.miRate = g(/Annual\s*(?:MIP|PMI|MI|Mortgage\s*Insurance(?:\s*Premium)?)\s*(?:Rate|Factor)?\s*:?\s*([\d.]+)\s*%/i) || g(/(?<!UF|Up[- ]?front\s?)\b(?:MIP|PMI|MI|Mortgage\s*Insurance)\s*(?:Rate|Factor|Premium\s*Rate)?\s*:?\s*([\d.]+)\s*%/i); o.ufmip = g(/(?:UFMIP|Up[- ]?front\s*(?:MIP|Mortgage\s*Insurance\s*Premium))\s*(?:Rate)?\s*:?\s*([\d.]+)\s*%/i);
    o.down = g(/Down\s*Payment\s*(?:\(%\))?\s*:?\s*([\d.]+)\s*%/i); o.program = /\bFHA\b|203\s*\(?k/i.test(T) ? 'FHA' : /\bVA\b/.test(T) ? 'VA' : /conventional|fannie|freddie|homestyle|PMI/i.test(T) ? 'Conventional' : '';
    o.renoCost = g(new RegExp('(?:Total\\s*)?(?:Repair|Renovation|Rehab(?:ilitation)?|Construction|Contractor)\\s*(?:Costs?|Budget|Bid|Amount)\\s*:?\\s*' + m$, 'i')); o.contingency = g(/Contingency\s*(?:Reserve)?\s*(?:\(%\))?\s*:?\s*([\d.]+)\s*%/i);
    o.draws = g(/(?:Number\s*of\s*)?(?:Draws|Inspections)\s*:?\s*(\d{1,2})\b/i); o.feePerDraw = g(new RegExp('(?:Inspection|Draw)\\s*Fee\\s*(?:per\\s*(?:draw|inspection))?\\s*:?\\s*' + m$, 'i'));
    o.titlePerDraw = g(new RegExp('Title\\s*Update\\s*(?:Fee)?\\s*(?:per\\s*draw)?\\s*:?\\s*' + m$, 'i')); o.consultant = g(new RegExp('Consultant\\s*Fee\\s*:?\\s*' + m$, 'i')); o.permits = g(new RegExp('Permits?\\s*(?:and\\s*Fees)?\\s*:?\\s*' + m$, 'i'));
    o.architect = g(new RegExp('(?:Architect|Engineer)\\w*\\s*(?:Fees?)?\\s*:?\\s*' + m$, 'i')); o.payment = g(new RegExp('(?:Total\\s*)?Monthly\\s*Payment\\s*:?\\s*' + m$, 'i'));
    if (/203\s*\(?k/i.test(T)) o.renoProgram = '203k'; else if (/homestyle/i.test(T)) o.renoProgram = 'homestyle';
    return o;
  }
  var SID = {contract: 'mtBcontract', leasefile: 'mtBleasefile', approval: 'mtBapproval', estfile: 'mtBestfile', plfile: 'mtBplfile', mifile: 'mtBmifile'};
  function readInto(kind, fl) {
    var sid = SID[kind] || 'mtB' + kind;
    status(sid, 'Reading ' + esc(fl.name) + '… scanned pages use OCR and can take a minute.');
    readText(fl).then(function (text) {
      if (!String(text || '').trim()) { status(sid, 'No text could be read from ' + esc(fl.name) + ' - try a clearer scan or photo.', 'warn'); return; }
      var done = function (got, what) { persist(); pageEdit(false); renderForm(); refresh(true); status(sid, got.length ? 'Read from ' + esc(fl.name) + ': ' + esc(got.join(', ')) + '. Check each against the ' + what + '.' : 'Nothing recognisable was found in ' + esc(fl.name) + ' - fill the form by hand.', got.length ? 'ok' : 'warn'); };
      if (kind === 'contract') {
        var o = parseContract(text), s = drafts.addendum, got = [];
        if (o.buyers.length) { s.buyers = o.buyers.map(function (n) { return {name: n}; }); got.push(o.buyers.length + ' buyer(s)'); }
        if (o.sellers.length) { s.sellers = o.sellers.map(function (n) { return {name: n, by: ''}; }); got.push(o.sellers.length + ' seller(s)'); }
        if (o.addr) { s.address = o.addr.address; s.addrFree = ''; if (o.addr.city) { s.city = o.addr.city; s.state = o.addr.state; s.zip = o.addr.zip; } got.push('address'); }
        if (o.price) { s.fromPrice = o.price; if (o.newPrice) { s.toPrice = o.newPrice.toFixed(2); s.priceManual = true; s.doPrice = true; } else s.priceManual = false; got.push('price ' + usd(o.price) + (o.newPrice ? ' to ' + usd(o.newPrice) : '')); }
        if (o.concession) { s.concAmt = o.concession; s.concDrv = 'amt'; got.push('concession ' + usd(o.concession)); }
        if (o.emd) { s.emd = o.emd; got.push('deposit ' + usd(o.emd)); }
        if (o.date) { s.contractDate = dateFromPicker(o.date); got.push('contract date'); }
        B.addendum.sync(s); done(got, 'contract');
      } else if (kind === 'leasefile') {
        var L = parseLeaseDoc(text), s2 = drafts.lease, g2 = [];
        if (L.landlord) { s2.landlords = [{name: L.landlord, mail: ''}]; g2.push('landlord'); } if (L.tenant) { s2.tenants = splitNames(L.tenant).map(function (n) { return {name: n, mail: ''}; }); g2.push('tenant(s)'); }
        if (L.addr) { s2.address = L.addr.address; s2.addrFree = ''; if (L.addr.city) { s2.city = L.addr.city; s2.state = L.addr.state; s2.zip = L.addr.zip; } g2.push('address'); }
        if (L.start) { s2.start = L.start; g2.push('start date'); } if (L.end) { s2.end = L.end; s2.leaseType = 'fixed'; g2.push('end date'); }
        if (L.rent) { s2.rent = L.rent; g2.push('rent ' + usd(L.rent)); } if (L.deposit) { s2.deposit = L.deposit; s2.depOn = true; g2.push('deposit'); }
        done(g2, 'lease');
      } else if (kind === 'estfile') {
        var E = parseEstimate(text), s3 = drafts.estimate, g3 = [];
        ['company', 'phone', 'email', 'license', 'number', 'customer'].forEach(function (k) { if (E[k]) { s3[k] = E[k]; g3.push(k === 'number' ? 'estimate #' : k); } });
        if (E.date) { s3.date = E.date; g3.push('date'); }
        if (E.addr) { s3.address = E.addr.address; s3.addrFree = ''; if (E.addr.city) { s3.city = E.addr.city; s3.state = E.addr.state; s3.zip = E.addr.zip; } g3.push('job site'); }
        if (E.items.length) { s3.items = E.items; s3.ohp = '0'; s3.contingency = '0'; s3.tax = '0'; s3.permits = ''; g3.push(E.items.length + ' priced line(s)'); }
        if (E.permits) { s3.permits = E.permits.toFixed(2); g3.push('permits'); }
        var sum = B.estimate.calc(s3).total; if (E.total) g3.push('bid total ' + usd(E.total) + (Math.abs(E.total - sum) > 1 ? ' (lines add to ' + usd(sum) + ' - check for tax or fees)' : ' (matches the lines)'));
        done(g3, 'bid');
      } else if (kind === 'plfile') {
        var P = parsePL(text), s4 = drafts.pl, g4 = [];
        if (P.business) { s4.business = P.business; g4.push('business name'); } if (P.from) { s4.from = P.from; s4.to = P.to; g4.push('period'); } if (P.basis) s4.basis = P.basis;
        ['income', 'cogs', 'expenses'].forEach(function (k) { if (P[k].length) { s4[k] = P[k]; g4.push(P[k].length + ' ' + (k === 'cogs' ? 'cost' : k === 'income' ? 'income' : 'expense') + ' line(s)'); } });
        done(g4, 'statement');
      } else if (kind === 'mifile') {
        var M = parseMIdoc(text), s5 = drafts.mi, g5 = [];
        [['program', 'program'], ['price', 'price'], ['value', 'value'], ['base', 'loan amount'], ['term', 'term', 'termYears'], ['miRate', 'MI rate'], ['ufmip', 'UFMIP'], ['down', 'down payment', 'downPct'], ['renoCost', 'renovation cost'], ['contingency', 'contingency'], ['draws', 'draws'], ['feePerDraw', 'inspection fee'], ['titlePerDraw', 'title update fee'], ['consultant', 'consultant fee'], ['permits', 'permits'], ['architect', 'architect'], ['payment', 'payment'], ['renoProgram', 'renovation program']].forEach(function (r) {
          if (M[r[0]]) { s5[r[2] || r[0]] = /^(program|renoProgram)$/.test(r[0]) ? M[r[0]] : String(M[r[0]]).replace(/,/g, ''); g5.push(r[1]); } });
        if (M.renoCost) s5.renoOn = true;
        done(g5, 'document');
      } else {
        var o2 = applyApproval(parseApproval(text)); persist(); pageEdit(false); renderForm(); refresh(true);
        var on = o2.conds.filter(function (c) { return c.on; }).length;
        status(sid, o2.conds.length || o2.amount ? 'Read from ' + esc(fl.name) + ': ' + (o2.amount ? 'loan ' + usd(o2.amount) + ', ' : '') + (o2.b1 ? esc(joinNames([o2.b1, o2.b2])) + ', ' : '') + o2.conds.length + ' conditions (' + on + ' kept; lender-internal items such as funder and disclosure tasks are unticked). Review each before printing.' : 'No approval terms were recognised in ' + esc(fl.name) + '.', o2.conds.length ? 'ok' : 'warn');
      }
    }).catch(function (e) { status(sid, 'Could not read the file: ' + esc(e && e.message || e), 'bad'); });
  }

  /* ---------------------------------------------------------- PDF and opening */
  /* the Loan Suite pages define an AMD loader; UMD libraries would register with it instead of as globals, so hide it while they load */
  function loadScript(src) { return new Promise(function (res) { var d = window.define; window.define = undefined; var s = document.createElement('script'); s.src = src; var done = function (ok) { window.define = d; res(ok); }; s.onload = function () { done(true); }; s.onerror = function () { done(false); }; document.head.appendChild(s); }); }
  async function pdf() {
    var btn = document.querySelector('#mtB [data-a="pdf"]'); if (btn) { btn.textContent = 'Building PDF…'; btn.disabled = true; }
    try {
      if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      if (!(window.jspdf && window.jspdf.jsPDF) && !window.jsPDF) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      var J = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF; if (!window.html2canvas || !J) throw new Error('The PDF tools could not be loaded - use Print and choose Save as PDF.');
      var doc = $('mtBframe').contentDocument, pgs = Array.prototype.slice.call(doc.querySelectorAll('.pg')), out = new J({unit: 'pt', format: 'letter'}), W = 612, H = 792, first = true;
      for (var i = 0; i < pgs.length; i++) {
        var cv = await html2canvas(pgs[i], {scale: 2, backgroundColor: '#ffffff', logging: false, windowWidth: 816}), ph = Math.round(cv.width * H / W);
        for (var y = 0; y < cv.height - 4; y += ph) {
          var sl = document.createElement('canvas'); sl.width = cv.width; sl.height = Math.min(ph, cv.height - y); sl.getContext('2d').fillStyle = '#fff'; sl.getContext('2d').fillRect(0, 0, sl.width, sl.height); sl.getContext('2d').drawImage(cv, 0, y, cv.width, sl.height, 0, 0, cv.width, sl.height);
          if (!first) out.addPage(); first = false; out.addImage(sl.toDataURL('image/jpeg', .92), 'JPEG', 0, 0, W, sl.height * W / cv.width);
        }
      }
      var nm = (B[cur].label + ' ' + (names((drafts[cur].buyers || drafts[cur].borrowers || drafts[cur].tenants || []))[0] || '') + ' ' + iso()).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
      out.save(nm + '.pdf');
    } catch (e) { alert(e && e.message || e); }
    if (btn) { btn.textContent = 'Download PDF'; btn.disabled = false; }
  }
  var lastFocus = null;
  function open(type) {
    mount(); if (type && B[type]) cur = type; ensure(cur);
    lastFocus = document.activeElement; $('mtB').classList.add('open'); document.documentElement.style.overflow = 'hidden';
    renderNav(); renderForm(); refresh(true);
    var c = document.querySelector('#mtB [data-a="close"]'); if (c) c.focus();
  }
  function close() { var w = $('mtB'); if (!w) return; w.classList.remove('open'); document.documentElement.style.overflow = ''; if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} }

  /* ------------------------------------------------------------ entry points */
  function hooks() {
    /* the Loan Suite's own Addendum and Lease buttons open the new builders; the older forms stay one click away there */
    if (window.V14 && V14.open && !V14.open.__mtb) {
      var o = V14.open, w = function (id) { if (id === 'v14AddModal' && !w.classic) return open('addendum'); if (id === 'v14LeaseModal' && !w.classic) return open('lease'); return o.apply(this, arguments); };
      w.__mtb = true; V14.__mtbOrig = o; V14.open = w;
    }
    /* a Build button on the Income Calculator's Documents tab and the Loan Suite's Documents pages */
    ['panel-docs', 'v50UnifiedDocuments'].forEach(function (id) {
      var host = $(id); if (!host || host.querySelector('.mt-build-entry')) return;
      var d = document.createElement('div'); d.className = 'mt-build-entry no-print';
      d.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin:0 0 14px;padding:12px 14px;border-radius:12px;border:1px solid rgba(90,162,255,.45);background:rgba(90,162,255,.08)';
      d.innerHTML = '<div><b style="font-size:14px">Document builder</b><div style="font-size:12.5px;opacity:.8">Addendum, lease, contractor estimate, profit and loss, commitment letter, MI and renovation fees, pay statement.</div></div><div style="display:flex;flex-wrap:wrap;gap:6px">' +
        ORDER.map(function (k) { return '<button type="button" class="btn btn-light btn-sm" data-mtb="' + k + '" style="cursor:pointer">' + B[k].label + '</button>'; }).join('') + '</div>';
      d.addEventListener('click', function (e) { var b = e.target.closest('[data-mtb]'); if (b) open(b.getAttribute('data-mtb')); });
      var head = host.querySelector(':scope > .section-head, :scope > header'); head && head.nextSibling ? host.insertBefore(d, head.nextSibling) : host.insertBefore(d, host.firstChild);
    });
  }
  setInterval(hooks, 1500); setTimeout(hooks, 400);
  window.MTBuild = {open: open, close: close, builders: B, drafts: function () { return drafts; }, parseApproval: parseApproval, parseContract: parseContract, file: file, transferTax: transferTax};
})();
