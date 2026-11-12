/* Mortgage Suite 56.7 - search everything (Ctrl/Cmd+K, or the Search button).
   Finds pages, calculator tabs, document builders and their layouts, and - on the open page - section headings, fields
   and the options inside drop-down lists. Pages that are not open are found from a small built-in index, so nothing has
   to load first; choosing one opens that page and goes straight to the field. Choosing a drop-down option sets it. */
(function () {
  'use strict';
  if (window.MTSearch) return;
  var IC = 'income-calculator.html';
  /* pages and what is on them (the words people search for) */
  var PAGES = [
    ['index.html', 'Quick quote', 'quick price down payment rate payment zip estimate taxes insurance renovation loan estimate home'],
    [IC, 'Income Calculator', 'income w-2 salary hourly overtime bonus commission variable base schedule c self-employed 1065 1120 s-corp partnership schedule e rental other income va non-qm bank statement dscr asset depletion dti aus findings summary guidelines income report'],
    [IC + '#tab=w2', 'Income Calculator - W-2 & salary', 'w-2 salary hourly overtime ot bonus commission ytd year to date pay rate base variable retro annual bonus job employer'],
    [IC + '#tab=schc', 'Income Calculator - Schedule C', 'schedule c sole proprietor self-employed net profit depreciation depletion meals business use of home mileage 1084'],
    [IC + '#tab=corp', 'Income Calculator - 1065 / 1120-S / 1120', 'partnership k-1 s corporation 1120s 1065 corporation ordinary income guaranteed payments'],
    [IC + '#tab=sche', 'Income Calculator - Schedule E', 'schedule e rental income rents depreciation insurance mortgage interest property'],
    [IC + '#tab=other', 'Income Calculator - Other income & Non-QM', 'other income social security pension alimony child support disability non-qm bank statement dscr profit and loss'],
    [IC + '#tab=assets', 'Income Calculator - Assets', 'assets asset depletion retirement bank statements large deposits reserves gift'],
    [IC + '#tab=dti', 'Income Calculator - PITIA & DTI', 'pitia dti debt to income housing payment liabilities taxes insurance mi'],
    [IC + '#tab=docs', 'Income Calculator - Documents & OCR', 'documents ocr import paystub w-2 tax return scan paste screenshot'],
    [IC + '#tab=aus', 'Income Calculator - AUS findings', 'aus du lpa findings casefile'],
    [IC + '#tab=va', 'Income Calculator - VA income', 'va residual income entitlement funding fee family size region'],
    [IC + '#tab=rates', 'Income Calculator - Mortgage rates', 'mortgage rates daily survey mnd'],
    [IC + '#tab=taxes', 'Income Calculator - Taxes & escrow', 'taxes escrow proration billing cycle county tax'],
    [IC + '#tab=summary', 'Income Calculator - Summary & guidelines', 'summary underwriting guidelines agency fannie freddie fha va stipulations'],
    ['full-suite.html', 'Full Suite', 'full suite loan suite all pages'],
    ['loan-suite-quote.html', 'Loan Suite - Quote & Setup', 'quote setup borrower property address price program occupancy units down payment rate term'],
    ['loan-suite-setup.html', 'Loan Suite - Setup', 'setup borrower property zip state county program renovation transaction'],
    ['loan-suite-renovation.html', 'Loan Suite - Renovation', 'renovation rehab budget contingency consultant fee permits architectural engineering inspection fee title update supplemental origination draws draw schedule holdback material release financed payments payment reserve arv after repair value homestyle 203k'],
    ['loan-suite-property.html', 'Loan Suite - Property', 'property value as-is arv after repair appraisal units'],
    ['loan-suite-max-mortgage.html', 'Loan Suite - Max Mortgage', 'maximum mortgage worksheet mmw 92700 value basis fha limit county limit ltv'],
    ['loan-suite-mortgage-rates.html', 'Loan Suite - Mortgage Rates', 'mortgage rates mnd mortgage news daily rate'],
    ['loan-suite-closing-costs.html', 'Loan Suite - Closing Costs', 'closing costs fees title appraisal attorney recording transfer tax mortgage tax points origination seller concession credit'],
    ['loan-suite-escrow.html', 'Loan Suite - Escrow', 'escrow aggregate cushion initial deposit first payment tax pickup insurance pickup'],
    ['loan-suite-taxes-proration.html', 'Loan Suite - Taxes & Proration', 'taxes proration property tax exemption star tax pickup escrow pickup'],
    ['loan-suite-qualify.html', 'Loan Suite - Qualify', 'qualify dti income debts reserves assets credit score aus'],
    ['loan-suite-rental.html', 'Loan Suite - Rental', 'rental income units adu self-sufficiency vacating rental 75%'],
    ['loan-suite-credit.html', 'Loan Suite - Credit', 'credit score tradelines'],
    ['loan-suite-advanced.html', 'Loan Suite - Advanced', 'advanced overrides mi pmi mip ufmip rounding bps'],
    ['loan-suite-scenarios.html', 'Loan Suite - Scenarios', 'scenarios compare save load json history'],
    ['loan-suite-summary.html', 'Loan Suite - Summary', 'summary loan report print'],
    ['loan-suite-draft-le.html', 'Loan Suite - Draft LE', 'loan estimate draft le fees'],
    ['loan-suite-contract-le.html', 'Loan Suite - Contract & LE', 'contract loan estimate comparison'],
    ['loan-suite-documents-ocr.html', 'Loan Suite - Documents & OCR', 'documents ocr read figures ai import paste screenshot'],
    ['loan-suite-documents-worksheets.html', 'Loan Suite - Documents & Worksheets', 'worksheets documents ai prompts'],
    ['doc-organizer.html', 'Doc Organizer', 'organize rename split merge zip documents borrower dates duplicates']];
  var BUILDER_WORDS = {addendum: 'addendum amendment rider contract seller concession credit transfer tax price closing date', lease: 'lease rental agreement tenant landlord rent deposit', estimate: 'contractor estimate bid quote invoice scope renovation',
    pl: 'profit and loss p&l income statement self-employed', schc: 'schedule c cash flow self-employed 1084', pay: 'pay statement pay stub paystub earnings withholding', gift: 'gift letter donor gift of equity',
    le: 'loan estimate draft le closing cost details cash to close', commit: 'commitment letter conditions approval', mi: 'mortgage insurance mip pmi renovation fees draw fees'};

  /* ------------------------------------------------------------ the index */
  function norm(s) { return String(s || '').toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9&%$.\s-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function here(href) { var p = location.pathname.split('/').pop() || 'index.html'; return href.split('#')[0] === p; }
  /* a label's own words, without the text of the drop-down or field inside it */
  function ownText(node) { var c = node.cloneNode(true); [].forEach.call(c.querySelectorAll('select, option, input, textarea, button, datalist, small.hint, .note'), function (x) { x.remove(); }); return c.textContent.replace(/\s+/g, ' ').trim(); }
  function labelFor(el) {
    var t = [el.getAttribute('aria-label'), el.labels && el.labels[0] && ownText(el.labels[0]), el.getAttribute('placeholder'), el.getAttribute('title')];
    var p = el.parentElement; for (var k = 0; p && k < 2 && !t[1]; k++, p = p.parentElement) { var own = [].filter.call(p.childNodes, function (n) { return n.nodeType === 3 || (n.nodeType === 1 && /^(LABEL|SPAN|B|STRONG|SMALL|DIV)$/.test(n.tagName) && !n.querySelector('input,select,textarea') && n.textContent.length < 80); }).map(function (n) { return n.textContent; }).join(' ').trim(); if (own) { t[1] = own; break; } }
    var path = el.getAttribute('data-path') || el.getAttribute('data-k') || el.name || '';
    return {label: String(t[1] || t[0] || t[2] || t[3] || path).replace(/\s+/g, ' ').trim().slice(0, 90), extra: path.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._]/g, ' ')};
  }
  function skip(el) {
    if (el.closest('#mtSearch, #mtPasteTray, .mtA-list, .no-search')) return true;
    var b = el.closest('#mtB'); return !!(b && !b.classList.contains('open'));      /* a closed builder is searched through its own entries */
  }
  function liveEntries() {
    var out = [], seen = {};
    [].forEach.call(document.querySelectorAll('h1, h2, h3, legend, .card-top .doc-name, .section-head h2'), function (h) {
      if (skip(h)) return; var t = h.textContent.replace(/\s+/g, ' ').trim(); if (!t || t.length > 80 || seen['h' + t]) return; seen['h' + t] = 1;
      out.push({kind: 'Section', title: t, text: norm(t), el: h});
    });
    [].forEach.call(document.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=button]):not([type=submit]), select, textarea'), function (el) {
      if (skip(el)) return; var L = labelFor(el); if (!L.label || L.label.length < 2) return;
      var key = 'f' + L.label + (el.getAttribute('data-path') || ''); if (seen[key]) return; seen[key] = 1;
      out.push({kind: 'Field', title: L.label, text: norm(L.label + ' ' + L.extra), el: el});
      if (el.tagName === 'SELECT') [].forEach.call(el.options, function (o) {
        var ot = o.textContent.replace(/\s+/g, ' ').trim(); if (!ot || /^(choose|select|pick)/i.test(ot) || o.value === '') return;
        out.push({kind: 'Option', title: ot, sub: 'in ' + L.label, text: norm(ot + ' ' + L.label), el: el, value: o.value});
      });
    });
    return out;
  }
  function staticEntries() {
    var out = PAGES.map(function (p) { return {kind: 'Page', title: p[1], text: norm(p[1] + ' ' + p[2]), href: p[0]}; });
    var cat = window.MTBuild && MTBuild.catalog ? MTBuild.catalog() : [
      {type: 'addendum', label: 'Addendum'}, {type: 'lease', label: 'Lease agreement'}, {type: 'estimate', label: 'Contractor estimate'}, {type: 'pl', label: 'Profit and loss'}, {type: 'schc', label: 'Schedule C analysis'},
      {type: 'pay', label: 'Pay statement'}, {type: 'gift', label: 'Gift letter'}, {type: 'le', label: 'Loan Estimate draft'}, {type: 'commit', label: 'Commitment letter'}, {type: 'mi', label: 'MI & renovation fees'}];
    cat.forEach(function (c) {
      if (c.label && !c.presets) out.push({kind: 'Document', title: c.label, sub: 'Document builder', text: norm(c.label + ' document builder ' + (BUILDER_WORDS[c.type] || '')), builder: c.type});
      (c.styles || []).forEach(function (st) { out.push({kind: 'Layout', title: st[1], sub: c.label + ' layout', text: norm(st[1] + ' ' + c.label + ' style layout version'), builder: c.type, style: st[0]}); });
      (c.presets || []).forEach(function (pr) { out.push({kind: 'Sample scope', title: pr[1], sub: 'Contractor estimate', text: norm(pr[1] + ' contractor estimate sample scope'), builder: 'estimate', preset: pr[0]}); });
    });
    return out;
  }
  function score(e, words, q) {
    var s = 0; for (var i = 0; i < words.length; i++) { var w = words[i], last = i === words.length - 1; var re = new RegExp('(^|\\s)' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (last ? '' : '(\\s|$)')); if (re.test(e.text)) s += 3; else if (e.text.indexOf(w) >= 0) s += 1; else return 0; }
    var t = norm(e.title); if (t === q) s += 8; else if (t.indexOf(q) === 0) s += 5; else if (t.indexOf(q) >= 0) s += 3;
    s += {Field: 2.2, Option: 1.6, Section: 1.8, Document: 2, Layout: 1.2, 'Sample scope': 1, Page: 1.5}[e.kind] || 0;
    if (e.el && e.el.offsetParent) s += 0.5;
    return s;
  }
  function search(q) {
    q = norm(q); if (!q) return [];
    var words = q.split(' '), all = liveEntries().concat(staticEntries().filter(function (e) { return !(e.kind === 'Page' && here(e.href) && !/#/.test(e.href)); }));
    return all.map(function (e) { return {e: e, s: score(e, words, q)}; }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 30).map(function (x) { return x.e; });
  }

  /* ------------------------------------------------------------ going to a result */
  function flash(el) { try { el.classList.add('mts-flash'); setTimeout(function () { el.classList.remove('mts-flash'); }, 1800); } catch (e) {} }
  function reveal(el) {
    /* open any folded section, switch to the tab panel that holds it */
    for (var p = el; p; p = p.parentElement) {
      if (p.tagName === 'DETAILS' && !p.open) p.open = true;
      if (p.classList && p.classList.contains('panel') && !p.classList.contains('active') && /^panel-/.test(p.id) && typeof window.switchTab === 'function') window.switchTab(p.id.replace(/^panel-/, ''));
      if (p.classList && p.classList.contains('subpanel') && !p.classList.contains('on') && /^subpanel-(\w+)-(\w+)/.test(p.id) && typeof window.subTab === 'function') { var m = p.id.match(/^subpanel-(\w+)-(\w+)/); window.subTab(m[1], m[2]); }
    }
    var b = document.getElementById('mtB'); if (b && b.classList.contains('open') && !b.contains(el) && window.MTBuild) MTBuild.close();
  }
  function goTo(e) {
    close();
    if (e.href) { if (here(e.href)) { var tab = (e.href.split('#tab=')[1] || ''); if (tab && typeof window.switchTab === 'function') window.switchTab(tab); return; } location.href = e.href; return; }
    if (e.builder) {
      if (!window.MTBuild) { location.href = IC + '#mtbuild=' + encodeURIComponent(JSON.stringify({type: e.builder, style: e.style || '', preset: e.preset || ''})); return; }
      MTBuild.open(e.builder, e.style ? {style: e.style} : null);
      if (e.preset) setTimeout(function () { var ps = document.getElementById('mtBpreset'); if (ps) { ps.value = e.preset; ps.focus(); } }, 200);
      return;
    }
    if (!e.el || !e.el.isConnected) return;
    reveal(e.el);
    setTimeout(function () {
      e.el.scrollIntoView({block: 'center', behavior: 'smooth'});
      if (e.kind === 'Option') {
        if (e.el.value !== e.value) { var before = e.el.options[e.el.selectedIndex] ? e.el.options[e.el.selectedIndex].textContent.trim() : ''; e.el.value = e.value; e.el.dispatchEvent(new Event('input', {bubbles: true})); e.el.dispatchEvent(new Event('change', {bubbles: true})); note('Set ' + labelFor(e.el).label + ' to "' + e.title + '"' + (before ? ' (was "' + before + '")' : '') + '.'); }
        else note(labelFor(e.el).label + ' is already "' + e.title + '".');
      }
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.el.tagName)) { try { e.el.focus({preventScroll: true}); } catch (x) {} }
      flash(e.el.closest('label, .field, fieldset, .card') || e.el);
    }, 120);
  }

  /* ------------------------------------------------------------ the search box */
  var box, input, list, items = [], hi = 0, prevFocus = null;
  function css() {
    if (document.getElementById('mtSearchCss')) return; var s = document.createElement('style'); s.id = 'mtSearchCss';
    s.textContent = '#mtSearch{position:fixed;inset:0;z-index:2147483400;background:rgba(3,10,26,.55);display:flex;align-items:flex-start;justify-content:center;padding:9vh 12px 12px}#mtSearch[hidden]{display:none}' +
      '#mtSearch .box{width:min(680px,100%);background:#0a1b38;border:1px solid #2b5590;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.5);overflow:hidden;font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#e6eefb}' +
      '#mtSearch input{all:unset;box-sizing:border-box;width:100%;padding:14px 16px;font-size:16px;border-bottom:1px solid #1c3a66}#mtSearch ul{list-style:none;margin:0;padding:6px;max-height:62vh;overflow:auto}' +
      '#mtSearch li{display:flex;gap:10px;align-items:baseline;padding:8px 10px;border-radius:9px;cursor:pointer}#mtSearch li[aria-selected=true],#mtSearch li:hover{background:#123a75}#mtSearch li em{font-style:normal;font-size:11px;font-weight:700;color:#0b1c3a;background:#9fc4ff;border-radius:999px;padding:1px 8px;flex:none}#mtSearch li span{flex:1;min-width:0}#mtSearch li small{color:#9db0c8;margin-left:6px}' +
      '#mtSearch .hint{padding:8px 16px;font-size:12px;color:#9db0c8;border-top:1px solid #1c3a66}#mtSearchBtn{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483000;display:inline-flex;gap:8px;align-items:center;padding:7px 14px;border-radius:999px;border:1px solid #2b5590;background:#0a1b38;color:#cfe0f7;font:600 12.5px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)}' +
      '#mtSearchBtn kbd{font:inherit;font-size:11px;color:#9db0c8}#mtSearchBtn:focus-visible,#mtSearch li:focus-visible{outline:2px solid #5aa2ff}.mts-flash{outline:3px solid #f0b357!important;outline-offset:2px;transition:outline-color .4s}#mtSearchNote{position:fixed;left:50%;bottom:58px;transform:translateX(-50%);z-index:2147483401;background:#0a1b38;color:#e6eefb;border:1px solid #2b5590;border-radius:10px;padding:8px 14px;font:13px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}' +
      '@media print{#mtSearchBtn,#mtSearch,#mtSearchNote{display:none!important}}';
    document.head.appendChild(s);
  }
  var nt = 0; function note(m) { css(); var n = document.getElementById('mtSearchNote'); if (!n) { n = document.createElement('div'); n.id = 'mtSearchNote'; n.setAttribute('role', 'status'); document.body.appendChild(n); } n.textContent = m; n.hidden = false; clearTimeout(nt); nt = setTimeout(function () { n.hidden = true; }, 5000); }
  function build() {
    if (box) return; css();
    box = document.createElement('div'); box.id = 'mtSearch'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Search');
    box.innerHTML = '<div class="box"><input type="text" role="combobox" aria-expanded="true" aria-controls="mtSearchList" aria-autocomplete="list" placeholder="Search pages, fields, options, documents - e.g. consultant fee, gift letter, overtime" autocomplete="off"><ul id="mtSearchList" role="listbox"></ul><div class="hint">Enter to open &middot; arrows to move &middot; Esc to close &middot; choosing an option sets it</div></div>';
    document.body.appendChild(box); input = box.querySelector('input'); list = box.querySelector('ul');
    var t = 0; input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(draw, 60); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[hi]) goTo(items[hi]); } else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) { var li = e.target.closest('li[data-i]'); if (li) goTo(items[+li.getAttribute('data-i')]); });
    box.addEventListener('mousedown', function (e) { if (e.target === box) close(); });
  }
  function draw() {
    items = search(input.value); hi = 0;
    list.innerHTML = items.length ? items.map(function (e, i) { return '<li role="option" id="mts' + i + '" data-i="' + i + '" aria-selected="' + (i === 0) + '"><em>' + e.kind + '</em><span>' + esc(e.title) + (e.sub ? '<small>' + esc(e.sub) + '</small>' : '') + '</span></li>'; }).join('')
      : (input.value.trim() ? '<li aria-disabled="true"><span>Nothing matches yet - try another word.</span></li>' : '');
    input.setAttribute('aria-activedescendant', items.length ? 'mts0' : '');
  }
  function move(d) { if (!items.length) return; hi = (hi + d + items.length) % items.length; [].forEach.call(list.querySelectorAll('li[data-i]'), function (li, i) { li.setAttribute('aria-selected', String(i === hi)); if (i === hi) li.scrollIntoView({block: 'nearest'}); }); input.setAttribute('aria-activedescendant', 'mts' + hi); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function open(q) { build(); prevFocus = document.activeElement; box.hidden = false; input.value = q || ''; draw(); input.focus(); input.select(); }
  function close() { if (box && !box.hidden) { box.hidden = true; if (prevFocus && prevFocus.focus && prevFocus.isConnected) try { prevFocus.focus(); } catch (e) {} } }
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (box && !box.hidden) close(); else open(''); } }, true);
  function button() { css(); if (document.getElementById('mtSearchBtn')) return; var b = document.createElement('button'); b.type = 'button'; b.id = 'mtSearchBtn'; b.className = 'no-print'; b.setAttribute('aria-label', 'Search pages, fields and options (Ctrl+K)');
    b.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6.5 1a5.5 5.5 0 0 1 4.38 8.83l3.65 3.64-1.06 1.06-3.64-3.65A5.5 5.5 0 1 1 6.5 1zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>Search <kbd>' + (/Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K') + '</kbd>';
    b.addEventListener('click', function () { open(''); }); document.body.appendChild(b); }
  /* arriving from another page's search: a calculator tab, or a document builder with its layout */
  function arrive() {
    var h = location.hash; if (!h) return;
    var tab = (h.match(/#tab=(\w+)/) || [])[1]; if (tab && typeof window.switchTab === 'function') setTimeout(function () { window.switchTab(tab); }, 300);
    var mb = (h.match(/#mtbuild=([^&]+)/) || [])[1];
    if (mb) { var spec = {}; try { spec = JSON.parse(decodeURIComponent(mb)); } catch (e) {} var tries = 0; (function wait() { if (window.MTBuild) { MTBuild.open(spec.type, spec.style ? {style: spec.style} : null); if (spec.preset) setTimeout(function () { var ps = document.getElementById('mtBpreset'); if (ps) ps.value = spec.preset; }, 300); history.replaceState(null, '', location.pathname + location.search); } else if (tries++ < 40) setTimeout(wait, 250); })(); }
  }
  function start() { button(); arrive(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.MTSearch = {open: open, close: close, search: search};
})();
