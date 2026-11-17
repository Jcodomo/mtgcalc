/* 57.13-57.14: Ghost Calligrapher hand-off. Every PDF a page here downloads (jsPDF, pdf-lib, or
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
          try { localStorage.setItem('ghost_last_pdf', JSON.stringify({ id: id, name: name })); } catch (e) {}
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
      '<a class="gs" target="_blank" rel="noopener" href="' + GHOST + '#/open/' + encodeURIComponent(id) + '">Open in editor ↗</a></div>';
    cardEl.querySelector('.gx').onclick = function () { cardEl.remove(); cardEl = null; };
    document.body.appendChild(cardEl);
    timer = setTimeout(function () { if (cardEl && !cardEl.matches(':hover')) { cardEl.remove(); cardEl = null; } }, 15000);
  }

  /* 57.14: a Ghost button that stays in the corner - open the last built PDF in the editor (new tab),
     sign it, or draw / type a signature here. Signatures are kept in this browser's Ghost Calligrapher
     "Saved signatures" (same site, same storage), so they are ready to place when the PDF opens there. */
  var LAST = 'ghost_last_pdf', SIGS = 'cal2_sigs';
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function lastPdf() { return lsGet(LAST, null); }
  function ghostLink(kind) { var l = lastPdf(); return l ? GHOST + '#/' + kind + '/' + encodeURIComponent(l.id) : GHOST + '#/recent'; }
  var CSS = '.ghost-fab{position:fixed;left:16px;bottom:16px;z-index:2147482990;font:14px/1.3 system-ui,-apple-system,Segoe UI,sans-serif}' +
    '.ghost-fab>button{height:38px;padding:0 14px;border-radius:19px;border:1px solid #2c3550;background:#141826;color:#eef1f8;font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.3);font-size:13.5px}' +
    '.ghost-fab .gm{position:absolute;left:0;bottom:46px;min-width:250px;background:#141826;border:1px solid #2c3550;border-radius:10px;padding:6px;box-shadow:0 12px 32px rgba(0,0,0,.35);display:none}' +
    '.ghost-fab.open .gm{display:block}.ghost-fab .gm a,.ghost-fab .gm button{display:block;width:100%;text-align:left;padding:9px 10px;border-radius:6px;color:#eef1f8;text-decoration:none;background:none;border:0;cursor:pointer;font:inherit}' +
    '.ghost-fab .gm a:hover,.ghost-fab .gm button:hover{background:#232a40}.ghost-fab .gm small{display:block;color:#a9b2c8;font-size:12px;padding:2px 10px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}' +
    '.ghost-pad{position:fixed;inset:0;z-index:2147483100;background:rgba(8,10,18,.55);display:flex;align-items:center;justify-content:center;padding:16px;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}' +
    '.ghost-pad .gb{background:#fff;color:#141826;border-radius:12px;width:min(620px,100%);padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.4)}' +
    '.ghost-pad h3{margin:0 0 10px;font-size:16px}.ghost-pad .gt{display:flex;gap:6px;margin-bottom:10px}.ghost-pad .gt button{border:1px solid #c9cfdc;background:#f4f6fa;border-radius:6px;padding:6px 12px;cursor:pointer;font:inherit}' +
    '.ghost-pad .gt button.on{background:#7c5cff;border-color:#7c5cff;color:#fff}.ghost-pad canvas{width:100%;height:200px;border:1px dashed #b7bfd0;border-radius:8px;touch-action:none;background:#fff;display:block}' +
    '.ghost-pad input[type=text]{width:100%;box-sizing:border-box;height:36px;border:1px solid #c9cfdc;border-radius:6px;padding:0 10px;margin-bottom:8px;font:inherit}' +
    '.ghost-pad .gr{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center}.ghost-pad .gr button{height:34px;padding:0 12px;border-radius:6px;border:1px solid #c9cfdc;background:#fff;cursor:pointer;font:inherit;font-weight:600}' +
    '.ghost-pad .gr .gp{background:#7c5cff;border-color:#7c5cff;color:#fff}.ghost-pad .gr .sp{flex:1}.ghost-pad .gn{color:#5b6478;font-size:12.5px;margin-top:8px}' +
    '.ghost-pad label{font-size:12.5px;color:#5b6478;display:flex;align-items:center;gap:6px}';
  function styleOnce() { if (document.getElementById('ghost-style')) return; var st = document.createElement('style'); st.id = 'ghost-style'; st.textContent = CSS; document.head.appendChild(st); }

  function fab() {
    if (!document.body || document.querySelector('.ghost-fab')) return;
    styleOnce();
    var f = document.createElement('div'); f.className = 'ghost-fab';
    f.innerHTML = '<button type="button" aria-haspopup="true">✒ Ghost</button><div class="gm" role="menu"></div>';
    var menu = f.querySelector('.gm');
    function fill() {
      var l = lastPdf();
      menu.innerHTML = (l ? '<small title="' + esc(l.name) + '">Last PDF: ' + esc(l.name) + '</small>' : '<small>No PDF built yet on this browser</small>') +
        '<a target="_blank" rel="noopener" href="' + ghostLink('open') + '">Open in editor (new tab) ↗</a>' +
        '<a target="_blank" rel="noopener" href="' + ghostLink('sign') + '">Sign in Ghost Calligrapher ↗</a>' +
        '<button type="button" data-g="pad">Signature pad…</button>';
      menu.querySelector('[data-g=pad]').onclick = function () { f.classList.remove('open'); pad(); };
      menu.querySelectorAll('a').forEach(function (a) { a.onclick = function () { f.classList.remove('open'); }; });
    }
    f.firstChild.onclick = function (e) { e.stopPropagation(); fill(); f.classList.toggle('open'); };
    document.addEventListener('click', function (e) { if (!f.contains(e.target)) f.classList.remove('open'); });
    document.body.appendChild(f);
  }

  /* simple signature pad: draw (smoothed, speed-thinned ink) or type in a script face */
  function pad() {
    styleOnce();
    var o = document.createElement('div'); o.className = 'ghost-pad';
    o.innerHTML = '<div class="gb" role="dialog" aria-label="Signature pad"><h3>Your signature</h3>' +
      '<div class="gt"><button type="button" class="on" data-m="draw">Draw</button><button type="button" data-m="type">Type</button></div>' +
      '<input type="text" placeholder="Type your name" style="display:none">' +
      '<canvas></canvas>' +
      '<div class="gr"><label>Ink <input type="color" value="#1b2a6b"></label><label>Smooth <input type="range" min="0" max="10" value="5"></label><label>Background <select data-bg><option value="white">White</option><option value="none">None</option></select></label><span class="sp"></span>' +
      '<button type="button" data-a="clear">Clear</button><button type="button" data-a="png">Save picture</button><button type="button" data-a="keep">Keep</button><button type="button" class="gp" data-a="sign">Sign last PDF ↗</button><button type="button" data-a="x">Close</button></div>' +
      '<div class="gn">Kept in Ghost Calligrapher\'s Saved signatures on this browser. Nothing is uploaded.</div></div>';
    document.body.appendChild(o);
    var cv = o.querySelector('canvas'), g = cv.getContext('2d'), name = o.querySelector('input[type=text]'),
      ink = o.querySelector('input[type=color]'), sm = o.querySelector('input[type=range]'), mode = 'draw', strokes = [], cur = null;
    function size() { var r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); g.setTransform(d, 0, 0, d, 0, 0); redraw(); }
    function smooth(s) {
      var k = +sm.value, out = s.map(function (p, i) { var x = 0, y = 0, n = 0; for (var j = Math.max(0, i - k); j <= Math.min(s.length - 1, i + k); j++) { x += s[j].x; y += s[j].y; n++; } return {x: x / n, y: y / n, w: p.w}; });
      return out;
    }
    function pathOf(s) {
      if (s.length < 2) return 'M' + s[0].x.toFixed(1) + ' ' + s[0].y.toFixed(1) + 'l0.1 0';
      var d = 'M' + s[0].x.toFixed(1) + ' ' + s[0].y.toFixed(1);
      for (var i = 1; i < s.length - 1; i++) { var mx = (s[i].x + s[i + 1].x) / 2, my = (s[i].y + s[i + 1].y) / 2; d += 'Q' + s[i].x.toFixed(1) + ' ' + s[i].y.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1); }
      var e = s[s.length - 1]; return d + 'L' + e.x.toFixed(1) + ' ' + e.y.toFixed(1);
    }
    function typedFont(h) { return 'italic ' + Math.round(h) + 'px "Segoe Script","Brush Script MT","Snell Roundhand","Lucida Handwriting",cursive'; }
    function redraw() {
      var r = cv.getBoundingClientRect(); g.clearRect(0, 0, r.width, r.height);
      g.strokeStyle = '#d5dae6'; g.lineWidth = 1; g.beginPath(); g.moveTo(24, r.height - 46); g.lineTo(r.width - 24, r.height - 46); g.stroke();
      g.fillStyle = g.strokeStyle = ink.value;
      if (mode === 'type') { var t = name.value.trim(); if (t) { var h = 64; g.font = typedFont(h); while (g.measureText(t).width > r.width - 40 && h > 18) { h -= 2; g.font = typedFont(h); } g.textBaseline = 'alphabetic'; g.fillText(t, 24, r.height - 54); } return; }
      g.lineCap = g.lineJoin = 'round';
      strokes.forEach(function (s) { var q = smooth(s); for (var i = 1; i < q.length; i++) { g.lineWidth = q[i].w; g.beginPath(); g.moveTo(q[i - 1].x, q[i - 1].y); g.lineTo(q[i].x, q[i].y); g.stroke(); } if (q.length === 1) { g.beginPath(); g.arc(q[0].x, q[0].y, q[0].w / 2, 0, 7); g.fill(); } });
    }
    function pt(e) { var r = cv.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp, p: e.pressure}; }
    cv.onpointerdown = function (e) { if (mode !== 'draw') return; cv.setPointerCapture(e.pointerId); var p = pt(e); p.w = 2.6; cur = [p]; strokes.push(cur); redraw(); };
    cv.onpointermove = function (e) {
      if (!cur) return; var p = pt(e), l = cur[cur.length - 1], d = Math.hypot(p.x - l.x, p.y - l.y); if (d < 1.2) return;
      var v = d / Math.max(1, p.t - l.t), w = (e.pointerType === 'pen' && p.p > 0) ? 1.2 + p.p * 3 : Math.max(1.1, Math.min(3.4, 3.6 - v * 1.4));
      p.w = l.w * 0.6 + w * 0.4; cur.push(p); redraw();
    };
    cv.onpointerup = cv.onpointercancel = function () { cur = null; };
    o.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { mode = b.dataset.m; o.querySelectorAll('[data-m]').forEach(function (x) { x.classList.toggle('on', x === b); }); name.style.display = mode === 'type' ? '' : 'none'; if (mode === 'type') name.focus(); redraw(); }; });
    name.oninput = ink.oninput = sm.oninput = redraw;
    name.onkeydown = function (e) { e.stopPropagation(); };
    function svg() {
      var r = cv.getBoundingClientRect();
      if (mode === 'type') {
        var t = name.value.trim(); if (!t) return null;
        var h = 64; g.font = typedFont(h); while (g.measureText(t).width > r.width - 40 && h > 18) { h -= 2; g.font = typedFont(h); }
        var w = Math.ceil(g.measureText(t).width + 24), hh = Math.ceil(h * 1.5);
        return {w: w, h: hh, name: t, svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + hh + '" viewBox="0 0 ' + w + ' ' + hh + '" fill="currentColor"><text x="12" y="' + Math.round(h * 1.05) + '" font-family="Segoe Script, Brush Script MT, Snell Roundhand, Lucida Handwriting, cursive" font-style="italic" font-size="' + h + '">' + esc(t) + '</text></svg>'};
      }
      if (!strokes.length) return null;
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      strokes.forEach(function (s) { s.forEach(function (p) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }); });
      var pd = 6, W = Math.ceil(x1 - x0 + pd * 2), H = Math.ceil(y1 - y0 + pd * 2), body = '';
      strokes.forEach(function (s) {
        var q = smooth(s).map(function (p) { return {x: p.x - x0 + pd, y: p.y - y0 + pd, w: p.w}; }), avg = q.reduce(function (a, p) { return a + p.w; }, 0) / q.length;
        body += '<path d="' + pathOf(q) + '" stroke-width="' + avg.toFixed(2) + '"/>';
      });
      return {w: W, h: H, name: 'Drawn signature', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>'};
    }
    function keep() {
      var s = svg(); if (!s) { alert(mode === 'type' ? 'Type your name first.' : 'Sign on the pad first.'); return null; }
      var list = lsGet(SIGS, []), id = Date.now() + '-' + Math.floor(Math.random() * 1e4), now = Date.now();
      list.unshift({id: id, savedAt: now, usedAt: now, name: s.name, svg: s.svg, w: s.w, h: s.h, drawn: true, color: ink.value, from: 'mtgcalc'});
      try { localStorage.setItem(SIGS, JSON.stringify(list.slice(0, 20))); } catch (e) {}
      return id;
    }
    function close() { window.removeEventListener('resize', size); o.remove(); }
    o.querySelector('[data-a=clear]').onclick = function () { strokes = []; name.value = ''; redraw(); };
    o.querySelector('[data-a=x]').onclick = close;
    o.onclick = function (e) { if (e.target === o) close(); };
    o.querySelector('[data-a=keep]').onclick = function () { if (keep()) { close(); } };
    /* 57.17: the picture is just the signature (no guide line), on white unless "None" is picked; the choice is
       shared with Ghost Calligrapher's picture background setting */
    var bgSel = o.querySelector('[data-bg]'); bgSel.value = lsGet('cal2_pic_bg', 'white') === 'none' ? 'none' : 'white';
    bgSel.onchange = function () { try { localStorage.setItem('cal2_pic_bg', JSON.stringify(bgSel.value)); } catch (e) {} };
    o.querySelector('[data-a=png]').onclick = function () {
      var s = svg(); if (!s) return;
      var im = new Image(), k = Math.max(2, 1200 / s.w);
      im.onload = function () {
        var c = document.createElement('canvas'); c.width = Math.round(s.w * k); c.height = Math.round(s.h * k);
        var x = c.getContext('2d'); if (bgSel.value !== 'none') { x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); }
        x.drawImage(im, 0, 0, c.width, c.height);
        var a = document.createElement('a'); a.download = 'signature.png'; a.href = c.toDataURL('image/png'); aClick.call(a);
      };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svg.replace(/currentColor/g, ink.value));
    };
    o.querySelector('[data-a=sign]').onclick = function () {
      var id = keep(); if (!id) return;
      try { localStorage.setItem('cal2_use_sig', id); } catch (e) {}
      window.open(ghostLink('sign'), '_blank', 'noopener'); close();
    };
    window.addEventListener('resize', size);
    requestAnimationFrame(size);
  }
  window.ghostSignaturePad = pad;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fab); else fab();
})();
