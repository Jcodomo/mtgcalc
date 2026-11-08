/* Mortgage Suite 55.22 - Income Calculator extras, in the calculator's own card style.
   - Non-QM tab: 12 / 24-month bank statement income, DSCR (amortizing or interest-only, short-term-rental haircut) and the
     DSCR prepayment penalty schedules - the Comprehensive Agency Income Calculator's tabs 8 and 9.
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
  function state() {
    var S = G('S'); if (!S) return null;
    if (!S.nonqm) S.nonqm = {
      bank: {use: false, b: 1, months: 12, method: 'fixed', expense: 50, own: 100, deposits: blankDeposits()},
      dscr: {use: false, b: 1, loan: 0, rate: 0, term: 360, io: false, rent: 0, haircut: 0, taxes: 0, ins: 0, hoa: 0},
      prepay: {type: 'step54321', years: 5, flat: 3, free: 20, payoff: 0}
    };
    var q = S.nonqm; if (!q.bank.deposits || q.bank.deposits.length < 24) q.bank.deposits = blankDeposits();
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
  NQM.total = function () { var b = NQM.bank(), d = NQM.dscr(); return {bank: b ? b.used : 0, dscr: d ? d.used : 0}; };
  NQM.set = function (sec, key, val, num) {
    var q = state(); if (!q) return; q[sec][key] = num ? N(val) : val;
    window.RECALC && window.RECALC(); if (sec !== 'bank' || key !== 'use') paint(); else NQM.render();
  };
  NQM.dep = function (i, key, val) { var q = state(); if (!q) return; q.bank.deposits[i][key] = N(val); window.RECALC && window.RECALC(); paint(); };

  /* ------------------------------------------------------------------- render */
  function f(label, sec, key, val, opt) {
    opt = opt || {};
    if (opt.options) return '<div class="field"><label>' + label + '</label><select class="cell-input" onchange="NQM.set(\'' + sec + '\',\'' + key + '\',' + (opt.bool ? 'this.value===\'1\'' : opt.num ? 'this.value,1' : 'this.value') + ')">' +
      opt.options.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + (opt.hint ? '<div class="fhint">' + opt.hint + '</div>' : '') + '</div>';
    return '<div class="field"><label>' + label + '</label><input class="cell-input" type="text" inputmode="decimal" data-num="1" value="' + N(val) + '" oninput="NQM.set(\'' + sec + '\',\'' + key + '\',this.value,1)">' + (opt.hint ? '<div class="fhint">' + opt.hint + '</div>' : '') + '</div>';
  }
  function box(label, id, final) { return '<div class="calcbox' + (final ? ' final' : '') + '"><div class="muted small">' + label + '</div><div id="' + id + '" style="font-size:19px;font-weight:800;font-family:var(--font-num)">—</div></div>'; }
  function useSw(sec, on, text) { return '<label class="sw" style="gap:7px"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="NQM.set(\'' + sec + '\',\'use\',this.checked)"><span class="muted small">' + text + '</span></label>'; }
  NQM.render = function () {
    var body = $('nqmBody'), q = state(); if (!body || !q) return;
    var B = q.bank, D = q.dscr, P = q.prepay, m = N(B.months) === 24 ? 24 : 12, bor = [[1, 'B1 — Borrower 1'], [2, 'B2 — Borrower 2']];
    var ledger = function (from, to) { var h = ''; for (var i = from; i < to; i++) { var d = B.deposits[i];
      h += '<tr><td class="rowlabel">Month ' + (i + 1) + '</td><td><input class="cell-input" type="text" inputmode="decimal" data-num="1" value="' + N(d.gross) + '" oninput="NQM.dep(' + i + ',\'gross\',this.value)"></td>' +
           '<td><input class="cell-input" type="text" inputmode="decimal" data-num="1" value="' + N(d.inel) + '" oninput="NQM.dep(' + i + ',\'inel\',this.value)"></td><td class="num" id="nqmNet' + i + '">—</td></tr>'; } return h; };
    body.innerHTML =
      '<div class="card"><div class="card-top"><span class="tag">Bank statements</span><span class="doc-name">12 / 24-month bank statement income</span><div class="spacer"></div>' + useSw('bank', B.use, 'Use in qualifying income') + '</div><div class="card-body">' +
      '<div class="grid g4">' + f('Statement term', 'bank', 'months', m, {options: [[12, '12 months'], [24, '24 months']], num: 1}) +
      f('Account type and expense method', 'bank', 'method', B.method, {options: Object.keys(NQM.METHODS).map(function (k) { return [k, NQM.METHODS[k]]; })}) +
      (B.method === 'personal' ? '' : f('Expense ratio (% of deposits)', 'bank', 'expense', B.expense, {hint: B.method === 'fixed' ? 'Program fixed factor - commonly 50%' : 'From the CPA / EA letter or P&L'})) +
      f('Ownership (%)', 'bank', 'own', B.own) + f('Borrower', 'bank', 'b', B.b, {options: bor, num: 1}) + '</div>' +
      '<div class="' + (m === 24 ? 'grid g2' : '') + '" style="margin-top:12px;align-items:start"><div class="tbl-scroll"><table class="matrix" style="width:100%"><thead><tr><th>Month</th><th>Gross deposits</th><th>Less: transfers / ineligible</th><th class="num">Net eligible</th></tr></thead><tbody>' + ledger(0, 12) + '</tbody></table></div>' +
      (m === 24 ? '<div class="tbl-scroll"><table class="matrix" style="width:100%"><thead><tr><th>Month</th><th>Gross deposits</th><th>Less: transfers / ineligible</th><th class="num">Net eligible</th></tr></thead><tbody>' + ledger(12, 24) + '</tbody></table></div>' : '') + '</div>' + (m === 24 ? '' : '<div class="muted small" style="margin-top:6px">Choose 24 months to add months 13-24.</div>') +
      '<div class="grid g4" style="margin-top:12px">' + box('Net eligible deposits', 'nqmTot') + box('Average per month', 'nqmAvg') + box('Less: expense factor', 'nqmExp') + box('Qualifying monthly income', 'nqmInc', 1) + '</div>' +
      '<div class="notice info" style="margin-top:10px"><span>Net eligible deposits / statement months, less the expense factor, times ownership. Exclude transfers between accounts, loan proceeds, refunds and other non-business deposits; large deposits need a source.</span></div></div></div>' +

      '<div class="card"><div class="card-top"><span class="tag">DSCR</span><span class="doc-name">Investor DSCR - the property qualifies on its own rent</span><div class="spacer"></div>' + useSw('dscr', D.use, 'Add the net cash flow to qualifying income') + '</div><div class="card-body">' +
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
      '<div class="muted small" id="nqmSubject" style="margin-top:8px"></div></div></div>';
    paint();
  };
  function setT(id, v) { var e = $(id); if (e && e.textContent !== v) e.textContent = v; }
  function paint() {
    if (!$('nqmBody')) return;
    var b = NQM.bank(), d = NQM.dscr(), p = NQM.prepay(); if (!b) return;
    b.rows.forEach(function (r, i) { setT('nqmNet' + i, usd(r.net)); });
    setT('nqmTot', usd(b.total)); setT('nqmAvg', usd(b.avg)); setT('nqmExp', '−' + usd(b.expense)); setT('nqmInc', usd(b.monthly));
    setT('nqmPI', usd(d.pi)); setT('nqmIO', usd(d.io)); setT('nqmPITIA', usd(d.pitia)); setT('nqmRatio', d.pitia ? d.ratio.toFixed(2) + 'x' : '—');
    var t = $('nqmTier'); if (t) { t.className = 'note ' + (!d.pitia ? '' : d.ratio >= 1 ? 'ok' : 'bad'); t.textContent = d.pitia ? d.tier + '. Net monthly cash flow ' + usd(d.net) + ' (rent ' + usd(d.rent) + ' less PITIA ' + usd(d.pitia) + ').' : 'Enter the loan, rate and rent to calculate the DSCR.'; }
    var tb = $('nqmPrepay'); if (tb) tb.innerHTML = p.rows.map(function (r) { return '<tr><td class="rowlabel">Year ' + r.year + '</td><td class="num">' + usd(r.s5) + '</td><td class="num">' + usd(r.s3) + '</td><td class="num">' + usd(r.flat) + '</td><td class="num">' + usd(r.sixmo) + '</td><td class="num"><b>' + usd(r.used) + '</b></td><td class="num">' + (100 * r.pct).toFixed(2) + '%</td></tr>'; }).join('');
    setT('nqmSubject', 'Balance subject to the penalty: ' + usd(p.subject) + ' (payoff balance less the penalty-free allowance on the original loan). The six-months-interest column is interest on the payoff less the allowance.');
    var c = $('cnt-nqm'); if (c) c.textContent = String((state().bank.use ? 1 : 0) + (state().dscr.use ? 1 : 0));
  }

  /* -------------------------------------------------- the tab, totals, hooks */
  function buildTab() {
    if ($('panel-nqm')) return true;
    var bar = $('tabbar'), wrap = document.querySelector('main .wrap'); if (!bar || !wrap) return false;
    var after = bar.querySelector('[data-tab="assets"]'), btn = document.createElement('button');
    btn.className = 'tab'; btn.setAttribute('data-tab', 'nqm'); btn.setAttribute('onclick', "switchTab('nqm')"); btn.title = 'Non-QM: bank statement income, DSCR and prepayment penalty';
    btn.innerHTML = '<svg class="icon"><use href="#i-coins"/></svg><span>Non-QM</span><span class="cnt" id="cnt-nqm">0</span>';
    after && after.nextSibling ? bar.insertBefore(btn, after.nextSibling) : bar.appendChild(btn);
    var sec = document.createElement('section'); sec.className = 'panel'; sec.id = 'panel-nqm';
    sec.innerHTML = '<div class="section-head"><div><h2><svg class="icon icon-lg"><use href="#i-coins"/></svg>Non-QM Income</h2><p>Bank statement income, DSCR property cash flow and the DSCR prepayment penalty. Each counts toward qualifying income only when Use is ticked.</p></div></div><div id="nqmBody"></div>';
    var sum = $('panel-summary'); sum && sum.parentNode ? sum.parentNode.insertBefore(sec, sum) : wrap.appendChild(sec);
    return true;
  }
  function wrapTotals() {
    if (typeof window.calcTotals !== 'function' || window.calcTotals.__nqm) return !!(window.calcTotals && window.calcTotals.__nqm);
    var base = window.calcTotals, w = function () {
      var t = base.apply(this, arguments), q = state(); if (!q) return t;
      var b = NQM.bank(), d = NQM.dscr(), add = 0;
      if (b && b.used) { add += b.used; if ((q.bank.b || 1) === 2) t.b2 += b.used; else t.b1 += b.used; }
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
        Array.prototype.forEach.call(document.querySelectorAll('.panel'), function (p) { p.classList.toggle('active', p.id === 'panel-nqm'); });
        Array.prototype.forEach.call(document.querySelectorAll('#tabbar .tab'), function (b) { b.classList.toggle('active', b.dataset.tab === 'nqm'); });
        NQM.render(); return;
      }
      var r = base.apply(this, arguments); var p = $('panel-nqm'); if (p) p.classList.remove('active');
      if (t === 'aus') guides(); if (t === 'sche') personalUse();
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
    ['Non-QM: bank statements and DSCR', 'Bank statement programs: net eligible deposits over 12 or 24 months, less a fixed or CPA expense factor, times ownership; transfers and non-business deposits are excluded. DSCR: rent (lower of lease or Form 1007, with a haircut for short-term rentals) divided by PITIA or ITIA; 1.00x is standard, 1.20x and above prices best. Prepayment penalties run 1-5 years as a step-down, a flat percentage or six months of interest, usually with 20% a year penalty-free.', 'Investor guidelines - confirm against the program used']
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
    if (ok && state()) { guides(); window.RECALC && window.RECALC(); clearInterval(t); }
    else if (++tries > 200) clearInterval(t);
  }, 60);
})();
