/* Mortgage Suite 57.20 - removing mortgage insurance on a Conventional loan.
   When the total loan after renovations is under 80% of the after-repair value (or the value), a green notice in the
   Live summary says MI can be removed. Clicking it opens the MI settings (Setup), where "Remove mortgage insurance" is
   ticked by hand - it is never on by default, and it only counts while the loan stays under 80% (the engine checks). */
(function () {
  'use strict';
  if (window.MTMi) return;
  function st() { try { return window.mortgageSuite.store; } catch (e) { return null; } }
  function pct(v) { return (Math.round(v * 1000) / 10).toFixed(1) + '%'; }
  function css() {
    if (document.getElementById('mtMiCss')) return;
    var s = document.createElement('style'); s.id = 'mtMiCss';
    s.textContent = '.mt-mi-note{display:block;width:100%;text-align:left;margin:8px 0;padding:9px 11px;border-radius:9px;border:1px solid #1f8f55;background:#0e3a26;color:#d6f5e3;font:12.5px/1.4 inherit;cursor:pointer}' +
      '.mt-mi-note b{display:block;color:#7ff0b1;font-size:13px}.mt-mi-note:hover{background:#125033}' +
      '.mt-mi-note.warn{border-color:#b5832a;background:#3a2c0e;color:#f5e6c8}.mt-mi-note.warn b{color:#f0c46b}' +
      'html[data-mt-mode=light] .mt-mi-note{background:#e7f8ee;color:#14532d;border-color:#34a868}html[data-mt-mode=light] .mt-mi-note b{color:#15803d}' +
      '.mt-mi-flash{outline:3px solid #34d17a!important;outline-offset:3px;transition:outline-color .5s}';
    document.head.appendChild(s);
  }
  function data() {
    var s = st(); if (!s) return null;
    try { var o = typeof s.outputs === 'function' ? s.outputs() : s.outputs, i = s.activeInputs; return o && o.payment && i ? {o: o, i: i, s: s} : null; } catch (e) { return null; }
  }
  function paint() {
    var d = data(), box = document.getElementById('v44LiveSummary');
    if (!box) return;
    var n = box.querySelector('.mt-mi-note');
    if (!d) return;
    var p = d.o.payment, conv = d.i.loanProgram === 'Conventional', show = conv && (p.miRemovalEligible || p.miRemovalRequested);
    if (!show) { if (n) n.remove(); return; }
    css();
    if (!n) {
      n = document.createElement('button'); n.type = 'button'; n.className = 'mt-mi-note no-print'; n.onclick = openMi;
      var v = box.querySelector('.v50-verdict'); box.insertBefore(n, v ? v.nextSibling : box.firstChild);
    }
    var t = p.miRemoved ? '<b>Mortgage insurance removed</b>Total loan is ' + pct(p.miRemovalLtv) + ' of value (under 80%). Click to change it in the MI settings.'
      : p.miRemovalEligible ? '<b>MI can be removed</b>Total loan after renovations is ' + pct(p.miRemovalLtv) + ' of the ' + (d.o.renovationActive ? 'after-repair value' : 'value') + ' (under 80%). Click to open the MI settings and remove it.'
      : '<b>MI removal is ticked but not applied</b>Total loan is ' + pct(p.miRemovalLtv) + ' of value - it must be under 80% for MI to come off.';
    if (n.__t !== t) { n.__t = t; n.innerHTML = t; }
    n.classList.toggle('warn', !p.miRemovalEligible);
  }
  function field() { return document.querySelector('[data-path="removeMi"]'); }
  function reach(el) {
    var tgt = el.closest('label, .field, .row') || el;
    try { tgt.scrollIntoView({block: 'center', behavior: 'smooth'}); } catch (e) {}
    tgt.classList.add('mt-mi-flash'); setTimeout(function () { tgt.classList.remove('mt-mi-flash'); }, 2200);
    try { el.focus({preventScroll: true}); } catch (e) {}
  }
  function openMi() {
    var d = data(); if (!d) return;
    try { if (d.s.navigate) d.s.navigate({tab: 'setup', section: 'setup', field: 'removeMi', label: 'Mortgage insurance'}); } catch (e) {}
    setTimeout(function () {
      var el = field();
      if (el && el.getClientRects().length) reach(el);
      else if (!/loan-suite-setup/.test(location.pathname)) location.href = 'loan-suite-setup.html#mtfield=removeMi';
    }, 600);
  }
  function arrive() {
    if (!/mtfield=removeMi/.test(location.hash)) return;
    var tries = 0; (function wait() { var el = field(); if (el && el.getClientRects().length) { reach(el); return; } if (++tries < 40) setTimeout(wait, 250); })();
  }
  var t = 0; function soon() { clearTimeout(t); t = setTimeout(paint, 120); }
  function start() {
    var tries = 0;
    (function hook() {
      var s = st();
      if (s && s.subscribe) { try { s.subscribe(soon); } catch (e) {} paint(); arrive(); return; }
      if (++tries < 60) setTimeout(hook, 250);
    })();
    setInterval(function () { if (!document.hidden) paint(); }, 4000);   /* the summary box is rebuilt by its own code now and then */
  }
  window.MTMi = {paint: paint, open: openMi};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
