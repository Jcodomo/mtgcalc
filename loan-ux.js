/* Release 55.6 — compact loan metrics and shared OCR handoff.
   Additive UI behavior only: the existing mortgage engine remains authoritative. */
(function () {
  'use strict';
  const OCR_KEY = 'mtgcalc-ocr-handoff-v1';
  const INCOME_TARGETS = [
    ['', '— Do not send —'],
    ['borrowerName', 'Borrower name'],
    ['w2.employer', 'W-2 / paystub · employer'],
    ['w2.base.y1', 'W-2 regular earnings · current/YTD'],
    ['w2.base.y2', 'W-2 regular earnings · prior year'],
    ['w2.ot.y1', 'W-2 overtime · current/YTD'],
    ['w2.comm.y1', 'W-2 commission · current/YTD'],
    ['w2.bonus.y1', 'W-2 bonus · current/YTD'],
    ['w2.rate', 'W-2 hourly rate'],
    ['w2.hours', 'W-2 hours per week'],
    ['w2.ytdThru', 'W-2 paystub end date'],
    ['schc.net31.y1', 'Schedule C net profit · current'],
    ['schc.net31.y2', 'Schedule C net profit · prior year'],
    ['sche.rents.y1', 'Schedule E rents received'],
    ['sche.totalExp.y1', 'Schedule E total expenses'],
    ['sche.fairDays.y1', 'Schedule E fair rental days'],
    ['sche.personalDays.y1', 'Schedule E personal-use days']
  ];
  const css = `
    #suite-root .v44-metric-strip.v46-strip {
      gap: 8px !important;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
      margin: 8px 0 12px !important;
    }
    #suite-root .v44-metric-strip .v44-punch,
    #suite-root .v44-metric-strip .v35-live-row {
      min-height: 60px !important;
      padding: 8px 10px !important;
      border-radius: 9px !important;
      cursor: pointer !important;
      transition: border-color .14s ease, background-color .14s ease, transform .14s ease !important;
    }
    #suite-root .v44-metric-strip .v44-punch:hover,
    #suite-root .v44-metric-strip .v35-live-row:hover,
    #suite-root .v44-metric-strip .mtgcalc-editable-card:focus-visible {
      transform: translateY(-1px);
      border-color: var(--accent, #2787e8) !important;
      outline: none;
    }
    #suite-root .v44-metric-strip .v44-punch > :first-child { font-size: 10px !important; }
    #suite-root .v44-metric-strip .v44-punch .v,
    #suite-root .v44-metric-strip .v44-punch b { font-size: 17px !important; line-height: 1.15 !important; }
    #suite-root .v44-metric-strip .v44-punch small,
    #suite-root .v44-metric-strip .v44-punch em { font-size: 10px !important; line-height: 1.25 !important; }
    #suite-root .v50-stats { gap: 7px !important; }
    #suite-root .v50-stats .v50-card { padding: 7px 10px !important; min-height: 48px !important; }
    #suite-root .v50-stats .v50-card b { font-size: 16px !important; }
    #mtgcalcOcrLink { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:12px 0; padding:10px 12px; border:1px solid var(--line,#d3dfef); border-radius:9px; background:var(--surface-2,#f5f8fc); color:var(--text,#17304d); font-size:12px; }
    #mtgcalcOcrLink button { border:1px solid var(--accent,#2787e8); border-radius:7px; padding:6px 10px; background:var(--accent,#2787e8); color:#fff; font-weight:700; cursor:pointer; }
    #mtgcalcOcrLink button.secondary { background:transparent; color:var(--accent,#2787e8); }
    .mtgcalc-income-assign { margin-top:12px; border-top:1px solid var(--line,#d3dfef); padding-top:12px; }
    .mtgcalc-income-assign h4 { margin:0 0 4px; font-size:12px; color:var(--text-strong,#17304d); }
    .mtgcalc-income-assign p { margin:0 0 9px; font-size:11px; color:var(--text-muted,#64748b); }
    .mtgcalc-income-assign table { width:100%; border-collapse:collapse; font-size:11px; }
    .mtgcalc-income-assign th, .mtgcalc-income-assign td { padding:5px 6px; border-bottom:1px solid var(--line,#d3dfef); text-align:left; vertical-align:middle; }
    .mtgcalc-income-assign th { color:var(--accent,#2787e8); font-size:10px; text-transform:uppercase; letter-spacing:.05em; }
    .mtgcalc-income-assign .mtgcalc-income-map { min-width:205px; padding:5px 7px; border-radius:6px; border:1px solid var(--line-2,#c9d3e2); background:var(--input-bg,#fffbea); color:var(--text-strong,#17304d); }
    .mtgcalc-income-actions { display:flex; gap:7px; flex-wrap:wrap; margin-top:10px; }
    @media (max-width: 760px) { #suite-root .v44-metric-strip.v46-strip { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
  `;
  function installCss() {
    if (document.getElementById('mtgcalc-loan-ux-style')) return;
    const style = document.createElement('style');
    style.id = 'mtgcalc-loan-ux-style'; style.textContent = css; document.head.appendChild(style);
  }
  function text(el) { return String(el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function openIncomeDocs() {
    const q = new URLSearchParams({ tab: 'docs', source: 'loan', ocr: '1' });
    location.href = 'income-calculator.html?' + q.toString();
  }
  function latestOcr() { try { return JSON.parse(localStorage.getItem(OCR_KEY) || 'null'); } catch (_) { return null; } }
  function publishOcr(payload) {
    try { localStorage.setItem(OCR_KEY, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), source: 'loan', payload })); } catch (_) {}
  }
  function numberValue(value) {
    const n = parseFloat(String(value == null ? '' : value).replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function incomePatterns() {
    return [
      ['Borrower name', /(?:employee|borrower|applicant)\s*(?:name)?\s*[:\-]\s*([^\n]+)/i, 'text'],
      ['Employer name', /employer(?:\s+name)?\s*[:\-]\s*([^\n]+)/i, 'text'],
      ['Gross pay', /(?:gross\s+(?:pay|earnings)|total\s+gross)\D{0,28}\$?([\d,]+(?:\.\d{1,2})?)/i, 'number'],
      ['Regular pay', /(?:regular|base)\s+(?:pay|earnings)\D{0,28}\$?([\d,]+(?:\.\d{1,2})?)/i, 'number'],
      ['Overtime', /overtime\D{0,28}\$?([\d,]+(?:\.\d{1,2})?)/i, 'number'],
      ['Commission', /commission\D{0,28}\$?([\d,]+(?:\.\d{1,2})?)/i, 'number'],
      ['Bonus', /bonus\D{0,28}\$?([\d,]+(?:\.\d{1,2})?)/i, 'number'],
      ['Pay rate', /(?:pay|hourly)\s+rate\D{0,20}\$?([\d,]+(?:\.\d{1,2})?)/i, 'number'],
      ['Hours per week', /(?:hours|hrs)(?:\s+per\s+week)?\D{0,20}([\d,]+(?:\.\d{1,2})?)/i, 'number'],
      ['Schedule C net profit', /(?:schedule\s*c|net\s+profit)\D{0,32}\$?([\d,]+(?:\.\d{1,2})?)/i, 'number'],
      ['Schedule E rents received', /(?:rents?\s+(?:received|received\s+or\s+accrued))\D{0,24}\$?([\d,]+(?:\.\d{1,2})?)/i, 'number'],
      ['Schedule E total expenses', /total\s+expenses?\D{0,24}\$?([\d,]+(?:\.\d{1,2})?)/i, 'number'],
      ['Fair rental days', /fair\s+rental\s+days?\D{0,16}([\d,]+)/i, 'number'],
      ['Personal-use days', /personal[-\s]+use\s+days?\D{0,16}([\d,]+)/i, 'number']
    ];
  }
  function inferIncomeTarget(label) {
    const l = String(label || '').toLowerCase();
    if (l === 'borrower name') return 'borrowerName';
    if (l === 'employer name') return 'w2.employer';
    if (l.includes('overtime')) return 'w2.ot.y1';
    if (l.includes('commission')) return 'w2.comm.y1';
    if (l.includes('bonus')) return 'w2.bonus.y1';
    if (l.includes('regular') || l.includes('gross')) return 'w2.base.y1';
    if (l.includes('pay rate')) return 'w2.rate';
    if (l.includes('hours')) return 'w2.hours';
    if (l.includes('schedule c')) return 'schc.net31.y1';
    if (l.includes('rents')) return 'sche.rents.y1';
    if (l.includes('total expenses')) return 'sche.totalExp.y1';
    if (l.includes('fair rental')) return 'sche.fairDays.y1';
    if (l.includes('personal')) return 'sche.personalDays.y1';
    return '';
  }
  function extractIncomeFigures(file) {
    if (!file || file.__mtgcalcIncomeFigures) return file && file.__mtgcalcIncomeFigures || [];
    const raw = String(file.text || ''), found = [], seen = new Set();
    incomePatterns().forEach(function (entry) {
      const match = raw.match(entry[1]); if (!match) return;
      const value = entry[2] === 'text' ? String(match[1] || '').trim() : numberValue(match[1]);
      if (entry[2] !== 'text' && !value) return;
      const key = entry[0] + '|' + String(value);
      if (seen.has(key)) return; seen.add(key);
      found.push({ label: entry[0], value, raw: match[0].replace(/\s+/g, ' ').trim(), incomeTarget: inferIncomeTarget(entry[0]) });
    });
    file.__mtgcalcIncomeFigures = found;
    return found;
  }
  function optionsHtml(selected) {
    return INCOME_TARGETS.map(function (item) { return '<option value="' + item[0] + '"' + (item[0] === selected ? ' selected' : '') + '>' + item[1] + '</option>'; }).join('');
  }
  function buildIncomePayload(file) {
    const parsed = { version: 'nmb-income-extract/1', borrowers: {}, w2: [], schc: [], corp: [], sche: [], other: [], assets: [], flags: [] };
    const currentYear = new Date().getFullYear(), w2 = { b: 1, incomeType: 'consistent', freq: 'Hourly', y1: { yr: currentYear }, y2: { yr: currentYear - 1 } }, schc = { b: 1, y1: { yr: currentYear }, y2: { yr: currentYear - 1 } }, sche = { b: 1 };
    let hasW2 = false, hasSchc = false, hasSche = false;
    (file.__mtgcalcIncomeFigures || []).forEach(function (fig) {
      const target = fig.incomeTarget || ''; if (!target) return;
      if (target === 'borrowerName') parsed.borrowers.b1 = String(fig.value || '');
      else if (target === 'w2.employer') { w2.employer = String(fig.value || ''); hasW2 = true; }
      else if (target === 'w2.rate') { w2.rate = numberValue(fig.value); hasW2 = true; }
      else if (target === 'w2.hours') { w2.hours = numberValue(fig.value); hasW2 = true; }
      else if (target === 'w2.ytdThru') { w2.ytdThru = String(fig.value || ''); hasW2 = true; }
      else if (/^w2\.(base|ot|comm|bonus)\.y[12]$/.test(target)) { const bits = target.split('.'); w2[bits[2]][bits[1]] = numberValue(fig.value); hasW2 = true; }
      else if (/^schc\.net31\.y[12]$/.test(target)) { const bits = target.split('.'); schc[bits[2]].net31 = numberValue(fig.value); hasSchc = true; }
      else if (/^sche\.(rents|totalExp|fairDays|personalDays)\.y1$/.test(target)) { const bits = target.split('.'); sche[bits[1]] = numberValue(fig.value); hasSche = true; }
    });
    if (hasW2) { w2.src = { document: file.name, note: 'Loan Suite OCR assignment — verify before qualifying' }; parsed.w2.push(w2); }
    if (hasSchc) { schc.src = { document: file.name, note: 'Loan Suite OCR assignment — verify before qualifying' }; parsed.schc.push(schc); }
    if (hasSche) { sche.src = { document: file.name, note: 'Loan Suite OCR assignment — verify before qualifying' }; parsed.sche.push(sche); }
    parsed.flags.push('Imported from Loan Suite OCR: ' + file.name + '. Verify every value against the source document.');
    return parsed;
  }
  function sendIncome(file) {
    const parsed = buildIncomePayload(file);
    publishOcr({ kind: 'income-json', parsed, text: file.text || '', documentName: file.name, assignments: (file.__mtgcalcIncomeFigures || []).map(function (x) { return { label: x.label, value: x.value, target: x.incomeTarget || '' }; }) });
    if (window.LOS && LOS.say) LOS.say('OCR handoff saved', 'Open the Income Calculator Documents tab to review and import the assigned values.', 'good', 6000);
    return parsed;
  }
  function decorateV9Docs() {
    const body = document.getElementById('v9DocBody'), files = window.V9 && V9.DOCS && V9.DOCS.files;
    if (!body || !Array.isArray(files)) return;
    files.forEach(function (file, index) {
      const card = body.children[index]; if (!card || file.status !== 'done') return;
      const figs = extractIncomeFigures(file); let box = card.querySelector('.mtgcalc-income-assign');
      if (!box) { box = document.createElement('div'); box.className = 'mtgcalc-income-assign'; (card.querySelector('.card-body') || card).appendChild(box); }
      box.innerHTML = '<h4>Assign OCR values to Income Calculator</h4><p>Choose a destination for each detected income value, then send it to the Income Calculator Documents tab for review. Nothing is silently applied.</p>' + (figs.length ? '<table><thead><tr><th>Detected field</th><th>Value</th><th>Income destination</th></tr></thead><tbody>' + figs.map(function (fig, i) { return '<tr><td>' + String(fig.label).replace(/[&<>]/g, '') + '</td><td>' + String(fig.value).replace(/[&<>]/g, '') + '</td><td><select class="mtgcalc-income-map" data-income-fig="' + i + '">' + optionsHtml(fig.incomeTarget || '') + '</select></td></tr>'; }).join('') + '</tbody></table>' : '<div class="muted small">No standard income fields were detected in this text. Use the built-in AI prompt or paste JSON, then assign the returned fields here.</div>') + '<div class="mtgcalc-income-actions"><button type="button" class="btn btn-primary" data-send-income>Send assigned values to Income Calculator</button><button type="button" class="btn btn-light" data-open-income>Open Income OCR</button><button type="button" class="btn btn-light" data-copy-income>Copy income JSON</button></div>';
      box.querySelectorAll('[data-income-fig]').forEach(function (select) { select.addEventListener('change', function () { figs[Number(select.dataset.incomeFig)].incomeTarget = select.value; }); });
      const send = box.querySelector('[data-send-income]'); if (send) send.addEventListener('click', function () { sendIncome(file); });
      const open = box.querySelector('[data-open-income]'); if (open) open.addEventListener('click', function () { sendIncome(file); openIncomeDocs(); });
      const copy = box.querySelector('[data-copy-income]'); if (copy) copy.addEventListener('click', function () { const json = JSON.stringify(buildIncomePayload(file), null, 2); if (navigator.clipboard) navigator.clipboard.writeText(json); });
    });
  }
  function installV9IncomeBridge() {
    if (!window.V9 || !V9.DOCS || typeof V9.renderDocs !== 'function' || V9.renderDocs.__mtgcalcIncome) return;
    const legacy = V9.renderDocs;
    const wrapped = function () { const out = legacy.apply(this, arguments); setTimeout(decorateV9Docs, 0); return out; };
    wrapped.__mtgcalcIncome = true; V9.renderDocs = wrapped; setTimeout(decorateV9Docs, 0);
  }
  function addOcrLink() {
    const panel = document.querySelector('#panel-docparse:not([style*="display: none"]), #panel-v9docs, [data-section="documents"]');
    if (!panel || document.getElementById('mtgcalcOcrLink')) return;
    const box = document.createElement('div'); box.id = 'mtgcalcOcrLink';
    const has = latestOcr();
    box.innerHTML = '<span><b>Shared OCR handoff</b><br><small>' + (has ? 'A reviewed OCR/JSON payload is available to the Income Calculator.' : 'Send reviewed document values to the Income Calculator for income assignment.') + '</small></span>';
    const open = document.createElement('button'); open.type = 'button'; open.textContent = 'Open Income OCR'; open.onclick = openIncomeDocs;
    const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'secondary'; copy.textContent = 'Copy JSON'; copy.onclick = function () { const v = latestOcr(); if (v && navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(v.payload || v, null, 2)); };
    box.append(open, copy); panel.insertBefore(box, panel.firstChild);
  }
  function markCards() {
    document.querySelectorAll('#suite-root .v44-metric-strip .v44-punch, #suite-root .v50-stats .v50-card').forEach(function (card) {
      if (!card.dataset.mtgcalcEdit) {
        const label = text(card).toLowerCase();
        card.dataset.mtgcalcEdit = /amortization/.test(label) ? 'summary' : /cash to close/.test(label) ? 'closing' : /monthly payment/.test(label) ? 'quote' : /mmw|maximum base|total loan|ltv/.test(label) ? 'maxmortgage' : 'quote';
        card.classList.add('mtgcalc-editable-card'); card.tabIndex = 0;
        if (!card.getAttribute('aria-label')) card.setAttribute('aria-label', text(card).replace(/\s+/g, ' ') + ' — open details or edit');
      }
    });
  }
  function fallbackRoute(card) {
    const mode = card && card.dataset && card.dataset.mtgcalcEdit;
    if (!mode) return;
    const tab = Array.from(document.querySelectorAll('#suite-root .tabs .tab')).find(function (el) { return text(el).toUpperCase() === ({ maxmortgage: 'MAX MORTGAGE', closing: 'CLOSING', quote: 'QUOTE', summary: 'SUMMARY' }[mode] || mode).toUpperCase(); });
    if (tab) tab.click();
  }
  function wire() {
    installCss(); markCards(); addOcrLink(); installV9IncomeBridge(); decorateV9Docs();
    const root = document.getElementById('suite-root');
    if (root && !root.dataset.mtgcalcUx) {
      root.dataset.mtgcalcUx = '1';
      root.addEventListener('keydown', function (event) { if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('.mtgcalc-editable-card')) { event.preventDefault(); event.target.click(); } });
      root.addEventListener('click', function (event) {
        const card = event.target.closest('.mtgcalc-editable-card');
        if (!card || event.target.closest('a,input,select,textarea')) return;
        setTimeout(function () { if (!document.querySelector('[role="dialog"],.v35-rail-editor,.v44-modal,.v20-modal')) fallbackRoute(card); }, 50);
      }, true);
    }
  }
  window.MtgcalcOcrBridge = window.MtgcalcOcrBridge || { key: OCR_KEY, latest: latestOcr, publish: publishOcr, openIncome: openIncomeDocs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  let ticks = 0; const timer = setInterval(function () { wire(); if (++ticks > 90) clearInterval(timer); }, 700);
})();
