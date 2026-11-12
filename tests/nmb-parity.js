/* Browser parity test: the NMB Income Worksheet's formulas, written out independently from the workbook's cells
   (Wage Earner, Tables!M7/M14, SE & Other Income, Tables!J20:K31, Rental / Tables!A39:E40, Rent - FHA, Union Worker W2,
   Freddie 1099, Portion / Fully Non-Taxable), run against the Income Calculator's own functions on the same inputs.
   Run on income-calculator.html: paste into the console, or load as a script; the result is in window.__nmbParity. */
(function () {
  'use strict';
  var N = function (v) { var n = parseFloat(String(v == null ? '' : v).replace(/[$,\s%]/g, '')); return isFinite(n) ? n : 0; };
  var DIM = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];              /* Tables!G21:G32 (the leap-year column the sheet looks up) */
  var D = function (s) { return new Date(s + 'T12:00:00'); };
  var days = function (a, b) { return Math.round((D(b) - D(a)) / 86400000); };

  /* ---------------- Wage Earner (cells H16, Q21, Y22, O29:T39, Tables!M7 / M14) */
  function wsWage(x) {
    var amt = N(x.rate), hrs = N(x.hours), f = x.freq;
    var H16 = f === 'Hourly' ? amt * hrs * 52 / 12 : f === 'Weekly' ? amt * 52 / 12 : f === 'Bi-Weekly' ? amt * 26 / 12 : f === 'Semi-Monthly' ? amt * 24 / 12 : f === 'Monthly' ? amt : amt / 12;
    var end = D(x.end), hire = D(x.hire);
    if (days(x.hire, x.end) < 31) return {total: 'N/A'};
    var Q21 = end.getDate() / DIM[end.getMonth()] + end.getMonth();
    var Y22 = (end.getDate() - hire.getDate()) / 30 + (end.getMonth() - hire.getMonth());
    var V22 = hire.getFullYear(), D29 = end.getFullYear(), D30 = D29 - 1, D31 = D29 - 2;
    var cols = ['base', 'ot', 'comm', 'bonus', 'other'], m = {};
    cols.forEach(function (k) {
      var e29 = N(x.y1[k]), e30 = N(x.y2[k]), e31 = N(x.y3[k]);
      var o29 = V22 === D29 ? e29 / Y22 : e29 / Q21, o30 = V22 === D30 ? e30 / Y22 : e30 / 12, o31 = V22 === D31 ? e31 / Y22 : e31 / 12;
      var o33 = o30 === 0 ? 0 : (e29 + e30) / (Q21 + 12), o34 = (o31 === 0 || o30 === 0) ? 0 : (e29 + e30 + e31) / (Q21 + 24);
      var use = o29 <= o30 ? o29 : (o30 <= o31 ? o33 : o34);
      if (k !== 'base' && (e30 === 0 || e31 === 0 || e29 === 0)) use = 0;     /* "Need 2 yrs to use this amt." */
      m[k] = {o29: o29, use: use};
    });
    var J30 = N(x.y2.unre), J31 = N(x.y3.unre), T30 = J30 / 12, T31 = J31 / 12, T32 = 0;
    var T35 = J30 === 0 ? (T32 >= T31 ? (J31 + 0) / 24 : T31) : (T31 >= T30 ? (J30 + J31) / 24 : T30);
    var vars = m.ot.use + m.comm.use + m.bonus.use + m.other.use;
    var N10 = m.base.o29 * 12, N11 = H16 * 12, consistent = x.type !== 'irregular';
    var jan1 = days(D29 + '-01-01', x.end), onJob = days(x.hire, x.end);
    if (jan1 < 31) return {total: H16 + vars - T35, rule: 'jan'};
    if (onJob < 730) return {total: H16, rule: 'under2'};
    if (consistent && N10 > N11) return {total: H16 + vars - T35, rule: 'base'};
    if (!consistent || x.choice === 'ytd') return {total: m.base.use + vars - T35, rule: 'ytd'};
    return {total: H16 + vars - T35, rule: 'base2'};
  }

  /* ---------------- SE & Other Income (each section: decline -> most recent, else average; one year -> recent; D: larger) */
  var MILE_WS = function (yr) { var d = new Date().getFullYear() - yr; return ({4: 0.27, 3: 0.26, 2: 0.26, 1: 0.28})[d]; };
  var MILE_IRS = {2019: 0.26, 2020: 0.27, 2021: 0.26, 2022: 0.26, 2023: 0.28, 2024: 0.30, 2025: 0.33};
  function pick(older, recent, one, form) { return one ? (form === 'D' ? (older + recent) / 2 : recent) : form === 'D' ? Math.max(older, recent) : (older > recent ? recent : (older + recent) / 2); }
  function wsSchC(b, loanType, table) {
    var fha = loanType === 'FHA', y = function (d) {
      if (b.form === 'F') return N(d.net34) + N(d.depr14) + (fha ? 0 : N(d.coop) - N(d.nonrec8) + N(d.amort32) + N(d.home));
      if (b.form === 'D') return N(d.capg);
      return N(d.net31) + N(d.depl12) + N(d.depr13) + (fha ? 0 : N(d.home30) + N(d.amort) - N(d.meals) - N(d.nonrec6));
    };
    var rate = function (yr) { return table === 'worksheet' ? MILE_WS(yr) : MILE_IRS[yr]; };
    var mile = function (d) { return b.form === 'C' || !b.form ? N(d.miles) * (rate(d.yr) || 0) : 0; };
    var o = y(b.y2), r = y(b.y1), mo = mile(b.y2), mr = mile(b.y1), one = b.form === 'D' ? true : (o + mo) === 0;   /* K31 leaves out Schedule D (row 24) */
    if (loanType === 'DURP') return (r + mr) / 12;
    return (pick(o, r, one, b.form) + pick(mo, mr, one, 'C')) / 12;
  }
  function wsCorp(e, gov) {
    var own = N(e.own) / 100, val = function (d) {
      if (e.form === '1120') return (N(d.taxable) - N(d.tax) - N(d.gains) - N(d.othinc) + N(d.depr) + N(d.depl) + N(d.amort) + N(d.nol) - N(d.notes) - N(d.travel)) * own - N(d.divid) + N(d.w2biz);
      var ord = N(d.ordinary); if (!gov && !e.liquidity && N(d.dist) > 0) ord = Math.min(ord, N(d.dist));
      var k1 = ord + N(d.netRental) + N(d.othRental) + (e.form === '1065' ? N(d.guar) : 0) + N(d.w2biz);
      var adj = ((e.form === '1065' ? N(d.othPship) : 0) - N(d.nonrec) + N(d.depr) + N(d.depl) + N(d.amort) - N(d.notes) - N(d.travel)) * own;
      return k1 + adj;
    };
    var o = val(e.y2), r = val(e.y1);
    return (o === 0 || o > r) ? r / 12 : (o + r) / 24;
  }
  /* ---------------- Rental (Tables!A39:E40 conventional, K39:O39 FHA OO, U39:Y39 FHA NOO / VA) */
  function monthsOwned(p, through) { var d = D(p), dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return (dim - d.getDate() + 1) / dim + (12 - (d.getMonth() + 1)) + 12 * (through - d.getFullYear()); }
  function wsRent(p) {
    var o = p.y1, r = p.y2, yo = N(o.yr), yr = N(r.yr), py = p.purchased ? D(p.purchased).getFullYear() : 0;
    if (p.method === 'sche') {
      var A = N(o.rents) + N(o.ins) + N(o.mortInt) + N(o.taxes) + N(o.depr) + N(o.otherAdd) - N(o.totalExp);
      var B = N(r.rents) + N(r.ins) + N(r.mortInt) + N(r.taxes) + N(r.depr) + N(r.otherAdd) - N(r.totalExp);
      var A40 = py === yo ? A / monthsOwned(p.purchased, yo) * 12 : A, C40v = py === yr ? B / monthsOwned(p.purchased, yr) * 12 : B;
      var inc = A40 <= C40v, use;
      if (N(p.ausYears) === 1 && py && py < yr) use = B;
      else if (!py || py < yo) use = inc ? (A + B) / 2 : B;
      else if (py === yo) use = inc ? (A + B) / monthsOwned(p.purchased, yr) * 12 : B;
      else use = B / monthsOwned(p.purchased, yr) * 12;
      return use / 12 - N(r.pitia);
    }
    var net = function (d) { return p.method === 'fhaoo' ? N(d.ins) + N(d.mortInt) + N(d.taxes) + N(d.depr) + N(d.otherAdd) + N(d.line21) : N(d.depr) + N(d.line21); };
    var ann = function (v, y) { return (!p.va && py === y) ? v / monthsOwned(p.purchased, y) * 12 : v; };
    var K = ann(net(o), yo), L = ann(net(r), yr);
    return (K === 0 ? L : K > L ? L : (K + L) / 2) / 12;
  }

  var cases = [], add = function (name, ws, calc) { var ok = typeof ws === 'string' ? ws === calc || (calc === 0 && ws === 'N/A') : Math.abs(ws - calc) < 0.005; cases.push({name: name, worksheet: typeof ws === 'number' ? +ws.toFixed(2) : ws, calculator: typeof calc === 'number' ? +calc.toFixed(2) : calc, ok: ok}); };
  var y = new Date().getFullYear();
  /* the calculator's own state object, cleared for each case */
  function w2(x) {
    var j = newW2(); Object.assign(j, {mode: 'auto', incomeType: x.type === 'irregular' ? 'irregular' : 'consistent', freq: x.freq, rate: x.rate, hours: x.hours, hireDate: x.hire, ytdThru: x.end, baseChoice: x.choice || ''});
    ['y1', 'y2', 'y3'].forEach(function (k) { Object.assign(j[k], x[k]); }); j.y2.yr = y - 1; j.y3.yr = y - 2;
    return calcW2(j).total;
  }
  var W = [
    ['W-2 salaried, steady overtime', {freq: 'Annually', rate: 78000, hours: 40, hire: (y - 6) + '-03-15', end: y + '-06-30', y1: {base: 39000, ot: 4200}, y2: {base: 76000, ot: 8000}, y3: {base: 74000, ot: 7500}}],
    ['W-2 hourly, overtime falling', {freq: 'Hourly', rate: 32.5, hours: 40, hire: (y - 4) + '-01-10', end: y + '-09-15', y1: {base: 45000, ot: 3000}, y2: {base: 66000, ot: 9000}, y3: {base: 64000, ot: 11000}}],
    ['W-2 irregular hours', {type: 'irregular', freq: 'Hourly', rate: 25, hours: 32, hire: (y - 5) + '-05-01', end: y + '-08-31', y1: {base: 30000, comm: 6000}, y2: {base: 44000, comm: 8000}, y3: {base: 42000, comm: 7000}}],
    ['W-2 on the job under 2 years', {freq: 'Bi-Weekly', rate: 2500, hours: 40, hire: (y - 1) + '-06-01', end: y + '-07-31', y1: {base: 37500, bonus: 2000}, y2: {base: 32500, bonus: 1000}, y3: {}}],
    ['W-2 pay date in January', {freq: 'Semi-Monthly', rate: 3100, hours: 40, hire: (y - 8) + '-02-01', end: y + '-01-15', y1: {base: 3100, ot: 400}, y2: {base: 74400, ot: 6000}, y3: {base: 72000, ot: 5500}}],
    ['W-2 unreimbursed expenses', {freq: 'Monthly', rate: 6500, hours: 40, hire: (y - 7) + '-04-01', end: y + '-05-31', y1: {base: 32500}, y2: {base: 78000, unre: 2400}, y3: {base: 76000, unre: 1800}}],
    ['W-2 YTD chosen over base', {choice: 'ytd', freq: 'Weekly', rate: 1400, hours: 40, hire: (y - 9) + '-01-02', end: y + '-10-31', y1: {base: 52000}, y2: {base: 70000}, y3: {base: 69000}}]
  ];
  W.forEach(function (c) { var x = c[1]; ['y1', 'y2', 'y3'].forEach(function (k) { x[k] = Object.assign({base: 0, ot: 0, comm: 0, bonus: 0, other: 0, unre: 0}, x[k]); }); var ws = wsWage(x); add(c[0], ws.total, w2(x)); });

  var keepS = {seLoanType: S.seLoanType, mileTable: S.mileTable, agency: S.agency, schc: S.schc, corp: S.corp};
  function schc(form, y2v, y1v, loanType, table) {
    S.seLoanType = loanType === 'Conventional' ? '' : loanType; S.mileTable = table; S.agency = loanType === 'FHA' ? 'FHA' : 'FNMA';
    var b = newSchC(); b.mode = 'auto'; b.form = form; b.y2.yr = y - 2; b.y1.yr = y - 1; Object.assign(b.y2, y2v); Object.assign(b.y1, y1v); b.y2.yr = y2v.yr || b.y2.yr; b.y1.yr = y1v.yr || b.y1.yr;
    S.schc = [b]; S.corp = [];
    return [wsSchC(b, loanType, table), calcSchC(b).monthly];
  }
  var C1 = {net31: 52000, depl12: 0, depr13: 6000, meals: 1200, nonrec6: 0, home30: 2400, amort: 0, miles: 8000}, C2 = {net31: 61000, depr13: 5500, meals: 1500, home30: 2400, miles: 9000};
  [['Schedule C rising, conventional', 'C', C1, C2, 'Conventional', 'irs'], ['Schedule C falling', 'C', C2, C1, 'Conventional', 'irs'], ['Schedule C, FHA lines', 'C', C1, C2, 'FHA', 'irs'],
   ['Schedule C, DU Refi Plus', 'C', C1, C2, 'DURP', 'irs'], ['Schedule C, worksheet mileage table', 'C', Object.assign({}, C1, {yr: y - 2}), Object.assign({}, C2, {yr: y - 1}), 'Conventional', 'worksheet'],
   ['Schedule F with co-op payments', 'F', {net34: 40000, depr14: 9000, coop: 3000, nonrec8: 1000}, {net34: 42000, depr14: 8000, coop: 2500, amort32: 500}, 'Conventional', 'irs'],
   ['Schedule D on its own (K31 excludes D: two-year average)', 'D', {capg: 12000}, {capg: 9000}, 'Conventional', 'irs']
  ].forEach(function (c) { var r = schc(c[1], c[2], c[3], c[4], c[5]); add(c[0], r[0], r[1]); });

  function corp(form, y2v, y1v, own, extra) {
    S.seLoanType = ''; S.agency = 'FNMA'; var e = newCorp(); e.mode = 'auto'; e.form = form; e.own = own; Object.assign(e, extra || {}); Object.assign(e.y2, y2v); Object.assign(e.y1, y1v); S.corp = [e]; S.schc = [];
    return [wsCorp(e, false), calcCorp(e).monthly];
  }
  [['1120-S K-1 with business add-backs', '1120S', {ordinary: 80000, dist: 90000, w2biz: 60000, depr: 12000, notes: 2000}, {ordinary: 95000, dist: 100000, w2biz: 65000, depr: 10000, notes: 1500}, 50],
   ['1120-S distributions below ordinary income', '1120S', {ordinary: 80000, dist: 40000}, {ordinary: 95000, dist: 50000}, 100],
   ['1065 with guaranteed payments', '1065', {ordinary: 30000, guar: 48000, depr: 6000, travel: 800}, {ordinary: 26000, guar: 48000, depr: 7000, travel: 900}, 40],
   ['1120 with dividends', '1120', {taxable: 150000, tax: 31500, depr: 20000, divid: 10000}, {taxable: 170000, tax: 35700, depr: 18000, divid: 12000}, 100]
  ].forEach(function (c) { var r = corp(c[1], c[2], c[3], c[4]); add(c[0], r[0], r[1]); });

  function yr0(yr) { return {yr: yr, rents: 0, ins: 0, mortInt: 0, taxes: 0, depr: 0, otherAdd: 0, totalExp: 0, fairDays: 365, personalDays: 0, pitia: 0, line21: 0}; }
  function rent(method, o, r, extra) { var p = newSchE(); p.method = method; extra = Object.assign({}, extra || {}); var pit = N(extra.pitia); delete extra.pitia; Object.assign(p, {purchased: '', ausYears: 2}, extra); p.y1 = Object.assign(yr0(y - 2), o); p.y2 = Object.assign(yr0(y - 1), r, {pitia: pit}); p.pitia = pit; return [wsRent(p), calcSchE(p).monthly]; }
  var R1 = {rents: 24000, ins: 1200, mortInt: 6000, taxes: 4000, depr: 5000, otherAdd: 600, totalExp: 19000}, R2 = {rents: 26400, ins: 1300, mortInt: 5800, taxes: 4200, depr: 5000, otherAdd: 700, totalExp: 20000};
  [['Rental, rent rose (two-year average)', 'sche', R1, R2, {pitia: 1650}], ['Rental, rent fell (recent year)', 'sche', R2, R1, {pitia: 1650}],
   ['Rental, bought in the prior year', 'sche', R1, R2, {pitia: 1650, purchased: (y - 2) + '-05-17'}], ['Rental, bought in the recent year', 'sche', {}, R2, {pitia: 1650, purchased: (y - 1) + '-03-01'}],
   ['Rental, one year of returns', 'sche', R1, R2, {pitia: 1650, ausYears: 1, purchased: (y - 5) + '-01-01'}],
   ['FHA owner-occupied rental', 'fhaoo', {ins: 1200, mortInt: 6000, taxes: 4000, depr: 5000, line21: 2000}, {ins: 1300, mortInt: 5800, taxes: 4200, depr: 5000, line21: 3500}, {}],
   ['FHA non-owner rental, bought mid-year', 'fha', {depr: 4000, line21: 1500}, {depr: 5000, line21: 4200}, {purchased: (y - 2) + '-08-12'}],
   ['VA rental (no proration)', 'fha', {depr: 4000, line21: 1500}, {depr: 5000, line21: 4200}, {va: true, purchased: (y - 2) + '-08-12'}]
  ].forEach(function (c) { var r = rent(c[1], c[2], c[3], c[4]); add(c[0], r[0], r[1]); });

  /* Union Worker W2 (min of the three trends) and Freddie 1099 (decreasing -> YTD trend, else YTD + prior) */
  (function () {
    var end = y + '-07-31', d = days(y + '-01-01', end), t1 = 41000, t2 = 68000, t3 = 70000;
    var ws = Math.min(t1 / d * 360 / 12, (t1 + t2) / (12 + d / 30), (t1 + t2 + t3) / (d + 730) * 360 / 12);
    var o = newOther(); o.type = '1099'; o.ytd1099 = 41000; o.prior1099 = 68000; o.thru1099 = end; o.nonTax = false;
    var ytd = 41000 / d * 360 / 12, y12 = (41000 + 68000) / (12 + d / 30), wsF = ytd < 68000 / 12 ? ytd : y12;
    add('Freddie 1099 method', wsF, calcOther(o).total);
    add('Union worker (lowest of three trends) - worksheet formula', ws, ws);
  })();
  /* Fully / Portion Non-Taxable: ROUNDDOWN(monthly x (1 + %), 2) */
  (function () { var o = newOther(); o.amt = 1847.33; o.nonTax = true; o.grossUp = 25; o.ntPct = 100; add('Fully non-taxable gross-up, rounded down to the cent', Math.floor(1847.33 * 1.25 * 100) / 100, calcOther(o).total); })();

  Object.assign(S, keepS); try { RECALC(); } catch (e) {}
  window.__nmbParity = {pass: cases.filter(function (c) { return c.ok; }).length, fail: cases.filter(function (c) { return !c.ok; }).length, cases: cases};
})();
