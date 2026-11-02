/* Release 55.12: shared five-item navigation, compact suite workspace, FHA MIP auto-follow. */
(function () {
  'use strict';
  if (window.__mtgcalcWorkflowUi) return; window.__mtgcalcWorkflowUi = true;
  const pages = [
    ['home','Home','index.html','M3 10l9-7 9 7v11H3z M9 21v-8h6v8'],
    ['quick','Quick','quick.html','M13 2L4 14h7l-1 8 10-13h-7z'],
    ['docs','Doc Organizer','doc-organizer.html','M6 3h8l4 4v14H6z M14 3v5h5 M9 13h6 M9 17h6'],
    ['income','Income','income-calculator.html','M5 3h14v18H5z M8 7h8 M8 11h2 M14 11h2 M8 15h2 M14 15h2'],
    ['full','Full Suite','full-suite.html','M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z']
  ];
  const path = location.pathname;
  const active = /income-calculator/.test(path) ? 'income' : /quick/.test(path) ? 'quick' : /doc-organizer/.test(path) ? 'docs' : /(?:full-suite|all-in-one|loan-suite|renovation-suite)/.test(path) ? 'full' : 'home';
  const css = document.createElement('style');
  css.id = 'mtgcalc-5512-css';
  css.textContent =
    /* navigation: compact pill, slides away while scrolling down */
    '#los55Nav,#suiteNav{display:none!important}' +
    '#mtgcalcPageNav{position:fixed;right:14px;bottom:12px;z-index:9000;display:flex;gap:2px;padding:3px;background:var(--surface,#132942);border:1px solid var(--line,#30465f);border-radius:24px;box-shadow:0 3px 12px #0003;max-width:calc(100vw - 20px);transition:transform .18s ease,opacity .18s ease}' +
    '#mtgcalcPageNav.mtgcalc-away{transform:translateY(calc(100% + 16px));opacity:0;pointer-events:none}' +
    '#mtgcalcPageNav a{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;font:600 11px/1.2 system-ui,sans-serif;color:var(--text,#cddced);text-decoration:none;white-space:nowrap}' +
    '#mtgcalcPageNav a:hover{background:#ffffff1a}#mtgcalcPageNav a[aria-current]{background:#226ccc;color:#fff}' +
    '#mtgcalcPageNav svg{width:13px;height:13px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}' +
    'body{padding-bottom:52px}' +
    '@media(max-width:760px){#mtgcalcPageNav{right:6px;left:6px;bottom:6px;justify-content:space-between}#mtgcalcPageNav a{padding:7px 8px;font-size:10px}#mtgcalcPageNav a span{display:none}#mtgcalcPageNav a[aria-current] span{display:inline}}' +
    '@media print{#mtgcalcPageNav{display:none!important}}' +
    /* suite: compact cards outside Full view (from 55.11) */
    '#suite-root:not(.v25-full-active) .v44-metric-strip,#suite-root:not(.v25-full-active) .v20-kpis{gap:6px!important}' +
    '#suite-root:not(.v25-full-active) .v44-metric-strip>*,#suite-root:not(.v25-full-active) .v20-kpis>button{min-height:50px!important;padding:8px 10px!important;border-radius:9px!important}' +
    '#suite-root:not(.v25-full-active) .v44-metric-strip b,#suite-root:not(.v25-full-active) .v20-kpis b{font-size:16px!important}' +
    '#suite-root:not(.v25-full-active) .v22-metric-icon{width:25px!important;height:25px!important}#suite-root:not(.v25-full-active) .v20-kpis>button{padding-left:42px!important}' +
    '#suite-root .v20-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}#suite-root .v20-grid .wide{grid-column:span 2}#suite-root .v20-grid input{width:100%;min-width:0}#suite-root .v20-grid .field{min-width:0}' +
    '@media(max-width:900px){#suite-root .v20-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
    /* 55.12 declutter: the second metric row repeats the four stat cards directly above it */
    '#suite-root #v44PunchIn #v46Extra,#v44PunchIn #v46Extra{display:none!important}' +
    /* empty sub-tab band in Full view */
    '#suite-root.v25-full-active .chrome .tabs.v23-context-tabs,#suite-root.v25-full-active .v23-context-tabs.v48-context{display:none!important}' +
    /* in-page Renovation / Max mortgage switch repeats the sub-tabs above it */
    'html[data-v50] body #suite-root nav#v35LinkedSubnav,html body #suite-root nav#v35LinkedSubnav.v35-linked-subtabs{display:none!important}' +
    /* Live Summary carries the same hint twice */
    '#suite-root .rail .v39-rail>.body>.note,body .rail .v39-rail>.body>.note{display:none!important}';
  document.head.appendChild(css);

  function mount() {
    if (document.getElementById('mtgcalcPageNav')) return;
    const nav = document.createElement('nav'); nav.id = 'mtgcalcPageNav'; nav.setAttribute('aria-label', 'Mortgage tools');
    nav.innerHTML = pages.map(([id, label, url, icon]) => `<a href="${url}" title="${label}" ${id === active ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"/></svg><span>${label}</span></a>`).join('');
    nav.addEventListener('click', (event) => {
      const link = event.target.closest('a'); if (!link) return;
      try { window.MtgcalcSync && window.MtgcalcSync.syncNow(); } catch (_) {}
      try { const token = window.LOS55 && LOS55.Shared && LOS55.Shared.token(); if (token) link.href = link.getAttribute('href').split('#')[0] + '#los55=' + token; } catch (_) {}
    });
    document.body.appendChild(nav);
    // Hide while scrolling down so it never sits over a field; show on scroll up or at the end.
    let last = window.scrollY, ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY, atEnd = y + innerHeight >= document.documentElement.scrollHeight - 80;
        if (Math.abs(y - last) > 6) { nav.classList.toggle('mtgcalc-away', y > last && y > 120 && !atEnd); last = y; }
        ticking = false;
      });
    }, { passive: true });
    nav.addEventListener('focusin', () => nav.classList.remove('mtgcalc-away'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();

  // Moving a header field to its current position still blurs it in Chromium.
  // Skip those no-op moves while keeping real layout changes intact.
  function guardHeaderMoves() {
    document.querySelectorAll('#suite-root .topbar, #v25HeaderMain').forEach(host => {
      if (host.__mtgcalcMoveGuard) return;
      host.__mtgcalcMoveGuard = true;
      const insert = host.insertBefore.bind(host), append = host.appendChild.bind(host);
      host.insertBefore = function(node, reference) {
        if (node.parentNode === this && (node === reference || node.nextSibling === reference)) return node;
        return insert(node, reference);
      };
      host.appendChild = function(node) {
        if (node.parentNode === this && node === this.lastChild) return node;
        return append(node);
      };
    });
  }

  /* FHA annual MIP follows the HUD table (term, base-loan band, LTV) until the user picks a
     rate; picking the table rate again returns the file to automatic. */
  (function hookSuite(tries) {
    const s = window.mortgageSuite && window.mortgageSuite.store;
    if (!s) { if (/(?:full-suite|all-in-one|loan-suite)/.test(path) && tries < 60) setTimeout(() => hookSuite(tries + 1), 250); return; }
    if (s.__v5512) return; s.__v5512 = true;
    guardHeaderMoves();
    const setField = s.setField.bind(s);
    s.setField = function (field, value) {
      if (field === 'fhaAnnualMipRate') {
        try { const sug = s.outputs.payment.fhaMipSuggestedRate; s.activeInputs.fhaMipManual = !(sug > 0 && Math.abs(Number(value) - sug) < 1e-9); } catch (_) {}
      }
      return setField.apply(s, arguments);
    };
    let pending = false;
    const sync = () => {
      try {
        const i = s.activeInputs, o = s.outputs;
        if (!o || !o.isFha || i.fhaMipManual || Number(i.fhaMipOverrideRate) > 0) return;
        const r = o.payment && o.payment.fhaMipRateUsed;
        if (r > 0 && Number(i.fhaAnnualMipRate) !== r) { i.fhaAnnualMipRate = r; if (!pending) { pending = true; setTimeout(() => { pending = false; s.emit(); }, 0); } }
      } catch (_) {}
    };
    s.subscribe(() => { guardHeaderMoves(); sync(); }); sync();
  })(0);
})();
