/* Mortgage Income Calculator v57 - Simple | Advanced.
   Simple keeps everything except Other Income, VA Income and Assets (asset depletion): W-2 and salary, self-employment
   (Schedule C, 1065 / 1120-S / 1120), Schedule E, PITIA & DTI, taxes, rates, documents, AUS findings and the summary.
   Every fresh visit opens Simple; the choice is kept while the browser tab stays open.
   Hidden sections are not repainted while Simple is showing (they repaint once when Advanced opens), and any amount they
   hold is still counted - a note says so, so nothing hidden changes the income without showing. */
(function () {
  'use strict';
  if (!document.getElementById('panel-w2') || window.__icSimple) return;
  window.__icSimple = true;
  var KEY = 'mt.ic.view', HIDE = ['va', 'other', 'assets'];
  var view = 'simple'; try { view = sessionStorage.getItem(KEY) || 'simple'; } catch (e) {}
  var dirty = {}, simple = function () { return view === 'simple'; };

  function css() {
    var s = document.createElement('style'); s.id = 'icSimpleCss';
    s.textContent = '#icView{display:inline-flex;border:1px solid #2b5590;border-radius:9px;overflow:hidden;margin-left:12px;flex:none}#icView button{border:0;background:transparent;padding:5px 12px;cursor:pointer;color:#9db0c8;font:600 12.5px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}#icView button[aria-pressed="true"]{background:#2f6fe0;color:#fff}' +
      'html.ic-simple .tab[data-ic-hide]{display:none!important}html.ic-simple #panel-va,html.ic-simple #panel-other,html.ic-simple #panel-assets{display:none!important}' +
      '#icHiddenNote{margin:8px auto 0;max-width:1200px;padding:7px 12px;border:1px solid #f0b357;border-radius:9px;background:rgba(240,179,87,.1);color:#f6d79a;font:12.5px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}#icHiddenNote[hidden]{display:none}#icHiddenNote button{background:none;border:0;color:#8cc0ff;text-decoration:underline;cursor:pointer;font:inherit;padding:0 0 0 6px}' +
      '@media print{#icView,#icHiddenNote{display:none!important}}';
    document.head.appendChild(s);
  }
  function tabOf(b) { var m = String(b.getAttribute('onclick') || '').match(/switchTab\(['"](\w+)['"]/); return m && m[1]; }
  function mark() { [].forEach.call(document.querySelectorAll('.tab'), function (b) { var t = tabOf(b); if (HIDE.indexOf(t) >= 0) b.setAttribute('data-ic-hide', t); }); }

  /* what the hidden sections still add to income */
  function hiddenAmounts() {
    var out = [];
    try { if (typeof S !== 'undefined') {
      var on = function (r) { return r.use !== false; };
      if (S.other && S.other.length && typeof calcOther === 'function') { var o = S.other.filter(on).reduce(function (t, x) { return t + (calcOther(x).total || 0); }, 0); if (o) out.push(['other', 'Other income', o]); }
      if (S.assets && S.assets.use && typeof calcAssets === 'function') { var a = calcAssets().monthly || 0; if (a) out.push(['assets', 'Asset depletion', a]); }
      if (S.va && S.va.records) { var v = S.va.records.filter(function (r) { return r.on !== false; }).reduce(function (t, r) { return t + ['basePay', 'bah', 'bas', 'clothing', 'special', 'other', 'disabilityMonthly'].reduce(function (u, k) { return u + (Number(r[k]) || 0); }, 0); }, 0); if (v) out.push(['va', 'VA income', v]); }
    } } catch (e) {}
    return out;
  }
  function money(n) { return '$' + Number(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
  function note() {
    mark();                                                                 /* the VA tab is added after the page loads */
    var n = document.getElementById('icHiddenNote');
    if (!n) { n = document.createElement('div'); n.id = 'icHiddenNote'; n.setAttribute('role', 'status'); var tb = document.querySelector('.toolbar'); (tb && tb.parentNode ? tb.parentNode.insertBefore(n, tb.nextSibling) : document.body.insertBefore(n, document.body.firstChild)); }
    var h = simple() ? hiddenAmounts() : [];
    n.hidden = !h.length;
    if (h.length) n.innerHTML = 'Simple view hides ' + h.map(function (x) { return x[1] + (x[2] != null ? ' (' + money(x[2]) + ' / mo)' : ''); }).join(', ') + ' - still counted in the income above.<button type="button" data-ic="advanced">Show in Advanced</button>';
  }

  /* hidden sections are not repainted in Simple; they catch up when Advanced opens */
  ['paintOther', 'paintAssets'].forEach(function (fn) {
    var orig = window[fn]; if (typeof orig !== 'function') return;
    window[fn] = function () { if (simple()) { dirty[fn] = orig; return; } return orig.apply(this, arguments); };
  });

  function apply() {
    document.documentElement.classList.toggle('ic-simple', simple());
    var seg = document.getElementById('icView'); if (seg) [].forEach.call(seg.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === view)); });
    if (!simple()) Object.keys(dirty).forEach(function (k) { var f = dirty[k]; delete dirty[k]; try { f(); } catch (e) {} });
    var act = document.querySelector('.panel.active'); if (simple() && act && HIDE.indexOf(act.id.replace(/^panel-/, '')) >= 0 && typeof switchTab === 'function') switchTab('w2');
    note();
  }
  function set(v) { view = v; try { sessionStorage.setItem(KEY, v); } catch (e) {} apply(); }

  function start() {
    css(); mark();
    var h1 = document.querySelector('.appbar h1');
    var seg = document.createElement('div'); seg.id = 'icView'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Calculator view');
    seg.innerHTML = '<button type="button" data-v="simple" title="W-2, self-employment, rental, DTI, documents and summary">Simple</button><button type="button" data-v="advanced" title="Adds Other Income, VA Income and Assets">Advanced</button>';
    seg.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) set(b.getAttribute('data-v')); });
    if (h1 && h1.parentNode) h1.parentNode.insertBefore(seg, h1.nextSibling); else document.body.insertBefore(seg, document.body.firstChild);
    document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-ic="advanced"]'); if (b) set('advanced'); });
    /* a link or search result that opens a hidden tab switches to Advanced first */
    if (typeof window.switchTab === 'function' && !window.switchTab.__ic) {
      var sw = window.switchTab, w = function (t) { if (simple() && HIDE.indexOf(t) >= 0) set('advanced'); return sw.apply(this, arguments); }; w.__ic = true; window.switchTab = w;
    }
    /* keep the note current as figures change */
    if (typeof window.RECALC === 'function' && !window.RECALC.__ic) { var rc = window.RECALC, r = function () { var x = rc.apply(this, arguments); note(); return x; }; r.__ic = true; window.RECALC = r; }
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.ICView = {set: set, get: function () { return view; }};
})();
