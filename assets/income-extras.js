/* Mortgage Suite 55.22 - Income Calculator extras, in the calculator's own card style.
   - Non-QM (56.0: inside Other Income, added with "Add Non-QM"): 12 / 24-month bank statement income, profit-and-loss income,
     DSCR (amortizing or interest-only, short-term-rental haircut) and the DSCR prepayment penalty schedules - the Comprehensive
     Agency Income Calculator's tabs 8 and 9. Bank statements and P&Ls can be uploaded; OCR fills the matching fields.
   - VA residual income: the 5% reduction for an active-duty or retired borrower near a military base.
   - Schedule E: the personal-use test (personal days above the greater of 14 days or 10% of fair rental days).
   - AUS Findings: the NMB guide's explanation of every income type, by agency. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function G(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }
  function N(v) { var t = String(v == null ? '' : v).trim(), g = /^\(.*\)$/.test(t) || /-$/.test(t); t = t.replace(/[()$,\s%]/g, '').replace(/-$/, ''); var n = parseFloat(t); return isFinite(n) ? (g && n > 0 ? -n : n) : 0; }
  function usd(v, d) { d = d == null ? 2 : d; var n = N(v); return (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d}); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }

  /* ------------------------------------------------------------------ state */
  function blankDeposits() { var a = []; for (var i = 0; i < 24; i++) a.push({gross: 0, inel: 0}); return a; }
  function blankPL() { return {use: false, b: 1, months: 12, revenue: 0, cogs: 0, expenses: 0, own: 100, prep: 'cpa', from: '', to: ''}; }
  function state() {
    var S = G('S'); if (!S) return null;
    if (!S.nonqm) S.nonqm = {
      bank: {use: false, b: 1, months: 12, method: 'fixed', expense: 50, own: 100, deposits: blankDeposits()},
      dscr: {use: false, b: 1, loan: 0, rate: 0, term: 360, io: false, rent: 0, haircut: 0, taxes: 0, ins: 0, hoa: 0},
      prepay: {type: 'step54321', years: 5, flat: 3, free: 20, payoff: 0}
    };
    var q = S.nonqm; if (!q.bank.deposits || q.bank.deposits.length < 24) q.bank.deposits = blankDeposits();
    if (!q.pl) q.pl = blankPL();
    /* 56.0: Non-QM lives in Other Income; a section shows once it is added (files that already used one keep it) */
    if (!q.shown) q.shown = {bank: !!q.bank.use, dscr: !!q.dscr.use, pl: !!q.pl.use};
    return q;
  }

  /* ------------------------------------------------------------ calculations */
  var NQM = window.NQM = {};
  NQM.METHODS = {fixed: 'Business account - fixed expense factor', cpa: 'Business account - CPA / P&L expense ratio', personal: 'Personal account - 100% of business deposits'};
  NQM.bank = function () {
    var q = state(); if (!q) return null; var B = q.bank, m = N(B.months) === 24 ? 24 : 12;
    var rows = B.deposits.slice(0, m).map(function (d) { return {gross: N(d.gross), inel: N(d.inel), net: Math.max(0, N(d.gross) - N(d.inel))}; });
    var total = rows.reduce(function (s, r) { return s + r.net; }, 0), avg = total / m;
    var ratio = B.method === 'personal' ? 0 : Math.max(0, Math.min(100, N(B.expense))) / 100;
    var afterExp = avg * (1 - ratio), own = Math.max(0, Math.min(100, N(B.own))) / 100;
    return {months: m, rows: rows, gross: rows.reduce(function (s, r) { return s + r.gross; }, 0), inel: rows.reduce(function (s, r) { return s + r.inel; }, 0),
            total: total, avg: avg, ratio: ratio, expense: avg * ratio, own: own, monthly: afterExp * own, used: B.use ? afterExp * own : 0};
  };
  NQM.dscr = function () {
    var q = state(); if (!q) return null; var D = q.dscr, L = N(D.loan), r = N(D.rate) / 100 / 12, n = Math.max(1, N(D.term) || 360);
    var pi = L ? (r ? L * r / (1 - Math.pow(1 + r, -n)) : L / n) : 0, io = L * N(D.rate) / 100 / 12;
    var rent = N(D.rent) * (1 - Math.max(0, Math.min(100, N(D.haircut))) / 100), pay = D.io ? io : pi;
    var pitia = pay + N(D.taxes) + N(D.ins) + N(D.hoa), ratio = pitia ? rent / pitia : 0;
    var tier = !pitia ? '' : ratio >= 1.2 ? 'Strong DSCR (1.20x or better)' : ratio >= 1 ? 'Standard DSCR (1.00x or better)' : ratio >= 0.75 ? 'Sub-1.00 DSCR (0.75x-0.99x) - limited programs' : 'Below 0.75x - not eligible';
    return {pi: pi, io: io, payment: pay, rent: rent, pitia: pitia, ratio: ratio, tier: tier, net: rent - pitia, used: D.use ? rent - pitia : 0};
  };
  NQM.PREPAY = {step54321: 'Gradual step-down 5/4/3/2/1', step321: 'Gradual step-down 3/2/1', flat: 'Fixed flat percentage', sixmo: '6 months interest on 80% of the balance'};
  NQM.prepay = function () {
    var q = state(); if (!q) return null; var P = q.prepay, D = q.dscr, years = Math.max(0, Math.min(5, Math.round(N(P.years))));
    var free = Math.max(0, N(P.free)) / 100, subject = Math.max(0, N(P.payoff) - N(D.loan) * free), rate = N(D.rate) / 100;
    var S5 = [.05, .04, .03, .02, .01], S3 = [.03, .02, .01, 0, 0], out = [];
    for (var y = 1; y <= 5; y++) {
      var on = y <= years, row = {year: y, s5: on ? subject * S5[y - 1] : 0, s3: on ? subject * S3[y - 1] : 0, flat: on ? subject * N(P.flat) / 100 : 0,
        sixmo: on ? N(P.payoff) * (1 - free) * rate / 2 : 0};
      row.used = P.type === 'step321' ? row.s3 : P.type === 'flat' ? row.flat : P.type === 'sixmo' ? row.sixmo : row.s5;
      row.pct = N(P.payoff) ? row.used / N(P.payoff) : 0; out.push(row);
    }
    return {subject: subject, rows: out};
  };
  /* 56.0: profit and loss statement only - net profit over the P&L period, times ownership */
  NQM.PREP = {cpa: 'Prepared or signed by a CPA / EA / tax preparer', borrower: 'Borrower-prepared (most programs also need 2-3 months of bank statements)'};
  NQM.pl = function () {
    var q = state(); if (!q) return null; var P = q.pl, m = N(P.months) === 24 ? 24 : 12;
    var gross = N(P.revenue) - N(P.cogs), net = gross - N(P.expenses), own = Math.max(0, Math.min(100, N(P.own))) / 100;
    var monthly = net / m * own, margin = N(P.revenue) ? net / N(P.revenue) : 0;
    return {months: m, gross: gross, net: net, own: own, avg: net / m, monthly: monthly, margin: margin, used: P.use ? monthly : 0};
  };
  NQM.total = function () { var b = NQM.bank(), d = NQM.dscr(), p = NQM.pl(); return {bank: b ? b.used : 0, dscr: d ? d.used : 0, pl: p ? p.used : 0}; };
  NQM.set = function (sec, key, val, num) {
    var q = state(); if (!q) return; q[sec][key] = num ? N(val) : val;
    window.RECALC && window.RECALC(); if (key !== 'use' && key !== 'months' && key !== 'method') paint(); else NQM.render();
  };
  NQM.add = function (sec) { var q = state(); if (!q || !q[sec]) return; q.shown[sec] = true; q[sec].use = true; closeMenu(); window.RECALC && window.RECALC(); NQM.render();
    setTimeout(function () { var c = $('nqmCard-' + sec); if (c && c.scrollIntoView) c.scrollIntoView({behavior: 'smooth', block: 'start'}); }, 60); };
  NQM.remove = function (sec) { var q = state(); if (!q || !q[sec]) return; q.shown[sec] = false; q[sec].use = false; window.RECALC && window.RECALC(); NQM.render(); };
  NQM.menu = function () { var m = $('nqmMenu'); if (!m) return; var open = m.hasAttribute('hidden'); if (open) m.removeAttribute('hidden'); else m.setAttribute('hidden', ''); var b = $('nqmAddBtn'); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false'); };
  function closeMenu() { var m = $('nqmMenu'); if (m) m.setAttribute('hidden', ''); var b = $('nqmAddBtn'); if (b) b.setAttribute('aria-expanded', 'false'); }
  document.addEventListener('click', function (e) { if (!e.target.closest || e.target.closest('#nqmAdd')) return; closeMenu(); });
  NQM.dep = function (i, key, val) { var q = state(); if (!q) return; q.bank.deposits[i][key] = N(val); window.RECALC && window.RECALC(); paint(); };

  /* ------------------------------------------- 56.0: read uploaded statements (OCR) */
  var MONEY = /\(?-?\$?\s?\d{1,3}(?:,\d{3})+(?:\.\d{2})?\)?|\(?-?\$?\s?\d+\.\d{2}\)?/g;
  function moneys(line) { return (String(line).match(MONEY) || []).map(N); }
  var MON = {jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11};
  function pdate(s) {
    s = String(s || '').trim(); var m;
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/))) { var y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[1] - 1, +m[2]); }
    if ((m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/))) { var k = MON[m[1].slice(0, 4).toLowerCase()]; if (k == null) k = MON[m[1].slice(0, 3).toLowerCase()]; if (k != null) return new Date(+m[3], k, +m[2]); }
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
  }
  var DT = '(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4}|[A-Z][a-z]{2,8}\\.?\\s+\\d{1,2},?\\s+\\d{4})';
  var RANGE = new RegExp(DT + '\\s*(?:-|–|—|to|through|thru)\\s*' + DT, 'g');
  function monthsBetween(a, b) { if (!a || !b) return 0; return Math.max(1, Math.round(((b - a) / 86400000 + 1) / 30.4375)); }
  function lineValue(lines, labels, avoid) {
    for (var li = 0; li < labels.length; li++) {
      for (var i = 0; i < lines.length; i++) {
        var low = lines[i].toLowerCase(); if (low.indexOf(labels[li]) < 0) continue;
        if (avoid && avoid.test(low)) continue;
        var after = lines[i].slice(low.indexOf(labels[li]) + labels[li].length), v = moneys(after);
        if (!v.length && lines[i + 1]) v = moneys(lines[i + 1]);
        if (v.length) return {value: Math.abs(v[0]), label: labels[li], line: lines[i].trim()};
      }
    }
    return null;
  }
  NQM.parseBank = function (text) {
    var t = String(text || ''), marks = [], m; RANGE.lastIndex = 0;
    while ((m = RANGE.exec(t))) { var a = pdate(m[1]), b = pdate(m[2]); if (a && b && b > a && (b - a) / 86400000 < 40) marks.push({i: m.index, a: a, b: b, key: +b}); }
    var seen = {}, chunks = [];
    marks.forEach(function (k, n) { if (seen[k.key]) return; seen[k.key] = 1; chunks.push(k); });
    chunks.forEach(function (c, n) { c.text = t.slice(c.i, n + 1 < chunks.length ? chunks[n + 1].i : t.length); });
    if (!chunks.length) chunks = [{a: null, b: null, text: t}];
    var DEP = ['total deposits and other credits', 'deposits and other credits', 'total deposits and additions', 'deposits and additions', 'total deposits', 'deposits & other credits', 'deposits/credits', 'deposits & credits', 'deposits and credits', 'total credits', 'deposits'];
    return chunks.map(function (c) {
      var lines = c.text.split(/\r?\n/), dep = lineValue(lines, DEP, /\b(number|#|count|average|avg)\b/);
      var tr = 0; lines.forEach(function (l) { if (/\b(transfer|xfer|trnsfr)\s*(from|in)\b|\bfrom\s+(savings|checking|sav|chk)\b/i.test(l) && !/\btotal\b/i.test(l)) { var v = moneys(l); if (v.length) tr += Math.abs(v[0]); } });
      var end = c.b, label = end ? end.toLocaleString('en-US', {month: 'short', year: 'numeric'}) : '';
      return {end: end, label: label, deposits: dep ? dep.value : 0, transfers: Math.round(tr * 100) / 100, found: dep ? dep.line : ''};
    }).filter(function (s) { return s.deposits > 0; });
  };
  NQM.parsePL = function (text) {
    var lines = String(text || '').split(/\r?\n/), out = {};
    var rev = lineValue(lines, ['total income', 'total revenue', 'total revenues', 'gross receipts', 'total sales', 'gross revenue', 'gross sales', 'net sales', 'sales revenue', 'revenue', 'sales'], /\bnet (income|profit)|other income|cost of/);
    var cogs = lineValue(lines, ['total cost of goods sold', 'cost of goods sold', 'total cost of sales', 'cost of sales', 'cogs']);
    var exp = lineValue(lines, ['total operating expenses', 'total expenses', 'operating expenses', 'total expense']);
    var net = lineValue(lines, ['net ordinary income', 'net income', 'net profit', 'net operating income', 'net earnings']);
    if (rev) out.revenue = rev.value; if (cogs) out.cogs = cogs.value; if (exp) out.expenses = exp.value;
    if (net) { var ln = net.line.toLowerCase(); out.net = /\(|-\$?\d|loss/.test(ln) ? -net.value : net.value; }
    if (out.revenue != null && out.expenses == null && out.net != null) out.expenses = Math.max(0, out.revenue - (out.cogs || 0) - out.net);
    var r; RANGE.lastIndex = 0; if ((r = RANGE.exec(text))) { var a = pdate(r[1]), b = pdate(r[2]); out.months = monthsBetween(a, b); out.from = r[1]; out.to = r[2]; }
    if (!out.months) { var mm = String(text).match(/\b(twelve|12|twenty[- ]four|24)\s+months?\s+(ended|ending)/i); if (mm) out.months = /twelve|12/i.test(mm[1]) ? 12 : 24; }
    return out;
  };
  async function readFile(file) {
    if (window.MTDocs && MTDocs.readText) return MTDocs.readText(file);
    var pdfText = G('pdfText'), ocr = G('ocrImages'), imgs = G('pdfPageImages'), lp = G('loadPdfJs');
    if (/\.pdf$/i.test(file.name)) { if (typeof lp === 'function') await lp(); var r = await pdfText(file), t = r.text || ''; if (t.replace(/\s/g, '').length < 40 && ocr && imgs) t = await ocr(await imgs(r.pdf, 6)); return t; }
    if (/^image\//.test(file.type)) return ocr([await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = URL.createObjectURL(file); })]);
    return file.text();
  }
  function ocrNote(html, bad) { var o = $('nqmOcr'); if (!o) return; o.hidden = false; o.className = 'nqm-ocr' + (bad ? ' bad' : ''); o.innerHTML = html; }
  NQM.upload = async function (sec, files) {
    files = Array.prototype.slice.call(files || []); if (!files.length) return;
    var q = state(); if (!q) return;
    ocrNote('Reading ' + files.length + ' file(s)… scanned pages use OCR and can take a little while.');
    try {
      if (sec === 'bank') {
        var stmts = [], misses = [];
        for (var i = 0; i < files.length; i++) { var t = await readFile(files[i]), s = NQM.parseBank(t); if (!s.length) misses.push(files[i].name); s.forEach(function (x) { x.file = files[i].name; stmts.push(x); }); }
        stmts.sort(function (a, b) { return (a.end ? +a.end : 0) - (b.end ? +b.end : 0); });
        var dep = q.bank.deposits, filled = [];
        stmts.forEach(function (s) {
          var k = -1; for (var j = 0; j < 24; j++) { if (dep[j].label && dep[j].label === s.label && s.label) { k = j; break; } }
          if (k < 0) for (var j2 = 0; j2 < 24; j2++) { if (!N(dep[j2].gross)) { k = j2; break; } }
          if (k < 0) return;
          dep[k].gross = s.deposits; dep[k].inel = s.transfers; dep[k].label = s.label; filled.push({k: k, s: s});
        });
        if (filled.length > 12 && N(q.bank.months) !== 24) q.bank.months = 24;
        q.shown.bank = true; q.bank.use = true;
        window.RECALC && window.RECALC(); NQM.render();
        ocrNote(filled.length ? '<b>Filled ' + filled.length + ' month(s) from the statements.</b> Check each against the statement - transfers in were moved to "Less: transfers / ineligible".<ul>' +
          filled.map(function (f) { return '<li>Month ' + (f.k + 1) + (f.s.label ? ' (' + esc(f.s.label) + ')' : '') + ': deposits ' + usd(f.s.deposits) + (f.s.transfers ? ', transfers ' + usd(f.s.transfers) : '') + ' <span class="muted small">' + esc(f.s.file) + '</span></li>'; }).join('') + '</ul>' +
          (misses.length ? '<div>No deposit total found in: ' + esc(misses.join(', ')) + '. Enter those months by hand.</div>' : '')
          : 'No deposit totals were found in ' + esc(files.map(function (f) { return f.name; }).join(', ')) + '. Enter the months by hand.', !filled.length);
      } else if (sec === 'pl') {
        var txt = await readFile(files[0]), p = NQM.parsePL(txt), L = q.pl, got = [];
        if (p.revenue != null) { L.revenue = p.revenue; got.push('revenue ' + usd(p.revenue)); }
        if (p.cogs != null) { L.cogs = p.cogs; got.push('cost of goods sold ' + usd(p.cogs)); }
        if (p.expenses != null) { L.expenses = p.expenses; got.push('expenses ' + usd(p.expenses)); }
        if (p.months) { L.months = p.months > 18 ? 24 : 12; got.push(p.months + '-month period' + (p.months !== 12 && p.months !== 24 ? ' (set to ' + L.months + ' - check the period)' : '')); }
        if (p.from) { L.from = p.from; L.to = p.to; }
        q.shown.pl = true; if (got.length) L.use = true;
        window.RECALC && window.RECALC(); NQM.render();
        var chk = NQM.pl(), diff = p.net != null && chk ? Math.abs(chk.net - p.net) : 0;
        ocrNote(got.length ? '<b>Filled from ' + esc(files[0].name) + ':</b> ' + esc(got.join(', ')) + '.' + (p.net != null ? ' The P&amp;L prints net income of ' + usd(p.net) + (diff > 1 ? ' - <b>it differs from the calculated ' + usd(chk.net) + ' by ' + usd(diff) + '</b>; check the figures.' : ', which matches.') : '') : 'No revenue, expense or net income lines were found in ' + esc(files[0].name) + '. Enter them by hand.', !got.length);
      }
    } catch (e) { ocrNote('Could not read the file: ' + esc(e && e.message || e), true); }
  };

  /* ------------------------------------------------------------------- render */
  function f(label, sec, key, val, opt) {
    opt = opt || {};
    if (opt.options) return '<div class="field"><label>' + label + '</label><select class="cell-input" onchange="NQM.set(\'' + sec + '\',\'' + key + '\',' + (opt.bool ? 'this.value===\'1\'' : opt.num ? 'this.value,1' : 'this.value') + ')">' +
      opt.options.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + (opt.hint ? '<div class="fhint">' + opt.hint + '</div>' : '') + '</div>';
    return '<div class="field"><label>' + label + '</label><input class="cell-input" type="text" inputmode="decimal" data-num="1" value="' + N(val) + '" oninput="NQM.set(\'' + sec + '\',\'' + key + '\',this.value,1)">' + (opt.hint ? '<div class="fhint">' + opt.hint + '</div>' : '') + '</div>';
  }
  function box(label, id, final) { return '<div class="calcbox' + (final ? ' final' : '') + '"><div class="muted small">' + label + '</div><div id="' + id + '" style="font-size:19px;font-weight:800;font-family:var(--font-num)">—</div></div>'; }
  function useSw(sec, on, text) { return '<label class="sw" style="gap:7px"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="NQM.set(\'' + sec + '\',\'use\',this.checked)"><span class="muted small">' + text + '</span></label>'; }
  function rmBtn(sec, what) { return '<button type="button" class="btn btn-light btn-sm nqm-x" onclick="NQM.remove(\'' + sec + '\')" title="Remove ' + what + ' from this file" aria-label="Remove ' + what + '">Remove</button>'; }
  function upBtn(sec, label, multi) { return '<label class="btn btn-light btn-sm nqm-up" title="PDF, image or text - read with OCR, then the matching fields are filled"><input type="file" accept=".pdf,image/*,.txt,.csv" ' + (multi ? 'multiple ' : '') + 'onchange="NQM.upload(\'' + sec + '\',this.files);this.value=\'\'"><span>' + label + '</span></label>'; }
  var ADD = [['bank', 'Bank statement', '12 or 24 months of deposits, less an expense factor'], ['dscr', 'DSCR', 'Investor property qualifies on its own rent'], ['pl', 'Profit and loss', 'Net profit from a P&L statement, times ownership']];
  NQM.render = function () {
    var body = $('nqmBody'), q = state(); if (!body || !q) return;
    var B = q.bank, D = q.dscr, P = q.prepay, L = q.pl, sh = q.shown, m = N(B.months) === 24 ? 24 : 12, bor = [[1, 'B1 — Borrower 1'], [2, 'B2 — Borrower 2']];
    var ledger = function (from, to) { var h = ''; for (var i = from; i < to; i++) { var d = B.deposits[i];
      h += '<tr><td class="rowlabel">Month ' + (i + 1) + (d.label ? ' <span class="muted small">' + esc(d.label) + '</span>' : '') + '</td><td><input class="cell-input" type="text" inputmode="decimal" data-num="1" value="' + N(d.gross) + '" oninput="NQM.dep(' + i + ',\'gross\',this.value)"></td>' +
           '<td><input class="cell-input" type="text" inputmode="decimal" data-num="1" value="' + N(d.inel) + '" oninput="NQM.dep(' + i + ',\'inel\',this.value)"></td><td class="num" id="nqmNet' + i + '">—</td></tr>'; } return h; };
    var any = sh.bank || sh.dscr || sh.pl;
    var head = '<div class="nqm-head"><div><h3>Non-QM income</h3><p class="muted small">Bank statement, DSCR and profit-and-loss income. Each counts toward qualifying income only when Use is ticked.</p></div>' +
      '<div class="nqm-add" id="nqmAdd"><button type="button" class="btn btn-primary" id="nqmAddBtn" aria-haspopup="true" aria-expanded="false" onclick="NQM.menu()">+ Add Non-QM</button>' +
      '<div class="nqm-menu" id="nqmMenu" role="menu" hidden>' + ADD.map(function (a) { return '<button type="button" role="menuitem" onclick="NQM.add(\'' + a[0] + '\')"' + (sh[a[0]] ? ' disabled' : '') + '><b>' + a[1] + (sh[a[0]] ? ' <span class="muted small">added</span>' : '') + '</b><span>' + a[2] + '</span></button>'; }).join('') + '</div></div></div>' +
      (any ? '' : '<div class="nqm-empty muted small">No Non-QM income on this file. Choose <b>Add Non-QM</b> for bank statement, DSCR or profit-and-loss income.</div>') +
      '<output id="nqmOcr" class="nqm-ocr" hidden></output>';
    body.innerHTML = head + (!sh.bank ? '' :
      '<div class="card" id="nqmCard-bank"><div class="card-top"><span class="tag">Bank statements</span><span class="doc-name">12 / 24-month bank statement income</span><div class="spacer"></div>' + upBtn('bank', 'Upload statements', 1) + useSw('bank', B.use, 'Use in qualifying income') + rmBtn('bank', 'bank statement income') + '</div><div class="card-body">' +
      '<div class="grid g4">' + f('Statement term', 'bank', 'months', m, {options: [[12, '12 months'], [24, '24 months']], num: 1}) +
      f('Account type and expense method', 'bank', 'method', B.method, {options: Object.keys(NQM.METHODS).map(function (k) { return [k, NQM.METHODS[k]]; })}) +
      (B.method === 'personal' ? '' : f('Expense ratio (% of deposits)', 'bank', 'expense', B.expense, {hint: B.method === 'fixed' ? 'Program fixed factor - commonly 50%' : 'From the CPA / EA letter or P&L'})) +
      f('Ownership (%)', 'bank', 'own', B.own) + f('Borrower', 'bank', 'b', B.b, {options: bor, num: 1}) + '</div>' +
      '<div class="' + (m === 24 ? 'grid g2' : '') + '" style="margin-top:12px;align-items:start"><div class="tbl-scroll"><table class="matrix" style="width:100%"><thead><tr><th>Month</th><th>Gross deposits</th><th>Less: transfers / ineligible</th><th class="num">Net eligible</th></tr></thead><tbody>' + ledger(0, 12) + '</tbody></table></div>' +
      (m === 24 ? '<div class="tbl-scroll"><table class="matrix" style="width:100%"><thead><tr><th>Month</th><th>Gross deposits</th><th>Less: transfers / ineligible</th><th class="num">Net eligible</th></tr></thead><tbody>' + ledger(12, 24) + '</tbody></table></div>' : '') + '</div>' + (m === 24 ? '' : '<div class="muted small" style="margin-top:6px">Choose 24 months to add months 13-24.</div>') +
      '<div class="grid g4" style="margin-top:12px">' + box('Net eligible deposits', 'nqmTot') + box('Average per month', 'nqmAvg') + box('Less: expense factor', 'nqmExp') + box('Qualifying monthly income', 'nqmInc', 1) + '</div>' +
      '<div class="notice info" style="margin-top:10px"><span>Net eligible deposits / statement months, less the expense factor, times ownership. Exclude transfers between accounts, loan proceeds, refunds and other non-business deposits; large deposits need a source. Uploaded statements fill one month each, in date order, into the first empty months.</span></div></div></div>') + (!sh.pl ? '' :

      '<div class="card" id="nqmCard-pl"><div class="card-top"><span class="tag">P&amp;L</span><span class="doc-name">Profit and loss statement income</span><div class="spacer"></div>' + upBtn('pl', 'Upload P&amp;L', 0) + useSw('pl', L.use, 'Use in qualifying income') + rmBtn('pl', 'profit and loss income') + '</div><div class="card-body">' +
      '<div class="grid g4">' + f('P&amp;L period', 'pl', 'months', N(L.months) === 24 ? 24 : 12, {options: [[12, '12 months'], [24, '24 months']], num: 1}) +
      f('Gross revenue / sales ($)', 'pl', 'revenue', L.revenue) + f('Cost of goods sold ($)', 'pl', 'cogs', L.cogs, {hint: '0 if the P&L has none'}) + f('Total operating expenses ($)', 'pl', 'expenses', L.expenses) +
      f('Ownership (%)', 'pl', 'own', L.own) + f('Prepared by', 'pl', 'prep', L.prep, {options: Object.keys(NQM.PREP).map(function (k) { return [k, NQM.PREP[k]]; })}) + f('Borrower', 'pl', 'b', L.b, {options: bor, num: 1}) + '</div>' +
      '<div class="grid g4" style="margin-top:12px">' + box('Gross profit', 'nqmPlGross') + box('Net profit', 'nqmPlNet') + box('Net profit per month', 'nqmPlAvg') + box('Qualifying monthly income', 'nqmPlInc', 1) + '</div>' +
      '<div class="note" id="nqmPlNote" style="margin-top:10px"></div></div></div>') + (!sh.dscr ? '' :

      '<div class="card" id="nqmCard-dscr"><div class="card-top"><span class="tag">DSCR</span><span class="doc-name">Investor DSCR - the property qualifies on its own rent</span><div class="spacer"></div>' + useSw('dscr', D.use, 'Add the net cash flow to qualifying income') + rmBtn('dscr', 'DSCR') + '</div><div class="card-body">' +
      '<div class="grid g4">' + f('Loan amount ($)', 'dscr', 'loan', D.loan) + f('Note rate (%)', 'dscr', 'rate', D.rate) + f('Amortization (months)', 'dscr', 'term', D.term, {hint: '360 = 30 years; 480 = 40-year interest-only'}) +
      f('Payment used', 'dscr', 'io', D.io ? 1 : 0, {options: [[0, 'Amortizing P&I'], [1, 'Interest-only']], bool: 1}) +
      f('Rent - lower of lease or Form 1007 / 1025 ($/mo)', 'dscr', 'rent', D.rent) + f('Short-term rental haircut (%)', 'dscr', 'haircut', D.haircut, {hint: '0 for long-term leases; often 10-20% for short-term rentals'}) +
      f('Property taxes ($/mo)', 'dscr', 'taxes', D.taxes) + f('Insurance ($/mo)', 'dscr', 'ins', D.ins) + f('HOA ($/mo)', 'dscr', 'hoa', D.hoa) + '</div>' +
      '<div class="grid g4" style="margin-top:12px">' + box('Principal & interest', 'nqmPI') + box('Interest-only payment', 'nqmIO') + box('Qualifying PITIA', 'nqmPITIA') + box('DSCR', 'nqmRatio', 1) + '</div>' +
      '<div class="note" id="nqmTier" style="margin-top:10px"></div></div></div>' +

      '<div class="card"><div class="card-top"><span class="tag">Prepay</span><span class="doc-name">DSCR prepayment penalty</span></div><div class="card-body">' +
      '<div class="grid g4">' + f('Structure', 'prepay', 'type', P.type, {options: Object.keys(NQM.PREPAY).map(function (k) { return [k, NQM.PREPAY[k]]; })}) +
      f('Penalty term (years, 1-5)', 'prepay', 'years', P.years) + (P.type === 'flat' ? f('Flat penalty (%)', 'prepay', 'flat', P.flat) : '') +
      f('Penalty-free prepayment per year (% of original loan)', 'prepay', 'free', P.free, {hint: 'Commonly 20%'}) + f('Payoff balance at prepayment ($)', 'prepay', 'payoff', P.payoff) + '</div>' +
      '<div class="tbl-scroll" style="margin-top:12px"><table class="matrix"><thead><tr><th>Year</th><th class="num">5/4/3/2/1</th><th class="num">3/2/1</th><th class="num">Flat %</th><th class="num">6 months interest</th><th class="num">Selected</th><th class="num">% of payoff</th></tr></thead><tbody id="nqmPrepay"></tbody></table></div>' +
      '<div class="muted small" id="nqmSubject" style="margin-top:8px"></div></div></div>');
    paint();
  };
  function setT(id, v) { var e = $(id); if (e && e.textContent !== v) e.textContent = v; }
  function paint() {
    if (!$('nqmBody')) return;
    var b = NQM.bank(), d = NQM.dscr(), p = NQM.prepay(), l = NQM.pl(); if (!b) return;
    if (l) { setT('nqmPlGross', usd(l.gross)); setT('nqmPlNet', usd(l.net)); setT('nqmPlAvg', usd(l.avg)); setT('nqmPlInc', usd(l.monthly));
      var pn = $('nqmPlNote'), Q = state();
      if (pn) { var msg = !N(Q.pl.revenue) && !N(Q.pl.expenses) ? 'Enter the revenue and expenses from the P&L, or upload it.' :
          'Net profit ' + usd(l.net) + ' over ' + l.months + ' months is ' + usd(l.avg) + ' a month' + (l.own < 1 ? '; times ' + Math.round(l.own * 100) + '% ownership' : '') + ' = ' + usd(l.monthly) + ' a month. Profit margin ' + (100 * l.margin).toFixed(1) + '%.' +
          (l.net < 0 ? ' A loss cannot be used as income.' : '') + (Q.pl.prep === 'borrower' ? ' Borrower-prepared P&L: most programs also require recent business bank statements that support the revenue.' : '');
        if (pn.textContent !== msg) pn.textContent = msg; pn.className = 'note ' + (l.net < 0 ? 'bad' : N(Q.pl.revenue) ? 'ok' : ''); } }
    b.rows.forEach(function (r, i) { setT('nqmNet' + i, usd(r.net)); });
    setT('nqmTot', usd(b.total)); setT('nqmAvg', usd(b.avg)); setT('nqmExp', '−' + usd(b.expense)); setT('nqmInc', usd(b.monthly));
    setT('nqmPI', usd(d.pi)); setT('nqmIO', usd(d.io)); setT('nqmPITIA', usd(d.pitia)); setT('nqmRatio', d.pitia ? d.ratio.toFixed(2) + 'x' : '—');
    var t = $('nqmTier'); if (t) { t.className = 'note ' + (!d.pitia ? '' : d.ratio >= 1 ? 'ok' : 'bad'); t.textContent = d.pitia ? d.tier + '. Net monthly cash flow ' + usd(d.net) + ' (rent ' + usd(d.rent) + ' less PITIA ' + usd(d.pitia) + ').' : 'Enter the loan, rate and rent to calculate the DSCR.'; }
    var tb = $('nqmPrepay'); if (tb) tb.innerHTML = p.rows.map(function (r) { return '<tr><td class="rowlabel">Year ' + r.year + '</td><td class="num">' + usd(r.s5) + '</td><td class="num">' + usd(r.s3) + '</td><td class="num">' + usd(r.flat) + '</td><td class="num">' + usd(r.sixmo) + '</td><td class="num"><b>' + usd(r.used) + '</b></td><td class="num">' + (100 * r.pct).toFixed(2) + '%</td></tr>'; }).join('');
    setT('nqmSubject', 'Balance subject to the penalty: ' + usd(p.subject) + ' (payoff balance less the penalty-free allowance on the original loan). The six-months-interest column is interest on the payoff less the allowance.');
  }

  /* -------------------------------------------------- the tab, totals, hooks */
  /* 56.0: Non-QM is part of Other Income - the old Non-QM tab is gone; switchTab('nqm') still lands on it */
  function buildTab() {
    var old = document.querySelector('#tabbar [data-tab="nqm"]'); if (old) old.remove();
    var oldP = $('panel-nqm'); if (oldP && !oldP.querySelector('#nqmBody')) oldP.remove();
    if ($('nqmBody')) return true;
    var panel = $('panel-other'); if (!panel) return false;
    var sec = document.createElement('section'); sec.id = 'nqmSection'; sec.className = 'nqm-section';
    sec.innerHTML = '<div id="nqmBody"></div>';
    panel.appendChild(sec);
    if (!$('nqmCss')) { var st = document.createElement('style'); st.id = 'nqmCss';
      st.textContent = '.nqm-section{margin-top:18px}.nqm-head{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:flex-end;justify-content:space-between;margin:0 0 10px}' +
        '.nqm-head h3{margin:0 0 2px;font-size:16px}.nqm-head p{margin:0}.nqm-add{position:relative}' +
        '.nqm-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:40;min-width:290px;display:grid;gap:2px;padding:6px;border-radius:12px;background:var(--surface,#fff);border:1px solid var(--line,#d9e2ec);box-shadow:0 12px 30px rgba(3,12,32,.28)}' +
        '.nqm-menu[hidden]{display:none}.nqm-menu button{all:unset;box-sizing:border-box;display:grid;gap:2px;width:100%;padding:9px 11px;border-radius:8px;cursor:pointer;color:inherit}' +
        '.nqm-menu button b{font-size:13.5px}.nqm-menu button span{font-size:12px;opacity:.72}.nqm-menu button:hover:not([disabled]),.nqm-menu button:focus-visible{background:var(--surface-2,rgba(90,162,255,.12))}' +
        '.nqm-menu button[disabled]{opacity:.5;cursor:default}.nqm-empty{padding:14px 16px;border:1px dashed var(--line,#d9e2ec);border-radius:10px;margin-bottom:12px}' +
        '.nqm-up{position:relative;overflow:hidden;cursor:pointer;margin-right:8px}.nqm-up input{position:absolute;inset:0;opacity:0;cursor:pointer}.nqm-x{margin-left:8px}' +
        '.nqm-ocr{display:block;margin:0 0 12px;padding:10px 13px;border-radius:10px;font-size:13px;border:1px solid var(--line,#d9e2ec);background:var(--surface-2,rgba(90,162,255,.08))}.nqm-ocr[hidden]{display:none}.nqm-ocr.bad{border-color:#c0392b}.nqm-ocr ul{margin:6px 0 0 18px;padding:0}';
      document.head.appendChild(st); }
    return true;
  }
  function wrapTotals() {
    if (typeof window.calcTotals !== 'function' || window.calcTotals.__nqm) return !!(window.calcTotals && window.calcTotals.__nqm);
    var base = window.calcTotals, w = function () {
      var t = base.apply(this, arguments), q = state(); if (!q) return t;
      var b = NQM.bank(), d = NQM.dscr(), l = NQM.pl(), add = 0;
      if (b && b.used) { add += b.used; if ((q.bank.b || 1) === 2) t.b2 += b.used; else t.b1 += b.used; }
      if (l && l.used > 0) { add += l.used; if ((q.pl.b || 1) === 2) t.b2 += l.used; else t.b1 += l.used; }
      if (d && d.used) { if (d.used > 0) { add += d.used; if ((q.dscr.b || 1) === 2) t.b2 += d.used; else t.b1 += d.used; } else t.debts += -d.used; }
      if (add) t.income += add; t.nqm = add;
      t.front = t.income ? t.pitia / t.income : 0; t.back = t.income ? (t.pitia + t.debts) / t.income : 0;
      return t;
    };
    w.__nqm = true; w.__va = base.__va; window.calcTotals = w; return true;
  }
  function wrapSwitch() {
    if (typeof window.switchTab !== 'function' || window.switchTab.__nqm) return !!(window.switchTab && window.switchTab.__nqm);
    var base = window.switchTab, w = function (t) {
      if (t === 'nqm') {
        var rr = base.call(this, 'other'); NQM.render();
        setTimeout(function () { var s = $('nqmSection'); if (s && s.scrollIntoView) s.scrollIntoView({behavior: 'smooth', block: 'start'}); }, 80);
        return rr;
      }
      var r = base.apply(this, arguments);
      if (t === 'aus') guides(); if (t === 'sche') personalUse(); if (t === 'other') NQM.render();
      return r;
    };
    w.__nqm = true; w.__va = base.__va; window.switchTab = w; return true;
  }
  function wrapRecalc() {
    if (typeof window.RECALC !== 'function' || window.RECALC.__nqm) return !!(window.RECALC && window.RECALC.__nqm);
    var base = window.RECALC, w = function () { var r = base.apply(this, arguments); try { paint(); personalUse(); } catch (e) {} return r; };
    w.__nqm = true; w.__vaRender = base.__vaRender; window.RECALC = w; return true;
  }

  /* ------------------------------------------- VA: 5% near a military base */
  function vaBase() {
    var VA = window.VA; if (!VA || !VA.residual || VA.residual.__base5) return;
    var base = VA.residual;
    VA.residual = function () {
      var r = base.apply(this, arguments), S = G('S'); if (!r || !S || !S.va || !S.va.residual || !S.va.residual.nearBase) return r;
      r.required = r.required * 0.95; r.effectiveRequired = r.overBenchmark ? r.required * 1.2 : r.required; r.pass = r.actual >= r.effectiveRequired; r.nearBase = true; return r;
    };
    VA.residual.__base5 = true;
    var render = VA.render; VA.render = function () { var x = render.apply(this, arguments); try {
      var card = $('vaResidual'), S = G('S'); if (card && !$('vaNearBase')) {
        var l = document.createElement('label'); l.className = 'sw'; l.id = 'vaNearBase'; l.style.cssText = 'gap:8px;margin:10px 0 0';
        l.innerHTML = '<input type="checkbox" ' + (S.va.residual.nearBase ? 'checked' : '') + ' onchange="G_vaNearBase(this.checked)"><span>Veteran or spouse is active-duty or retired military and lives near a base with commissary / exchange access <em class="muted small">(residual requirement reduced 5%)</em></span>';
        var grid = card.querySelector('.card-body .grid'); grid && grid.parentNode ? grid.parentNode.insertBefore(l, grid.nextSibling) : card.appendChild(l);
      } } catch (e) {} return x; };
    window.G_vaNearBase = function (on) { var S = G('S'); if (S && S.va) { S.va.residual.nearBase = !!on; window.RECALC && window.RECALC(); VA.render(); } };
  }

  /* ------------------------------------- Schedule E personal-use test */
  function personalUse() {
    var S = G('S'); if (!S || !S.sche) return;
    S.sche.forEach(function (p, i) {
      var card = document.querySelectorAll('#scheduleEEnhanced .se-worksheet')[i]; if (!card) return;
      var msgs = ['y2', 'y1'].map(function (y) { var d = p[y] || {}, fair = N(d.fairDays), pers = N(d.personalDays), lim = Math.max(14, 0.1 * fair);
        return pers > lim ? (d.yr || (y === 'y1' ? 'Prior year' : 'Recent year')) + ': ' + pers + ' personal-use days is above the limit of ' + Math.round(lim) + ' (greater of 14 days or 10% of ' + fair + ' fair rental days)' : ''; }).filter(Boolean);
      var el = card.querySelector('.mt-personal-use');
      if (!msgs.length) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.className = 'notice warn mt-personal-use'; el.style.marginTop = '10px'; card.appendChild(el); }
      var html = '<span><b>Personal-use test.</b> ' + msgs.map(esc).join('; ') + '. The property is treated as a residence for tax purposes - vacation-home rules apply and Schedule E losses may not be deductible; confirm how the rental income is used.</span>';
      if (el.innerHTML !== html) el.innerHTML = html;
    });
  }

  /* ---------------------------------------------- AUS: guideline library */
  var GUIDE = [
    ['W-2 base pay: salaried and hourly', 'Monthly base by frequency: hourly rate x weekly hours x 52 / 12; weekly x 52 / 12; bi-weekly x 26 / 12; semi-monthly x 24 / 12; annual / 12. YTD months are the completed months plus the days worked in the current month over the days in that month. With consistent hours and a YTD run rate that supports it, use the current base; when hours fluctuate, average the actual YTD and prior one to two years of base earnings - the hourly rate cannot simply be multiplied by 40. A documented raise or unpaid leave explains a YTD shortfall.', 'Fannie Mae B3-3.1-01 · Freddie Mac 5303 · HUD 4000.1 II.A.4.c · VA 26-7 ch. 4'],
    ['Overtime, bonus, commission and other variable pay', 'Three benchmarks: YTD average, YTD + 1 year and YTD + 2 years. Stable or increasing: the YTD + 1 or 2-year average. Declining: the income must have stabilized, and the lowest figure is used; still declining, it cannot be used. Generally a 24-month history (12-24 months with compensating factors where the AUS allows). A once-a-year bonus is averaged over the two prior years (divided by 24) because a mid-year YTD overstates it. Un-reimbursed business expenses (Form 2106) apply only to the remaining eligible filers.', 'Fannie Mae B3-3.1-03 · Freddie Mac 5303.2 · HUD 4000.1 · VA 26-7'],
    ['NYC municipal and MTA employees', 'Base: contractual weekly hours (35, 37.5 or 40) x the current rate x 52 / 12, or the annual rate / 12. Retro pay from a union settlement is taken out of YTD - the new rate already gives credit for the raise. Shift, night, weekend and tour differentials, swing, report and travel time are variable pay with a 12-24-month history, averaged over YTD and the prior years. Longevity steps set by the collective bargaining agreement are a guaranteed add-on (annual rate / 12). Uniform and tool allowances count only when paid regularly as cash with a two-year history. 457(b) / 403(b) contributions and NYCERS / BERS / TRS pension loans are not deducted.', 'Agency variable-income and secured-debt rules'],
    ['Union and multiple-W-2 workers', 'For trade and hall employees with several W-2s: YTD days from January 1 to the pay date, months = days / 30; the lowest of the YTD trend, YTD + 1 year and YTD + 2 years is used. When the YTD + 2-year divisor is checked by hand it is YTD months + 24.', 'NMB Union Worker W2 sheet'],
    ['Freddie Mac 1099 contractors', 'YTD 1099 income over months in YTD (days / 30), and YTD + the prior year over months + 12. If income is decreasing the YTD figure is used, with management approval.', 'Freddie Mac 5304 · NMB Freddie 1099 sheet'],
    ['Self-employed: Schedule C, F and D', 'Schedule C line 31 plus depletion (12), depreciation (13), business use of home (30) and amortization or casualty loss, plus business miles x the IRS depreciation rate; less meals (24b) and non-recurring other income (line 6). FHA does not add back mileage depreciation unless it is documented on Form 4562 and does not require the meals deduction. Schedule F: line 34 plus depreciation (14) and recurring co-op / CCC payments. Schedule D: recurring like-for-like gains with two to three years of history and an asset base to continue them. Increasing: two-year average (/ 24); declining: most recent year (/ 12).', 'Fannie Mae Form 1084 · Freddie Mac Form 91 · HUD 4000.1'],
    ['K-1, 1120-S and 1065', 'K-1 ordinary income (line 1) plus net rental (lines 2-3), guaranteed payments (1065 line 4) and W-2 wages from the business. Conventional: if distributions are below ordinary income, the business must pass the liquidity (quick ratio) test or have a CPA letter confirming access; otherwise income is limited to distributions. Entity add-backs x ownership: depreciation, depletion, amortization; less non-recurring income, notes payable in under a year (unless a rolling line of credit) and non-deductible travel and meals. FHA and VA use ordinary income with the proportionate add-backs, less short-term debt, where the business is stable.', 'Fannie Mae B3-3.2 · Freddie Mac 5304 · HUD 4000.1'],
    ['1120 C-corporations', 'Corporate cash flow is usable only at 100% ownership (or a resolution allowing distribution of retained earnings): taxable income (30) less total tax (31), less non-recurring gains, plus depreciation, depletion, amortization and NOL, less notes due in under a year and non-deductible travel and meals; dividends already on Schedule B are not counted twice. Under 100% ownership only W-2 wages and dividends count.', 'Fannie Mae Form 1084 · Freddie Mac Form 91 · HUD 4000.1'],
    ['Business liquidity: quick and current ratio', 'Quick ratio (acid test) = (cash + receivables net of bad debt + government / tax-exempt securities + other current marketable assets) / (accounts payable + notes and mortgages due in under a year + other current liabilities). Inventory is excluded from the quick ratio and included in the current ratio. 1.00 or better confirms adequate liquidity; no current liabilities means the business is solvent.', 'NMB Liquidity Test and Quick Ratio Test sheets'],
    ['Non-taxable income and gross-up', 'Fannie Mae, Freddie Mac and VA: 25%; FHA: 15% or the actual prior-year tax rate. Only the non-taxable portion is grossed up - for Social Security, line 6a less line 6b. Residual income always uses the cash actually received, without the gross-up.', 'Fannie Mae B3-3.1-01 · HUD 4000.1 · VA 26-7'],
    ['Rental income', 'Schedule E: rents (3) less total expenses (20), plus insurance (9), mortgage interest (12), taxes (16), depreciation (18) and HOA or one-time repairs, over the months in service (fair rental days / 30.4167), less the full PITIA. FHA non-owner and VA: line 21 plus line 18. FHA owner-occupied 2-4 units: line 21 plus insurance, interest, taxes, depreciation and HOA, less the proposed PITIA. New or purchased rentals: 75% of the lease or Form 1007 / 1025 rent, less PITIA. Personal use above the greater of 14 days or 10% of fair rental days brings the vacation-home rules into play.', 'Fannie Mae B3-3.1-08 · Freddie Mac 5306 · HUD 4000.1 · VA 26-7'],
    ['Asset depletion', 'Fannie Mae (employment-related assets): retirement accounts, lump-sum distributions and business-sale proceeds; less a 10% penalty under age 59½, the down payment, closing costs and reserves; divided by the loan term in months. Purchase or limited cash-out, primary or second home, 70% LTV (80% if the owner is 62 or older). Freddie Mac 5307.1: depository, securities and retirement assets; less funds to close, reserves, gift or borrowed and pledged funds; divided by 240 months, or 180 under Bulletin 2026-10 with at least $30,000 remaining.', 'Fannie Mae B3-3.1-09 · Freddie Mac 5307.1'],
    ['VA residual income', 'Gross income (un-grossed) less federal, state and FICA taxes, the proposed PITIA, monthly debts and childcare, and maintenance and utilities at $0.14 per square foot of living area, compared with the regional table by family size and loan amount. Above a 41% ratio the residual must be at least 120% of the table. The table figure is reduced 5% for an active-duty or retired veteran or spouse living near a military base.', 'VA Pamphlet 26-7 ch. 4 · VA Form 26-6393'],
    ['Non-QM: bank statements, P&L and DSCR', 'Bank statement programs: net eligible deposits over 12 or 24 months, less a fixed or CPA expense factor, times ownership; transfers and non-business deposits are excluded. P&L-only programs: net profit over a 12 or 24-month P&L, times ownership; most want it prepared or signed by a CPA, EA or tax preparer, and a borrower-prepared P&L usually needs 2-3 months of business bank statements that support the revenue. DSCR: rent (lower of lease or Form 1007, with a haircut for short-term rentals) divided by PITIA or ITIA; 1.00x is standard, 1.20x and above prices best. Prepayment penalties run 1-5 years as a step-down, a flat percentage or six months of interest, usually with 20% a year penalty-free.', 'Investor guidelines - confirm against the program used']
  ];
  function guides() {
    var p = $('panel-aus'); if (!p || $('mtAusGuides')) return;
    var c = document.createElement('div'); c.className = 'card'; c.id = 'mtAusGuides';
    c.innerHTML = '<div class="card-top"><span class="tag">Guidelines</span><span class="doc-name">How each income type is calculated - by agency</span></div><div class="card-body">' +
      GUIDE.map(function (g, i) { return '<details class="mt-guide"' + (i === 0 ? ' open' : '') + '><summary><b>' + g[0] + '</b></summary><p>' + g[1] + '</p><div class="muted small">' + g[2] + '</div></details>'; }).join('') +
      '<div class="muted small" style="margin-top:12px">From the NMB income worksheet guide, cross-referenced with the Fannie Mae Selling Guide, Freddie Mac Guide, HUD Handbook 4000.1 and VA Pamphlet 26-7. Guidelines change - confirm against the current guide before relying on a figure.</div></div>';
    p.appendChild(c);
    if (!$('mtGuideCss')) { var st = document.createElement('style'); st.id = 'mtGuideCss';
      st.textContent = '.mt-guide{border-top:1px solid var(--line,#e3e8ef);padding:8px 0}.mt-guide:first-child{border-top:0}.mt-guide summary{cursor:pointer;font-size:13.5px}.mt-guide p{margin:6px 0 4px;font-size:13px;line-height:1.5}';
      document.head.appendChild(st); }
  }


  /* ------------------------------------------- Income Report pages (55.23) */
  function reportPages() {
    var H = G('rptHead'), BL = G('rptDetailBlock'), ID = G('rptIdBar'), TB = G('rptTotalBox'), S = G('S'), q = state();
    if (typeof H !== 'function' || typeof BL !== 'function' || !S || !q) return [];
    /* the same page the report builds for every other calculation (detailPage inside buildReportPages) */
    var dp = function (d) { return H(d.pageTitle, 'Every line item, the method applied, and the income used for qualifying') + (typeof ID === 'function' ? ID() : '') + BL(d) +
      (d.totalText ? '<div style="margin-top:14px;padding:10px 14px;border:2px solid #12263f;border-radius:6px;font-weight:700;display:flex;justify-content:space-between"><span>' + d.totalLabel + '</span><span>' + d.totalText + '</span></div>'
                   : (typeof TB === 'function' ? TB(d.totalLabel || 'Monthly Income Used', d.total || 0, d.totalSub || '') : '')); };
    var out = [], pct = function (v) { return (100 * v).toFixed(2) + '%'; };
    var b = NQM.bank();
    if (q.bank.use && b) out.push(dp({pageTitle: 'Bank Statement Income — ' + b.months + ' months', title: 'Non-QM Bank Statement Income', rows: [
      ['Gross deposits', b.months + ' statements', usd(b.gross)], ['Less: transfers and ineligible deposits', '', '− ' + usd(b.inel)], ['Net eligible deposits', '', usd(b.total)],
      ['Average per month', usd(b.total) + ' ÷ ' + b.months, usd(b.avg)], ['Less: expense factor', NQM.METHODS[q.bank.method] + (q.bank.method === 'personal' ? '' : ' · ' + pct(b.ratio)), '− ' + usd(b.expense)],
      ['Ownership', pct(b.own), ''], ['Qualifying monthly income', '', usd(b.monthly)]],
      total: b.monthly, totalLabel: 'Bank Statement Qualifying Income', note: '<b>How this was calculated.</b> Net eligible deposits over the statement period are averaged, reduced by the expense factor and multiplied by the ownership percentage. Transfers between accounts, loan proceeds and other non-business deposits are excluded.'}));
    var l = NQM.pl();
    if (q.pl && q.pl.use && l && (N(q.pl.revenue) || N(q.pl.expenses))) out.push(dp({pageTitle: 'Profit and Loss Income — ' + l.months + ' months', title: 'Non-QM P&L Statement Income', rows: [
      ['Gross revenue / sales', q.pl.from ? esc(q.pl.from) + ' – ' + esc(q.pl.to) : '', usd(q.pl.revenue)], ['Less: cost of goods sold', '', '− ' + usd(q.pl.cogs)], ['Gross profit', '', usd(l.gross)],
      ['Less: operating expenses', '', '− ' + usd(q.pl.expenses)], ['Net profit', NQM.PREP[q.pl.prep] || '', usd(l.net)], ['Net profit per month', usd(l.net) + ' ÷ ' + l.months, usd(l.avg)],
      ['Ownership', pct(l.own), ''], ['Qualifying monthly income', '', usd(l.monthly)]],
      total: l.used, totalLabel: 'P&L Qualifying Income', note: '<b>How this was calculated.</b> Net profit (revenue less cost of goods sold and operating expenses) over the P&L period, times the ownership percentage. A loss is not used as income.'}));
    var d = NQM.dscr();
    if (q.dscr.use && d && d.pitia) out.push(dp({pageTitle: 'DSCR — Investor Property Cash Flow', title: 'Debt Service Coverage Ratio', rows: [
      ['Qualifying rent', 'lower of lease or Form 1007 / 1025' + (N(q.dscr.haircut) ? ' less ' + N(q.dscr.haircut) + '% short-term rental haircut' : ''), usd(d.rent)],
      ['Payment used', q.dscr.io ? 'Interest-only' : 'Amortizing P&I (' + N(q.dscr.term) + ' months)', usd(d.payment)], ['Taxes, insurance and HOA', '', usd(N(q.dscr.taxes) + N(q.dscr.ins) + N(q.dscr.hoa))],
      ['Qualifying PITIA', '', usd(d.pitia)], ['DSCR', usd(d.rent) + ' ÷ ' + usd(d.pitia), d.ratio.toFixed(2) + 'x'], ['Net monthly cash flow', d.tier, usd(d.net)]],
      total: d.used, totalLabel: 'DSCR Net Cash Flow Used', note: '<b>How this was calculated.</b> Qualifying rent divided by the full housing payment. 1.00x or better is the standard threshold; investor pricing improves at 1.20x.'}));
    var p = NQM.prepay();
    if (q.dscr.use && p && N(q.prepay.payoff)) out.push(dp({pageTitle: 'DSCR Prepayment Penalty', title: NQM.PREPAY[q.prepay.type] + ' · ' + q.prepay.years + ' years', rows:
      p.rows.map(function (r) { return ['Year ' + r.year, (100 * r.pct).toFixed(2) + '% of payoff', usd(r.used)]; }), total: p.rows[0].used, totalLabel: 'Penalty if Paid Off in Year 1',
      note: '<b>How this was calculated.</b> Balance subject to the penalty ' + usd(p.subject) + ' (payoff less the ' + N(q.prepay.free) + '% penalty-free allowance on the original loan).'}));
    var L = G('schL'), SL = G('SCHL_A'), LL = G('SCHL_L');
    if (typeof L === 'function') (S.corp || []).forEach(function (e) {
      var t = L(e); if (!t.has) return; var v = function (y, k) { return N(((e.schL || {})[y] || {})[k]); }, rows = [];
      (SL || []).forEach(function (a) { rows.push([a[1] + ' <span class="muted">(' + a[2] + ')</span>', usd(v('y2', a[0])), usd(v('y1', a[0]))]); });
      (LL || []).forEach(function (a) { rows.push(['Less: ' + a[1] + ' <span class="muted">(' + a[2] + ')</span>', usd(v('y2', a[0])), usd(v('y1', a[0]))]); });
      var f = function (r) { return !r ? '—' : r.quick >= 999 ? 'no current liabilities' : r.quick.toFixed(2) + ' / ' + r.current.toFixed(2); };
      rows.push(['Quick ratio / current ratio', f(t.y2), f(t.y1)]);
      out.push(dp({pageTitle: 'Business Liquidity Test — ' + (esc(e.name) || 'Business'), title: 'Schedule L: prior year | most recent year', rows: rows,
        totalLabel: 'Most recent quick ratio', totalText: (t.recent ? (t.recent.quick >= 999 ? 'no current liabilities' : t.recent.quick.toFixed(2)) : '—') + (t.pass ? ' — PASS' : ' — FAIL'), note: '<b>How this was calculated.</b> Quick ratio = (cash + receivables + government / tax-exempt securities + other current assets) ÷ current liabilities; the current ratio also counts inventory. ' +
        (t.pass ? '1.00 or better: adequate liquidity, so ordinary income is used.' : 'Below 1.00: conventional income is limited to distributions.')}));
    });
    return out;
  }
  function wrapReport() {
    var B = G('buildReportPages'); if (typeof B !== 'function' || B.__nqm) return !!(B && B.__nqm);
    var w = function () { var pages = B.apply(this, arguments); try { var extra = reportPages(); if (extra.length) pages = pages.concat(extra); } catch (e) {} return pages; };
    w.__nqm = true; window.buildReportPages = w; try { (0, eval)('buildReportPages = window.buildReportPages'); } catch (e) {}
    return true;
  }
  var tries = 0, t = setInterval(function () {
    var ok = buildTab() && wrapTotals() && wrapSwitch() && wrapRecalc() && wrapReport();
    vaBase();
    if (ok && state()) { guides(); NQM.render(); window.RECALC && window.RECALC(); clearInterval(t); }
    else if (++tries > 200) clearInterval(t);
  }, 60);
})();
