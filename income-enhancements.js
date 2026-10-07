/* Release 55.4 — Schedule E two-year view, quick W-2 bridge, and OCR compatibility.
   This file is intentionally additive: the existing income engine remains the source
   of truth for totals, agency rules, documents, and the live mortgage bridge. */
(function () {
  'use strict';

  const yearNow = new Date().getFullYear();
  const rentalKeys = ['rents', 'ins', 'mortInt', 'taxes', 'depr', 'otherAdd', 'totalExp', 'fairDays', 'personalDays', 'pitia'];
  const n = (v) => {
    const x = Number(String(v == null ? '' : v).replace(/[$,%\s,]/g, ''));
    return Number.isFinite(x) ? x : 0;
  };
  const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
  const moneyLocal = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(v) || 0);
  const escLocal = (v) => typeof esc === 'function' ? esc(v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const byId = (id) => document.getElementById(id);

  function blankYear(year) {
    return { yr: year, rents: 0, ins: 0, mortInt: 0, taxes: 0, depr: 0, otherAdd: 0, totalExp: 0, fairDays: 365, personalDays: 0, pitia: 0 };
  }

  function ensureRental(p) {
    if (!p || typeof p !== 'object') return p;
    if (!p.y1 || typeof p.y1 !== 'object') p.y1 = blankYear(yearNow - 1);
    if (!p.y2 || typeof p.y2 !== 'object') p.y2 = blankYear(yearNow);
    if (!n(p.y1.yr)) p.y1.yr = yearNow - 1;
    if (!n(p.y2.yr)) p.y2.yr = yearNow;
    rentalKeys.forEach(k => {
      if (p.y1[k] == null) p.y1[k] = k === 'fairDays' ? 365 : 0;
      if (p.y2[k] == null) p.y2[k] = k === 'fairDays' ? 365 : 0;
    });
    /* Older files stored one flat tax-return year. Keep it, but seed the current
       column so existing borrowers do not see their values disappear. */
    if (!p.__twoYearRental) {
      const hasYearData = rentalKeys.filter(k => !['fairDays', 'personalDays'].includes(k)).some(k => n(p.y1[k]) || n(p.y2[k]));
      const hasFlatData = rentalKeys.some(k => n(p[k]));
      if (!hasYearData && hasFlatData) rentalKeys.forEach(k => { if (p[k] != null) p.y2[k] = n(p[k]); });
      p.__twoYearRental = true;
    }
    p.rents = n(p.y2.rents); p.ins = n(p.y2.ins); p.mortInt = n(p.y2.mortInt);
    p.taxes = n(p.y2.taxes); p.depr = n(p.y2.depr); p.otherAdd = n(p.y2.otherAdd);
    p.totalExp = n(p.y2.totalExp); p.fairDays = n(p.y2.fairDays) || 365;
    p.personalDays = n(p.y2.personalDays); p.pitia = n(p.y2.pitia || p.pitia);
    return p;
  }

  function rentalNet(y) {
    const fair = Math.max(0, n(y.fairDays));
    const personal = Math.max(0, n(y.personalDays));
    const days = Math.max(0, Math.min(366, fair - personal));
    const rentAdjusted = n(y.rents) * (days / 365);
    return {
      days,
      rentAdjusted,
      annual: rentAdjusted + n(y.ins) + n(y.mortInt) + n(y.taxes) + n(y.depr) + n(y.otherAdd) - n(y.totalExp),
    };
  }

  function calcTwoYearRental(p) {
    ensureRental(p);
    if (p.method === 'lease' && typeof window.__mtgcalcLegacyCalcSchE === 'function') return window.__mtgcalcLegacyCalcSchE(p);
    const prior = rentalNet(p.y1), current = rentalNet(p.y2);
    const priorEntered = rentalKeys.some(k => n(p.y1[k]) && k !== 'fairDays');
    const currentEntered = rentalKeys.some(k => n(p.y2[k]) && k !== 'fairDays');
    const years = [priorEntered ? prior.annual : null, currentEntered ? current.annual : null].filter(v => v !== null);
    const grossYears = [priorEntered ? prior.rentAdjusted : null, currentEntered ? current.rentAdjusted : null].filter(v => v !== null);
    const netAnnual = years.length ? years.reduce((a, b) => a + b, 0) / years.length : 0;
    const grossAnnual = grossYears.length ? grossYears.reduce((a, b) => a + b, 0) / grossYears.length : 0;
    const months = Math.max(0.25, Math.min(12, (n(p.y1.fairDays) + n(p.y2.fairDays)) / (years.length ? years.length : 1) / 365 * 12));
    const pitia = n(p.pitia || p.y2.pitia);
    const monthly = netAnnual / 12 - pitia;
    return {
      net: netAnnual,
      gross: grossAnnual / 12,
      monthly,
      pitia,
      mos: months,
      prior,
      current,
      yearsUsed: years.length,
      basis: `${years.length === 2 ? '2-year average' : years.length === 1 ? '1-year average' : 'No rental year entered'} · gross rent prorated by fair rental days · PITIA ${moneyLocal(pitia)}`,
    };
  }

  /* Keep the original calculation available for lease-method records. */
  if (typeof calcSchE === 'function' && !window.__mtgcalcLegacyCalcSchE) window.__mtgcalcLegacyCalcSchE = calcSchE;
  if (typeof newSchE === 'function') {
    const legacyNew = newSchE;
    window.newSchE = function () {
      const p = legacyNew();
      p.y1 = blankYear(yearNow - 1); p.y2 = blankYear(yearNow); p.__twoYearRental = true;
      return p;
    };
    newSchE = window.newSchE;
  }
  if (typeof calcSchE === 'function') {
    window.calcSchE = calcTwoYearRental;
    calcSchE = window.calcSchE;
  }

  function setRental(id, year, field, value, numeric) {
    const p = (S.sche || []).find(x => x.id === id);
    if (!p) return;
    ensureRental(p);
    const target = year === 'y1' || year === 'y2' ? p[year] : p;
    target[field] = numeric ? n(value) : value;
    ensureRental(p);
    if (typeof RECALC === 'function') RECALC();
  }
  window.setRental = setRental;

  const rows = [
    ['rents', 'Rents received', 'Schedule E line 3'],
    ['ins', 'Insurance', 'Schedule E line 9'],
    ['mortInt', 'Mortgage interest', 'Schedule E line 12'],
    ['taxes', 'Taxes', 'Schedule E line 16'],
    ['depr', 'Depreciation / depletion', 'Schedule E line 18'],
    ['otherAdd', 'Other documented repairs / HOA', 'Schedule E line 14/19'],
    ['totalExp', 'Subtotal expenses', 'Schedule E line 20'],
  ];

  function yearInput(p, y, key, label) {
    return `<input class="cell-input se-year-input" aria-label="${escLocal(label)} ${y === 'y1' ? 'prior year' : 'current year'}" inputmode="decimal" type="number" step="0.01" value="${n(p[y][key])}" oninput="setRental('${p.id}','${y}','${key}',this.value,true)">`;
  }

  function renderEnhancedSchE() {
    const list = byId('scheList');
    if (!list) return;
    list.style.display = 'none';
    let host = byId('scheduleEEnhanced');
    if (!host) { host = document.createElement('div'); host.id = 'scheduleEEnhanced'; list.insertAdjacentElement('afterend', host); }
    host.innerHTML = (S.sche || []).map((raw, i) => {
      const p = ensureRental(raw), r = calcTwoYearRental(p), y1 = p.y1, y2 = p.y2;
      return `<article class="se-worksheet card ${p.use === false ? 'excluded' : ''}">
        <div class="card-top se-title"><span class="tag green">Property ${i + 1}</span>
          <input class="name-input se-address" placeholder="Property address" aria-label="Property ${i + 1} address" value="${escLocal(p.addr || '')}" oninput="setRental('${p.id}','flat','addr',this.value,false)">
          <span class="spacer"></span><button class="btn-icon no-print" title="Remove rental property" onclick="del('sche','${p.id}')"><svg class="icon"><use href="#i-trash"/></svg></button>
        </div>
        <div class="card-body">
          <div class="se-meta grid g4">
            <div class="field"><label>Tax years required by AUS</label><input class="cell-input" type="number" min="1" max="3" step="1" value="2" aria-label="Tax years required by AUS"></div>
            <div class="field"><label>Prior tax year</label><input class="cell-input" type="text" inputmode="numeric" value="${escLocal(y1.yr)}" oninput="setRental('${p.id}','y1','yr',this.value,true)"></div>
            <div class="field"><label>Current tax year</label><input class="cell-input" type="text" inputmode="numeric" value="${escLocal(y2.yr)}" oninput="setRental('${p.id}','y2','yr',this.value,true)"></div>
            <div class="field"><label>Method</label><select class="cell-input" onchange="setRental('${p.id}','flat','method',this.value,false)"><option value="sche" ${p.method === 'sche' ? 'selected' : ''}>Schedule E tax return</option><option value="lease" ${p.method === 'lease' ? 'selected' : ''}>Lease / 75% rule</option></select></div>
          </div>
          <div class="tbl-scroll se-table-wrap"><table class="matrix se-table"><thead><tr><th>Schedule E line</th><th class="num">${escLocal(y1.yr)} prior year</th><th class="num">${escLocal(y2.yr)} current year</th></tr></thead><tbody>
            ${rows.map(([key, label, hint]) => `<tr class="${key === 'totalExp' ? 'total-row' : ''}"><td class="rowlabel"><span>${label}</span><small>${hint}</small></td><td>${yearInput(p, 'y1', key, label)}</td><td>${yearInput(p, 'y2', key, label)}</td></tr>`).join('')}
            <tr class="meta-row"><td class="rowlabel"><span>Fair rental days</span><small>Schedule E line 2; controls rent proration</small></td><td>${yearInput(p, 'y1', 'fairDays', 'Fair rental days')}</td><td>${yearInput(p, 'y2', 'fairDays', 'Fair rental days')}</td></tr>
            <tr class="meta-row"><td class="rowlabel"><span>Personal-use days</span><small>Subtract from fair rental days</small></td><td>${yearInput(p, 'y1', 'personalDays', 'Personal-use days')}</td><td>${yearInput(p, 'y2', 'personalDays', 'Personal-use days')}</td></tr>
          </tbody></table></div>
          <div class="se-expenses grid g5">
            <div class="field"><label>Prior-year PITIA ($/mo)</label><input class="cell-input" type="number" step="0.01" value="${n(y1.pitia)}" oninput="setRental('${p.id}','y1','pitia',this.value,true)"></div>
            <div class="field"><label>Current PITIA ($/mo)</label><input class="cell-input" type="number" step="0.01" value="${n(y2.pitia || p.pitia)}" oninput="setRental('${p.id}','y2','pitia',this.value,true)"></div>
            <div class="field"><label>Subject property?</label><select class="cell-input" onchange="setRental('${p.id}','flat','subject',this.value === '1',false)"><option value="0" ${!p.subject ? 'selected' : ''}>No — existing rental</option><option value="1" ${p.subject ? 'selected' : ''}>Yes — subject property</option></select></div>
            <div class="field"><label>Average gross rent / mo</label><div class="calc-cell se-calc" id="se-${p.id}-gross">${moneyLocal(r.gross)}</div></div>
            <div class="field"><label>Months represented</label><div class="calc-cell se-calc" id="se-${p.id}-months">${r.mos.toFixed(2)}</div></div>
          </div>
          <div class="result-bar ${r.monthly >= 0 ? 'green' : 'amber'}" id="se-${p.id}-bar"><div><div class="big" id="se-${p.id}-grossline">Gross rental cash flow: ${moneyLocal(r.gross)} / month</div><div class="sub" id="se-${p.id}-netline">Net rental cash flow after PITIA: ${moneyLocal(r.monthly)} / month</div></div><div class="right" id="se-${p.id}-basis">${escLocal(r.basis)}</div></div>
          <div class="notice info se-help"><svg class="icon"><use href="#i-alert"/></svg><span>Average = the mean of the prior and current tax-year figures when both are entered. Gross rent is prorated by <b>fair rental days minus personal-use days</b>; PITIA is then deducted for qualifying cash flow.</span></div>
        </div></article>`;
    }).join('') || `<div class="addblock" onclick="addSchE()"><div class="t"><svg class="icon icon-lg" style="color:var(--emerald)"><use href="#i-plus"/></svg>Add Rental Property</div><div class="s">Enter prior/current Schedule E figures and fair rental days to calculate a two-year rental average.</div></div>`;
    if (typeof setT === 'function') setT('cnt-sche', (S.sche || []).length);
  }

  function paintEnhancedSchE() {
    (S.sche || []).forEach(raw => {
      const p = ensureRental(raw), r = calcTwoYearRental(p);
      const gross = byId(`se-${p.id}-gross`), months = byId(`se-${p.id}-months`), gl = byId(`se-${p.id}-grossline`), nl = byId(`se-${p.id}-netline`), basis = byId(`se-${p.id}-basis`), bar = byId(`se-${p.id}-bar`);
      if (gross && document.activeElement !== gross) gross.textContent = moneyLocal(r.gross);
      if (months) months.textContent = r.mos.toFixed(2);
      if (gl) gl.textContent = `Gross rental cash flow: ${moneyLocal(r.gross)} / month`;
      if (nl) nl.textContent = `Net rental cash flow after PITIA: ${moneyLocal(r.monthly)} / month`;
      if (basis) basis.textContent = r.basis;
      if (bar) bar.className = `result-bar ${r.monthly >= 0 ? 'green' : 'amber'}`;
    });
  }
  window.renderSchE = renderEnhancedSchE;
  renderSchE = renderEnhancedSchE;
  window.paintSchE = paintEnhancedSchE;
  paintSchE = paintEnhancedSchE;

  /* Compact quick W-2 bridge modeled on the supplied Wage Earner worksheet.
     It feeds the first active W-2 row but does not replace the full worksheet. */
  const QUICK_KEY = 'mtgcalc-quick-w2-v1';
  const defaultQuick = { borrower: '', employer: '', freq: 'Hourly', rate: '', hours: '40', ytd: '', ytdMonths: '9', prior: '', priorMonths: '12', variable: '', variableMonths: '24' };
  function loadQuick() { try { return { ...defaultQuick, ...(JSON.parse(localStorage.getItem(QUICK_KEY) || '{}')) }; } catch (_) { return { ...defaultQuick }; } }
  function saveQuick(q) { try { localStorage.setItem(QUICK_KEY, JSON.stringify(q)); } catch (_) {} }
  function quickMonthly(q) {
    const r = n(q.rate), h = n(q.hours);
    const base = q.freq === 'Hourly' ? r * h * 52 / 12 : q.freq === 'Weekly' ? r * 52 / 12 : q.freq === 'Bi-Weekly' ? r * 26 / 12 : q.freq === 'Semi-Monthly' ? r * 24 / 12 : q.freq === 'Annually' ? r / 12 : r;
    const ytd = n(q.ytd) / Math.max(1, n(q.ytdMonths));
    const prior = n(q.prior) / Math.max(1, n(q.priorMonths));
    const candidates = [base, ytd, prior].filter(v => v > 0);
    const usedBase = candidates.length ? Math.min(...candidates) : 0;
    const variable = n(q.variable) / Math.max(1, n(q.variableMonths));
    return { base, ytd, prior, usedBase, variable, total: usedBase + variable };
  }
  function ensureQuickW2() {
    const panel = byId('panel-w2'), list = byId('w2List');
    if (!panel || !list || byId('quickW2Card')) return;
    const q = loadQuick();
    const card = document.createElement('div'); card.id = 'quickW2Card'; card.className = 'card quick-w2-card';
    card.innerHTML = `<div class="card-top"><span class="tag">Quick W-2 income</span><span class="doc-name">Fast wage-earner check — full W-2 worksheet remains below</span><span class="spacer"></span><button class="btn btn-primary btn-sm" type="button" id="quickW2Push">Push to W-2 worksheet</button></div><div class="card-body"><div class="grid g4">
      <div class="field"><label>Borrower</label><input class="cell-input" data-q="borrower" value="${escLocal(q.borrower)}" placeholder="Borrower name"></div>
      <div class="field"><label>Employer / job</label><input class="cell-input" data-q="employer" value="${escLocal(q.employer)}" placeholder="Employer"></div>
      <div class="field"><label>Pay frequency</label><select class="cell-input" data-q="freq"><option>Hourly</option><option>Weekly</option><option>Bi-Weekly</option><option>Semi-Monthly</option><option>Monthly</option><option>Annually</option></select></div>
      <div class="field"><label>Rate or salary</label><input class="cell-input" data-q="rate" inputmode="decimal" value="${escLocal(q.rate)}" placeholder="0.00"></div>
      <div class="field"><label>Hours / week</label><input class="cell-input" data-q="hours" inputmode="decimal" value="${escLocal(q.hours)}" placeholder="40"></div>
      <div class="field"><label>YTD earnings</label><input class="cell-input" data-q="ytd" inputmode="decimal" value="${escLocal(q.ytd)}" placeholder="0.00"></div>
      <div class="field"><label>YTD months</label><input class="cell-input" data-q="ytdMonths" inputmode="decimal" value="${escLocal(q.ytdMonths)}" placeholder="9"></div>
      <div class="field"><label>Prior-year W-2</label><input class="cell-input" data-q="prior" inputmode="decimal" value="${escLocal(q.prior)}" placeholder="0.00"></div>
      <div class="field"><label>Prior-year months</label><input class="cell-input" data-q="priorMonths" inputmode="decimal" value="${escLocal(q.priorMonths)}" placeholder="12"></div>
      <div class="field"><label>Variable pay / OT</label><input class="cell-input" data-q="variable" inputmode="decimal" value="${escLocal(q.variable)}" placeholder="0.00"></div>
      <div class="field"><label>Variable months</label><input class="cell-input" data-q="variableMonths" inputmode="decimal" value="${escLocal(q.variableMonths)}" placeholder="24"></div>
      <div class="field"><label>Quick qualifying income</label><div class="calc-cell quick-w2-result" id="quickW2Result">$0.00 / mo</div></div>
    </div><div class="quick-w2-breakdown" id="quickW2Breakdown">Enter a rate, YTD, or prior-year figure. The lower supported base average is used; variable pay is averaged separately.</div></div>`;
    panel.insertBefore(card, list);
    const freq = card.querySelector('[data-q="freq"]'); freq.value = q.freq;
    const refresh = () => {
      const next = { ...q }; card.querySelectorAll('[data-q]').forEach(el => { next[el.dataset.q] = el.value; });
      Object.assign(q, next); saveQuick(q);
      const r = quickMonthly(q); byId('quickW2Result').textContent = `${moneyLocal(r.total)} / mo`;
      byId('quickW2Breakdown').textContent = `Base: ${moneyLocal(r.usedBase)} / mo · YTD avg ${moneyLocal(r.ytd)} · prior avg ${moneyLocal(r.prior)} · variable avg ${moneyLocal(r.variable)}. Click Push to carry these values into the full worksheet.`;
    };
    card.querySelectorAll('[data-q]').forEach(el => el.addEventListener('input', refresh));
    byId('quickW2Push').addEventListener('click', () => {
      const r = quickMonthly(q); let j = (S.w2 || []).find(x => x.__mtgcalcQuickBridge);
      if (!j) { j = typeof newW2 === 'function' ? newW2() : null; if (j) { j.__mtgcalcQuickBridge = true; S.w2.push(j); } }
      if (!j) return;
      j.employer = q.employer || j.employer; j.rate = n(q.rate); j.hours = n(q.hours); j.freq = q.freq; j.incomeType = 'consistent';
      j.y1.base = n(q.ytd); j.y2.base = n(q.prior); j.m.base = 'ytd'; j.m.ot = 'custom'; j.c.ot = n(q.variable) / Math.max(1, n(q.variableMonths));
      if (q.borrower) { S.b1 = q.borrower; S.borrower = q.borrower; if (byId('b1Name')) byId('b1Name').value = q.borrower; }
      if (typeof renderW2 === 'function') renderW2(); if (typeof RECALC === 'function') RECALC();
      if (typeof toast === 'function') toast('Quick W-2 values pushed to the full worksheet');
    });
    refresh();
  }

  /* Normalize AI JSON aliases and make Schedule E extraction genuinely two-year.
     The original parser remains in charge of all other income types. */
  if (typeof importExtract === 'function' && !window.__mtgcalcEnhancedImport) {
    const legacyImport = importExtract;
    window.importExtract = function (raw) {
      let parsed = null;
      try { parsed = JSON.parse(String(raw).replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '')); } catch (_) {}
      if (parsed && typeof parsed === 'object') {
        if (!parsed.sche && parsed.scheduleE) parsed.sche = parsed.scheduleE;
        if (!parsed.sche && parsed.rentals) parsed.sche = parsed.rentals;
        if (!parsed.w2 && parsed.employment) parsed.w2 = parsed.employment;
        if (!parsed.schc && parsed.scheduleC) parsed.schc = parsed.scheduleC;
        if (!parsed.other && parsed.otherIncome) parsed.other = parsed.otherIncome;
        raw = JSON.stringify(parsed);
      }
      const before = (S.sche || []).length;
      const out = legacyImport(raw);
      if (!out || out.error) return out;
      try { window.MtgcalcOcrBridge && window.MtgcalcOcrBridge.publish({ kind: 'income-json', parsed: parsed || raw }); } catch (_) {}
      const added = (S.sche || []).slice(before), src = parsed && Array.isArray(parsed.sche) ? parsed.sche : [];
      src.forEach((x, i) => {
        const p = added[i]; if (!p) return; ensureRental(p);
        ['y1', 'y2'].forEach((y, yi) => {
          if (!x[y] || typeof x[y] !== 'object') return;
          rentalKeys.forEach(k => { if (x[y][k] != null) p[y][k] = n(x[y][k]); });
          if (x[y].year != null || x[y].yr != null) p[y].yr = n(x[y].year != null ? x[y].year : x[y].yr);
        });
        if (x.priorYear && typeof x.priorYear === 'object') Object.assign(p.y1, Object.fromEntries(rentalKeys.map(k => [k, x.priorYear[k] == null ? p.y1[k] : n(x.priorYear[k])] )));
        if (x.currentYear && typeof x.currentYear === 'object') Object.assign(p.y2, Object.fromEntries(rentalKeys.map(k => [k, x.currentYear[k] == null ? p.y2[k] : n(x.currentYear[k])] )));
        ensureRental(p);
      });
      return out;
    };
    importExtract = window.importExtract;
    window.__mtgcalcEnhancedImport = true;
  }

  if (typeof applyDoc === 'function' && !window.__mtgcalcEnhancedApply) {
    const legacyApply = applyDoc;
    window.applyDoc = function (id, quiet) {
      const d = (typeof DOCS !== 'undefined' ? DOCS : []).find(x => x.id === id);
      const out = legacyApply(id, quiet);
      if (d && d.type === 'schede' && d.target) {
        const parts = d.target.split('|'), p = (S.sche || []).find(x => x.id === parts[1]);
        if (p) {
          ensureRental(p); const y = d.yearCol === 'y2' ? 'y2' : 'y1';
          (d.fields || []).forEach(f => { if (f.apply && !f.readonly && rentalKeys.includes(f.slot)) p[y][f.slot] = n(f.value); });
          ensureRental(p); if (typeof RECALC === 'function') RECALC();
        }
      }
      return out;
    };
    applyDoc = window.applyDoc;
    window.__mtgcalcEnhancedApply = true;
  }

  /* OCR engines often confuse a small set of characters in form labels
     ("Rece1ved", "Insuranc e", "M0rtgage", etc.). Normalize labels before
     the existing conservative extractor sees them. Amounts are untouched, so
     this cannot silently change a figure. */
  if (typeof extractFields === 'function' && !window.__mtgcalcOcrLabels) {
    const legacyExtractFields = extractFields;
    const normalizeOcrLabels = raw => String(raw == null ? '' : raw)
      .replace(/rents?\s+(?:recei(?:ved|ved|vcd)|rece1ved|receivcd)/gi, 'Rents Received')
      .replace(/insuranc[e3]\s*/gi, 'Insurance ')
      .replace(/m[o0]rtgag[e3]\s+interest/gi, 'Mortgage Interest')
      .replace(/pers[o0]nal[\-\s]+use\s+days/gi, 'Personal Use Days')
      .replace(/fair\s+rental\s+days?/gi, 'Fair Rental Days')
      .replace(/t[o0]tal\s+expens[e3]s?/gi, 'Total Expenses')
      .replace(/depreciati[o0]n\s+(?:expense\s+or\s+depletion|and\s+depletion)/gi, 'Depreciation Expense or Depletion')
      .replace(/(?:schedul[e3]|schedu1e)\s*e\b/gi, 'Schedule E')
      .replace(/(?:schedul[e3]|schedu1e)\s*c\b/gi, 'Schedule C')
      .replace(/\bpay\s*st[uv]b\b/gi, 'Pay Stub')
      .replace(/\bw[\-\s]?2\b/gi, 'W-2');
    const wrappedExtractFields = (type, raw) => legacyExtractFields(type, normalizeOcrLabels(raw));
    wrappedExtractFields.__mtgcalcOcrLabels = true;
    try { extractFields = wrappedExtractFields; } catch (_) {}
    try { window.extractFields = wrappedExtractFields; } catch (_) {}
    window.__mtgcalcOcrLabels = true;
  }

  const css = document.createElement('style'); css.id = 'incomeEnhancementsCss'; css.textContent = `
    #scheduleEEnhanced{margin-top:12px}.se-worksheet{margin-bottom:16px}.se-title{background:var(--surface-2)}
    .se-address{flex:1;min-width:260px}.se-meta{margin-bottom:12px}.se-table-wrap{border-radius:8px}
    .se-table{min-width:650px}.se-table td:first-child{width:46%}.se-table td.rowlabel span{display:block}.se-table td.rowlabel small{display:block;color:var(--text-muted);font-size:10px;font-weight:500;margin-top:2px}
    .se-table td{vertical-align:middle}.se-table .cell-input{background:var(--input-bg)}.se-expenses{margin-top:12px}.se-calc{min-height:34px}
    .se-help{margin-top:12px;margin-bottom:0}.quick-w2-card{border-color:var(--accent);border-left:3px solid var(--accent)}
    .quick-w2-result{font-size:15px;color:var(--accent)}.quick-w2-breakdown{margin-top:10px;color:var(--text-muted);font-size:11px}
    #loanOcrHandoff{margin:0 0 14px;border:1px solid var(--accent);border-radius:10px;background:var(--surface-2);padding:12px 14px}
    #loanOcrHandoff h3{margin:0 0 3px;font-size:13px;color:var(--text-strong)}#loanOcrHandoff p{margin:0 0 9px;font-size:11px;color:var(--text-muted)}
    #loanOcrHandoff .handoff-actions{display:flex;gap:7px;flex-wrap:wrap}
    @media(max-width:800px){.se-address{min-width:180px}.se-table{min-width:600px}}
  `; document.head.appendChild(css);

  function loanOcrRecord() {
    try { return window.MtgcalcOcrBridge && typeof window.MtgcalcOcrBridge.latest === 'function' ? window.MtgcalcOcrBridge.latest() : null; } catch (_) { return null; }
  }
  function clearLoanOcr() {
    try { localStorage.removeItem('mtgcalc-ocr-handoff-v1'); } catch (_) {}
    const box = byId('loanOcrHandoff'); if (box) box.remove();
  }
  function applyLoanOcr() {
    const record = loanOcrRecord(), payload = record && record.payload && (record.payload.parsed || record.payload);
    if (!payload || typeof payload !== 'object' || typeof importExtract !== 'function') {
      if (typeof toast === 'function') toast('No reviewable OCR JSON was found');
      return;
    }
    const out = importExtract(JSON.stringify(payload));
    if (out && out.error) { if (typeof toast === 'function') toast(out.error); return; }
    try { renderAll(); } catch (_) { if (typeof RECALC === 'function') RECALC(); }
    if (typeof toast === 'function') toast('Loan Suite OCR values imported — verify each field before qualifying');
    clearLoanOcr();
  }
  function ensureLoanOcrPanel() {
    const record = loanOcrRecord();
    if (!record || !record.payload) return;
    const panel = byId('panel-docs'); if (!panel || byId('loanOcrHandoff')) return;
    const box = document.createElement('div'); box.id = 'loanOcrHandoff';
    const p = record.payload, name = p.documentName || 'Loan Suite document';
    box.innerHTML = `<h3>Shared OCR from Loan Suite</h3><p><b>${escLocal(name)}</b> has reviewed values assigned for the Income Calculator. Choose import to add them as reviewable worksheet records; nothing is silently applied.</p><div class="handoff-actions"><button type="button" class="btn btn-primary" id="loanOcrImportBtn">Import assigned values</button><button type="button" class="btn btn-light" id="loanOcrClearBtn">Clear handoff</button></div>`;
    const anchor = panel.querySelector('.subtabs') || panel.firstElementChild;
    panel.insertBefore(box, anchor || null);
    byId('loanOcrImportBtn').addEventListener('click', applyLoanOcr);
    byId('loanOcrClearBtn').addEventListener('click', clearLoanOcr);
  }

  function bootEnhancements() {
    try {
      (S.sche || []).forEach(ensureRental);
      ensureQuickW2();
      renderEnhancedSchE();
      paintEnhancedSchE();
      if (typeof RECALC === 'function') RECALC();
      try {
        const params = new URLSearchParams(location.search);
        if (params.get('tab') === 'docs' && typeof switchTab === 'function') switchTab('docs');
      } catch (_) {}
      ensureLoanOcrPanel();
    } catch (err) { console.error('Income enhancements could not initialize', err); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(bootEnhancements, 0), { once: true });
  else setTimeout(bootEnhancements, 0);
})();
