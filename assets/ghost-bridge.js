/* 57.13: Ghost Calligrapher hand-off. Every PDF a page here downloads (jsPDF, pdf-lib, or
   any download link) is also kept in this browser's "recent files" store, which Ghost
   Calligrapher (jcodomo.github.io/calligrapher2, same site, same browser storage) lists
   under Recent files. A small card offers to open the new PDF there to sign or edit.
   The download itself is never changed or delayed; nothing leaves the device. */
(function () {
  'use strict';
  if (window.__ghostBridge) return;
  window.__ghostBridge = 1;
  var GHOST = 'https://jcodomo.github.io/calligrapher2/';
  var DB = 'cal2recents', STORE = 'docs', MAX = 10;

  /* remember the Blob behind each blob: URL, so it can be read even after the page revokes it */
  var blobs = {}, order = [];
  var mkURL = URL.createObjectURL;
  URL.createObjectURL = function (obj) {
    var u = mkURL.apply(URL, arguments);
    try {
      if (obj instanceof Blob) { blobs[u] = obj; order.push(u); if (order.length > 30) delete blobs[order.shift()]; }
    } catch (e) {}
    return u;
  };

  function openDB() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function all(db) {
    return new Promise(function (res) {
      var out = [], c = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
      c.onsuccess = function (e) { var k = e.target.result; if (k) { out.push({ id: k.value.id, name: k.value.name, size: k.value.size, ts: k.value.ts }); k.continue(); } else res(out); };
      c.onerror = function () { res(out); };
    });
  }
  function write(db, fn) {
    return new Promise(function (res) { var t = db.transaction(STORE, 'readwrite'); fn(t.objectStore(STORE)); t.oncomplete = res; t.onerror = res; t.onabort = res; });
  }
  /* same record shape Ghost Calligrapher's recents.js writes */
  function keep(name, buf) {
    return openDB().then(function (db) {
      var size = buf.byteLength, id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      return all(db).then(function (list) {
        return write(db, function (st) {
          list.forEach(function (r) { if (r.name === name && r.size === size) st.delete(r.id); });
          st.put({ id: id, name: name, type: 'pdf', size: size, bytes: buf, thumb: '', ts: Date.now(), from: 'mtgcalc' });
        });
      }).then(function () { return all(db); }).then(function (list) {
        list.sort(function (a, b) { return b.ts - a.ts; });
        var old = list.slice(MAX);
        return old.length ? write(db, function (st) { old.forEach(function (r) { st.delete(r.id); }); }) : null;
      }).then(function () { return id; });
    });
  }

  var seen = {};
  function capture(a) {
    try {
      var href = a.href || '', name = a.download;
      if (name == null || name === '' && !/^blob:|^data:application\/pdf/i.test(href)) return;
      var blob = blobs[href];
      var isPdf = /\.pdf$/i.test(name || '') || (blob && blob.type === 'application/pdf') || /^data:application\/pdf/i.test(href);
      if (!isPdf) return;
      name = (name || 'document.pdf').replace(/[\\/:*?"<>|]/g, '');
      if (!/\.pdf$/i.test(name)) name += '.pdf';
      var key = href + '|' + name;
      if (seen[key] && Date.now() - seen[key] < 3000) return;   /* one download can fire more than one click */
      seen[key] = Date.now();
      var got = blob ? blob.arrayBuffer() : fetch(href).then(function (r) { return r.arrayBuffer(); });
      got.then(function (buf) {
        if (!buf || buf.byteLength < 8) return;
        var head = new Uint8Array(buf, 0, 5);
        if (String.fromCharCode.apply(null, head) !== '%PDF-') return;
        return keep(name, buf).then(function (id) { card(name, id); });
      }).catch(function () {});
    } catch (e) {}
  }

  /* jsPDF's save() and most "download" code click an <a download> element by script */
  var aClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { capture(this); return aClick.apply(this, arguments); };
  var dispatch = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (ev) {
    if (ev && ev.type === 'click' && this instanceof HTMLAnchorElement) capture(this);
    return dispatch.apply(this, arguments);
  };
  /* real clicks on download links in the page */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
    if (a && !e.__ghost) capture(a);
  }, true);

  /* "Open it in Ghost Calligrapher" card */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var cardEl = null, timer = 0;
  function card(name, id) {
    if (!document.body) return;
    if (cardEl) cardEl.remove();
    clearTimeout(timer);
    cardEl = document.createElement('div');
    cardEl.className = 'ghost-card';
    cardEl.setAttribute('role', 'status');
    cardEl.innerHTML = '<style>.ghost-card{position:fixed;right:16px;bottom:16px;z-index:2147483000;max-width:min(360px,calc(100vw - 32px));background:#141826;color:#eef1f8;border:1px solid #2c3550;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.35);padding:12px 14px;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}.ghost-card b{display:block;margin-bottom:2px}.ghost-card small{display:block;color:#a9b2c8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ghost-card .gr{display:flex;gap:8px;margin-top:10px}.ghost-card a{display:inline-flex;align-items:center;height:32px;padding:0 12px;border-radius:6px;font-weight:600;text-decoration:none;font-size:13.5px}.ghost-card .gp{background:#7c5cff;color:#fff}.ghost-card .gs{border:1px solid #4b5677;color:#dfe4f2}.ghost-card .gx{position:absolute;top:6px;right:8px;border:0;background:none;color:#a9b2c8;font-size:16px;cursor:pointer}</style>' +
      '<button class="gx" type="button" aria-label="Close">✕</button><b>Ready in Ghost Calligrapher</b><small title="' + esc(name) + '">' + esc(name) + '</small>' +
      '<div class="gr"><a class="gp" target="_blank" rel="noopener" href="' + GHOST + '#/sign/' + encodeURIComponent(id) + '">Sign it ↗</a>' +
      '<a class="gs" target="_blank" rel="noopener" href="' + GHOST + '#/open/' + encodeURIComponent(id) + '">Edit ↗</a></div>';
    cardEl.querySelector('.gx').onclick = function () { cardEl.remove(); cardEl = null; };
    document.body.appendChild(cardEl);
    timer = setTimeout(function () { if (cardEl && !cardEl.matches(':hover')) { cardEl.remove(); cardEl = null; } }, 15000);
  }
})();
