/* Shared browser sync for the simple mtgcalc workflow.
   It stores a reviewable income handoff rather than copying a page DOM. */
(function () {
  'use strict';
  const KEY = 'mtgcalc-shared-workflow-v1';
  const APPLIED = 'mtgcalc-shared-workflow-applied-v1';
  const OCR_KEY = 'mtgcalc-ocr-handoff-v1';
  const page = /all-in-one/i.test(location.pathname) ? 'all-in-one'
    : /quick-income/i.test(location.pathname) ? 'quick'
    : /income-calculator/i.test(location.pathname) ? 'income'
    : /loan-suite/i.test(location.pathname) ? 'full-suite' : 'renovation';
  let saveTimer = 0;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; } };
  const activeSuite = () => window.mortgageSuite && window.mortgageSuite.store;
  const status = (text) => document.querySelectorAll('[data-mtgcalc-sync-status]').forEach((el) => { el.textContent = text; });
  function handoff() {
    try { return window.__mtgcalcBridge && typeof window.__mtgcalcBridge.getIncomePatch === 'function' ? window.__mtgcalcBridge.getIncomePatch() : null; }
    catch (_) { return null; }
  }
  function publish() {
    const previous = read() || {};
    const incomePatch = handoff() || previous.incomePatch || null;
    let suiteInputs = previous.suiteInputs || null;
    try { if (activeSuite()) suiteInputs = activeSuite().activeInputs; } catch (_) {}
    const record = { version: 1, updatedAt: new Date().toISOString(), source: page, incomePatch, suiteInputs };
    try { localStorage.setItem(KEY, JSON.stringify(record)); } catch (_) { return null; }
    status('Synced ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    return record;
  }
  function applyToSuite(record) {
    const store = activeSuite();
    if (!store || !record || !record.incomePatch) return false;
    const signature = record.updatedAt + '|' + (record.incomePatch.borrowerName || '');
    try {
      if (sessionStorage.getItem(APPLIED) === signature) return false;
      store.importIncomeText(JSON.stringify(record.incomePatch), 'mtgcalc-shared-income.json');
      sessionStorage.setItem(APPLIED, signature);
      status('Income synced into the active suite scenario');
      return true;
    } catch (_) { return false; }
  }
  function pullToCalculator() {
    const record = read();
    if (!record || !record.incomePatch || !window.__mtgcalcBridge || typeof window.__mtgcalcBridge.importSharedIncome !== 'function') return false;
    return !!window.__mtgcalcBridge.importSharedIncome(record.incomePatch);
  }
  function syncNow() { const record = publish(); applyToSuite(record); return record; }
  function schedule() { clearTimeout(saveTimer); saveTimer = setTimeout(syncNow, 350); }
  function readOcr() { try { return JSON.parse(localStorage.getItem(OCR_KEY) || 'null'); } catch (_) { return null; } }
  function writeOcr(payload) { try { localStorage.setItem(OCR_KEY, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), source: page, payload })); } catch (_) {} }
  function openIncomeDocuments() { location.href = 'income-calculator.html?tab=docs&source=loan'; }
  window.MtgcalcOcrBridge = window.MtgcalcOcrBridge || { key: OCR_KEY, latest: readOcr, publish: writeOcr, openIncome: openIncomeDocuments };
  window.MtgcalcSync = { key: KEY, syncNow, pullToCalculator, latest: read,
    openDocuments(kind) { const q = new URLSearchParams({ app: 'suite', tab: 'documents' }); if (kind) q.set('generator', kind); location.href = 'loan-suite.html?' + q.toString(); } };
  document.addEventListener('change', schedule, true);
  window.addEventListener('beforeunload', publish);
  window.addEventListener('storage', (event) => { if (event.key === KEY && event.newValue) { try { const record = JSON.parse(event.newValue); if (record.source !== page) applyToSuite(record); } catch (_) {} } });
  let attempts = 0;
  (function ready() { const record = read(); if (record) applyToSuite(record); if (++attempts < 30 && !activeSuite()) setTimeout(ready, 250); })();
})();
