/* Mortgage Suite 56.0 - Loan Suite.
   - File: Quote, then Setup, then (for a renovation loan) Renovation, on one page. Setup and Renovation open by themselves as
     you scroll down to them; their headers fold them away again. The cards are the engine's own (same fields, same checks).
   - Draw inspection fee per draw follows the program: Conventional HomeStyle $150, FHA 203(k) $375. A fee typed by hand is
     kept; switching the program moves a default fee to the new program's default.
   - The context tab row (File / Loan sub-pages) keeps its contrast in the dark themes. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function store() { try { return window.mortgageSuite && window.mortgageSuite.store; } catch (e) { return null; } }
  function app() { try { return window.mortgageSuite && window.mortgageSuite.app; } catch (e) { return null; } }
  function sections() { try { return window.__amdGet && window.__amdGet('src/ui/sections'); } catch (e) { return null; } }
  function N(v) { var n = +v; return isFinite(n) ? n : 0; }
  function say(t, m) { try { window.LOS && LOS.say && LOS.say(t, m, 'good', 5000); } catch (e) {} }

  /* ------------------------------------------------------------------ styles */
  var css = [
    '#mtFileFlow{display:grid;gap:14px;margin-top:16px}',
    '.mt-step{border-radius:14px;border:1px solid var(--mt-line,rgba(127,147,176,.28));background:var(--mt-surface,transparent)}',
    'html body #suite-root #mtFileFlow .mt-step>button.mt-step-h{all:unset;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;width:100%!important;min-height:0!important;padding:14px 18px!important;margin:0!important;cursor:pointer;border:0!important;border-radius:14px!important;background:transparent!important;color:inherit!important;text-align:left!important;box-shadow:none!important;font:inherit!important;text-transform:none!important;letter-spacing:normal!important}',
    'html body #suite-root #mtFileFlow .mt-step>button.mt-step-h:hover{background:rgba(90,162,255,.06)!important}',
    'html body #suite-root #mtFileFlow .mt-step>button.mt-step-h:focus-visible{outline:2px solid #5aa2ff!important;outline-offset:2px}',
    '.mt-step-n{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:700 13px/1 system-ui,sans-serif;background:rgba(90,162,255,.16);color:#5aa2ff}',
    '.mt-step-t{flex:1;min-width:0}.mt-step-t b{display:block;font-size:15.5px;letter-spacing:-.01em}.mt-step-t small{display:block;font-size:12.5px;opacity:.72;margin-top:2px}',
    '.mt-step-c{flex:none;transition:transform .2s ease;opacity:.7}.mt-step.open .mt-step-c{transform:rotate(180deg)}',
    '.mt-step-b{padding:0 12px 12px}.mt-step:not(.open) .mt-step-b{display:none}',
    '.mt-step-b>.card{margin:0 0 12px}',
    '@media (prefers-reduced-motion:reduce){.mt-step-c{transition:none}}',
    /* the context tab row: dark themes painted pale text on a white bar */
    'html[data-v25-surface="oled"] body #suite-root#suite-root .tabs.v23-context-tabs,html[data-theme="dark"] body #suite-root#suite-root .tabs.v23-context-tabs,html[data-mt-mode="oled"] body #suite-root#suite-root .tabs.v23-context-tabs{background:#06142e!important;border-color:#0f264a!important}',
    'html[data-v25-surface="oled"] body #suite-root#suite-root .tabs.v23-context-tabs .tab,html[data-theme="dark"] body #suite-root#suite-root .tabs.v23-context-tabs .tab,html[data-mt-mode="oled"] body #suite-root#suite-root .tabs.v23-context-tabs .tab{color:#c9d7ee!important;background:transparent!important}',
    'html[data-v25-surface="oled"] body #suite-root#suite-root .tabs.v23-context-tabs .tab.active,html[data-theme="dark"] body #suite-root#suite-root .tabs.v23-context-tabs .tab.active,html[data-mt-mode="oled"] body #suite-root#suite-root .tabs.v23-context-tabs .tab.active{color:#fff!important;background:#123a75!important;box-shadow:inset 0 0 0 1px #2c5ea8!important}',
    'html[data-v25-surface="oled"] body #suite-root#suite-root .tabs.v23-context-tabs .tab:hover,html[data-mt-mode="oled"] body #suite-root#suite-root .tabs.v23-context-tabs .tab:hover{color:#fff!important;background:#0c2550!important}',
    'html[data-v25-surface="oled"] body #suite-root#suite-root .tabs.v23-context-tabs .tab svg,html[data-mt-mode="oled"] body #suite-root#suite-root .tabs.v23-context-tabs .tab svg{color:inherit!important;stroke:currentColor!important}',
    /* split-page nav: stronger current-page marker */
    '#lseNav .lse-pages a.on{font-weight:700}'
  ].join('\n');
  if (!$('mt56SuiteCss')) { var st = document.createElement('style'); st.id = 'mt56SuiteCss'; st.textContent = css; document.head.appendChild(st); }

  /* ------------------------------------------------- File: Quote -> Setup -> Renovation */
  var STEPS = [
    {id: 'setup', mode: 'setup', n: 2, title: 'Setup', sub: 'The full loan file: property, price and value, program, rate, taxes, insurance and the as-of dates.'},
    {id: 'renovation', mode: 'renovation', n: 3, title: 'Renovation', sub: 'The renovation budget, contingency, fees and the draw schedule.', when: function (i) { return !!i.renovation; }}
  ];
  var userSet = {}, io = null;
  function inQuote() { var s = store(); return !!(s && s.snapshot && s.snapshot.mode === 'quote'); }
  function fileFlowWanted() {
    var E = window.LOS_EMBED || {};
    if (E.page && E.page !== 'quote') return false;                 /* other split pages keep their single screen */
    return inQuote();
  }
  function stepEl(def) {
    var s = document.createElement('section'); s.className = 'mt-step'; s.dataset.step = def.id;
    s.innerHTML = '<button type="button" class="mt-step-h" aria-expanded="false"><span class="mt-step-n">' + def.n + '</span><span class="mt-step-t"><b>' + def.title + '</b><small>' + def.sub + '</small></span>' +
      '<svg class="mt-step-c" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="mt-step-b"></div>';
    s.querySelector('.mt-step-h').addEventListener('click', function () { userSet[def.id] = true; toggle(s, def, !s.classList.contains('open')); });
    return s;
  }
  function fill(s, def) {
    var body = s.querySelector('.mt-step-b'); if (body.dataset.filled) return;
    var A = app(), SEC = sections(); if (!A || !SEC || !A.renderCard) return;
    var scr = SEC.screenFor(def.mode); if (!scr || scr.id !== def.mode) return;
    var cards = [].concat.apply([], scr.columns || []).concat(scr.bottom || []);
    cards.forEach(function (c) { try { body.appendChild(A.renderCard(c)); } catch (e) {} });
    body.dataset.filled = '1';
    try { A.refresh(); } catch (e) {}
  }
  var openState = {};
  function toggle(s, def, open) {
    if (open) fill(s, def);
    openState[def.id] = !!open;
    s.classList.toggle('open', !!open);
    s.querySelector('.mt-step-h').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function build() {
    var main = $('screen-body'), st = store(); if (!main || !st) return;
    var flow = $('mtFileFlow');
    if (!fileFlowWanted()) { if (flow) flow.remove(); return; }
    var inputs = st.activeInputs || {}, want = STEPS.filter(function (d) { return !d.when || d.when(inputs); }).map(function (d) { return d.id; }).join(',');
    if (flow && flow.dataset.steps === want && flow.parentNode === main) return;
    if (flow) flow.remove();
    flow = document.createElement('div'); flow.id = 'mtFileFlow'; flow.dataset.steps = want;
    STEPS.forEach(function (def) {
      if (def.when && !def.when(inputs)) return;
      var s = stepEl(def); flow.appendChild(s);
      if (openState[def.id]) toggle(s, def, true);
    });
    main.appendChild(flow);
    watch(flow);
  }
  /* the reader has scrolled down to a step: open it (unless they folded it themselves) */
  function reveal() {
    var flow = $('mtFileFlow'); if (!flow || window.scrollY < 40) return;
    Array.prototype.forEach.call(flow.querySelectorAll('.mt-step:not(.open)'), function (s) {
      var d = STEPS.filter(function (x) { return x.id === s.dataset.step; })[0]; if (!d || userSet[d.id]) return;
      var top = s.getBoundingClientRect().top; if (top < window.innerHeight * 0.8) toggle(s, d, true);
    });
  }
  var rv = 0; window.addEventListener('scroll', function () { if (rv) return; rv = setTimeout(function () { rv = 0; reveal(); }, 120); }, {passive: true});
  function watch(flow) {
    if (!('IntersectionObserver' in window)) return;
    if (io) io.disconnect();
    io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var s = en.target.closest('.mt-step'), d = STEPS.filter(function (x) { return x.id === s.dataset.step; })[0];
        if (!d || userSet[d.id] || s.classList.contains('open')) return;
        /* only when the reader has scrolled down to it, not on load */
        if (window.scrollY < 40) return;
        toggle(s, d, true);
      });
    }, {rootMargin: '0px 0px -25% 0px', threshold: 0});
    Array.prototype.forEach.call(flow.querySelectorAll('.mt-step-h'), function (h) { io.observe(h); });
  }

  /* ----------------------------------- draw inspection fee per draw, by program */
  var FEE = {conv: 150, fha: 375}, lastKind = null;
  function kind(i) { return /fha/i.test(String(i.loanProgram || '')) ? 'fha' : 'conv'; }
  function fees() {
    var st = store(); if (!st || !st.activeInputs || !st.setField) return;
    var i = st.activeInputs, k = kind(i), d = i.draws || {}, fee = N(d.inspectionFeePerDraw), other = k === 'fha' ? FEE.conv : FEE.fha;
    var changed = lastKind && lastKind !== k; lastKind = k;
    if (fee === FEE[k]) return;
    /* a stale default (the other program's figure, or nothing) moves; a fee typed by hand stays */
    if (fee === other || fee === 0 || (changed && (fee === other))) {
      try {
        st.setField('draws.inspectionFeePerDraw', FEE[k], k === 'fha' ? 'FHA 203(k) draw inspection fee' : 'Conventional HomeStyle draw inspection fee');
        var r = i.reno || {}, draws = N(d.manualDrawCount) || 5;
        if (!r.syncDrawFees && Math.abs(N(r.inspectionFees) - other * draws) < 0.5) st.setField('reno.inspectionFees', FEE[k] * draws, 'Draw inspection fees');
        say('Draw inspection fee $' + FEE[k] + ' per draw', k === 'fha' ? 'FHA 203(k) default.' : 'Conventional HomeStyle default.');
      } catch (e) {}
    }
  }

  /* ------------------------------ Full Suite: File and Loan open their first page */
  var GROUP_TABS = {file: ['QUOTE', 'SETUP', 'RENOVATION'], loan: ['PROPERTY', 'MAX MORTGAGE', 'MORTGAGE RATES']};
  document.addEventListener('click', function (e) {
    if (!e.isTrusted && !e.__mtTest) return;
    var b = e.target.closest && e.target.closest('#v23SuitePrimaryNav button[data-group]'); if (!b) return;
    var g = b.dataset.group, list = GROUP_TABS[g]; if (!list) return;
    setTimeout(function () {
      var act = document.querySelector('#suite-root .tabs .tab.active'), lab = act ? act.textContent.trim().toUpperCase() : '';
      if (list.indexOf(lab) >= 0) return;
      var first = Array.prototype.filter.call(document.querySelectorAll('#suite-root .tabs .tab'), function (t) { return t.textContent.trim().toUpperCase() === list[0]; })[0];
      if (first) first.click();
    }, 350);
  }, true);

  /* ------------------------------------------------------------------- boot */
  function boot(t) {
    var st = store(); if (!st || !st.subscribe || !$('screen-body')) { if (t < 200) setTimeout(function () { boot(t + 1); }, 100); return; }
    var timer = 0;
    st.subscribe(function () { clearTimeout(timer); timer = setTimeout(function () { fees(); build(); }, 60); });
    new MutationObserver(function () { if (fileFlowWanted() && !$('mtFileFlow')) build(); }).observe($('screen-body'), {childList: true});
    fees(); setTimeout(build, 400);
  }
  boot(0);
  window.Mt56Suite = {build: build, fees: fees, reveal: reveal, FEE: FEE};
})();
