/* Release 55.12 — Quick Income Worksheet.
   Planning worksheet only; the mortgage calculator below stays the payment engine.
   55.12 fixes: typing no longer loses focus (inputs are never redrawn while you type),
   employer names persist, the history table is real table markup, and variable income
   is averaged over the months each column actually covers (YTD months + 12 per prior year)
   instead of dividing a partial-year YTD figure by twelve. A declining trend falls back
   to the more recent figure. */
(function () {
  'use strict';
  const root = document.getElementById('quickWorksheet');
  if (!root) return;
  const $ = (id) => document.getElementById(id);
  const KEY = 'mtgcalc-quick-worksheet-v1';
  const OPEN_KEY = 'mtgcalc-quick-worksheet-open';
  const year = new Date().getFullYear();
  const CATS = [['base', 'Base pay'], ['overtime', 'Overtime'], ['commission', 'Commission'], ['bonus', 'Bonus'], ['other', 'Other income']];
  const safe = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[$,\s]/g, '')); return Number.isFinite(n) ? n : 0; };
  const money = (v) => '$' + Math.round(number(v)).toLocaleString('en-US');
  const blankRows = () => ({ base: ['', '', ''], overtime: ['', '', ''], commission: ['', '', ''], bonus: ['', '', ''], other: ['', '', ''] });
  const blankJob = () => ({ employer: '', incomeType: 'Consistent hourly', frequency: 'Hourly', amount: '', hours: '40', hireDate: '', periodEnd: '', rows: blankRows() });
  const state = { borrower: '', loan: '', date: '', jobs: [blankJob()], other: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') Object.assign(state, saved);
    if (!Array.isArray(state.jobs) || !state.jobs.length) state.jobs = [blankJob()];
    state.jobs.forEach((j) => { j.rows = Object.assign(blankRows(), j.rows || {}); });
    if (!Array.isArray(state.other)) state.other = [];
  } catch (_) {}
  let persistTimer = 0;
  function persist() { clearTimeout(persistTimer); persistTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} }, 200); }

  /* Months covered by the YTD column: from the pay-period end date, else today. */
  function ytdMonths(job) {
    const m = String(job.periodEnd || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const iso = String(job.periodEnd || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const d = m ? new Date(+m[3], +m[1] - 1, +m[2]) : iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : new Date();
    if (isNaN(d)) return 12;
    const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return Math.max(0.5, Math.min(12, d.getMonth() + d.getDate() / dim));
  }
  /* Average monthly for one history row. Returns {monthly, method}. */
  function rowMonthly(job, cat) {
    const v = [0, 1, 2].map((i) => number(job.rows && job.rows[cat] && job.rows[cat][i]));
    const months = [ytdMonths(job), 12, 12];
    const used = [0, 1, 2].filter((i) => v[i] > 0);
    if (!used.length) return { monthly: 0, method: '—' };
    const tag = (i) => (i === 0 ? 'YTD' : String(year - i));
    if (used.length > 1) {
      // Declining: the most recent populated period runs below the one before it.
      const recent = used[0], prior = used[1];
      if (v[recent] / months[recent] < v[prior] / months[prior] - 0.005) {
        return { monthly: v[recent] / months[recent], method: 'Declining: ' + tag(recent) + ' only' };
      }
      const sum = used.reduce((a, i) => a + v[i], 0), mo = used.reduce((a, i) => a + months[i], 0);
      return { monthly: sum / mo, method: used.map(tag).join(' + ') + ' over ' + mo.toFixed(2) + ' mo' };
    }
    return { monthly: v[used[0]] / months[used[0]], method: tag(used[0]) + ' / ' + months[used[0]].toFixed(2) + ' mo' };
  }
  function baseInfo(job) {
    const amount = number(job.amount), hours = job.hours == null || String(job.hours).trim() === '' ? 40 : Math.max(0, number(job.hours)), f = job.frequency;
    if (amount > 0) {
      const m = f === 'Hourly' ? amount * hours * 52 / 12 : f === 'Weekly' ? amount * 52 / 12 : f === 'Bi-weekly' ? amount * 26 / 12
        : f === 'Semi-monthly' ? amount * 2 : f === 'Annual' ? amount / 12 : amount;
      return { monthly: m, method: f === 'Hourly' ? 'Rate × ' + hours + ' hrs × 52 / 12' : f + ' rate' };
    }
    return rowMonthly(job, 'base');
  }
  const componentInfo = (job, cat) => (cat === 'base' ? baseInfo(job) : rowMonthly(job, cat));
  const variableMonthly = (job) => CATS.slice(1).reduce((s, [c]) => s + rowMonthly(job, c).monthly, 0);
  const jobMonthly = (job) => baseInfo(job).monthly + variableMonthly(job);
  const total = () => state.jobs.reduce((a, j) => a + jobMonthly(j), 0) + state.other.reduce((a, v) => a + number(v.amount), 0);
  const options = (values, current) => values.map((v) => '<option' + (v === current ? ' selected' : '') + '>' + safe(v) + '</option>').join('');
  const input = (attrs, value, ph) => '<input ' + attrs + ' placeholder="' + ph + '" value="' + safe(value) + '">';

  function jobMarkup(job, j) {
    const at = (f) => 'data-job="' + j + '" data-field="' + f + '"';
    const rows = CATS.map(([cat, label]) => '<tr><th scope="row">' + label + '</th>' + [0, 1, 2].map((i) => '<td>' + input('data-job="' + j + '" data-row="' + cat + '" data-year="' + i + '" inputmode="decimal" aria-label="' + label + ' ' + (i === 0 ? year + ' YTD' : year - i) + '"', job.rows[cat][i] || '', '$0') + '</td>').join('') + '<td data-out="used-' + cat + '"></td><td class="qw-method" data-out="method-' + cat + '"></td></tr>').join('');
    return '<article class="qw-job" data-job-card="' + j + '"><div class="qw-job-title"><strong>Employment record #' + (j + 1) + '</strong>' + (state.jobs.length > 1 ? '<button type="button" class="qw-remove" data-remove-job="' + j + '" aria-label="Remove employment record ' + (j + 1) + '">×</button>' : '') + '</div>' +
      '<div class="qw-job-fields"><label class="qw-wide"><span>Employer name</span>' + input(at('employer'), job.employer, 'Employer') + '</label>' +
      '<label><span>Type of income</span><select ' + at('incomeType') + '>' + options(['Consistent hourly', 'Salary', 'Variable income', 'Commission'], job.incomeType) + '</select></label>' +
      '<label><span>Frequency</span><select ' + at('frequency') + '>' + options(['Hourly', 'Weekly', 'Bi-weekly', 'Semi-monthly', 'Monthly', 'Annual'], job.frequency) + '</select></label>' +
      '<label><span>Amount / rate</span>' + input(at('amount') + ' inputmode="decimal"', job.amount, '$0.00') + '</label>' +
      '<label data-hours><span>Weekly hours</span>' + input(at('hours') + ' inputmode="decimal"', job.hours, '40') + '</label>' +
      '<label><span>Hire date</span>' + input(at('hireDate'), job.hireDate, 'mm/dd/yyyy') + '</label>' +
      '<label><span>Pay period end</span>' + input(at('periodEnd'), job.periodEnd, 'mm/dd/yyyy') + '</label></div>' +
      '<div class="qw-table-wrap"><table class="qw-table"><thead><tr><th>Income component</th><th>' + year + ' YTD</th><th>' + (year - 1) + '</th><th>' + (year - 2) + '</th><th>Used / mo</th><th>Method</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="qw-job-total"><span>Employment #' + (j + 1) + ' <small data-out="ytd"></small></span><b data-out="job"></b></div></article>';
  }
  /* Update every computed value in place; never touches inputs. */
  function refresh() {
    state.jobs.forEach((job, j) => {
      const card = root.querySelector('[data-job-card="' + j + '"]'); if (!card) return;
      CATS.forEach(([cat]) => { const info = componentInfo(job, cat); card.querySelector('[data-out="used-' + cat + '"]').textContent = info.monthly ? money(info.monthly) : '—'; card.querySelector('[data-out="method-' + cat + '"]').textContent = info.method; });
      card.querySelector('[data-out="job"]').textContent = money(jobMonthly(job)) + ' / mo';
      card.querySelector('[data-out="ytd"]').textContent = '· YTD covers ' + ytdMonths(job).toFixed(2) + ' months';
      const hrs = card.querySelector('[data-hours]'); if (hrs) hrs.hidden = job.frequency !== 'Hourly';
    });
    const t = total();
    $('qwTotal').textContent = money(t) + ' / mo';
    $('qwAnnual').textContent = money(t * 12);
    const sum = $('qwSummary'); if (sum) sum.textContent = t ? money(t) + ' / mo' : 'optional';
  }
  function render() {
    $('qwBorrower').value = state.borrower || '';
    $('qwLoan').value = state.loan || '';
    $('qwDate').value = state.date || '';
    $('qwJobs').innerHTML = state.jobs.map(jobMarkup).join('');
    $('qwOtherRows').innerHTML = state.other.map((item, i) => '<div class="qw-other-row">' + input('data-other="' + i + '" data-other-field="label"', item.label || '', 'Income source') + input('data-other="' + i + '" data-other-field="amount" inputmode="decimal"', item.amount || '', '$0 / mo') + '<button type="button" class="qw-remove" data-remove-other="' + i + '" aria-label="Remove income source">×</button></div>').join('');
    const other = root.querySelector('.qw-other'); if (other) other.hidden = !state.other.length;
    refresh();
  }
  /* One delegated listener set, bound once. */
  root.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.field) { const j = state.jobs[+el.dataset.job]; if (j) j[el.dataset.field] = el.value; }
    else if (el.dataset.row) { const j = state.jobs[+el.dataset.job]; if (j) j.rows[el.dataset.row][+el.dataset.year] = el.value; }
    else if (el.dataset.otherField) { const it = state.other[+el.dataset.other]; if (it) it[el.dataset.otherField] = el.value; }
    else if (el.id === 'qwBorrower') state.borrower = el.value;
    else if (el.id === 'qwLoan') state.loan = el.value;
    else if (el.id === 'qwDate') state.date = el.value;
    else return;
    persist(); refresh();
  });
  root.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') { persist(); refresh(); } });
  root.addEventListener('click', (e) => {
    const rj = e.target.closest('[data-remove-job]'), ro = e.target.closest('[data-remove-other]');
    if (rj) { if (state.jobs.length > 1) state.jobs.splice(+rj.dataset.removeJob, 1); persist(); render(); }
    else if (ro) { state.other.splice(+ro.dataset.removeOther, 1); persist(); render(); }
  });
  function useForMortgage() {
    const t = total(), qType = $('qType'), qAmt = $('qAmt');
    if (qType && qAmt) {
      qType.value = 'monthly'; qType.dispatchEvent(new Event('change', { bubbles: true }));
      qAmt.value = money(t); qAmt.dispatchEvent(new Event('input', { bubbles: true })); qAmt.dispatchEvent(new Event('change', { bubbles: true }));
    }
    try { window.LOS55 && LOS55.Shared && LOS55.Shared.write({ income: Math.round(t * 100) / 100 }, 'quick-worksheet'); } catch (_) {}
    const note = $('qwSyncNote'); if (note) { note.textContent = 'Sent to the calculator as monthly income.'; note.classList.add('show'); setTimeout(() => note.classList.remove('show'), 3500); }
  }
  function hasData() { return total() > 0 || state.jobs.some((j) => j.employer); }
  function setOpen(open) {
    root.classList.toggle('qw-closed', !open);
    const b = $('qwToggle'); if (b) { b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Hide' : 'Open worksheet'; }
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch (_) {}
  }
  $('qwAddJob').addEventListener('click', () => { state.jobs.push(blankJob()); persist(); render(); setOpen(true); });
  $('qwAddOther').addEventListener('click', () => { state.other.push({ label: '', amount: '' }); persist(); render(); setOpen(true); const last = root.querySelector('.qw-other-row:last-child input'); if (last) last.focus(); });
  $('qwUse').addEventListener('click', useForMortgage);
  $('qwPrint').addEventListener('click', () => { setOpen(true); window.print(); });
  const actions = root.querySelector('.qw-head .qw-actions');
  if (actions && !$('qwToggle')) {
    const t = document.createElement('button'); t.type = 'button'; t.id = 'qwToggle'; t.className = 'qw-toggle';
    t.addEventListener('click', () => setOpen(root.classList.contains('qw-closed')));
    actions.appendChild(t);
    const title = root.querySelector('.qw-head h2'); if (title && !$('qwSummary')) { const s = document.createElement('small'); s.id = 'qwSummary'; s.className = 'qw-summary'; title.appendChild(s); }
  }
  render();
  let pref = null; try { pref = localStorage.getItem(OPEN_KEY); } catch (_) {}
  setOpen(pref === null ? hasData() : pref === '1');
  window.QuickWorksheet = { total, rowMonthly, baseInfo, ytdMonths, state };
})();
