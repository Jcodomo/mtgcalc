/* Mortgage Suite 56.0 - Income Calculator.
   - The "Agency asset guidelines" pop-up is gone (it opened unstyled); the planning summary it repeated stays on the Assets tab.
   - Assets: the Planning summary and the Asset statement OCR & large-deposit review are calculator cards, like every other card.
   - W-2 & Salary is the page the calculator opens on.
   - Mortgage Rates pulls Mortgage News Daily's daily index when it is opened (mnd-rates in this file, shared with the Loan Suite). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function G(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }

  /* --------------------------------------------------------------- styles */
  var css = [
    /* W-2: Year 1 only */
    '.y1-only-row td{background:var(--surface-2,rgba(90,162,255,.07))}.y1-only{display:flex;flex-wrap:wrap;gap:6px 22px;font-size:13px}.y1-only b{font-family:var(--font-num,inherit);font-weight:800}',
    /* asset cards */
    '#mtAssetPlan .card-body,#mtAssetOcr .card-body{display:grid;gap:12px}',
    '#v36AssetUseSummary{margin:0!important;padding:0!important;border:0!important;background:none!important}',
    '#v36AssetUseSummary .v36-agency-tabs{display:inline-flex;flex-wrap:wrap;gap:3px;padding:3px;border-radius:10px;border:1px solid var(--line,#d9e2ec);background:var(--surface-2,rgba(90,162,255,.06));margin:0 0 12px}',
    '#v36AssetUseSummary .v36-agency-tabs button{all:unset;cursor:pointer;padding:6px 12px;border-radius:7px;font-weight:600;font-size:12.5px;color:var(--muted,#9db0c8)}',
    '#v36AssetUseSummary .v36-agency-tabs button.active{background:var(--accent,#1f6fd6);color:#fff}',
    '#v36AssetUseSummary .v36-agency-tabs button:focus-visible{outline:2px solid var(--accent,#5aa2ff);outline-offset:1px}',
    '#v36AssetUseSummary .v36-guide-lead{display:grid;gap:4px;padding:12px 14px;border-radius:10px;border:1px solid var(--line,#d9e2ec);margin-bottom:12px}',
    '#v36AssetUseSummary .v36-guide-lead b{font-size:14px}#v36AssetUseSummary .v36-guide-lead span{font-size:12px;color:var(--muted,#9db0c8)}#v36AssetUseSummary .v36-guide-lead p{margin:2px 0;font-size:13px;line-height:1.5}',
    '#v36AssetUseSummary .v36-account-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:10px}',
    '#v36AssetUseSummary .v36-account-summary article{padding:12px 14px;border-radius:10px;border:1px solid var(--line,#d9e2ec);display:grid;gap:4px}',
    '#v36AssetUseSummary .v36-account-summary article>div{display:grid;gap:2px}#v36AssetUseSummary .v36-account-summary article b{font-size:13.5px}#v36AssetUseSummary .v36-account-summary article span{font-size:12px;color:var(--muted,#9db0c8)}#v36AssetUseSummary .v36-account-summary article p{margin:2px 0;font-size:12.5px;line-height:1.45}',
    '#v36AssetUseSummary .v36-empty,#v36AssetUseSummary .v36-guide-note{display:block;color:var(--muted,#9db0c8);font-size:12.5px;margin-top:8px}',
    '#v36AssetOcr{margin:0!important;padding:0!important;border:0!important;background:none!important}',
    '#v36AssetOcr .v36-asset-title{display:none}',
    '#v36AssetOcr .v36-asset-controls{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end}',
    '#v36AssetOcr .v36-asset-controls label{display:grid;gap:4px;font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#9db0c8)}',
    '#v36AssetOcr input[type=text],#v36AssetOcr select,#v36AssetOcr textarea{box-sizing:border-box;min-width:0;padding:8px 10px;border-radius:8px;border:1px solid var(--line,#d9e2ec);background:var(--surface,#fff);color:inherit;font:600 14px/1.3 inherit;text-transform:none;letter-spacing:0}',
    '#v36AssetOcr button,#mtAssetOcr .mt-up{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px solid var(--line,#d9e2ec);background:var(--surface-2,rgba(90,162,255,.08));color:inherit;font:600 13px/1 inherit;cursor:pointer}',
    '#v36AssetOcr button:hover,#mtAssetOcr .mt-up:hover{border-color:var(--accent,#1f6fd6)}',
    '#mtAssetOcr .mt-up{position:relative;overflow:hidden;background:var(--accent,#1f6fd6);border-color:var(--accent,#1f6fd6);color:#fff}#mtAssetOcr .mt-up input{position:absolute;inset:0;opacity:0;cursor:pointer}',
    '#v36AssetOcr .v36-asset-review{padding:12px 14px;border-radius:10px;border:1px dashed var(--line,#d9e2ec);font-size:13px}',
    '#v36AssetOcr .v36-asset-review p{margin:0}#v36AssetOcr .v36-review-badges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}',
    '#v36AssetOcr .v36-review-badges span{padding:3px 9px;border-radius:999px;font-size:11.5px;font-weight:700;border:1px solid var(--line,#d9e2ec)}#v36AssetOcr .v36-review-badges .matched{color:#3fcf8e;border-color:rgba(63,207,142,.5)}#v36AssetOcr .v36-review-badges .review{color:#f0b357;border-color:rgba(240,179,87,.5)}',
    '#v36AssetOcr .v36-review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:10px}',
    '#v36AssetOcr .v36-review-grid label{display:grid;gap:4px;font-size:11.5px;font-weight:600;color:var(--muted,#9db0c8);text-transform:uppercase;letter-spacing:.04em}',
    '#v36AssetOcr table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:10px}#v36AssetOcr th,#v36AssetOcr td{padding:6px 8px;border-bottom:1px solid var(--line,#d9e2ec);text-align:left}',
    '#v36AssetOcr .v36-working{color:var(--muted,#9db0c8)}#v36AssetOcr .v36-error{color:#ff7b6b}',
    /* the large-deposit AI prompt dialog keeps working - give it the calculator look */
    '#v36AssetAiModal{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:16px}#v36AssetAiModal.open{display:flex}',
    '#v36AssetAiModal .v36-modal-backdrop{position:absolute;inset:0;border:0;background:rgba(3,12,32,.62);cursor:pointer}',
    '#v36AssetAiModal section{position:relative;width:min(760px,100%);max-height:88vh;overflow:auto;border-radius:14px;border:1px solid var(--line,#d9e2ec);background:var(--surface,#fff);color:inherit;padding:16px 18px;box-shadow:0 20px 60px rgba(0,0,0,.4)}',
    '#v36AssetAiModal header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}#v36AssetAiModal header h2{margin:2px 0 0;font-size:18px}#v36AssetAiModal header span{font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#9db0c8)}',
    '#v36AssetAiModal header button{all:unset;cursor:pointer;width:32px;height:32px;display:grid;place-items:center;border-radius:8px;border:1px solid var(--line,#d9e2ec);font-size:16px}',
    '#v36AssetAiModal textarea{width:100%;box-sizing:border-box;min-height:220px;padding:10px;border-radius:8px;border:1px solid var(--line,#d9e2ec);background:var(--surface-2,transparent);color:inherit;font:12.5px/1.45 ui-monospace,Menlo,Consolas,monospace}'
  ].join('\n');
  if (!$('mt56IncomeCss')) { var st = document.createElement('style'); st.id = 'mt56IncomeCss'; st.textContent = css; document.head.appendChild(st); }

  /* ------------------------------------------------- Assets: remove the pop-up, card the two sections */
  function card(id, tag, name, sub) {
    var c = document.createElement('div'); c.className = 'card'; c.id = id;
    c.innerHTML = '<div class="card-top"><span class="tag">' + tag + '</span><span class="doc-name">' + name + '</span><div class="spacer"></div><span class="mt-card-actions"></span></div><div class="card-body">' + (sub ? '<p class="muted small" style="margin:0">' + sub + '</p>' : '') + '</div>';
    return c;
  }
  function assets() {
    var panel = $('panel-assets'); if (!panel) return;
    /* 1. the guidelines button and its pop-up */
    Array.prototype.forEach.call(panel.querySelectorAll('.v36-guideline-button'), function (b) { b.remove(); });
    var gm = $('v36AssetGuideModal'); if (gm) gm.remove();
    if (window.V36 && !V36.__noGuide) { V36.__noGuide = true; V36.openAssetGuidelines = function () { var c = $('mtAssetPlan'); if (c && c.scrollIntoView) c.scrollIntoView({behavior: 'smooth', block: 'start'}); }; }
    /* 2. planning summary card */
    var sum = $('v36AssetUseSummary');
    if (sum && !(sum.parentNode && sum.parentNode.closest && sum.parentNode.closest('#mtAssetPlan'))) {
      var c1 = $('mtAssetPlan') || card('mtAssetPlan', 'Planning', 'Planning summary - how each account can be used', 'By agency: what each asset account can count toward - income, closing funds or reserves. Planning only; confirm against the current guide.');
      if (!c1.parentNode) sum.parentNode.insertBefore(c1, sum);
      c1.querySelector('.card-body').appendChild(sum);
    }
    /* 3. statement OCR card */
    var ocr = $('v36AssetOcr');
    if (ocr && !(ocr.parentNode && ocr.parentNode.closest && ocr.parentNode.closest('#mtAssetOcr'))) {
      var c2 = $('mtAssetOcr') || card('mtAssetOcr', 'Statements', 'Asset statement OCR & large-deposit review', 'Read a statement (PDF, image or text), check the matched values, then choose whether to add the account. Deposits above the threshold are flagged for a source letter.');
      if (!c2.parentNode) ocr.parentNode.insertBefore(c2, ocr);
      c2.querySelector('.card-body').appendChild(ocr);
      var inp = $('v36AssetFile'), act = c2.querySelector('.mt-card-actions');
      if (inp && act && !act.querySelector('.mt-up')) {
        var l = document.createElement('label'); l.className = 'mt-up'; l.innerHTML = '<span>Scan statement</span>';
        l.insertBefore(inp, l.firstChild); act.appendChild(l);
        var oldLabel = ocr.querySelector('.v36-upload'); if (oldLabel) oldLabel.remove();
      }
    }
  }

  /* -------------------------------------------------- W-2 & Salary first */
  function openW2() {
    var q = new URLSearchParams(location.search);
    if (q.get('tab') || q.get('ocr') || q.get('mtdoc')) return;            /* a link asked for another tab */
    if (typeof window.switchTab !== 'function') return;
    var active = document.querySelector('#tabbar .tab.active');
    if (!active || active.dataset.tab !== 'w2') window.switchTab('w2');
    var bar = $('tabbar'), w2 = bar && bar.querySelector('[data-tab="w2"]');
    if (bar && w2 && bar.firstElementChild !== w2) bar.insertBefore(w2, bar.firstElementChild);
  }

  /* ---------------------------------------------------------------- boot */
  var n = 0, t = setInterval(function () {
    assets();
    if (n === 6) openW2();
    if (++n > 80) clearInterval(t);
  }, 150);
  /* the assets tab is re-rendered on every recalculation: keep the cards */
  (function wrap(tries) {
    if (typeof window.RECALC !== 'function') { if (tries < 100) setTimeout(function () { wrap(tries + 1); }, 100); return; }
    var mo = new MutationObserver(function () { if ($('v36AssetUseSummary') && !$('v36AssetUseSummary').closest('#mtAssetPlan')) assets(); if ($('v36AssetGuideModal') || document.querySelector('.v36-guideline-button')) assets(); });
    var p = $('panel-assets'); if (p) mo.observe(p, {childList: true, subtree: true});
    mo.observe(document.body, {childList: true});
  })(0);
})();
