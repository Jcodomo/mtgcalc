/* Mortgage Suite 56.6 - Document Builder (Income Calculator, Full Suite and the Loan Suite pages).
   Builds, previews, prints and saves as PDF: contract addenda (five styles, up to 4 buyers and 4 sellers, a seller-concession
   and transfer-tax calculator, 203(k) / HomeStyle / FHA / VA clauses, a contract dropped in to fill the parties), residential
   leases (four styles), contractor estimates, profit and loss statements, commitment letters (filled from a lender's
   conditional approval read with OCR, with each condition kept or dropped) and a mortgage insurance & renovation fee
   worksheet. Every builder starts from the loan file on this browser and keeps its own draft. Nothing leaves the browser
   except a property search the user starts (OpenStreetMap / Google). */
(function () {
  'use strict';
  if (window.MTBuild && !window.MTBuild.__lazy) return;          /* v57: the lazy stand-in (mt-build-lazy.js) gives way to the real builder */
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
  /* Relative dates (56.7): Today, Tomorrow, Yesterday, "30 days ago", "3 months back", "in 2 weeks", "2 years from now",
     "+30d" / "-3m" / "+1y", "next month", "last year", "end of month", "end of next month", "first of next month".
     They become a fixed date when the box is left, so a document dated "Today" does not change tomorrow. */
  var NUMW = {a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, eighteen: 18, twenty: 20, thirty: 30, sixty: 60, ninety: 90};
  function shiftDate(d, n, unit) {
    var r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (/^d/.test(unit)) r.setDate(r.getDate() + n);
    else if (/^w/.test(unit)) r.setDate(r.getDate() + 7 * n);
    else { var months = /^y/.test(unit) ? 12 * n : n, day = r.getDate(); r.setDate(1); r.setMonth(r.getMonth() + months); var last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate(); r.setDate(Math.min(day, last)); }
    return r;
  }
  function relDate(text) {
    var t = String(text || '').trim().toLowerCase().replace(/\s+/g, ' '); if (!t) return null;
    var today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (/^(today|now)$/.test(t)) return today;
    if (t === 'tomorrow') return shiftDate(today, 1, 'd');
    if (t === 'yesterday') return shiftDate(today, -1, 'd');
    var m = t.match(/^([+-])\s*(\d+)\s*(d|w|m|y|days?|weeks?|months?|years?|mos?|yrs?)?$/);
    if (m) return shiftDate(today, (m[1] === '-' ? -1 : 1) * +m[2], m[3] ? m[3].replace(/^mo.*/, 'm') : 'd');
    var n = '(\\d+|' + Object.keys(NUMW).join('|') + ')', u = '(days?|weeks?|months?|years?|yrs?|mos?)';
    var toN = function (x) { return /^\d+$/.test(x) ? +x : NUMW[x]; }, unitOf = function (x) { return x.replace(/^mo.*/, 'm').replace(/^yr.*/, 'y'); };
    m = t.match(new RegExp('^' + n + ' ' + u + ' (ago|back|before( today)?|prior|earlier|previous)$')); if (m) return shiftDate(today, -toN(m[1]), unitOf(m[2]));
    m = t.match(new RegExp('^(?:in |plus )?' + n + ' ' + u + '(?: (from now|from today|later|ahead|out|after|hence))?$')); if (m && (/^in |^plus /.test(t) || m[3])) return shiftDate(today, toN(m[1]), unitOf(m[2]));
    m = t.match(/^(next|last|this) (week|month|year)$/); if (m) return m[1] === 'this' ? today : shiftDate(today, m[1] === 'next' ? 1 : -1, m[2]);
    m = t.match(/^(end|first|start|beginning) of (?:the )?(this |next |last )?(month|year)$/);
    if (m) { var base = m[2] && m[2].trim() !== 'this' ? shiftDate(today, m[2].trim() === 'next' ? 1 : -1, m[3]) : today;
      if (m[3] === 'year') return /end/.test(m[1]) ? new Date(base.getFullYear(), 11, 31) : new Date(base.getFullYear(), 0, 1);
      return /end/.test(m[1]) ? new Date(base.getFullYear(), base.getMonth() + 1, 0) : new Date(base.getFullYear(), base.getMonth(), 1); }
    return null;
  }
  function parseDate(s) { if (!s) return null; s = String(s).trim(); var rel = relDate(s); if (rel) return rel; var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/); if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[1] - 1, +m[2]);
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
    var st = fileSource ? {activeInputs: fileSource.inputs, cachedOutputs: fileSource.outputs, outputsFor: function () { return null; }} : store();
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
    '#mtB .fitbar{display:flex;gap:12px;align-items:center;padding:6px 12px;font-size:12px;background:#0b2350;color:#cfe0f7;border-bottom:1px solid #123058}#mtB .fitbar{flex-wrap:wrap}#mtB .fitbar label{display:flex;gap:6px;align-items:center;font-weight:600;white-space:nowrap;cursor:pointer}#mtB .fitbar select{width:auto;padding:3px 6px;font-size:12px;border-radius:6px}#mtB .fitbar input{accent-color:#5aa2ff}#mtB .fitbar.warn{background:#3a2a06;color:#f6d79a}',
    '#mtB .mb-top{position:relative;flex-wrap:wrap}#mtB .fillfrom select{all:unset;margin-left:6px;max-width:180px;font-weight:600;color:#9fc4ff;cursor:pointer}#mtB .fillfrom select option{color:#04122b}',
    '#mtB .vmenu{position:absolute;right:14px;top:52px;z-index:5;min-width:330px;background:#0a1b38;border:1px solid #2b5590;border-radius:10px;box-shadow:0 14px 34px rgba(0,0,0,.45);padding:6px}#mtB .vmenu button{all:unset;box-sizing:border-box;display:block;width:100%;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12.5px}#mtB .vmenu button:hover,#mtB .vmenu button:focus-visible{background:#123a75}#mtB .vmenu small{display:block;color:#9db0c8}#mtB .vmenu p{margin:4px 10px 6px;font-size:11.5px;color:#9db0c8}',
    '#mtB .secr{border-bottom:1px solid #142d52;padding:4px 0}#mtB .secr.off .ck span{opacity:.5;text-decoration:line-through}#mtB .sece{padding:6px 0 6px 26px}',
    '@media print{#mtB{display:none!important}}'
  ].join('\n');

  function field(b, k, label, opt) {
    opt = opt || {}; var s = drafts[b], v = s[k] == null ? '' : s[k], t = opt.type || 'text', cls = 'f' + (opt.wide ? ' w' : '');
    var a = ' data-b="' + b + '" data-k="' + k + '"' + (opt.addr != null ? ' data-addr="' + opt.addr + '"' : '') + (opt.addrLine ? ' data-addr-line="1"' : '') + (opt.addrPair ? ' data-addr-pair="' + opt.addrPair + '"' : '');
    if (t === 'select') return '<label class="' + cls + '">' + label + '<select' + a + '>' + opt.options.map(function (o) { o = Array.isArray(o) ? o : [o, o]; return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    if (t === 'textarea') return '<label class="' + cls + '">' + label + '<textarea' + a + ' rows="' + (opt.rows || 3) + '" placeholder="' + esc(opt.ph || '') + '">' + esc(v) + '</textarea></label>';
    if (t === 'check') return '<label class="ck' + (opt.wide ? ' w' : '') + '"><input type="checkbox"' + a + (v ? ' checked' : '') + '><span>' + label + '</span></label>';
    /* dates: typed freely, with a calendar button that fills the box */
    if (t === 'date') return '<label class="' + cls + '">' + label + '<span class="dtw"><input type="text" data-fdate="1"' + a + ' value="' + esc(v) + '" placeholder="' + esc(opt.ph || '3/15/2026, Today, 30 days ago, in 1 year…') + '" title="Type a date, or Today, Tomorrow, 30 days ago, 3 months back, in 2 weeks, +30d, end of month" autocomplete="off">' +
      '<button type="button" class="pkb" data-a="pick" aria-label="Pick ' + esc(label) + ' from a calendar" title="Calendar"><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M4 1h1.5v1.5h5V1H12v1.5h1.5A1.5 1.5 0 0 1 15 4v9.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5V4a1.5 1.5 0 0 1 1.5-1.5H4zM2.5 6v7.5h11V6z"/></svg></button><input type="date" class="pk" tabindex="-1" aria-hidden="true"></span></label>';
    /* open lists: pick a suggestion or type anything */
    var list = opt.list ? ' list="mtBdl-' + b + '-' + k + '"' : '', dl = opt.list ? '<datalist id="mtBdl-' + b + '-' + k + '">' + opt.list.map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>' : '';
    return '<label class="' + cls + '">' + label + '<input type="text"' + (t === 'money' || t === 'num' || t === 'pct' ? ' inputmode="decimal"' : '') + list + a + ' value="' + esc(v) + '" placeholder="' + esc(opt.ph || (opt.list ? 'Pick or type' : '')) + '" autocomplete="off">' + dl + '</label>';
  }
  function dateFromPicker(isoStr) { var d = parseDate(isoStr); return d ? (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() : ''; }
  function dropZone(kind, title, desc) { return '<div class="drop" data-drop="' + kind + '"><div><b>' + title + '</b><div class="note" style="margin:2px 0 0">' + desc + ' Scanned pages, photos, pasted screenshots and pasted text are read with OCR - press Ctrl+V (Cmd+V) to paste. Windows: Win+Shift+S to snip, then Ctrl+V.</div></div><div class="row" style="flex-wrap:wrap;justify-content:flex-end"><button type="button" class="btn" data-mtpaste title="Paste a screenshot from the clipboard">Paste screenshot</button><button type="button" class="btn" data-mtpastetray title="Gather several screenshots and pasted text, then read them together">Paste text / several</button><label class="btn">Choose file<input type="file" accept=".pdf,image/*,.txt" data-a="' + kind + '"></label></div></div><div id="mtB' + kind + '" class="note"></div>'; }
  function people(b, k, label, max, opt) {
    opt = opt || {}; var arr = drafts[b][k] = drafts[b][k] || ['']; var h = '<fieldset><legend>' + label + ' (up to ' + max + ')</legend>';
    arr.forEach(function (p, i) {
      var o = typeof p === 'object' ? p : {name: p};
      if (opt.checks && i > 0) h += '<div style="border-top:1px solid #142d52;margin:2px 0 8px"></div>';
      h += '<div class="g" style="margin-bottom:6px"><label class="f">' + label.replace(/s$|\(s\)$/, '') + ' ' + (i + 1) + '<input data-b="' + b + '" data-list="' + k + '" data-i="' + i + '" data-f="name" value="' + esc(o.name || '') + '"></label>' +
        (opt.extra ? '<label class="f">' + opt.extra[1] + '<input data-b="' + b + '" data-list="' + k + '" data-i="' + i + '" data-f="' + opt.extra[0] + '"' + (opt.extra[0] === 'mail' ? ' data-addr-line="1"' : '') + (o.subj || o.noAddr ? ' disabled' : '') + ' value="' + esc(o.subj ? 'Same as the premises' : o.noAddr ? 'Left off the lease' : o[opt.extra[0]] || '') + '" placeholder="' + esc(opt.extra[2] || '') + '"></label>' : '<div class="row" style="align-items:end">' + (arr.length > 1 ? '<button type="button" class="x" data-a="rm" data-b="' + b + '" data-list="' + k + '" data-i="' + i + '" aria-label="Remove">Remove</button>' : '') + '</div>') + '</div>';
      if (opt.checks) h += '<div class="row" style="margin:-2px 0 8px;gap:14px">' + opt.checks.map(function (c) { return '<label class="ck"><input type="checkbox" data-b="' + b + '" data-list="' + k + '" data-i="' + i + '" data-f="' + c[0] + '"' + (o[c[0]] ? ' checked' : '') + '><span>' + c[1] + '</span></label>'; }).join('') + '</div>';
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
    ['purchase', 'Addendum to Purchase Agreement - headings and signature table'], ['fillin', 'Addendum to Real Estate Purchase and Sale Agreement - fill-in form'], ['letter', 'Formal addendum - letterhead with recitals'],
    ['rider', 'Rider to Contract of Sale - initials beside each paragraph'], ['table', 'Contract amendment - modern table of changes']];
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
      if (st === 'rider') {
        var ri = T.map(function (t) { return t.t; }); if (s.remain) ri.push(s.remainText || 'Except as modified by this Rider, all terms of the Contract remain in full force and effect. If this Rider and the Contract conflict, this Rider controls.');
        var sn = sellers.map(function (p) { return p.name; });
        var rows2 = Math.max(bl.length, sellers.length, 1), st2 = '';
        for (var r = 0; r < rows2; r++) st2 += '<tr><td>' + (bl[r] ? '<div class="sl"></div>' + esc(bl[r].name) + ', Purchaser' : '') + '</td><td>' + (sellers[r] ? '<div class="sl"></div>' + esc(sellers[r].name) + (sellers[r].by ? '<br>By: ' + esc(sellers[r].by) : '') + ', Seller' : '') + '</td></tr>';
        return page('tnr', '<h1 class="b">' + esc(s.title || 'RIDER TO CONTRACT OF SALE') + '</h1><p class="ctr">' + esc(addr) + '</p>' +
          '<p>' + esc(s.leadText || 'This Rider is made a part of the Contract of Sale' + (s.contractDate ? ' dated ' + when(s.contractDate) : '') + ' between ' + (joinNames(sn) || '__________') + ', as Seller, and ' + (joinNames(buyers) || '__________') + ', as Purchaser, for the premises above. The parties agree as follows:') + '</p>' +
          '<table class="rd">' + ri.map(function (x, i) { return '<tr><td class="no">R-' + (i + 1) + '.</td><td>' + esc(x) + '</td><td class="ini"><i></i>Purchaser<i></i>Seller</td></tr>'; }).join('') + '</table>' +
          '<table class="rs">' + st2 + '</table><p>Dated: ' + esc(when(s.date)) + '</p>', CSS_ADD_RIDER);
      }
      if (st === 'table') {
        var box = function (role, p) { return '<div class="sb"><div class="sbl">' + role + '</div><div class="sbn">' + esc(p.name || '') + (p.by ? ' - by ' + esc(p.by) : '') + '</div><div class="sbs"></div><div class="sbd">Signature &nbsp; &middot; &nbsp; Date</div></div>'; };
        return page('ari', '<div class="tbh"><div class="tbt">' + esc(s.title || 'CONTRACT AMENDMENT') + '</div><div class="tbn">' + (s.number ? 'No. ' + esc(s.number) + '<br>' : '') + esc(when(s.date)) + '</div></div>' +
          '<table class="kv2"><tr><th>Buyer' + (buyers.length > 1 ? 's' : '') + '</th><td>' + esc(joinNames(buyers)) + '</td></tr><tr><th>Seller' + (sellers.length > 1 ? 's' : '') + '</th><td>' + esc(sellers.map(function (p) { return p.name + (p.by ? ' (by ' + p.by + ')' : ''); }).join(', ')) + '</td></tr><tr><th>Property</th><td>' + esc(addr) + '</td></tr>' + (s.contractDate ? '<tr><th>Contract dated</th><td>' + esc(when(s.contractDate)) + '</td></tr>' : '') + '</table>' +
          '<p>' + esc(s.leadText || 'The parties to the contract identified above agree to the following changes:') + '</p>' +
          '<table class="chg"><thead><tr><th>#</th><th>Item</th><th>Agreed change</th></tr></thead><tbody>' + (T.map(function (t, i) { return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(t.h) + '</b></td><td>' + esc(t.t) + '</td></tr>'; }).join('') || '<tr><td colspan="3">Tick a change in the form</td></tr>') + '</tbody></table>' +
          (s.remain ? '<p class="rm">' + esc(s.remainText || 'All other terms and conditions of the contract remain unchanged and in full force and effect.') + '</p>' : '') +
          '<div class="sgg">' + bl.map(function (p) { return box('Buyer', p); }).join('') + sellers.map(function (p) { return box('Seller', p); }).join('') + '</div>', CSS_ADD_TABLE);
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
  CSS_PAGE += '.lg{display:block;max-width:2.8in;object-fit:contain}.lgc{text-align:center;margin:0 0 8px}.lgc .lg{margin:0 auto}.lgrow{display:flex;gap:12px;align-items:center}.fitw{transform-origin:0 0;display:flow-root}.pg.fitted{height:11in;min-height:0;overflow:hidden}.pg.paged{min-height:11in}.pgno{position:absolute;font:7.5pt Arial,Helvetica,sans-serif;color:#666;letter-spacing:.02em}.pg.fitc{padding:.45in .55in!important}.pg.fitc .hd.m{margin:-.45in -.55in 14px}';
  var CSS_ADD_MASTER = '.sigs.two{display:grid;grid-template-columns:1fr 1fr;gap:.35in;margin-top:.2in}.sigs.two .sig{width:auto;margin:0 0 .22in}.sigs.two .sig .sl{width:100%}.sigs.two .sig .dt{position:static;display:block;margin-top:2px}' + 'h1.u{text-align:center;font-weight:400;font-size:12pt;text-decoration:underline;margin:.6in 0 .3in}.ari h1.u{text-decoration:none}table.hdr{border-collapse:collapse;margin:0 0 .25in .1in}table.hdr td{padding:5px 10px 9px 0;vertical-align:top}.ari table.hdr td:first-child u{text-decoration:none}' +
    'p.lead{margin:.15in 0 .2in}p.term{margin:0 0 .15in}.ari p.lead,.ari p.term{text-align:center;font-size:9.5pt}.sigs{margin-top:.25in}.sig{position:relative;margin:0 0 .28in .1in;width:6.4in}.sig .sl{border-bottom:1px solid #000;width:4.1in;height:22px}.sig .dt{position:absolute;left:4.25in;top:4px}.sig .dt i{display:inline-block;width:1.1in;border-bottom:1px solid #000}.sig .sn{margin-top:2px}.sig .pn{font-size:9pt;color:#333}';
  var CSS_ADD_NUM = '.sig2.two{display:grid;grid-template-columns:1fr 1fr;gap:.1in .35in;margin-top:.45in}.sig2.two .r{width:auto;margin-bottom:.3in}.sig2.two .sl{width:2.2in}' + 'h1.b{text-align:center;font-size:12.5pt;margin:.4in 0 .3in}table.hdr{border-collapse:collapse;margin-bottom:.25in}table.hdr td{padding:1px 10px 1px 0;vertical-align:top}table.hdr td:first-child{font-weight:700}p,li{line-height:1.35}ol{padding-left:.25in}li{margin:0 0 .12in;padding-left:4px}.sig2{margin-top:.7in}.sig2 .r{display:flex;justify-content:space-between;width:5.2in;margin-bottom:.45in}.sig2 .sl{border-bottom:1px solid #000;width:3.1in;height:18px;margin-bottom:2px}';
  var CSS_ADD_PURCHASE = 'h1.big{text-align:center;font-size:18pt;margin:.3in 0 .45in}p{line-height:1.35;margin:0 0 .13in}table.st{width:100%;border-collapse:collapse;margin-top:.45in}table.st th,table.st td{border:1px solid #000;text-align:left;font-weight:400;padding:4px 6px;vertical-align:bottom;width:50%}table.st .sl{border-bottom:1px solid #000;width:2.4in;height:22px;margin-bottom:2px}';
  var CSS_ADD_FILL = 'h1.bu{text-align:center;font-size:13pt;text-decoration:underline;margin:.2in 0 .35in}p.ind{text-indent:.6in;line-height:1.6}.fl{border-bottom:1px solid #000;padding:0 6px;font-family:Arial,sans-serif;font-size:10.5pt}.big{font-family:Arial,sans-serif;font-size:19pt;line-height:1.25;margin:.3in 0 .5in .45in;min-height:2in}.r2{display:flex;align-items:flex-end;gap:10px;margin:.18in 0}.sl2{display:inline-block;width:3in;border-bottom:1px solid #000;min-height:18px;font-family:Arial,sans-serif;font-size:10pt}.sl3{display:inline-block;width:2.1in;border-bottom:1px solid #000;margin-left:6px}';
  var CSS_ADD_RIDER = 'h1.b{text-align:center;font-size:13pt;margin:.25in 0 .05in;letter-spacing:.04em}p.ctr{text-align:center;margin:0 0 .2in;font-size:11pt}p{line-height:1.4}table.rd{width:100%;border-collapse:collapse;margin:.1in 0 .25in}table.rd td{vertical-align:top;padding:7px 6px 10px;border-bottom:1px solid #bbb;line-height:1.35}table.rd td.no{width:.5in;font-weight:700}table.rd td.ini{width:1in;font-size:7.5pt;text-align:center;color:#333}table.rd td.ini i{display:block;border-bottom:1px solid #000;height:15px;margin:2px 0}table.rs{width:100%;border-collapse:collapse;margin-top:.15in}table.rs td{width:50%;padding:0 12px 22px 0;vertical-align:bottom;font-size:10.5pt}table.rs .sl{border-bottom:1px solid #000;height:24px;margin-bottom:2px}';
  var CSS_ADD_TABLE = '.tbh{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1f3a5f;padding-bottom:6px;margin-bottom:12px}.tbt{font-size:17pt;font-weight:700;color:#1f3a5f;letter-spacing:.04em}.tbn{text-align:right;font-size:9.5pt;color:#444}table.kv2{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10pt}table.kv2 th{width:1.4in;text-align:left;background:#e8eef6;color:#1f3a5f;padding:5px 8px;border:1px solid #c5d3e4}table.kv2 td{padding:5px 8px;border:1px solid #c5d3e4}p{font-size:10.5pt;line-height:1.4}' +
    'table.chg{width:100%;border-collapse:collapse;font-size:10pt;margin:6px 0 10px}table.chg th{background:#1f3a5f;color:#fff;text-align:left;padding:5px 8px}table.chg td{padding:6px 8px;border-bottom:1px solid #d5dde8;vertical-align:top;line-height:1.35}table.chg td:first-child{width:.3in;text-align:center;color:#666}table.chg td:nth-child(2){width:1.6in}p.rm{font-style:italic;color:#333}' +
    '.sgg{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:.25in}.sb{border:1px solid #c5d3e4;border-radius:4px;padding:6px 10px}.sbl{font-size:7.5pt;text-transform:uppercase;letter-spacing:.06em;color:#1f3a5f;font-weight:700}.sbn{font-size:10pt;margin-top:2px}.sbs{border-bottom:1px solid #000;height:26px}.sbd{font-size:7.5pt;color:#666;margin-top:2px}';
  var CSS_ADD_LETTER = '.lh{text-align:right;font-size:9.5pt;color:#555;border-bottom:2px solid #1f3a5f;padding-bottom:6px;margin-bottom:.3in}h1{font-size:15pt;text-align:center;letter-spacing:.06em;color:#1f3a5f;margin:0 0 .3in}p,li{line-height:1.45;margin:0 0 .12in}ol{padding-left:.3in}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:.4in;margin-top:.5in}.grid2 .sl{border-bottom:1px solid #000;height:30px;margin:.12in 0 2px}.grid2 .d{font-size:9.5pt;color:#444}';
  function page(font, body, css, extra) { return '<!doctype html><html><head><meta charset="utf-8"><title>Document</title><style>' + CSS_PAGE + (css || '') + (extra || '') + '</style></head><body><div class="pg ' + font + '"><div class="fitw">' + body + '</div></div></body></html>'; }
  function pages(font, list, css) { return '<!doctype html><html><head><meta charset="utf-8"><title>Document</title><style>' + CSS_PAGE + (css || '') + '</style></head><body>' + list.map(function (b) { return '<div class="pg ' + font + '"><div class="fitw">' + b + '</div></div>'; }).join('') + '</body></html>'; }

  /* ==================================================================== LEASE */
  /* 56.7: every lease layout is a list of sections. Each section can be left out, renamed or reworded, and your own sections can
     be added. No layout names a state: deposit and governing-law wording refers to the law where the premises is located. */
  var LEASE_STYLES = [['standard', 'Lease agreement - six sections (I-VI)'], ['detailed', 'Residential lease - detailed clauses'], ['clauses', 'Residential lease - numbered clauses, tenant initials on each page'], ['checklist', 'Residential lease - check-one options, deposit receipt, notary'], ['monthly', 'Month-to-month rental agreement'], ['unit', 'Accessory unit / room rental agreement'], ['short', 'Short-form lease - one page, numbered paragraphs'], ['modern', 'Modern lease - key terms table and clauses']];
  var LEASE_MORE = {docTitle: '', descr: '', llPhone: '', llEmail: '', holdover: 'mtm', payMethod: '', payTo: '', earlyDate: '', proRent: '', depDue: 'when this lease is signed', depReturn: '30', nsfFee: '', inspect: true, furnished: false, furnItems: '',
    parkOn: false, parkSpaces: '', parkFee: '', petsOn: false, petMax: '', petTypes: '', petLbs: '', petDeposit: '', smokeArea: '', saleDays: '', entryHours: '24', guestLimit: 'fourteen (14) days in any six-month period', pre1978: '', witness: false,
    agentName: '', agentAddr: '', agentPhone: '', agentEmail: '', bankName: '', bankAddr: '', depInterest: '', showDays: '30', holdRent: '', holdNotice: '30', cureDays: '7', rentDays: '3', initials: true, secs: {}, secAdd: []};
  function leaseMore() { return JSON.parse(JSON.stringify(LEASE_MORE)); }
  function box(on) { return on ? '&#9746;' : '&#9744;'; }
  function lsNamed(list) { return (list || []).map(function (p) { return typeof p === 'object' && p ? p : {name: p || ''}; }).filter(function (p) { return p.name; }); }
  function lsRoman(n) { var r = ''; [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].forEach(function (p) { while (n >= p[0]) { r += p[1]; n -= p[0]; } }); return r; }
  /* a blank to fill in by hand, or the value when there is one */
  function lsFv(v, w) { return v != null && String(v).trim() !== '' ? '<span class="fv">' + esc(v) + '</span>' : '<span class="fl" style="min-width:' + (w || 1.3) + 'in"></span>'; }
  function lsCk(on, text) { return '<p class="ck">' + box(on) + ' ' + text + '</p>'; }
  function lsSl(label) { return '<div class="sgl"><div><div class="l"></div><div class="sgr">' + label + '</div></div><div><div class="l"></div><div class="sgr">Date</div></div></div>'; }
  /* words that are filled in when they appear in your own wording */
  function leaseTokens(s) {
    var ll = lsNamed(s.landlords).map(function (p) { return p.name; }), tt = lsNamed(s.tenants).map(function (p) { return p.name; });
    return {landlord: ll.join(' and ') || '________', tenant: tt.join(', ') || '________', address: addrOf(s) + (s.unit ? ', ' + s.unit : ''), county: s.county || '', date: when(s.date), start: when(s.start), end: when(s.end),
      rent: N(s.rent) ? usd(s.rent) : '$________', deposit: N(s.deposit) ? usd(s.deposit) : '$________', due: s.dueDay || '1st', latefee: N(s.lateFee) ? usd(s.lateFee) : '$0.00', grace: s.graceDays || '5', notice: s.noticeDays || '30', utilities: s.utilities || 'none'};
  }
  function fillTokens(t, s) { var T = leaseTokens(s); return String(t || '').replace(/\{(\w+)\}/g, function (m, k) { k = k.toLowerCase(); return T[k] != null ? T[k] : m; }); }
  function textBlocks(t) { var ps = String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); return {lead: esc(ps[0] || ''), html: ps.slice(1).map(function (p) { return '<p class="ind">' + esc(p) + '</p>'; }).join('')}; }
  /* the printed text of a section, for the wording box */
  function plainOf(h) {
    return String(h || '').replace(/<span class="fl"[^>]*><\/span>/g, '________').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|tr|div|h\d)>/gi, '\n').replace(/<\/t[dh]>/gi, '  ')
      .replace(/&#9746;/g, '[X]').replace(/&#9744;/g, '[ ]').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
  }
  function leaseCfg(s) { var st = s.style || 'standard', S = s.secs = s.secs || {}, c = S[st] = S[st] || {}; c.off = c.off || {}; c.h = c.h || {}; c.tx = c.tx || {}; return c; }
  function secOff(cfg, x) { return cfg.off[x.k] === true || (cfg.off[x.k] == null && !!x.defOff); }
  /* the sections that print: switched-off ones dropped, headings and wording replaced where edited, your own sections added before the signatures */
  function leaseSecs(s, raw) {
    var cfg = leaseCfg(s), out = [];
    raw.forEach(function (x) {
      if (secOff(cfg, x)) return;
      var o = {k: x.k, h: cfg.h[x.k] ? cfg.h[x.k] : x.h, lead: x.lead || '', html: x.html || '', num: x.num !== false, special: x.special, tail: !!x.tail};
      if (cfg.tx[x.k] != null) { var tb = textBlocks(fillTokens(cfg.tx[x.k], s)); o.lead = tb.lead; o.html = tb.html; o.special = /^sig/.test(x.special || '') ? x.special : null; }
      out.push(o);
    });
    var at = out.length; for (var i = 0; i < out.length; i++) if (out[i].tail) { at = i; break; }
    var add = (s.secAdd || []).filter(function (c) { return c && (c.h || c.t); }).map(function (c, i) { var tb = textBlocks(fillTokens(c.t, s)); return {k: 'add' + i, h: c.h || '', lead: tb.lead, html: tb.html, num: true}; });
    return out.slice(0, at).concat(add, out.slice(at));
  }
  /* the Sections box in the form */
  var secOpen = {};
  function leaseSecForm(s) {
    var raw = B.lease.sections(s), cfg = leaseCfg(s), st = s.style || 'standard';
    var h = '<fieldset><legend>Sections - leave out, rename, reword or add</legend><p class="note" style="margin:0 0 8px">Untick a section to leave it out of the lease. <b>Edit</b> opens its heading and wording; reworded sections stop following the fields above until you put the standard wording back. In your own wording, {rent}, {deposit}, {start}, {end}, {tenant}, {landlord}, {address}, {due}, {latefee}, {grace} and {notice} are filled in for you.</p>' +
      '<div class="row" style="gap:6px;margin:0 0 8px"><button type="button" class="btn" data-a="secAll" data-v="1">Include every section</button><button type="button" class="btn" data-a="secAll" data-v="0">Leave every section out</button><button type="button" class="btn" data-a="secReset">Standard wording for all</button></div><div class="secs">';
    raw.forEach(function (x) {
      var on = !secOff(cfg, x), ed = cfg.tx[x.k] != null, id = st + ':' + x.k, open = !!secOpen[id];
      h += '<div class="secr' + (on ? '' : ' off') + '"><div class="row" style="flex-wrap:nowrap;gap:8px"><label class="ck" style="flex:1"><input type="checkbox" data-b="lease" data-sec="' + esc(x.k) + '" data-sf="on"' + (on ? ' checked' : '') + '><span>' + esc(cfg.h[x.k] || x.h) + (ed ? ' <small>(reworded)</small>' : cfg.h[x.k] ? ' <small>(renamed)</small>' : '') + '</span></label>' +
        '<button type="button" class="x" data-a="secEdit" data-k="' + esc(x.k) + '" aria-expanded="' + open + '">' + (open ? 'Done' : 'Edit') + '</button></div>' +
        '<div class="sece"' + (open ? '' : ' hidden') + '><label class="f w">Heading<input data-b="lease" data-sec="' + esc(x.k) + '" data-sf="h" value="' + esc(cfg.h[x.k] || '') + '" placeholder="' + esc(x.h) + '" autocomplete="off"></label>' +
        (x.noEdit ? '<p class="note">This part is laid out from the fields above; leave it out with the tick box if you do not want it.</p>' : '<label class="f w">Wording<textarea data-b="lease" data-sec="' + esc(x.k) + '" data-sf="tx" rows="6">' + esc(ed ? cfg.tx[x.k] : plainOf((x.lead ? '<p>' + x.lead + '</p>' : '') + (x.html || ''))) + '</textarea></label>' +
        '<div class="row"><button type="button" class="btn" data-a="secResetOne" data-k="' + esc(x.k) + '"' + (ed || cfg.h[x.k] ? '' : ' disabled') + '>Put back the standard heading and wording</button></div>') + '</div></div>';
    });
    h += '</div><div class="list" style="margin-top:10px">' + (s.secAdd || []).map(function (c, i) {
      var a = function (f) { return ' data-b="lease" data-list="secAdd" data-i="' + i + '" data-f="' + f + '"'; };
      return '<div class="it"><div class="hd"><input' + a('h') + ' value="' + esc(c.h || '') + '" style="flex:1;font-weight:700" placeholder="Heading of your section" aria-label="Heading of your section" autocomplete="off"><button type="button" class="x" data-a="rm" data-b="lease" data-list="secAdd" data-i="' + i + '">Remove</button></div>' +
        '<textarea' + a('t') + ' rows="3" style="margin-top:6px" placeholder="Wording - each line is a paragraph" aria-label="Wording of your section">' + esc(c.t || '') + '</textarea></div>';
    }).join('') + '</div><button type="button" class="btn" data-a="add" data-b="lease" data-list="secAdd">+ Add your own section</button></fieldset>';
    return h;
  }
  function leaseMoreForm(s) {
    var b = 'lease', ck = s.style === 'checklist', f = function (k, l, o) { return field(b, k, l, o); };
    return '<fieldset><legend>More lease terms</legend><div class="g">' +
      f('holdover', 'When the term ends', {type: 'select', options: [['mtm', 'Tenant may stay month to month'], ['vacate', 'Tenant must move out']]}) + f('depDue', 'Deposit due', {list: ['when this lease is signed', 'before move-in']}) + f('depReturn', 'Deposit returned within (days after move-out)') +
      (ck ? f('llPhone', 'Landlord phone') + f('llEmail', 'Landlord email') + f('descr', 'Property description (optional)', {wide: 1}) + f('payMethod', 'How rent is paid', {wide: 1, list: ['Check or money order', 'Bank transfer (ACH)', 'Zelle', 'Online portal']}) + f('payTo', 'Payable to / remit address', {wide: 1}) +
        f('earlyDate', 'Early possession on', {type: 'date', ph: 'Blank = none'}) + f('proRent', 'Prorated rent for early possession', {type: 'money'}) + f('nsfFee', 'Returned payment fee ($)', {type: 'money', ph: 'Blank = none'}) +
        f('inspect', 'Joint move-in inspection with a signed checklist', {type: 'check', wide: 1}) + f('furnished', 'Furnished', {type: 'check'}) + f('furnItems', 'Furnishings included') + f('parkOn', 'Parking provided', {type: 'check'}) + f('parkSpaces', 'Parking spaces') + f('parkFee', 'Parking fee a month ($)', {type: 'money', ph: 'Blank = included in rent'}) : '') +
      f('petsOn', 'Pets allowed', {type: 'check'}) + (ck ? f('petMax', 'Most pets allowed') + f('petTypes', 'Pet types allowed') : f('petLbs', 'Each pet under (pounds)')) + f('petDeposit', 'Pet deposit ($)', {type: 'money'}) +
      (ck ? f('smokeArea', 'Smoking allowed only in', {wide: 1, ph: 'Blank = no smoking anywhere'}) + f('saleDays', 'If the property is sold, the new owner may end the lease on (days\' notice)', {wide: 1, ph: 'Blank = a sale does not end the lease'}) +
        f('entryHours', 'Notice before the landlord enters (hours)') + f('guestLimit', 'Guests may stay up to') + f('pre1978', 'Built before 1978 (lead paint)', {type: 'select', options: [['', 'Not stated'], ['yes', 'Yes - disclosure attached'], ['no', 'No - built 1978 or later']]}) + f('witness', 'Witness lines under the signatures', {type: 'check'}) +
        f('agentName', 'Landlord\'s agent for notices') + f('agentPhone', 'Agent phone') + f('agentAddr', 'Agent address', {wide: 1}) + f('agentEmail', 'Agent email') + f('bankName', 'Deposit held at (bank)') + f('depInterest', 'Deposit account', {type: 'select', options: [['', 'Not stated'], ['no', 'Not interest-bearing'], ['yes', 'Interest-bearing']]}) + f('bankAddr', 'Bank address', {wide: 1})
        : f('showDays', 'Landlord may show the premises in the last (days)') + f('holdRent', 'Month-to-month rent after the term ($)', {type: 'money', ph: 'Blank = same rent'}) + f('holdNotice', 'Notice to end a month-to-month stay (days)') + f('cureDays', 'Days to fix a lease violation after notice') + f('rentDays', 'Days late before rent is in default') + f('initials', 'Tenant initials line on every page', {type: 'check', wide: 1})) +
      '</div></fieldset>';
  }
  B.lease = {
    label: 'Lease agreement', sub: 'Eight styles, every section editable',
    init: function () {
      var f = file(), o = {style: 'standard', termLen: '12', date: iso(), landlords: [{name: '', mail: ''}], tenants: [{name: '', mail: ''}], address: f.address, city: f.city, state: stateName(f.state), zip: f.zip, county: f.county, unit: '',
        residence: 'House', residenceOther: '', beds: '', baths: '', leaseType: 'fixed', start: iso(), end: addDays(iso(), 364), noticeDays: '30',
        rent: '', dueDay: '1st', depOn: true, deposit: '', lastOn: false, last: '', otherOn: false, other: '', utilities: '', additional: '',
        lateFee: '50', graceDays: '5', pets: 'No pets without the Landlord\'s written consent.', occupants: '', parking: '', shared: 'Kitchen, laundry and yard are shared with the occupants of the main dwelling.'}, m = leaseMore();
      for (var k in m) o[k] = m[k];
      return o;
    },
    fix: function (s) { var m = leaseMore(); for (var k in m) if (s[k] === undefined) s[k] = m[k]; },
    form: function () {
      var b = 'lease', s = drafts[b], st = s.style || 'standard', older = st === 'detailed' || st === 'unit' || st === 'short' || st === 'modern';
      return dropZone('leasefile', 'Drop an existing lease', 'Reads the landlord, tenants, address, term dates, rent and deposit.') +
        '<fieldset><legend>Document</legend><div class="g">' + field(b, 'style', 'Style', {type: 'select', options: LEASE_STYLES, wide: 1}) + field(b, 'date', 'Agreement date', {type: 'date'}) + field(b, 'docTitle', 'Title (blank = the style\'s title)', {ph: B.lease.title(s)}) + '</div></fieldset>' +
        people(b, 'landlords', 'Landlords', 2, {extra: ['mail', 'Mailing address', 'Street, city, state ZIP']}) + people(b, 'tenants', 'Tenants', 4, {extra: ['mail', 'Mailing address', 'Street, city, state ZIP'], checks: [['subj', 'Address is the subject property'], ['noAddr', 'Leave the address off']]}) + propertyBlock(b) +
        '<fieldset><legend>Premises</legend><div class="g">' + field(b, 'unit', 'Unit / apartment') + field(b, 'residence', 'Residence type', {list: ['Apartment', 'House', 'Condo', 'Two-family house', 'Townhouse', 'Basement apartment', 'Room']}) +
        (s.residence === 'Other' ? field(b, 'residenceOther', 'Describe') : '') + field(b, 'beds', 'Bedrooms') + field(b, 'baths', 'Bathrooms') + '</div></fieldset>' +
        '<fieldset><legend>Term</legend><div class="g">' + field(b, 'leaseType', 'Lease type', {type: 'select', options: [['fixed', 'Fixed term'], ['monthly', 'Month-to-month']]}) +
        field(b, 'start', 'Starts', {type: 'date'}) + (s.leaseType === 'fixed' ? field(b, 'termLen', 'Term', {type: 'select', options: [['12', '1 year (12 months)'], ['6', '6 months'], ['18', '18 months'], ['24', '2 years'], ['36', '3 years'], ['custom', 'Custom - enter the end date']]}) + field(b, 'end', 'Ends', {type: 'date', ph: 'Set from the term'}) : '') + field(b, 'noticeDays', 'Notice to end a month-to-month tenancy (days)') + '</div></fieldset>' +
        '<fieldset><legend>Payment</legend><div class="g">' + field(b, 'rent', 'Monthly rent', {type: 'money'}) + field(b, 'dueDay', 'Due on the', {list: ['1st', '5th', '10th', '15th', 'last']}) + field(b, 'depOn', 'Security deposit', {type: 'check'}) + field(b, 'deposit', 'Deposit amount', {type: 'money'}) +
        field(b, 'lastOn', 'Last month\'s rent at signing', {type: 'check'}) + field(b, 'last', 'Last month amount', {type: 'money'}) + field(b, 'otherOn', 'Other charge', {type: 'check'}) + field(b, 'other', 'Describe') + '</div></fieldset>' +
        '<fieldset><legend>Utilities and terms</legend><div class="g">' + field(b, 'utilities', st === 'checklist' ? 'Utilities the landlord pays (tenant pays the rest)' : 'Tenant pays all utilities except', {wide: 1, ph: 'Gas, electric', list: ['None', 'Water and sewer', 'Gas and electric', 'Heat and hot water', 'Water, sewer and trash']}) + field(b, 'additional', 'Additional terms', {type: 'textarea', wide: 1, rows: 2}) +
        (st !== 'standard' && st !== 'monthly' ? field(b, 'lateFee', 'Late fee ($)', {type: 'money', ph: 'Blank = none'}) + field(b, 'graceDays', 'Grace period (days)') + field(b, 'occupants', st === 'clauses' || st === 'checklist' ? 'Other occupants (household members)' : 'Maximum occupants') : '') +
        (older ? field(b, 'parking', 'Parking') + field(b, 'pets', 'Pets', {wide: 1}) : '') + (st === 'unit' || st === 'modern' ? field(b, 'shared', 'Shared areas', {type: 'textarea', wide: 1, rows: 2}) : '') + '</div></fieldset>' +
        (st === 'clauses' || st === 'checklist' ? leaseMoreForm(s) : '') + leaseSecForm(s) +
        '<div class="row"><button type="button" class="btn" data-a="leaseRent">Send the rent to the Loan Suite rental</button></div>';
    },
    title: function (s) {
      var st = s.style || 'standard', monthly = s.leaseType === 'monthly';
      return st === 'monthly' ? 'MONTH-TO-MONTH RENTAL AGREEMENT' : st === 'unit' ? 'ACCESSORY UNIT RENTAL AGREEMENT' : st === 'detailed' ? 'RESIDENTIAL LEASE AGREEMENT' : st === 'standard' ? 'LEASE AGREEMENT' :
        st === 'short' ? (monthly ? 'MONTH-TO-MONTH RENTAL AGREEMENT' : 'RESIDENTIAL LEASE') : monthly ? 'Month-to-Month Rental Agreement' : 'Residential Lease Agreement';
    },
    /* the sections of the chosen style, before anything is left out or reworded */
    sections: function (s) {
      var st = s.style || 'standard';
      if (st === 'short' || st === 'modern') return B.lease.secs2(s);
      if (st === 'clauses') return B.lease.secsClauses(s);
      if (st === 'checklist') return B.lease.secsCheck(s);
      var ll = lsNamed(s.landlords), tt = lsNamed(s.tenants), addr = addrOf(s) + (s.unit ? ', ' + s.unit : ''), monthly = st === 'monthly' || s.leaseType === 'monthly';
      var u = function (v, w) { return '<span class="fl" style="min-width:' + (w || 1.4) + 'in">' + esc(v || '') + '</span>'; };
      var party = function (role, list, tag) { return (list.length ? list : [{}]).map(function (p) { return '<p class="ind2"><u>' + role + '</u>: ' + u(p.name, 1.8) + (p.noAddr ? '' : ' with a mailing address of ' + u(p.subj ? addrOf(s) : p.mail, 3.2)) + ' (' + tag + ')' + '</p>'; }).join(''); };
      var L = [];
      L.push({k: 'parties', h: 'THE PARTIES', lead: 'This ' + (st === 'monthly' ? 'Rental' : 'Lease') + ' Agreement ("Agreement") is made on ' + u(longDate(s.date), 1.8) + ' between:', html: party('Landlord', ll, '"Landlord"') + '<p class="ind2">and</p>' + party('Tenant(s)', tt, '"Tenant"')});
      L.push({k: 'premises', h: 'PREMISES', lead: 'The Landlord rents to the Tenant, in exchange for the payments below, the following property:',
        html: '<p class="ind">a.) <u>Property Address</u>: ' + u(addr, 4) + '.</p><p class="ind">b.) <u>Residence Type</u>: ' + ['Apartment', 'House', 'Condo'].map(function (t) { return box(s.residence === t) + ' ' + t; }).join(' &nbsp;') + ' &nbsp;' + box(!!s.residence && ['Apartment', 'House', 'Condo'].indexOf(s.residence) < 0) + ' Other: ' + u(s.residence === 'Other' ? s.residenceOther : ['Apartment', 'House', 'Condo'].indexOf(s.residence) < 0 ? s.residence : '', 1.3) + '</p>' +
        '<p class="ind">c.) <u>Bedroom(s)</u>: ' + u(s.beds, .5) + ' &nbsp;<u>Bathroom(s)</u>: ' + u(s.baths, .5) + '</p>'});
      L.push({k: 'type', h: 'LEASE TYPE', lead: 'This Agreement is a: (check one)',
        html: '<p class="ind2">' + box(!monthly) + ' - <u>Fixed Lease</u>. The Tenant may occupy the Premises from ' + u(!monthly ? longDate(s.start) : '', 1.6) + ' through ' + u(!monthly ? longDate(s.end) : '', 1.6) + ' (the "Lease Term"). Before the Lease Term ends the Landlord and Tenant will discuss renewal; if no renewal is agreed, the Tenant must vacate the Premises at the end of the Lease Term.</p>' +
        '<p class="ind2">' + box(monthly) + ' - <u>Month-to-Month Lease</u>. The Tenant may occupy the Premises on a month-to-month basis starting ' + u(monthly ? longDate(s.start) : '', 1.6) + ', ending when either party gives ' + u(monthly ? s.noticeDays : '', .5) + ' days\' written notice (the "Lease Term").</p>'});
      L.push({k: 'payment', h: 'PAYMENT TERMS', lead: 'During the Lease Term the Tenant agrees to pay: (check all that apply)',
        html: '<p class="ind2">' + box(!!N(s.rent)) + ' - <u>Monthly Rent</u>. ' + u(N(s.rent) ? usd(s.rent) : '', 1.4) + ' due on the ' + u(s.dueDay, .5) + ' day of each month.</p>' +
        '<p class="ind2">' + box(s.depOn) + ' - <u>Security Deposit</u>. ' + u(s.depOn && N(s.deposit) ? usd(s.deposit) : '', 1.4) + ' due when this Agreement is signed.</p>' +
        '<p class="ind2">' + box(s.lastOn) + ' - <u>Last Month\'s Rent</u>. ' + u(s.lastOn && N(s.last) ? usd(s.last) : '', 1.4) + ' due when this Agreement is signed.</p>' +
        '<p class="ind2">' + box(s.otherOn) + ' - <u>Other</u>. ' + u(s.otherOn ? s.other : '', 3) + '.</p>'});
      L.push({k: 'utilities', h: 'UTILITIES', lead: 'The Tenant is responsible for all utilities and services to the Premises except: ' + u(s.utilities || 'None', 3.5) + '.'});
      if (st === 'detailed' || st === 'unit') {
        L.push({k: 'late', h: 'LATE CHARGES', lead: N(s.lateFee) ? 'Rent not received within ' + esc(s.graceDays || '5') + ' days of its due date carries a late charge of ' + usd(s.lateFee) + ', where permitted by law.' : 'No late charge applies.'});
        L.push({k: 'use', h: 'USE AND OCCUPANCY', lead: 'The Premises are to be used only as a private residence' + (s.occupants ? ' by no more than ' + esc(s.occupants) + ' occupants' : '') + '. The Tenant will not sublet or assign this Agreement without the Landlord\'s written consent.' + (s.parking ? ' Parking: ' + esc(s.parking) + '.' : '')});
        L.push({k: 'pets', h: 'PETS', lead: esc(s.pets || 'No pets without the Landlord\'s written consent.')});
        if (st === 'unit') L.push({k: 'shared', h: 'SHARED AREAS', lead: esc(s.shared || '')});
        L.push({k: 'maint', h: 'MAINTENANCE AND REPAIRS', lead: 'The Tenant will keep the Premises clean and in good condition and will promptly report needed repairs. The Landlord will make repairs needed to keep the Premises safe and habitable, except damage caused by the Tenant or the Tenant\'s guests.'});
        L.push({k: 'entry', h: 'ENTRY', lead: 'The Landlord may enter the Premises at reasonable times, with reasonable notice as required by law, to inspect, repair or show the Premises, and at any time in an emergency.'});
        L.push({k: 'depret', h: 'SECURITY DEPOSIT RETURN', lead: 'The security deposit, less any lawful deductions for unpaid rent or damage beyond normal wear and tear, will be returned within the time required by the law where the Premises is located.'});
        L.push({k: 'law', h: 'GOVERNING LAW', lead: 'This Agreement is governed by the laws of the state where the Premises is located.'});
      }
      L.push({k: 'additional', h: 'ADDITIONAL TERMS', lead: u(s.additional || (st === 'standard' ? '' : 'None'), 4) + '.'});
      L.push({k: 'sig', h: 'Signatures', special: 'sig', tail: true, noEdit: true, num: false});
      return L;
    },
    doc: function (s) {
      var st = s.style || 'standard';
      if (st === 'short' || st === 'modern') return B.lease.doc2(s);
      if (st === 'clauses') return B.lease.docClauses(s);
      if (st === 'checklist') return B.lease.docCheck(s);
      var ll = lsNamed(s.landlords), tt = lsNamed(s.tenants), n = 0;
      var u = function (v, w) { return '<span class="fl" style="min-width:' + (w || 1.4) + 'in">' + esc(v || '') + '</span>'; };
      var body = leaseSecs(s, B.lease.sections(s)).map(function (x) {
        if (x.special === 'sig') {
          var rowsN = Math.max(ll.length, tt.length, 1), sig = '<table class="sg">';
          for (var i = 0; i < rowsN; i++) { var L = ll[i] || {}, T = tt[i] || {};
            sig += '<tr><td>' + (L.name || i === 0 ? 'Landlord\'s Signature: <span class="bl"></span><br>Print Name: ' + u(L.name, 1.6) : '') + '</td><td>' + (T.name || i === 0 ? 'Tenant\'s Signature: <span class="bl"></span><br>Print Name: ' + u(T.name, 1.6) : '') + '</td></tr>'; }
          return sig + '</table>';
        }
        if (!x.h) return '<p class="sh">' + x.lead + '</p>' + x.html;
        return '<p class="sh"><b>' + lsRoman(++n) + '. ' + esc(x.h) + '.</b> ' + x.lead + '</p>' + x.html;
      }).join('');
      return page('ari', '<h1>' + esc(s.docTitle || B.lease.title(s)) + '</h1>' + body, CSS_LEASE);
    }
  };
  /* short-form and modern leases share one set of clauses */
  B.lease.secs2 = function (s) {
    var ll = lsNamed(s.landlords), tt = lsNamed(s.tenants), addr = addrOf(s) + (s.unit ? ', ' + s.unit : ''), monthly = s.leaseType === 'monthly';
    var term = monthly ? 'month to month starting ' + when(s.start) + ', ending on ' + (s.noticeDays || 30) + ' days\' written notice from either party' : 'from ' + when(s.start) + ' through ' + when(s.end);
    var kind = s.residence === 'Other' ? s.residenceOther : s.residence;
    var C = [['premises', 'Premises', 'Landlord rents to Tenant the ' + (kind ? String(kind).toLowerCase() : 'residence') + ' at ' + addr + (s.beds || s.baths ? ' (' + [s.beds ? s.beds + ' bedroom' + (s.beds == 1 ? '' : 's') : '', s.baths ? s.baths + ' bath' + (s.baths == 1 ? '' : 's') : ''].filter(Boolean).join(', ') + ')' : '') + '.'],
      ['term', 'Term', 'The lease runs ' + term + '.'],
      ['rent', 'Rent', 'Tenant will pay ' + (N(s.rent) ? usd(s.rent) : '$________') + ' a month, due on the ' + (s.dueDay || '1st') + ' of each month' + (N(s.lateFee) ? '. Rent not received within ' + (s.graceDays || 5) + ' days of the due date carries a late charge of ' + usd(s.lateFee) + ', where permitted by law' : '') + '.'],
      ['deposit', 'Deposit', (s.depOn && N(s.deposit) ? 'Tenant will pay a security deposit of ' + usd(s.deposit) + ' when this lease is signed' : 'No security deposit is required') + (s.lastOn && N(s.last) ? ', plus last month\'s rent of ' + usd(s.last) : '') + '. The deposit, less lawful deductions for unpaid rent or damage beyond normal wear and tear, is returned within the time the law where the premises is located requires.' + (s.otherOn && s.other ? ' Also due at signing: ' + s.other + '.' : '')],
      ['utilities', 'Utilities', 'Tenant pays all utilities and services except: ' + (s.utilities || 'none') + '.'],
      ['use', 'Use and occupancy', 'The premises are a private residence only' + (s.occupants ? ', for no more than ' + s.occupants + ' occupants' : '') + '. Tenant will not sublet or assign without Landlord\'s written consent.' + (s.parking ? ' Parking: ' + s.parking + '.' : '')],
      ['pets', 'Pets', s.pets || 'No pets without the Landlord\'s written consent.']];
    if (s.style === 'modern' && s.shared && /room|unit|basement|accessory/i.test(kind || '')) C.push(['shared', 'Shared areas', s.shared]);
    C.push(['maint', 'Maintenance', 'Tenant keeps the premises clean and reports needed repairs promptly; Landlord keeps the premises safe and habitable, except damage caused by Tenant or Tenant\'s guests.'],
      ['entry', 'Entry', 'Landlord may enter at reasonable times with the notice the law requires, and at any time in an emergency.'],
      ['law', 'Governing law', 'This lease is governed by the laws of the state where the premises is located.'],
      ['additional', 'Additional terms', s.additional || 'None.']);
    var who = function (list) { return list.map(function (p) { var m = p.noAddr ? '' : p.subj ? addrOf(s) : p.mail; return esc(p.name) + (m ? ' <span class="ml">(' + esc(m) + ')</span>' : ''); }).join('<br>') || '________________'; };
    var L = [];
    if (s.style === 'short') L.push({k: 'intro', h: 'Opening', num: false, lead: 'This lease is made on ' + esc(when(s.date)) + ' between ' + (ll.map(function (p) { return esc(p.name); }).join(' and ') || '________________') + ' ("Landlord") and ' + (tt.map(function (p) { return esc(p.name); }).join(', ') || '________________') + ' ("Tenant").'});
    else {
      L.push({k: 'keyterms', h: 'Key terms table', num: false, special: 'kt', noEdit: true, html: '<table class="kt"><tr><th>Landlord</th><td>' + who(ll) + '</td><th>Tenant' + (tt.length > 1 ? 's' : '') + '</th><td>' + who(tt) + '</td></tr><tr><th>Premises</th><td colspan="3">' + esc(addr) + (kind ? ' &middot; ' + esc(kind) : '') + (s.beds ? ' &middot; ' + esc(s.beds) + ' bd' : '') + (s.baths ? ' / ' + esc(s.baths) + ' ba' : '') + '</td></tr>' +
        '<tr><th>Term</th><td colspan="3">' + esc(monthly ? 'Month to month from ' + when(s.start) + ' (' + (s.noticeDays || 30) + ' days\' notice)' : when(s.start) + ' to ' + when(s.end)) + '</td></tr><tr><th>Monthly rent</th><td>' + (N(s.rent) ? usd(s.rent) : '') + ' due the ' + esc(s.dueDay || '1st') + '</td><th>Security deposit</th><td>' + (s.depOn && N(s.deposit) ? usd(s.deposit) : 'None') + '</td></tr>' +
        '<tr><th>Late charge</th><td>' + (N(s.lateFee) ? usd(s.lateFee) + ' after ' + esc(s.graceDays || 5) + ' days' : 'None') + '</td><th>Tenant pays utilities except</th><td>' + esc(s.utilities || 'None') + '</td></tr></table>'});
      L.push({k: 'tchead', h: 'Terms and conditions', num: false, special: 'h2', noEdit: true});
    }
    C.forEach(function (c) { L.push({k: c[0], h: c[1], lead: esc(c[2])}); });
    if (s.style === 'short') L.push({k: 'closing', h: 'Closing sentence', num: false, tail: true, lead: 'Landlord and Tenant have signed this lease on the dates below.'});
    L.push({k: 'sig', h: 'Signatures', special: 'sig2', tail: true, noEdit: true, num: false});
    return L;
  };
  B.lease.doc2 = function (s) {
    var ll = lsNamed(s.landlords), tt = lsNamed(s.tenants), monthly = s.leaseType === 'monthly', modern = s.style === 'modern';
    var sig = function (role, p) { return '<div class="sx"><div class="sxl"></div><div>' + role + (p && p.name ? ': ' + esc(p.name) : '') + '</div><div class="sxd">Date ________________</div></div>'; };
    var sigs = '<div class="sg2">' + (ll.length ? ll : [{}]).map(function (p) { return sig('Landlord', p); }).join('') + (tt.length ? tt : [{}]).map(function (p) { return sig('Tenant', p); }).join('') + '</div>';
    var h = '', open = false, n = 0, cls = modern ? 'mo' : 'sh';
    leaseSecs(s, B.lease.sections(s)).forEach(function (x) {
      if (x.num && !x.special) { if (!open) { h += '<ol class="' + cls + '" start="' + (n + 1) + '">'; open = true; } n++; h += '<li>' + (x.h ? '<b>' + esc(x.h) + '.</b> ' : '') + x.lead + x.html + '</li>'; return; }
      if (open) { h += '</ol>'; open = false; }
      h += x.special === 'sig2' ? sigs : x.special === 'h2' ? '<h2 class="mh2">' + esc(x.h) + '</h2>' : x.special === 'kt' ? x.html : '<p>' + x.lead + '</p>' + x.html;
    });
    if (open) h += '</ol>';
    var title = s.docTitle || B.lease.title(s);
    if (!modern) return page('cal', '<h1 class="sh">' + esc(title) + '</h1>' + h, CSS_LEASE2);
    return page('ari', '<div class="mh"><div class="mt">' + esc(title) + '</div><div class="md">' + esc(when(s.date)) + '</div></div>' + h, CSS_LEASE2);
  };
  /* signature lines for the two longer leases */
  function leaseSigLines(s, witness) {
    var ll = lsNamed(s.landlords), tt = lsNamed(s.tenants), h = '';
    var one = function (role, p) { return '<div class="sgb"><p><b>' + role + '</b></p>' + lsSl('Signature') + '<p>Print name: ' + lsFv(p.name, 2.8) + '</p>' + (witness ? lsSl('Witness signature') + '<p>Witness printed name: ' + lsFv('', 2.6) + '</p>' : '') + '</div>'; };
    (ll.length ? ll : [{}]).forEach(function (p, i) { h += one(i ? 'CO-LANDLORD' : 'LANDLORD', p); });
    (tt.length ? tt : [{}]).forEach(function (p, i) { h += one(i ? 'CO-TENANT' : 'TENANT', p); });
    return '<h3 class="lc">Signatures</h3><p>The parties have signed this Agreement on the dates below.</p>' + h;
  }
  /* numbered clauses, headings on their own line, tenant initials on each page */
  B.lease.secsClauses = function (s) {
    var T = leaseTokens(s), monthly = s.leaseType === 'monthly', n = /^\d+$/.test(String(s.termLen)) ? +s.termLen : 0, total = !monthly && n && N(s.rent) ? usd(N(s.rent) * n) : '';
    var ll = lsNamed(s.landlords), tt = lsNamed(s.tenants), L = [], P = function (k, h, lead, html, x) { var o = {k: k, h: h, lead: lead, html: html || ''}; for (var q in x || {}) o[q] = x[q]; L.push(o); };
    P('intro', 'Opening paragraph', 'This Lease Agreement (the "Agreement") is made on ' + lsFv(when(s.date), 1.6) + ' between ' + lsFv(ll.map(function (p) { return p.name; }).join(' and '), 2.4) + ' ("Landlord") and ' + lsFv(tt.map(function (p) { return p.name; }).join(', '), 2.4) + ' ("Tenant"). Landlord owns the property at ' + lsFv(T.address, 3.2) + (s.county ? ', ' + esc(s.county) + ' County' : '') + ' (the "Premises") and agrees to lease the Premises to Tenant, and Tenant agrees to lease them from Landlord, on the terms below.', '', {num: false});
    P('term', 'Term', monthly ? 'The tenancy runs month to month beginning on ' + lsFv(when(s.start)) + ', until either party ends it with ' + esc(s.noticeDays || 30) + ' days\' written notice.' : 'Landlord leases the Premises and everything that goes with them to Tenant for a term of ' + lsFv(n ? n + ' months' : '', .9) + ', beginning on ' + lsFv(when(s.start)) + ' and ending at midnight on ' + lsFv(when(s.end)) + '.');
    P('rent', 'Rent', (total ? 'The total rent for the term is ' + total + ', payable in equal' : 'Rent is payable in') + ' monthly installments of ' + lsFv(N(s.rent) ? usd(s.rent) : '') + ' due on the ' + lsFv(s.dueDay, .5) + ' day of each month' + (s.lastOn && N(s.last) ? '. The first month\'s rent and the last month\'s rent (' + usd(s.last) + ') are due when this Agreement is signed' : '') + '. Rent is paid to Landlord at Landlord\'s notice address, or as Landlord directs in writing, on or before the due date and without demand.');
    P('deposit', 'Security deposit', s.depOn ? 'Tenant pays Landlord a security deposit of ' + lsFv(N(s.deposit) ? usd(s.deposit) : '') + ' ' + esc(s.depDue || 'when this lease is signed') + ', as security for Tenant\'s obligations and for any damage to the Premises during the term. After Tenant moves out, Landlord returns the deposit within ' + esc(s.depReturn || 30) + ' days, less lawful deductions for unpaid rent and damage beyond ordinary wear and tear, as the law where the Premises is located requires.' : 'No security deposit is required.');
    P('use', 'Use of premises', 'The Premises are to be used only as a private residence by Tenant' + (s.occupants ? ' and ' + esc(s.occupants) : ' and Tenant\'s household') + '. No business, profession or trade may be carried on at the Premises. No one else may live at the Premises without Landlord\'s written consent, apart from guests staying a short time. Tenant will follow the laws and rules that apply to the use, cleanliness and occupancy of the Premises.');
    P('condition', 'Condition of premises', 'Tenant has inspected the Premises and accepts them as being in good order and repair and in safe, clean and livable condition when this Agreement begins.');
    P('assign', 'Assignment and subletting', 'Tenant may not assign this Agreement, sublet the Premises or any part of them, or let anyone else use them without Landlord\'s written consent. Consent to one assignment or sublease is not consent to any other. An assignment or sublease made without consent is void and, at Landlord\'s option, ends this Agreement.');
    P('alter', 'Alterations and improvements', 'Tenant will not alter, add to or improve the Premises without Landlord\'s written consent. Unless agreed otherwise in writing, anything built or installed by Tenant becomes Landlord\'s property and stays with the Premises when this Agreement ends.');
    P('possession', 'Delay in possession', 'If Landlord cannot deliver possession on the start date through no fault of Landlord, Landlord is not liable for the delay and no rent is charged until possession is delivered. If possession is not delivered within thirty (30) days of the start date, either party may cancel this Agreement and any amounts paid will be returned.');
    P('hazard', 'Hazardous materials', 'Tenant will not keep anything at the Premises that is flammable, explosive or otherwise dangerous, or that would increase the risk of fire or the cost of insurance, beyond ordinary household products.');
    P('utilities', 'Utilities', 'Tenant arranges and pays for all utilities and services to the Premises except: ' + lsFv(s.utilities || 'none', 2.4) + '.');
    P('maint', 'Maintenance, repair and rules', 'Tenant will keep the Premises clean, sanitary and in good repair at Tenant\'s expense during the term and any renewal. In particular, Tenant will: keep walks, driveways, entries and stairs clear; keep windows, doors, locks and fixtures clean and in working order; not add or change locks without Landlord\'s written consent; keep heating and air-conditioning filters clean; use the plumbing only for its intended purpose and pay for damage or blockages caused by misuse; keep noise at a level that does not disturb neighbors; put trash only where it is meant to go; and follow any rules of a condominium or homeowners\' association that apply to the Premises.');
    P('damage', 'Damage to premises', 'If the Premises are destroyed or made wholly unlivable by fire, storm or another casualty not caused by Tenant, this Agreement ends and rent is settled to the date of the damage. If only part of the Premises is affected, Landlord may repair that part or end this Agreement; while repairs are made, rent is reduced in proportion to the part that cannot be used.');
    P('entry', 'Inspection and entry', 'Landlord and Landlord\'s agents may enter the Premises at reasonable times, with reasonable notice except in an emergency, to inspect, make repairs or improvements, or show the Premises. During the last ' + esc(s.showDays || 30) + ' days of the term Landlord may show the Premises to prospective tenants or buyers and display "for rent" or "for sale" signs.');
    P('subord', 'Subordination', 'This Agreement is subordinate to any mortgage or other lien now or later placed on the Premises, including all advances, interest, renewals, extensions and modifications of it.');
    P('holdover', 'Holding over', s.holdover === 'vacate' ? 'Tenant will move out at the end of the term. If Tenant stays without Landlord\'s written consent, Tenant owes rent for each month or part of a month Tenant remains, and any damages the law allows.' : 'If Tenant stays after the term ends with Landlord\'s consent, the tenancy becomes month to month on the same terms, except that rent is ' + (N(s.holdRent) ? usd(s.holdRent) : T.rent) + ' a month and either party may end it with ' + esc(s.holdNotice || 30) + ' days\' written notice.');
    P('surrender', 'Surrender of premises', 'When this Agreement ends Tenant will return the Premises and all keys in as good condition as at the start, except for ordinary wear and tear and damage by the elements.');
    P('pets', 'Pets', s.petsOn ? 'Pets are allowed' + (s.petLbs ? ', each weighing less than ' + esc(s.petLbs) + ' pounds' : '') + (N(s.petDeposit) ? ', with an additional pet deposit of ' + usd(s.petDeposit) : '') + '. Tenant is responsible for any damage a pet causes.' : 'No pets are allowed at the Premises without Landlord\'s written consent.');
    P('quiet', 'Quiet enjoyment', 'As long as Tenant pays the rent and keeps the promises in this Agreement, Tenant may peacefully enjoy the Premises for the term.');
    P('indem', 'Indemnification', 'Landlord is not liable for injury or damage to Tenant, Tenant\'s household, guests or property on or about the Premises unless caused by Landlord\'s negligence. Tenant will hold Landlord harmless from claims arising from Tenant\'s use of the Premises.');
    P('default', 'Default', 'If Tenant breaks a term of this Agreement other than paying rent and does not correct it within ' + esc(s.cureDays || 7) + ' days after written notice, Landlord may end this Agreement. If rent remains unpaid ' + esc(s.rentDays || 3) + ' days after it is due, Landlord may use any remedy the law allows, including ending this Agreement.');
    P('late', 'Late charge', N(s.lateFee) ? 'If a payment is not received within ' + esc(s.graceDays || 5) + ' days of its due date, Tenant will pay a late charge of ' + usd(s.lateFee) + ', where the law allows.' : 'No late charge applies.');
    P('abandon', 'Abandonment', 'If Tenant abandons the Premises, Landlord may take possession as the law provides and may re-rent them for the rest of the term. Tenant remains liable for any shortfall between the rent due under this Agreement and the rent Landlord receives. Personal property left behind is handled as the law allows.');
    P('fees', 'Attorneys\' fees', 'If Landlord must hire an attorney to enforce this Agreement, including to collect rent or recover possession, Tenant will pay Landlord\'s reasonable attorneys\' fees and costs, where the law allows.');
    P('record', 'Recording', 'Tenant will not record this Agreement in any public record. If Tenant does, Landlord may end this Agreement immediately.');
    P('law', 'Governing law', 'This Agreement is governed by the laws of the state where the Premises is located.');
    P('sever', 'Severability', 'If any part of this Agreement is invalid or cannot be enforced, the rest of it stays in effect and is enforced as fully as the law allows.');
    P('binding', 'Binding effect', 'This Agreement binds and benefits the parties and their heirs, legal representatives and permitted assigns.');
    P('interp', 'Headings and wording', 'Headings are for convenience only and do not change the meaning of this Agreement. Words in the singular include the plural, and each pronoun includes every gender.');
    P('waiver', 'No waiver', 'Landlord\'s failure or delay in enforcing any term, or acceptance of a partial payment, does not waive Landlord\'s rights under this Agreement.');
    P('entire', 'Entire agreement', 'This Agreement is the entire agreement between the parties. It may be changed only by a written amendment signed by all parties.');
    var addrLine = function (p, role) { var m = p.noAddr ? '' : p.subj ? addrOf(s) : p.mail; return '<p class="ind">' + role + ': ' + lsFv(p.name, 2.2) + ', ' + lsFv(m || (role === 'Tenant' ? T.address : ''), 3) + '</p>'; };
    P('notices', 'Notices', 'Notices under this Agreement are given in writing, by certified mail with return receipt requested or by hand delivery, to the addresses below. Either party may change its address for notices by written notice to the other.', (ll.length ? ll : [{}]).map(function (p) { return addrLine(p, 'Landlord'); }).join('') + (tt.length ? tt : [{}]).map(function (p) { return addrLine(p, 'Tenant'); }).join(''));
    P('additional', 'Additional provisions and disclosures', s.additional ? esc(s.additional) : 'None, other than any disclosures attached to this Agreement.');
    P('sig', 'Signatures', '', '', {special: 'sigC', tail: true, noEdit: true, num: false});
    return L;
  };
  B.lease.docClauses = function (s) {
    var n = 0, body = leaseSecs(s, B.lease.sections(s)).map(function (x) {
      if (x.special === 'sigC') return leaseSigLines(s, false);
      if (!x.num || !x.h) return '<p>' + x.lead + '</p>' + x.html;
      return '<h4 class="lc">' + (++n) + '. ' + esc(x.h) + '</h4><p>' + x.lead + '</p>' + x.html;
    }).join('');
    return page('tnr', '<h1 class="lc">' + esc(s.docTitle || B.lease.title(s)) + '</h1>' + body + (s.initials ? '<i data-ini="Tenant initials ________" hidden></i>' : ''), CSS_LEASE3);
  };
  /* check-one options, with an agent, notary and deposit receipt that can be added */
  B.lease.secsCheck = function (s) {
    var T = leaseTokens(s), monthly = s.leaseType === 'monthly', ll = lsNamed(s.landlords), tt = lsNamed(s.tenants), L = [], P = function (k, h, lead, html, x) { var o = {k: k, h: h, lead: lead, html: html || ''}; for (var q in x || {}) o[q] = x[q]; L.push(o); };
    var row = function (h, v) { return '<tr><th>' + h + '</th><td>' + (v ? esc(v) : '&nbsp;') + '</td></tr>'; }, fee = N(s.lateFee), nsf = N(s.nsfFee), occ = String(s.occupants || '').trim();
    var llRows = (ll.length ? ll : [{}]).map(function (p, i) { return row('Landlord' + (ll.length > 1 ? ' ' + (i + 1) : '') + ' - full legal name', p.name) + row('Mailing address', p.noAddr ? '' : p.subj ? addrOf(s) : p.mail); }).join('') + row('Phone', s.llPhone) + row('Email', s.llEmail);
    var ttRows = (tt.length ? tt : [{}]).map(function (p, i) { return row('Tenant ' + (i + 1) + ' - full legal name', p.name); }).join('');
    P('parties', 'The parties', 'This Residential Lease Agreement (the "Agreement") is made on ' + lsFv(when(s.date)) + ' between the Landlord and the Tenant(s) named below (together, the "Parties"). The Tenant(s) agree to lease the Premises from the Landlord on the terms below.', '<table class="pt">' + llRows + ttRows + '</table>');
    P('premises', 'Premises', 'The Landlord leases to the Tenant(s) the following property (the "Premises"), to be used only as a private residence:', '<table class="pt">' + row('Street address', s.address) + row('City, state, ZIP', [s.city, [s.state, s.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')) + row('County', s.county) + row('Unit / apartment', s.unit) + (s.descr ? row('Description', s.descr) : '') + '</table>');
    P('term', 'Lease term', monthly ? 'This is a month-to-month tenancy beginning on ' + lsFv(when(s.start)) + '. Either Party may end it with ' + esc(s.noticeDays || 30) + ' days\' written notice.' : 'This is a fixed-term lease beginning on ' + lsFv(when(s.start)) + ' and ending on ' + lsFv(when(s.end)) + '. When the term ends, the Tenant(s): (check one)',
      monthly ? '' : lsCk(s.holdover !== 'vacate', 'may continue month to month on the same terms; either Party may end the month-to-month tenancy with ' + esc(s.noticeDays || 30) + ' days\' written notice.') + lsCk(s.holdover === 'vacate', 'must move out and return the Premises by 11:59 p.m. on the end date.'));
    P('rent', 'Rent', 'Monthly rent is ' + lsFv(N(s.rent) ? usd(s.rent) : '') + ', due in full on the ' + lsFv(s.dueDay, .5) + ' day of each month without demand.', '<p>Payment method: ' + lsFv(s.payMethod, 2.6) + '</p><p>Payable to / remit to: ' + lsFv(s.payTo, 3.4) + '</p><p>Accepting a partial payment does not waive the Landlord\'s right to the balance.</p>');
    P('late', 'Late fee', 'If rent is not received by the due date: (check one)', lsCk(fee > 0, 'a late fee of ' + lsFv(fee ? usd(fee) : '', .9) + ' applies after a grace period of ' + lsFv(fee ? s.graceDays || 5 : '', .4) + ' days, where the law allows.') + lsCk(!fee, 'no late fee is charged.'));
    P('early', 'Early possession', 'Possession before the start date: (check one)', lsCk(!!s.earlyDate, 'the Tenant(s) take early possession on ' + lsFv(s.earlyDate ? when(s.earlyDate) : '') + ', with prorated rent of ' + lsFv(N(s.proRent) ? usd(s.proRent) : '', .9) + ' due when this Agreement is signed.') + lsCk(!s.earlyDate, 'no early possession; the Tenant(s) move in on the start date.'));
    P('deposit', 'Security deposit', 'Security deposit: (check one)', lsCk(!!s.depOn, 'a security deposit of ' + lsFv(s.depOn && N(s.deposit) ? usd(s.deposit) : '', .9) + ' is due ' + esc(s.depDue || 'when this lease is signed') + '. It is held and returned as the law where the Premises is located requires, within ' + lsFv(s.depReturn, .4) + ' days after the lease ends, less itemized lawful deductions, and may not be used as rent without the Landlord\'s written consent.') + lsCk(!s.depOn, 'no security deposit is required.'));
    P('nsf', 'Returned payments', 'If a payment is returned or dishonored: (check one)', lsCk(nsf > 0, 'a fee of ' + lsFv(nsf ? usd(nsf) : '', .8) + ' applies to each returned payment, where the law allows.') + lsCk(!nsf, 'no returned payment fee is charged.'));
    P('occupants', 'Authorized occupants', 'Besides the named Tenant(s), the Premises may be occupied only by: (check one)', lsCk(!!occ, 'these additional occupants: ' + lsFv(occ, 3)) + lsCk(!occ, 'no additional occupants.'));
    P('inspect', 'Move-in inspection', 'Move-in inspection: (check one)', lsCk(!!s.inspect, 'the Parties will inspect the Premises together before or at move-in and record any existing damage on a written checklist signed by both and attached to this Agreement.') + lsCk(!s.inspect, 'no formal move-in inspection will be made.'));
    P('furnish', 'Furnishings', 'The Premises are: (check one)', lsCk(!!s.furnished, 'furnished, including: ' + lsFv(s.furnished ? s.furnItems : '', 3)) + lsCk(!s.furnished, 'unfurnished.'));
    P('utilities', 'Utilities and services', 'The Landlord provides and pays for: ' + lsFv(s.utilities || 'none', 2.6) + '. The Tenant(s) set up and pay for every other utility and service.');
    P('parking', 'Parking', 'Parking: (check one)', lsCk(!!s.parkOn, lsFv(s.parkOn ? s.parkSpaces : '', .4) + ' parking space(s) are provided ' + (s.parkOn && N(s.parkFee) ? 'for ' + usd(s.parkFee) + ' a month, paid with the rent' : 'at no extra charge') + '.') + lsCk(!s.parkOn, 'no parking is provided.'));
    P('pets', 'Pets', 'Pets: (check one)', lsCk(!!s.petsOn, 'pets are allowed - up to ' + lsFv(s.petsOn ? s.petMax : '', .4) + ' pet(s) of these types: ' + lsFv(s.petsOn ? s.petTypes : '', 1.8) + ', with a refundable pet deposit of ' + lsFv(s.petsOn && N(s.petDeposit) ? usd(s.petDeposit) : '', .8) + '.') + lsCk(!s.petsOn, 'no pets of any kind are allowed.'));
    P('smoking', 'Smoking', 'Smoking: (check one)', lsCk(!!s.smokeArea, 'is allowed only in: ' + lsFv(s.smokeArea, 2.4) + '.') + lsCk(!s.smokeArea, 'is not allowed anywhere on the Premises, in common areas or within 25 feet of an entrance. Smoking against this section is a material breach.'));
    P('sale', 'Sale of the property', 'If the Premises are sold during the term, the Tenant(s) will be given the new owner\'s contact information. The new owner: (check one)', lsCk(!!s.saleDays, 'may end this Agreement with ' + lsFv(s.saleDays, .4) + ' days\' written notice.') + lsCk(!s.saleDays, 'may not end this Agreement only because of the sale.'));
    P('notices', 'Notices', 'Notices must be in writing and delivered by hand, first-class mail or overnight courier to:', '<p class="ind">Landlord: ' + lsFv(ll[0] ? [ll[0].name, ll[0].noAddr ? '' : ll[0].mail].filter(Boolean).join(', ') : '', 3.4) + '</p><p class="ind">Tenant(s): ' + lsFv(tt.length ? T.tenant + ', ' + T.address : '', 3.4) + '</p>');
    P('keys', 'Keys and access', 'At or before move-in the Landlord will give the Tenant(s) all keys, fobs, cards and codes needed for the Premises and common areas. The Tenant(s) will not copy them without the Landlord\'s written consent and will return all of them when this Agreement ends; anything not returned may be charged against the deposit.');
    P('entry', 'Landlord\'s entry', 'The Landlord may enter the Premises at reasonable times, with at least ' + esc(s.entryHours || 24) + ' hours\' notice, to inspect, repair, improve or show the Premises, and without notice in an emergency.');
    P('fees', 'Attorneys\' fees', 'In any legal action to enforce this Agreement, the winning Party may recover reasonable attorneys\' fees and court costs, where the law allows.');
    P('noise', 'Quiet enjoyment and noise', 'The Tenant(s), occupants and guests will not make noise or carry on activities that unreasonably disturb neighbors. As long as the Tenant(s) keep this Agreement, they may peacefully enjoy the Premises.');
    P('guests', 'Guests', 'Only the Tenant(s) and authorized occupants may live at the Premises. Guests may stay up to ' + esc(s.guestLimit || 'fourteen (14) days in any six-month period') + ' without the Landlord\'s written approval.');
    P('fair', 'Fair housing', 'The Landlord will not discriminate on the basis of race, color, religion, sex, national origin, familial status, disability or any other class protected by law. A Tenant or occupant who needs a reasonable accommodation or modification may ask the Landlord in writing.');
    P('waiver', 'No waiver', 'A delay or failure by the Landlord to enforce any term, or acceptance of a partial payment, does not waive the Landlord\'s rights.');
    P('maint', 'Maintenance, repairs and alterations', 'The Tenant(s) will keep the Premises clean, safe and sanitary, will pay to repair damage caused by their own or their guests\' misuse or negligence (beyond ordinary wear and tear), and will promptly tell the Landlord in writing about any damage or needed repair. No painting, alterations or changes may be made without the Landlord\'s written consent. The Landlord will make the repairs needed to keep the Premises safe and fit to live in.');
    P('uninhab', 'Damage and unlivable conditions', 'If the Premises become substantially unlivable through no fault of the Tenant(s), the Tenant(s) may end this Agreement by written notice and receive back any prepaid rent for the remaining period. If the damage is caused by the Tenant(s) or their guests, the Tenant(s) pay for the repairs and resulting losses.');
    P('default', 'Default and remedies', 'The Tenant(s) are in default if they do not pay rent or other charges when due, break a material term of this Agreement, abandon the Premises, gave false information in their rental application, or allow illegal drugs or illegal activity at the Premises. The Landlord will give written notice of the default; if it is not corrected within the time the law allows, the Landlord may end this Agreement and use any remedy the law allows, including an action for possession and damages.');
    P('abandon', 'Abandonment', 'If the Tenant(s) are absent without notice for the period the law treats as abandonment while rent is unpaid, the Landlord may retake and re-rent the Premises. Property left behind is handled as the law requires.');
    P('condition', 'Condition and possession', 'By moving in, the Tenant(s) confirm they have inspected the Premises and accept them in their current condition, except for items noted on the move-in checklist. If the Landlord cannot deliver possession on the start date, the Tenant(s) may cancel this Agreement and receive back all deposits and prepaid amounts.');
    P('assign', 'Assignment and subletting', 'The Tenant(s) may not assign this Agreement or sublet any part of the Premises without the Landlord\'s written consent, which will not be unreasonably withheld. An assignment or sublease without consent is void and a material breach.');
    P('joint', 'Joint and several liability', 'If more than one Tenant signs this Agreement, each is fully responsible for all of its obligations, including the full rent.');
    P('hazard', 'Hazardous materials', 'The Tenant(s) will not keep flammable, explosive or hazardous materials at the Premises beyond ordinary household products. Gasoline, kerosene, fireworks and compressed gas cylinders (other than a standard grill tank) are not allowed.');
    P('sever', 'Severability', 'If any part of this Agreement is invalid or cannot be enforced, the rest of it stays in effect and is carried out as fully as the law allows.');
    P('retal', 'No retaliation', 'The Landlord will not raise the rent, reduce services, restrict access or refuse repairs in retaliation for a Tenant\'s lawful complaint or use of a legal right.');
    P('indem', 'Liability and renters insurance', 'The Landlord is not liable for injury or property damage on or about the Premises unless caused by the Landlord\'s negligence. The Tenant(s) will hold the Landlord harmless from claims arising from their use of the Premises and are encouraged to carry renters insurance.');
    P('law', 'Governing law', 'This Agreement is governed by the laws of the state where the Premises is located. Any legal action is to be brought in the county where the Premises is located.');
    P('lead', 'Lead-based paint', 'The Premises: (check one)', lsCk(s.pre1978 === 'yes', 'were built before 1978. The federal lead-based paint disclosure and the "Protect Your Family From Lead in Your Home" pamphlet are attached and are to be signed by all Parties.') + lsCk(s.pre1978 === 'no', 'were built in 1978 or later; the lead-based paint disclosure does not apply.'));
    P('additional', 'Additional provisions', s.additional ? esc(s.additional) : 'None.');
    P('entire', 'Entire agreement', 'This Agreement, with its attachments, is the entire agreement between the Parties about the Premises and replaces all earlier discussions. It may be changed only in writing signed by all Parties. By signing, the Parties confirm they have read it and agree to it.');
    P('sig', 'Signatures', '', '', {special: 'sigK', tail: true, noEdit: true, num: false});
    P('agent', 'Landlord\'s agent', 'The following person may receive notices, demands and legal papers on behalf of the Landlord:', '<table class="pt">' + row('Name', s.agentName) + row('Mailing address', s.agentAddr) + row('Phone', s.agentPhone) + row('Email', s.agentEmail) + '</table>', {tail: true, num: false, defOff: !s.agentName});
    P('notary', 'Notary acknowledgment', 'State of ' + lsFv('', 1.6) + ' &nbsp; County of ' + lsFv(s.county, 1.6), '<p>On ' + lsFv('', 1.5) + ', before me, the undersigned notary public, personally appeared ' + lsFv('', 2.6) + ', known to me or who produced ' + lsFv('', 1.8) + ' as identification, and acknowledged signing this Agreement.</p>' + lsSl('Notary signature') + '<p>Printed name: ' + lsFv('', 2) + ' &nbsp; Commission number: ' + lsFv('', 1.2) + ' &nbsp; Commission expires: ' + lsFv('', 1.1) + '</p>', {tail: true, num: false, defOff: true});
    P('receipt', 'Security deposit receipt', 'Date: ' + lsFv(when(s.date)) + '. Received from ' + lsFv(tt.length ? T.tenant : '', 2.4) + ' a security deposit of ' + lsFv(s.depOn && N(s.deposit) ? usd(s.deposit) : '', .9) + ' for the Premises at ' + lsFv(T.address, 3) + '.',
      '<p>The deposit is held at: ' + lsFv(s.bankName, 2.2) + ', ' + lsFv(s.bankAddr, 2.6) + ', in an account that: (check one)</p>' + lsCk(s.depInterest === 'no', 'does not earn interest.') + lsCk(s.depInterest === 'yes', 'earns interest, paid or credited to the Tenant(s) as the law requires.') + '<p>When moving out, the Tenant(s) must give the Landlord a forwarding address for notices about the deposit.</p>' + lsSl('Landlord signature'), {tail: true, num: false, defOff: !s.bankName});
    return L;
  };
  B.lease.docCheck = function (s) {
    var n = 0, body = leaseSecs(s, B.lease.sections(s)).map(function (x) {
      if (x.special === 'sigK') return leaseSigLines(s, !!s.witness);
      if (x.tail) return '<h3 class="lc">' + esc(x.h) + '</h3>' + (x.lead ? '<p>' + x.lead + '</p>' : '') + x.html;
      if (!x.num || !x.h) return '<p>' + x.lead + '</p>' + x.html;
      return '<h4 class="lc">' + (++n) + '. ' + esc(x.h) + '</h4>' + (x.lead ? '<p>' + x.lead + '</p>' : '') + x.html;
    }).join('');
    return page('ari', '<h1 class="lc">' + esc(s.docTitle || B.lease.title(s)) + '</h1>' + body, CSS_LEASE3);
  };
  var CSS_LEASE3 = '.pg{padding:.7in .8in}h1.lc{text-align:center;font-size:16pt;margin:0 0 .18in;letter-spacing:.03em}h4.lc{font-size:10.5pt;margin:.13in 0 .03in;text-transform:uppercase}h3.lc{font-size:11pt;margin:.22in 0 .06in;text-transform:uppercase;letter-spacing:.04em;border-top:1px solid #999;padding-top:.08in}' +
    'p{font-size:10.5pt;line-height:1.38;margin:0 0 .07in}p.ind{margin-left:.3in}p.ck{margin:0 0 .05in .3in;padding-left:.24in;text-indent:-.24in}.fl{display:inline-block;border-bottom:1px solid #000;min-height:1.05em;vertical-align:baseline}.fv{border-bottom:1px solid #000;padding:0 2px}' +
    'table.pt{width:100%;border-collapse:collapse;font-size:10pt;margin:.04in 0 .08in}table.pt th{width:2.1in;text-align:left;font-weight:600;padding:3px 6px;border:1px solid #bbb;background:#f3f5f8;vertical-align:top}table.pt td{padding:3px 6px;border:1px solid #bbb;vertical-align:top}' +
    '.sgb{margin:.1in 0 .12in}.sgl{display:grid;grid-template-columns:3fr 1.1fr;gap:.3in;margin:.12in 0 .04in;font-size:10pt}.sgl .l{border-bottom:1px solid #000;height:24px}.sgr{font-size:8.5pt;color:#444}.tnr p,.tnr h4.lc{font-size:11.5pt}';
  var CSS_LEASE2 = 'h1.sh{text-align:center;font-size:15pt;letter-spacing:.05em;margin:0 0 .15in}p{font-size:10.5pt;line-height:1.4;margin:0 0 .1in}ol.sh{padding-left:.3in;margin:0 0 .15in}ol.sh li,ol.mo li{font-size:10.5pt;line-height:1.4;margin:0 0 .07in}.ml{color:#555;font-size:9pt}' +
    '.sg2{display:grid;grid-template-columns:1fr 1fr;gap:.15in .4in;margin-top:.25in}.sx{font-size:10pt}.sxl{border-bottom:1px solid #000;height:28px;margin-bottom:2px}.sxd{font-size:8.5pt;color:#555;margin-top:3px}' +
    '.mh{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #2d5a27;padding-bottom:6px;margin-bottom:12px}.mt{font-size:18pt;font-weight:700;color:#2d5a27}.md{font-size:10pt;color:#444}table.kt{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:12px}table.kt th{background:#eaf2e8;color:#2d5a27;text-align:left;padding:5px 7px;border:1px solid #c9dcc5;width:1.15in;vertical-align:top}table.kt td{padding:5px 7px;border:1px solid #c9dcc5;vertical-align:top}h2.mh2{font-size:11.5pt;color:#2d5a27;margin:6px 0 6px;text-transform:uppercase;letter-spacing:.06em}ol.mo{padding-left:.28in;margin:0}';
  var CSS_LEASE = '.pg{padding:.75in .85in .7in}h1{text-align:center;font-size:17pt;margin:0 0 .2in}p{margin:0 0 .09in;line-height:1.32;font-size:11.5pt}p.sh{margin-top:.14in}p.ind{margin-left:.35in}p.ind2{margin-left:.55in}.fl{display:inline-block;border-bottom:1px solid #000;font-size:8.5pt;padding:0 3px;vertical-align:baseline;line-height:1.3}u{text-underline-offset:2px}table.sg{width:100%;margin-top:.2in;font-size:11.5pt;border-collapse:collapse}table.sg td{padding:6px 10px 14px 0;width:50%;line-height:1.7}.bl{display:inline-block;width:1.7in;border-bottom:2px solid #2f6fd6;vertical-align:baseline}';

  /* ======================================================= CONTRACTOR ESTIMATE */
  var TRADES = ['Kitchen', 'Bathroom', 'Roofing', 'Electrical', 'Plumbing', 'HVAC', 'Windows and doors', 'Flooring', 'Painting', 'Siding / exterior', 'Gutters and downspouts', 'Masonry', 'Foundation / structural', 'Drywall / plaster', 'Insulation', 'Trim and carpentry', 'Stairs and railings', 'Appliances', 'Decks / porches', 'Walks and driveways', 'Landscaping / site work', 'Demolition and debris', 'Lead paint / health and safety', 'Well / septic', 'Permits and plans', 'Other'];
  var EST_STYLES = [['classic', 'Classic proposal - labor and materials'], ['modern', 'Modern itemized - color header'], ['qty', 'Detailed bid - quantity, unit and unit price'], ['reno', 'Renovation loan bid - 203(k) / HomeStyle'], ['lump', 'Lump-sum bid - one page, scope and total'], ['letter', 'Proposal letter and contract - acceptance block'], ['grouped', 'Grouped by trade - subtotal for each trade'], ['invoice', 'Quote / invoice - item, quantity, unit price, totals box']];
  var EST_PRESETS = {
    kitchen: ['Kitchen remodel', [['Demolition and debris', 'Remove existing cabinets, counters, flooring and fixtures; haul away debris'], ['Kitchen', 'Supply and install base and wall cabinets, hardware and countertops'], ['Plumbing', 'Sink, faucet, dishwasher and supply/drain connections'], ['Electrical', 'GFCI receptacles, under-cabinet and recessed lighting, appliance circuits'], ['Flooring', 'Install new kitchen flooring with underlayment'], ['Painting', 'Patch, prime and paint walls and ceiling'], ['Appliances', 'Range, refrigerator, dishwasher and range hood']]],
    bath: ['Bathroom remodel', [['Demolition and debris', 'Remove tub/shower, vanity, toilet, tile and flooring'], ['Plumbing', 'New valve, tub/shower, toilet, vanity sink and faucet'], ['Bathroom', 'Cement board, waterproofing, wall and floor tile'], ['Electrical', 'GFCI receptacle, vanity light and exhaust fan vented to exterior'], ['Painting', 'Prime and paint walls, ceiling and trim']]],
    roof: ['Roof replacement', [['Demolition and debris', 'Tear off existing roofing to the deck; dumpster and disposal'], ['Roofing', 'Replace damaged sheathing as needed; ice and water shield, underlayment, architectural shingles, ridge vent, flashing'], ['Gutters and downspouts', 'New seamless gutters and downspouts']]],
    cosmetic: ['Cosmetic refresh', [['Painting', 'Interior paint throughout - walls, ceilings and trim'], ['Flooring', 'Refinish hardwood; new LVP in kitchen and baths'], ['Electrical', 'Replace light fixtures, switches and receptacles; smoke and CO detectors'], ['Trim and carpentry', 'Replace interior doors and hardware; repair trim']]],
    exterior: ['Exterior, siding and windows', [['Siding / exterior', 'Remove and replace siding, house wrap, trim and soffit'], ['Windows and doors', 'Replace windows and exterior doors, capped and sealed'], ['Painting', 'Exterior paint and caulking'], ['Walks and driveways', 'Repair walks, steps and driveway']]],
    full: ['Full renovation (FHA 203(k) / HomeStyle)', [['Permits and plans', 'Building permits, plans and inspections'], ['Demolition and debris', 'Interior demolition and debris removal'], ['Roofing', 'Roof replacement'], ['Electrical', 'Upgrade service to 200 amp; rewire as needed to code'], ['Plumbing', 'Replace supply and drain lines; new water heater'], ['HVAC', 'New furnace / boiler and distribution'], ['Kitchen', 'New kitchen cabinets, counters and appliances'], ['Bathroom', 'Remodel bathroom(s)'], ['Flooring', 'New flooring throughout'], ['Drywall / plaster', 'Repair or replace drywall'], ['Painting', 'Interior and exterior paint'], ['Lead paint / health and safety', 'Lead-safe work practices; handrails, smoke and CO detectors']]]
  };
  B.estimate = {
    label: 'Contractor estimate', sub: 'Eight layouts, logo, draws',
    init: function () { var f = file(); return {style: 'classic', title: '', company: '', license: '', phone: '', email: '', companyAddr: '', number: 'EST-' + iso().replace(/-/g, '').slice(2), date: dateFromPicker(iso()), validDays: '30', customer: f.borrowers.join(' & '), custPhone: '', custEmail: '',
      address: f.address, city: f.city, state: stateName(f.state), zip: f.zip, county: f.county, addrFree: '', lender: '', loanNo: '', consultant: '', program: f.renovation ? (/fha/i.test(f.program) ? 'FHA 203(k)' : 'Fannie Mae HomeStyle') : '',
      startDate: '', duration: '', items: [{trade: 'Kitchen', desc: '', qty: '', unit: '', labor: '', materials: ''}], permits: '', ohp: '10', contingency: '0', tax: '0', deposit: '10', draws: '4', showPay: true, drawCustom: false, drawList: [], warranty: '1 year on workmanship; manufacturer warranties on materials.',
      intro: 'We propose to furnish all labor and materials to complete the work described below, in accordance with the drawings, specifications and the lender\'s work write-up where applicable.',
      notes: 'Price includes labor, materials and cleanup. Work to be completed in a workmanlike manner and to code. Owner to choose finishes before ordering.', accept: 'The above prices, specifications and conditions are satisfactory and are hereby accepted. You are authorized to do the work as specified. Payment will be made as outlined above.', signer: ''}; },
    fix: function (s) { (s.items || []).forEach(function (i) { if (i.qty == null) { i.qty = ''; i.unit = ''; } }); if (s.tax == null) s.tax = '0'; if (s.showPay == null) s.showPay = true; if (s.drawCustom == null) s.drawCustom = false; if (!Array.isArray(s.drawList)) s.drawList = []; },
    /* the draws after the deposit: none when the schedule is left out; your own list when set; otherwise equal draws */
    draws: function (s, c) {
      if (s.showPay === false) return [];
      var after = c.total - c.deposit;
      if (s.drawCustom) {
        var L = (s.drawList || []).filter(function (d) { return d && (d.label || String(d.pct).trim() !== ''); }), fixed = 0, open = 0;
        L.forEach(function (d) { if (String(d.pct).trim() !== '') fixed += N(d.pct); else open++; });
        var share = open ? Math.max(0, 100 - fixed) / open : 0;
        return L.map(function (d, i) { var pc = String(d.pct).trim() !== '' ? N(d.pct) : share; return {label: d.label || 'Draw ' + (i + 1), pct: pc, amt: after * pc / 100}; });
      }
      var n = Math.min(50, Math.max(1, Math.round(N(s.draws) || 1))), out = [];
      for (var d = 1; d <= n; d++) out.push({label: 'Draw ' + d + (d === n ? ' (final, on completion and inspection)' : ''), pct: 100 / n, amt: after / n});
      return out;
    },
    calc: function (s) { var lab = 0, mat = 0; (s.items || []).forEach(function (i) { lab += N(i.labor); mat += N(i.materials); }); var sub = lab + mat, ohp = sub * N(s.ohp) / 100, tax = mat * N(s.tax) / 100, cont = (sub + ohp) * N(s.contingency) / 100, total = sub + ohp + tax + cont + N(s.permits);
      return {labor: lab, materials: mat, sub: sub, ohp: ohp, tax: tax, cont: cont, permits: N(s.permits), total: total, deposit: total * N(s.deposit) / 100}; },
    form: function () {
      var b = 'estimate', s = drafts[b], q = s.style === 'qty';
      return dropZone('estfile', 'Drop a contractor\'s bid or estimate', 'Reads the company, phone, email, license, estimate number, date, customer and each priced line.') +
        '<fieldset><legend>Version</legend><div class="g">' + field(b, 'style', 'Estimate version', {type: 'select', options: EST_STYLES, wide: 1}) +
        '<label class="f w">Start from a sample scope<span class="row" style="flex-wrap:nowrap"><select id="mtBpreset" aria-label="Sample scope" style="flex:1"><option value="">Choose a scope…</option>' + Object.keys(EST_PRESETS).map(function (k) { return '<option value="' + k + '">' + EST_PRESETS[k][0] + '</option>'; }).join('') + '</select><button type="button" class="btn" data-a="estPreset">Replace lines</button><button type="button" class="btn" data-a="estPresetAdd">Add lines</button></span></label>' +
        field(b, 'title', 'Heading (blank = the version\'s heading)', {wide: 1, ph: s.style === 'reno' ? 'RENOVATION BID / WORK WRITE-UP' : s.style === 'letter' ? 'PROPOSAL AND CONTRACT' : s.style === 'invoice' ? 'QUOTE' : 'ESTIMATE'}) + '</div></fieldset>' + logoBlock(b) +
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
        '<fieldset><legend>Totals and payment</legend><div class="g">' + field(b, 'permits', 'Permits and fees ($)', {type: 'money'}) + field(b, 'ohp', 'Overhead & profit (%)', {type: 'pct'}) + field(b, 'tax', 'Sales tax on materials (%)', {type: 'pct'}) + field(b, 'contingency', 'Contingency (%)', {type: 'pct'}) + field(b, 'deposit', 'Deposit at signing (%)', {type: 'pct', ph: '0 = no deposit line'}) + field(b, 'signer', 'Signed by (contractor)') + '</div>' +
        '<div class="g" style="margin-top:6px">' + field(b, 'showPay', 'Show the payment / draw schedule', {type: 'check', wide: 1}) + (s.showPay !== false ? field(b, 'drawCustom', 'Set each draw myself (name, share, remove)', {type: 'check', wide: 1}) + (s.drawCustom ? '' : field(b, 'draws', 'Number of equal draws')) : '') + '</div>' +
        (s.showPay !== false && s.drawCustom ? '<div class="list" style="margin-top:6px">' + (s.drawList || []).map(function (d, i) { var a = function (f) { return ' data-b="estimate" data-list="drawList" data-i="' + i + '" data-f="' + f + '"'; };
          return '<div class="it"><div class="hd"><input' + a('label') + ' value="' + esc(d.label || '') + '" style="flex:1" placeholder="Draw ' + (i + 1) + ' - what it is paid for" aria-label="Draw ' + (i + 1) + ' name" autocomplete="off"><input inputmode="decimal"' + a('pct') + ' value="' + esc(d.pct || '') + '" style="width:110px" placeholder="% (blank = share)" aria-label="Draw ' + (i + 1) + ' percent of the balance"><button type="button" class="x" data-a="rm" data-b="estimate" data-list="drawList" data-i="' + i + '">Remove</button></div></div>'; }).join('') +
          '</div><button type="button" class="btn" data-a="add" data-b="estimate" data-list="drawList">+ Add a draw</button><p class="note">Each share is a percent of the balance after the deposit; draws left blank split what is left equally. Remove every draw to show the deposit alone.</p>' : '') +
        '<div id="mtBest"></div>' +
        '<div class="row" style="margin-top:8px"><button type="button" class="btn" data-a="estUse">Use total as the renovation cost</button></div></fieldset>' +
        '<fieldset><legend>Wording</legend><div class="g">' + (s.style === 'letter' || s.style === 'reno' ? field(b, 'intro', 'Opening paragraph', {type: 'textarea', wide: 1, rows: 3}) : '') + field(b, 'notes', 'Terms and notes', {type: 'textarea', wide: 1, rows: 3}) + field(b, 'warranty', 'Warranty', {type: 'textarea', wide: 1, rows: 2}) +
        (s.style === 'letter' || s.style === 'lump' || s.style === 'reno' ? field(b, 'accept', 'Acceptance wording', {type: 'textarea', wide: 1, rows: 3}) : '') + '</div></fieldset>';
    },
    preset: function (k, add) { var p = EST_PRESETS[k], s = drafts.estimate; if (!p) return; var rows = p[1].map(function (r) { return {trade: r[0], desc: r[1], qty: '', unit: '', labor: '', materials: ''}; });
      var keep = (s.items || []).filter(function (i) { return i.desc || N(i.labor) || N(i.materials); }); s.items = add ? keep.concat(rows) : rows; if (k === 'full' && !add) s.style = 'reno'; persist(); renderForm(); refresh(); say(p[0] + ': ' + rows.length + ' lines ' + (add ? 'added' : 'in place') + ' - enter the labor and materials for each.'); },
    side: function () { var c = B.estimate.calc(drafts.estimate), el = $('mtBest'); if (el) el.innerHTML = '<div class="kv"><span>Labor</span><b>' + usd(c.labor) + '</b><span>Materials</span><b>' + usd(c.materials) + '</b><span>Overhead & profit</span><b>' + usd(c.ohp) + '</b>' + (c.tax ? '<span>Sales tax</span><b>' + usd(c.tax) + '</b>' : '') + '<span>Contingency</span><b>' + usd(c.cont) + '</b><span>Permits</span><b>' + usd(c.permits) + '</b><span>Total</span><b>' + usd(c.total) + '</b>' + (function () { var dl = B.estimate.draws(drafts.estimate, c), sum = dl.reduce(function (t, d) { return t + d.pct; }, 0); return '<span>Deposit</span><b>' + usd(c.deposit) + '</b>' + (drafts.estimate.showPay === false ? '<span>Payment schedule</span><b>Left out</b>' : '<span>Draws</span><b>' + dl.length + ' totaling ' + usd(dl.reduce(function (t, d) { return t + d.amt; }, 0)) + '</b>' + (dl.length && Math.abs(sum - 100) > .01 ? '<span style="color:#f0b357">Draw shares add to</span><b style="color:#f0b357">' + sum.toFixed(2) + '% (not 100%)</b>' : '')); })() + '</div>'; },
    doc: function (s) {
      var c = B.estimate.calc(s), addr = addrOf(s), DL = B.estimate.draws(s, c), draws = DL.length, showPay = s.showPay !== false, st = s.style || 'classic', lines = (s.items || []).filter(function (i) { return i.trade || i.desc || N(i.labor) || N(i.materials); });
      var title = s.title || (st === 'reno' ? 'RENOVATION BID' : st === 'letter' ? 'PROPOSAL AND CONTRACT' : st === 'lump' ? 'BID PROPOSAL' : st === 'invoice' ? 'QUOTE' : 'ESTIMATE');
      var info = [s.companyAddr, s.phone, s.email, s.license ? 'License # ' + s.license : ''].filter(Boolean).map(esc).join(' &middot; '), amt = function (i) { return N(i.labor) + N(i.materials); };
      var sched = DL.map(function (d) { return '<tr><td>' + esc(d.label) + (s.drawCustom ? ' (' + (Math.round(d.pct * 100) / 100) + '%)' : '') + '</td><td class="n">' + usd(d.amt) + '</td></tr>'; }).join('');
      var depRow = function (lbl) { return c.deposit ? '<tr><td>' + lbl + ' (' + esc(s.deposit || 0) + '%)</td><td class="n">' + usd(c.deposit) + '</td></tr>' : ''; };
      var payTbl = showPay && (c.deposit || draws) ? '<h3>Payment schedule</h3><table class="ps">' + depRow('Deposit at signing') + sched + '</table>' : '';
      var equal = draws > 0 && DL.every(function (d) { return Math.abs(d.amt - DL[0].amt) < .005; });
      var payWords = !showPay ? '' : ', payable ' + (c.deposit ? esc(s.deposit || 0) + '% (' + usd(c.deposit) + ') at signing' + (draws ? ' and ' : '') : '') + (draws ? (c.deposit ? 'the balance ' : '') + 'in ' + draws + ' draw' + (draws > 1 ? 's' : '') + (equal ? ' of ' + usd(DL[0].amt) : ' as scheduled below') + ' as the work is completed' : '');
      var totTbl = '<table class="tot"><tr><td>Labor</td><td class="n">' + usd(c.labor) + '</td></tr><tr><td>Materials</td><td class="n">' + usd(c.materials) + '</td></tr><tr><td>Subtotal</td><td class="n">' + usd(c.sub) + '</td></tr>' + (c.ohp ? '<tr><td>Overhead & profit (' + esc(s.ohp) + '%)</td><td class="n">' + usd(c.ohp) + '</td></tr>' : '') + (c.tax ? '<tr><td>Sales tax on materials (' + esc(s.tax) + '%)</td><td class="n">' + usd(c.tax) + '</td></tr>' : '') + (c.cont ? '<tr><td>Contingency (' + esc(s.contingency) + '%)</td><td class="n">' + usd(c.cont) + '</td></tr>' : '') + (c.permits ? '<tr><td>Permits and fees</td><td class="n">' + usd(c.permits) + '</td></tr>' : '') + '<tr class="g"><td>TOTAL</td><td class="n">' + usd(c.total) + '</td></tr></table>';
      var sched2 = (s.startDate || s.duration ? '<p class="terms"><b>Schedule:</b> ' + (s.startDate ? 'Work to start ' + esc(isPhrase(s.startDate) ? s.startDate : 'on or about ' + longDate(s.startDate)) + '. ' : '') + (s.duration ? 'Estimated time to complete: ' + esc(s.duration) + '.' : '') + '</p>' : '');
      var terms = (s.notes || s.warranty || sched2 ? '<h3>Terms</h3>' : '') + (s.notes ? '<p class="terms">' + esc(s.notes).replace(/\n/g, '<br>') + '</p>' : '') + (s.warranty ? '<p class="terms"><b>Warranty:</b> ' + esc(s.warranty) + '</p>' : '') + sched2;
      var sigs = '<div class="sigs"><div><div class="sl"></div>Contractor' + (s.signer ? ' - ' + esc(s.signer) : '') + ' &nbsp; Date</div><div><div class="sl"></div>Customer acceptance &nbsp; Date</div></div>';
      var meta = '<table class="meta"><tr><td><b>Customer</b><br>' + esc(s.customer || '') + (s.custPhone ? '<br>' + esc(s.custPhone) : '') + (s.custEmail ? '<br>' + esc(s.custEmail) : '') + '</td><td><b>Job site</b><br>' + esc(addr) + '</td><td><b>Date</b><br>' + esc(when(s.date)) + '<br><b>Valid</b> ' + esc(s.validDays || '30') + ' days</td></tr></table>';
      var head = function (cls, right) { return logoHead(s, '<div class="co">' + esc(s.company || 'Contractor name') + '</div><div class="ci">' + info + '</div>', right || '<div class="tt">' + esc(title) + '<br><span>' + esc(s.number) + '</span></div>', 'hd ' + (cls || '')); };
      if (st === 'lump') {
        return page('cal', head() + meta + '<h3>Scope of work</h3><ul class="sc">' + (lines.map(function (i) { return '<li><b>' + esc(i.trade) + '</b>' + (i.desc ? ' - ' + esc(i.desc).replace(/\n/g, '<br>') : '') + '</li>'; }).join('') || '<li>Add scope lines</li>') + '</ul>' +
          '<div class="lump"><span>Total price for the work above</span><b>' + usd(c.total) + '</b></div>' + payTbl + terms + (s.accept ? '<p class="terms">' + esc(s.accept) + '</p>' : '') + sigs, CSS_EST);
      }
      if (st === 'letter') {
        return page('geo', logoHead(s, '<div class="co">' + esc(s.company || 'Contractor name') + '</div><div class="ci">' + info + '</div>', '', 'lh') + '<p>' + esc(when(s.date)) + '</p><p>' + esc(s.customer || '') + '<br>' + esc(addr) + '</p><h1 class="lt">' + esc(title) + (s.number ? ' <span>No. ' + esc(s.number) + '</span>' : '') + '</h1>' +
          '<p>' + esc(s.intro || '') + '</p><ol class="lt">' + lines.map(function (i) { return '<li><b>' + esc(i.trade) + '.</b> ' + esc(i.desc || '').replace(/\n/g, '<br>') + (amt(i) ? ' <span class="amt">' + usd(amt(i)) + '</span>' : '') + '</li>'; }).join('') + '</ol>' +
          '<p>We propose to do the work above for the sum of <b>' + usd(c.total) + '</b>' + (c.ohp || c.cont || c.permits || c.tax ? ' (including ' + [c.ohp ? 'overhead and profit' : '', c.tax ? 'sales tax' : '', c.cont ? 'a ' + esc(s.contingency) + '% contingency' : '', c.permits ? 'permits and fees' : ''].filter(Boolean).join(', ') + ')' : '') + payWords + '.</p>' + (showPay && draws && !equal ? '<table class="ps">' + depRow('Deposit at signing') + sched + '</table>' : '') +
          terms + '<p>This proposal may be withdrawn if not accepted within ' + esc(s.validDays || '30') + ' days.</p><div class="sigs"><div><div class="sl"></div>' + esc(s.signer || 'Authorized signature') + ', ' + esc(s.company || '') + '</div><div></div></div><h3>Acceptance of proposal</h3><p class="terms">' + esc(s.accept || '') + '</p>' + '<div class="sigs"><div><div class="sl"></div>Customer &nbsp; Date</div><div><div class="sl"></div>Customer &nbsp; Date</div></div>', CSS_EST);
      }
      if (st === 'grouped') {
        var groups = {}, order = []; lines.forEach(function (i) { var k = i.trade || 'Other'; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(i); });
        var gl = function (g, f) { return g.reduce(function (t, i) { return t + N(i[f]); }, 0); };
        var gb = order.map(function (k) { var g = groups[k], L = gl(g, 'labor'), M = gl(g, 'materials'); return '<tr class="gh"><td colspan="4">' + esc(k) + '</td></tr>' + g.map(function (i) { return '<tr><td class="ind">' + (esc(i.desc || '').replace(/\n/g, '<br>') || esc(k)) + '</td><td class="n">' + usd(i.labor) + '</td><td class="n">' + usd(i.materials) + '</td><td class="n">' + usd(amt(i)) + '</td></tr>'; }).join('') + '<tr class="gs"><td>Subtotal - ' + esc(k) + '</td><td class="n">' + usd(L) + '</td><td class="n">' + usd(M) + '</td><td class="n">' + usd(L + M) + '</td></tr>'; }).join('');
        var summ = '<h3>Summary by trade</h3><table class="ps" style="width:4.6in">' + order.map(function (k) { var v = gl(groups[k], 'labor') + gl(groups[k], 'materials'); return '<tr><td>' + esc(k) + '</td><td class="n">' + usd(v) + '</td><td class="n" style="color:#666">' + (c.sub ? (v / c.sub * 100).toFixed(1) + '%' : '') + '</td></tr>'; }).join('') + '</table>';
        return page('cal', head() + meta + '<table class="it gr"><thead><tr><th>Work item</th><th>Labor</th><th>Materials</th><th>Amount</th></tr></thead><tbody>' + (gb || '<tr><td colspan="4" class="c">Add scope lines</td></tr>') + '</tbody></table>' + totTbl + summ + payTbl + terms + sigs, CSS_EST);
      }
      if (st === 'invoice') {
        var valid = parseDate(s.date) && N(s.validDays) ? longDate(addDays(s.date, N(s.validDays))) : (s.validDays || 30) + ' days';
        var qm = '<div class="tt">' + esc(title) + '</div><table class="qm"><tr><td>Quote #</td><td>' + esc(s.number || '') + '</td></tr><tr><td>Date</td><td>' + esc(when(s.date)) + '</td></tr><tr><td>Valid until</td><td>' + esc(valid) + '</td></tr></table>';
        var ir = lines.map(function (i, k) { var q = N(i.qty) || 1; return '<tr><td class="c">' + (k + 1) + '</td><td><b>' + esc(i.trade) + '</b></td><td>' + esc(i.desc || '').replace(/\n/g, '<br>') + '</td><td class="n">' + (N(i.qty) ? esc(i.qty) + (i.unit ? ' ' + esc(i.unit) : '') : '1') + '</td><td class="n">' + usd(amt(i) / q) + '</td><td class="n">' + usd(amt(i)) + '</td></tr>'; }).join('');
        var tb = '<table class="qt"><tr><td>Subtotal</td><td class="n">' + usd(c.sub) + '</td></tr>' + (c.ohp ? '<tr><td>Overhead & profit (' + esc(s.ohp) + '%)</td><td class="n">' + usd(c.ohp) + '</td></tr>' : '') + (c.tax ? '<tr><td>Sales tax on materials</td><td class="n">' + usd(c.tax) + '</td></tr>' : '') + (c.cont ? '<tr><td>Contingency (' + esc(s.contingency) + '%)</td><td class="n">' + usd(c.cont) + '</td></tr>' : '') + (c.permits ? '<tr><td>Permits and fees</td><td class="n">' + usd(c.permits) + '</td></tr>' : '') + '<tr class="g"><td>Total</td><td class="n">' + usd(c.total) + '</td></tr>' + (showPay ? depRow('Deposit due at signing') + (equal ? '<tr><td>Balance in ' + draws + ' payment' + (draws > 1 ? 's' : '') + ' of</td><td class="n">' + usd(DL[0].amt) + '</td></tr>' : sched) : '') + '</table>';
        return page('cal', head('', qm) + '<div class="bx"><div><b>Bill to</b><br>' + esc(s.customer || '') + (s.custPhone ? '<br>' + esc(s.custPhone) : '') + (s.custEmail ? '<br>' + esc(s.custEmail) : '') + '</div><div><b>Job site</b><br>' + esc(addr) + '</div></div>' +
          '<table class="it"><thead><tr><th>#</th><th>Item</th><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>' + (ir || '<tr><td colspan="6" class="c">Add scope lines</td></tr>') + '</tbody></table>' + tb + terms + (s.accept ? '<p class="terms">' + esc(s.accept) + '</p>' : '') + sigs, CSS_EST);
      }
      var cols = st === 'qty' ? '<th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Labor</th><th>Materials</th><th>Amount</th>' : st === 'reno' ? '<th>#</th><th>Category / work item</th><th>Labor</th><th>Materials</th><th>Total</th>' : '<th>#</th><th>Scope of work</th><th>Labor</th><th>Materials</th><th>Amount</th>';
      var rows = lines.map(function (i, k) { var a = amt(i), q = N(i.qty); return '<tr><td class="c">' + (k + 1) + '</td><td><b>' + esc(i.trade) + '</b>' + (i.desc ? '<br>' + esc(i.desc).replace(/\n/g, '<br>') : '') + '</td>' +
        (st === 'qty' ? '<td class="n">' + (i.qty ? esc(i.qty) : '') + '</td><td>' + esc(i.unit || '') + '</td><td class="n">' + (q ? usd(a / q) : '') + '</td>' : '') + '<td class="n">' + usd(i.labor) + '</td><td class="n">' + usd(i.materials) + '</td><td class="n">' + usd(a) + '</td></tr>'; }).join('');
      var n = st === 'qty' ? 8 : 5;
      if (st === 'reno') {
        return page('cal', head('r') + '<table class="meta"><tr><td><b>Borrower / owner</b><br>' + esc(s.customer || '') + '</td><td><b>Property</b><br>' + esc(addr) + '</td><td><b>Date</b><br>' + esc(when(s.date)) + '</td></tr><tr><td><b>Program</b><br>' + esc(s.program || '') + '</td><td><b>Lender / loan #</b><br>' + esc([s.lender, s.loanNo].filter(Boolean).join(' / ')) + '</td><td><b>Consultant</b><br>' + esc(s.consultant || '') + '</td></tr></table>' +
          (s.intro ? '<p class="terms">' + esc(s.intro) + '</p>' : '') + '<table class="it"><thead><tr>' + cols + '</tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="c">Add work items</td></tr>') + '</tbody></table>' + totTbl +
          (showPay && (c.deposit || draws) ? '<h3>Draw schedule</h3><table class="ps">' + depRow('Deposit / materials draw') + sched + '</table><p class="terms">Draws are released by the lender after each inspection. A holdback may be retained until the final inspection and lien waivers are received.' + (c.cont ? ' The contingency reserve is released only for documented additional work approved by the lender.' : '') + '</p>' : '') + terms +
          '<h3>Contractor certification</h3><p class="terms">I certify that this bid covers all work in the work write-up, that the work will be completed in compliance with local codes and the lender\'s requirements, and that I hold the licenses and insurance required for this work.</p>' + (s.accept ? '<p class="terms">' + esc(s.accept) + '</p>' : '') + sigs.replace('Customer acceptance', 'Borrower'), CSS_EST);
      }
      return page('cal', head(st === 'modern' ? 'm' : '') + meta + '<table class="it' + (st === 'qty' ? ' q' : '') + '"><thead><tr>' + cols + '</tr></thead><tbody>' + (rows || '<tr><td colspan="' + n + '" class="c">Add scope lines</td></tr>') + '</tbody></table>' + totTbl + payTbl + terms + sigs, CSS_EST);
    }
  };
  var CSS_EST = '.pg{padding:.6in .7in}.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1f3a5f;padding-bottom:10px;margin-bottom:14px}.hd.m{border:0;background:#1f3a5f;color:#fff;margin:-.6in -.7in 14px;padding:.4in .7in .25in}.hd.r{border-bottom:3px double #2d5a27}.hd.r .tt,.hd.r .co{color:#2d5a27}.co{font-size:19pt;font-weight:700}.ci{font-size:9pt;color:#555;margin-top:3px}.hd.m .ci{color:#d6e2f2}.tt{text-align:right;font-size:18pt;font-weight:700;color:#1f3a5f;letter-spacing:.08em}.hd.m .tt{color:#fff}.tt span{font-size:10pt;letter-spacing:0;color:#666}.hd.m .tt span{color:#d6e2f2}' +
    'table{width:100%;border-collapse:collapse;font-size:10pt}table.meta td{vertical-align:top;padding:4px 8px 10px 0;width:33%}table.it th{background:#1f3a5f;color:#fff;padding:5px 6px;text-align:left}table.it td{border-bottom:1px solid #ccd5e0;padding:6px;vertical-align:top}table.it.q{font-size:9pt}.n{text-align:right;white-space:nowrap}.c{text-align:center}table.tot{width:3.4in;margin:10px 0 0 auto}table.tot td{padding:3px 6px}table.tot tr.g td{border-top:2px solid #1f3a5f;font-weight:700;font-size:11.5pt}' +
    'h3{font-size:11pt;color:#1f3a5f;margin:16px 0 6px}table.ps{width:4.2in}table.ps td{padding:3px 6px;border-bottom:1px solid #e3e8ef}.terms{font-size:9.5pt;line-height:1.4;margin:0 0 6px}.sigs{display:grid;grid-template-columns:1fr 1fr;gap:.5in;margin-top:.45in;font-size:9.5pt}.sigs .sl{border-bottom:1px solid #000;height:28px;margin-bottom:3px}' +
    'ul.sc{margin:4px 0 10px;padding-left:.25in;font-size:10.5pt;line-height:1.45}.lump{display:flex;justify-content:space-between;align-items:center;border:2px solid #1f3a5f;border-radius:6px;padding:10px 14px;margin:12px 0;font-size:12pt}.lump b{font-size:16pt;color:#1f3a5f}' +
    '.lh{border-bottom:2px solid #1f3a5f;padding-bottom:8px;margin-bottom:18px}.geo p{line-height:1.45;margin:0 0 10px}h1.lt{font-size:14pt;letter-spacing:.06em;color:#1f3a5f;margin:14px 0 10px}h1.lt span{font-size:10pt;color:#666;letter-spacing:0}ol.lt li{margin:0 0 6px;line-height:1.4}ol.lt .amt{float:right;font-weight:700;padding-left:12px}' +
    '.lh{display:flex;justify-content:space-between;align-items:flex-start}table.it.gr tr.gh td{background:#e8eef6;font-weight:700;color:#1f3a5f;border-bottom:1px solid #9fb3cc}table.it.gr td.ind{padding-left:18px}table.it.gr tr.gs td{font-weight:700;border-top:1px solid #1f3a5f;border-bottom:2px solid #ccd5e0}' +
    'table.qm{width:auto;margin:6px 0 0 auto;font-size:9pt}table.qm td{padding:1px 0 1px 12px;text-align:right}table.qm td:first-child{color:#666}.bx{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 12px}.bx>div{border:1px solid #ccd5e0;border-radius:4px;padding:8px 10px;font-size:10pt;line-height:1.4}' +
    'table.qt{width:3.6in;margin:10px 0 6px auto;border:1px solid #1f3a5f}table.qt td{padding:4px 8px;border-bottom:1px solid #e3e8ef}table.qt tr.g td{background:#1f3a5f;color:#fff;font-weight:700;font-size:12pt}';
  /* ==================================================================== P & L */
  var PL_EXP = ['Advertising', 'Car and truck', 'Contract labor', 'Insurance', 'Interest', 'Legal and professional', 'Office expense', 'Rent or lease', 'Repairs and maintenance', 'Supplies', 'Taxes and licenses', 'Travel', 'Meals', 'Utilities', 'Wages', 'Other'];
  var PL_STYLES = [['summary', 'Accountant summary'], ['detailed', 'Detailed statement (% of income)'], ['condensed', 'Condensed one-page'], ['annualized', 'Annualized - monthly average and 12-month figures'], ['compare', 'Comparative - this period against a prior period']];
  B.pl = {
    label: 'Profit and loss', sub: 'Five layouts, logo, YTD or annual',
    init: function () { var f = file(), y = new Date().getFullYear(); return {style: 'summary', logo: savedLogo(), logoSize: '52', logoPos: 'center', business: '', owner: f.borrowers.join(' & '), bizAddr: '', from: '1/1/' + y, to: dateFromPicker(iso()), own: '100', preparer: '', prepTitle: 'Owner', prepDate: dateFromPicker(iso()), basis: 'Cash',
      curLabel: String(y), priorLabel: String(y - 1),
      income: [{label: 'Gross receipts / sales', amt: '', prior: ''}], cogs: [{label: 'Cost of goods sold', amt: '', prior: ''}], expenses: PL_EXP.slice(0, 6).map(function (l) { return {label: l, amt: '', prior: ''}; })}; },
    fix: function (s) { if (s.curLabel == null) { var y = new Date().getFullYear(); s.curLabel = String(y); s.priorLabel = String(y - 1); } if (s.logoPos == null) s.logoPos = 'center'; },
    calc: function (s) { var sum = function (a, k) { return (a || []).reduce(function (t, r) { return t + N(r[k || 'amt']); }, 0); }; var inc = sum(s.income), cogs = sum(s.cogs), exp = sum(s.expenses), gp = inc - cogs, net = gp - exp, from = parseDate(s.from), to = parseDate(s.to);
      var pinc = sum(s.income, 'prior'), pcogs = sum(s.cogs, 'prior'), pexp = sum(s.expenses, 'prior');
      var months = from && to ? Math.max(1, Math.round(((to - from) / 86400000 + 1) / 30.4375)) : 12; return {inc: inc, cogs: cogs, gp: gp, exp: exp, net: net, months: months, monthly: net / months * N(s.own) / 100, pinc: pinc, pcogs: pcogs, pgp: pinc - pcogs, pexp: pexp, pnet: pinc - pcogs - pexp}; },
    form: function () {
      var b = 'pl', s = drafts[b], cmp = s.style === 'compare', list = function (k, title, addLabel) { return '<fieldset><legend>' + title + '</legend>' + (cmp ? '<div class="g note" style="grid-template-columns:1fr 110px 110px auto;margin:0 0 4px"><span>Line</span><span>' + esc(s.curLabel || 'This period') + '</span><span>' + esc(s.priorLabel || 'Prior period') + '</span><span></span></div>' : '') + '<div class="list">' + (s[k] || []).map(function (r, i) { var a = ' data-b="pl" data-list="' + k + '" data-i="' + i + '"'; return '<div class="g" style="grid-template-columns:1fr ' + (cmp ? '110px 110px' : '130px') + ' auto;margin-bottom:5px"><input' + a + ' data-f="label" value="' + esc(r.label) + '" aria-label="Line"><input inputmode="decimal"' + a + ' data-f="amt" value="' + esc(r.amt) + '" placeholder="0.00" aria-label="Amount">' + (cmp ? '<input inputmode="decimal"' + a + ' data-f="prior" value="' + esc(r.prior || '') + '" placeholder="0.00" aria-label="Prior period amount">' : '') + '<button type="button" class="x" data-a="rm" data-b="pl" data-list="' + k + '" data-i="' + i + '" aria-label="Remove">×</button></div>'; }).join('') + '</div><button type="button" class="btn" data-a="add" data-b="pl" data-list="' + k + '">' + addLabel + '</button></fieldset>'; };
      return dropZone('plfile', 'Drop a profit and loss statement', 'Reads the business name, period and each income, cost and expense line with its amount.') +
        '<fieldset><legend>Business</legend><div class="g">' + field(b, 'style', 'Layout', {type: 'select', options: PL_STYLES, wide: 1}) +
        field(b, 'business', 'Business name', {wide: 1}) + field(b, 'owner', 'Owner(s)') + field(b, 'own', 'Ownership (%)', {type: 'pct'}) + field(b, 'bizAddr', 'Business address', {wide: 1, addrLine: 1}) + field(b, 'from', 'Period from', {type: 'date'}) + field(b, 'to', 'Period to', {type: 'date'}) +
        (cmp ? field(b, 'curLabel', 'Column heading - this period', {ph: '2026 YTD'}) + field(b, 'priorLabel', 'Column heading - prior period', {ph: '2025'}) : '') +
        field(b, 'basis', 'Accounting basis', {list: ['Cash', 'Accrual', 'Modified cash']}) + field(b, 'preparer', 'Prepared by') + field(b, 'prepTitle', 'Title', {list: ['Owner', 'Member', 'President', 'CPA', 'Bookkeeper', 'Tax preparer']}) + field(b, 'prepDate', 'Date prepared', {type: 'date'}) + '</div></fieldset>' + logoBlock(b) +
        list('income', 'Income', '+ Add income line') + list('cogs', 'Cost of goods sold', '+ Add cost line') + list('expenses', 'Operating expenses', '+ Add expense') + '<div id="mtBpl"></div>' +
        '<div class="row" style="margin-top:8px"><button type="button" class="btn" data-a="plUse">Send to Non-QM profit and loss income</button></div>';
    },
    side: function () { var c = B.pl.calc(drafts.pl), el = $('mtBpl'); if (el) el.innerHTML = '<div class="kv"><span>Total income</span><b>' + usd(c.inc) + '</b><span>Gross profit</span><b>' + usd(c.gp) + '</b><span>Total expenses</span><b>' + usd(c.exp) + '</b><span>Net profit (' + c.months + ' months)</span><b class="' + (c.net < 0 ? 'bad' : '') + '">' + usd(c.net) + '</b><span>Monthly x ownership</span><b>' + usd(c.monthly) + '</b>' + (drafts.pl.style === 'compare' ? '<span>Prior period net</span><b>' + usd(c.pnet) + '</b>' : '') + '</div>'; },
    doc: function (s) {
      var c = B.pl.calc(s), st = s.style || 'summary', mo = c.months;
      /* the value columns each layout prints for a line (amount, prior amount) */
      var COLS = {summary: [['Amount', function (v) { return usd(v); }]], condensed: [['Amount', function (v) { return usd(v); }]],
        detailed: [['Amount', function (v) { return usd(v); }], ['% of income', function (v) { return c.inc ? pct(v / c.inc, 1) : ''; }, 'p']],
        annualized: [[esc(mo) + '-month amount', function (v) { return usd(v); }], ['Monthly average', function (v) { return usd(v / mo); }, 'p'], ['Annualized (12 months)', function (v) { return usd(v / mo * 12); }]],
        compare: [[esc(s.curLabel || 'This period'), function (v) { return usd(v); }], [esc(s.priorLabel || 'Prior period'), function (v, p) { return usd(p); }], ['Change', function (v, p) { return usd(v - p); }, 'p'], ['Change %', function (v, p) { return p ? pct((v - p) / Math.abs(p), 1) : ''; }, 'p']]}[st] || [['Amount', function (v) { return usd(v); }]];
      var n = COLS.length + 1, hdr = COLS.length > 1 ? '<tr class="hh"><td></td>' + COLS.map(function (k) { return '<td class="n">' + k[0] + '</td>'; }).join('') + '</tr>' : '';
      var cells = function (v, p) { return COLS.map(function (k) { return '<td class="n' + (k[2] ? ' ' + k[2] : '') + '">' + k[1](v, p || 0) + '</td>'; }).join(''); };
      var rows = function (a) { return (a || []).filter(function (r) { return r.label || N(r.amt) || N(r.prior); }).map(function (r) { return '<tr><td class="i">' + esc(r.label) + '</td>' + cells(N(r.amt), N(r.prior)) + '</tr>'; }).join(''); };
      var tot = function (l, v, p, cls) { return '<tr class="' + (cls || 't') + '"><td>' + l + '</td>' + cells(v, p) + '</tr>'; };
      var lg = s.logo ? '<img class="lg plg-' + (s.logoPos || 'center') + '" src="' + s.logo + '" alt="" style="height:' + (N(s.logoSize) || 52) + 'px">' : '';
      var head = '<div class="h">' + lg + '<div class="b">' + esc(s.business || 'Business name') + '</div>' + (s.bizAddr ? '<div class="a">' + esc(s.bizAddr) + '</div>' : '') + '<div class="t">' + (st === 'compare' ? 'Comparative Profit and Loss Statement' : st === 'annualized' ? 'Profit and Loss Statement - Annualized' : 'Profit and Loss Statement') + '</div><div class="a">' + esc(when(s.from)) + ' through ' + esc(when(s.to)) + ' &middot; ' + esc(s.basis) + ' basis</div></div>';
      var body = st === 'condensed' ? '<table><tr><td>Total income</td><td class="n">' + usd(c.inc) + '</td></tr><tr><td>Less: cost of goods sold</td><td class="n">' + usd(c.cogs) + '</td></tr>' + tot('Gross profit', c.gp) + '<tr><td>Less: operating expenses</td><td class="n">' + usd(c.exp) + '</td></tr>' + tot('Net profit', c.net, 0, 'g') + '</table>' :
        '<table class="c' + COLS.length + '">' + hdr + '<tr class="s"><td colspan="' + n + '">INCOME</td></tr>' + rows(s.income) + tot('Total income', c.inc, c.pinc) +
        (c.cogs || c.pcogs ? '<tr class="s"><td colspan="' + n + '">COST OF GOODS SOLD</td></tr>' + rows(s.cogs) + tot('Total cost of goods sold', c.cogs, c.pcogs) : '') + tot('Gross profit', c.gp, c.pgp) +
        '<tr class="s"><td colspan="' + n + '">OPERATING EXPENSES</td></tr>' + rows(s.expenses) + tot('Total operating expenses', c.exp, c.pexp) + tot('NET PROFIT', c.net, c.pnet, 'g') + '</table>' +
        (st === 'annualized' ? '<p class="nt">Monthly average is the period\'s amount divided by ' + mo + ' month' + (mo > 1 ? 's' : '') + '; annualized is that average times 12. Net profit at ' + esc(s.own || 100) + '% ownership: ' + usd(c.net / mo * N(s.own || 100) / 100) + ' a month.</p>' : '');
      return page('cal', head + body + '<p class="cert">I certify that this profit and loss statement for ' + esc(s.business || 'the business') + ' is true and complete to the best of my knowledge and was prepared from the business\'s records.</p>' +
        '<div class="sg"><div><div class="sl"></div>' + esc(s.preparer || s.owner || '') + (s.prepTitle ? ', ' + esc(s.prepTitle) : '') + '</div><div><div class="sl"></div>Date ' + esc(when(s.prepDate, slashDate)) + '</div></div>' +
        (s.owner && s.owner !== s.preparer ? '<div class="sg"><div><div class="sl"></div>' + esc(s.owner) + ', Owner (' + esc(s.own || 100) + '%)</div><div><div class="sl"></div>Date</div></div>' : ''), CSS_PL);
    }
  };
  var CSS_PL = '.h{text-align:center;margin-bottom:.25in;position:relative;min-height:.4in}.h .b{font-size:17pt;font-weight:700}.h .t{font-size:13pt;font-weight:700;margin-top:8px;letter-spacing:.04em}.h .a{font-size:9.5pt;color:#555}table{width:100%;border-collapse:collapse;font-size:10.5pt}table.c3,table.c4{font-size:9.5pt}td{padding:3px 6px}td.i{padding-left:22px}.n{text-align:right;white-space:nowrap}.p{color:#666;font-size:9pt}tr.s td{font-weight:700;padding-top:12px;border-bottom:1px solid #999}tr.t td{font-weight:700;border-top:1px solid #000}tr.g td{font-weight:700;font-size:12pt;border-top:2px solid #000;border-bottom:3px double #000}tr.hh td{font-size:8.5pt;color:#555;font-weight:600;border-bottom:1px solid #999}.cert{margin-top:.35in;font-size:9.5pt;line-height:1.4}.nt{font-size:9pt;color:#444;margin-top:10px}.sg{display:grid;grid-template-columns:2fr 1fr;gap:.4in;margin-top:.3in;font-size:9.5pt}.sg .sl{border-bottom:1px solid #000;height:26px;margin-bottom:3px}' +
    '.lg{display:block;max-width:2.8in;object-fit:contain}.plg-center{margin:0 auto 6px}.plg-left{position:absolute;left:0;top:0}.plg-right{position:absolute;right:0;top:0}';

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
        showNotes: true, hideDone: false, emailTo: '', emailCc: '', processor: '', procPhone: '', procEmail: '', lo: '', loNmls: '', loPhone: '', loEmail: '', underwriter: '', returnDays: '10', findText: '', replaceText: '', conditions: []};
      COND_LIB.forEach(function (c) { d.conditions.push({id: uid(), group: c[0], cat: c[1], text: c[2], on: true}); });
      return d;
    },
    form: function () {
      var b = 'commit', s = drafts[b];
      var conds = function (g, title) {
        var list = s.conditions.filter(function (c) { return c.group === g; });
        return '<fieldset><legend>' + title + ' (' + list.filter(function (c) { return c.on; }).length + ' of ' + list.length + ' kept)</legend>' + list.map(function (c) {
          return '<div class="cond"><input type="checkbox" data-cond="' + c.id + '" data-f="on"' + (c.on ? ' checked' : '') + ' aria-label="Keep this condition"><div><input data-cond="' + c.id + '" data-f="cat" value="' + esc(c.cat) + '" style="margin-bottom:4px;font-weight:700" aria-label="Category"><textarea data-cond="' + c.id + '" data-f="text" rows="2" aria-label="Condition">' + esc(c.text) + '</textarea>' + (c.note || c.src === 'grid' ? '<textarea data-cond="' + c.id + '" data-f="note" rows="1" style="margin-top:4px;font-style:italic" placeholder="Note (optional)" aria-label="Note for this condition">' + esc(c.note || '') + '</textarea>' : '') +
            '<label class="ck" style="margin-top:4px"><input type="checkbox" data-cond="' + c.id + '" data-f="done"' + (c.done ? ' checked' : '') + '><span>Received / cleared</span></label>' + (c.src && c.src !== 'grid' ? '<div class="note">From the approval: ' + esc(c.src) + '</div>' : '') + '</div>' +
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
        '<label class="f w" style="margin-top:10px">Paste conditions copied from your loan system or a spreadsheet<textarea id="mtBcondPaste" rows="3" placeholder="Copy the condition rows with the header row (Condition Name, Documents, External Description, Prior To, ... Latest Status, ... Internal Description) and paste here. A screenshot of the list can go in the drop box above."></textarea></label>' +
        '<div class="row" style="margin-top:6px"><button type="button" class="btn" data-a="condPasteRep">Replace the conditions with these</button><button type="button" class="btn" data-a="condPasteAdd">Add these to the list</button></div>' +
        '<div class="g" style="margin-top:10px">' + field(b, 'showNotes', 'Print the notes under each condition', {type: 'check', wide: 1}) + field(b, 'hideDone', 'Leave received conditions off the letter', {type: 'check', wide: 1}) + field(b, 'emailTo', 'Email to', {ph: 'borrower@example.com'}) + field(b, 'emailCc', 'Cc', {ph: 'processor, agent'}) + '</div>' +
        '<div class="row" style="margin-top:6px"><button type="button" class="btn" data-a="condMail">Email the conditions</button><button type="button" class="btn" data-a="condCopy">Copy for email (table with check boxes)</button><button type="button" class="btn" data-a="condTsv">Copy as spreadsheet rows</button></div>' +
        '<p class="note">The email lists the conditions you kept: still-needed items first with an empty box, received items checked off. Tick "Received / cleared" on each one as it comes in.</p>' +
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
      var keep = function (c) { return c.on && c.text.trim() && !(s.hideDone && c.done); };
      var prior = s.conditions.filter(function (c) { return keep(c) && c.group === 'prior'; }), at = s.conditions.filter(function (c) { return keep(c) && c.group === 'closing'; });
      var ol = function (l) { return '<ol>' + l.map(function (c) { return '<li>' + (c.cat ? esc(c.cat) + '- ' : '') + F(c.text) + (c.done ? ' <b>(received)</b>' : '') + (s.showNotes !== false && c.note ? '<br><i style="font-size:.92em">' + esc(c.note) + '</i>' : '') + '</li>'; }).join('') + '</ol>'; };
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
  /* ---------------------------------------------------------- condition lists from a loan system (56.7)
     Rows copied from a conditions grid or spreadsheet (Condition Name, Documents, External Description, Prior To, ..., Latest Status,
     ..., Internal Description) arrive tab-separated, with quoted cells that may run over several lines. A screenshot of the same grid
     arrives as OCR lines with no tabs; each line that starts "Category - " becomes a condition. */
  function tsvRows(T) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < T.length; i++) {
      var ch = T[i];
      if (q) { if (ch === '"') { if (T[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
      if (ch === '"' && cell === '') { q = true; continue; }
      if (ch === '\t') { row.push(cell); cell = ''; continue; }
      if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
      cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
  }
  var COND_STAFF = /^(Funder|FUNDER|Post\s*Closer|Approval|Disclosures|Escrow|Closing\s*Agent|Title\s*Company)/i;
  function condNote(t) { t = String(t || '').replace(/\r/g, '').replace(/\n\s*-\s*$/, '').replace(/^\s*\*+\s*/, '').replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim(); return /^(-|\*|n\/?a|if applicable)?$/i.test(t) ? '' : t; }
  function condFrom(name, ext, prior, status, internal) {
    name = String(name || '').replace(/\s+/g, ' ').trim(); ext = condNote(ext); internal = condNote(internal);
    var cm = name.match(/^(.{2,60}?)\s+-\s*(.*)$/) || name.match(/^(.{2,60}?)\s*-\s*$/), cat = cm ? cm[1].trim() : '', rest = cm ? (cm[2] || '').trim() : name;
    /* a name that says nothing on its own ("Income -", "Mortgage rating needed for:") takes its detail from the note */
    var bare = !rest || /[:\-]$/.test(rest), text = ext || (bare && internal ? (rest ? rest + ' ' : '') + internal : rest), note = ext || bare ? (ext && internal ? internal : '') : internal;
    if (!text) return null;
    var p = String(prior || '').trim(), done = /^(cleared|waived|received|satisfied|completed?)$/i.test(String(status || '').trim());
    return {id: uid(), group: /clos|fund|ptf|at\s*closing/i.test(p) && !/ptd|docs?/i.test(p) ? 'closing' : 'prior', cat: cat, text: text, note: note, on: !COND_STAFF.test(cat) && !/^(Underwriter|Processor\s*Cert)/i.test(rest), done: done, src: 'grid'};
  }
  function parseCondTable(text) {
    var T = String(text || '').replace(/\r\n?/g, '\n');
    if (/\t/.test(T)) {
      var rows = tsvRows(T), head = rows[0] ? rows[0].map(function (h) { return String(h).trim().toLowerCase(); }) : [], hasHead = head.indexOf('condition name') >= 0 || head.indexOf('condition') >= 0;
      var col = function (re, dflt) { for (var i = 0; i < head.length; i++) if (re.test(head[i])) return i; return hasHead ? -1 : dflt; };
      var cN = col(/^condition( name)?$|^title$|^description$/, 0), cE = col(/external/, 2), cP = col(/prior\s*to|^due$/, 3), cS = col(/latest\s*status|^status$/, 6), cI = col(/internal/, 9);
      var body = hasHead ? rows.slice(1) : rows;
      if (!hasHead && !body.some(function (r) { return r.length >= 4 && /\s-(\s|$)/.test(r[0] || ''); })) return null;
      var out = body.map(function (r) { return condFrom(r[cN], cE >= 0 ? r[cE] : '', cP >= 0 ? r[cP] : '', cS >= 0 ? r[cS] : '', cI >= 0 ? r[cI] : ''); }).filter(Boolean);
      return out.length ? out : null;
    }
    /* OCR of a screenshot of the grid: one row per line */
    var CATS = /^(Approval|Assets?|Credit|Income|Property|Appraisal|Title|Legal|Insurance|Hazard|Flood|Disclosures?|Escrow\s*\/\s*Closing\s*Agent|Escrow|Closing\s*Agent|Closing|FUNDER\s*TO\s*CLEAR\s*PTD|Funder|Post\s*Closer|Conventional\s*Renovation|FHA\s*203\s*\(?k\)?|FHA|VA|USDA|HomeStyle|Freddie[^-]{0,40}|Fannie[^-]{0,40}|Renovation|Underwriting|Compliance|Misc\w*|Other)\s*[-–—:]/i;
    var lines = T.split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(function (l) { return CATS.test(l); });
    if (lines.length < 3) return null;
    var out2 = lines.map(function (l) {
      var st = (l.match(/\b(Added|Cleared|Waived|Received|Expected|Requested|Rejected)\b(?=\s+\d{1,2}\/\d{1,2}\/\d{2,4})/i) || [])[1] || '';
      var main = l.replace(/\s+\b(Added|Cleared|Waived|Received|Expected|Requested|Rejected)\b\s+\d{1,2}\/\d{1,2}\/\d{2,4}.*$/i, '').replace(/\s+(Docs|PTD|Closing|Funding)\s*$/i, '');
      var m = main.match(/^(.*?)\s+\d{1,2}\s+(.*)$/), name = (m ? m[1] : main).replace(/\s+\d{1,2}$/, ''), ext = m ? m[2].replace(/\s+(Docs|PTD|Closing|Funding)(\s.*)?$/i, '') : '';
      return condFrom(name, ext, /\b(Closing|Funding)\b/i.test(l) ? 'Closing' : 'Docs', st, '');
    }).filter(Boolean);
    return out2.length ? out2 : null;
  }
  /* the condition list as an email or for pasting: kept conditions, still needed first, received ones checked off */
  function condLists() { var L = drafts.commit.conditions.filter(function (c) { return c.on && String(c.text).trim(); }); return {need: L.filter(function (c) { return !c.done; }), got: L.filter(function (c) { return c.done; })}; }
  function condEmail() {
    var s = drafts.commit, L = condLists(), first = (s.borrowers || []).map(function (b) { return String(b && typeof b === 'object' ? b.name || '' : b || '').trim().split(/\s+/)[0]; }).filter(Boolean);
    var line = function (c, mark) { return mark + ' ' + (c.cat ? c.cat + ' - ' : '') + B.commit.fill(c.text) + (s.showNotes !== false && c.note ? '\n      Note: ' + c.note : ''); };
    var where = s.address ? ' for ' + s.address + (s.city ? ', ' + s.city : '') : '';
    var subject = 'Loan conditions' + (s.loanNumber ? ' - loan ' + s.loanNumber : '') + where + (L.need.length ? ' (' + L.need.length + ' still needed)' : ' (all received)');
    var text = 'Hi' + (first.length ? ' ' + first.join(' and ') : '') + ',\n\nHere are the conditions on your loan' + where + '. Items marked [X] have been received. Please send the items marked [ ] as soon as you can.\n\n' +
      'STILL NEEDED (' + L.need.length + ')\n' + (L.need.map(function (c) { return line(c, '[ ]'); }).join('\n') || 'Nothing - every condition has been received.') + '\n\n' +
      (L.got.length ? 'RECEIVED (' + L.got.length + ')\n' + L.got.map(function (c) { return line(c, '[X]'); }).join('\n') + '\n\n' : '') +
      'Thank you,\n' + [s.lo, s.loNmls ? 'NMLS ' + s.loNmls : '', s.loPhone, s.loEmail, s.company].filter(Boolean).join('\n');
    var html = '<p>Hi' + (first.length ? ' ' + esc(first.join(' and ')) : '') + ',</p><p>Here are the conditions on your loan' + esc(where) + '. Items checked off have been received. Please send the open items as soon as you can.</p>' +
      '<table style="border-collapse:collapse;font:13px Arial,sans-serif"><tr><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #1f3a5f"></th><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #1f3a5f">Condition</th><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #1f3a5f">Status</th></tr>' +
      L.need.concat(L.got).map(function (c) { return '<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd;font-size:15px">' + (c.done ? '&#9745;' : '&#9744;') + '</td><td style="padding:4px 8px;border-bottom:1px solid #ddd">' + (c.cat ? '<b>' + esc(c.cat) + '</b> - ' : '') + esc(B.commit.fill(c.text)) + (s.showNotes !== false && c.note ? '<br><i style="color:#555">Note: ' + esc(c.note) + '</i>' : '') + '</td><td style="padding:4px 8px;border-bottom:1px solid #ddd">' + (c.done ? 'Received' : '<b>Still needed</b>') + '</td></tr>'; }).join('') + '</table>' +
      '<p>Thank you,<br>' + [s.lo, s.loNmls ? 'NMLS ' + s.loNmls : '', s.loPhone, s.loEmail, s.company].filter(Boolean).map(esc).join('<br>') + '</p>';
    var tsv = ['Status\tCategory\tCondition\tWhen\tNote'].concat(L.need.concat(L.got).map(function (c) { var q = function (v) { v = String(v || ''); return /[\t\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return [c.done ? 'Received' : 'Still needed', q(c.cat), q(B.commit.fill(c.text)), c.group === 'closing' ? 'At closing' : 'Prior to closing', q(c.note)].join('\t'); })).join('\n');
    return {to: [s.emailTo].filter(Boolean).join(','), cc: s.emailCc || '', subject: subject, text: text, html: html, tsv: tsv, count: L.need.length + L.got.length};
  }
  function copyRich(html, text) {
    try { if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) return navigator.clipboard.write([new ClipboardItem({'text/html': new Blob([html], {type: 'text/html'}), 'text/plain': new Blob([text], {type: 'text/plain'})})]); } catch (e) {}
    return navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error('no clipboard'));
  }
  function condMail(kind) {
    var E = condEmail();
    if (!E.count) { say('No conditions are kept - tick the ones to send first.'); return; }
    if (kind === 'copy') return copyRich(E.html, E.text).then(function () { say('Copied ' + E.count + ' conditions as a table with check boxes - paste into Outlook or Gmail.'); }, function () { say('The browser did not allow copying - use Open email instead.'); });
    if (kind === 'tsv') return (navigator.clipboard ? navigator.clipboard.writeText(E.tsv) : Promise.reject()).then(function () { say('Copied ' + E.count + ' rows - paste into Excel or Google Sheets.'); }, function () { say('The browser did not allow copying.'); });
    var url = function (body) { return 'mailto:' + encodeURIComponent(E.to).replace(/%2C/g, ',') + '?' + (E.cc ? 'cc=' + encodeURIComponent(E.cc) + '&' : '') + 'subject=' + encodeURIComponent(E.subject) + '&body=' + encodeURIComponent(body); };
    var u = url(E.text);
    /* long lists are too much for a mail link: copy the list and open a short email to paste it into */
    if (u.length > 1900) { copyRich(E.html, E.text).then(function () {}, function () {}); u = url('(The condition list was copied - paste it here with Ctrl+V.)'); say('The list is long, so it was copied - paste it into the email that opens (Ctrl+V).'); }
    else say('Your email program opens with ' + E.count + ' conditions - check it and press Send.');
    window.location.href = u;
  }
  function condPaste(replace) {
    var ta = document.getElementById('mtBcondPaste'), raw = ta && ta.value; if (!raw || !raw.trim()) { say('Paste the rows first.'); return; }
    var L = parseCondTable(raw) || parseApproval(raw).conds;
    if (!L || !L.length) { say('No conditions were found in what was pasted. Copy the rows including the header row (Condition Name, External Description, Prior To...).'); return; }
    var s = drafts.commit;
    if (replace) s.conditions = L.concat(s.conditions.filter(function (c) { return c.lib && c.on; }));
    else L.forEach(function (c) { if (!s.conditions.some(function (x) { return x.text === c.text && x.cat === c.cat; })) s.conditions.push(c); });
    ta.value = ''; persist(); scheduleVersion('commit'); renderForm(); refresh();
    say(L.length + ' conditions ' + (replace ? 'in place' : 'added') + ' (' + L.filter(function (c) { return c.on; }).length + ' kept for the borrower, ' + L.filter(function (c) { return c.done; }).length + ' already received). Untick any you do not want in the letter.');
  }
  function parseApproval(text) {
    var T = String(text || '').replace(/\r/g, ''), o = {conds: []};
    var grid = parseCondTable(T); if (grid) { o.conds = grid; return o; }
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
      var price = N(s.price), value = N(s.value) || price, basis = N(s.ltvValue) || Math.min(price || value, value || price), base = N(s.base) || basis * (1 - N(s.downPct) / 100), ltv = basis ? base / basis : 0, n = N(s.termYears) * 12, fha = /fha|203/i.test(s.program || ''), va = /\bva\b/i.test(s.program || '');
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
        '<fieldset><legend>Loan</legend><div class="g">' + field(b, 'program', 'Program', {list: ['FHA', 'FHA 203(k)', 'Conventional', 'HomeStyle', 'VA', 'USDA']}) + field(b, 'termYears', 'Term (years)') + field(b, 'price', 'Purchase price', {type: 'money'}) + field(b, 'value', 'Appraised / as-is value', {type: 'money'}) + field(b, 'ltvValue', 'Value for LTV (renovation: value basis; blank = lower of price and value)', {type: 'money', wide: 1}) +
        field(b, 'downPct', 'Down payment (%)', {type: 'pct'}) + field(b, 'base', 'Base loan (blank = price less down)', {type: 'money'}) + field(b, 'ufmip', 'UFMIP (%) - FHA only', {type: 'pct'}) +
        field(b, 'miRate', 'Annual MIP / PMI (%) - FHA blank uses the HUD table', {type: 'pct'}) + field(b, 'payment', 'Monthly payment (for reserves)', {type: 'money'}) + '</div></fieldset>' +
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

  /* ===================================================================== LOGO */
  /* a logo is resized in the browser and kept with the draft; the last one uploaded is offered to the other builders */
  var LOGO_KEY = 'mt.builder.logo';
  function savedLogo() { try { return localStorage.getItem(LOGO_KEY) || ''; } catch (e) { return ''; } }
  function logoBlock(b) {
    var s = drafts[b], other = savedLogo();
    return '<fieldset><legend>Logo</legend><div class="row">' + (s.logo ? '<img src="' + s.logo + '" alt="Current logo" style="max-height:52px;max-width:200px;background:#fff;padding:4px;border-radius:6px">' : '<span class="note" style="margin:0">No logo on this document.</span>') +
      '<label class="btn">' + (s.logo ? 'Replace logo' : 'Upload logo') + '<input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" data-a="logo" data-b="' + b + '" aria-label="Upload a logo"></label>' +
      (s.logo ? '<button type="button" class="x" data-a="logoRm" data-b="' + b + '">Remove</button>' : other ? '<button type="button" class="btn" data-a="logoReuse" data-b="' + b + '">Use the last logo uploaded</button>' : '') + '</div>' +
      (s.logo ? '<div class="g" style="margin-top:8px">' + field(b, 'logoSize', 'Logo size', {type: 'select', options: [['36', 'Small'], ['52', 'Medium'], ['72', 'Large'], ['96', 'Extra large']]}) + field(b, 'logoPos', 'Placement', {type: 'select', options: [['left', 'Left of the name'], ['center', 'Centered above'], ['right', 'Top right']]}) + '</div>' : '') +
      '<p class="note">PNG, JPG, GIF, WebP or SVG. It is resized and kept in this browser with the draft.</p></fieldset>';
  }
  function loadLogo(b, fl) {
    if (!drafts[b] || !/^image\//.test(fl.type)) { say('Choose an image file for the logo.'); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || 600, h = img.naturalHeight || 200, k = Math.min(1, 640 / w, 320 / h), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k)); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        var url = cv.toDataURL('image/png'); if (url.length > 350000) { var c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; var x = c2.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c2.width, c2.height); x.drawImage(cv, 0, 0); url = c2.toDataURL('image/jpeg', .9); }
        drafts[b].logo = url; if (!drafts[b].logoSize) drafts[b].logoSize = '52'; if (!drafts[b].logoPos) drafts[b].logoPos = 'left';
        try { localStorage.setItem(LOGO_KEY, url); } catch (e) {}
        persist(); renderForm(); refresh(true);
      };
      img.onerror = function () { say('That image could not be read - try a PNG or JPG.'); };
      img.src = rd.result;
    };
    rd.readAsDataURL(fl);
  }
  function logoImg(s) { return s.logo ? '<img class="lg" src="' + s.logo + '" alt="" style="height:' + (N(s.logoSize) || 52) + 'px">' : ''; }
  /* a header with the logo where the user placed it: left of the name, centered above, or top right */
  function logoHead(s, left, right, cls) {
    var im = logoImg(s), pos = s.logoPos || 'left'; if (pos === 'center' && / m\b/.test(' ' + cls)) pos = 'left';
    if (!im) return '<div class="' + cls + '"><div>' + left + '</div><div>' + right + '</div></div>';
    if (pos === 'center') return '<div class="lgc">' + im + '</div><div class="' + cls + '"><div>' + left + '</div><div>' + right + '</div></div>';
    if (pos === 'right') return '<div class="' + cls + '"><div>' + left + '</div><div style="text-align:right">' + im.replace('class="lg"', 'class="lg" style="margin-left:auto;margin-bottom:6px;height:' + (N(s.logoSize) || 52) + 'px"') + right + '</div></div>';
    return '<div class="' + cls + '"><div class="lgrow">' + im + '<div>' + left + '</div></div><div>' + right + '</div></div>';
  }
  var CSS_LOGO = '.lg{display:block;max-width:2.8in;object-fit:contain}.lgc{text-align:center;margin:0 0 8px}.lgc .lg{margin:0 auto}.lgrow{display:flex;gap:12px;align-items:center}';

  /* ============================================================ PAY STATEMENT */
  /* Moved here from the Income Calculator's Documents tab (55.x). Withholding: IRS Pub 15-T annualised percentage method;
     New York State, NYC and Yonkers annual tables; NY SDI and Paid Family Leave. Every rate is editable - the tables change each January. */
  var PAY_PPY = {Weekly: 52, 'Bi-Weekly': 26, 'Semi-Monthly': 24, Monthly: 12};
  var FED_SD = {single: 16100, mfj: 32200, hoh: 24150};
  var FED_BR = {single: [[0, .10], [12400, .12], [50400, .22], [105700, .24], [201775, .32], [256225, .35], [640600, .37]],
    mfj: [[0, .10], [24800, .12], [100800, .22], [211400, .24], [403550, .32], [512450, .35], [768700, .37]],
    hoh: [[0, .10], [17700, .12], [67450, .22], [105700, .24], [201750, .32], [256200, .35], [640600, .37]]};
  var NY_SD = {single: 8000, mfj: 16050};
  var NY_BR = {single: [[0, .04], [8500, .045], [11700, .0525], [13900, .055], [80650, .06], [215400, .0685], [1077550, .0965], [5000000, .103], [25000000, .109]],
    mfj: [[0, .04], [17150, .045], [23600, .0525], [27900, .055], [161550, .06], [323200, .0685], [2155350, .0965], [5000000, .103], [25000000, .109]]};
  var NYC_BR = {single: [[0, .03078], [12000, .03762], [25000, .03819], [50000, .03876]], mfj: [[0, .03078], [21600, .03762], [45000, .03819], [90000, .03876]]};
  var YONKERS = .1675;
  function bracketTax(income, table, div) { var d = div || 1, inc = Math.max(0, income), tax = 0; for (var i = table.length - 1; i >= 0; i--) { var floor = table[i][0] / d; if (inc > floor) { tax += (inc - floor) * table[i][1]; inc = floor; } } return tax; }
  var PAY_STYLES = [['classic', 'Classic earnings statement - framed sections'], ['modern', 'Modern - color header, cards and net pay panel'], ['compact', 'Compact stub - half page, earnings beside deductions']];
  B.pay = {
    label: 'Pay statement', sub: 'Withholding, YTD, logo',
    init: function () {
      var S = G('S'), w = S && S.w2 && S.w2[0] || {}, f = file(), end = new Date(); end.setHours(0, 0, 0, 0);
      var start = new Date(end); start.setDate(end.getDate() - 13); var pay = new Date(end); pay.setDate(end.getDate() + 5);
      var hourly = /hour/i.test(w.freq || '') || !w.freq;
      return {style: 'classic', logo: savedLogo(), logoSize: '52', logoPos: 'left', empName: w.employer || '', empAddr: '', empEin: '', empPhone: '',
        eeName: (S && S.b1) || f.borrowers[0] || '', eeAddr: '', eeSsn: '', eeId: '', dept: '', freq: hourly ? 'Bi-Weekly' : (PAY_PPY[w.freq] ? w.freq : 'Bi-Weekly'), payType: hourly ? 'hourly' : 'salary',
        rate: hourly && N(w.rate) ? String(N(w.rate)) : '', salary: !hourly && N(w.rate) ? String(N(w.rate) * (PAY_PPY[w.freq] || 26)) : '', hours: hourly && N(w.hours) ? String(N(w.hours) * 2) : '80',
        pStart: dateFromPicker(iso(start)), pEnd: dateFromPicker(iso(end)), payDate: dateFromPicker(iso(pay)), periodNo: '', checkNo: '', deposit: '',
        otHrs: '', otMult: '1.5', dtHrs: '', ptoHrs: '', holHrs: '', earn: [],
        fedFiling: 'single', fedStep2: false, fedCredit: '', fedOtherInc: '', fedDed: '', fedExtra: '',
        state: 'NY', nyFiling: 'single', nyAllow: '0', nyExtra: '', locality: 'none', nycAllow: '0', otherState: '', otherRate: '', otherSdiPct: '', otherSdiLbl: 'State disability',
        k401: '', med: '', hsa: '', fsa: '', post: [], ytdMode: 'auto', ytdBase: '', ytdOt: '', ytdComm: '', ytdBonus: '', ytdOther: '',
        rSs: '6.2', rSsCap: '184500', rMedi: '1.45', rMediAdd: '0.9', rMediAddOver: '200000', rSdiPct: '0.5', rSdiWeekCap: '0.60', rPflPct: '0.388', rPflCap: '354.53'};
    },
    ppy: function (s) { return PAY_PPY[s.freq] || 26; },
    period: function (s) { if (N(s.periodNo)) return Math.max(1, Math.min(B.pay.ppy(s), Math.round(N(s.periodNo)))); var d = parseDate(s.payDate) || parseDate(s.pEnd); if (!d) return 1; var day = Math.round((d - new Date(d.getFullYear(), 0, 1)) / 864e5) + 1; return Math.max(1, Math.min(B.pay.ppy(s), Math.round(day / (365 / B.pay.ppy(s))))); },
    calc: function (s) {
      var ppy = B.pay.ppy(s), per = B.pay.period(s), prior = per - 1, hrs = N(s.hours), sal = s.payType === 'salary';
      var perPeriod = sal ? N(s.salary) / ppy : N(s.rate) * hrs, hourly = sal ? (hrs ? perPeriod / hrs : N(s.salary) / 2080) : N(s.rate);
      var ptoH = N(s.ptoHrs) + N(s.holHrs), pto = hourly * ptoH, regular = sal ? Math.max(0, perPeriod - pto) : perPeriod;
      var ot = hourly * (N(s.otMult) || 1.5) * N(s.otHrs), dt = hourly * 2 * N(s.dtHrs);
      var kind = function (l) { return /commiss/i.test(l) ? 'comm' : /bonus/i.test(l) ? 'bonus' : 'other'; };
      var E = [{k: 'base', lbl: sal ? 'Salary' : 'Regular', hrs: sal ? (hrs ? hrs - ptoH : null) : hrs, rate: sal ? null : hourly, amt: regular}];
      if (ptoH) E.push({k: 'base', lbl: 'PTO / Holiday', hrs: ptoH, rate: hourly, amt: pto});
      if (N(s.otHrs)) E.push({k: 'ot', lbl: 'Overtime', hrs: N(s.otHrs), rate: hourly * (N(s.otMult) || 1.5), amt: ot});
      if (N(s.dtHrs)) E.push({k: 'ot', lbl: 'Double Time', hrs: N(s.dtHrs), rate: hourly * 2, amt: dt});
      (s.earn || []).forEach(function (e) { if (N(e.amt)) E.push({k: kind(e.label || ''), lbl: e.label || 'Other Earnings', hrs: null, rate: null, amt: N(e.amt)}); });
      var gross = E.reduce(function (t, r) { return t + r.amt; }, 0);
      var k401 = N(s.k401), s125 = N(s.med) + N(s.hsa) + N(s.fsa), fedTaxable = Math.max(0, gross - k401 - s125), ficaTaxable = Math.max(0, gross - s125);
      var div = s.fedStep2 ? 2 : 1, filing = FED_SD[s.fedFiling] ? s.fedFiling : 'single';
      var fedAnnual = Math.max(0, bracketTax(fedTaxable * ppy + N(s.fedOtherInc) - N(s.fedDed) - FED_SD[filing] / div, FED_BR[filing], div) - N(s.fedCredit));
      var fedWH = fedAnnual / ppy + N(s.fedExtra);
      var ssWage = Math.min(ficaTaxable, Math.max(0, N(s.rSsCap) - ficaTaxable * prior)), ss = ssWage * N(s.rSs) / 100, medi = ficaTaxable * N(s.rMedi) / 100;
      if (ficaTaxable * per > N(s.rMediAddOver)) medi += Math.min(ficaTaxable, ficaTaxable * per - N(s.rMediAddOver)) * N(s.rMediAdd) / 100;
      var taxes = [{lbl: 'Federal Income Tax', amt: fedWH}, {lbl: 'Social Security (OASDI)', amt: ss}, {lbl: 'Medicare', amt: medi}];
      if (s.state === 'NY') {
        var nf = NY_SD[s.nyFiling] ? s.nyFiling : 'single', nyTax = bracketTax(Math.max(0, fedTaxable * ppy - NY_SD[nf] - 1000 * N(s.nyAllow)), NY_BR[nf]) / ppy + N(s.nyExtra);
        taxes.push({lbl: 'NY State Income Tax', amt: nyTax});
        if (s.locality === 'nyc') taxes.push({lbl: 'NYC Resident Tax', amt: bracketTax(Math.max(0, fedTaxable * ppy - 1000 * N(s.nycAllow)), NYC_BR[nf]) / ppy});
        if (s.locality === 'yonkers') taxes.push({lbl: 'Yonkers Resident Tax', amt: nyTax * YONKERS});
        var weeks = 52 / ppy; taxes.push({lbl: 'NY Disability (SDI)', amt: Math.min(gross * N(s.rSdiPct) / 100, N(s.rSdiWeekCap) * weeks)});
        taxes.push({lbl: 'NY Paid Family Leave', amt: Math.min(gross * N(s.rPflPct) / 100, Math.max(0, N(s.rPflCap) - gross * N(s.rPflPct) / 100 * prior))});
      } else if (s.state === 'other') {
        if (N(s.otherRate)) taxes.push({lbl: (s.otherState ? stateAbbr(s.otherState) + ' ' : 'State ') + 'Income Tax', amt: fedTaxable * N(s.otherRate) / 100});
        if (N(s.otherSdiPct)) taxes.push({lbl: s.otherSdiLbl || 'State disability', amt: gross * N(s.otherSdiPct) / 100});
      }
      var preList = [[k401, '401(k) Pre-Tax'], [N(s.med), 'Medical (Sec. 125)'], [N(s.hsa), 'HSA'], [N(s.fsa), 'FSA']].filter(function (x) { return x[0]; }).map(function (x) { return {lbl: x[1], amt: x[0]}; });
      var postList = (s.post || []).filter(function (p) { return N(p.amt); }).map(function (p) { return {lbl: p.label || 'Deduction', amt: N(p.amt)}; });
      var sum = function (a) { return a.reduce(function (t, x) { return t + x.amt; }, 0); }, taxTotal = sum(taxes), preTotal = sum(preList), postTotal = sum(postList), net = gross - taxTotal - preTotal - postTotal;
      var auto = s.ytdMode !== 'manual', cur = {base: 0, ot: 0, comm: 0, bonus: 0, other: 0}; E.forEach(function (e) { cur[e.k] += e.amt; });
      var ytdE = {}; ['base', 'ot', 'comm', 'bonus', 'other'].forEach(function (k) { ytdE[k] = auto ? cur[k] * per : N(s['ytd' + k.charAt(0).toUpperCase() + k.slice(1)]); });
      var ytdGross = ytdE.base + ytdE.ot + ytdE.comm + ytdE.bonus + ytdE.other, scale = gross && !auto ? ytdGross / (gross * per) : 1;
      var yt = function (a) { return a.map(function (t) { return {lbl: t.lbl, amt: t.amt * per * scale}; }); }, ytdTax = yt(taxes), ytdPre = yt(preList), ytdPost = yt(postList);
      var ytdNet = ytdGross - sum(ytdTax) - sum(ytdPre) - sum(ytdPost);
      /* each earnings row's YTD: its share of its kind's YTD */
      E.forEach(function (e) { e.ytd = cur[e.k] ? ytdE[e.k] * e.amt / cur[e.k] : 0; });
      return {E: E, gross: gross, hourly: hourly, taxes: taxes, preList: preList, postList: postList, taxTotal: taxTotal, preTotal: preTotal, postTotal: postTotal, net: net, per: per, ppy: ppy, ytdE: ytdE, ytdGross: ytdGross, ytdTax: ytdTax, ytdPre: ytdPre, ytdPost: ytdPost, ytdTaxTotal: sum(ytdTax), ytdNet: ytdNet, annual: gross * ppy};
    },
    form: function () {
      var b = 'pay', s = drafts[b], sal = s.payType === 'salary', list = function (k, title, add, ph) { return '<fieldset><legend>' + title + '</legend><div class="list">' + (s[k] || []).map(function (r, i) { return '<div class="g" style="grid-template-columns:1fr 130px auto;margin-bottom:5px"><input list="mtBpay' + k + '" data-b="pay" data-list="' + k + '" data-i="' + i + '" data-f="label" value="' + esc(r.label) + '" aria-label="Description" placeholder="' + ph + '" autocomplete="off"><input inputmode="decimal" data-b="pay" data-list="' + k + '" data-i="' + i + '" data-f="amt" value="' + esc(r.amt) + '" placeholder="0.00" aria-label="Amount this period"><button type="button" class="x" data-a="rm" data-b="pay" data-list="' + k + '" data-i="' + i + '" aria-label="Remove">×</button></div>'; }).join('') + '</div><button type="button" class="btn" data-a="add" data-b="pay" data-list="' + k + '">' + add + '</button></fieldset>'; };
      return dropZone('payfile', 'Drop a pay stub', 'Reads the employer, employee, pay date, period, rate, hours, gross and year-to-date earnings.') +
        '<fieldset><legend>Layout</legend><div class="g">' + field(b, 'style', 'Style', {type: 'select', options: PAY_STYLES, wide: 1}) + '</div></fieldset>' + logoBlock(b) +
        '<fieldset><legend>Employer</legend><div class="g">' + field(b, 'empName', 'Employer name', {wide: 1}) + field(b, 'empAddr', 'Employer address', {wide: 1, addrLine: 1}) + field(b, 'empEin', 'EIN') + field(b, 'empPhone', 'Phone') + '</div></fieldset>' +
        '<fieldset><legend>Employee</legend><div class="g">' + field(b, 'eeName', 'Employee name', {wide: 1}) + field(b, 'eeAddr', 'Employee address', {wide: 1, addrLine: 1}) + field(b, 'eeSsn', 'SSN (last 4 only)', {ph: '1234'}) + field(b, 'eeId', 'Employee ID') + field(b, 'dept', 'Department / title') + field(b, 'deposit', 'Direct deposit account (last 4)', {ph: '6789'}) + '</div></fieldset>' +
        '<fieldset><legend>Pay period</legend><div class="g">' + field(b, 'freq', 'Pay frequency', {type: 'select', options: ['Weekly', 'Bi-Weekly', 'Semi-Monthly', 'Monthly']}) + field(b, 'payType', 'Paid', {type: 'select', options: [['hourly', 'Hourly'], ['salary', 'Salary']]}) +
        field(b, 'pStart', 'Period start', {type: 'date'}) + field(b, 'pEnd', 'Period end', {type: 'date'}) + field(b, 'payDate', 'Pay date', {type: 'date'}) + field(b, 'periodNo', 'Pay period # of the year (blank = from the pay date)', {ph: String(B.pay.period(s))}) + field(b, 'checkNo', 'Check / advice #') + '</div></fieldset>' +
        '<fieldset><legend>Earnings this period</legend><div class="g">' + (sal ? field(b, 'salary', 'Annual salary', {type: 'money'}) : field(b, 'rate', 'Hourly rate', {type: 'money'})) + field(b, 'hours', 'Hours this period') +
        field(b, 'otHrs', 'Overtime hours') + field(b, 'otMult', 'Overtime multiplier') + field(b, 'dtHrs', 'Double-time hours') + field(b, 'ptoHrs', 'PTO hours') + field(b, 'holHrs', 'Holiday hours') + '</div><div id="mtBpay"></div></fieldset>' +
        list('earn', 'Other earnings this period (commission, bonus, tips…)', '+ Add earnings', 'Commission') + '<datalist id="mtBpayearn"><option value="Commission"><option value="Bonus"><option value="Tips"><option value="Shift differential"><option value="Retro pay"><option value="Reimbursement"></datalist>' +
        '<fieldset><legend>Withholding</legend><div class="g">' + field(b, 'fedFiling', 'Federal filing status', {type: 'select', options: [['single', 'Single / MFS'], ['mfj', 'Married filing jointly'], ['hoh', 'Head of household']]}) + field(b, 'fedStep2', 'W-4 Step 2 (two jobs) checked', {type: 'check'}) +
        field(b, 'fedCredit', 'W-4 Step 3 credits ($/yr)', {type: 'money'}) + field(b, 'fedOtherInc', 'W-4 Step 4a other income', {type: 'money'}) + field(b, 'fedDed', 'W-4 Step 4b deductions', {type: 'money'}) + field(b, 'fedExtra', 'Extra federal per period', {type: 'money'}) +
        field(b, 'state', 'State tax', {type: 'select', options: [['NY', 'New York (state tables, SDI, PFL)'], ['other', 'Another state - flat rate'], ['none', 'No state income tax']], wide: 1}) +
        (s.state === 'NY' ? field(b, 'nyFiling', 'NY filing status', {type: 'select', options: [['single', 'Single'], ['mfj', 'Married']]}) + field(b, 'nyAllow', 'NY allowances (IT-2104)') + field(b, 'locality', 'Locality', {type: 'select', options: [['none', 'None - NY State only'], ['nyc', 'New York City resident'], ['yonkers', 'Yonkers resident']]}) + (s.locality === 'nyc' ? field(b, 'nycAllow', 'NYC allowances') : '') + field(b, 'nyExtra', 'Extra NY per period', {type: 'money'}) : '') +
        (s.state === 'other' ? field(b, 'otherState', 'State', {list: STATE_NAMES}) + field(b, 'otherRate', 'State income tax (% of taxable pay)', {type: 'pct'}) + field(b, 'otherSdiLbl', 'Other state deduction label', {list: ['State disability', 'SUI / SDI', 'Paid family leave', 'Local income tax']}) + field(b, 'otherSdiPct', 'Its rate (% of gross)', {type: 'pct'}) : '') + '</div></fieldset>' +
        '<fieldset><legend>Deductions before tax</legend><div class="g">' + field(b, 'k401', '401(k)', {type: 'money'}) + field(b, 'med', 'Medical / dental (Sec. 125)', {type: 'money'}) + field(b, 'hsa', 'HSA', {type: 'money'}) + field(b, 'fsa', 'FSA', {type: 'money'}) + '</div></fieldset>' +
        list('post', 'Deductions after tax', '+ Add deduction', 'Roth 401(k)') + '<datalist id="mtBpaypost"><option value="Roth 401(k)"><option value="401(k) loan"><option value="Union dues"><option value="Garnishment"><option value="Life insurance"><option value="Charity"></datalist>' +
        '<fieldset><legend>Year to date</legend><div class="g">' + field(b, 'ytdMode', 'Year-to-date figures', {type: 'select', options: [['auto', 'This period x the pay period number'], ['manual', 'Enter them (from a real stub)']], wide: 1}) +
        (s.ytdMode === 'manual' ? field(b, 'ytdBase', 'YTD regular / salary', {type: 'money'}) + field(b, 'ytdOt', 'YTD overtime', {type: 'money'}) + field(b, 'ytdComm', 'YTD commission', {type: 'money'}) + field(b, 'ytdBonus', 'YTD bonus', {type: 'money'}) + field(b, 'ytdOther', 'YTD other', {type: 'money'}) : '') + '</div>' +
        '<div class="row" style="margin-top:8px"><button type="button" class="btn" data-a="payToCalc">Send to the Income Calculator employment record</button></div></fieldset>' +
        '<details><summary class="note" style="cursor:pointer;margin:0 0 8px">Tax rate table - 2026 figures; edit each January</summary><fieldset><div class="g">' + field(b, 'rSs', 'Social Security %', {type: 'pct'}) + field(b, 'rSsCap', 'SS wage base', {type: 'money'}) + field(b, 'rMedi', 'Medicare %', {type: 'pct'}) + field(b, 'rMediAdd', 'Additional Medicare %', {type: 'pct'}) + field(b, 'rMediAddOver', 'Additional Medicare over', {type: 'money'}) +
        field(b, 'rSdiPct', 'NY SDI %', {type: 'pct'}) + field(b, 'rSdiWeekCap', 'NY SDI weekly cap', {type: 'money'}) + field(b, 'rPflPct', 'NY PFL %', {type: 'pct'}) + field(b, 'rPflCap', 'NY PFL annual cap', {type: 'money'}) + '</div></fieldset></details>';
    },
    side: function () { var c = B.pay.calc(drafts.pay), el = $('mtBpay'); if (el) el.innerHTML = '<div class="kv"><span>Gross pay</span><b>' + usd(c.gross) + '</b><span>Taxes</span><b>' + usd(c.taxTotal) + '</b><span>Deductions</span><b>' + usd(c.preTotal + c.postTotal) + '</b><span>Net pay</span><b>' + usd(c.net) + '</b><span>Period ' + c.per + ' of ' + c.ppy + ' - YTD gross</span><b>' + usd(c.ytdGross) + '</b><span>Annualized gross</span><b>' + usd(c.annual) + '</b></div>'; },
    doc: function (s) {
      var c = B.pay.calc(s), st = s.style || 'classic', d = function (x) { return esc(when(x, slashDate)) || '-'; }, m = function (v) { return usd(v); };
      var earnRows = c.E.map(function (e) { return '<tr><td>' + esc(e.lbl) + '</td><td class="n">' + (e.rate ? m(e.rate) : '') + '</td><td class="n">' + (e.hrs ? (+e.hrs).toFixed(2) : '') + '</td><td class="n">' + m(e.amt) + '</td><td class="n">' + m(e.ytd) + '</td></tr>'; }).join('');
      var dedRows = function (list, ytd) { return list.map(function (t, i) { return '<tr><td>' + esc(t.lbl) + '</td><td class="n">' + m(t.amt) + '</td><td class="n">' + m(ytd[i].amt) + '</td></tr>'; }).join(''); };
      var fil = {single: 'Single / MFS', mfj: 'Married filing jointly', hoh: 'Head of household'}[s.fedFiling] + (s.fedStep2 ? ' - Step 2' : '');
      var stateInfo = s.state === 'NY' ? 'NY ' + (s.nyFiling === 'mfj' ? 'Married' : 'Single') + ' - ' + N(s.nyAllow) + ' allow.' + (s.locality === 'nyc' ? ' - NYC' : s.locality === 'yonkers' ? ' - Yonkers' : '') : s.state === 'other' ? (stateAbbr(s.otherState) || 'State') + ' ' + (N(s.otherRate) || 0) + '%' : 'No state tax';
      var emp = '<div class="en">' + esc(s.empName || 'Employer name') + '</div><div class="ea">' + esc(s.empAddr || '') + (s.empEin ? ' &middot; EIN ' + esc(s.empEin) : '') + (s.empPhone ? ' &middot; ' + esc(s.empPhone) : '') + '</div>';
      var hdr = '<div class="tt">' + (st === 'compact' ? 'PAY STUB' : 'EARNINGS STATEMENT') + '</div><div>Pay date <b>' + d(s.payDate) + '</b></div><div>Period ' + d(s.pStart) + ' - ' + d(s.pEnd) + '</div><div>Pay period ' + c.per + ' of ' + c.ppy + (s.checkNo ? ' &middot; No. ' + esc(s.checkNo) : '') + '</div>';
      var eeTbl = '<table class="ee"><tr><td><span>Employee</span><b>' + esc(s.eeName || '') + '</b></td><td><span>Employee ID</span><b>' + esc(s.eeId || '') + '</b></td><td><span>SSN</span><b>' + (s.eeSsn ? 'XXX-XX-' + esc(String(s.eeSsn).replace(/\D/g, '').slice(-4)) : '') + '</b></td><td><span>Pay frequency</span><b>' + esc(s.freq) + (s.payType === 'salary' ? ' salary' : ' hourly') + '</b></td></tr>' +
        '<tr><td colspan="2"><span>Address</span><b>' + esc(s.eeAddr || '') + '</b></td><td><span>Federal</span><b>' + esc(fil) + '</b></td><td><span>State</span><b>' + esc(stateInfo) + '</b></td></tr>' + (s.dept ? '<tr><td colspan="4"><span>Department / title</span><b>' + esc(s.dept) + '</b></td></tr>' : '') + '</table>';
      var earnT = '<table class="t"><thead><tr><th>Earnings</th><th class="n">Rate</th><th class="n">Hours</th><th class="n">Current</th><th class="n">Year to date</th></tr></thead><tbody>' + earnRows + '<tr class="tot"><td>Gross pay</td><td></td><td></td><td class="n">' + m(c.gross) + '</td><td class="n">' + m(c.ytdGross) + '</td></tr></tbody></table>';
      var taxT = '<table class="t"><thead><tr><th>Taxes</th><th class="n">Current</th><th class="n">Year to date</th></tr></thead><tbody>' + dedRows(c.taxes, c.ytdTax) + '<tr class="tot"><td>Total taxes</td><td class="n">' + m(c.taxTotal) + '</td><td class="n">' + m(c.ytdTaxTotal) + '</td></tr></tbody></table>';
      var dedT = c.preList.length || c.postList.length ? '<table class="t"><thead><tr><th>Deductions</th><th class="n">Current</th><th class="n">Year to date</th></tr></thead><tbody>' + dedRows(c.preList, c.ytdPre) + dedRows(c.postList, c.ytdPost) + '</tbody></table>' : '';
      var netBox = '<div class="net"><div><b>Net pay</b><div class="sm">Year-to-date net ' + m(c.ytdNet) + ' &middot; gross ' + m(c.ytdGross) + (s.deposit ? ' &middot; Direct deposit to account ending ' + esc(String(s.deposit).replace(/\D/g, '').slice(-4)) : '') + '</div></div><div class="nv">' + m(c.net) + '</div></div>';
      var foot = '<p class="ft">Prepared as a worksheet illustration. Federal withholding uses the IRS Publication 15-T annualised percentage method' + (s.state === 'NY' ? '; New York State, New York City and Yonkers use the annual tables with the allowances shown. NY disability is capped at ' + m(s.rSdiWeekCap) + ' a week and Paid Family Leave at ' + m(s.rPflCap) + ' a year' : s.state === 'other' ? '; state tax is a flat rate as entered' : '') + '. Confirm the current tables before relying on the withholding figures.</p>';
      if (st === 'modern') return page('cal', logoHead(s, emp, hdr, 'ph m') + eeTbl + '<div class="cols"><div>' + earnT + '</div><div>' + taxT + dedT + '</div></div>' + netBox + foot, CSS_PAY + CSS_LOGO);
      if (st === 'compact') return page('cal', '<div class="cmp">' + logoHead(s, emp, hdr, 'ph c') + eeTbl + '<div class="cols"><div>' + earnT + '</div><div>' + taxT + dedT + '</div></div>' + netBox + foot + '</div><div class="cut">detach here</div>', CSS_PAY + CSS_LOGO);
      return page('cal', logoHead(s, emp, hdr, 'ph') + eeTbl + '<div class="cols"><div>' + earnT + '</div><div>' + taxT + dedT + '</div></div>' + netBox + foot, CSS_PAY + CSS_LOGO);
    }
  };
  var CSS_PAY = '.pg{padding:.55in .6in}.ph{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid #444;padding-bottom:8px;margin-bottom:10px}.ph .en{font-size:15pt;font-weight:800}.ph .ea{font-size:8.5pt;color:#555;margin-top:2px}.ph>div:last-child{text-align:right;font-size:9pt;line-height:1.45}.ph .tt{font-size:12pt;font-weight:800;letter-spacing:.06em}' +
    '.ph.m{background:#1f3a5f;color:#fff;border:0;margin:-.55in -.6in 12px;padding:.35in .6in .2in}.ph.m .ea{color:#d6e2f2}.ph.c{border-bottom:1px solid #444;padding-bottom:5px;margin-bottom:6px}.ph.c .en{font-size:12pt}' +
    'table{width:100%;border-collapse:collapse;font-size:9pt}table.ee{border:1px solid #999;margin-bottom:10px}table.ee td{border:1px solid #ccc;padding:3px 6px;vertical-align:top}table.ee span{display:block;font-size:7pt;color:#666;text-transform:uppercase;letter-spacing:.04em}table.ee b{font-weight:600}' +
    '.cols{display:grid;grid-template-columns:1.35fr 1fr;gap:10px;align-items:start}table.t{border:1px solid #999;margin-bottom:8px}table.t th{background:#5f5f5f;color:#fff;text-align:left;padding:3px 6px;font-weight:600}table.t td{padding:3px 6px;border-top:1px solid #e3e3e3}.n{text-align:right;white-space:nowrap}tr.tot td{font-weight:700;background:#efefef;border-top:1px solid #999}' +
    '.net{display:flex;justify-content:space-between;align-items:center;border:1px solid #999;background:#fde9d9;padding:8px 12px;margin-top:4px}.net .nv{font-size:17pt;font-weight:700}.net .sm{font-size:8.5pt;color:#444;margin-top:2px}.ft{font-size:7.5pt;color:#555;line-height:1.4;margin-top:8px}' +
    '.ph.m~table.ee{border-color:#1f3a5f}.ph.m~.cols table.t th{background:#1f3a5f}.ph.m~.net{background:#e8f0fb;border-color:#1f3a5f}' +
    '.cmp{border:1px solid #999;padding:10px 12px}.cmp table{font-size:8pt}.cmp .cols{gap:8px}.cut{border-top:1px dashed #999;margin-top:14px;text-align:center;font-size:7pt;color:#999;letter-spacing:.2em;text-transform:uppercase}';
  /* send the stub's YTD to the Income Calculator's employment record (here, or the next time the calculator opens) */
  var PAY_PENDING = 'mt.pay.pending';
  function payRecord() { var s = drafts.pay, c = B.pay.calc(s), ppy = B.pay.ppy(s), hourly = s.payType !== 'salary', end = parseDate(s.pEnd) || parseDate(s.payDate) || new Date();
    return {employer: s.empName, employee: s.eeName, freq: hourly ? 'Hourly' : s.freq, rate: hourly ? N(s.rate) : N(s.salary) / ppy, hours: hourly ? Math.round(N(s.hours) * ppy / 52 * 100) / 100 : N(s.hours) * ppy / 52, ytdThru: iso(end), base: c.ytdE.base, ot: c.ytdE.ot, comm: c.ytdE.comm, bonus: c.ytdE.bonus, other: c.ytdE.other}; }
  function applyW2(rec) {
    /* only on the Income Calculator page: the Full Suite still carries a hidden copy of the old built-in calculator */
    if (window.mortgageSuite && mortgageSuite.store) return false;
    var S = G('S'), newW2 = G('newW2'); if (!S || !S.w2 || typeof newW2 !== 'function') return false;
    var r2 = function (v) { return Math.round(N(v) * 100) / 100; }, blank = function (x) { return !(x.employer || '').trim() && !N(x.rate); };
    var j = rec.employer && S.w2.filter(function (x) { return (x.employer || '').trim().toLowerCase() === rec.employer.trim().toLowerCase(); })[0] || S.w2.filter(blank)[0];
    if (!j) { j = newW2(); S.w2.push(j); }
    j.employer = rec.employer || j.employer; j.freq = rec.freq; j.rate = r2(rec.rate); j.hours = r2(rec.hours) || j.hours; j.ytdThru = rec.ytdThru || j.ytdThru;
    ['base', 'ot', 'comm', 'bonus', 'other'].forEach(function (k) { j.y1[k] = r2(rec[k]); });
    if (rec.employee && !S.b1) { S.b1 = rec.employee; S.borrower = rec.employee; var el = document.getElementById('b1Name'); if (el) el.value = rec.employee; }
    try { G('renderW2')(); G('RECALC')(); } catch (e) {}
    return true;
  }
  function payToCalc() {
    var rec = payRecord();
    if (applyW2(rec)) { close(); try { G('switchTab')('w2'); } catch (e) {} say('Pay stub applied to the employment record - year-to-date figures loaded.'); return; }
    try { localStorage.setItem(PAY_PENDING, JSON.stringify(rec)); } catch (e) {}
    say('Saved - the year-to-date figures go into the employment record when the Income Calculator opens.');
  }
  /* on the Income Calculator, a stub sent from the Full Suite is applied once */
  setTimeout(function () { var p = null; try { p = JSON.parse(localStorage.getItem(PAY_PENDING) || 'null'); } catch (e) {} if (p && applyW2(p)) { try { localStorage.removeItem(PAY_PENDING); } catch (e) {} say('Pay statement from the Document Builder applied to the employment record.'); } }, 2500);
  function parseGift(text) {
    var T = String(text || '').replace(/\r/g, ''), o = {}, g = function (re) { return grab(T, re).replace(/_{2,}/g, '').trim(); };
    o.type = /gift\s*of\s*equity/i.test(T) ? 'equity' : /source\s*of\s*funds|bank\s*name/i.test(T) ? 'full' : /up\s*to\s*\$/i.test(T) ? 'conv' : /gift\s*letter/i.test(T) ? 'gov' : '';
    o.upTo = /up\s*to\s*\$/i.test(T);
    var am = T.match(/(?:amount[^$]{0,25}?|gift(?:\s*of\s*equity)?[^$]{0,90}?)\$\s?([\d,]+(?:\.\d{1,2})?)/i); if (am) { var raw = am[1]; o.amount = /,\d{2}$/.test(raw) ? N(raw.replace(/,(\d{2})$/, '.$1')) : N(raw); }
    /* the printed forms' labels first, then the looser ones people type in an email or notes ("Donor: …", "Relationship: …") */
    var d = {name: g(/Donor[’'`]?s?\s*name\s*:?[ \t]*([^\n]+)/i) || g(/^[ \t]*(?:Gift\s*)?Donor[ \t]*:[ \t]*([^\n]+)/im), relationship: g(/Relationship\s*to\s*Borrower\s*:?[ \t]*([^\n]+)/i) || g(/gift\s*of\s*equity\s*to\s*our\s+([A-Za-z ]{3,30}?)\s*\(/i) || g(/^[ \t]*Relationship[ \t]*:[ \t]*([^\n]+)/im),
      addr: g(/Street\s*address\s*:?[ \t]*([^\n]+)/i), phone: g(/Donor[’'`]?s?\s*Tele?phone\s*:?[ \t]*([\d() .\-]{7,})/i), email: ''};
    var cz = T.match(/City\s*:?[ \t]*([A-Za-z .'-]{2,40}?)[ \t_]*State\s*:?[ \t]*([A-Z]{2})[ \t_]*Zip\s*:?[ \t]*(\d{5})/); if (cz) { d.city = cz[1].trim(); d.state = cz[2]; d.zip = cz[3]; }
    if (!d.addr) { var da = g(/^[ \t]*Donor[’'`]?s?[ \t]*(?:mailing[ \t]*)?address[ \t]*:[ \t]*([^\n]+)/im); if (da) { var sp = splitAddr(da); d.addr = sp.address || da; if (sp.city) { d.city = sp.city; d.state = sp.state; d.zip = sp.zip; } } }
    if (d.name || d.relationship || d.addr) o.donor = d;
    var pm = T.match(/property\s*located\s*at\s*:?\s*\n\s*([^\n]+)\n\s*([A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5})/i); if (pm) o.addr = splitAddr(pm[1].trim() + ', ' + pm[2].trim());
    else { var pq = T.match(/for\s*the\s*purchase\s*of\s*([^\n]{6,120}?\d{5})/i); if (pq) o.addr = splitAddr(pq[1].replace(/,?\s+([A-Z]{2})\s+(\d{5})$/, ', $1 $2')); }
    var bm = T.match(/recipient\.?\s*\n([\s\S]{2,160}?)\n\s*This\s*gift\s*is\s*to\s*be\s*applied/i); if (bm) o.borrowers = bm[1].split('\n').map(function (x) { return x.trim(); }).filter(function (x) { return /^[A-Z][A-Za-z.'-]+(?: [A-Za-z.'-]+){1,3}$/.test(x); }).slice(0, 4);
    o.bankName = g(/Bank\s*Name\s*:?[ \t]*([^\n]+)/i); o.acctNo = g(/Account\s*No\.?\s*:?[ \t]*([0-9Xx*\-]{4,})/i); o.bankAddr = g(/Bank\s*Address\s*:?[ \t]*([^\n]+)/i); o.transferDate = g(/Date\s*Funds\s*Transferred\s*:?[ \t_]*([^\n]+)/i);
    var ty = T.match(/\[\s*x\s*\]\s*(Checking|Savings|Other)/i); if (ty) o.acctType = ty[1].charAt(0).toUpperCase() + ty[1].slice(1).toLowerCase();
    return o;
  }
  function parsePay(text) {
    var T = String(text || '').replace(/\r/g, ''), o = {}, D = '(\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}|[A-Z][a-z]{2,8}\\.?\\s+\\d{1,2},?\\s+\\d{4})', g = function (re) { return grab(T, re); };
    var top = T.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    o.empName = top.filter(function (l) { return !/earnings|statement|pay\s*(stub|date|period)|advice|employee|period|page|^\d|ssn|social/i.test(l) && /[A-Za-z]{3}/.test(l) && l.length < 60; })[0] || '';
    o.eeName = (g(/Employee(?:\s*Name)?\s*:?[ \t]*([A-Z][A-Za-z.'-]+(?: [A-Z][A-Za-z.'-]+){1,3})/) || g(/\bName\s*:?[ \t]*([A-Z][A-Za-z.'-]+(?: [A-Z][A-Za-z.'-]+){1,3})/)).replace(/\s+(Employee|ID|SSN|Pay|Date|Dept|Department)\b.*$/, '');
    o.eeId = g(/Employee\s*(?:ID|#|No\.?)\s*:?\s*([A-Z0-9-]{3,})/i); o.empEin = g(/EIN\s*:?\s*(\d{2}-?\d{7})/i);
    o.payDate = g(new RegExp('(?:Pay|Check|Advice)\\s*Date\\s*:?\\s*' + D, 'i'));
    var per = T.match(new RegExp('(?:Pay\\s*)?Period(?:\\s*(?:Beginning|Start|Dates?))?\\s*:?\\s*' + D + '\\s*(?:-|–|to|through|thru)\\s*(?:Period\\s*End(?:ing)?\\s*:?\\s*)?' + D, 'i'));
    if (per) { o.pStart = per[1]; o.pEnd = per[2]; } else { o.pStart = g(new RegExp('Period\\s*(?:Beginning|Start)\\s*:?\\s*' + D, 'i')); o.pEnd = g(new RegExp('Period\\s*(?:Ending|End)\\s*:?\\s*' + D, 'i')); }
    o.freq = /semi-?\s*monthly/i.test(T) ? 'Semi-Monthly' : /bi-?\s*weekly/i.test(T) ? 'Bi-Weekly' : /\bweekly\b/i.test(T) ? 'Weekly' : /\bmonthly\b/i.test(T) ? 'Monthly' : '';
    var num = '\\$?\\s?([\\d,]+\\.\\d{2,4})', line = function (re) { var m = T.match(re); return m ? m.slice(1).map(N) : null; };
    var reg = line(new RegExp('(?:Regular|Reg\\.?\\s*Pay|Salary|Hourly)[^\\n\\d$]{0,50}' + num + '\\s+([\\d.]+)\\s+' + num + '\\s+' + num, 'i'));
    if (reg) { o.rate = reg[0]; o.hours = reg[1]; o.current = reg[2]; o.ytdBase = reg[3]; }
    var ot = line(new RegExp('Overtime[^\\n\\d$]{0,50}' + num + '\\s+([\\d.]+)\\s+' + num + '\\s+' + num, 'i')); if (ot) { o.otHrs = ot[1]; o.otMult = ot[0] && o.rate ? +(ot[0] / o.rate).toFixed(2) : ''; o.ytdOt = ot[3]; }
    var gross = line(new RegExp('Gross\\s*(?:Pay|Earnings|Wages)?[^\\n\\d$]{0,50}' + num + '\\s+' + num, 'i')); if (gross) { o.gross = gross[0]; o.ytdGross = gross[1]; }
    ['Commission', 'Bonus'].forEach(function (k) { var x = line(new RegExp(k + '[^\\n\\d$]{0,50}' + num + '\\s+' + num, 'i')); if (x) o['ytd' + (k === 'Commission' ? 'Comm' : 'Bonus')] = x[1], o[k.toLowerCase()] = x[0]; });
    if (!o.rate) { o.rate = N(g(/(?:Hourly\s*)?Rate\s*:?\s*\$?\s?([\d,]+\.\d{2,4})/i)) || ''; o.hours = N(g(/(?:Regular\s*)?Hours\s*:?\s*([\d.]+)/i)) || ''; }
    return o;
  }

  /* ============================================================== GIFT LETTER */
  /* Four letters: Conventional ("up to" amount), Government (exact amount), Full (with the source of funds) and Gift of equity.
     Up to 4 borrowers and 4 donors; every section can be turned off and every sentence reworded. */
  var GIFT_TYPES = [['conv', 'Conventional gift letter - "in an amount of up to"'], ['gov', 'Government gift letter (FHA / VA / USDA) - exact amount'], ['full', 'Full gift letter - with the source of funds'], ['equity', 'Gift of equity letter - seller / owner to buyer']];
  var GIFT_REL = ['Mother', 'Father', 'Parents', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandmother', 'Grandfather', 'Grandparents', 'Aunt', 'Uncle', 'Spouse', 'Husband', 'Wife', 'Fiancé(e)', 'Domestic partner', 'Cousin', 'Godparent', 'Employer', 'Labor union', 'Close friend', 'Charitable organization', 'Government agency'];
  var GIFT_OPT = [
    ['oCertify', 'Opening line ("I/We do hereby certify to the following")', 1, 'all'],
    ['oNoRepay', 'No repayment expected or implied', 1, 'all'],
    ['oSource', 'Source of funds (bank, account, transfer date)', 0, 'full'],
    ['oRel', 'Relationship to borrower', 1, 'all'],
    ['oDonorAddr', 'Donor address', 1, 'all'],
    ['oDonorPhone', 'Donor telephone', 1, 'all'],
    ['oBorrInfo', 'Borrower address and telephone', 0, 'equity'],
    ['oOwners', 'Donors are the legal owners (gift of equity)', 0, 'equity'],
    ['oPrice', 'Sales price and gift of equity amounts', 0, 'equity'],
    ['oNotLoan', 'The gift is not a loan and was not borrowed', 0, 'gov'],
    ['oNoInterest', 'Donor is not a party with an interest in the sale', 0, 'none'],
    ['oNote', 'Certification note (funds not from the seller, agent, builder or loan officer)', 1, 'all'],
    ['oDonorSig', 'Donor signature lines', 1, 'all'],
    ['oBorrSig', 'Borrower signature lines', 1, 'all'],
    ['oFooter', 'Footer line', 1, 'all']];
  function giftDefaults(type) { var o = {}; GIFT_OPT.forEach(function (x) { o[x[0]] = !!x[2] || x[3] === type; }); if (type === 'gov') o.oNotLoan = true; if (type === 'equity') { o.oOwners = true; o.oPrice = true; o.oBorrInfo = true; o.oNote = false; } return o; }
  B.gift = {
    label: 'Gift letter', sub: 'Conventional, government, full, equity',
    init: function (type) {
      var f = file(), t = type || 'conv', d = {type: t, logo: '', logoSize: '52', logoPos: 'center', title: '', date: dateFromPicker(iso()), amount: '', upTo: t === 'conv', purpose: 'purchase', price: f.price || '', loanProgram: f.program || '',
        borrowers: f.borrowers.length ? f.borrowers.map(function (n) { return {name: n, addr: '', phone: ''}; }) : [{name: '', addr: '', phone: ''}],
        donors: [{name: '', relationship: '', addr: '', city: '', state: '', zip: '', phone: '', email: ''}],
        address: f.address, city: f.city, state: stateName(f.state), zip: f.zip, county: f.county, addrFree: '',
        bankName: '', acctType: 'Checking', acctNo: '', bankAddr: '', transferDate: '', transferTo: 'Borrower', extra: [''], certText: '', giftText: '', noteText: '', footerLeft: '', footerRight: ''};
      var o = giftDefaults(t); for (var k in o) d[k] = o[k];
      return d;
    },
    fix: function (s) { if (!s.donors) s.donors = [{name: ''}]; if (!s.extra) s.extra = ['']; },
    form: function () {
      var b = 'gift', s = drafts[b], eq = s.type === 'equity';
      var multi = function (k, title, max, cols, extra) {
        var arr = s[k] = s[k] || [{}];
        return '<fieldset><legend>' + title + ' (up to ' + max + ')</legend><div class="list">' + arr.map(function (p, i) {
          var a = function (f) { return ' data-b="gift" data-list="' + k + '" data-i="' + i + '" data-f="' + f + '"'; };
          return '<div class="it"><div class="hd"><b style="flex:1">' + title.replace(/s$/, '') + ' ' + (i + 1) + '</b>' + (arr.length > 1 ? '<button type="button" class="x" data-a="rm" data-b="gift" data-list="' + k + '" data-i="' + i + '">Remove</button>' : '') + '</div><div class="g" style="margin-top:6px">' +
            cols.map(function (c) { var o = c[2] || {}, v = p[c[0]] == null ? '' : p[c[0]];
              return '<label class="f' + (o.wide ? ' w' : '') + '">' + c[1] + '<input type="text"' + a(c[0]) + (o.list ? ' list="mtBgl-' + c[0] + '"' : '') + (o.addr ? ' data-addr-item="1"' : '') + (o.addrLine ? ' data-addr-line="1"' : '') + ' value="' + esc(v) + '" placeholder="' + esc(o.ph || (o.list ? 'Pick or type' : '')) + '" autocomplete="off"></label>'; }).join('') + '</div></div>';
        }).join('') + '</div>' + (arr.length < max ? '<button type="button" class="btn" data-a="add" data-b="gift" data-list="' + k + '">+ Add ' + title.toLowerCase().replace(/s$/, '') + '</button>' : '') + (extra || '') + '</fieldset>';
      };
      var opts = GIFT_OPT.map(function (x) { return field(b, x[0], x[1], {type: 'check', wide: 1}); }).join('');
      return dropZone('giftfile', 'Drop a gift letter', 'Reads the amount, borrowers, donor, relationship, addresses, phone and the bank, account and transfer date.') +
        '<fieldset><legend>Letter</legend><div class="g">' + field(b, 'type', 'Type of gift letter', {type: 'select', options: GIFT_TYPES, wide: 1}) +
        '<div class="w note" style="margin:-2px 0 2px">Changing the type turns on that type\'s usual sections; each one can still be turned on or off below.</div>' +
        field(b, 'title', 'Title (blank = the type\'s title)', {wide: 1, ph: eq ? 'GIFT OF EQUITY LETTER' : 'Gift Letter'}) + field(b, 'date', 'Letter date (optional)', {type: 'date'}) + field(b, 'loanProgram', 'Loan program (optional)', {list: ['Conventional', 'FHA', 'FHA 203(k)', 'VA', 'USDA', 'HomeStyle', 'Jumbo']}) + '</div></fieldset>' + logoBlock(b) +
        '<fieldset><legend>Gift</legend><div class="g">' + field(b, 'amount', eq ? 'Gift of equity ($)' : 'Gift amount ($)', {type: 'money', ph: 'Leave blank for a blank line'}) + (s.type === 'conv' ? field(b, 'upTo', 'Say "in an amount of up to"', {type: 'check'}) : '<span></span>') +
        field(b, 'purpose', 'Applied toward the', {list: ['purchase', 'refinance', 'down payment and closing costs', 'down payment', 'closing costs', 'construction'], ph: 'purchase'}) + (eq || s.oPrice ? field(b, 'price', 'Sales price ($)', {type: 'money'}) : '') + '</div><div id="mtBgift"></div></fieldset>' +
        multi('borrowers', 'Borrowers', 4, [['name', 'Name', {wide: 1}], ['addr', 'Address', {wide: 1, addrLine: 1}], ['phone', 'Telephone']]) +
        multi('donors', 'Donors', 4, [['name', 'Name', {wide: 1}], ['relationship', 'Relationship to borrower', {list: 1}], ['phone', 'Telephone'], ['addr', 'Street address - start typing for suggestions', {wide: 1, addr: 1}], ['city', 'City'], ['state', 'State'], ['zip', 'ZIP'], ['email', 'Email (optional)']]) +
        '<datalist id="mtBgl-relationship">' + GIFT_REL.map(function (r) { return '<option value="' + esc(r) + '">'; }).join('') + '</datalist>' + propertyBlock(b) +
        '<fieldset><legend>Source of funds</legend><div class="g">' + field(b, 'bankName', 'Bank name') + field(b, 'acctType', 'Type of account', {list: ['Checking', 'Savings', 'Money market', 'Brokerage', 'Certificate of deposit', 'Retirement']}) + field(b, 'acctNo', 'Account number (or last 4)') + field(b, 'transferDate', 'Date funds transferred', {type: 'date', ph: 'or "at closing"'}) + field(b, 'bankAddr', 'Bank address', {wide: 1, addrLine: 1}) +
        field(b, 'transferTo', 'Funds go to', {list: ['Borrower', 'Closing agent / title company', 'Escrow / attorney', 'At closing']}) + '</div><p class="note">Printed when "Source of funds" is on below.</p></fieldset>' +
        '<fieldset><legend>Sections - turn each on or off</legend>' + opts + '</fieldset>' +
        '<fieldset><legend>Other statements</legend><div class="list">' + s.extra.map(function (c, i) { return '<div class="it"><div class="hd"><b style="flex:1">Statement ' + (i + 1) + '</b>' + (s.extra.length > 1 ? '<button type="button" class="x" data-a="rm" data-b="gift" data-list="extra" data-i="' + i + '">Remove</button>' : '') + '</div><textarea data-b="gift" data-list="extra" data-i="' + i + '" rows="2" placeholder="Any other statement, in your words">' + esc(c) + '</textarea></div>'; }).join('') +
        '</div><button type="button" class="btn" data-a="add" data-b="gift" data-list="extra">+ Add a statement</button></fieldset>' +
        '<fieldset class="wd"><legend>Wording - blank keeps the standard text</legend><div class="g">' + field(b, 'certText', 'Opening line', {wide: 1, ph: 'I/We do hereby certify to the following:'}) + field(b, 'giftText', 'Gift statement', {type: 'textarea', wide: 1, rows: 3, ph: B.gift.stmt(s, true)}) +
        field(b, 'noteText', 'Certification note', {type: 'textarea', wide: 1, rows: 3, ph: GIFT_NOTE}) + field(b, 'footerLeft', 'Footer, left', {ph: B.gift.foot(s)}) + field(b, 'footerRight', 'Footer, right', {ph: 'e.g. Rev. 01.2027'}) + '</div></fieldset>';
    },
    foot: function (s) { return {conv: 'Gift Letter - Conventional', gov: 'Gift Letter - Government', full: 'Gift Letter', equity: 'Gift of Equity Letter'}[s.type] || 'Gift Letter'; },
    amt: function (s, blank) { return N(s.amount) ? usd(s.amount) : blank ? '$________________' : '$________________'; },
    /* the main sentence, built from the type, the amount and the borrowers */
    stmt: function (s, plain) {
      var many = (s.donors || []).filter(function (d) { return d.name; }).length > 1, we = many ? 'We' : 'I/We', amt = N(s.amount) ? usd(s.amount) : '$____________';
      if (s.type === 'equity') { var rel = (s.donors || []).map(function (d) { return d.relationship; }).filter(Boolean); return 'We have made a gift of equity to our ' + (rel.length ? joinNames(rel.filter(function (x, i) { return rel.indexOf(x) === i; })).toLowerCase() : '________________') + ' (relationship) in the amount of ' + amt + ' for the ' + (s.purpose || 'purchase') + ' of ' + (addrOf(s) || '________________') + '.'; }
      var rep = s.oNoRepay ? (s.type === 'conv' ? ' No repayment of this gift is expected or implied, either in the form of cash or future services from the recipient.' : ', and no repayment of this gift is expected or implied either in the form of cash or future services of the recipient.') : '.';
      if (s.type === 'conv') return we + ' (Donor) have made a gift to the Borrower(s) named below in an amount of ' + (s.upTo ? 'up to ' : '') + amt + '.' + (s.oNoRepay ? rep : '');
      return we + ' (Donor) have made a gift of ' + amt + ' dollars to the Borrower(s) named below' + rep;
    },
    side: function () { var s = drafts.gift, el = $('mtBgift'); if (!el) return; var p = N(s.price), a = N(s.amount);
      el.innerHTML = '<div class="kv"><span>Gift</span><b>' + (a ? usd(a) : '-') + '</b>' + (p ? '<span>Sales price</span><b>' + usd(p) + '</b><span>Gift as % of price</span><b>' + (a ? pct(a / p, 2) : '-') + '</b>' + (s.type === 'equity' ? '<span>Price less gift of equity</span><b>' + usd(p - a) + '</b>' : '') : '') + '<span>Borrowers / donors</span><b>' + names(s.borrowers).length + ' / ' + (s.donors || []).filter(function (d) { return d.name; }).length + '</b></div>'; },
    doc: function (s) {
      var eq = s.type === 'equity', bor = (s.borrowers || []).filter(function (p) { return p && p.name; }), don = (s.donors || []).filter(function (d) { return d && (d.name || d.relationship); });
      if (!don.length) don = [{}]; var u = function (v, w) { return '<span class="ul" style="min-width:' + (w || 2) + 'in">' + esc(v || '') + '</span>'; };
      var stmt = s.giftText || B.gift.stmt(s), extra = (s.extra || []).filter(function (x) { return x && x.trim(); });
      var lines = [];
      if (s.oNotLoan) lines.push('This gift is not a loan. No part of these funds was borrowed, and the gift will not be repaid in any form.');
      if (s.oNoInterest) lines.push('The donor is not the seller, real estate agent, builder, developer or any other party with an interest in the sale of the property.');
      if (eq && s.oOwners) lines.push('We further verify we are the legal owners of said property and are therefore able to give this gift of equity.' + (s.oNoRepay ? ' No repayment of this gift is expected or implied either in the form of cash or future services of the recipient.' : ''));
      if (eq && s.oPrice && (N(s.price) || N(s.amount))) lines.push('The sales price of the property is ' + (N(s.price) ? usd(s.price) : '$____________') + ', and the gift of equity of ' + (N(s.amount) ? usd(s.amount) : '$____________') + ' is to be credited to the borrower(s) at closing' + (N(s.price) && N(s.amount) ? ', leaving ' + usd(N(s.price) - N(s.amount)) + ' as the balance of the price' : '') + '.');
      lines = lines.concat(extra);
      var lg = s.logo ? '<div class="glg glg-' + (s.logoPos || 'center') + '"><img class="lg" src="' + s.logo + '" alt="" style="height:' + (N(s.logoSize) || 52) + 'px"></div>' : '';
      var note = s.oNote ? '<p class="nt">* Please Note: ' + esc(s.noteText || GIFT_NOTE) + '</p>' : '';
      var foot = s.oFooter ? '<div class="gf"><span>' + esc(s.footerLeft || B.gift.foot(s)) + '</span><span>' + esc(s.footerRight || '') + '</span></div>' : '';
      if (eq) {
        var rows = Math.max(bor.length, don.length, 1), info = '';
        for (var i = 0; i < rows; i++) { var bp = bor[i] || {}, dp = don[i] || {};
          info += '<table class="eqt"><tr><td>' + (i < bor.length || i === 0 ? '<div class="lnv">' + esc(bp.name || '') + '</div>Borrower\'s Name' + (s.oBorrInfo ? '<div class="lnv">' + esc(bp.addr || '') + '</div>Borrower\'s Address' + '<div class="lnv">' + esc(bp.phone || '') + '</div>Borrower\'s Telephone' : '') : '') + '</td>' +
            '<td>' + (i < don.length || i === 0 ? '<div class="lnv">' + esc(dp.name || '') + (dp.relationship && s.oRel ? ' <i>(' + esc(dp.relationship) + ')</i>' : '') + '</div>Donor\'s Name' + (s.oDonorAddr ? '<div class="lnv">' + esc(dp.addr || '') + '</div>Donor\'s Address<div class="lnv">' + esc([dp.city, [dp.state, dp.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')) + '</div>Donor\'s City, State, ZIP' : '') + (s.oDonorPhone ? '<div class="lnv">' + esc(dp.phone || '') + '</div>Donor\'s Telephone' : '') : '') + '</td></tr></table>'; }
        var sg = ''; for (var j = 0; j < rows; j++) sg += '<table class="eqs"><tr><td>' + (s.oBorrSig && (j < bor.length || j === 0) ? '<div class="lnv"></div><span>Signature of Borrower' + (bor[j] ? ' - ' + esc(bor[j].name) : '') + '</span><span>Date</span>' : '') + '</td><td>' + (s.oDonorSig && (j < don.length || j === 0) ? '<div class="lnv"></div><span>Signature of Donor' + (don[j] && don[j].name ? ' - ' + esc(don[j].name) : '') + '</span><span>Date</span>' : '') + '</td></tr></table>';
        return page('tnr', lg + '<h1 class="eqh">' + esc(s.title || 'GIFT OF EQUITY LETTER') + '</h1>' + (s.oCertify && s.certText ? '<p>' + esc(s.certText) + '</p>' : '') + '<p class="eqp">' + esc(stmt) + '</p>' + lines.map(function (l) { return '<p class="eqp">' + esc(l) + '</p>'; }).join('') +
          (s.oSource ? srcBlock(s, u) : '') + info + sg + note + (s.date ? '<p class="dt">Dated: ' + esc(when(s.date)) + '</p>' : '') + foot, CSS_GIFT);
      }
      var donors = don.map(function (d, i) { return (don.length > 1 ? '<p class="dh">Donor ' + (i + 1) + '</p>' : '') +
        (s.oRel ? '<p class="rw">Relationship to Borrower: ' + u(d.relationship, 4.6) + '</p>' : '') +
        '<p class="rw">Donor\'s name: ' + u(d.name, 5.3) + '</p>' + (s.oDonorAddr ? '<p class="rw">Street address: ' + u(d.addr, 5.1) + '</p><p class="rw">City: ' + u(d.city, 2.9) + ' State: ' + u(d.state, .8) + ' Zip: ' + u(d.zip, 1.1) + '</p>' : '') +
        (s.oDonorPhone ? '<p class="rw">Donor Telephone: ' + u(d.phone, 2.4) + (d.email ? ' &nbsp; Email: ' + u(d.email, 2.2) : '') + '</p>' : ''); }).join('');
      var sig = function (who, n) { return '<div class="sgr"><div><div class="ln"></div>* ' + who + (n ? ' - ' + esc(n) : '') + '</div><div><div class="ln"></div>Date</div></div>'; };
      var sigs = (s.oDonorSig ? don.map(function (d) { return sig('Donor Signature', d.name); }).join('') : '') + (s.oBorrSig ? (bor.length ? bor : [{}, {}]).map(function (b2) { return sig('Borrower Signature (Recipient)', b2.name); }).join('') + (bor.length === 1 ? sig('Borrower Signature (Recipient)', '') : '') : '');
      return page('ari', lg + '<h1 class="gh">' + esc(s.title || 'Gift Letter') + '</h1>' + (s.oCertify ? '<p>' + esc(s.certText || 'I/We do hereby certify to the following:') + '</p>' : '') + '<p>' + esc(stmt) + '</p>' +
        '<p class="bn">' + (bor.map(function (p) { return esc(p.name); }).join('<br>') || '&nbsp;') + '</p>' + (s.oBorrInfo ? bor.map(function (p) { return p.addr || p.phone ? '<p class="sm">' + esc(p.name) + ': ' + esc([p.addr, p.phone].filter(Boolean).join(' - ')) + '</p>' : ''; }).join('') : '') +
        '<p>This gift is to be applied toward the ' + esc(s.purpose || 'purchase') + ' of the property located at:</p><p class="pa">' + (String(s.addrFree || '').trim() ? esc(s.addrFree).replace(/\n/g, '<br>') : esc(s.address || '') + '<br>' + esc([s.city, [stateAbbr(s.state), s.zip].filter(Boolean).join('  ')].filter(Boolean).join(', '))) + '</p>' +
        lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + (s.oSource ? srcBlock(s, u) : '') + donors + '<div class="sgs">' + sigs + '</div>' + note + (s.date ? '<p class="dt">Dated: ' + esc(when(s.date)) + '</p>' : '') + foot, CSS_GIFT);
    }
  };
  var GIFT_NOTE = 'Upon the signature(s) of this gift letter, I/We hereby certify that any funds given to the homebuyer were not made available to the donor from any person or entity with an interest in the sale of the property including the seller, real estate agent, broker, builder, or loan officer, or any other entity associated with this transaction.';
  function srcBlock(s, u) { var ty = String(s.acctType || ''), std = ['Checking', 'Savings'], other = ty && std.indexOf(ty) < 0;
    return '<p class="sh">The source of funds for this gift is:</p><p class="rw">Bank Name: ' + u(s.bankName, 3.6) + '</p><p class="rw">Type of Account: [' + (ty === 'Checking' ? 'x' : '&nbsp;') + '] Checking &nbsp; [' + (ty === 'Savings' ? 'x' : '&nbsp;') + '] Savings &nbsp; [' + (other ? 'x' : '&nbsp;') + '] Other' + (other ? ': ' + esc(ty) : '') + '</p>' +
      '<p class="rw">Account No.: ' + u(s.acctNo, 3) + '</p><p class="rw">Bank Address: ' + u(s.bankAddr, 4.6) + '</p><p class="rw">Date Funds Transferred: ' + u(s.transferDate ? when(s.transferDate) : '', 2.2) + (s.transferTo ? ' &nbsp; To: ' + u(s.transferTo, 2) : '') + '</p>'; }
  var CSS_GIFT = '.pg{padding:.7in .85in .6in}h1.gh{text-align:center;font-size:17pt;margin:.1in 0 .3in}p{font-size:10pt;line-height:1.45;margin:0 0 .1in}p.bn{font-size:11.5pt;margin:.05in 0 .25in}p.pa{font-size:11.5pt;line-height:1.6;margin:0 0 .22in}p.sm{font-size:9.5pt;color:#333}p.rw{margin:0 0 .07in}p.sh{margin-top:.15in}p.dh{font-weight:700;margin:.15in 0 .05in}' +
    '.ul{display:inline-block;border-bottom:1px solid #000;padding:0 4px;vertical-align:bottom;min-height:15px}.sgs{margin-top:.25in}.sgr{display:grid;grid-template-columns:4.6in 1.6in;gap:.55in;margin:0 0 .22in;font-size:9.5pt}.sgr .ln{border-bottom:1px solid #000;height:26px;margin-bottom:2px}p.nt{font-size:9.5pt;line-height:1.3;margin-top:.15in}p.dt{font-size:9.5pt}.gf{display:flex;justify-content:space-between;font-size:7.5pt;color:#555;margin-top:.35in}' +
    'h1.eqh{text-align:center;font-size:13pt;letter-spacing:.06em;margin:.15in 0 .3in;font-variant:small-caps}p.eqp{font-size:12pt;line-height:1.9;text-align:justify;margin:0 0 .15in}table.eqt,table.eqs{width:100%;border-collapse:collapse;margin-top:.15in}table.eqt td,table.eqs td{width:50%;vertical-align:top;padding:0 .25in 0 0;font-size:11pt}table.eqt .lnv{border-bottom:1px solid #000;min-height:20px;margin-top:.18in;padding:0 2px;font-size:11pt}table.eqs .lnv{border-bottom:1px solid #000;height:30px;margin-top:.25in}table.eqs span{display:inline-block;font-size:11pt}table.eqs span+span{float:right}' +
    '.glg{margin:0 0 6px}.glg-center{text-align:center}.glg-center .lg{margin:0 auto}.glg-right .lg{margin-left:auto}';

  /* ===================================================== SCHEDULE C CASH FLOW */
  /* The self-employed income analysis the Income Calculator uses (Fannie Mae Form 1084 style): Schedule C line 31 plus the
     non-cash add-backs, less non-recurring income and the meals exclusion, for two tax years. A worksheet, not a tax form. */
  var SCHC_ROWS = [['net31', 'Line 31 - Net profit or (loss)', 1], ['depl12', 'Line 12 - Depletion', 1], ['depr13', 'Line 13 - Depreciation', 1], ['home30', 'Line 30 - Business use of home', 1],
    ['amort', 'Amortization / casualty loss (Part V)', 1], ['meals', 'Line 24b - Meals exclusion', -1], ['nonrec6', 'Line 6 - Non-recurring other income', -1]];
  function mileRate(yr) { var f = G('wsMileRate'); var r = typeof f === 'function' ? f(yr) : undefined; return r != null ? r : null; }
  B.schc = {
    label: 'Schedule C analysis', sub: 'Self-employed cash flow, 2 years',
    init: function () { var f = file(), y = new Date().getFullYear(); var blank = function (yr) { var o = {yr: String(yr), miles: '', rate: ''}; SCHC_ROWS.forEach(function (r) { o[r[0]] = ''; }); return o; };
      return {style: 'analysis', logo: '', logoSize: '52', logoPos: 'left', borrower: f.borrowers.join(' & '), business: '', ein: '', own: '100', preparer: '', prepDate: dateFromPicker(iso()), notes: '', y1: blank(y - 1), y2: blank(y - 2)}; },
    yearTotal: function (s, k) { var Y = s[k], t = 0; SCHC_ROWS.forEach(function (r) { t += r[2] * N(Y[r[0]]); }); var rate = Y.rate !== '' && Y.rate != null ? N(Y.rate) : (mileRate(Y.yr) || 0); return {base: t, mileage: N(Y.miles) * rate, rate: rate, total: t + N(Y.miles) * rate}; },
    calc: function (s) {
      var a = B.schc.yearTotal(s, 'y1'), b = B.schc.yearTotal(s, 'y2'), own = (N(s.own) || 100) / 100, one = !(b.total || SCHC_ROWS.some(function (r) { return N(s.y2[r[0]]); }) || N(s.y2.miles));
      /* a decline (older year higher) uses the most recent year alone; otherwise the two years are averaged (docs/v57 D9) */
      /* the first column is normally the most recent year; if the years were typed the other way round, go by the years */
      var swap = /^\d{4}$/.test(String(s.y1.yr).trim()) && /^\d{4}$/.test(String(s.y2.yr).trim()) && +s.y2.yr > +s.y1.yr, recent = swap ? b : a, prior = swap ? a : b;
      var declining = !one && prior.total > recent.total, annual = one ? a.total : declining ? recent.total : (a.total + b.total) / 2;
      return {y1: a, y2: b, one: one, declining: declining, recentYr: swap ? s.y2.yr : s.y1.yr, change: prior.total ? (recent.total - prior.total) / Math.abs(prior.total) : 0, annual: annual * own, monthly: annual * own / 12, own: own};
    },
    form: function () {
      var b = 'schc', s = drafts[b], yr = function (k) { var Y = s[k], a = function (f) { return ' data-b="schc" data-list="' + k + '" data-f="' + f + '"'; };
        return '<fieldset><legend>Tax year ' + esc(Y.yr || '') + (k === 'y1' ? ' (most recent)' : ' (prior)') + '</legend><div class="g"><label class="f">Tax year<input' + a('yr') + ' value="' + esc(Y.yr) + '" inputmode="numeric"></label><span></span>' +
          SCHC_ROWS.map(function (r) { return '<label class="f">' + r[1] + (r[2] < 0 ? ' (subtracted)' : '') + '<input inputmode="decimal"' + a(r[0]) + ' value="' + esc(Y[r[0]]) + '" placeholder="0.00"></label>'; }).join('') +
          '<label class="f">Business miles (Part IV line 44a)<input inputmode="decimal"' + a('miles') + ' value="' + esc(Y.miles) + '" placeholder="0"></label><label class="f">Depreciation per mile<input inputmode="decimal"' + a('rate') + ' value="' + esc(Y.rate) + '" placeholder="' + (mileRate(Y.yr) != null ? mileRate(Y.yr) : 'e.g. 0.30') + '"></label></div></fieldset>'; };
      return dropZone('schcfile', 'Drop a Schedule C (Form 1040)', 'Reads the tax year, net profit (line 31), depletion, depreciation, business use of home, meals and business miles.') +
        '<fieldset><legend>Business</legend><div class="g">' + field(b, 'style', 'Layout', {type: 'select', options: [['analysis', 'Cash-flow analysis - every line, both years'], ['summary', 'One-page summary']], wide: 1}) +
        field(b, 'borrower', 'Borrower', {wide: 1}) + field(b, 'business', 'Business name') + field(b, 'ein', 'EIN (optional)') + field(b, 'own', 'Ownership (%)', {type: 'pct'}) + field(b, 'preparer', 'Prepared by') + field(b, 'prepDate', 'Date', {type: 'date'}) + '</div>' +
        (G('S') && (G('S').schc || []).length ? '<div class="row" style="margin-top:8px"><button type="button" class="btn" data-a="schcPull">Pull from the Income Calculator\'s Schedule C</button></div>' : '') + '</fieldset>' + logoBlock(b) +
        yr('y1') + yr('y2') + '<fieldset><legend>Notes</legend>' + field(b, 'notes', 'Notes for the file', {type: 'textarea', wide: 1, rows: 3, ph: 'e.g. 2025 decline explained by a one-time equipment purchase'}) + '</fieldset><div id="mtBschc"></div>';
    },
    side: function () { var c = B.schc.calc(drafts.schc), el = $('mtBschc'); if (el) el.innerHTML = '<div class="kv"><span>' + esc(drafts.schc.y1.yr) + ' cash flow</span><b>' + usd(c.y1.total) + '</b>' + (c.one ? '' : '<span>' + esc(drafts.schc.y2.yr) + ' cash flow</span><b>' + usd(c.y2.total) + '</b><span>Change</span><b class="' + (c.declining ? 'warn' : '') + '">' + pct(c.change, 1) + '</b>') + '<span>Method</span><b>' + (c.one ? 'One year' : c.declining ? 'Declining - most recent year' : '24-month average') + '</b><span>Monthly qualifying income</span><b>' + usd(c.monthly) + '</b></div>'; },
    doc: function (s) {
      var c = B.schc.calc(s), row = function (lbl, v1, v2, cls) { return '<tr class="' + (cls || '') + '"><td>' + lbl + '</td><td class="n">' + v1 + '</td>' + (c.one ? '' : '<td class="n">' + v2 + '</td>') + '</tr>'; };
      var head = logoHead(s, '<div class="tt">Schedule C Cash-Flow Analysis</div><div class="sb">' + esc(s.borrower || '') + (s.business ? ' &middot; ' + esc(s.business) : '') + (s.ein ? ' &middot; EIN ' + esc(s.ein) : '') + '</div>', '<div class="sb">Prepared ' + esc(when(s.prepDate)) + (s.preparer ? '<br>' + esc(s.preparer) : '') + '</div>', 'hh');
      var body = s.style === 'summary' ? '' : SCHC_ROWS.map(function (r) { return row((r[2] < 0 ? 'Less: ' : r[0] === 'net31' ? '' : 'Plus: ') + esc(r[1]), usd(r[2] * N(s.y1[r[0]])), usd(r[2] * N(s.y2[r[0]]))); }).join('') +
        row('Plus: business miles x depreciation rate', usd(c.y1.mileage) + '<small>' + (N(s.y1.miles) ? ' (' + N(s.y1.miles).toLocaleString() + ' x ' + c.y1.rate + ')' : '') + '</small>', usd(c.y2.mileage) + '<small>' + (N(s.y2.miles) ? ' (' + N(s.y2.miles).toLocaleString() + ' x ' + c.y2.rate + ')' : '') + '</small>');
      return page('cal', head + '<table class="sc"><thead><tr><th></th><th class="n">' + esc(s.y1.yr) + '</th>' + (c.one ? '' : '<th class="n">' + esc(s.y2.yr) + '</th>') + '</tr></thead><tbody>' + body +
        row('<b>Cash flow</b>', '<b>' + usd(c.y1.total) + '</b>', '<b>' + usd(c.y2.total) + '</b>', 't') + '</tbody></table>' +
        '<table class="sm"><tr><td>Method</td><td>' + (c.one ? 'One year of returns - the most recent year is used' : c.declining ? 'Income declined (' + pct(c.change, 1) + ') - the most recent year (' + esc(c.recentYr) + ') is used, not the two-year average' : 'Stable or increasing - the 24-month average is used') + '</td></tr>' +
        '<tr><td>Ownership</td><td>' + esc(s.own || 100) + '%</td></tr><tr><td>Annual qualifying income</td><td><b>' + usd(c.annual) + '</b></td></tr><tr class="t"><td>Monthly qualifying income</td><td><b>' + usd(c.monthly) + '</b></td></tr></table>' +
        (s.notes ? '<p class="nt"><b>Notes:</b> ' + esc(s.notes).replace(/\n/g, '<br>') + '</p>' : '') +
        '<p class="ft">Worksheet prepared from the borrower\'s Schedule C (Form 1040) for income analysis. It is not a tax form. Confirm against the signed returns and IRS transcripts; a declining trend needs the lender\'s analysis that the income is stable.</p>', CSS_SCHC);
    }
  };
  var CSS_SCHC = '.pg{padding:.6in .7in}.hh{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1f3a5f;padding-bottom:8px;margin-bottom:14px}.hh .tt{font-size:17pt;font-weight:700;color:#1f3a5f}.hh .sb{font-size:9.5pt;color:#444;text-align:right}.hh>div:first-child .sb{text-align:left}' +
    'table{width:100%;border-collapse:collapse;font-size:10.5pt}table.sc th{background:#1f3a5f;color:#fff;padding:5px 8px;text-align:left}table.sc td{padding:5px 8px;border-bottom:1px solid #e1e6ee}table.sc td small{color:#666;font-size:8.5pt}.n{text-align:right;white-space:nowrap;width:1.6in}tr.t td{border-top:2px solid #1f3a5f;font-size:11pt}' +
    'table.sm{margin-top:16px;width:5.6in}table.sm td{padding:5px 8px;border-bottom:1px solid #e1e6ee}table.sm td:first-child{width:2in;color:#444}.nt{font-size:9.5pt;margin-top:12px}.ft{font-size:8pt;color:#555;margin-top:16px;line-height:1.4}';
  function schcPull() {
    var S = G('S'), list = (S && S.schc || []).filter(function (x) { return x.form === 'C' || !x.form; }); if (!list.length) { say('The Income Calculator has no Schedule C entries.'); return; }
    var x = list[0], s = drafts.schc; saveVersion('schc', 'Before pulling from the Income Calculator');
    ['y1', 'y2'].forEach(function (k) { var Y = x[k] || {}; s[k].yr = String(Y.yr || s[k].yr); SCHC_ROWS.forEach(function (r) { s[k][r[0]] = N(Y[r[0]]) ? String(Y[r[0]]) : ''; }); s[k].miles = N(Y.miles) ? String(Y.miles) : ''; s[k].rate = x.rate && mileRate(Y.yr) == null ? String(x.rate) : ''; });
    if (x.name) s.business = x.name; if (S.b1 && !s.borrower) s.borrower = S.b1;
    persist(); renderForm(); refresh(true); say('Schedule C' + (x.name ? ' for ' + x.name : '') + ' pulled from the Income Calculator' + (list.length > 1 ? ' (the first of ' + list.length + ' businesses)' : '') + '.');
  }
  function parseSchc(text) {
    var T = String(text || '').replace(/\r/g, ''), o = {}, amt = '\\(?-?\\$?\\s?([\\d,]+(?:\\.\\d{2})?)\\)?', g = function (re) { var m = T.match(re); if (!m) return ''; var v = N(m[1]); return /\(\s*\$?\s?[\d,.]+\s*\)/.test(m[0]) ? String(-v) : String(v); };
    o.yr = (T.match(/\b(20\d{2})\b/) || [])[1] || ''; o.business = (T.match(/Name of proprietor[^\n]*\n\s*([^\n]{3,60})/i) || T.match(/Business name[^\n]*\n\s*([^\n]{3,60})/i) || [])[1] || '';
    o.net31 = g(new RegExp('(?:^|\\n)\\s*31\\b[^\\n]*?(?:net profit|profit or \\(loss\\))[^\\n]*?' + amt + '\\s*$', 'im')) || g(new RegExp('Net profit or \\(loss\\)[^\\n]{0,120}?' + amt, 'i'));
    o.depl12 = g(new RegExp('(?:^|\\n)\\s*12\\b\\s*Depletion[^\\n]*?' + amt, 'i')); o.depr13 = g(new RegExp('(?:^|\\n)\\s*13\\b\\s*Depreciation[^\\n]*?' + amt, 'i'));
    o.home30 = g(new RegExp('(?:^|\\n)\\s*30\\b[^\\n]*?(?:business use of (?:your )?home)[^\\n]*?' + amt, 'i')); o.meals = g(new RegExp('24b\\b[^\\n]*?meals[^\\n]*?' + amt, 'i'));
    o.nonrec6 = ''; o.miles = (T.match(/44a?\b[^\n]*?business[^\n]*?(\d[\d,]{2,})/i) || [])[1] ? String(N(T.match(/44a?\b[^\n]*?business[^\n]*?(\d[\d,]{2,})/i)[1])) : '';
    return o;
  }

  /* ===================================================== LOAN ESTIMATE DRAFT */
  /* A working draft laid out like the Loan Estimate, filled from the loan file, for reviewing figures before the official
     disclosure is issued from the loan origination system. Clearly marked DRAFT - not a disclosure. */
  var LE_SECTIONS = [['A', 'Origination charges'], ['B', 'Services you cannot shop for'], ['C', 'Services you can shop for'], ['E', 'Taxes and other government fees'], ['F', 'Prepaids'], ['G', 'Initial escrow payment at closing'], ['H', 'Other']];
  var LE_MAP = {lenderOrigination: 'A', lenderProcessing: 'A', points: 'A', appraisal: 'B', creditReport: 'B', floodTaxService: 'B', titleInsurance: 'C', titleSearchSettlement: 'C', attorney: 'C', survey: 'C',
    recording: 'E', mortgageTax: 'E', transferBuyer: 'E', luxuryBuyer: 'E', prepaidInsurance: 'F', perDiem: 'F', prepaidTaxes: 'G', initialEscrow: 'G', inspections: 'H', other: 'H'};
  B.le = {
    label: 'Loan Estimate draft', sub: 'Terms, payments, costs A-J',
    init: function () {
      var f = file(), o = f.outputs || {}, L = o.loan || {}, P = o.payment || {}, C = o.closing || {}, a = f.inputs || {};
      var lines = {}; LE_SECTIONS.forEach(function (x) { lines[x[0]] = []; });
      (C.lines || []).filter(function (l) { return l.payer === 'buyer' && N(l.amount); }).forEach(function (l) { var sec = LE_MAP[l.key] || 'H'; lines[sec].push({label: l.label, amt: N(l.amount).toFixed(2)}); });
      var purchase = (o.purchase || {}).finalPurchasePrice || f.price;
      return {lender: '', loanId: '', applicants: f.borrowers.join(' & '), property: fullAddress(f), salePrice: purchase ? String(purchase) : '', date: dateFromPicker(iso()), purpose: a.transactionType || 'Purchase',
        product: (f.term || 30) + ' Year Fixed Rate', loanType: /fha/i.test(f.program) ? 'FHA' : /va/i.test(f.program) ? 'VA' : 'Conventional', lockStatus: 'Not locked', loanTerm: String(f.term || 30) + ' years',
        loanAmount: L.totalLoan ? N(L.totalLoan).toFixed(2) : f.loan ? String(f.loan) : '', rate: f.rate ? N(f.rate).toFixed(3) : '', pi: P.principalAndInterest ? N(P.principalAndInterest).toFixed(2) : f.pi ? N(f.pi).toFixed(2) : '',
        mi: f.mi ? N(f.mi).toFixed(2) : '', escrow: (N(f.taxes) + N(f.ins)) ? (N(f.taxes) + N(f.ins)).toFixed(2) : '', escrowTaxes: true, escrowIns: true, hoa: a.hoaMonthly ? String(a.hoaMonthly) : '',
        acquisition: (L.totalAcquisitionCost || purchase) ? N(L.totalAcquisitionCost || purchase).toFixed(2) : '', baseLoan: L.maximumBaseLoan ? N(L.maximumBaseLoan).toFixed(2) : '',
        deposit: f.emd ? String(f.emd) : '', sellerCredit: (o.purchase && N(o.purchase.sellerConcessionAllowed)) ? N(o.purchase.sellerConcessionAllowed).toFixed(2) : f.concession ? String(f.concession) : '', lenderCredit: '', lines: lines, notes: ''};
    },
    fix: function (s) { if (!s.lines) s.lines = {}; LE_SECTIONS.forEach(function (x) { if (!s.lines[x[0]]) s.lines[x[0]] = []; }); },
    calc: function (s) {
      var sec = {}; LE_SECTIONS.forEach(function (x) { sec[x[0]] = (s.lines[x[0]] || []).reduce(function (t, l) { return t + N(l.amt); }, 0); });
      var D = sec.A + sec.B + sec.C, I = sec.E + sec.F + sec.G + sec.H, J = D + I - N(s.lenderCredit);
      /* cash to close the v57 way: the borrower funds the purchase cost the loan does not cover, and a seller credit pays closing costs only */
      var downPayment = Math.max(0, N(s.acquisition) - N(s.baseLoan)), credit = Math.min(N(s.sellerCredit), Math.max(0, J)), unused = Math.max(0, N(s.sellerCredit) - credit);
      var cash = J + downPayment - N(s.deposit) - credit;
      var payment = N(s.pi) + N(s.mi) + N(s.escrow) ;
      return {sec: sec, D: D, I: I, J: J, downPayment: downPayment, credit: credit, unusedCredit: unused, cash: cash, payment: payment};
    },
    form: function () {
      var b = 'le', s = drafts[b], c = B.le.calc(s);
      var secForm = function (k, title) { var list = s.lines[k] || []; return '<fieldset><legend>' + k + '. ' + title + ' - ' + usd(c.sec[k]) + '</legend><div class="list">' + list.map(function (l, i) { var a = ' data-b="le" data-list="lines.' + k + '" data-i="' + i + '"'; return '<div class="g" style="grid-template-columns:1fr 120px auto;margin-bottom:5px"><input' + a + ' data-f="label" value="' + esc(l.label) + '" aria-label="Fee"><input inputmode="decimal"' + a + ' data-f="amt" value="' + esc(l.amt) + '" aria-label="Amount"><button type="button" class="x" data-a="leRm" data-k="' + k + '" data-i="' + i + '" aria-label="Remove">×</button></div>'; }).join('') + '</div><button type="button" class="btn" data-a="leAdd" data-k="' + k + '">+ Add a fee</button></fieldset>'; };
      return dropZone('lefile', 'Drop a fee sheet or Loan Estimate', 'Reads fee lines with amounts and sorts them into sections A-H.') +
        '<fieldset><legend>Loan</legend><div class="g">' + field(b, 'lender', 'Lender') + field(b, 'loanId', 'Loan ID #') + field(b, 'applicants', 'Applicants', {wide: 1}) + field(b, 'property', 'Property', {wide: 1, addrLine: 1}) +
        field(b, 'salePrice', 'Sale price', {type: 'money'}) + field(b, 'date', 'Date issued', {type: 'date'}) + field(b, 'purpose', 'Purpose', {list: ['Purchase', 'Refinance', 'Construction', 'Home equity']}) + field(b, 'product', 'Product', {list: ['30 Year Fixed Rate', '15 Year Fixed Rate', '20 Year Fixed Rate', '5/6 ARM', '7/6 ARM']}) +
        field(b, 'loanType', 'Loan type', {list: ['Conventional', 'FHA', 'VA', 'USDA']}) + field(b, 'loanTerm', 'Loan term') + field(b, 'lockStatus', 'Rate lock', {list: ['Not locked', 'Locked until …']}) + '</div></fieldset>' +
        '<fieldset><legend>Loan terms and payments</legend><div class="g">' + field(b, 'loanAmount', 'Loan amount (total)', {type: 'money'}) + field(b, 'rate', 'Interest rate (%)', {type: 'pct'}) + field(b, 'pi', 'Monthly principal & interest', {type: 'money'}) + field(b, 'mi', 'Mortgage insurance / month', {type: 'money'}) +
        field(b, 'escrow', 'Estimated escrow / month', {type: 'money'}) + field(b, 'hoa', 'HOA / other assessments / month', {type: 'money'}) + field(b, 'escrowTaxes', 'Escrow includes property taxes', {type: 'check'}) + field(b, 'escrowIns', 'Escrow includes homeowner\'s insurance', {type: 'check'}) + '</div></fieldset>' +
        LE_SECTIONS.map(function (x) { return secForm(x[0], x[1]); }).join('') +
        '<fieldset><legend>Calculating cash to close</legend><div class="g">' + field(b, 'acquisition', 'Purchase price + renovation (total cost)', {type: 'money'}) + field(b, 'baseLoan', 'Base loan (before financed fees)', {type: 'money'}) + field(b, 'deposit', 'Deposit', {type: 'money'}) +
        field(b, 'sellerCredit', 'Seller credit (allowed)', {type: 'money'}) + field(b, 'lenderCredit', 'Lender credits', {type: 'money'}) + field(b, 'notes', 'Notes', {type: 'textarea', wide: 1, rows: 2}) + '</div><div id="mtBle"></div></fieldset>';
    },
    side: function () { var c = B.le.calc(drafts.le), el = $('mtBle'); if (el) el.innerHTML = '<div class="kv"><span>D. Total loan costs</span><b>' + usd(c.D) + '</b><span>I. Total other costs</span><b>' + usd(c.I) + '</b><span>J. Total closing costs</span><b>' + usd(c.J) + '</b><span>Down payment / funds from borrower</span><b>' + usd(c.downPayment) + '</b><span>Seller credit applied</span><b>' + usd(c.credit) + '</b>' + (c.unusedCredit ? '<span class="warn">Seller credit not usable (above closing costs)</span><b class="warn">' + usd(c.unusedCredit) + '</b>' : '') + '<span>Estimated cash to close</span><b>' + usd(c.cash) + '</b></div>'; },
    doc: function (s) {
      var c = B.le.calc(s), m = function (v) { return usd(v, 0); }, secRows = function (k, title) { var list = (s.lines[k] || []).filter(function (l) { return l.label || N(l.amt); }); return '<tr class="sh"><td>' + k + '. ' + title + '</td><td class="n">' + m(c.sec[k]) + '</td></tr>' + list.map(function (l) { return '<tr><td class="i">' + esc(l.label) + '</td><td class="n">' + usd(l.amt) + '</td></tr>'; }).join(''); };
      var p1 = '<div class="dr">DRAFT - for review only. Not a Loan Estimate disclosure; the official Loan Estimate is issued from the loan origination system.</div>' +
        '<div class="hd"><div><div class="tt">Loan Estimate - working draft</div><table class="mt"><tr><td>Date issued</td><td>' + esc(when(s.date)) + '</td></tr><tr><td>Applicants</td><td>' + esc(s.applicants) + '</td></tr><tr><td>Property</td><td>' + esc(s.property) + '</td></tr><tr><td>Sale price</td><td>' + (N(s.salePrice) ? m(s.salePrice) : '') + '</td></tr></table></div>' +
        '<table class="mt"><tr><td>Loan term</td><td>' + esc(s.loanTerm) + '</td></tr><tr><td>Purpose</td><td>' + esc(s.purpose) + '</td></tr><tr><td>Product</td><td>' + esc(s.product) + '</td></tr><tr><td>Loan type</td><td>' + esc(s.loanType) + '</td></tr><tr><td>Loan ID #</td><td>' + esc(s.loanId) + '</td></tr><tr><td>Rate lock</td><td>' + esc(s.lockStatus) + '</td></tr></table></div>' +
        '<h3>Loan terms</h3><table class="bx"><tr><td>Loan amount</td><td class="n">' + usd(s.loanAmount) + '</td></tr><tr><td>Interest rate</td><td class="n">' + (N(s.rate) ? N(s.rate).toFixed(3) + '%' : '') + '</td></tr><tr><td>Monthly principal & interest</td><td class="n">' + usd(s.pi) + '</td></tr><tr><td>Prepayment penalty</td><td class="n">NO</td></tr><tr><td>Balloon payment</td><td class="n">NO</td></tr></table>' +
        '<h3>Projected payments</h3><table class="bx"><tr><td>Principal & interest</td><td class="n">' + usd(s.pi) + '</td></tr><tr><td>Mortgage insurance</td><td class="n">' + usd(s.mi) + '</td></tr><tr><td>Estimated escrow</td><td class="n">' + usd(s.escrow) + '</td></tr><tr class="t"><td>Estimated total monthly payment</td><td class="n">' + usd(c.payment) + '</td></tr>' +
        '<tr><td>Estimated taxes, insurance & assessments</td><td class="n">' + usd(N(s.escrow) + N(s.hoa)) + '<small> a month - in escrow: ' + [s.escrowTaxes ? 'property taxes' : '', s.escrowIns ? 'homeowner\'s insurance' : ''].filter(Boolean).join(', ') + (N(s.hoa) ? '; HOA dues paid separately' : '') + '</small></td></tr></table>' +
        '<h3>Costs at closing</h3><table class="bx"><tr><td>Estimated closing costs</td><td class="n">' + usd(c.J) + '</td></tr><tr class="t"><td>Estimated cash to close</td><td class="n">' + usd(c.cash) + '</td></tr></table>';
      var p2 = '<h3>Closing cost details</h3><div class="two"><table class="cd">' + secRows('A', 'Origination charges') + secRows('B', 'Services you cannot shop for') + secRows('C', 'Services you can shop for') + '<tr class="t"><td>D. Total loan costs (A + B + C)</td><td class="n">' + m(c.D) + '</td></tr></table>' +
        '<table class="cd">' + secRows('E', 'Taxes and other government fees') + secRows('F', 'Prepaids') + secRows('G', 'Initial escrow payment at closing') + secRows('H', 'Other') + '<tr class="t"><td>I. Total other costs (E + F + G + H)</td><td class="n">' + m(c.I) + '</td></tr>' +
        (N(s.lenderCredit) ? '<tr><td>Lender credits</td><td class="n">-' + m(s.lenderCredit) + '</td></tr>' : '') + '<tr class="t"><td>J. Total closing costs</td><td class="n">' + m(c.J) + '</td></tr></table></div>' +
        '<h3>Calculating cash to close</h3><table class="bx"><tr><td>Total closing costs (J)</td><td class="n">' + usd(c.J) + '</td></tr><tr><td>Down payment / funds from borrower</td><td class="n">' + usd(c.downPayment) + '</td></tr><tr><td>Deposit</td><td class="n">-' + usd(s.deposit) + '</td></tr><tr><td>Seller credits</td><td class="n">-' + usd(c.credit) + '</td></tr><tr class="t"><td>Estimated cash to close</td><td class="n">' + usd(c.cash) + '</td></tr></table>' +
        (c.unusedCredit ? '<p class="nt">A seller credit of ' + usd(s.sellerCredit) + ' was entered; only ' + usd(c.credit) + ' can be used because a seller credit pays closing costs and prepaids only - ' + usd(c.unusedCredit) + ' is not used.</p>' : '') +
        (s.notes ? '<p class="nt"><b>Notes:</b> ' + esc(s.notes) + '</p>' : '');
      return pages('ari', [p1, p2], CSS_LE);
    }
  };
  var CSS_LE = '.pg{padding:.55in .6in}.dr{background:#fff4d6;border:1px solid #e0b84a;color:#6b4e00;font-size:8.5pt;padding:5px 8px;margin-bottom:10px;text-align:center;font-weight:700}.hd{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #333;padding-bottom:8px}.tt{font-size:16pt;font-weight:700;margin-bottom:6px}' +
    'table{border-collapse:collapse;font-size:9.5pt}table.mt td{padding:1px 8px 1px 0;vertical-align:top}table.mt td:first-child{color:#555;width:1in}h3{font-size:11pt;background:#333;color:#fff;padding:3px 8px;margin:14px 0 6px}table.bx{width:100%}table.bx td{padding:4px 8px;border-bottom:1px solid #ddd}table.bx td small{color:#555;font-size:8pt}.n{text-align:right;white-space:nowrap}tr.t td{font-weight:700;border-top:2px solid #333}' +
    '.two{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}table.cd{width:100%}table.cd td{padding:2px 6px;border-bottom:1px solid #eee}table.cd tr.sh td{font-weight:700;background:#eef1f5;border-top:1px solid #bbb}table.cd td.i{padding-left:14px}.nt{font-size:9pt;margin-top:10px}';
  function parseFees(text) {
    var out = {}; LE_SECTIONS.forEach(function (x) { out[x[0]] = []; });
    var KEY = [['A', /origination|underwriting|processing|points|application|lender fee|admin/i], ['B', /appraisal|credit report|flood|tax service|verification|mers/i], ['C', /title|settlement|closing fee|attorney|survey|notary|courier|endorsement/i],
      ['E', /recording|transfer tax|mortgage tax|government|intangible|stamp/i], ['F', /prepaid|homeowner'?s insurance premium|insurance premium|per[- ]?diem|interest/i], ['G', /escrow|reserve|impound|property tax(?:es)? \(\d+ ?mo/i], ['H', /inspection|pest|hoa|home warranty|other/i]];
    String(text || '').replace(/\r/g, '').split('\n').forEach(function (l) { var m = l.trim().match(/^(.{3,80}?)[\s.:_$-]*\$\s?([\d,]+\.\d{2})\s*$/); if (!m || /total|subtotal|cash to close|loan amount|payment/i.test(m[1])) return; var sec = (KEY.filter(function (k) { return k[1].test(m[1]); })[0] || ['H'])[0]; out[sec].push({label: m[1].trim(), amt: N(m[2]).toFixed(2)}); });
    return out;
  }
  /* loads the mortgage engine on pages that do not have it (the Income Calculator), so a recent scenario can be calculated */
  var engineLoading = null;
  function ensureEngine() {
    if (window.__amdGet) return Promise.resolve(window.__amdGet);
    if (window.__mtbAmd) return Promise.resolve(window.__mtbAmd);
    if (engineLoading) return engineLoading;
    engineLoading = new Promise(function (res) {
      var reg = {}, cache = {}, prev = window.define;
      var req = function (name) { if (cache[name]) return cache[name]; var d = reg[name]; if (!d) throw new Error('Module not found: ' + name); var ex = cache[name] = {}; var args = d.deps.map(function (x) { return x === 'exports' ? ex : x === 'require' ? req : req(x); }); var r = d.factory.apply(null, args); if (r !== undefined) cache[name] = r; return cache[name]; };
      window.define = function (n, d, f) { reg[n] = {deps: d, factory: f}; }; window.define.amd = true;
      var sc = document.createElement('script'); sc.src = 'assets/js/20-createbinding-this-this-createbindin.js';
      var done = function () { window.define = prev; window.__mtbAmd = Object.keys(reg).length ? req : null; res(window.__mtbAmd); };
      sc.onload = done; sc.onerror = done; document.head.appendChild(sc);
    });
    return engineLoading;
  }

  /* ================================================================ shell / UI */
  var ORDER = ['addendum', 'lease', 'estimate', 'pl', 'schc', 'pay', 'gift', 'le', 'commit', 'mi'];
  var RERENDER = {showPay: 1, drawCustom: 1, style: 1, leaseType: 1, program: 1, concOnTop: 1, ttOn: 1, renoOn: 0, payType: 1, state: 1, locality: 1, ytdMode: 1, logoSize: 0, type: 1, oSource: 0, oPrice: 1};
  function mount() {
    if ($('mtB')) return;
    if (!$('mtBcss')) { var st = document.createElement('style'); st.id = 'mtBcss'; st.textContent = CSS; document.head.appendChild(st); }
    var w = document.createElement('div'); w.id = 'mtB'; w.className = 'no-print'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Document builder');
    w.innerHTML = '<div class="mb"><div class="mb-top"><h2>Document builder<span class="sub" id="mtBsub"></span></h2><label class="btn fillfrom" title="Refill this document from the loan file or a recent scenario">Fill from <select data-a="fillFrom" aria-label="Fill this document from"></select></label><button type="button" class="btn" data-a="versions" aria-haspopup="true" aria-expanded="false">Versions</button><div class="vmenu" id="mtBvmenu" hidden role="menu"></div><button type="button" class="btn" data-a="reset">Start over from the loan file</button><button type="button" class="btn" data-a="pageEdit" aria-pressed="false" title="Type straight onto the document before printing">Edit on page</button><button type="button" class="btn" data-a="print">Print</button><button type="button" class="btn pri" data-a="pdf">Download PDF</button><button type="button" class="btn" data-a="close" aria-label="Close the document builder">Close</button></div>' +
      '<nav class="mb-nav" aria-label="Documents"></nav><div class="mb-form"></div><div class="mb-prev"><div class="fitbar" id="mtBfit"></div><div class="pe" id="mtBpe" hidden>Editing on the page - click into the document and type. Print and Download PDF use your edits. Changing the form afterwards rebuilds the page.</div><iframe title="Document preview" id="mtBframe"></iframe></div></div>';
    document.body.appendChild(w);
    wire(w);
  }
  function renderNav() { var n = document.querySelector('#mtB .mb-nav'); n.innerHTML = ORDER.map(function (k) { return '<button type="button" data-a="nav" data-k="' + k + '" aria-current="' + (k === cur) + '">' + B[k].label + '<small>' + B[k].sub + '</small></button>'; }).join('') + 
      (window.V14 && V14.__mtbOrig && (cur === 'addendum' || cur === 'lease') ? '<button type="button" data-a="classic">Classic ' + (cur === 'addendum' ? 'addendum' : 'lease') + ' form<small>The earlier Loan Suite form</small></button>' : ''); $('mtBsub').textContent = ' · ' + B[cur].label; fillFromMenu(); }
  function renderForm() {
    var f = document.querySelector('#mtB .mb-form'), ae = document.activeElement, key = ae && f.contains(ae) ? ['b', 'k', 'list', 'i', 'f', 'cond'].map(function (a) { return ae.getAttribute('data-' + a) || ''; }).join('|') : '', st = f.scrollTop;
    f.innerHTML = B[cur].form();
    f.scrollTop = st;
    if (key) { var el = Array.prototype.filter.call(f.querySelectorAll('input,select,textarea'), function (x) { return ['b', 'k', 'list', 'i', 'f', 'cond'].map(function (a) { return x.getAttribute('data-' + a) || ''; }).join('|') === key; })[0]; if (el) { el.focus(); try { if (el.setSelectionRange && el.type === 'text') el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} } }
    if (B[cur].side) B[cur].side();
    restoreStatus();
    if (window.MTAddr) [].forEach.call(f.querySelectorAll('[data-addr],[data-addr-line],[data-addr-pair],[data-addr-item]'), function (el) { MTAddr.attach(el, {onPick: function (a) { addrPick(el, a); }}); });
  }
  /* an address suggestion picked in a builder fills that builder's fields */
  function addrPick(el, a) {
    var b = el.getAttribute('data-b'), s = drafts[b]; if (!s) return;
    if (el.hasAttribute('data-addr-item')) { var it = s[el.getAttribute('data-list')][+el.getAttribute('data-i')]; it.addr = a.street; it.city = a.city; it.state = a.stateAbbr; it.zip = a.zip; }
    else if (el.hasAttribute('data-addr')) { var p = el.getAttribute('data-addr') || ''; s[p + 'address'] = a.street; s[p + 'city'] = a.city; s[p + 'state'] = a.state; s[p + 'zip'] = a.zip; s[p + 'county'] = a.county; if (b === 'addendum') B.addendum.sync(s); }
    else { var v = el.hasAttribute('data-addr-pair') ? a.street : a.line;
      if (el.hasAttribute('data-list')) { var arr = s[el.getAttribute('data-list')], i = +el.getAttribute('data-i'), f = el.getAttribute('data-f'); if (typeof arr[i] !== 'object') arr[i] = {name: arr[i] || ''}; arr[i][f] = v; } else s[el.getAttribute('data-k')] = v;
      if (el.hasAttribute('data-addr-pair')) s[el.getAttribute('data-addr-pair')] = a.cityLine; }
    persist(); renderForm(); refresh(true);
  }
  /* ---------------------------------------------------- preview rendering
     A change rebuilds the preview after a short pause; Print and Download PDF first flush any pending rebuild and wait for
     the new page, so an edit made just before exporting is always in the output (56.6). */
  var rT = 0, rendering = false, waiters = [];
  function settle() { if (rT || rendering) return; var w = waiters; waiters = []; w.forEach(function (f) { f(); }); }
  function render() {
    rT = 0; var fr = $('mtBframe'); if (!fr) return settle();
    if (editing) { editDirty = true; if (B[cur].side) B[cur].side(); return settle(); }
    var y = 0; try { y = fr.contentWindow.scrollY; } catch (e) {}
    rendering = true;
    fr.onload = function () { fit(true); try { fr.contentWindow.scrollTo(0, y); } catch (e) {} rendering = false; settle(); };
    fr.srcdoc = B[cur].doc(drafts[cur]);
    if (B[cur].side) B[cur].side();
  }
  function refresh(now) { clearTimeout(rT); rT = setTimeout(render, now ? 0 : 180); }
  function ready() { return new Promise(function (res) { waiters.push(res); if (rT) { clearTimeout(rT); render(); } else settle(); }); }
  /* the preview is zoomed to fit the pane; printing and the PDF use the full page size */
  function fit(layout) { var fr = $('mtBframe'); if (!fr || !fr.contentDocument || !fr.contentDocument.body) return; var b = fr.contentDocument.body; b.style.zoom = ''; if (layout) layoutPages(fr.contentDocument); var z = Math.min(1, (fr.clientWidth - 28) / 816); b.style.zoom = z > 0 ? z : 1; }

  /* ---------------------------------------------------- page layout
     Layout:  "fit"   - fit on one page: narrower margins, then the text is scaled evenly down to a readable minimum; a
                         document that still does not fit is set out on proper pages instead of being cut.
              "pages" - proper spacing: the document flows onto as many pages as it needs. Pages break between blocks
                         (paragraphs, table rows with the header repeated, list items with numbering continued, signature
                         lines), headings stay with what follows, and every page keeps its margins.
     Margins: the document's own, or narrow / normal / wide on every side. */
  var LAYOUT_KEY = 'mt.builder.layout', MARGIN_KEY = 'mt.builder.margin', MIN_SCALE = .66, PAGE_H = 1056;
  var MARGINS = {doc: null, narrow: .5, normal: .75, wide: 1};
  function pref(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
  function layoutMode() { var v = pref(LAYOUT_KEY, ''); if (!v) { try { if (localStorage.getItem('mt.builder.fit') === '0') v = 'pages'; } catch (e) {} } return v === 'pages' ? 'pages' : 'fit'; }
  function marginKey() { var v = pref(MARGIN_KEY, 'doc'); return MARGINS.hasOwnProperty(v) ? v : 'doc'; }
  function savePref(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { say('This browser would not save the page-layout choice; it applies until the page is reloaded.'); return false; } }
  function padOf(doc, pg) { var cs = doc.defaultView.getComputedStyle(pg); return {t: parseFloat(cs.paddingTop), b: parseFloat(cs.paddingBottom), r: parseFloat(cs.paddingRight)}; }
  function applyMargin(pg, inch) {
    if (inch == null) return; pg.style.setProperty('padding', inch + 'in', 'important');
    /* full-bleed colour headers sit in the margin: move them with it */
    [].forEach.call(pg.querySelectorAll('.hd.m, .ph.m'), function (h) { h.style.setProperty('margin', '-' + inch + 'in -' + inch + 'in 14px', 'important'); });
  }
  var SPLIT_GRID = /\b(sigs|sgs|sig2|sgg|sg2|rs|list|wd)\b/;
  function hasOwnText(n) { return [].some.call(n.childNodes, function (c) { return c.nodeType === 3 && c.textContent.trim(); }); }
  /* break the page's content into placeable blocks, remembering the containers each block sits in */
  function units(node, chain, out, view) {
    if (node.nodeType === 3) { if (node.textContent.trim()) out.push({node: node, chain: chain}); return; }
    if (node.nodeType !== 1) return;
    var tag = node.tagName, kids = node.children;
    if (tag === 'TABLE' && node.rows.length > 2) {
      [].forEach.call(kids, function (sec) { if (sec.tagName === 'TBODY' || sec.tagName === 'TFOOT') [].forEach.call(sec.children, function (tr) { out.push({node: tr, chain: chain.concat([node, sec])}); }); });
      return;
    }
    if ((tag === 'OL' || tag === 'UL') && kids.length > 1) { [].forEach.call(kids, function (li, i) { li.__idx = i; out.push({node: li, chain: chain.concat([node])}); }); return; }
    if ((tag === 'DIV' || tag === 'SECTION') && kids.length > 1 && !hasOwnText(node)) {
      var disp = view.getComputedStyle(node).display;
      if (disp === 'block' || (disp === 'grid' && SPLIT_GRID.test(node.className))) { [].forEach.call(node.childNodes, function (c) { units(c, chain.concat([node]), out, view); }); return; }
    }
    out.push({node: node, chain: chain});
  }
  function isHeading(n) {
    if (n.nodeType !== 1) return false; var t = n.tagName, txt = (n.textContent || '').trim();
    if (/^H[1-6]$/.test(t)) return true;
    if (t === 'TR') return /\b(s|gh|hh)\b/.test(n.className);
    if (t === 'P') return /\b(sh|dh|lead)\b/.test(n.className) || (n.children.length === 1 && /^(B|STRONG)$/.test(n.children[0].tagName) && n.children[0].textContent.trim() === txt && txt.length < 90);
    return false;
  }
  function emptyHolder(k) { if (k.tagName === 'TABLE') return !k.querySelector('tbody tr, tfoot tr'); if (k.tagName === 'TBODY' || k.tagName === 'TFOOT') return !k.children.length; return !k.children.length && !(k.textContent || '').trim(); }
  function paginate(doc, pg, inch) {
    var w = pg.querySelector(':scope > .fitw'); if (!w) return [pg];
    var list = []; [].slice.call(w.childNodes).forEach(function (c) { units(c, [], list, doc.defaultView); });
    var pages = [], page, pw, map, avail, placed;
    var newPage = function () {
      page = pg.cloneNode(false); page.classList.add('paged'); page.removeAttribute('style'); applyMargin(page, inch);
      pw = w.cloneNode(false); pw.removeAttribute('style'); page.appendChild(pw);
      pg.parentNode.insertBefore(page, pg); pages.push(page); map = new Map(); placed = [];
      var p = padOf(doc, page); avail = PAGE_H - p.t - p.b - 4;
    };
    var holder = function (chain) {
      var parent = pw;
      chain.forEach(function (c) {
        var k = map.get(c);
        if (!k) { k = c.cloneNode(false); if (c.tagName === 'TABLE') [].forEach.call(c.children, function (x) { if (/^(THEAD|CAPTION|COLGROUP)$/.test(x.tagName)) k.appendChild(x.cloneNode(true)); }); parent.appendChild(k); map.set(c, k); }
        parent = k;
      });
      return parent;
    };
    var put = function (u) {
      var h = holder(u.chain);
      if (u.node.tagName === 'LI' && h.tagName === 'OL' && !h.children.length) h.setAttribute('start', (+(u.chain[u.chain.length - 1].getAttribute('start')) || 1) + (u.node.__idx || 0));
      h.appendChild(u.node); placed.push(u);
    };
    var take = function (u) { var h = u.node.parentNode; u.node.remove(); placed.pop(); while (h && h !== pw && emptyHolder(h)) { var up = h.parentNode; map.forEach(function (v, k) { if (v === h) map.delete(k); }); h.remove(); h = up; } };
    newPage();
    list.forEach(function (u) {
      put(u);
      if (pw.scrollHeight > avail && placed.length > 1) {
        take(u);
        var carry = [];
        while (placed.length > 1 && isHeading(placed[placed.length - 1].node)) { var last = placed[placed.length - 1]; take(last); carry.unshift(last); }
        newPage(); carry.forEach(put); put(u);
      }
    });
    pg.remove();
    return pages;
  }
  function layoutPages(doc) {
    var mode = layoutMode(), mk = marginKey(), inch = MARGINS[mk], res = {mode: mode, pages: 0, scaled: 1, tooLong: false, oversize: false};
    [].forEach.call(doc.querySelectorAll('.pgno'), function (x) { x.remove(); });
    [].slice.call(doc.querySelectorAll('.pg')).forEach(function (pg) {
      var w = pg.querySelector(':scope > .fitw'); if (!w) { res.pages++; return; }
      if (pg.classList.contains('paged')) { res.pages++; return; }
      pg.classList.remove('fitted', 'fitc'); w.style.transform = ''; w.style.width = ''; applyMargin(pg, inch);
      var avail = function () { var p = padOf(doc, pg); return PAGE_H - p.t - p.b - 4; };
      if (w.scrollHeight <= avail()) { res.pages++; return; }
      if (mode === 'fit') {
        if (inch == null) pg.classList.add('fitc');
        var a = avail(), h = w.scrollHeight;
        if (h <= a) { pg.classList.add('fitted'); res.pages++; return; }
        var z = a / h;
        for (var k = 0; k < 8 && z >= MIN_SCALE - .05; k++) { w.style.width = (100 / z) + '%'; w.style.transform = 'scale(' + z + ')'; h = w.scrollHeight; if (h * z <= a) break; z = Math.min(z - .005, a / h); }
        if (z >= MIN_SCALE && w.scrollHeight * z <= a + 1) { pg.classList.add('fitted'); res.scaled = Math.min(res.scaled, z); res.pages++; return; }
        pg.classList.remove('fitc'); w.style.transform = ''; w.style.width = ''; applyMargin(pg, inch); res.tooLong = true;
      }
      var made = paginate(doc, pg, inch == null && mode === 'fit' ? null : inch);
      res.pages += made.length;
      made.forEach(function (p) { if (p.scrollHeight > PAGE_H + 2) res.oversize = true; });
    });
    /* page numbers once a document runs past one page */
    var all = doc.querySelectorAll('.pg');
    if (all.length > 1) [].forEach.call(all, function (p, i) { var d = doc.createElement('div'); d.className = 'pgno'; d.textContent = 'Page ' + (i + 1) + ' of ' + all.length; var pad = padOf(doc, p); d.style.bottom = Math.max(14, pad.b / 2 - 6) + 'px'; d.style.right = Math.max(24, pad.r) + 'px'; p.appendChild(d); });
    /* a line every page carries, such as tenant initials on a lease */
    [].forEach.call(doc.querySelectorAll('.pgini'), function (x) { x.remove(); });
    var ini = doc.querySelector('[data-ini]');
    if (ini) [].forEach.call(all, function (p) { var d = doc.createElement('div'); d.className = 'pgno pgini'; d.textContent = ini.getAttribute('data-ini'); var pad = padOf(doc, p); d.style.bottom = Math.max(14, pad.b / 2 - 6) + 'px'; d.style.left = Math.max(24, pad.l) + 'px'; d.style.right = 'auto'; p.appendChild(d); });
    res.pages = all.length;
    var bar = $('mtBfit');
    if (bar) {
      var opt = function (v, l, sel) { return '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + l + '</option>'; };
      var msg = mode === 'fit' ? (res.tooLong ? 'Too long for one page at a readable size - set out on ' + res.pages + ' pages with full margins instead of being cut.' : res.scaled < .999 ? 'Fits on one page (text at ' + Math.round(res.scaled * 100) + '%).' : res.pages > 1 ? res.pages + ' pages.' : 'Fits on one page.')
        : res.pages + (res.pages === 1 ? ' page' : ' pages') + ' - breaks fall between paragraphs, table rows and signature lines.';
      if (res.oversize) msg += ' One block is taller than a page and will continue on the next sheet - shorten it or choose Fit on one page.';
      bar.className = 'fitbar' + (res.tooLong || res.oversize ? ' warn' : '');
      bar.innerHTML = '<label>Layout <select data-a="layoutSel" aria-label="Page layout">' + opt('fit', 'Fit on one page', mode) + opt('pages', 'Proper spacing - as many pages as needed', mode) + '</select></label>' +
        '<label>Margins <select data-a="marginSel" aria-label="Page margins">' + opt('doc', 'Document default', mk) + opt('narrow', 'Narrow - 0.5 in', mk) + opt('normal', 'Normal - 0.75 in', mk) + opt('wide', 'Wide - 1 in', mk) + '</select></label><span>' + msg + '</span>';
    }
    return res;
  }
  function unfit(fn) { var fr = $('mtBframe'), b = fr && fr.contentDocument && fr.contentDocument.body, z = b ? b.style.zoom : ''; if (b) b.style.zoom = ''; var r = fn(); var done = function () { if (b) b.style.zoom = z; }; if (r && r.then) r.then(done, done); else setTimeout(done, 400); return r; }
  window.addEventListener('resize', function () { if ($('mtB') && $('mtB').classList.contains('open')) fit(false); });
  function setVal(t, ev) {
    var b = t.getAttribute('data-b'), v = t.type === 'checkbox' ? t.checked : t.value;
    if (t.hasAttribute('data-cond')) { var c = drafts.commit.conditions.filter(function (x) { return x.id === t.getAttribute('data-cond'); })[0]; if (c) { c[t.getAttribute('data-f')] = v; if (t.getAttribute('data-f') === 'group' || t.getAttribute('data-f') === 'on') { persist(); renderForm(); } } persist(); refresh(); return; }
    if (!b || !drafts[b]) return;
    /* lease sections: included or not, a new heading, new wording */
    if (t.hasAttribute('data-sec')) {
      var cf = leaseCfg(drafts[b]), sk = t.getAttribute('data-sec'), sf = t.getAttribute('data-sf');
      if (sf === 'on') { cf.off[sk] = !v; var row = t.closest('.secr'); if (row) row.classList.toggle('off', !v); }
      else if (sf === 'h') { if (String(v).trim()) cf.h[sk] = v; else delete cf.h[sk]; }
      else cf.tx[sk] = v;
      persist(); scheduleVersion(b); refresh(); return;
    }
    if (t.hasAttribute('data-over')) { var s0 = drafts[b]; s0.over = s0.over || {}; s0.over[t.getAttribute('data-over')] = v; persist(); refresh(); return; }
    if (t.hasAttribute('data-list') && !t.hasAttribute('data-i')) { var obj = t.getAttribute('data-list').split('.').reduce(function (o, k) { return o && o[k]; }, drafts[b]); if (obj) { obj[t.getAttribute('data-f')] = v; persist(); scheduleVersion(b); refresh(); if (B[b].side) B[b].side(); } return; }
    if (t.hasAttribute('data-list')) { var arr = t.getAttribute('data-list').split('.').reduce(function (o, k) { return o && o[k]; }, drafts[b]), i = +t.getAttribute('data-i'), f = t.getAttribute('data-f');
      if (f) { if (typeof arr[i] !== 'object') arr[i] = {name: arr[i] || ''}; arr[i][f] = v; if (t.type === 'checkbox' && v) { if (f === 'subj') arr[i].noAddr = false; if (f === 'noAddr') arr[i].subj = false; } } else arr[i] = v; persist(); refresh(); if (t.type === 'checkbox') renderForm(); else if (B[b].side) B[b].side(); return; }
    var k = t.getAttribute('data-k'), s = drafts[b]; s[k] = v;
    if (b === 'addendum') {
      if (k === 'concPct') s.concDrv = 'pct'; else if (k === 'concAmt') s.concDrv = 'amt';
      if (k === 'toPrice') s.priceManual = String(v).trim() !== '';
      B.addendum.sync(s);
    }
    if (b === 'estimate' && k === 'drawCustom' && v && !(s.drawList || []).length) { var nd = Math.min(50, Math.max(1, Math.round(N(s.draws) || 1))); s.drawList = []; for (var di = 1; di <= nd; di++) s.drawList.push({label: 'Draw ' + di + (di === nd ? ' (final, on completion and inspection)' : ''), pct: ''}); }
    if (b === 'mi' && k === 'renoProgram') drafts.mi.feePerDraw = v === '203k' ? 375 : 150;
    /* a fixed lease term runs from the start date to the day before the same date N months later (1 year from 3/1/2026 ends 2/28/2027) */
    if (b === 'lease') {
      if (k === 'end' && t.getAttribute('data-fdate') && s.termLen !== 'custom' && document.activeElement === t) { s.termLen = 'custom'; var tl = document.querySelector('#mtB select[data-k="termLen"]'); if (tl) tl.value = 'custom'; }
      if ((k === 'termLen' || k === 'start' || k === 'leaseType') && s.leaseType === 'fixed' && /^\d+$/.test(String(s.termLen || '12'))) {
        var sd = parseDate(s.start); if (sd) { var ed = shiftDate(shiftDate(sd, +(s.termLen || 12), 'm'), -1, 'd'); s.end = dateFromPicker(iso(ed)); var ee = document.querySelector('#mtB [data-b="lease"][data-k="end"]'); if (ee && ee !== document.activeElement) ee.value = s.end; }
      }
    }
    if (b === 'gift' && k === 'type') { var gd = giftDefaults(v); for (var gk in gd) s[gk] = gd[gk]; s.upTo = v === 'conv'; }
    persist(); scheduleVersion(b);
    if (RERENDER[k] && (t.tagName === 'SELECT' || t.type === 'checkbox')) renderForm(); else if (B[b].side) B[b].side();
    refresh();
  }
  function wire(w) {
    w.addEventListener('input', function (e) { if (e.target.matches('input:not([type=checkbox]):not([type=file]):not(.pk):not(#mtBpreset),textarea')) setVal(e.target, e); });
    w.addEventListener('change', function (e) {
      var t = e.target, a = t.getAttribute('data-a');
      if (t.type === 'file') { var fl = t.files && t.files[0]; t.value = ''; if (fl) { if (a === 'logo') loadLogo(t.getAttribute('data-b'), fl); else readInto(a, fl); } return; }
      /* the calendar fills the typed date box next to it */
      if (t.classList.contains('pk')) { var box = t.parentNode.querySelector('input[data-fdate]'); if (box && t.value) { box.value = dateFromPicker(t.value); setVal(box); } return; }
      if (t.id === 'mtBpreset') return;
      if (t.hasAttribute('data-fdate')) { var rd = relDate(t.value); if (rd) { t.value = dateFromPicker(iso(rd)); setVal(t); } return; }
      if (a === 'fillFrom') { var fv = t.value; t.value = ''; refillFrom(fv); fillFromMenu(); return; }
      if (a === 'layoutSel' || a === 'marginSel') { savePref(a === 'layoutSel' ? LAYOUT_KEY : MARGIN_KEY, t.value); if (a === 'layoutSel' && t.value === 'pages') savePref('mt.builder.fit', '0'); pageEdit(false); refresh(true); return; }
      if (t.matches('select,input[type=checkbox]')) setVal(t, e);
    });
    w.addEventListener('click', function (e) {
      var t = e.target.closest('[data-a]'); if (!t || t.tagName === 'INPUT' || t.tagName === 'SELECT') return; var a = t.getAttribute('data-a');
      if (a === 'close') return close();
      if (a === 'pick') { var pk = t.parentNode.querySelector('input.pk'), tx = t.parentNode.querySelector('input[data-fdate]'), d0 = parseDate(tx && tx.value); pk.value = d0 ? iso(d0) : ''; try { pk.showPicker(); } catch (x) { pk.style.pointerEvents = 'auto'; pk.focus(); pk.click(); } return; }
      if (a === 'pageEdit') return pageEdit(!editing);
      if (a === 'addrToggle') { if (window.MTAddr) MTAddr.setOff(!MTAddr.isOff()); renderForm(); return; }
      if (a === 'nav') { pageEdit(false); saveVersion(cur, 'Switched documents'); cur = t.getAttribute('data-k'); ensure(cur); renderNav(); renderForm(); refresh(true); return; }
      if (a === 'classic') { close(); V14.__mtbOrig.call(V14, cur === 'addendum' ? 'v14AddModal' : 'v14LeaseModal'); return; }
      if (a === 'versions') { var vm = $('mtBvmenu'); if (vm.hidden) { versionMenu(); vm.hidden = false; t.setAttribute('aria-expanded', 'true'); var fb = vm.querySelector('button'); if (fb) fb.focus(); } else { vm.hidden = true; t.setAttribute('aria-expanded', 'false'); } return; }
      if (a === 'vrestore') { $('mtBvmenu').hidden = true; return restoreVersion(+t.getAttribute('data-i')); }
      if (a === 'vsave') { $('mtBvmenu').hidden = true; if (saveVersion(cur, 'Saved by you')) say('Version saved.'); else say('Nothing has changed since the last saved version.'); return; }
      if (a === 'reset') { if (!confirm('Start this ' + B[cur].label.toLowerCase() + ' over from the loan file? Your changes to it are cleared (the current version is kept under Versions).')) return; saveVersion(cur, 'Before starting over'); pageEdit(false); drafts[cur] = B[cur].init(); persist(); renderForm(); refresh(true); return; }
      if (a === 'print') { saveVersion(cur, 'Printed'); ready().then(function () { var fr = $('mtBframe'); unfit(function () { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (x) {} }); }); return; }
      if (a === 'pdf') { saveVersion(cur, 'Saved as PDF'); ready().then(function () { unfit(pdf); }); return; }
      if (a === 'secEdit' || a === 'secAll' || a === 'secReset' || a === 'secResetOne') {
        var ls = drafts.lease, lc = leaseCfg(ls), lk = t.getAttribute('data-k'), lid = (ls.style || 'standard') + ':' + lk;
        if (a === 'secEdit') { secOpen[lid] = !secOpen[lid]; var ed = t.closest('.secr').querySelector('.sece'); ed.hidden = !secOpen[lid]; t.textContent = secOpen[lid] ? 'Done' : 'Edit'; t.setAttribute('aria-expanded', String(!!secOpen[lid]));
          /* the wording box shows the current text when it has not been reworded */
          var ta = ed.querySelector('textarea'); if (ta && lc.tx[lk] == null) { var x0 = B.lease.sections(ls).filter(function (x) { return x.k === lk; })[0]; if (x0) ta.value = plainOf((x0.lead ? '<p>' + x0.lead + '</p>' : '') + (x0.html || '')); } return; }
        if (a === 'secAll') { var on = t.getAttribute('data-v') === '1'; B.lease.sections(ls).forEach(function (x) { lc.off[x.k] = !on; }); }
        if (a === 'secReset') { if (!confirm('Put back the standard heading and wording of every section? Sections you left out stay out.')) return; lc.tx = {}; lc.h = {}; }
        if (a === 'secResetOne') { delete lc.tx[lk]; delete lc.h[lk]; }
        persist(); scheduleVersion('lease'); renderForm(); refresh(); return;
      }
      if (a === 'add') { var b = t.getAttribute('data-b'), L = t.getAttribute('data-list'), arr = drafts[b][L] = drafts[b][L] || []; arr.push(L === 'secAdd' ? {h: '', t: ''} : L === 'drawList' ? {label: '', pct: ''} : L === 'items' ? {trade: '', desc: '', qty: '', unit: '', labor: '', materials: ''} : (L === 'custom' || L === 'extra') ? '' : L === 'donors' ? {name: '', relationship: '', addr: '', city: '', state: '', zip: '', phone: '', email: ''} : L === 'borrowers' && b === 'gift' ? {name: '', addr: '', phone: ''} : (L === 'earn' || L === 'post') ? {label: '', amt: ''} : (L === 'income' || L === 'cogs' || L === 'expenses') ? {label: L === 'expenses' ? (PL_EXP.filter(function (x) { return !arr.some(function (r) { return r.label === x; }); })[0] || 'Other') : '', amt: ''} : {name: ''}); persist(); renderForm(); refresh(); return; }
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
      if (a === 'payToCalc') return payToCalc();
      if (a === 'schcPull') return schcPull();
      if (a === 'leAdd') { drafts.le.lines[t.getAttribute('data-k')].push({label: '', amt: ''}); persist(); renderForm(); refresh(); return; }
      if (a === 'leRm') { drafts.le.lines[t.getAttribute('data-k')].splice(+t.getAttribute('data-i'), 1); persist(); renderForm(); refresh(); return; }
      if (a === 'logoRm') { var lb = t.getAttribute('data-b'); drafts[lb].logo = ''; persist(); renderForm(); refresh(true); return; }
      if (a === 'logoReuse') { var lb2 = t.getAttribute('data-b'); drafts[lb2].logo = savedLogo(); drafts[lb2].logoSize = drafts[lb2].logoSize || '52'; persist(); renderForm(); refresh(true); return; }
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
  /* ---- versions: the last 3 saved versions of each document, kept automatically (56.7) */
  var VKEY = 'mt.builder.versions', versionT = 0, lastVersionSig = {};
  function readVersions() { try { return JSON.parse(localStorage.getItem(VKEY) || '{}') || {}; } catch (e) { return {}; } }
  function draftSummary(k, d) { var who = names(d.buyers || d.borrowers || d.tenants || d.donors || []).slice(0, 2).join(' & ') || d.business || d.company || d.customer || d.empName || d.eeName || ''; var where = d.address || ''; return [who, where].filter(Boolean).join(' - ') || 'No names yet'; }
  function saveVersion(k, why) {
    var d = drafts[k]; if (!d) return false; var copy = JSON.parse(JSON.stringify(d)); delete copy.logo;     /* logos stay with the document, not in each version */
    var sig = JSON.stringify(copy); if (lastVersionSig[k] === sig) return false;
    var all = readVersions(), list = (all[k] || []).filter(function (v) { return JSON.stringify(v.draft) !== sig; });
    list.unshift({at: new Date().toISOString(), why: why || 'Auto-saved', summary: draftSummary(k, d), draft: copy}); all[k] = list.slice(0, 3);
    try { localStorage.setItem(VKEY, JSON.stringify(all)); lastVersionSig[k] = sig; return true; } catch (e) { say('Could not save a version of this document - browser storage is full. Download a PDF to keep a copy.'); return false; }
  }
  function scheduleVersion(k) { clearTimeout(versionT); versionT = setTimeout(function () { saveVersion(k, 'Auto-saved'); }, 20000); }
  function versionMenu() {
    var m = $('mtBvmenu'), list = readVersions()[cur] || [], when = function (iso) { var d = new Date(iso); return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + ' ' + d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'}); };
    m.innerHTML = '<p>The last 3 versions of this ' + esc(B[cur].label.toLowerCase()) + ' are kept automatically. Restoring one keeps the current version too.</p>' +
      (list.length ? list.map(function (v, i) { return '<button type="button" role="menuitem" data-a="vrestore" data-i="' + i + '"><b>' + esc(when(v.at)) + '</b> - ' + esc(v.why) + '<small>' + esc(v.summary) + '</small></button>'; }).join('') : '<p><b>No saved versions yet.</b> One is kept after a pause in editing, when you switch documents, print, save a PDF, refill or start over.</p>') +
      '<button type="button" role="menuitem" data-a="vsave"><b>Save a version now</b></button>';
  }
  /* ---- fill from the loan file or a recent scenario (56.7) */
  var fileSource = null;
  function recentScenarios() {
    var st = store(), state = null;
    try { state = st && st.snapshot ? st.snapshot() : JSON.parse(localStorage.getItem('mortgage-suite-state-v2') || 'null'); } catch (e) {}
    var sc = state && state.scenarios ? Object.keys(state.scenarios).map(function (id) { return state.scenarios[id]; }) : [];
    return sc.filter(function (x) { return x && x.inputs; }).sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); }).slice(0, 6).map(function (x) {
      var i = x.inputs; return {id: i.id || x.id, label: (i.name || 'Scenario') + (i.borrowerName ? ' - ' + i.borrowerName : '') + (i.propertyAddress ? ' - ' + i.propertyAddress : '') + (x.updatedAt ? ' (' + new Date(x.updatedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + ')' : ''), inputs: i, active: state.activeScenarioId === (i.id || x.id)}; });
  }
  function fillFromMenu() {
    var sel = document.querySelector('#mtB select[data-a="fillFrom"]'); if (!sel) return; var rs = recentScenarios();
    sel.innerHTML = '<option value="">Choose…</option><option value="file">The loan file (current)</option>' + (rs.length ? '<optgroup label="Recent scenarios">' + rs.map(function (r) { return '<option value="sc:' + esc(r.id) + '">' + esc(r.label + (r.active ? ' - active' : '')) + '</option>'; }).join('') + '</optgroup>' : '') +
      ((readVersions()[cur] || []).length ? '<optgroup label="Saved versions of this document">' + readVersions()[cur].map(function (v, i) { return '<option value="v:' + i + '">' + esc(new Date(v.at).toLocaleString('en-US', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}) + ' - ' + v.summary) + '</option>'; }).join('') + '</optgroup>' : '');
  }
  function refillFrom(value) {
    if (!value) return;
    if (/^v:/.test(value)) return restoreVersion(+value.slice(2));
    var label = value === 'file' ? 'the loan file' : 'the chosen scenario';
    if (!confirm('Refill this ' + B[cur].label.toLowerCase() + ' from ' + label + '? The current version is kept under Versions.')) return;
    if (/^sc:/.test(value) && !window.__amdGet && !window.__mtbAmd) { say('Loading the calculation engine…'); return ensureEngine().then(function () { refillNow(value, label); }); }
    refillNow(value, label);
  }
  function refillNow(value, label) {
    saveVersion(cur, 'Before refilling');
    var logo = drafts[cur] && drafts[cur].logo;
    if (/^sc:/.test(value)) { var r = recentScenarios().filter(function (x) { return 'sc:' + x.id === value; })[0]; if (!r) return; var out = null; try { var get = window.__amdGet || window.__mtbAmd, eng = get && get('src/core/calc/engine'); if (eng) out = eng.runScenario(r.inputs); } catch (e) {} fileSource = {inputs: r.inputs, outputs: out}; }
    try { drafts[cur] = B[cur].init(); } finally { fileSource = null; }
    if (logo && !drafts[cur].logo) drafts[cur].logo = logo;
    persist(); renderForm(); refresh(true); say('Filled from ' + label + '.');
  }
  function restoreVersion(i) {
    var v = (readVersions()[cur] || [])[i]; if (!v) return;
    if (!confirm('Restore the version from ' + new Date(v.at).toLocaleString() + '? The current version is kept under Versions.')) return;
    var logo = drafts[cur] && drafts[cur].logo; saveVersion(cur, 'Before restoring'); drafts[cur] = JSON.parse(JSON.stringify(v.draft)); if (logo) drafts[cur].logo = logo;
    if (B[cur].fix) B[cur].fix(drafts[cur]); persist(); renderForm(); refresh(true); say('Version restored.');
  }
  function ensure(k) { if (!drafts[k]) { drafts[k] = B[k].init(); persist(); } else if (B[k].fix) B[k].fix(drafts[k]); }
  function condAct(a, t) {
    var s = drafts.commit, L = s.conditions;
    if (a === 'condAll') L.forEach(function (c) { c.on = true; });
    else if (a === 'condNone') L.forEach(function (c) { c.on = false; });
    else if (a === 'condBorrower') L.forEach(function (c) { c.on = !/^(Funder|Post\s*Closer|Approval|Disclosures|Escrow|Title|Closing\s*Agent)/i.test(c.cat) && !/^(Underwriter|Funder|UW\b|Reno\s*Funder|Processor)/i.test(c.text); });
    else if (a === 'condLib') COND_LIB.forEach(function (c) { if (!L.some(function (x) { return x.text === c[2]; })) L.push({id: uid(), group: c[0], cat: c[1], text: c[2], on: true, lib: true}); });
    else if (a === 'condMail' || a === 'condCopy' || a === 'condTsv') return condMail(a === 'condMail' ? 'mail' : a === 'condCopy' ? 'copy' : 'tsv');
    else if (a === 'condPasteRep' || a === 'condPasteAdd') return condPaste(a === 'condPasteRep');
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
  var SID = {schcfile: 'mtBschcfile', lefile: 'mtBlefile', giftfile: 'mtBgiftfile', contract: 'mtBcontract', leasefile: 'mtBleasefile', approval: 'mtBapproval', estfile: 'mtBestfile', plfile: 'mtBplfile', mifile: 'mtBmifile', payfile: 'mtBpayfile'};
  function readInto(kind, fl) {
    var sid = SID[kind] || 'mtB' + kind; saveVersion(cur, 'Before reading ' + (fl && fl.name || 'a document'));
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
      } else if (kind === 'payfile') {
        var Y = parsePay(text), s6 = drafts.pay, g6 = [];
        [['empName', 'employer'], ['eeName', 'employee'], ['eeId', 'employee ID'], ['empEin', 'EIN'], ['payDate', 'pay date'], ['pStart', 'period start'], ['pEnd', 'period end'], ['freq', 'frequency']].forEach(function (r) { if (Y[r[0]]) { s6[r[0]] = Y[r[0]]; g6.push(r[1]); } });
        if (Y.rate) { s6.payType = 'hourly'; s6.rate = String(Y.rate); g6.push('rate ' + usd(Y.rate)); } if (Y.hours) { s6.hours = String(Y.hours); g6.push(Y.hours + ' hours'); }
        if (!Y.rate && Y.current && s6.freq) { s6.payType = 'salary'; s6.salary = (Y.current * (PAY_PPY[s6.freq] || 26)).toFixed(2); g6.push('salary from the current pay'); }
        if (Y.otHrs) { s6.otHrs = String(Y.otHrs); if (Y.otMult) s6.otMult = String(Y.otMult); }
        if (Y.rate || Y.current || Y.gross) s6.earn = [];
        if (Y.commission || Y.bonus) { s6.earn = []; if (Y.commission) s6.earn.push({label: 'Commission', amt: Y.commission.toFixed(2)}); if (Y.bonus) s6.earn.push({label: 'Bonus', amt: Y.bonus.toFixed(2)}); }
        if (Y.ytdBase || Y.ytdGross) { s6.ytdMode = 'manual'; s6.ytdBase = String(Y.ytdBase || (Y.ytdGross - (Y.ytdOt || 0) - (Y.ytdComm || 0) - (Y.ytdBonus || 0))); s6.ytdOt = String(Y.ytdOt || ''); s6.ytdComm = String(Y.ytdComm || ''); s6.ytdBonus = String(Y.ytdBonus || ''); s6.ytdOther = ''; g6.push('year-to-date earnings'); }
        if (Y.gross) { var cg = B.pay.calc(s6).gross; g6.push('gross ' + usd(Y.gross) + (Math.abs(cg - Y.gross) > 1 ? ' (the stub rebuilt here shows ' + usd(cg) + ' - check hours and other pay)' : ' (matches)')); }
        done(g6, 'stub');
      } else if (kind === 'schcfile') {
        var Sc = parseSchc(text), s8 = drafts.schc, g8 = [], yk = Sc.yr && s8.y2.yr === Sc.yr ? 'y2' : 'y1';
        if (Sc.yr) { s8[yk].yr = Sc.yr; g8.push('tax year ' + Sc.yr); } if (Sc.business) { s8.business = Sc.business.trim(); g8.push('business'); }
        SCHC_ROWS.concat([['miles', 'business miles']]).forEach(function (r) { if (Sc[r[0]]) { s8[yk][r[0]] = Sc[r[0]]; g8.push(String(r[1]).replace(/^Line \d+\w? - /, '').toLowerCase()); } });
        done(g8, 'Schedule C');
      } else if (kind === 'lefile') {
        var Fe = parseFees(text), s9 = drafts.le, g9 = 0; LE_SECTIONS.forEach(function (x) { if (Fe[x[0]].length) { s9.lines[x[0]] = Fe[x[0]]; g9 += Fe[x[0]].length; } });
        done(g9 ? [g9 + ' fee line(s) sorted into sections A-H'] : [], 'fee sheet');
      } else if (kind === 'giftfile') {
        var Gf = parseGift(text), s7 = drafts.gift, g7 = [];
        if (Gf.type) { s7.type = Gf.type; var gd2 = giftDefaults(Gf.type); for (var gk2 in gd2) s7[gk2] = gd2[gk2]; s7.upTo = Gf.upTo; g7.push(Gf.type === 'equity' ? 'gift of equity' : Gf.type === 'full' ? 'full letter with source of funds' : 'gift letter'); }
        if (Gf.amount) { s7.amount = Gf.amount; g7.push('amount ' + usd(Gf.amount)); }
        if (Gf.borrowers && Gf.borrowers.length) { s7.borrowers = Gf.borrowers.map(function (n) { return {name: n, addr: '', phone: ''}; }); g7.push(Gf.borrowers.length + ' borrower(s)'); }
        if (Gf.donor && (Gf.donor.name || Gf.donor.relationship)) { s7.donors = [Gf.donor]; g7.push('donor'); }
        if (Gf.addr) { s7.address = Gf.addr.address; s7.addrFree = ''; if (Gf.addr.city) { s7.city = Gf.addr.city; s7.state = Gf.addr.state; s7.zip = Gf.addr.zip; } g7.push('property'); }
        ['bankName', 'acctType', 'acctNo', 'bankAddr', 'transferDate'].forEach(function (k) { if (Gf[k]) { s7[k] = Gf[k]; if (k === 'bankName') { s7.oSource = true; g7.push('source of funds'); } } });
        done(g7, 'letter');
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
  /* opts.style picks a layout (or the gift letter's type) as the builder opens - used by search */
  function open(type, opts) {
    mount(); if (type && B[type]) cur = type; ensure(cur);
    if (opts && opts.style && drafts[cur]) { var sk = cur === 'gift' ? 'type' : 'style'; drafts[cur][sk] = opts.style; if (cur === 'gift') { var gd = giftDefaults(opts.style); for (var gk in gd) drafts.gift[gk] = gd[gk]; drafts.gift.upTo = opts.style === 'conv'; } persist(); }
    lastFocus = document.activeElement; $('mtB').classList.add('open'); document.documentElement.style.overflow = 'hidden';
    renderNav(); renderForm(); refresh(true);
    var c = document.querySelector('#mtB [data-a="close"]'); if (c) c.focus();
  }
  function close() { var w = $('mtB'); if (!w) return; saveVersion(cur, 'Closed'); var vm = $('mtBvmenu'); if (vm) vm.hidden = true; w.classList.remove('open'); document.documentElement.style.overflow = ''; if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} }

  /* ------------------------------------------------------------ entry points */
  function hooks() {
    /* the Loan Suite's own Addendum and Lease buttons open the new builders; the older forms stay one click away there */
    if (window.V14 && V14.open && !V14.open.__mtb) {
      var o = V14.open, w = function (id) { if (id === 'v14AddModal' && !w.classic) return open('addendum'); if (id === 'v14LeaseModal' && !w.classic) return open('lease'); return o.apply(this, arguments); };
      w.__mtb = true; V14.__mtbOrig = o; V14.open = w;
    }
    if (window.V15 && V15.openPay && !V15.openPay.__mtb) { var op = function () { open('pay'); }; op.__mtb = true; V15.openPay = op; }
    /* a Build button on the Income Calculator's Documents tab and the Loan Suite's Documents pages */
    ['panel-docs', 'v50UnifiedDocuments'].forEach(function (id) {
      var host = $(id); if (!host || host.querySelector('.mt-build-entry')) return;
      var d = document.createElement('div'); d.className = 'mt-build-entry no-print';
      d.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin:0 0 14px;padding:12px 14px;border-radius:12px;border:1px solid rgba(90,162,255,.45);background:rgba(90,162,255,.08)';
      d.innerHTML = '<div><b style="font-size:14px">Document builder</b><div style="font-size:12.5px;opacity:.8">Addendum, lease, contractor estimate, profit and loss, Schedule C analysis, pay statement, gift letter, Loan Estimate draft, commitment letter, MI and renovation fees.</div></div><div style="display:flex;flex-wrap:wrap;gap:6px">' +
        ORDER.map(function (k) { return '<button type="button" class="btn btn-light btn-sm" data-mtb="' + k + '" style="cursor:pointer">' + B[k].label + '</button>'; }).join('') + '</div>';
      d.addEventListener('click', function (e) { var b = e.target.closest('[data-mtb]'); if (b) open(b.getAttribute('data-mtb')); });
      var head = host.querySelector(':scope > .section-head, :scope > header'); head && head.nextSibling ? host.insertBefore(d, head.nextSibling) : host.insertBefore(d, host.firstChild);
    });
  }
  /* v57 phase 4: no polling - hooks run when the page is ready and shortly after clicks, when the Documents panels appear */
  var hT = 0; setTimeout(hooks, 400); setTimeout(hooks, 1500); document.addEventListener('click', function () { clearTimeout(hT); hT = setTimeout(hooks, 300); }, true);
  /* what search can find without opening the builder: every document type, layout and sample scope */
  function catalog() {
    var lists = {addendum: ADD_STYLES, lease: LEASE_STYLES, estimate: EST_STYLES, pl: PL_STYLES, pay: PAY_STYLES, gift: GIFT_TYPES, schc: [['analysis', 'Cash-flow analysis'], ['summary', 'One-page summary']]};
    return ORDER.map(function (k) { return {type: k, label: B[k].label, sub: B[k].sub, styles: lists[k] || []}; }).concat([{type: 'estimate', label: 'Contractor estimate sample scopes', sub: '', styles: [], presets: Object.keys(EST_PRESETS).map(function (k) { return [k, EST_PRESETS[k][0]]; })}]);
  }
  window.MTBuild = {open: open, close: close, catalog: catalog, builders: B, drafts: function () { return drafts; }, parseApproval: parseApproval, parseContract: parseContract, file: file, transferTax: transferTax};
})();
