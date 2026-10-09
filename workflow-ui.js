/* Release 55.11: fixed navigation and compact loan workspace. */
(function () {
  'use strict';
  const pages = [
    ['home','Home','index.html','M3 10l9-7 9 7v11H3z M9 21v-8h6v8'],
    ['quick','Quick','quick.html','M13 2L4 14h7l-1 8 10-13h-7z'],
    ['docs','Doc Organizer','doc-organizer.html','M6 3h8l4 4v14H6z M14 3v5h5 M9 13h6 M9 17h6'],
    ['income','Income Calculator','income-calculator.html','M5 3h14v18H5z M8 7h8 M8 11h2 M14 11h2 M8 15h2 M14 15h2'],
    ['full','Full Suite','full-suite.html','M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z']
  ];
  const path = location.pathname;
  const active = /income-calculator/.test(path) ? 'income' : /quick/.test(path) ? 'quick' : /doc-organizer/.test(path) ? 'docs' : /(?:full-suite|all-in-one|loan-suite|renovation-suite)/.test(path) ? 'full' : 'home';
  const css = document.createElement('style');
  css.textContent = `#los55Nav{display:none!important}#mtgcalcPageNav{position:fixed;right:16px;bottom:14px;z-index:9000;display:flex;gap:3px;padding:5px;background:var(--surface,#132942);border:1px solid var(--line,#30465f);border-radius:30px;box-shadow:0 4px 16px #0002;max-width:calc(100vw - 24px)}#mtgcalcPageNav a{display:flex;align-items:center;gap:5px;padding:7px 11px;border-radius:24px;font:600 11px/1.2 system-ui,sans-serif;color:var(--text,#cddced);text-decoration:none;white-space:nowrap}#mtgcalcPageNav a[aria-current]{background:#226ccc;color:#fff}#mtgcalcPageNav svg{width:14px;height:14px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}body{padding-bottom:64px}#suite-root:not(.v25-full-active) .v44-metric-strip,#suite-root:not(.v25-full-active) .v20-kpis{gap:6px!important}#suite-root:not(.v25-full-active) .v44-metric-strip>*,#suite-root:not(.v25-full-active) .v20-kpis>button{min-height:50px!important;padding:8px 10px!important;border-radius:9px!important}#suite-root:not(.v25-full-active) .v44-metric-strip b,#suite-root:not(.v25-full-active) .v20-kpis b{font-size:16px!important}#suite-root:not(.v25-full-active) .v22-metric-icon{width:25px!important;height:25px!important}#suite-root:not(.v25-full-active) .v20-kpis>button{padding-left:42px!important}#suite-root .v20-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}#suite-root .v20-grid .wide{grid-column:span 2}#suite-root .v20-grid input{width:100%;min-width:0}#suite-root .v20-grid .field{min-width:0}@media(max-width:900px){#suite-root .v20-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){#mtgcalcPageNav{right:8px;bottom:8px;overflow-x:auto}#mtgcalcPageNav a{padding:8px;font-size:10px}#mtgcalcPageNav svg{display:none}}@media print{#mtgcalcPageNav{display:none!important}}`;
  document.head.appendChild(css);
  function mount() {
    if (document.getElementById('mtgcalcPageNav')) return;
    const nav = document.createElement('nav');nav.id='mtgcalcPageNav';nav.setAttribute('aria-label','Mortgage tools');
    nav.innerHTML = pages.map(([id,label,url,icon]) => `<a href="${url}" ${id===active?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"/></svg><span>${label}</span></a>`).join('');
    nav.addEventListener('click',event=>{
      const link=event.target.closest('a');if(!link)return;
      try { window.MtgcalcSync && window.MtgcalcSync.syncNow(); } catch (_) {}
      try { const token=window.LOS55 && LOS55.Shared && LOS55.Shared.token();if(token)link.href=link.getAttribute('href').split('#')[0]+'#los55='+token; } catch (_) {}
    });
    document.body.appendChild(nav);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
