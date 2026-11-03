/* Loan Suite split pages: open this file's tab, give real links to the other pages, and keep the page on its tab.
   Configured per page by window.LOS_EMBED = {page, title, pages:[{id,file,label,group,title}], groups:[{id,label}]}.
   URL options: ?nav=0 hides the page navigation (for sites with their own menu); ?chrome=bare shows only the page content. */
(function () {
  'use strict';
  var E = window.LOS_EMBED || {};

  /* ---- scenario names: at most 40 characters, everywhere (typed, automatic, imported or already saved) ---- */
  var NAME_MAX = 40;
  function compactName(n) {
    n = String(n == null ? '' : n).replace(/\s+/g, ' ').trim();
    if (n.length <= NAME_MAX) return n;
    var m = n.match(/^(\$[\d,]+) - (-?[\d.]+)% - ([\d.]+)% - (.+)$/);          /* the automatic "$Loan - LTV% - Rate% - Program" form */
    if (m) {
      var tries = [[2, 3], [1, 3], [1, 2], [0, 3], [0, 2]];
      for (var k = 0; k < tries.length; k++) {
        var t = m[1] + ' - ' + (+m[2]).toFixed(tries[k][0]) + '% - ' + (+m[3]).toFixed(tries[k][1]) + '% - ' + m[4];
        if (t.length <= NAME_MAX) return t;
      }
    }
    return n.slice(0, NAME_MAX).replace(/[\s\-\u00b7,]+$/, '');
  }
  window.LOS_NAME_COMPACT = compactName;
  (function guardNames(tries) {
    var st = null; try { st = window.mortgageSuite && window.mortgageSuite.store; } catch (e) {}
    if (!st || !st.setField) { if (tries < 200) setTimeout(function () { guardNames(tries + 1); }, 100); return; }
    if (st.__nameGuard) return; st.__nameGuard = true;
    var sf = st.setField;
    st.setField = function (path, value) { if (path === 'name' && typeof value === 'string') arguments[1] = compactName(value); return sf.apply(this, arguments); };
    function sweep() {
      Array.prototype.forEach.call(document.querySelectorAll('input.namebox, input[data-path="name"]'), function (i) { if (i.maxLength !== NAME_MAX) i.maxLength = NAME_MAX; });
      var n = st.activeInputs && st.activeInputs.name;
      if (typeof n === 'string' && n.length > NAME_MAX) st.setField('name', n, 'Name limited to 40 characters');
    }
    sweep(); if (st.subscribe) st.subscribe(function () { setTimeout(sweep, 0); });
  })(0);

  /* ---- v54-style builds: the scenario name field lost focus on every keystroke (each letter saved the name and the save
     re-rendered the header, replacing the field), so only the first letter could be typed. Type freely; save on leaving
     the field or pressing Enter. ---- */
  if (E.legacy) {
    var isName = function (t) { return t && t.classList && t.classList.contains('namebox'); };
    window.addEventListener('input', function (e) { if (isName(e.target)) e.stopImmediatePropagation(); }, true);
    window.addEventListener('change', function (e) {
      if (!isName(e.target)) return; e.stopImmediatePropagation();
      var st = null; try { st = window.mortgageSuite && window.mortgageSuite.store; } catch (x) {}
      if (st && st.renameScenario) st.renameScenario(e.target.value);
    }, true);
    window.addEventListener('keydown', function (e) { if (e.key === 'Enter' && isName(e.target)) e.target.blur(); }, true);
  }

  /* ---- v54-style builds: keep the Income Calculator's state between pages through its own autosave ---- */
  if (E.persistCalc) (function keep(t) {
    var calc = null; try { calc = (0, eval)('S'); } catch (e) {}
    if (!calc || !calc.settings) { if (t < 200) setTimeout(function () { keep(t + 1); }, 50); return; }
    if (!calc.settings.autosave) {
      calc.settings.autosave = true;
      try { (0, eval)('writeAutosave')(); } catch (e) {}
      var tg = document.getElementById('autosaveTgl'); if (tg) tg.checked = true;
    }
  })(0);

  /* ---- the Income workspace inside the Loan Suite is the classic calculator: point to the up-to-date one ---- */
  (function classicNote(t) {
    if (E.persistCalc) return;                                        /* v54-era builds have no separate calculator */
    var main = document.querySelector('#calc-root main') || document.getElementById('calc-root');
    if (!main) { if (t < 100) setTimeout(function () { classicNote(t + 1); }, 150); return; }
    if (document.getElementById('mtClassicNote')) return;
    var n = document.createElement('div'); n.id = 'mtClassicNote'; n.className = 'no-print';
    n.setAttribute('style', 'margin:10px auto 0;max-width:1480px;padding:10px 14px;border-radius:10px;background:#e4eefb;border:1px solid #cfe0f5;color:#17436f;font:600 13px/1.45 Inter,-apple-system,Segoe UI,Roboto,sans-serif');
    n.innerHTML = 'This is the classic Income Calculator built into the Loan Suite. The up-to-date Income Calculator calculates exactly like the income worksheet and shares this loan file: <a href="income-calculator.html" style="color:#1d4ed8;text-decoration:underline">open it</a>.';
    main.insertBefore(n, main.firstChild);
  })(0);

  if (!E.page) return;

  /* ---- the Income Calculator page built from the app: stay on the Income workspace ---- */
  if (E.page === 'income') {
    document.documentElement.classList.add('lse', 'lse-income');
    var ua = 0;
    ['pointerdown', 'keydown'].forEach(function (n) { document.addEventListener(n, function (e) { if (e.isTrusted) ua = Date.now(); }, true); });
    var leaving = false;
    setInterval(function () {
      if (leaving || document.body.dataset.shellMode !== 'suite') return;
      if (Date.now() - ua < 1600) { leaving = true; location.href = 'loan-suite-quote.html'; }
      else if (window.SHELL && SHELL.go) SHELL.go('calc');
    }, 300);
    (function strip(t) {
      var bar = document.querySelector('#calc-root .appbar');
      if (!bar) { if (t < 100) setTimeout(function () { strip(t + 1); }, 100); return; }
      if (document.getElementById('lseNav')) return;
      var nav = document.createElement('nav'); nav.id = 'lseNav'; nav.setAttribute('aria-label', 'Mortgage Suite pages');
      nav.innerHTML = '<div class="lse-row lse-groups"><a class="lse-g on" aria-current="page" href="income-calculator.html">Income Calculator</a>' +
        '<a class="lse-g" href="loan-suite-quote.html">Loan Suite</a><a class="lse-g lse-all" href="index.html">Home</a><a class="lse-g" href="full-suite.html">Full Suite</a></div>';
      bar.parentNode.insertBefore(nav, bar.nextSibling);
    })(0);
    return;
  }
  var me = E.pages.filter(function (p) { return p.id === E.page; })[0]; if (!me) return;
  var q = new URLSearchParams(location.search), root = document.documentElement;
  root.classList.add('lse', 'lse-' + me.id);
  if (q.get('nav') === '0') root.classList.add('lse-nonav');
  if (q.get('chrome') === 'bare') root.classList.add('lse-bare');

  var byLabel = {}; E.pages.forEach(function (p) { byLabel[p.label] = p; });
  function store() { try { return window.mortgageSuite && window.mortgageSuite.store; } catch (e) { return null; } }
  function activeLabel() { var t = document.querySelector('#suite-root .tabs .tab.active'); return t ? t.textContent.trim().toUpperCase() : ''; }
  function tabFor(label) { return Array.prototype.filter.call(document.querySelectorAll('#suite-root .tabs .tab'), function (t) { return t.textContent.trim().toUpperCase() === label; })[0]; }
  function groupFor(g) { return Array.prototype.filter.call(document.querySelectorAll('#v23SuitePrimaryNav button[data-group="' + g + '"]'), function (b) { return !b.classList.contains('v50-documents-duplicate'); })[0]; }
  function fullOn() { var r = document.getElementById('suite-root'); return !!(r && r.classList.contains('v25-full-active')); }
  /* what "this page is showing" means, per page */
  var CALC_PAGES = {'documents-ocr':1, 'documents-worksheets':1};
  /* pages that are one of the engine's own screens: open them by mode, check them by mode */
  var MODE = {quote:'quote', setup:'setup', renovation:'renovation', 'max-mortgage':'maxmortgage', 'closing-costs':'closing', escrow:'escrow',
              qualify:'qualify', rental:'rental', advanced:'advanced', scenarios:'scenarios', summary:'summary'};
  function calcDocsShown() { var t = document.querySelector('#calc-root .tab.active[data-tab="docs"], #calc-root [data-tab="docs"].active'); return document.body.dataset.shellMode === 'calc' && !!t; }
  function onPage() {
    if (fullOn()) return false;
    if (CALC_PAGES[me.id]) return calcDocsShown();
    if (document.body.dataset.shellMode === 'calc') return false;
    if (me.id === 'credit') return activeLabel() === 'CREDIT' && !!document.querySelector('#suite-root.v50-credit-active');
    if (MODE[me.id]) { var st = store(); return !!st && st.snapshot.mode === MODE[me.id] && !document.querySelector('#suite-root.v47-parked'); }
    return activeLabel() === me.label;
  }
  if (CALC_PAGES[me.id]) root.classList.add('lse-calcdocs');

  /* ---- go to another split page, carrying the latest values ---- */
  function go(file) {
    if (go.busy) return; go.busy = true;
    try { window.MtgcalcSync && window.MtgcalcSync.syncNow(); } catch (e) {}
    var hash = ''; try { var t = window.LOS55 && LOS55.Shared && LOS55.Shared.token(); if (t) hash = '#los55=' + t; } catch (e) {}
    var keep = []; ['nav', 'chrome'].forEach(function (k) { if (q.get(k)) keep.push(k + '=' + encodeURIComponent(q.get(k))); });
    location.href = file + (keep.length ? '?' + keep.join('&') : '') + hash;
  }

  /* ---- open this page's tab once the app has booted ---- */
  var tries = 0, settled = false, attempts = 0;
  function open() {
    if (!store() || !document.getElementById('v23SuitePrimaryNav') || !tabFor(me.label)) { if (tries++ < 150) setTimeout(open, 100); return; }
    if (onPage()) { settled = true; paint(); if (me.id === 'draft-le') draftLE();
      if (me.id === 'scenarios') setTimeout(function () { Array.prototype.forEach.call(document.querySelectorAll('#screen-body .card.collapsible.closed > h3'), function (h) { h.click(); }); }, 200);   /* a page for scenarios opens its card */
      return; }
    if (attempts++ > 8) { settled = true; paint(); return; }
    if (fullOn()) { var f = groupFor('full'); if (f) f.click(); }
    if (document.body.dataset.shellMode === 'calc' && !CALC_PAGES[me.id] && window.SHELL && SHELL.go) SHELL.go('suite');
    if (MODE[me.id]) {
      var sm = store(); if (document.querySelector('#suite-root.v47-parked')) { var tq = tabFor(me.label); if (tq) tq.click(); }
      if (sm.snapshot.mode !== MODE[me.id]) sm.setMode(MODE[me.id]);
      setTimeout(open, 500); return;
    }
    if (me.id === 'credit') { var st = store(); if (st.snapshot.mode !== 'qualify') st.setMode('qualify'); setTimeout(function () { openCredit(); setTimeout(open, 500); }, 400); return; }
    setTimeout(function () {
      var g = groupFor(me.group); if (g && activeGroup() !== me.group) g.click();
      setTimeout(function () { var t = tabFor(me.label); if (t) t.click(); setTimeout(open, 700); }, 350);
    }, fullOn() ? 400 : 50);
  }
  function activeGroup() { var b = document.querySelector('#v23SuitePrimaryNav button[data-group].active, #v23SuitePrimaryNav button[data-group][aria-pressed="true"]'); return b ? b.dataset.group : ''; }

  /* ---- stay on this page: a user click that lands elsewhere loads that page; internal drift is put back ---- */
  var userAt = 0, restores = 0;
  ['pointerdown', 'keydown'].forEach(function (n) { document.addEventListener(n, function (e) { if (e.isTrusted) userAt = Date.now(); }, true); });
  function check() {
    if (!settled || go.busy) return;
    if (onPage()) return;
    var recent = Date.now() - userAt < 1600;
    if (recent && document.body.dataset.shellMode === 'calc') return go(CALC_PAGES[me.id] ? 'income-calculator.html' : 'income-calculator.html');
    var target = byLabel[activeLabel()];
    if (recent && target && target.id !== me.id) return go(target.file);
    if (restores++ < 8) { settled = false; tries = 0; open(); }
  }
  setInterval(check, 300);

  /* ---- page navigation: groups, then the pages in this group, all real links ---- */
  function paint() {
    if (document.getElementById('lseNav')) return;
    var nav = document.createElement('nav'); nav.id = 'lseNav'; nav.setAttribute('aria-label', 'Loan Suite pages');
    var groups = E.groups.map(function (g) {
      var first = E.pages.filter(function (p) { return p.group === g.id; })[0];
      return '<a class="lse-g' + (g.id === me.group ? ' on' : '') + '" href="' + first.file + '"' + (g.id === me.group ? ' aria-current="true"' : '') + '>' + g.label + '</a>';
    }).join('') + '<a class="lse-g lse-all" href="index.html">Home</a><a class="lse-g" href="income-calculator.html">Income Calculator</a><a class="lse-g" href="full-suite.html">Full Suite</a>';
    var pages = E.pages.filter(function (p) { return p.group === me.group; }).map(function (p) {
      return '<a class="lse-p' + (p.id === me.id ? ' on' : '') + '" href="' + p.file + '"' + (p.id === me.id ? ' aria-current="page"' : '') + '>' + p.title + '</a>';
    }).join('');
    nav.innerHTML = '<div class="lse-row lse-groups">' + groups + '</div><div class="lse-row lse-pages">' + pages + '</div>';
    nav.addEventListener('click', function (e) { var a = e.target.closest('a'); if (!a || a.getAttribute('aria-current') === 'page') { if (a) e.preventDefault(); return; } e.preventDefault(); go(a.getAttribute('href')); });
    var host = document.getElementById('v23SuitePrimaryNav'), bar = document.querySelector('#calc-root .appbar');
    if (CALC_PAGES[me.id] && bar && bar.parentNode) bar.parentNode.insertBefore(nav, bar.nextSibling);      /* Documents pages live in the income workspace */
    else if (host && host.parentNode) host.parentNode.insertBefore(nav, host); else document.body.insertBefore(nav, document.body.firstChild);
    document.title = me.title + ' · Loan Suite';
  }
  /* the same steps the app's own Credit tab takes: open the credit dialog and seat it in the page */
  function openCredit() {
    if (!window.V12 || !V12.open) return false;
    var n = document.getElementById('v12Modal'), o = document.getElementById('screen-body'), r = document.getElementById('suite-root');
    if (n && n.classList.contains('v50-credit-page') && o && o.contains(n)) return true;
    V12.open(); n = document.getElementById('v12Modal'); if (!n || !o || !r) return false;
    o.insertBefore(n, o.firstChild); r.classList.add('v50-credit-active'); n.classList.add('v50-credit-page', 'on'); n.removeAttribute('aria-hidden'); document.body.style.overflow = '';
    var ttl = n.querySelector('.rpt-modal-bar .ttl'); if (ttl) ttl.textContent = 'Credit workspace';
    var btns = n.querySelectorAll('.rpt-modal-bar button'), back = btns[btns.length - 1];
    if (back && !back.dataset.lseBack) { back.dataset.lseBack = '1'; back.removeAttribute('onclick'); back.onclick = null; back.textContent = 'Back to Qualify';
      back.addEventListener('click', function (e) { e.stopImmediatePropagation(); go('loan-suite-qualify.html'); }, true); }
    Array.prototype.forEach.call(document.querySelectorAll('#suite-root .tabs .tab'), function (t) { t.classList.toggle('active', t.textContent.trim().toUpperCase() === 'CREDIT'); });
    return true;
  }
  function captureLE() {
    if (!window.LOANSUITE || !LOANSUITE.printLE) return '';
    var html = '', real = window.open, fake = {closed: false, focus: function () {}, print: function () {}, close: function () {}, addEventListener: function () {},
      document: {write: function (h) { html += h; }, writeln: function (h) { html += h + '\n'; }, open: function () {}, close: function () {}}};
    window.open = function () { return fake; };
    try { LOANSUITE.printLE(); } catch (e) {} finally { window.open = real; }
    return html;
  }
  var leTimer = 0, lastLE = '';
  function draftLE() {
    var main = document.querySelector('#suite-root .v31-main') || document.getElementById('screen-body'); if (!main) return;
    var card = document.getElementById('lseDraft');
    if (!card) {
      card = document.createElement('section'); card.id = 'lseDraft'; card.className = 'card';
      card.innerHTML = '<div class="lse-dh"><div><b>Draft Loan Estimate</b><span>Built from this loan file and updated as the file changes. Draft only, not the official Loan Estimate.</span></div>' +
        '<button type="button" class="lse-print">Print / Save PDF</button></div><iframe title="Draft Loan Estimate" class="lse-le"></iframe>';
      main.insertBefore(card, main.firstChild);
      card.querySelector('.lse-print').addEventListener('click', function () { var f = card.querySelector('iframe'); try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} });
      var st = store(); if (st && st.subscribe) st.subscribe(function () { clearTimeout(leTimer); leTimer = setTimeout(refreshLE, 600); });
    }
    refreshLE();
  }
  function refreshLE() {
    var html = captureLE(), f = document.querySelector('#lseDraft iframe'); if (!f) return;
    if (!html) { if (!lastLE) setTimeout(refreshLE, 800); return; }
    if (html === lastLE) return; lastLE = html;
    var y = 0; try { y = f.contentWindow.scrollY; } catch (e) {}
    f.srcdoc = html;
    f.onload = function () { try { var d = f.contentDocument; f.style.height = Math.max(900, d.documentElement.scrollHeight + 20) + 'px'; f.contentWindow.scrollTo(0, y); } catch (e) {} };
  }
  window.LoanSuitePage = { page: me, go: go, onPage: onPage, pages: E.pages, captureLE: captureLE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(open, 300); }); else setTimeout(open, 300);
})();
