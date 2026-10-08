/* Release 55.10 — compact legacy-style Quick Income worksheet.
   This is a planning worksheet only; the mortgage calculator below remains the
   authoritative payment engine. Values are editable and carry through the
   existing shared-workflow handoff. */
(function () {
  'use strict';
  const root = document.getElementById('quickWorksheet');
  if (!root) return;
  const nav = document.getElementById('los55Nav');
  if (nav && !nav.querySelector('[data-p="docs"]')) {
    const link = document.createElement('a'); link.dataset.p = 'docs'; link.href = 'doc-organizer.html'; link.textContent = 'Doc Organizer'; link.title = 'Open Doc Organizer';
    const all = nav.querySelector('[data-p="allinone"]'); all ? nav.insertBefore(link, all) : nav.appendChild(link);
  }
  const $ = (id) => document.getElementById(id);
  const KEY = 'mtgcalc-quick-worksheet-v1';
  const year = new Date().getFullYear();
  const safe = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = (value) => {
    const n = parseFloat(String(value == null ? '' : value).replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const money = (value) => '$' + Math.round(number(value)).toLocaleString('en-US');
  const blankJob = () => ({ employer: '', incomeType: 'Consistent hourly', frequency: 'Hourly', amount: '', hours: '40', hireDate: '', periodEnd: '', rows: { base: ['', '', ''], overtime: ['', '', ''], commission: ['', '', ''], bonus: ['', '', ''], other: ['', '', ''] } });
  const state = { borrower: '', loan: '', date: '', jobs: [blankJob()], other: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') Object.assign(state, saved);
    if (!Array.isArray(state.jobs) || !state.jobs.length) state.jobs = [blankJob()];
    if (!Array.isArray(state.other)) state.other = [];
  } catch (_) {}
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} }
  function rowValue(job, category, index) { return number(job.rows && job.rows[category] && job.rows[category][index]); }
  function variableMonthly(job) {
    const cats = ['overtime', 'commission', 'bonus', 'other'];
    return cats.reduce((sum, category) => {
      const values = [0, 1, 2].map((i) => rowValue(job, category, i)).filter((v) => v > 0);
      return sum + (values.length ? (values.length > 1 ? (values.reduce((a, b) => a + b, 0) / values.length) : values[0]) / 12 : 0);
    }, 0);
  }
  function baseMonthly(job) {
    const amount = number(job.amount), hours = number(job.hours) || 40;
    if (job.frequency === 'Hourly') return amount * hours * 52 / 12;
    if (job.frequency === 'Weekly') return amount * 52 / 12;
    if (job.frequency === 'Bi-weekly') return amount * 26 / 12;
    if (job.frequency === 'Semi-monthly') return amount * 24 / 12;
    if (job.frequency === 'Annual') return amount / 12;
    return amount;
  }
  function jobMonthly(job) { return baseMonthly(job) + variableMonthly(job); }
  function total() { return state.jobs.reduce((a, j) => a + jobMonthly(j), 0) + state.other.reduce((a, v) => a + number(v.amount), 0); }
  function options(values, current) { return values.map((v) => '<option' + (v === current ? ' selected' : '') + '>' + safe(v) + '</option>').join(''); }
  function jobMarkup(job, index) {
    const row = (category, label) => '<div class="qw-income-row"><span>' + label + '</span>' + [0, 1, 2].map((i) => '<input data-job="' + index + '" data-row="' + category + '" data-year="' + i + '" inputmode="decimal" placeholder="$0" value="' + safe(job.rows?.[category]?.[i] || '') + '">').join('') + '<b>' + money([0, 1, 2].map((i) => rowValue(job, category, i)).reduce((a, b) => a + b, 0)) + '</b></div>';
    return '<article class="qw-job" data-job-card="' + index + '"><div class="qw-job-title"><strong>Employment record #' + (index + 1) + '</strong><button type="button" class="qw-remove" data-remove-job="' + index + '" aria-label="Remove job">×</button></div>' +
      '<div class="qw-job-fields"><label><span>Employer name</span><input data-job="' + index + '" data-field="employer" placeholder="Employer"></label><label><span>Type of income</span><select data-job="' + index + '" data-field="incomeType">' + options(['Consistent hourly', 'Salary', 'Variable income', 'Commission'], job.incomeType) + '</select></label><label><span>Frequency</span><select data-job="' + index + '" data-field="frequency">' + options(['Hourly', 'Weekly', 'Bi-weekly', 'Semi-monthly', 'Monthly', 'Annual'], job.frequency) + '</select></label><label><span>Amount / rate</span><input data-job="' + index + '" data-field="amount" inputmode="decimal" placeholder="$0.00" value="' + safe(job.amount) + '"></label><label><span>Weekly hours</span><input data-job="' + index + '" data-field="hours" inputmode="decimal" placeholder="40" value="' + safe(job.hours) + '"></label><label><span>Hire date</span><input data-job="' + index + '" data-field="hireDate" placeholder="mm/dd/yyyy" value="' + safe(job.hireDate) + '"></label><label class="qw-wide"><span>Pay period end</span><input data-job="' + index + '" data-field="periodEnd" placeholder="mm/dd/yyyy" value="' + safe(job.periodEnd) + '"></label></div>' +
      '<div class="qw-chips"><span>Monthly amount <b>' + money(jobMonthly(job)) + '</b></span><span>Annualized <b>' + money(jobMonthly(job) * 12) + '</b></span><span>Variable used <b>' + money(variableMonthly(job)) + ' / mo</b></span></div>' +
      '<div class="qw-table-wrap"><table class="qw-table"><thead><tr><th>Income component</th><th>' + year + ' YTD</th><th>' + (year - 1) + '</th><th>' + (year - 2) + '</th><th>Amount used</th><th>Method</th></tr></thead><tbody>' + row('base', 'Base pay / YTD') + row('overtime', 'Overtime') + row('commission', 'Commission') + row('bonus', 'Bonus') + row('other', 'Other income') + '</tbody></table></div>' +
      '<p class="qw-note">Variable rows use the average of populated years; one populated year is divided over twelve months. Change the method in the notes as needed before underwriting.</p><div class="qw-job-total"><span>Employment #' + (index + 1) + ' — income used</span><b>' + money(jobMonthly(job)) + ' / mo</b></div></article>';
  }
  function render() {
    $('qwBorrower').value = state.borrower || '';
    $('qwLoan').value = state.loan || '';
    $('qwDate').value = state.date || '';
    $('qwJobs').innerHTML = state.jobs.map(jobMarkup).join('');
    $('qwOtherRows').innerHTML = state.other.map((item, i) => '<div class="qw-other-row"><input data-other="' + i + '" data-other-field="label" placeholder="Income source" value="' + safe(item.label || '') + '"><input data-other="' + i + '" data-other-field="amount" inputmode="decimal" placeholder="$0 / mo" value="' + safe(item.amount || '') + '"><button type="button" class="qw-remove" data-remove-other="' + i + '">×</button></div>').join('');
    $('qwTotal').textContent = money(total()) + ' / mo';
    $('qwAnnual').textContent = money(total() * 12);
    bind();
  }
  function useForMortgage() {
    const totalIncome = total();
    const qType = $('qType'), qAmt = $('qAmt');
    if (qType && qAmt) { qType.value = 'monthly'; qAmt.value = money(totalIncome); qAmt.dispatchEvent(new Event('change', { bubbles: true })); }
    try { window.LOS55?.Shared?.write({ income: Math.round(totalIncome * 100) / 100 }, 'quick-worksheet'); } catch (_) {}
    const note = $('qwSyncNote'); if (note) { note.textContent = 'Income sent to the mortgage calculator and shared workflow.'; note.classList.add('show'); setTimeout(() => note.classList.remove('show'), 3500); }
  }
  function bind() {
    root.querySelectorAll('[data-field]').forEach((el) => el.addEventListener('input', () => { const j = state.jobs[Number(el.dataset.job)]; if (!j) return; j[el.dataset.field] = el.value; persist(); render(); }));
    root.querySelectorAll('[data-row]').forEach((el) => el.addEventListener('input', () => { const j = state.jobs[Number(el.dataset.job)]; if (!j) return; j.rows[el.dataset.row][Number(el.dataset.year)] = el.value; persist(); render(); }));
    root.querySelectorAll('[data-other-field]').forEach((el) => el.addEventListener('input', () => { const item = state.other[Number(el.dataset.other)]; if (!item) return; item[el.dataset.otherField] = el.value; persist(); render(); }));
    root.querySelectorAll('[data-remove-job]').forEach((el) => el.addEventListener('click', () => { if (state.jobs.length > 1) state.jobs.splice(Number(el.dataset.removeJob), 1); persist(); render(); }));
    root.querySelectorAll('[data-remove-other]').forEach((el) => el.addEventListener('click', () => { state.other.splice(Number(el.dataset.removeOther), 1); persist(); render(); }));
  }
  $('qwBorrower').addEventListener('input', (e) => { state.borrower = e.target.value; persist(); });
  $('qwLoan').addEventListener('input', (e) => { state.loan = e.target.value; persist(); });
  $('qwDate').addEventListener('input', (e) => { state.date = e.target.value; persist(); });
  $('qwAddJob').addEventListener('click', () => { state.jobs.push(blankJob()); persist(); render(); });
  $('qwAddOther').addEventListener('click', () => { state.other.push({ label: '', amount: '' }); persist(); render(); });
  $('qwUse').addEventListener('click', useForMortgage);
  $('qwPrint').addEventListener('click', () => window.print());
  render();
})();
