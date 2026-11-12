/* Income Calculator v57 - the "NMB Income Worksheet" report: each page is drawn from the workbook's own layout
   (nmb-template.js, extracted from the .xlsm by tools/nmb/extract.py - widths, heights, merges, fonts, fills, borders,
   number formats and the printed text) and filled with this calculator's figures, cell by cell:
   Wage Earner (one page per job), SE & Other Income (one page per business), Rental (Conventional, up to five properties
   a page), Rent - FHA Owner Occ., Rent - FHA NOO & VA, Rent - Purchase (lease / 75%), Quick Ratio Test, Union Worker W2 (combined union method),
   Freddie 1099 (one page per 1099 entry) and Retirement Income (other income, four extra entries a page).
   Loaded only when the report asks for it. */
(function () {
  'use strict';
  if (window.NMBReport) return;
  var T = function () { return window.NMB_TEMPLATE; };
  var colName = function (n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  var cellRC = function (ref) { var m = /^([A-Z]+)(\d+)$/.exec(ref), c = 0; for (var i = 0; i < m[1].length; i++) c = c * 26 + m[1].charCodeAt(i) - 64; return [+m[2], c]; };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var NUM = function (v) { var n = parseFloat(String(v == null ? '' : v).replace(/[$,\s%]/g, '')); return isFinite(n) ? n : 0; };

  /* ---------------------------------------------------------------- number formats, the way Excel shows them */
  function excelDate(n) { return new Date(Math.round((n - 25569) * 86400000)); }
  function fmt(v, nf) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return (v.getMonth() + 1) + '/' + v.getDate() + '/' + v.getFullYear();
    if (typeof v !== 'number') return String(v);
    nf = String(nf || '');
    if (/[dmy]{1,4}[\/\-.][dmy]{1,4}/i.test(nf) && !/0/.test(nf.replace(/\[[^\]]*\]/g, ''))) return fmt(excelDate(v));
    var dec = (/\.(0+)/.exec(nf) || [, ''])[1].length;
    if (/%/.test(nf)) return (v * 100).toFixed(dec) + '%';
    var s = Math.abs(v).toLocaleString('en-US', {minimumFractionDigits: dec, maximumFractionDigits: dec});
    var money = /\$|_\(|\[\$/.test(nf);
    if (v < 0) return (/\(/.test(nf) ? '(' : '-') + (money ? '$' : '') + s + (/\(/.test(nf) ? ')' : '');
    return (money ? '$' : '') + s;
  }
  function general(v) {
    if (typeof v !== 'number') return v;
    return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2);
  }

  /* ---------------------------------------------------------------- one sheet, as a table */
  var BORDER = {thin: '1px solid', medium: '2px solid', thick: '3px solid', dashed: '1px dashed', dotted: '1px dotted', double: '3px double', hair: '1px solid', mediumDashed: '2px dashed', dashDot: '1px dashed', mediumDashDot: '2px dashed', dashDotDot: '1px dotted', slantDashDot: '1px dashed'};
  function styleCss(st) {
    if (!st) return '';
    var c = [];
    if (st.b) c.push('font-weight:700'); if (st.i) c.push('font-style:italic'); if (st.u) c.push('text-decoration:underline');
    if (st.sz) c.push('font-size:' + st.sz + 'pt'); if (st.nm) c.push('font-family:"' + st.nm + '",Calibri,Arial,sans-serif');
    if (st.c) c.push('color:' + st.c); if (st.bg) c.push('background:' + st.bg);
    if (st.bd) { var m = {l: 'left', r: 'right', t: 'top', b: 'bottom'}; for (var k in st.bd) c.push('border-' + m[k] + ':' + (BORDER[st.bd[k][0]] || '1px solid') + ' ' + st.bd[k][1]); }
    if (st.h && st.h !== 'general') c.push('text-align:' + ({centerContinuous: 'center', distributed: 'justify', fill: 'left'}[st.h] || st.h));
    c.push('vertical-align:' + ({center: 'middle', top: 'top'}[st.v] || 'bottom'));
    c.push(st.w ? 'white-space:normal;word-wrap:break-word' : 'white-space:nowrap');
    if (st.in) c.push('padding-left:' + (st.in * 9) + 'px');
    return c.join(';');
  }
  /* values: {'E7': 'Pat Sample', 'F43': 1234.5, ...}; opt.rows: [first, last] to draw part of the sheet */
  function render(name, values, opt) {
    var sh = T().sheets[name], S = T().styles; opt = opt || {}; values = values || {};
    var r1 = opt.rows ? opt.rows[0] : sh.range[0], r2 = opt.rows ? opt.rows[1] : sh.range[2], c1 = sh.range[1], c2 = sh.range[3];
    var colW = function (c) { var d = sh.cols[c]; return d && d.hid ? 0 : Math.round((d ? d.w : sh.dw) * 7 + 5); };
    var rowH = function (r) { var d = sh.rows[r]; return d && d.hid ? 0 : Math.round((d ? d.h : sh.dh) * 4 / 3); };
    var cols = [], rows = [], W = 0, H = 0, c, r;
    for (c = c1; c <= c2; c++) if (colW(c)) { cols.push(c); W += colW(c); }
    for (r = r1; r <= r2; r++) if (rowH(r)) { rows.push(r); H += rowH(r); }
    var merge = {}, covered = {};
    sh.merges.forEach(function (m) { if (m[0] < r1 || m[2] > r2) return; merge[m[0] + ',' + m[1]] = m; for (var rr = m[0]; rr <= m[2]; rr++) for (var cc = m[1]; cc <= m[3]; cc++) if (rr !== m[0] || cc !== m[1]) covered[rr + ',' + cc] = 1; });
    var filled = function (r, c) { if (covered[r + ',' + c]) return true; var d = sh.cells[r + ',' + c], ref = colName(c) + r, v = Object.prototype.hasOwnProperty.call(values, ref) ? values[ref] : (d && d.t ? d.v : ''); return v != null && v !== ''; };
    var used = {}, body = rows.map(function (r) {
      return '<tr style="height:' + rowH(r) + 'px">' + cols.map(function (c) {
        var k = r + ',' + c; if (covered[k]) return '';
        var cell = sh.cells[k], ref = colName(c) + r, span = '';
        if (opt.like && opt.like[ref]) { var src = sh.cells[cellRC(opt.like[ref]).join(',')]; if (src) cell = {s: src.s}; }   /* a cell the workbook leaves unformatted, drawn like another */
        var st = cell ? S[cell.s] : null;
        if (merge[k]) { var m = merge[k], cs = 0, rs = 0; for (var x = m[1]; x <= m[3]; x++) if (colW(x)) cs++; for (var y = m[0]; y <= m[2]; y++) if (rowH(y)) rs++; if (cs > 1) span += ' colspan="' + cs + '"'; if (rs > 1) span += ' rowspan="' + rs + '"'; }
        var v = Object.prototype.hasOwnProperty.call(values, ref) ? values[ref] : (cell && cell.t && cell.v != null ? cell.v : '');
        var text = st && st.nf ? fmt(v, st.nf) : general(v);
        if (st) used[cell.s] = 1;
        /* Excel: text spills into empty neighbours - right-aligned to the left, centred both ways, left-aligned to the
           right - and is cut off by a neighbour that has something in it; numbers in General alignment sit on the right */
        var gen = !st || !st.h || st.h === 'general', al = gen ? (typeof v === 'number' ? 'right' : 'left') : st.h;
        var html = esc(text).replace(/\n/g, '<br>'), cls = (st ? 'x' + cell.s : '') + (gen && typeof v === 'number' ? ' nr' : '');
        if (html && !(st && st.w) && (al === 'right' || al === 'center' || al === 'centerContinuous')) html = '<div class="ov ' + (al === 'right' ? 'r' : 'c') + '">' + html + '</div>';
        else if (html && !(st && st.w) && !merge[k] && filled(r, c + 1)) cls += ' clip';
        return '<td' + span + (cls ? ' class="' + cls.trim() + '"' : '') + '>' + html + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var css = Object.keys(used).map(function (id) { return '.nmb-page table.nmb td.x' + id + '{' + styleCss(S[id]) + '}'; }).join('');
    /* fitted to a letter page the way the workbook prints it (it is set to print at 56-69%) */
    var f = Math.min(1, 740 / W, (opt.maxH || 960) / H);
    return '<style>' + css + '</style><div class="nmb-wrap" style="width:' + Math.round(W * f) + 'px;height:' + Math.round(H * f) + 'px;overflow:hidden">' +
      '<table class="nmb" style="width:' + W + 'px;transform:scale(' + f.toFixed(4) + ');transform-origin:0 0">' +
      '<colgroup>' + cols.map(function (c) { return '<col style="width:' + colW(c) + 'px">'; }).join('') + '</colgroup><tbody>' + body + '</tbody></table></div>';
  }
  /* scoped above the report page's own table rules (.rpt table td draws a grid), so only the workbook's borders show */
  var BASE_CSS = '<style>.nmb-page table.nmb{border-collapse:collapse;table-layout:fixed;font:11pt Calibri,Arial,sans-serif;color:#000;background:#fff;margin:0}' +
    '.nmb-page table.nmb td{border:0 none;background:transparent;padding:0 3px;overflow:visible;line-height:1.15;font-size:11pt;vertical-align:bottom;white-space:nowrap;text-align:left}' +
    '.nmb-page table.nmb td.nr{text-align:right}.nmb-page table.nmb td.clip{overflow:hidden}.nmb-page .ov{display:flex;white-space:nowrap}.nmb-page .ov.r{justify-content:flex-end}.nmb-page .ov.c{justify-content:center}</style>';

  /* ---------------------------------------------------------------- figures from the calculator */
  var G = function (n) { try { return (0, eval)(n); } catch (e) { return undefined; } };
  function who(b) { var S = G('S'); return (b === 2 ? S.b2 : S.b1) || S.b1 || S.borrower || ''; }
  var METHOD = {current: 'Base Pay', ytd: 'YTD', ytd12: 'YTD + 12 Mos.', ytd24: 'YTD + 24 Mos.', annual: 'Annual avg.', custom: 'Custom', none: 'N/A'};
  function asDate(s) { var d = s ? new Date(String(s).length === 10 ? s + 'T12:00:00' : s) : null; return d && !isNaN(d) ? d : ''; }

  function wagePage(j, i) {
    var S = G('S'), c = G('calcW2')(j), V = {}, comp = c.comp, mode = j.mode === 'auto';
    var meth = function (k) { var m = mode ? comp[k].rec : (j.m || {})[k]; return METHOD[m] || m || 'N/A'; };
    V.E3 = S.file || ''; V.K3 = new Date(); V.A5 = 'Employment Record #' + (i + 1);
    V.E7 = who(j.b); V.E9 = j.employer || '';
    V.E11 = /irregular|variable/.test(j.incomeType) ? 'Irregular Hours' : 'Consistent Hours';
    V.E16 = j.freq || ''; V.E17 = NUM(j.rate); V.E18 = NUM(j.hours);
    V.H16 = c.monthlyBase; V.H17 = comp.base.ytd; V.H18 = c.monthlyBase * 12;
    V.F23 = asDate(j.hireDate); V.F24 = asDate(j.ytdThru);
    if (c.baseRule === 'na') V.G23 = 'The borrower has been on the job for 30 days or less so the income will not be calculated.';
    var yrs = [c.yr1, c.yr2, c.yr3], keys = ['base', 'ot', 'comm', 'bonus', 'other'], colsK = ['E', 'F', 'G', 'H', 'I'];
    ['y1', 'y2', 'y3'].forEach(function (y, n) {
      var row = 29 + n, d = j[y] || {}, tot = 0;
      V['D' + row] = yrs[n];
      keys.forEach(function (k, x) { var v = k === 'base' ? NUM(d.base) - (y === 'y1' ? NUM(j.y1.retro) : 0) : k === 'other' ? NUM(d.other) + NUM(d.diff) + NUM(d.swing) : NUM(d[k]); V[colsK[x] + row] = v; tot += v; });
      V['J' + row] = y === 'y1' ? 'N/A' : NUM(d.unre); V['K' + row] = y === 'y1' ? tot : tot - NUM(d.unre);
    });
    V.D32 = c.yr3 - 1; ['E32', 'F32', 'G32', 'H32', 'I32', 'K32'].forEach(function (k) { V[k] = 'N/A'; }); V.J32 = 0;
    keys.forEach(function (k, x) { var C = comp[k]; V[colsK[x] + '34'] = (k !== 'base' && C.rec === 'none' && (C.y1 || C.y2 || C.y3)) ? 'Need 2 yrs to use this amt.' : c.parts[k]; V[colsK[x] + '35'] = meth(k); });
    V.J34 = c.parts.unre; V.J35 = comp.unre.ytd ? 'Average' : 'N/A'; V.K34 = c.total * 12; V.K35 = '-';
    V.F36 = c.monthlyBase * 12; V.F37 = comp.base.ytd * 12; V.J39 = j.baseChoice === 'ytd' ? 'YTD Annual' : 'Base Annual';
    if (c.ytdBelowBase) V.I36 = 'The year to date amount is less than the base salary. Which would you like to use in the calculations?';
    V.F43 = c.total; V.G43 = c.total * 12;
    var ytdOnly = keys.reduce(function (t, k) { return t + comp[k].ytd; }, 0) - comp.unre.ytd;
    var a12 = keys.reduce(function (t, k) { return t + comp[k].a12; }, 0) - comp.unre.ytd, a24 = keys.reduce(function (t, k) { return t + comp[k].a24; }, 0) - comp.unre.ytd;
    V.J44 = ytdOnly; V.K44 = ytdOnly * 12; V.J45 = ytdOnly > 0 ? ((c.total / ytdOnly) - 1) * -1 : 0; V.K45 = ytdOnly * 12 - c.total * 12;
    V.E46 = c.monthlyBase; V.G46 = comp.base.y2 ? a12 : 'N/A'; V.E47 = ytdOnly; V.G47 = comp.base.y3 ? a24 : 'N/A';
    if (V.J45 < -0.05) { V.J46 = 'Please be advised that the YTD amount is less than'; V.J47 = 'the calculated amount by more than 5%.'; }
    return render('Wage Earner', V);
  }

  /* SE & Other Income: one page per business; the older year goes in column L, the recent year in column O (as on the sheet) */
  function sePage(kind, e) {
    var S = G('S'), V = {}, set = function (row, k, o, r) { V['L' + row] = o; V['O' + row] = r; };
    var seType = G('seType') ? G('seType')() : 'Conventional';
    V.F9 = seType === 'DURP' ? 'DU Refi Plus' : seType; V.D7 = S.file || ''; V.J7 = e.name || '';
    var yo = NUM(e.y2 && e.y2.yr) || new Date().getFullYear() - 2, yr = NUM(e.y1 && e.y1.yr) || yo + 1;
    V.L13 = yo; V.O13 = yr;
    var olderTot = 0, recentTot = 0, monthly = 0;
    var sec = function (row, o, r, avg) { V['Q' + row] = o; V['R' + row] = r; V['S' + row] = avg != null ? avg : (o + r) / 2; olderTot += o; recentTot += r; };
    if (kind === 'schc') {
      var b = e, L = G('schLines')(b), yv = function (y) { return L.reduce(function (t, l) { return t + l.sign * NUM(b[y][l.k]); }, 0); };
      var map = b.form === 'F' ? {net34: 27, depr14: 28, coop: 29, nonrec8: 34, amort32: 35, home: 36} : b.form === 'D' ? {capg: 24} : {net31: 15, depl12: 16, depr13: 17, meals: 18, nonrec6: 19, home30: 20, amort: 21};
      L.forEach(function (l) { if (map[l.k]) set(map[l.k], l.k, NUM(b.y2[l.k]), NUM(b.y1[l.k])); });
      var o = yv('y2'), r = yv('y1');
      if (b.form === 'F') sec(36, o, r); else if (b.form === 'D') { V.S24 = (o + r) / 2; olderTot += 0; recentTot += r; } else sec(21, o, r);
      if (!b.form || b.form === 'C') { var rate = G('wsMileRate'); set(40, 'miles', NUM(b.y2.miles), NUM(b.y1.miles)); var mo = NUM(b.y2.miles) * (rate(b.y2.yr) || NUM(b.rate)), mr = NUM(b.y1.miles) * (rate(b.y1.yr) || NUM(b.rate)); sec(41, mo, mr); }
      monthly = G('calcSchC')(b).monthly; V.O43 = monthly;
    } else {
      var own = NUM(e.own) / 100, gov = S.agency === 'FHA' || S.agency === 'VA';
      var ord = function (d) { var v = NUM(d.ordinary); if (!gov && !e.liquidity && NUM(d.dist) > 0) v = Math.min(v, NUM(d.dist)); return v; };
      if (e.form === '1120') {
        var C = {taxable: 71, tax: 72, gains: 73, othinc: 74, depr: 75, depl: 76, amort: 77, nol: 78, notes: 79, travel: 81, divid: 83};
        for (var k in C) set(C[k], k, NUM(e.y2[k]), NUM(e.y1[k])); V.L82 = own; V.O82 = own;
        var cv = function (d) { return (NUM(d.taxable) - NUM(d.tax) - NUM(d.gains) - NUM(d.othinc) + NUM(d.depr) + NUM(d.depl) + NUM(d.amort) + NUM(d.nol) - NUM(d.notes) - NUM(d.travel)) * own - NUM(d.divid); };
        sec(83, cv(e.y2), cv(e.y1)); if (NUM(e.y1.w2biz) || NUM(e.y2.w2biz)) { set(51, 'w2', NUM(e.y2.w2biz), NUM(e.y1.w2biz)); sec(51, NUM(e.y2.w2biz), NUM(e.y1.w2biz)); }
      } else {
        var k1 = e.form === '1065' ? {ordinary: 54, netRental: 55, othRental: 56, guar: 57, w2biz: 58} : {ordinary: 48, netRental: 49, othRental: 50, w2biz: 51};
        var kv = function (d) { return ord(d) + NUM(d.netRental) + NUM(d.othRental) + (e.form === '1065' ? NUM(d.guar) : 0) + NUM(d.w2biz); };
        for (var kk in k1) set(k1[kk], kk, kk === 'ordinary' ? ord(e.y2) : NUM(e.y2[kk]), kk === 'ordinary' ? ord(e.y1) : NUM(e.y1[kk]));
        sec(e.form === '1065' ? 58 : 51, kv(e.y2), kv(e.y1));
        var adj = e.form === '1065' ? {othPship: 106, nonrec: 107, depr: 108, depl: 109, amort: 110, notes: 111, travel: 113, own: 114} : {nonrec: 91, depr: 92, depl: 93, amort: 94, notes: 95, travel: 97, own: 98};
        for (var a in adj) if (a !== 'own') set(adj[a], a, NUM(e.y2[a]), NUM(e.y1[a]));
        V['L' + adj.own] = own; V['O' + adj.own] = own;
        var av = function (d) { return (NUM(d.othPship || 0) * (e.form === '1065' ? 1 : 0) - NUM(d.nonrec) + NUM(d.depr) + NUM(d.depl) + NUM(d.amort) - NUM(d.notes) - NUM(d.travel)) * own; };
        sec(adj.own, av(e.y2), av(e.y1));
      }
      monthly = G('calcCorp')(e).monthly; V.O117 = monthly;
    }
    V.K122 = yo + ' Total'; V.L122 = olderTot; V.N122 = yr + ' Total'; V.O122 = recentTot;
    V.Q120 = olderTot; V.Q121 = recentTot; V.Q122 = olderTot ? 1 - recentTot / olderTot : 0;
    if (seType === 'FHA' && olderTot && 1 - recentTot / olderTot > 0.2) V.B124 = 'Income has declined 20% or greater than prior year. All FHA loans must be downgraded to manual';
    V.O124 = monthly;
    ['O22', 'O37', 'O52', 'O59', 'O85', 'O100', 'O116', 'O119'].forEach(function (k) { V[k] = ''; });
    if (recentTot < olderTot) V.O42 = 'Some portion of the income reported on the returns has decreased from the prior year so the most recent year is being used.';
    return render('SE & Other Income', V);
  }

  /* Rental pages follow the calculator's two-year rental model (income-enhancements.js): p.y1 = the older tax year,
     p.y2 = the most recent; methods sche (worksheet), fhaoo, fha (+ p.va) and lease. */
  function rentalPages() {
    var S = G('S'), calc = G('calcSchE'), pages = [], list = (S.sche || []).filter(function (p) { return p.use !== false && (!G('rptOn') || G('rptOn')('sche:' + p.id)); });
    var by = function (m) { return list.filter(function (p) { return p.method === m; }); };
    var conv = by('sche'), oo = by('fhaoo'), noo = by('fha'), lease = by('lease');
    var Y = function (p, y) { return (p && p[y]) || {}; };
    var dropped = function (c) { return /decreas/i.test((c && (c.basis || c.why)) || ''); };
    var DROP = 'The net monthly rent has decreased from the prior year so only the most recent year is being used.';
    for (var g = 0; g < conv.length; g += 5) {
      var V = {F3: S.file || '', K3: who(1), P3: new Date()};
      conv.slice(g, g + 5).forEach(function (p, n) {
        var o = 29 * n, R = function (row) { return row + o; }, c = calc(p), y1 = Y(p, 'y1'), y2 = Y(p, 'y2');
        V['B' + R(5)] = 'Property ' + (g + n + 1); V['F' + R(7)] = p.addr || '';
        V['O' + R(9)] = NUM(p.ausYears) === 1 ? 1 : 2; V['O' + R(11)] = asDate(p.purchased);
        V['M' + R(15)] = NUM(y1.yr); V['P' + R(15)] = NUM(y2.yr);
        ['rents', 'ins', 'mortInt', 'taxes', 'depr', 'otherAdd', 'totalExp'].forEach(function (k, x) { V['M' + R(16 + x)] = NUM(y1[k]); V['P' + R(16 + x)] = NUM(y2[k]); });
        if (dropped(c)) V['P' + R(23)] = DROP;
        /* the calculator keeps one current PITIA figure, so it goes on the first line of section B */
        V['P' + R(25)] = c.gross; V['P' + R(26)] = NUM(c.pitia); V['P' + R(27)] = 0; V['P' + R(28)] = 0; V['P' + R(29)] = 0; V['P' + R(30)] = 0;
        V['P' + R(32)] = c.monthly;
      });
      pages.push(render('Rental', V));
    }
    oo.forEach(function (p, n) {
      var c = calc(p), y1 = Y(p, 'y1'), y2 = Y(p, 'y2'), V = {E3: S.file || '', J3: who(1), O3: new Date(), A5: 'Property ' + (n + 1), E7: p.addr || '', N9: asDate(p.purchased), L13: NUM(y1.yr), O13: NUM(y2.yr), O22: c.gross};
      ['ins', 'mortInt', 'taxes', 'depr', 'otherAdd', 'line21'].forEach(function (k, x) { V['L' + (14 + x)] = NUM(y1[k]); V['O' + (14 + x)] = NUM(y2[k]); });
      if (dropped(c)) V.O20 = DROP;
      pages.push(render('Rent - FHA Owner Occ.', V, {rows: [1, 24]}));
    });
    for (var h = 0; h < noo.length; h += 5) {
      var V2 = {E3: S.file || '', J3: who(1), O3: new Date(), E5: noo[h].va ? 'VA' : 'FHA Non-owner'};
      noo.slice(h, h + 5).forEach(function (p, n) {
        var o = 13 * n, c = calc(p), y1 = Y(p, 'y1'), y2 = Y(p, 'y2');
        V2['A' + (7 + o)] = 'Property ' + (h + n + 1) + (p.va ? ' (VA)' : ''); V2['E' + (9 + o)] = p.addr || ''; V2['G' + (11 + o)] = asDate(p.purchased);
        V2['L' + (14 + o)] = NUM(y1.yr); V2['O' + (14 + o)] = NUM(y2.yr);
        V2['L' + (15 + o)] = NUM(y1.depr); V2['O' + (15 + o)] = NUM(y2.depr);
        V2['L' + (16 + o)] = NUM(y1.line21); V2['O' + (16 + o)] = NUM(y2.line21);
        V2['O' + (18 + o)] = c.gross;
      });
      pages.push(render('Rent - FHA NOO & VA', V2));
    }
    for (var q = 0; q < lease.length; q += 3) {
      var V3 = {B3: S.file || '', B4: [S.b1, S.b2].filter(Boolean).join(' & ')};
      lease.slice(q, q + 3).forEach(function (p, n) { var col = 'DEF'[n], c = calc(p); V3[col + '10'] = NUM(p.leaseRent); V3[col + '12'] = NUM(p.leaseRent) * 0.75; V3[col + '13'] = NUM(p.pitia); V3[col + '15'] = c && isFinite(c.monthly) ? c.monthly : NUM(p.leaseRent) * 0.75 - NUM(p.pitia); });
      pages.push(render('Rent - Purchase', V3));
    }
    return pages;
  }

  /* Union Worker W2: all pay stubs and W-2s together (the calculator's combined "union worker" method) */
  function unionPage() {
    var S = G('S'), J = (S.w2 || []).filter(function (j) { return j.use !== false; }), c = G('calcCombined')(J), u = c.union;
    var pd = G('pDate'), ends = J.map(function (j) { return pd(j.ytdThru); }).filter(Boolean).sort(function (a, b) { return b - a; }), end = ends[0] || '';
    var yr = end ? end.getFullYear() : c.yr, V = {H4: new Date(), C7: S.file || '', G7: who(1), C9: S.agency === 'FHA' || S.agency === 'VA' ? S.agency : 'Conventional', G9: J.map(function (j) { return j.employer; }).filter(Boolean).join(', '), C13: end, D15: yr, E15: yr - 1, F15: yr - 2};
    var K = ['base', 'ot', 'comm', 'bonus', 'other'], tot = function (d) { return K.reduce(function (t, k) { return t + NUM(d[k]); }, 0); };
    J.slice(0, 6).forEach(function (j, n) { V['B' + (16 + n)] = j.employer || ('W-2 #' + (n + 1)); V['D' + (16 + n)] = tot(j.y1); V['E' + (16 + n)] = tot(j.y2); V['F' + (16 + n)] = tot(j.y3); });
    if (J.length > 6) V.B28 = (J.length - 6) + ' more W-2 entries are included in the totals.';
    V.D22 = c.t1; V.E22 = c.t2; V.F22 = c.t3; V.D24 = u.ytd; V.G24 = u.days ? c.t1 / u.days * 360 : 0; V.D25 = u.y12; V.D26 = u.y24; V.D27 = u.used;
    return render('Union Worker W2', V);
  }
  /* Freddie 1099: one page per 1099 / contract income entry that uses the YTD + prior-year method */
  function f1099Page(o) {
    var S = G('S'), r = G('calcOther')(o), f = r.f1099, end = G('pDate')(o.thru1099) || '', yr = end ? end.getFullYear() : new Date().getFullYear();
    var V = {H4: new Date(), C7: S.file || '', G7: who(o.b), G9: o.desc || '', C13: end, D15: yr, E15: yr - 1, F15: yr - 2,
      D16: NUM(o.ytd1099), E16: NUM(o.prior1099), D22: NUM(o.ytd1099), E22: NUM(o.prior1099), F22: 0, D24: f.ytd, D25: f.y12,
      B27: 'Income to be used (' + (f.decreasing ? 'decreasing: YTD trend' : 'YTD + prior year') + ')', D27: f.used};
    return render('Freddie 1099', V, {like: {B27: 'B24', D27: 'D25'}});
  }
  /* Retirement Income: Social Security, pension, annuity / defined contribution, then up to four other entries a page */
  function retirementPages(list) {
    var S = G('S'), calc = G('calcOther'), types = G('OTHER_TYPES') || [], pages = [];
    var label = function (o) { var t = types.filter(function (x) { return x.v === o.type; })[0]; return ((t && t.t) || o.type || '').replace(/&amp;/g, '&') + (o.desc ? ' - ' + o.desc : ''); };
    var row = {ssa: 12, ssdi: 12, pension: 13, ira: 14, annuity: 14};
    var fixed = {12: [], 13: [], 14: []}, others = [];
    list.forEach(function (o) { var k = row[o.type]; if (k) fixed[k].push(o); else others.push(o); });
    var put = function (V, r, items) {
      var m = 0, up = 0, gross = false, pct = 0;
      items.forEach(function (o) { var c = calc(o); m += c.base; up += c.up; if (o.nonTax && c.up) { gross = true; pct = pct || NUM(o.grossUp) / 100 * (o.ntPct == null || o.ntPct === '' ? 1 : NUM(o.ntPct) / 100); } });
      V['C' + r] = m; V['D' + r] = m * 12; V['E' + r] = m; V['F' + r] = gross ? 'Yes' : 'No'; V['G' + r] = gross ? (m ? up / m : pct) : 0; V['H' + r] = up; V['I' + r] = m + up; V['J' + r] = Math.max(m, m + up);
      return {m: m, j: Math.max(m, m + up)};
    };
    for (var p = 0; p === 0 || p < others.length; p += 4) {
      var V = {B2: [S.b1, S.b2].filter(Boolean).join(' & '), B3: S.file || '', J3: new Date()}, base = 0, fin = 0, chunk = others.slice(p, p + 4);
      [12, 13, 14].forEach(function (r) { var t = p === 0 ? put(V, r, fixed[r]) : put(V, r, []); base += t.m; fin += t.j; });
      for (var i = 0; i < 4; i++) { var t = put(V, 15 + i, chunk[i] ? [chunk[i]] : []); base += t.m; fin += t.j; if (chunk[i]) V['B' + (26 + 2 * i)] = label(chunk[i]); }
      if (p === 0) [12, 13, 14].forEach(function (r) { if (fixed[r].length > 1) V['B' + r] = { 12: 'Social Security Income', 13: 'Pension', 14: 'Annuity / Defined Contribution Plan' }[r] + ' (' + fixed[r].length + ')'; });
      V.F20 = base; V.J20 = fin;
      pages.push(render('Retirement Income', V));
    }
    return pages;
  }

  function quickPage(e) {
    var S = G('S'), V = {A9: [S.b1, S.b2].filter(Boolean).join(' & '), J9: S.file || '', A12: e.name || '', J19: new Date().getFullYear() - 2, K19: new Date().getFullYear() - 1};
    V.K29 = NUM(e.curAssets); V.K30 = NUM(e.curLiab); V.K31 = NUM(e.curLiab) ? NUM(e.curAssets) / NUM(e.curLiab) : '';
    return render('Quick Ratio Test', V);
  }

  /* every page the file needs, in the workbook's order */
  function pages() {
    var S = G('S'), on = G('rptOn') || function () { return true; }, use = function (r) { return r.use !== false; }, out = [];
    (S.w2 || []).forEach(function (j, i) { if (use(j) && on('w2:' + j.id)) out.push(wagePage(j, i)); });
    var ca = G('combineActive');
    if (S.combine && S.combine.method === 'union' && (typeof ca !== 'function' || ca())) out.push(unionPage());
    (S.schc || []).forEach(function (b) { if (use(b) && on('schc:' + b.id)) out.push(sePage('schc', b)); });
    (S.corp || []).forEach(function (e) { if (use(e) && on('corp:' + e.id)) out.push(sePage('corp', e)); });
    var oth = (S.other || []).filter(function (o) { return use(o) && on('other:' + o.id); }), calcO = G('calcOther');
    var f99 = oth.filter(function (o) { return o.type === '1099' && calcO(o).f1099; });
    f99.forEach(function (o) { out.push(f1099Page(o)); });
    var ret = oth.filter(function (o) { return f99.indexOf(o) < 0; });
    if (ret.length) out = out.concat(retirementPages(ret));
    out = out.concat(rentalPages());
    (S.corp || []).forEach(function (e) { if (use(e) && on('corp:' + e.id) && (NUM(e.curAssets) || NUM(e.curLiab))) out.push(quickPage(e)); });
    return out.map(function (h) { return BASE_CSS + '<div class="nmb-page" style="padding:6px 0">' + h + '</div>'; });
  }
  window.NMBReport = {pages: pages, render: render};
})();
