/* Mortgage Suite 56.0 - Document Center.
   One document library for the whole suite. A document uploaded on any page (Loan Suite, Income Calculator, Quick, Doc
   Organizer) is kept in this browser (IndexedDB) and listed on every page, by section: Income, Assets, Property, Loan & costs,
   Renovation, Credit, Non-QM.
   Each document is read (PDF text, or OCR for scans and photos), its type is recognised, and the values it prints are listed
   with the field each one goes to. Send puts the ticked values in those fields - straight away when that field is on the page,
   otherwise the next time the page that owns it opens (Loan Suite or Income Calculator). Income documents (pay stubs, W-2s,
   tax returns, benefit letters) go through the Income Calculator's own document reader. Nothing leaves the browser. */
(function () {
  'use strict';
  if (window.MTDocs && window.MTDocs.__v56) return;
  var $ = function (id) { return document.getElementById(id); };
  function G(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function N(v) { var t = String(v == null ? '' : v).trim(), neg = /^\(.*\)$/.test(t) || /^-/.test(t); t = t.replace(/[()$,\s%]/g, '').replace(/^-/, ''); var n = parseFloat(t); return isFinite(n) ? (neg ? -n : n) : 0; }
  function usd(v) { var n = N(v); return (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
  function uid() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function suiteStore() { try { return window.mortgageSuite && window.mortgageSuite.store; } catch (e) { return null; } }
  function calcState() { var S = G('S'); return S && S.w2 && S.dti ? S : null; }
  var PAGE = /income-calculator/i.test(location.pathname) ? 'income' : /loan-suite|full-suite|all-in-one/i.test(location.pathname) ? 'suite' : /quick|index/i.test(location.pathname) || location.pathname.slice(-1) === '/' ? 'quick' : /doc-organizer/i.test(location.pathname) ? 'docorg' : 'other';
  if (window.LOS_EMBED && LOS_EMBED.page === 'income') PAGE = 'income';

  /* ===================================================================== reading */
  function loadScript(srcs) {
    return new Promise(function (resolve) {
      var i = 0; (function next() {
        if (i >= srcs.length) return resolve(false);
        /* 56.1: hide the Loan Suite's AMD loader so UMD libraries register as globals */
        var d = window.define; window.define = undefined;
        var s = document.createElement('script'); s.src = srcs[i++]; s.async = true;
        s.onload = function () { window.define = d; resolve(true); }; s.onerror = function () { window.define = d; next(); }; document.head.appendChild(s);
      })();
    });
  }
  var PDFJS = '3.11.174';
  async function pdfLib() {
    if (window.pdfjsLib && pdfjsLib.getDocument) return pdfjsLib;
    var lp = G('loadPdfJs'); if (typeof lp === 'function') { try { await lp(); } catch (e) {} if (window.pdfjsLib) return pdfjsLib; }
    await loadScript(['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS + '/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDFJS + '/build/pdf.min.js']);
    if (window.pdfjsLib && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS + '/pdf.worker.min.js';
    return window.pdfjsLib || null;
  }
  async function tess() {
    if (window.Tesseract) return window.Tesseract;
    var lt = G('loadTesseract'); if (typeof lt === 'function') { try { await lt(); } catch (e) {} if (window.Tesseract) return Tesseract; }
    await loadScript(['https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js', 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js']);
    return window.Tesseract || null;
  }
  /* v57: better OCR for screenshots and photos.
     1. The image is prepared first: small images are enlarged (screen text is often 11-13 px, too small for OCR), turned to
        greyscale with the contrast stretched, and dark screens (light text on navy, as in this suite) are flipped to dark on white.
     2. One OCR worker is kept and reused, with spacing between columns kept (tables, condition grids, statements).
     3. If the first reading is unsure (confidence under 65), the page is read again as one block of text and the surer reading wins. */
  var workerP = null, curProg = null;
  function worker(T) {
    if (!workerP) workerP = T.createWorker('eng', 1, {logger: function (m) { if (curProg && m.status === 'recognizing text') curProg(m.progress); }})
      .then(function (w) { return w.setParameters({preserve_interword_spaces: '1'}).then(function () { return w; }); })
      .catch(function (e) { workerP = null; throw e; });
    return workerP;
  }
  function prep(src) {
    var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height; if (!w || !h) return src;
    var scale = Math.min(4, Math.max(1, 2200 / w)); if (w * h * scale * scale > 24e6) scale = Math.max(1, Math.sqrt(24e6 / (w * h)));
    var c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    var g = c.getContext('2d', {willReadFrequently: true}); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0, c.width, c.height);
    var d = g.getImageData(0, 0, c.width, c.height), p = d.data, n = p.length / 4, hist = new Uint32Array(256), sum = 0, k, y;
    for (k = 0; k < p.length; k += 4) { y = (0.299 * p[k] + 0.587 * p[k + 1] + 0.114 * p[k + 2]) | 0; p[k] = y; hist[y]++; sum += y; }
    var lo = 0, hi = 255, acc = 0; for (k = 0; k < 256; k++) { acc += hist[k]; if (acc > n * 0.01) { lo = k; break; } } acc = 0; for (k = 255; k >= 0; k--) { acc += hist[k]; if (acc > n * 0.01) { hi = k; break; } }
    var inv = sum / n < 110, span = Math.max(1, hi - lo);
    for (k = 0; k < p.length; k += 4) { y = Math.max(0, Math.min(255, (p[k] - lo) * 255 / span)); if (inv) y = 255 - y; p[k] = p[k + 1] = p[k + 2] = y; p[k + 3] = 255; }
    g.putImageData(d, 0, 0);
    return c;
  }
  async function ocr(images, prog) {
    var T = await tess(); if (!T) throw new Error('The OCR engine could not be loaded - an internet connection is needed the first time OCR runs.');
    var W = await worker(T), out = '';
    for (var i = 0; i < images.length; i++) {
      var img = prep(images[i]); curProg = function (f) { if (prog) prog((i + f) / images.length); };
      await W.setParameters({tessedit_pageseg_mode: '3'});
      var r = await W.recognize(img), best = r.data;
      if ((best.confidence || 0) < 65) { await W.setParameters({tessedit_pageseg_mode: '6'}); var r2 = await W.recognize(img); if ((r2.data.confidence || 0) > (best.confidence || 0)) best = r2.data; }
      out += best.text + '\n';
    }
    curProg = null;
    return out;
  }
  /* 56.1: a text layer counts only when it reads as text - scanned PDFs can carry encoded binary that is long but unreadable */
  function readable(t) { t = String(t || ''); var s = t.replace(/\s/g, ''); if (s.length < 40) return false; var good = (s.match(/[A-Za-z0-9$.,:;%()\/#&'"-]/g) || []).length, words = (t.match(/[A-Za-z]{3,}/g) || []).length; return good / s.length > 0.85 && words >= 8; }
  window.MTReadable = readable;
  async function pdfText(file, prog) {
    var native = G('nativePdfText'), t = '';
    if (typeof native === 'function') { try { t = await native(file); } catch (e) {} if (readable(t)) return t; }
    var L = await pdfLib(); if (!L) { if (t) return t; throw new Error('The PDF reader could not be loaded.'); }
    var pdf = await L.getDocument({data: await file.arrayBuffer(), disableWorker: true}).promise, out = '';
    for (var p = 1; p <= pdf.numPages; p++) {
      var pg = await pdf.getPage(p), tc = await pg.getTextContent();
      var items = (tc.items || []).map(function (it) { return {s: String(it.str || ''), x: +(it.transform && it.transform[4]) || 0, y: +(it.transform && it.transform[5]) || 0}; }).filter(function (it) { return it.s.trim(); });
      items.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
      var rows = []; items.forEach(function (it) { var r = rows[rows.length - 1]; if (!r || Math.abs(r.y - it.y) > 2) { r = {y: it.y, items: []}; rows.push(r); } r.items.push(it); });
      rows.forEach(function (r) { r.items.sort(function (a, b) { return a.x - b.x; }); out += r.items.map(function (i) { return i.s; }).join(' ').replace(/\s+/g, ' ').trim() + '\n'; });
      if (prog) prog(p / pdf.numPages * 0.5);
    }
    if (readable(out)) return out;
    var imgs = [];
    for (var k = 1; k <= Math.min(pdf.numPages, 12); k++) {
      var page = await pdf.getPage(k), vp = page.getViewport({scale: 2}), c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height; await page.render({canvasContext: c.getContext('2d'), viewport: vp, intent: 'print'}).promise; imgs.push(c);
    }
    return ocr(imgs, function (f) { if (prog) prog(0.5 + f / 2); });
  }
  async function readText(file, prog) {
    var name = file.name || '', type = file.type || '';
    if (/\.pdf$/i.test(name) || type === 'application/pdf') return pdfText(file, prog);
    if (/^image\//.test(type) || /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(name)) {
      var img = await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('This image could not be opened.')); }; i.src = URL.createObjectURL(file); });
      return ocr([img], prog);
    }
    return file.text();
  }

  /* ============================================================== shared storage */
  var DB = 'mtgcalc-docs', VER = 1, OS = 'docs', mem = [], ready = null;
  var bc = null; try { bc = new BroadcastChannel('mtgcalc-docs'); bc.onmessage = function () { load().then(paint); }; } catch (e) {}
  function db() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no indexedDB'));
      var r = indexedDB.open(DB, VER);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains(OS)) d.createObjectStore(OS, {keyPath: 'id'}); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
  }
  function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction(OS, mode), s = t.objectStore(OS), out = fn(s); t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); }; t.onerror = function () { rej(t.error); }; }); }); }
  function load() { ready = tx('readonly', function (s) { return s.getAll(); }).then(function (all) { mem = (all || []).sort(function (a, b) { return b.added - a.added; }); return mem; }).catch(function () { return mem; }); return ready; }
  function save(doc) { var i = mem.findIndex(function (d) { return d.id === doc.id; }); if (i < 0) mem.unshift(doc); else mem[i] = doc; return tx('readwrite', function (s) { s.put(doc); }).catch(function () {}).then(function () { try { bc && bc.postMessage('x'); } catch (e) {} }); }
  function drop(id) { mem = mem.filter(function (d) { return d.id !== id; }); return tx('readwrite', function (s) { s.delete(id); }).catch(function () {}).then(function () { try { bc && bc.postMessage('x'); } catch (e) {} }); }

  /* ======================================================== types and extraction */
  var SECTIONS = [['all', 'All'], ['income', 'Income'], ['assets', 'Assets'], ['property', 'Property'], ['loan', 'Loan & costs'], ['renovation', 'Renovation'], ['credit', 'Credit'], ['nqm', 'Non-QM']];
  var TYPES = [
    {id: 'paystub', label: 'Pay stub', sec: 'income', income: 1, kw: [/pay\s*(stub|statement|slip)/i, /earnings statement/i, /gross pay/i, /net pay/i, /pay period/i, /\bytd\b/i]},
    {id: 'w2', label: 'W-2', sec: 'income', income: 1, kw: [/wage and tax statement/i, /form\s*w-?2\b/i, /\bw-2\b/i, /employer identification/i]},
    {id: 'voe', label: 'Verification of employment', sec: 'income', income: 1, kw: [/verification of employment/i, /\bvoe\b/i, /work number/i]},
    {id: 'taxreturn', label: 'Tax return (1040, Schedule C / E, K-1, 1120-S, 1065)', sec: 'income', income: 1, kw: [/form 1040/i, /schedule c\b/i, /schedule e\b/i, /schedule k-1/i, /1120-?s/i, /form 1065/i, /u\.s\. individual income tax/i]},
    {id: 'benefits', label: 'Social Security / pension / 1099', sec: 'income', income: 1, kw: [/social security/i, /ssa-1099/i, /1099-r/i, /pension/i, /annuity/i, /award letter/i, /benefit statement/i]},
    {id: 'bank', label: 'Bank statement', sec: 'assets', kw: [/statement period/i, /beginning balance/i, /ending balance/i, /deposits and (other )?(credits|additions)/i, /\bchecking\b/i, /\bsavings\b/i, /account summary/i]},
    {id: 'retirement', label: 'Retirement / investment statement', sec: 'assets', kw: [/401\s*\(?k\)?/i, /403\s*\(?b\)?/i, /\bira\b/i, /vested (balance|value)/i, /brokerage/i, /investment account/i, /portfolio value/i, /total account value/i]},
    {id: 'gift', label: 'Gift letter', sec: 'assets', kw: [/gift letter/i, /\bdonor\b/i, /gift of \$/i, /no repayment/i, /is a gift/i]},
    {id: 'emd', label: 'Earnest money receipt', sec: 'assets', kw: [/earnest money/i, /deposit receipt/i, /good faith deposit/i, /escrow deposit/i]},
    {id: 'contract', label: 'Purchase contract', sec: 'loan', kw: [/purchase (and sale )?(agreement|contract)/i, /contract of sale/i, /purchase price/i, /seller('s)? (concession|credit|contribution)/i, /\bpurchaser\b/i, /\bseller\b/i]},
    {id: 'lecd', label: 'Loan Estimate / Closing Disclosure', sec: 'loan', kw: [/loan estimate/i, /closing disclosure/i, /projected payments/i, /loan costs/i, /origination charges/i]},
    {id: 'fees', label: 'Fee sheet', sec: 'loan', kw: [/fee (sheet|worksheet)/i, /itemization/i, /origination fee/i, /settlement charges/i]},
    {id: 'mortgage', label: 'Mortgage statement (another property)', sec: 'loan', kw: [/mortgage statement/i, /principal balance/i, /unpaid principal/i, /payment due/i, /escrow balance/i, /amount due/i]},
    {id: 'appraisal', label: 'Appraisal', sec: 'property', kw: [/uniform residential appraisal/i, /appraised value/i, /opinion of market value/i, /form 10(04|25|73)/i, /\bas (is|completed|repaired)\b/i, /sales comparison/i]},
    {id: 'tax', label: 'Property tax bill', sec: 'property', kw: [/tax bill/i, /property tax/i, /school tax/i, /(town|county|city) tax/i, /assessed value/i, /tax year/i, /tax receiver/i]},
    {id: 'insurance', label: 'Homeowners / flood insurance', sec: 'property', kw: [/declarations?/i, /homeowners? (insurance|policy)/i, /dwelling coverage/i, /annual premium/i, /policy period/i, /flood insurance/i]},
    {id: 'hoa', label: 'HOA / condo statement', sec: 'property', kw: [/homeowners association/i, /\bhoa\b/i, /condominium/i, /common charges/i, /association dues/i, /maintenance fee/i]},
    {id: 'lease', label: 'Lease / rent schedule (Form 1007)', sec: 'property', kw: [/lease agreement/i, /monthly rent/i, /\btenant\b/i, /\blandlord\b/i, /rent schedule/i, /form 1007/i, /residential lease/i]},
    {id: 'reno', label: 'Contractor bid / renovation estimate', sec: 'renovation', kw: [/contractor/i, /scope of work/i, /\bbid\b/i, /proposal/i, /renovation/i, /rehab/i, /\blabor\b/i, /materials/i]},
    {id: 'credit', label: 'Credit report', sec: 'credit', kw: [/credit report/i, /\bfico\b/i, /equifax/i, /experian/i, /transunion/i, /credit score/i, /tradelines?/i]},
    {id: 'nqmbank', label: 'Business bank statements (Non-QM)', sec: 'nqm', kw: [/business (checking|account)/i, /\bllc\b|\binc\.?\b|\bcorp\b/i]},
    {id: 'pl', label: 'Profit and loss statement', sec: 'nqm', kw: [/profit\s*(and|&)\s*loss/i, /\bp\s*&\s*l\b/i, /income statement/i, /total expenses/i, /net (income|profit)/i, /gross profit/i]},
    {id: 'other', label: 'Other document', sec: 'all', kw: []}
  ];
  var TYPE = {}; TYPES.forEach(function (t) { TYPE[t.id] = t; });
  function detect(text, name) {
    var head = String(text).slice(0, 8000), best = 'other', score = 0;
    TYPES.forEach(function (t) {
      var s = 0; t.kw.forEach(function (k) { if (k.test(head)) s++; if (k.test(name || '')) s += 2; });
      if (s > score) { score = s; best = t.id; }
    });
    if (best === 'nqmbank' && TYPE.bank.kw.filter(function (k) { return k.test(head); }).length < 2) best = 'bank';
    if (best === 'bank' && /profit\s*(and|&)\s*loss/i.test(head)) best = 'pl';
    return score >= 1 ? best : 'other';
  }

  /* destinations: 'loan:<path>' Loan Suite field; 'calc:...' Income Calculator */
  var DEST = [
    ['Loan Suite - File & property', [['loan:borrowerName', 'Borrower name', 'text'], ['loan:propertyAddress', 'Property address', 'text'], ['loan:zipCode', 'ZIP code', 'text'], ['loan:units', 'Units', 'num'], ['loan:closingDate', 'Closing date', 'date']]],
    ['Loan Suite - Loan & value', [['loan:basePurchasePrice', 'Purchase price', 'num'], ['loan:asIsValue', 'As-is / appraised value', 'num'], ['loan:afterRepairValue', 'After-repair value', 'num'], ['loan:interestRate', 'Note rate (%)', 'pct'], ['loan:termYears', 'Term (years)', 'num'], ['loan:creditScore', 'Credit score', 'num'], ['loan:sellerConcessionAmount', 'Seller concession ($)', 'num'], ['loan:closing.earnestMoneyDeposit', 'Earnest money deposit', 'num']]],
    ['Loan Suite - Escrow', [['loan:propertyTaxAmount', 'Property tax (annual)', 'num'], ['loan:insuranceAmount', 'Homeowners insurance (annual)', 'num'], ['loan:escrow.annualFlood', 'Flood insurance (annual)', 'num'], ['loan:hoaMonthly', 'HOA (monthly)', 'num']]],
    ['Loan Suite - Closing costs', [['loan:closing.overrides.lenderOrigination', 'Origination fee', 'num'], ['loan:closing.overrides.lenderProcessing', 'Processing / underwriting', 'num'], ['loan:closing.overrides.appraisal', 'Appraisal fee', 'num'], ['loan:closing.overrides.creditReport', 'Credit report fee', 'num'], ['loan:closing.overrides.floodTaxService', 'Flood cert / tax service', 'num'], ['loan:closing.overrides.titleInsurance', 'Title insurance', 'num'], ['loan:closing.overrides.titleSearchSettlement', 'Title search / settlement', 'num'], ['loan:closing.overrides.attorney', 'Attorney fee', 'num'], ['loan:closing.overrides.survey', 'Survey', 'num'], ['loan:closing.overrides.recording', 'Recording fees', 'num'], ['loan:closing.overrides.other', 'Other fees', 'num']]],
    ['Loan Suite - Renovation', [['loan:reno.baseCost', 'Contractor / renovation cost', 'num'], ['loan:reno.permits', 'Permits', 'num'], ['loan:reno.architectural', 'Architectural / engineering', 'num'], ['loan:draws.manualDrawCount', 'Number of draws', 'num']]],
    ['Loan Suite - Assets & rent', [['loan:assets.liquidAssets', 'Liquid assets', 'num'], ['loan:assets.retirementOtherAssets', 'Retirement / other assets', 'num'], ['loan:assets.giftFunds', 'Gift funds', 'num'], ['loan:rental.mainUnit.gross', 'Main unit gross rent', 'num'], ['loan:rental.unit2.gross', 'Unit 2 gross rent', 'num'], ['loan:rental.unit3.gross', 'Unit 3 gross rent', 'num'], ['loan:rental.unit4.gross', 'Unit 4 gross rent', 'num']]],
    ['Income Calculator', [['calc:asset:checking', 'Asset account - checking / savings', 'num'], ['calc:asset:mm', 'Asset account - money market / CD', 'num'], ['calc:asset:stocks', 'Asset account - stocks / bonds', 'num'], ['calc:asset:ret59', 'Asset account - retirement 59½+', 'num'], ['calc:asset:ret', 'Asset account - retirement under 59½', 'num'], ['calc:debt', 'Monthly debt (PITIA & DTI)', 'num'], ['calc:nqm.bank', 'Non-QM bank statement month (deposits)', 'num'], ['calc:nqm.pl.revenue', 'Non-QM P&L revenue', 'num'], ['calc:nqm.pl.cogs', 'Non-QM P&L cost of goods sold', 'num'], ['calc:nqm.pl.expenses', 'Non-QM P&L expenses', 'num'], ['calc:nqm.dscr.rent', 'Non-QM DSCR rent (monthly)', 'num']]]
  ];
  var DESTBY = {}; DEST.forEach(function (g) { g[1].forEach(function (d) { DESTBY[d[0]] = {id: d[0], label: d[1], kind: d[2], group: g[0]}; }); });

  var MONEY = /\(?-?\$?\s?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\)?|\(?-?\$?\s?\d+\.\d{2}\)?|\$\s?\d+(?:\.\d{1,2})?/g;
  function moneys(s) { return (String(s).match(MONEY) || []).map(N); }
  function lines(t) { return String(t || '').split(/\r?\n/).map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(Boolean); }
  /* first amount printed after a label (same line, else the next line) */
  function amt(L, labels, opt) {
    opt = opt || {};
    for (var a = 0; a < labels.length; a++) for (var i = 0; i < L.length; i++) {
      var low = L[i].toLowerCase(), k = low.indexOf(labels[a]); if (k < 0) continue;
      if (opt.avoid && opt.avoid.test(low)) continue;
      var v = moneys(L[i].slice(k + labels[a].length)); if (!v.length && L[i + 1]) v = moneys(L[i + 1]);
      v = v.filter(function (x) { return (opt.min == null || Math.abs(x) >= opt.min) && (opt.max == null || Math.abs(x) <= opt.max); });
      if (v.length) return {v: Math.abs(opt.last ? v[v.length - 1] : v[0]), line: L[i]};
    }
    return null;
  }
  function pctAfter(L, labels) {
    for (var a = 0; a < labels.length; a++) for (var i = 0; i < L.length; i++) { var low = L[i].toLowerCase(), k = low.indexOf(labels[a]); if (k < 0) continue;
      var m = L[i].slice(k).match(/(\d{1,2}\.\d{1,4})\s*%/) || (L[i + 1] || '').match(/(\d{1,2}\.\d{1,4})\s*%/); if (m) return +m[1]; }
    return null;
  }
  function intAfter(L, labels, lo, hi) {
    for (var a = 0; a < labels.length; a++) for (var i = 0; i < L.length; i++) { var low = L[i].toLowerCase(), k = low.indexOf(labels[a]); if (k < 0) continue;
      var m = (L[i].slice(k + labels[a].length) + ' ' + (L[i + 1] || '')).match(/\b(\d{1,4})\b/g) || []; for (var j = 0; j < m.length; j++) { var n = +m[j]; if (n >= lo && n <= hi) return n; } }
    return null;
  }
  function dateAfter(L, labels) {
    var re = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})|([A-Z][a-z]{2,8})\.?\s+(\d{1,2}),?\s+(\d{4})/;
    var MO = {jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12};
    for (var a = 0; a < labels.length; a++) for (var i = 0; i < L.length; i++) { var low = L[i].toLowerCase(), k = low.indexOf(labels[a]); if (k < 0) continue;
      var m = (L[i].slice(k) + ' ' + (L[i + 1] || '')).match(re); if (!m) continue;
      var y, mo, d; if (m[1]) { mo = +m[1]; d = +m[2]; y = +m[3]; if (y < 100) y += 2000; } else { mo = MO[m[4].slice(0, 3).toLowerCase()]; d = +m[5]; y = +m[6]; }
      if (mo && d && y) return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2); }
    return null;
  }
  function textAfter(L, labels) {
    for (var a = 0; a < labels.length; a++) for (var i = 0; i < L.length; i++) { var low = L[i].toLowerCase(), k = low.indexOf(labels[a]); if (k < 0) continue;
      var rest = L[i].slice(k + labels[a].length).replace(/^[\s:#\-]+/, '').trim(); if (rest.length < 4 && L[i + 1]) rest = L[i + 1];
      if (rest) return rest.slice(0, 90); }
    return null;
  }
  function row(label, value, dest, on, note) { return {id: uid(), label: label, value: value, dest: dest || '', on: on !== false && !!dest, note: note || ''}; }
  var EX = {
    bank: function (L, t) {
      var r = [], bal = amt(L, ['ending balance', 'closing balance', 'new balance', 'ending daily balance', 'balance as of', 'current balance'], {avoid: /average|minimum|beginning|previous/});
      if (bal) { r.push(row('Ending balance', bal.v, 'loan:assets.liquidAssets')); r.push(row('Ending balance (asset account)', bal.v, 'calc:asset:checking')); }
      var dep = amt(L, ['total deposits and other credits', 'deposits and other credits', 'deposits and additions', 'total deposits', 'total credits'], {avoid: /number|#|count/});
      if (dep) r.push(row('Total deposits this period', dep.v, '', false, 'For the large-deposit review'));
      var big = []; L.forEach(function (l) { if (/deposit|transfer|zelle|wire|credit/i.test(l) && !/total|balance|summary|deposits and|deposits &|other credits|withdrawals/i.test(l)) { var v = moneys(l); if (v.length && Math.abs(v[0]) >= 5000) big.push(Math.abs(v[0])); } });
      if (big.length) r.push(row('Large deposits (' + big.length + ')', big.reduce(function (s, x) { return s + x; }, 0), '', false, big.slice(0, 6).map(usd).join(', ') + ' - each needs a source'));
      return r;
    },
    nqmbank: function (L, t) {
      var NQ = window.NQM, list = NQ && NQ.parseBank ? NQ.parseBank(t) : [];
      if (!list.length) { var d = amt(L, ['total deposits and other credits', 'deposits and other credits', 'deposits and additions', 'total deposits', 'total credits'], {avoid: /number|#|count/}); if (d) list = [{label: '', deposits: d.v, transfers: 0}]; }
      return list.map(function (s) { var x = row('Deposits' + (s.label ? ' - ' + s.label : ''), s.deposits, 'calc:nqm.bank', true, s.transfers ? 'Transfers in ' + usd(s.transfers) + ' go to Less: transfers / ineligible' : ''); x.meta = {label: s.label, transfers: s.transfers}; return x; });
    },
    retirement: function (L) {
      var b = amt(L, ['vested balance', 'vested value', 'total account value', 'ending balance', 'total value', 'market value', 'account balance', 'closing balance'], {avoid: /beginning|previous|loan/});
      return b ? [row('Vested / ending balance', b.v, 'loan:assets.retirementOtherAssets'), row('Balance (asset account)', b.v, 'calc:asset:ret')] : [];
    },
    gift: function (L) { var g = amt(L, ['gift in the amount of', 'gift amount', 'amount of gift', 'gift of', 'the sum of', 'amount']); return g ? [row('Gift amount', g.v, 'loan:assets.giftFunds')] : []; },
    emd: function (L) { var e = amt(L, ['earnest money', 'deposit amount', 'amount received', 'the sum of', 'amount']); return e ? [row('Earnest money deposit', e.v, 'loan:closing.earnestMoneyDeposit')] : []; },
    contract: function (L) {
      var r = [], p = amt(L, ['purchase price', 'sales price', 'contract price', 'total price', 'price'], {min: 10000});
      if (p) r.push(row('Purchase price', p.v, 'loan:basePurchasePrice'));
      var e = amt(L, ['earnest money', 'down payment deposit', 'initial deposit', 'deposit'], {min: 100, max: 2e6}); if (e) r.push(row('Earnest money deposit', e.v, 'loan:closing.earnestMoneyDeposit'));
      var s = amt(L, ['seller concession', 'seller credit', 'seller contribution', 'seller shall credit', 'seller to pay']); if (s) r.push(row('Seller concession', s.v, 'loan:sellerConcessionAmount'));
      var d = dateAfter(L, ['closing date', 'settlement date', 'closing shall', 'on or before', 'closing on']); if (d) r.push(row('Closing date', d, 'loan:closingDate'));
      var a = textAfter(L, ['property address', 'premises known as', 'property located at', 'premises']); if (a) r.push(row('Property address', a, 'loan:propertyAddress', false));
      return r;
    },
    lecd: function (L) {
      var r = [], rate = pctAfter(L, ['interest rate', 'note rate']); if (rate) r.push(row('Interest rate (%)', rate, 'loan:interestRate'));
      var term = intAfter(L, ['loan term'], 5, 40); if (term) r.push(row('Loan term (years)', term, 'loan:termYears'));
      var price = amt(L, ['sale price', 'purchase price', 'property value'], {min: 10000}); if (price) r.push(row('Sale price', price.v, 'loan:basePurchasePrice', false));
      return r.concat(EX.fees(L)).concat((function () {
        var o = [], tx = amt(L, ['property taxes'], {max: 50000}), ins = amt(L, ["homeowner's insurance", 'homeowners insurance'], {max: 50000});
        if (tx) o.push(row('Property taxes (monthly x 12)', Math.round(tx.v * (tx.v < 3000 ? 12 : 1) * 100) / 100, 'loan:propertyTaxAmount', false, 'Check: an LE prints taxes per month'));
        if (ins) o.push(row('Homeowners insurance (monthly x 12)', Math.round(ins.v * (ins.v < 1000 ? 12 : 1) * 100) / 100, 'loan:insuranceAmount', false));
        return o; })());
    },
    fees: function (L) {
      var r = [], F = [[['origination charges', 'origination fee', 'loan origination'], 'Origination', 'loan:closing.overrides.lenderOrigination'], [['processing fee', 'underwriting fee'], 'Processing / underwriting', 'loan:closing.overrides.lenderProcessing'],
        [['appraisal fee', 'appraisal'], 'Appraisal fee', 'loan:closing.overrides.appraisal'], [['credit report'], 'Credit report fee', 'loan:closing.overrides.creditReport'], [['flood certification', 'flood determination', 'tax service'], 'Flood cert / tax service', 'loan:closing.overrides.floodTaxService'],
        [["lender's title", 'lenders title', 'title insurance', "title - lender's"], 'Title insurance', 'loan:closing.overrides.titleInsurance'], [['settlement fee', 'title search', 'closing fee', 'settlement agent'], 'Title search / settlement', 'loan:closing.overrides.titleSearchSettlement'],
        [['attorney fee', 'attorney'], 'Attorney fee', 'loan:closing.overrides.attorney'], [['survey'], 'Survey', 'loan:closing.overrides.survey'], [['recording fees', 'recording fee', 'recording'], 'Recording fees', 'loan:closing.overrides.recording']];
      F.forEach(function (f) { var v = amt(L, f[0], {max: 100000}); if (v) r.push(row(f[1], v.v, f[2])); });
      return r;
    },
    mortgage: function (L) {
      var r = [], p = amt(L, ['regular monthly payment', 'monthly payment', 'total payment due', 'payment amount', 'amount due'], {max: 50000}); if (p) r.push(row('Monthly mortgage payment', p.v, 'calc:debt'));
      var b = amt(L, ['unpaid principal balance', 'principal balance', 'outstanding principal'], {min: 1000}); if (b) r.push(row('Principal balance', b.v, '', false, 'For the REO schedule'));
      var e = amt(L, ['escrow balance', 'escrow payment'], {max: 50000}); if (e) r.push(row('Escrow', e.v, '', false));
      return r;
    },
    appraisal: function (L) {
      var r = [], v = amt(L, ['appraised value', 'opinion of market value', 'indicated value by sales comparison', 'market value of the subject', 'indicated value', 'market value'], {min: 10000, avoid: /rent|land/});
      if (v) r.push(row('Appraised value', v.v, 'loan:asIsValue'));
      var arv = amt(L, ['as completed', 'as repaired', 'subject to completion', 'after repair', 'as-completed'], {min: 10000}); if (arv) r.push(row('As-completed value', arv.v, 'loan:afterRepairValue'));
      var rent = amt(L, ['opinion of market rent', 'estimated monthly market rent', 'market rent', 'monthly rent'], {min: 100, max: 50000}); if (rent) { r.push(row('Market rent (monthly)', rent.v, 'loan:rental.mainUnit.gross')); r.push(row('Market rent for DSCR', rent.v, 'calc:nqm.dscr.rent', false)); }
      var hoa = amt(L, ['hoa $', 'hoa dues', 'hoa'], {max: 5000}); if (hoa) r.push(row('HOA (monthly)', hoa.v, 'loan:hoaMonthly', false));
      var u = intAfter(L, ['number of units', '# of units', 'units'], 1, 4); if (u) r.push(row('Units', u, 'loan:units'));
      var a = textAfter(L, ['property address', 'subject property']); if (a) r.push(row('Property address', a, 'loan:propertyAddress', false));
      return r;
    },
    tax: function (L, t) {
      var x = amt(L, ['total annual tax', 'annual tax', 'total taxes', 'total tax', 'tax amount', 'total amount due', 'amount due'], {min: 50, max: 500000, avoid: /penalty|interest/});
      if (!x) return [];
      var m = /quarter/i.test(t) ? 4 : /semi-?annual|half/i.test(t) ? 2 : 1;
      return [row('Property tax (annual)' + (m > 1 ? ' - bill x ' + m : ''), Math.round(x.v * m * 100) / 100, 'loan:propertyTaxAmount', true, m > 1 ? 'The bill reads as ' + (m === 4 ? 'quarterly' : 'semi-annual') + ' - check' : '')];
    },
    insurance: function (L, t) {
      var p = amt(L, ['total annual premium', 'annual premium', 'total policy premium', 'total premium', 'policy premium', 'premium'], {min: 50, max: 100000});
      if (!p) return [];
      return /flood/i.test(t.slice(0, 3000)) && !/homeowner/i.test(t.slice(0, 3000)) ? [row('Flood premium (annual)', p.v, 'loan:escrow.annualFlood')] : [row('Homeowners premium (annual)', p.v, 'loan:insuranceAmount')];
    },
    hoa: function (L, t) {
      var m = amt(L, ['monthly assessment', 'monthly dues', 'monthly common charges', 'monthly maintenance', 'per month', 'monthly'], {max: 20000});
      if (m) return [row('HOA dues (monthly)', m.v, 'loan:hoaMonthly')];
      var q = amt(L, ['quarterly assessment', 'quarterly dues', 'per quarter', 'quarterly'], {max: 60000}); if (q) return [row('HOA dues (quarterly / 3)', Math.round(q.v / 3 * 100) / 100, 'loan:hoaMonthly')];
      var y = amt(L, ['annual assessment', 'annual dues', 'per year', 'annually'], {max: 240000}); if (y) return [row('HOA dues (annual / 12)', Math.round(y.v / 12 * 100) / 100, 'loan:hoaMonthly')];
      return [];
    },
    lease: function (L) { var r = amt(L, ['monthly rent', 'rent of', 'base rent', 'rent:', 'per month', 'rent'], {min: 100, max: 50000}); return r ? [row('Monthly rent', r.v, 'loan:rental.mainUnit.gross'), row('Rent for DSCR', r.v, 'calc:nqm.dscr.rent', false)] : []; },
    reno: function (L) {
      var r = [], t = amt(L, ['grand total', 'contract total', 'total estimate', 'total cost', 'total bid', 'total price', 'total'], {min: 500, last: true, avoid: /sub-?total|tax/});
      if (t) r.push(row('Renovation total', t.v, 'loan:reno.baseCost'));
      var p = amt(L, ['permits', 'permit fees', 'permit'], {max: 100000}); if (p) r.push(row('Permits', p.v, 'loan:reno.permits', false, 'Only if not already in the total'));
      var a = amt(L, ['architect', 'engineering', 'plans'], {max: 200000}); if (a) r.push(row('Architectural / engineering', a.v, 'loan:reno.architectural', false));
      return r;
    },
    credit: function (L) {
      var s = []; L.forEach(function (l) { if (/score|fico|equifax|experian|transunion|beacon|vantage/i.test(l)) (l.match(/\b([3-8]\d{2})\b/g) || []).forEach(function (x) { var n = +x; if (n >= 300 && n <= 850 && s.length < 6) s.push(n); }); });
      if (!s.length) return [];
      var three = s.slice(0, 3).sort(function (a, b) { return a - b; }), mid = three.length === 3 ? three[1] : three[0];
      return [row('Representative (middle) score', mid, 'loan:creditScore', true, 'Scores read: ' + s.slice(0, 3).join(', '))];
    },
    pl: function (L, t) {
      var NQ = window.NQM, p = NQ && NQ.parsePL ? NQ.parsePL(t) : {}, r = [];
      if (p.revenue != null) r.push(row('Revenue', p.revenue, 'calc:nqm.pl.revenue')); if (p.cogs != null) r.push(row('Cost of goods sold', p.cogs, 'calc:nqm.pl.cogs'));
      if (p.expenses != null) r.push(row('Total expenses', p.expenses, 'calc:nqm.pl.expenses')); if (p.net != null) r.push(row('Net income (as printed)', p.net, '', false, p.months ? p.months + '-month period' : ''));
      return r;
    }
  };
  function extract(doc) {
    var f = EX[doc.docType]; doc.rows = f ? f(lines(doc.text), doc.text || '') : [];
    return doc;
  }

  /* ============================================================ sending values */
  var QKEY = 'mt.docs.queue.v1';
  function queue() { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch (e) { return []; } }
  function setQueue(q) { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (e) {} }
  function coerce(dest, v) {
    var d = DESTBY[dest]; if (!d) return null;
    if (d.kind === 'num') { var n = N(v); return isFinite(n) ? n : null; }
    if (d.kind === 'pct') { var p = N(v); return Math.abs(p) > 1 ? p / 100 : p; }
    return String(v == null ? '' : v).trim();
  }
  function applyLoan(dest, value) {
    var st = suiteStore(); if (!st || !st.setField) return false;
    var path = dest.slice(5), v = coerce(dest, value); if (v === null || v === '') return false;
    if (path === 'propertyTaxAmount') try { st.setField('propertyTaxBasis', 'Annual', 'Document'); } catch (e) {}
    if (path === 'insuranceAmount') try { st.setField('insuranceBasis', 'Annual', 'Document'); } catch (e) {}
    st.setField(path, v, 'Document Center'); return true;
  }
  function applyCalc(dest, value, meta, docName) {
    var S = calcState(); if (!S) return false;
    var v = N(value), up = G('uid'), id = typeof up === 'function' ? up() : uid();
    if (dest.indexOf('calc:asset:') === 0) {
      var type = dest.slice(11), T = (G('ASSET_TYPES') || []).filter(function (x) { return x.v === type; })[0];
      S.assets.rows.push({id: id, name: (docName || 'Statement').replace(/\.[a-z0-9]+$/i, '').slice(0, 40), type: type, bal: v, elig: T ? T.e : 100});
      try { G('renderAssets')(); } catch (e) {}
    } else if (dest === 'calc:debt') {
      S.dti.debts.push({id: id, name: (docName || 'Mortgage').replace(/\.[a-z0-9]+$/i, '').slice(0, 40), amt: v});
      try { G('renderDTI')(); } catch (e) {}
    } else if (dest.indexOf('calc:nqm.') === 0) {
      var NQ = window.NQM; if (!S.nonqm) { try { NQ && NQ.render && NQ.render(); } catch (e) {} }
      var q = S.nonqm; if (!q) return false;
      if (dest === 'calc:nqm.bank') {
        var dep = q.bank.deposits, k = -1, lab = meta && meta.label;
        for (var j = 0; j < 24 && lab; j++) if (dep[j].label === lab) { k = j; break; }
        if (k < 0) for (var j2 = 0; j2 < 24; j2++) if (!N(dep[j2].gross)) { k = j2; break; }
        if (k < 0) return false;
        dep[k].gross = v; dep[k].inel = meta && meta.transfers || 0; if (lab) dep[k].label = lab;
        q.shown = q.shown || {}; q.shown.bank = true; q.bank.use = true;
      } else {
        var parts = dest.slice(9).split('.'); q[parts[0]][parts[1]] = v; q.shown = q.shown || {}; q.shown[parts[0]] = true; q[parts[0]].use = true;
      }
      try { NQ && NQ.render && NQ.render(); } catch (e) {}
    } else return false;
    try { window.RECALC && window.RECALC(); } catch (e) {}
    return true;
  }
  function send(doc) {
    var done = 0, later = 0, failed = 0;
    var q = queue();
    (doc.rows || []).forEach(function (r) {
      if (!r.on || !r.dest) return;
      var isLoan = r.dest.indexOf('loan:') === 0, ok = false;
      try { ok = isLoan ? applyLoan(r.dest, r.value) : applyCalc(r.dest, r.value, r.meta, doc.name); } catch (e) { ok = false; }
      if (ok) { done++; r.sent = Date.now(); return; }
      if ((isLoan && PAGE !== 'suite') || (!isLoan && PAGE !== 'income')) { q.push({dest: r.dest, value: r.value, meta: r.meta || null, label: r.label, doc: doc.name, at: Date.now()}); later++; r.sent = -1; }
      else failed++;
    });
    setQueue(q); save(doc);
    var parts = [];
    if (done) parts.push(done + ' value(s) placed');
    if (later) parts.push(later + ' waiting for the ' + (PAGE === 'income' ? 'Loan Suite' : 'Income Calculator') + ' - they are placed when it opens' + (window.MtLive && MtLive.on() ? '' : ''));
    if (failed) parts.push(failed + ' could not be placed');
    return parts.join('; ') || 'Nothing ticked to send.';
  }
  function drainQueue() {
    var q = queue(); if (!q.length) return;
    var keep = [], n = 0;
    q.forEach(function (it) {
      var isLoan = it.dest.indexOf('loan:') === 0;
      if ((isLoan && PAGE === 'suite') || (!isLoan && PAGE === 'income')) {
        var ok = false; try { ok = isLoan ? applyLoan(it.dest, it.value) : applyCalc(it.dest, it.value, it.meta, it.doc); } catch (e) {}
        if (ok) { n++; return; }
      }
      keep.push(it);
    });
    setQueue(keep);
    if (n) toast(n + ' value(s) from your documents were placed on this page.');
  }

  /* ======================================================================== UI */
  var CSS = [
    '#mtDocsBtn{position:fixed;left:16px;bottom:16px;z-index:2147482000;display:inline-flex;align-items:center;gap:8px;padding:10px 15px;border-radius:999px;border:1px solid rgba(90,162,255,.5);background:#0b2350;color:#fff;font:600 13px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.3)}',
    '#mtDocsBtn:hover{background:#123a75}#mtDocsBtn:focus-visible{outline:2px solid #8cc0ff;outline-offset:2px}#mtDocsBtn em{font-style:normal;min-width:20px;padding:3px 6px;border-radius:999px;background:#5aa2ff;color:#04122b;text-align:center;font-size:11.5px}',
    '@media print{#mtDocsBtn,#mtDocs{display:none!important}}',
    '#mtDocs{position:fixed;inset:0;z-index:2147483100;display:none}#mtDocs.open{display:block}',
    '#mtDocs .mtd-back{position:absolute;inset:0;border:0;background:rgba(3,12,32,.55);cursor:pointer}',
    '#mtDocs .mtd-sheet{position:absolute;top:0;right:0;bottom:0;width:min(760px,100vw);overflow:auto;background:#06142e;color:#e6eefb;box-shadow:-20px 0 60px rgba(0,0,0,.45);border-left:1px solid #123058}',
    '.mtd{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:inherit;--mtd-line:rgba(127,160,210,.28);--mtd-soft:rgba(90,162,255,.1);--mtd-acc:#5aa2ff;--mtd-mute:#9db0c8}',
    '.mtd-in{padding:18px 20px 28px}.mtd-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}',
    '.mtd-head h2{margin:0;font-size:19px;letter-spacing:-.01em}.mtd-head p{margin:4px 0 0;font-size:12.5px;color:var(--mtd-mute)}',
    '.mtd-x{all:unset;cursor:pointer;width:34px;height:34px;display:grid;place-items:center;border-radius:9px;border:1px solid var(--mtd-line);font-size:17px}.mtd-x:focus-visible{outline:2px solid var(--mtd-acc)}',
    '.mtd-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 12px;padding:3px;border-radius:11px;border:1px solid var(--mtd-line);background:var(--mtd-soft)}',
    '.mtd-tabs button{all:unset;cursor:pointer;padding:7px 11px;border-radius:8px;font-weight:600;font-size:12.5px;color:var(--mtd-mute);display:inline-flex;gap:6px;align-items:center}',
    '.mtd-tabs button[aria-selected="true"]{background:var(--mtd-acc);color:#04122b}.mtd-tabs button:focus-visible{outline:2px solid var(--mtd-acc);outline-offset:1px}.mtd-tabs i{font-style:normal;font-size:11px;opacity:.8}',
    '.mtd-drop{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border:1.5px dashed var(--mtd-line);border-radius:12px;margin-bottom:14px}',
    '.mtd-drop.over{border-color:var(--mtd-acc);background:var(--mtd-soft)}.mtd-drop b{display:block}.mtd-drop span{font-size:12.5px;color:var(--mtd-mute)}',
    '.mtd-btn{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;border:1px solid var(--mtd-line);font-weight:600;font-size:13px;position:relative;overflow:hidden}',
    '.mtd-btn.pri{background:var(--mtd-acc);border-color:var(--mtd-acc);color:#04122b}.mtd-btn:hover{border-color:var(--mtd-acc)}.mtd-btn:focus-visible{outline:2px solid var(--mtd-acc);outline-offset:2px}.mtd-btn input{position:absolute;inset:0;opacity:0;cursor:pointer}',
    '.mtd-list{display:grid;gap:12px}.mtd-empty{padding:18px;border-radius:12px;border:1px solid var(--mtd-line);color:var(--mtd-mute);font-size:13px}',
    '.mtd-doc{border:1px solid var(--mtd-line);border-radius:12px;overflow:hidden}.mtd-dh{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:11px 14px;background:var(--mtd-soft)}',
    '.mtd-dh .nm{flex:1;min-width:160px;font-weight:700;word-break:break-word}.mtd-dh .nm small{display:block;font-weight:500;font-size:12px;color:var(--mtd-mute)}',
    '.mtd select,.mtd input[type=text]{box-sizing:border-box;max-width:100%;padding:6px 8px;border-radius:7px;border:1px solid var(--mtd-line);background:rgba(4,18,43,.6);color:inherit;font:13px/1.3 inherit}',
    '.mtd-db{padding:10px 14px 14px}.mtd-db table{width:100%;border-collapse:collapse;font-size:13px}.mtd-db th{text-align:left;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--mtd-mute);font-weight:600;padding:6px}',
    '.mtd-db td{padding:6px;border-top:1px solid var(--mtd-line);vertical-align:top}.mtd-db td small{display:block;color:var(--mtd-mute);font-size:11.5px}.mtd-db input[type=text]{width:130px}.mtd-db select{width:100%}',
    '.mtd-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}.mtd-st{font-size:12.5px;color:var(--mtd-mute)}.mtd-st.ok{color:#3fcf8e}.mtd-st.bad{color:#ff7b6b}',
    '.mtd-sent{color:#3fcf8e;font-size:11.5px;font-weight:700}.mtd-wait{color:#f0b357;font-size:11.5px;font-weight:700}',
    '.mtd-prog{height:4px;border-radius:4px;background:var(--mtd-line);overflow:hidden;margin-top:6px}.mtd-prog i{display:block;height:100%;background:var(--mtd-acc);width:0;transition:width .2s}',
    '@media (max-width:600px){.mtd-in{padding:14px 14px 24px}.mtd-db thead{display:none}.mtd-db tr{display:grid;grid-template-columns:28px 1fr;gap:4px 8px;padding:8px 0;border-top:1px solid var(--mtd-line)}.mtd-db td{border:0;padding:0}.mtd-db td:nth-child(n+3){grid-column:2}.mtd-db input[type=text]{width:100%}}',
    /* inline panel on the Documents pages */
    '.mtd.inline{border:1px solid var(--mtd-line);border-radius:14px;margin:0 0 16px;background:rgba(6,20,46,.55)}html[data-mt-mode="light"] .mtd.inline{background:#fff;color:#13263d;--mtd-mute:#5b6b7e;--mtd-line:#d9e2ec;--mtd-acc:#1f6fd6}html[data-mt-mode="light"] .mtd.inline select,html[data-mt-mode="light"] .mtd.inline input[type=text]{background:#fff}'
  ].join('\n');
  function toast(msg) {
    try { if (window.LOS && LOS.say) return LOS.say('Documents', msg, 'good', 6000); } catch (e) {}
    try { var T = G('toast'); if (typeof T === 'function') return T(msg); } catch (e) {}
    var t = document.createElement('div'); t.setAttribute('role', 'status'); t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:2147483200;background:#0b2350;color:#fff;padding:10px 16px;border-radius:10px;font:600 13px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35)';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 5000);
  }
  var view = {sec: 'all'}, hosts = [], status = {}, progress = {};
  function count(sec) { return mem.filter(function (d) { return sec === 'all' || TYPE[d.docType] && TYPE[d.docType].sec === sec; }).length; }
  function destOptions(sel) {
    return '<option value="">— do not send —</option>' + DEST.map(function (g) {
      return '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (d) { return '<option value="' + d[0] + '"' + (d[0] === sel ? ' selected' : '') + '>' + esc(d[1]) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
  }
  function docHtml(d) {
    var T = TYPE[d.docType] || TYPE.other, inc = !!T.income, rows = d.rows || [], st = status[d.id] || {};
    var head = '<div class="mtd-dh"><div class="nm">' + esc(d.name) + '<small>' + new Date(d.added).toLocaleDateString() + ' · ' + Math.round((d.size || 0) / 1024) + ' KB' + (d.page ? ' · added on ' + esc(d.page) : '') + '</small></div>' +
      '<label><span class="mtd-st">Type </span><select data-a="type" data-id="' + d.id + '">' + TYPES.map(function (t) { return '<option value="' + t.id + '"' + (t.id === d.docType ? ' selected' : '') + '>' + esc(t.label) + '</option>'; }).join('') + '</select></label>' +
      '<button type="button" class="mtd-btn" data-a="del" data-id="' + d.id + '" aria-label="Remove ' + esc(d.name) + '">Remove</button></div>';
    var body;
    if (progress[d.id] != null) body = '<div class="mtd-db"><div class="mtd-st">Reading… scanned pages use OCR and can take a little while.</div><div class="mtd-prog"><i style="width:' + Math.round(progress[d.id] * 100) + '%"></i></div></div>';
    else if (d.error) body = '<div class="mtd-db"><div class="mtd-st bad">' + esc(d.error) + '</div></div>';
    else if (inc) body = '<div class="mtd-db"><p class="mtd-st" style="margin:0 0 8px">Income documents are read by the Income Calculator\'s own worksheet reader, where each figure is reviewed against its worksheet.</p>' +
      '<div class="mtd-acts"><button type="button" class="mtd-btn pri" data-a="income" data-id="' + d.id + '">' + (PAGE === 'income' ? 'Read it on the Documents tab' : 'Open in the Income Calculator') + '</button></div></div>';
    else if (!rows.length) body = '<div class="mtd-db"><p class="mtd-st" style="margin:0">No values recognised for a ' + esc(T.label.toLowerCase()) + '. Pick another type above if this is a different document' + (d.text && d.text.replace(/\s/g, '').length < 40 ? ' - very little text could be read from it' : '') + '.</p></div>';
    else body = '<div class="mtd-db"><table><thead><tr><th style="width:28px"></th><th>On the document</th><th>Value</th><th>Send to</th></tr></thead><tbody>' + rows.map(function (r) {
        return '<tr><td><input type="checkbox" data-a="on" data-id="' + d.id + '" data-r="' + r.id + '"' + (r.on ? ' checked' : '') + ' aria-label="Send ' + esc(r.label) + '"></td>' +
          '<td>' + esc(r.label) + (r.note ? '<small>' + esc(r.note) + '</small>' : '') + (r.sent > 0 ? ' <span class="mtd-sent">sent</span>' : r.sent === -1 ? ' <span class="mtd-wait">waiting</span>' : '') + '</td>' +
          '<td><input type="text" data-a="val" data-id="' + d.id + '" data-r="' + r.id + '" value="' + esc(r.value) + '" aria-label="' + esc(r.label) + ' value"></td>' +
          '<td><select data-a="dest" data-id="' + d.id + '" data-r="' + r.id + '" aria-label="Where ' + esc(r.label) + ' goes">' + destOptions(r.dest) + '</select></td></tr>';
      }).join('') + '</tbody></table><div class="mtd-acts"><button type="button" class="mtd-btn pri" data-a="send" data-id="' + d.id + '">Send ticked values</button><span class="mtd-st ' + (st.kind || '') + '">' + esc(st.text || 'Check each value against the document before sending.') + '</span></div></div>';
    return '<article class="mtd-doc" data-doc="' + d.id + '">' + head + body + '</article>';
  }
  function panelHtml(inline) {
    var list = mem.filter(function (d) { return view.sec === 'all' || (TYPE[d.docType] || TYPE.other).sec === view.sec; });
    return '<div class="mtd-in"><div class="mtd-head"><div><h2>Documents</h2><p>Shared by every page of the suite and kept in this browser only. Upload once; send the values to the Loan Suite and the Income Calculator.</p></div>' +
      '<div style="display:flex;gap:8px;align-items:center">' + (window.MTBuild ? '<button type="button" class="mtd-btn" data-a="build">Build a document</button>' : '') + (inline ? '' : '<button type="button" class="mtd-x" data-a="close" aria-label="Close documents">×</button>') + '</div></div>' +
      '<div class="mtd-tabs" role="tablist" aria-label="Document sections">' + SECTIONS.map(function (s) { return '<button type="button" role="tab" data-a="sec" data-sec="' + s[0] + '" aria-selected="' + (view.sec === s[0]) + '">' + s[1] + ' <i>' + count(s[0]) + '</i></button>'; }).join('') + '</div>' +
      '<div class="mtd-drop" data-drop="1"><div><b>Add documents</b><span>PDF, photo or scan. Pay stubs, W-2s, returns, bank and retirement statements, gift letters, contracts, appraisals, tax bills, insurance, HOA, leases, contractor bids, credit reports, LE / CD, mortgage statements, P&amp;Ls.</span></div>' +
      '<label class="mtd-btn pri"><input type="file" multiple accept=".pdf,image/*,.txt,.csv" data-a="file">Upload</label></div>' +
      '<div class="mtd-list">' + (list.length ? list.map(docHtml).join('') : '<div class="mtd-empty">' + (mem.length ? 'No documents in this section yet.' : 'No documents yet. Anything you upload here is available on every page of the suite.') + '</div>') + '</div></div>';
  }
  function paint() {
    var b = $('mtDocsBtn'); if (b) b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>Documents' + (mem.length ? ' <em>' + mem.length + '</em>' : '');
    hosts.forEach(function (h) {
      if (!h.el.isConnected) return;
      var focus = document.activeElement && h.el.contains(document.activeElement) ? {a: document.activeElement.dataset.a, id: document.activeElement.dataset.id, r: document.activeElement.dataset.r, sec: document.activeElement.dataset.sec} : null;
      var sc = h.scroller ? h.scroller.scrollTop : 0;
      h.el.innerHTML = panelHtml(h.inline);
      if (h.scroller) h.scroller.scrollTop = sc;
      if (focus) { var sel = '[data-a="' + focus.a + '"]' + (focus.id ? '[data-id="' + focus.id + '"]' : '') + (focus.r ? '[data-r="' + focus.r + '"]' : '') + (focus.sec ? '[data-sec="' + focus.sec + '"]' : ''); var f = h.el.querySelector(sel); if (f) f.focus(); }
    });
  }
  function find(id) { return mem.filter(function (d) { return d.id === id; })[0]; }
  function rowOf(d, rid) { return (d.rows || []).filter(function (r) { return r.id === rid; })[0]; }
  async function add(files) {
    files = Array.prototype.slice.call(files || []); if (!files.length) return;
    for (var i = 0; i < files.length; i++) {
      var f = files[i], d = {id: uid(), name: f.name, mime: f.type, size: f.size, added: Date.now(), page: document.title.split('·')[0].trim().slice(0, 40), blob: f, docType: 'other', rows: [], text: ''};
      mem.unshift(d); progress[d.id] = 0; paint();
      try {
        d.text = (await readText(f, function (p) { progress[d.id] = p; var bar = document.querySelector('[data-doc="' + d.id + '"] .mtd-prog i'); if (bar) bar.style.width = Math.round(p * 100) + '%'; })).slice(0, 1000000);   /* v57: long statements and pasted spreadsheets are kept whole */
        d.docType = detect(d.text, d.name); extract(d);
      } catch (e) { d.error = 'Could not read this file: ' + (e && e.message || e); }
      delete progress[d.id];
      var sec = (TYPE[d.docType] || TYPE.other).sec; if (view.sec !== 'all' && view.sec !== sec) view.sec = sec === 'all' ? 'all' : sec;
      await save(d); paint();
    }
  }
  function openIncome(d) {
    if (PAGE === 'income') {
      var hf = G('handleFiles'); if (typeof hf !== 'function') { toast('The Documents tab reader is not available on this page.'); return; }
      try { window.switchTab && window.switchTab('docs'); } catch (e) {}
      close();
      var file = d.blob instanceof File ? d.blob : new File([d.blob], d.name, {type: d.mime || ''});
      hf([file]); return;
    }
    location.href = 'income-calculator.html?mtdoc=' + encodeURIComponent(d.id);
  }
  function wire(el) {
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
      var a = b.dataset.a, d = b.dataset.id ? find(b.dataset.id) : null;
      if (a === 'close') close();
      else if (a === 'build') { close(); window.MTBuild && MTBuild.open(); }
      else if (a === 'sec') { view.sec = b.dataset.sec; paint(); }
      else if (a === 'del' && d) { if (confirm('Remove "' + d.name + '" from the document library in this browser?')) drop(d.id).then(paint); }
      else if (a === 'send' && d) { var msg = send(d); status[d.id] = {text: msg, kind: /could not/.test(msg) ? 'bad' : 'ok'}; paint(); }
      else if (a === 'income' && d) openIncome(d);
    });
    el.addEventListener('change', function (e) {
      var t = e.target, a = t.dataset && t.dataset.a, d = t.dataset && t.dataset.id ? find(t.dataset.id) : null;
      if (a === 'file') { add(t.files); t.value = ''; return; }
      if (!d) return;
      if (a === 'type') { d.docType = t.value; extract(d); save(d); paint(); return; }
      var r = rowOf(d, t.dataset.r); if (!r) return;
      if (a === 'on') r.on = t.checked; else if (a === 'dest') { r.dest = t.value; r.on = !!t.value; paint(); } else if (a === 'val') r.value = t.value;
      save(d);
    });
    el.addEventListener('input', function (e) { var t = e.target; if (t.dataset && t.dataset.a === 'val') { var d = find(t.dataset.id), r = d && rowOf(d, t.dataset.r); if (r) r.value = t.value; } });
    el.addEventListener('dragover', function (e) { var z = e.target.closest && e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
    el.addEventListener('dragleave', function (e) { var z = e.target.closest && e.target.closest('[data-drop]'); if (z) z.classList.remove('over'); });
    el.addEventListener('drop', function (e) { var z = e.target.closest && e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); z.classList.remove('over'); add(e.dataTransfer.files); });
  }
  var lastFocus = null;
  function open(sec) {
    var w = $('mtDocs'); if (!w) return;
    if (sec) view.sec = sec; lastFocus = document.activeElement;
    w.classList.add('open'); document.documentElement.style.overflow = 'hidden'; paint();
    var x = w.querySelector('.mtd-x'); if (x) x.focus();
  }
  function close() { var w = $('mtDocs'); if (!w || !w.classList.contains('open')) return; w.classList.remove('open'); document.documentElement.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function mount() {
    if (!$('mtDocsCss')) { var s = document.createElement('style'); s.id = 'mtDocsCss'; s.textContent = CSS; document.head.appendChild(s); }
    if (!$('mtDocs')) {
      var w = document.createElement('div'); w.id = 'mtDocs'; w.className = 'no-print';
      w.innerHTML = '<button type="button" class="mtd-back" tabindex="-1" aria-label="Close documents"></button><aside class="mtd-sheet" role="dialog" aria-modal="true" aria-label="Documents"><div class="mtd"></div></aside>';
      document.body.appendChild(w);
      w.querySelector('.mtd-back').addEventListener('click', close);
      var host = w.querySelector('.mtd'); hosts.push({el: host, inline: false, scroller: w.querySelector('.mtd-sheet')}); wire(host);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
    if (!$('mtDocsBtn')) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'mtDocsBtn'; b.className = 'no-print'; b.setAttribute('aria-haspopup', 'dialog');
      b.addEventListener('click', function () { open(); }); document.body.appendChild(b);
    }
    inline(); paint();
  }
  /* inline on the Documents pages: Loan Suite Documents & OCR / Worksheets, the calculator's Documents tab, Doc Organizer */
  function inline() {
    var targets = [];
    var E = window.LOS_EMBED || {};
    if (E.page === 'documents-ocr' || E.page === 'documents-worksheets') targets.push($('v50UnifiedDocuments') || $('panel-docs'));
    if (PAGE === 'income') targets.push($('panel-docs'));
    targets.forEach(function (t) {
      if (!t || t.querySelector(':scope > .mtd.inline')) return;
      var el = document.createElement('section'); el.className = 'mtd inline no-print';
      var head = t.querySelector(':scope > .section-head, :scope > header');
      head && head.nextSibling ? t.insertBefore(el, head.nextSibling) : t.insertBefore(el, t.firstChild);
      hosts.push({el: el, inline: true}); wire(el);
    });
  }

  /* ====================================================================== boot */
  function boot() {
    mount();
    load().then(function () {
      paint();
      /* a document sent from another page to the calculator's reader */
      var q = new URLSearchParams(location.search), id = q.get('mtdoc');
      if (id && PAGE === 'income') {
        var d = find(id); var tries = 0;
        (function go() { if (typeof G('handleFiles') === 'function' && window.switchTab) { if (d) openIncome(d); return; } if (tries++ < 60) setTimeout(go, 150); })();
      }
    });
    /* place values that were waiting for this page */
    var n = 0; (function drain() { if ((PAGE === 'suite' && suiteStore() && suiteStore().setField) || (PAGE === 'income' && calcState() && typeof window.RECALC === 'function')) { setTimeout(drainQueue, 900); return; } if (n++ < 120) setTimeout(drain, 150); })();
    /* v57 phase 4: no polling - the inline library is placed when the page is ready and shortly after clicks, when the Documents panels appear */
    var it = 0; setTimeout(inline, 1500); document.addEventListener('click', function () { clearTimeout(it); it = setTimeout(inline, 300); }, true);
  }
  window.MTDocs = {__v56: true, readText: readText, ocr: ocr, detect: detect, extract: extract, TYPES: TYPES, DEST: DEST, SECTIONS: SECTIONS, open: open, close: close, list: function () { return mem; }, add: add, send: send, queue: queue, EX: EX};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
