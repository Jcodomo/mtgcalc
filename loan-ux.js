/* Release 55.6 — compact loan metrics and shared OCR handoff.
   Additive UI behavior only: the existing mortgage engine remains authoritative. */
(function () {
  'use strict';
  const OCR_KEY = 'mtgcalc-ocr-handoff-v1';
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
    @media (max-width: 760px) { #suite-root .v44-metric-strip.v46-strip { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
  `;
  function installCss() {
    if (document.getElementById('mtgcalc-loan-ux-style')) return;
    const style = document.createElement('style');
    style.id = 'mtgcalc-loan-ux-style'; style.textContent = css; document.head.appendChild(style);
  }
  function text(el) { return String(el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function openIncomeDocs() {
    const q = new URLSearchParams({ tab: 'docs', source: 'loan' });
    location.href = 'income-calculator.html?' + q.toString();
  }
  function latestOcr() { try { return JSON.parse(localStorage.getItem(OCR_KEY) || 'null'); } catch (_) { return null; } }
  function publishOcr(payload) {
    try { localStorage.setItem(OCR_KEY, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), source: 'loan', payload })); } catch (_) {}
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
    installCss(); markCards(); addOcrLink();
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
