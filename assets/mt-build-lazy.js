/* Mortgage Suite v57 phase 4 - the Document Builder loads when it is first opened, not with every page.
   This small stand-in does the two things the builder did at startup - routes the suite's Addendum, Lease and Pay statement
   buttons to the builder and puts the "Document builder" row on the Documents pages - and loads doc-builder.js (378 KB) on the
   first click. The real builder then replaces window.MTBuild. Nothing here polls: the row is placed when the page is ready and
   again shortly after clicks, the moments the Documents panels appear. */
(function () {
  'use strict';
  if (window.MTBuild) return;
  var SRC = (document.currentScript && document.currentScript.src || '').replace(/mt-build-lazy\.js[^]*$/, '') + 'doc-builder.js?v=57.6';
  var ORDER = [['addendum', 'Addendum'], ['lease', 'Lease agreement'], ['estimate', 'Contractor estimate'], ['pl', 'Profit and loss'], ['schc', 'Schedule C analysis'], ['pay', 'Pay statement'], ['gift', 'Gift letter'], ['le', 'Loan Estimate draft'], ['commit', 'Commitment letter'], ['lox', 'Letter of explanation'], ['cpa', 'CPA / tax preparer letter'], ['mi', 'MI & renovation fees']];
  var loading = null, stub;
  function load() {
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var d = window.define; window.define = undefined;            /* the Loan Suite's AMD loader must not capture the builder's libraries */
      var s = document.createElement('script'); s.src = SRC;
      s.onload = function () { window.define = d; window.MTBuild && window.MTBuild !== stub ? res(window.MTBuild) : rej(new Error('The document builder did not start.')); };
      s.onerror = function () { window.define = d; loading = null; rej(new Error('The document builder could not be loaded - check the connection and try again.')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  function open(type, opts) { return load().then(function (M) { return M.open(type, opts); }, function (e) { alert(e.message); }); }
  stub = window.MTBuild = {
    __lazy: true, open: open, close: function () {},
    /* search lists every document type without loading the builder */
    catalog: function () { return ORDER.map(function (o) { return {type: o[0], label: o[1], styles: []}; }); }
  };
  function hooks() {
    if (window.V14 && V14.open && !V14.open.__mtb) {
      var o = V14.open, w = function (id) { if (id === 'v14AddModal' && !w.classic) return window.MTBuild.open('addendum'); if (id === 'v14LeaseModal' && !w.classic) return window.MTBuild.open('lease'); return o.apply(this, arguments); };
      w.__mtb = true; V14.__mtbOrig = o; V14.open = w;
    }
    if (window.V15 && V15.openPay && !V15.openPay.__mtb) { var op = function () { window.MTBuild.open('pay'); }; op.__mtb = true; V15.openPay = op; }
    ['panel-docs', 'v50UnifiedDocuments'].forEach(function (id) {
      var host = document.getElementById(id); if (!host || host.querySelector('.mt-build-entry')) return;
      var d = document.createElement('div'); d.className = 'mt-build-entry no-print';
      d.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin:0 0 14px;padding:12px 14px;border-radius:12px;border:1px solid rgba(90,162,255,.45);background:rgba(90,162,255,.08)';
      d.innerHTML = '<div><b style="font-size:14px">Document builder</b><div style="font-size:12.5px;opacity:.8">' + ORDER.map(function (o) { return o[1]; }).join(', ') + '.</div></div><div style="display:flex;flex-wrap:wrap;gap:6px">' +
        ORDER.map(function (o) { return '<button type="button" class="btn btn-light btn-sm" data-mtb="' + o[0] + '" style="cursor:pointer">' + o[1] + '</button>'; }).join('') + '</div>';
      d.addEventListener('click', function (e) { var b = e.target.closest('[data-mtb]'); if (b) window.MTBuild.open(b.getAttribute('data-mtb')); });
      var head = host.querySelector(':scope > .section-head, :scope > header'); head && head.nextSibling ? host.insertBefore(d, head.nextSibling) : host.insertBefore(d, host.firstChild);
    });
  }
  var ct = 0;
  function soon() { clearTimeout(ct); ct = setTimeout(hooks, 300); }
  function start() { hooks(); setTimeout(hooks, 400); setTimeout(hooks, 1500); document.addEventListener('click', soon, true); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('load', soon);
})();
