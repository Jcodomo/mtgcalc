/* 57.10: signature maker. Signatures are made three ways - typed in a handwriting style (fifteen open-licence script fonts
   from Google Fonts, with ink, slant, weight, natural variation and a flourish), drawn with a mouse, finger or pen, or taken
   from a photo of a real signature (the paper is made transparent) - and kept in this browser as images. The Document
   Builder places them on any signature line. MTSign.open({name, label, onSave}), MTSign.list(), MTSign.get(id). */
(function () {
  'use strict';
  if (window.MTSign) return;
  var KEY = 'mt.sign.v1', MAX = 20, Z = 2147483400;
  var FONTS = [['Nothing You Could Do', 0.85], ['Dawning of a New Day', 1.1], ['Over the Rainbow', 1], ['Waiting for the Sunrise', 1.05], ['Mrs Saint Delafield', 1.25], ['Great Vibes', 1], ['Allura', 1.05], ['Alex Brush', 1], ['Sacramento', 1.2], ['Dancing Script', 0.9], ['Mr De Haviland', 1.3], ['Herr Von Muellerhoff', 1.3], ['Monsieur La Doulaise', 1.05],
    ['Homemade Apple', 0.72], ['La Belle Aurore', 0.9], ['Cedarville Cursive', 0.85], ['Kristi', 1.15], ['Yellowtail', 0.95], ['Caveat', 1], ['Zeyada', 1.1]];
  var GF = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Allura&family=Caveat:wght@500&family=Cedarville+Cursive&family=Dancing+Script:wght@500&family=Great+Vibes&family=Herr+Von+Muellerhoff&family=Homemade+Apple&family=Kristi&family=La+Belle+Aurore&family=Monsieur+La+Doulaise&family=Mr+De+Haviland&family=Sacramento&family=Yellowtail&family=Zeyada&family=Nothing+You+Could+Do&family=Dawning+of+a+New+Day&family=Over+the+Rainbow&family=Waiting+for+the+Sunrise&family=Mrs+Saint+Delafield&display=swap';
  var INKS = [['#111827', 'Black'], ['#1d3fb8', 'Blue'], ['#0b2a63', 'Navy']];
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; } }
  function store(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ------------------------------------------------------------------ drawing helpers */
  function rng(seed) { var a = seed >>> 0 || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function trim(c, pad) {
    pad = pad == null ? 8 : pad; var g = c.getContext('2d'), w = c.width, h = c.height, d; try { d = g.getImageData(0, 0, w, h).data; } catch (e) { return c; }
    var x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    var o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o;
  }
  function fit(c, maxW, maxH) { var k = Math.min(1, maxW / c.width, maxH / c.height); if (k >= 1) return c; var o = document.createElement('canvas'); o.width = Math.round(c.width * k); o.height = Math.round(c.height * k); var g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, o.width, o.height); return o; }
  /* a tapered pen stroke along a quadratic curve: thin - full - thin */
  function taper(g, pts, w) {
    for (var i = 1; i < pts.length; i++) { var t = i / pts.length, k = Math.sin(Math.PI * Math.min(1, t * 1.15)); g.lineWidth = Math.max(0.6, w * (0.25 + 0.75 * k)); g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
  }
  function bez(p0, p1, p2, p3, n) { var out = []; for (var i = 0; i <= n; i++) { var t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return out; }
  /* a typed signature: the name in a script font, slanted, with ink weight, a gentle hand-made wave along the line and an
     optional flourish; the same seed always gives the same signature, "New variation" picks another */
  function typed(text, font, o) {
    var px = Math.round(110 * (font[1] || 1) * (o.size || 1)), meas = document.createElement('canvas').getContext('2d');
    meas.font = px + 'px "' + font[0] + '"'; var tw = meas.measureText(text).width;
    var slant = (o.slant || 0) * Math.PI / 180, H = Math.round(px * 2.4), W = Math.round(tw + px * 1.6 + Math.abs(Math.tan(slant)) * H);
    var c = document.createElement('canvas'); c.width = Math.max(60, W); c.height = H; var g = c.getContext('2d'), R = rng(o.seed || 1), base = Math.round(H * 0.6);
    g.fillStyle = g.strokeStyle = o.ink || '#111827'; g.lineJoin = g.lineCap = 'round';
    var lift = (R() - 0.5) * (o.vary || 0) * 0.012;                                   /* the line rises or falls a little */
    g.setTransform(1, lift, -Math.tan(slant), 1, px * 0.5 + Math.tan(slant) * base, 0);
    g.font = px + 'px "' + font[0] + '"'; g.textBaseline = 'alphabetic'; g.fillText(text, 0, base);
    if (o.weight > 0) { g.lineWidth = o.weight * px / 110; g.strokeText(text, 0, base); }
    if (o.flourish) {
      var ink = Math.max(1.6, px / 28 + (o.weight || 0) * 0.8), j = function (v) { return v + (R() - 0.5) * px * 0.12; };
      if (o.flourish === 'under') taper(g, bez([-px * 0.15, base + px * 0.22], [tw * 0.3, j(base + px * 0.42)], [tw * 0.7, j(base + px * 0.12)], [tw * 1.05, base + px * 0.2], 60), ink);
      else if (o.flourish === 'tail') taper(g, bez([tw * 0.92, base - px * 0.05], [tw * 1.1, j(base + px * 0.3)], [tw * 0.4, j(base + px * 0.55)], [-px * 0.1, base + px * 0.26], 70), ink);
      else if (o.flourish === 'double') { taper(g, bez([-px * 0.1, base + px * 0.2], [tw * 0.35, j(base + px * 0.34)], [tw * 0.7, j(base + px * 0.12)], [tw, base + px * 0.18], 60), ink); taper(g, bez([tw * 0.1, base + px * 0.34], [tw * 0.4, j(base + px * 0.44)], [tw * 0.75, j(base + px * 0.28)], [tw * 0.95, base + px * 0.32], 60), ink * 0.8); }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    var v = o.vary || 0; if (v > 0) {                                                  /* the hand-made wave: each thin column moves up or down a little */
      var w2 = document.createElement('canvas'); w2.width = c.width; w2.height = c.height; var g2 = w2.getContext('2d');
      var a1 = v * px * 0.006, a2 = v * px * 0.004, p1 = 60 + R() * 140, p2 = 22 + R() * 30, f1 = R() * 6.3, f2 = R() * 6.3;
      for (var x = 0; x < c.width; x += 2) { var dy = a1 * Math.sin(x / p1 + f1) + a2 * Math.sin(x / p2 + f2); g2.drawImage(c, x, 0, 2, c.height, x, dy, 2, c.height); }
      c = w2;
    }
    return trim(c, 10);
  }
  var fontsP = null;
  function fonts(text) {
    if (!fontsP) {
      if (!document.getElementById('mtSignFonts')) { var l = document.createElement('link'); l.id = 'mtSignFonts'; l.rel = 'stylesheet'; l.href = GF; document.head.appendChild(l); }
      fontsP = new Promise(function (res) { var l2 = document.getElementById('mtSignFonts'); if (l2.sheet) res(); else { l2.onload = res; l2.onerror = res; setTimeout(res, 6000); } })
        .then(function () { return Promise.all(FONTS.map(function (f) { return document.fonts && document.fonts.load ? document.fonts.load('48px "' + f[0] + '"', text || 'Signature').catch(function () {}) : null; })); })
        .then(function () { return true; }, function () { return false; });
    }
    return fontsP;
  }

  /* ------------------------------------------------------------------ the dialog */
  var dlg = null, opts = {}, st = {tab: 'type', stype: 'signature', rmbg: true, font: 0, ink: INKS[0][0], slant: 6, weight: 0.6, vary: 4, size: 1, flourish: '', seed: 7, initials: false, pen: 3, thr: 190, upInk: 'keep'};
  try { var keep = JSON.parse(localStorage.getItem('mt.sign.prefs') || 'null'); if (keep) Object.keys(keep).forEach(function (k) { if (k in st && k !== 'tab') st[k] = keep[k]; }); } catch (e) {}
  function prefs() { try { var p = {}; ['font', 'ink', 'slant', 'weight', 'vary', 'size', 'flourish', 'pen', 'thr', 'upInk'].forEach(function (k) { p[k] = st[k]; }); localStorage.setItem('mt.sign.prefs', JSON.stringify(p)); } catch (e) {} }
  var CSS = '#mtSign{position:fixed;inset:0;z-index:' + Z + ';background:rgba(3,8,18,.62);display:flex;align-items:center;justify-content:center;padding:14px;font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}' +
    '#mtSign .sd{background:#0b1a31;color:#e8eef8;border:1px solid #22406a;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.55);width:min(980px,100%);max-height:calc(100vh - 28px);display:flex;flex-direction:column}' +
    '#mtSign .sh{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #16325a}#mtSign .sh h2{margin:0;font-size:16px;flex:1}' +
    '#mtSign .tb{display:flex;gap:4px;padding:10px 16px 0;flex-wrap:wrap}#mtSign button{border:1px solid #2b5590;background:transparent;color:#cfe0f7;border-radius:999px;padding:6px 12px;font:600 12.5px system-ui,sans-serif;cursor:pointer}' +
    '#mtSign button:hover{background:#123a75}#mtSign button.on,#mtSign button.pri{background:#226ccc;border-color:#226ccc;color:#fff}#mtSign .bd{padding:12px 16px 16px;overflow:auto}' +
    '#mtSign .ctl{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:end;margin-bottom:10px}#mtSign label{display:grid;gap:3px;font-size:11.5px;color:#93a6c0}#mtSign label.ck{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#e8eef8}' +
    '#mtSign input[type=text],#mtSign select{background:#06101f;border:1px solid #2b5590;border-radius:8px;color:#fff;padding:7px 9px;font:inherit;min-width:0}#mtSign input[type=range]{width:120px}' +
    '#mtSign .gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}#mtSign .card{background:#fff;border:2px solid transparent;border-radius:10px;height:92px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;padding:6px}' +
    '#mtSign .card img{max-width:100%;max-height:78px}#mtSign .card.sel{border-color:#3d8bfd;box-shadow:0 0 0 3px #3d8bfd55}#mtSign .card small{position:absolute;left:8px;bottom:3px;color:#6b7280;font-size:10px}' +
    '#mtSign .pad{background:#fff;border-radius:10px;touch-action:none;width:100%;height:220px;display:block;cursor:crosshair}#mtSign .prev{background:#fff;border-radius:10px;min-height:120px;display:flex;align-items:center;justify-content:center;padding:10px}#mtSign .prev img{max-width:100%;max-height:200px}' +
    '#mtSign .ft{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}#mtSign .ft input[type=text]{flex:1 1 220px}#mtSign .note{color:#93a6c0;font-size:11.5px;margin-top:8px}' +
    '#mtSign .sv{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}#mtSign .sv>div{background:#06101f;border:1px solid #22406a;border-radius:10px;padding:8px}#mtSign .sv .im{background:#fff;border-radius:8px;height:80px;display:flex;align-items:center;justify-content:center;margin-bottom:6px}#mtSign .sv img{max-width:95%;max-height:72px}#mtSign .sv .r{display:flex;gap:6px;flex-wrap:wrap}' +
    '#mtSign .msg{color:#7fd19b;font-size:12px}#mtSign .msg.bad{color:#ffb35c}' +
    '@media (max-width:640px){#mtSign{padding:0}#mtSign .sd{max-height:100vh;border-radius:0;height:100%}#mtSign .gal{grid-template-columns:1fr 1fr}}';
  function close() { if (dlg) { dlg.remove(); dlg = null; document.removeEventListener('keydown', onKey, true); } }
  function onKey(e) { if (e.key === 'Escape' && dlg) { e.stopPropagation(); close(); } }
  function say(t, bad) { var m = dlg && dlg.querySelector('.msg'); if (m) { m.textContent = t; m.className = 'msg' + (bad ? ' bad' : ''); } }
  function nameText() { var n = String(st.name || '').trim(); if (!st.initials) return n; return n.split(/\s+/).filter(Boolean).map(function (w) { return w[0].toUpperCase(); }).join(''); }

  function open(o) {
    opts = o || {}; close(); st.name = st.name && !opts.name ? st.name : (opts.name || st.name || '');
    if (!document.getElementById('mtSignCss')) { var s = document.createElement('style'); s.id = 'mtSignCss'; s.textContent = CSS; document.head.appendChild(s); }
    dlg = document.createElement('div'); dlg.id = 'mtSign'; dlg.className = 'no-print';
    dlg.innerHTML = '<div class="sd" role="dialog" aria-modal="true" aria-labelledby="mtSignT"><div class="sh"><h2 id="mtSignT">Signatures</h2><button type="button" data-s="close" aria-label="Close the signature maker">Close</button></div>' +
      '<div class="tb" role="tablist">' + [['type', 'Type'], ['draw', 'Draw'], ['upload', 'From a file'], ['saved', 'Saved (' + load().length + ')']].map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div class="bd"></div></div>';
    document.body.appendChild(dlg); document.addEventListener('keydown', onKey, true);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    dlg.querySelector('.sh').addEventListener('click', function (e) { if (e.target.closest('[data-s=close]')) close(); });
    dlg.querySelector('.tb').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) tab(b.getAttribute('data-tab')); });
    tab(opts.tab || (load().length && !opts.name ? 'saved' : 'type'));
  }
  function tab(t) {
    st.tab = t; [].forEach.call(dlg.querySelectorAll('[data-tab]'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === t)); });
    var old = dlg.querySelector('.bd'), bd = old.cloneNode(false); old.parentNode.replaceChild(bd, old);   /* a fresh box: no handlers left over from the last tab */
    ({type: tabType, draw: tabDraw, upload: tabUpload, saved: tabSaved})[t](bd);
  }
  function footer(def, ini) { return '<div class="ft"><input type="text" data-s="label" aria-label="Name for this signature" placeholder="Name for this signature" value="' + esc(def) + '"><label style="display:flex;align-items:center;gap:6px">Save as<select data-s="stype"><option value="signature"' + (ini ? '' : ' selected') + '>Signature</option><option value="initials"' + (ini ? ' selected' : '') + '>Initials</option></select></label><button type="button" class="pri" data-s="save">Save</button><span class="msg" role="status"></span></div>' +
    '<div class="note">Signatures are kept as pictures in this browser only. A signature picture is not a verified e-signature - place one only on a document its signer has approved.</div>'; }
  function saveCanvas(c, kind, meta) {
    if (!c) { say('There is nothing to save yet.', true); return; }
    c = fit(c, 1100, 300); var png = c.toDataURL('image/png'), list = load();
    var label = (dlg.querySelector('[data-s=label]').value || '').trim() || (st.name || 'Signature');
    if (list.length >= MAX) { say('Up to ' + MAX + ' signatures are kept - delete one under Saved first.', true); return; }
    var ty = dlg.querySelector('[data-s=stype]'), sig = {id: uid(), label: label.slice(0, 60), kind: kind, type: ty && ty.value === 'initials' ? 'initials' : 'signature', png: png, w: c.width, h: c.height, at: Date.now(), meta: meta || {}};
    list.unshift(sig); if (!store(list)) { say('This browser has no room left for another signature - delete one under Saved.', true); return; }
    say('Saved as ' + (sig.type === 'initials' ? 'initials' : 'a signature') + ': "' + sig.label + '".'); var tb = dlg.querySelector('[data-tab=saved]'); if (tb) tb.textContent = 'Saved (' + list.length + ')';
    try { document.dispatchEvent(new CustomEvent('mtsign:change', {detail: {id: sig.id}})); } catch (e) {}
    if (opts.onSave) { try { opts.onSave(sig); } catch (e) {} }
  }

  /* ----- Type */
  function tabType(bd) {
    bd.innerHTML = '<div class="ctl"><label style="flex:1 1 220px">Name<input type="text" data-s="name" value="' + esc(st.name || '') + '" placeholder="Full name as it is signed"></label>' +
      '<label class="ck" title="Write the initials (JS) and save them as Initials"><input type="checkbox" data-s="initials"' + (st.initials ? ' checked' : '') + '>Initials</label>' +
      '<label>Ink<select data-s="ink">' + INKS.map(function (k) { return '<option value="' + k[0] + '"' + (st.ink === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>Slant<input type="range" data-s="slant" min="-12" max="24" step="1" value="' + st.slant + '"></label><label>Stroke width<input type="range" data-s="weight" min="0" max="3" step="0.2" value="' + st.weight + '"></label>' +
      '<label>Size<input type="range" data-s="size" min="0.7" max="1.4" step="0.05" value="' + st.size + '"></label><label title="Lower is neater and more legible; higher looks more hand-made">Variation (legibility)<input type="range" data-s="vary" min="0" max="10" step="1" value="' + st.vary + '"></label>' +
      '<label>Flourish<select data-s="flourish">' + [['', 'None'], ['under', 'Underline swoosh'], ['tail', 'Return tail'], ['double', 'Double underline']].map(function (k) { return '<option value="' + k[0] + '"' + (st.flourish === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></label>' +
      '<button type="button" data-s="reseed" title="Another natural variation of every style">New variation</button></div>' +
      '<div class="gal" role="listbox" aria-label="Handwriting styles">' + FONTS.map(function (f, i) { return '<div class="card' + (i === st.font ? ' sel' : '') + '" role="option" tabindex="0" aria-selected="' + (i === st.font) + '" data-f="' + i + '"><small>' + esc(f[0]) + '</small></div>'; }).join('') + '</div>' +
      footer(st.initials ? nameText() : st.name || '', st.initials);
    var draw = function () { clearTimeout(draw.t); draw.t = setTimeout(paint, 90); };
    bd.addEventListener('input', function (e) { var k = e.target.getAttribute('data-s'); if (!k || k === 'label') return; st[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? +e.target.value : e.target.value; if (k === 'name' || k === 'initials') { var lb = bd.querySelector('[data-s=label]'); if (lb && (!lb.value || lb.__auto !== false)) { lb.value = st.initials ? nameText() : st.name; lb.__auto = true; } var ty = bd.querySelector('[data-s=stype]'); if (ty && k === 'initials') ty.value = st.initials ? 'initials' : 'signature'; } prefs(); draw(); });
    bd.addEventListener('change', function (e) { if (e.target.matches('select,input[type=checkbox]')) { var k = e.target.getAttribute('data-s'); st[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; prefs(); draw(); } if (e.target.getAttribute('data-s') === 'label') e.target.__auto = false; });
    bd.addEventListener('click', function (e) {
      var c = e.target.closest('[data-f]'); if (c) { st.font = +c.getAttribute('data-f'); prefs(); [].forEach.call(bd.querySelectorAll('[data-f]'), function (x) { x.classList.toggle('sel', x === c); x.setAttribute('aria-selected', String(x === c)); }); return; }
      var b = e.target.closest('[data-s]'); if (!b) return; var a = b.getAttribute('data-s');
      if (a === 'reseed') { st.seed = 1 + Math.floor(Math.random() * 1e6); draw(); }
      if (a === 'save') { var t = nameText(); if (!t) { say('Type the name first.', true); return; } var f = FONTS[st.font]; saveCanvas(typed(t, f, st), 'typed', {font: f[0], text: t, ink: st.ink, slant: st.slant, weight: st.weight, vary: st.vary, flourish: st.flourish, seed: st.seed}); }
    });
    bd.addEventListener('keydown', function (e) { var c = e.target.closest('[data-f]'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); } });
    paint();
    function paint() {
      var t = nameText(), cards = bd.querySelectorAll('[data-f]'); if (!cards.length) return;
      if (!t) { [].forEach.call(cards, function (c) { var im = c.querySelector('img'); if (im) im.remove(); }); return; }
      fonts(t).then(function () { if (!bd.isConnected) return; [].forEach.call(cards, function (c, i) { var cv = typed(t, FONTS[i], st); var im = c.querySelector('img') || c.insertBefore(document.createElement('img'), c.firstChild); im.alt = t + ' in ' + FONTS[i][0]; if (cv) im.src = fit(cv, 600, 160).toDataURL(); }); });
    }
  }
  /* ----- Draw */
  function tabDraw(bd) {
    bd.innerHTML = '<div class="ctl"><label>Ink<select data-s="ink">' + INKS.map(function (k) { return '<option value="' + k[0] + '"' + (st.ink === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>Pen<select data-s="pen">' + [[2, 'Fine'], [3, 'Medium'], [4.5, 'Bold']].map(function (k) { return '<option value="' + k[0] + '"' + (+st.pen === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></label>' +
      '<button type="button" data-s="undo">Undo</button><button type="button" data-s="clear">Clear</button></div>' +
      '<canvas class="pad" aria-label="Sign here with a mouse, finger or pen"></canvas><div class="note" style="margin-top:6px">Sign in the white box. The line is thinner where the pen moves fast, like ink.</div>' + footer(st.name || 'Drawn signature');
    var cv = bd.querySelector('canvas'), dpr = Math.max(2, window.devicePixelRatio || 1), strokes = [], curS = null;
    var size = function () { var r = cv.getBoundingClientRect(); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); redraw(); };
    function seg(g, a, b, c) { g.beginPath(); g.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2); g.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2); g.lineWidth = (b.w + c.w) / 2; g.stroke(); }
    function redraw() { var g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineCap = g.lineJoin = 'round'; g.strokeStyle = st.ink;
      g.save(); g.strokeStyle = '#cbd5e1'; g.lineWidth = 1; g.setLineDash([5, 5]); g.beginPath(); var by = cv.height / dpr * 0.72; g.moveTo(20, by); g.lineTo(cv.width / dpr - 20, by); g.stroke(); g.restore();
      strokes.forEach(function (s) { if (s.length === 1) { g.beginPath(); g.arc(s[0].x, s[0].y, s[0].w / 2, 0, 7); g.fillStyle = st.ink; g.fill(); } for (var i = 1; i < s.length - 1; i++) seg(g, s[i - 1], s[i], s[i + 1]); }); }
    function pt(e) { var r = cv.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp || Date.now()}; }
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} var p = pt(e); p.w = +st.pen; curS = [p]; strokes.push(curS); redraw(); });
    cv.addEventListener('pointermove', function (e) { if (!curS) return; var p = pt(e), q = curS[curS.length - 1], d = Math.hypot(p.x - q.x, p.y - q.y); if (d < 1.2) return;
      var v = d / Math.max(1, p.t - q.t), w = +st.pen * Math.max(0.35, Math.min(1.25, 1.25 - v * 0.45)); if (e.pressure && e.pointerType === 'pen') w = +st.pen * (0.4 + e.pressure);
      p.w = q.w * 0.6 + w * 0.4; curS.push(p); var g = cv.getContext('2d'); if (curS.length > 2) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineCap = g.lineJoin = 'round'; g.strokeStyle = st.ink; seg(g, curS[curS.length - 3], curS[curS.length - 2], p); } });
    var end = function () { curS = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', end);
    bd.addEventListener('change', function (e) { var k = e.target.getAttribute('data-s'); if (k === 'ink' || k === 'pen') { st[k] = e.target.value; prefs(); redraw(); } });
    bd.addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; var a = b.getAttribute('data-s');
      if (a === 'undo') { strokes.pop(); redraw(); } if (a === 'clear') { strokes = []; redraw(); }
      if (a === 'save') { if (!strokes.length) { say('Sign in the white box first.', true); return; } var o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; var g = o.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineCap = g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = st.ink;
        strokes.forEach(function (s) { if (s.length === 1) { g.beginPath(); g.arc(s[0].x, s[0].y, s[0].w / 2, 0, 7); g.fill(); } for (var i = 1; i < s.length - 1; i++) seg(g, s[i - 1], s[i], s[i + 1]); }); saveCanvas(trim(o, 12), 'drawn'); } });
    setTimeout(size, 0); window.addEventListener('resize', function rs() { if (!cv.isConnected) { window.removeEventListener('resize', rs); return; } size(); });
  }
  /* ----- From a photo */
  function tabUpload(bd) {
    bd.innerHTML = '<div class="ctl"><label style="flex:1 1 260px">Signature file - PNG, SVG, JPG or a photo<input type="file" data-s="file" accept="image/png,image/svg+xml,.svg,image/jpeg,image/webp,image/*"></label>' +
      '<label class="ck"><input type="checkbox" data-s="rmbg"' + (st.rmbg ? ' checked' : '') + '>Remove the paper / background</label>' +
      '<label>Paper removal<input type="range" data-s="thr" min="120" max="250" step="5" value="' + st.thr + '"></label>' +
      '<label>Ink<select data-s="upInk"><option value="keep"' + (st.upInk === 'keep' ? ' selected' : '') + '>As photographed</option>' + INKS.map(function (k) { return '<option value="' + k[0] + '"' + (st.upInk === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="prev">Choose a file. A PNG or SVG with a clear background is used as it is; for a photo, sign on plain white paper in good light and crop close.</div>' + footer(st.name || 'Signature from a file');
    var img = null, out = null;
    function build() {
      if (!img) return; var k = Math.min(1, 1400 / img.naturalWidth), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      var g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0, c.width, c.height); var d = g.getImageData(0, 0, c.width, c.height), p = d.data, thr = +st.thr;
      var rgb = st.upInk === 'keep' ? null : [parseInt(st.upInk.slice(1, 3), 16), parseInt(st.upInk.slice(3, 5), 16), parseInt(st.upInk.slice(5, 7), 16)];
      for (var i = 0; i < p.length; i += 4) { if (p[i + 3] < 8) continue; var y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        if (st.rmbg) { if (y >= thr) { p[i + 3] = 0; continue; } p[i + 3] = Math.round(p[i + 3] * Math.min(1, (thr - y) / 60)); }
        if (rgb) { p[i] = rgb[0]; p[i + 1] = rgb[1]; p[i + 2] = rgb[2]; } }
      g.putImageData(d, 0, 0); out = trim(c, 10); var pv = bd.querySelector('.prev'); pv.innerHTML = out ? '<img alt="Signature with the paper removed" src="' + fit(out, 900, 260).toDataURL() + '">' : 'No ink was found - move the paper removal slider to the right.';
    }
    bd.addEventListener('change', function (e) { var k = e.target.getAttribute('data-s');
      if (k === 'rmbg') { st.rmbg = e.target.checked; prefs(); build(); }
      if (k === 'file') { var f = e.target.files && e.target.files[0]; if (!f) return; var svg = /svg/i.test(f.type) || /\.svg$/i.test(f.name), r = new FileReader();
        r.onload = function () { var src = r.result;
          if (svg) { var t = String(src), vb = t.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i), hasW = /<svg[^>]*\swidth\s*=\s*["'][\d.]+(px)?["']/i.test(t);
            if (vb && !hasW) { var k2 = 1200 / +vb[1]; t = t.replace(/<svg\b/i, '<svg width="' + Math.round(+vb[1] * k2) + '" height="' + Math.round(+vb[2] * k2) + '"'); } src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t); }
          img = new Image(); img.onload = function () { if (svg || /png|webp/i.test(f.type)) try { var cv = document.createElement('canvas'); cv.width = Math.min(64, img.naturalWidth || 64); cv.height = Math.min(64, img.naturalHeight || 64); var g3 = cv.getContext('2d'); g3.drawImage(img, 0, 0, cv.width, cv.height); var dd = g3.getImageData(0, 0, cv.width, cv.height).data, clear = 0; for (var q = 3; q < dd.length; q += 4) if (dd[q] < 20) clear++; st.rmbg = !(clear > dd.length / 4 * 0.2); } catch (er) {} else st.rmbg = true; var cb = bd.querySelector('[data-s=rmbg]'); if (cb) cb.checked = st.rmbg; build(); };
          img.onerror = function () { say('That file could not be opened as a picture.', true); }; img.src = src; };
        if (svg) r.readAsText(f); else r.readAsDataURL(f); }
      if (k === 'upInk') { st.upInk = e.target.value; prefs(); build(); } });
    bd.addEventListener('input', function (e) { if (e.target.getAttribute('data-s') === 'thr') { st.thr = +e.target.value; prefs(); clearTimeout(build.t); build.t = setTimeout(build, 80); } });
    bd.addEventListener('click', function (e) { var b = e.target.closest('[data-s=save]'); if (b) saveCanvas(out, 'photo'); });
  }
  /* ----- Saved */
  function tabSaved(bd) {
    var list = load(), card = function (g) { return '<div data-id="' + g.id + '"><div class="im"><img alt="' + esc(g.label) + '" src="' + g.png + '"></div><input type="text" data-s="rename" aria-label="Signature name" value="' + esc(g.label) + '" style="width:100%;margin-bottom:6px"><div class="r">' +
      (opts.onPick ? '<button type="button" class="pri" data-s="pick">Use</button>' : '') + '<button type="button" data-s="dl">PNG</button><button type="button" data-s="svg">SVG</button><select data-s="recolor" aria-label="Make a copy in another ink"><option value="">Copy in ink…</option>' + INKS.map(function (k) { return '<option value="' + k[0] + '">' + k[1] + '</option>'; }).join('') + '</select><button type="button" data-s="del" aria-label="Delete">Delete</button></div></div>'; };
    var grp = function (t, l) { return l.length ? '<h3 style="margin:4px 0 8px;font-size:13px;color:#93a6c0">' + t + ' (' + l.length + ')</h3><div class="sv" style="margin-bottom:14px">' + l.map(card).join('') + '</div>' : ''; };
    bd.innerHTML = (list.length ? grp('Signatures', list.filter(function (g) { return g.type !== 'initials'; })) + grp('Initials', list.filter(function (g) { return g.type === 'initials'; }))
      : '<div class="note" style="font-size:13px">No signatures yet - make one under Type, Draw or From a file.</div>') + '<div class="ft"><span class="msg" role="status"></span></div>';
    bd.addEventListener('change', function (e) {
      if (e.target.getAttribute('data-s') === 'recolor' && e.target.value) { var gid = e.target.closest('[data-id]').getAttribute('data-id'), src = get(gid), ink = e.target.value, inkName = (INKS.filter(function (k) { return k[0] === ink; })[0] || [0, ''])[1]; e.target.value = ''; if (!src) return;
        var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; var g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = ink; g.fillRect(0, 0, c.width, c.height);
          var l2 = load(); if (l2.length >= MAX) { say('Up to ' + MAX + ' signatures are kept - delete one first.', true); return; } l2.unshift({id: uid(), label: (src.label + ' (' + inkName.toLowerCase() + ')').slice(0, 60), kind: src.kind, type: src.type, png: c.toDataURL('image/png'), w: c.width, h: c.height, at: Date.now(), meta: src.meta || {}});
          if (!store(l2)) { say('This browser has no room left - delete a signature first.', true); return; } try { document.dispatchEvent(new CustomEvent('mtsign:change', {detail: {}})); } catch (er) {} tab('saved'); say('A ' + inkName.toLowerCase() + ' copy was added.'); }; im.src = src.png; return; }
      if (e.target.getAttribute('data-s') !== 'rename') return; var id = e.target.closest('[data-id]').getAttribute('data-id'), l = load(); l.forEach(function (g) { if (g.id === id) g.label = (e.target.value || '').trim().slice(0, 60) || g.label; }); store(l); say('Renamed.'); try { document.dispatchEvent(new CustomEvent('mtsign:change', {detail: {id: id}})); } catch (er) {} });
    bd.addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b || /^(rename|recolor)$/.test(b.getAttribute('data-s'))) return; var id = b.closest('[data-id]').getAttribute('data-id'), a = b.getAttribute('data-s'), g = get(id); if (!g) return;
      if (a === 'pick' && opts.onPick) { opts.onPick(g); close(); }
      if (a === 'svg') { var sv = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + g.w + '" height="' + g.h + '" viewBox="0 0 ' + g.w + ' ' + g.h + '"><image width="' + g.w + '" height="' + g.h + '" href="' + g.png + '" xlink:href="' + g.png + '"/></svg>', ln = document.createElement('a'); ln.href = URL.createObjectURL(new Blob([sv], {type: 'image/svg+xml'})); ln.download = (g.label || 'signature').replace(/[^\w -]+/g, '') + '.svg'; document.body.appendChild(ln); ln.click(); ln.remove(); setTimeout(function () { URL.revokeObjectURL(ln.href); }, 4000); }
      if (a === 'dl') { var l = document.createElement('a'); l.href = g.png; l.download = (g.label || 'signature').replace(/[^\w -]+/g, '') + '.png'; document.body.appendChild(l); l.click(); l.remove(); }
      if (a === 'del') { if (!confirm('Delete the signature "' + g.label + '"? Documents that use it will show an empty line.')) return; store(load().filter(function (x) { return x.id !== id; })); tab('saved'); var tb = dlg.querySelector('[data-tab=saved]'); if (tb) tb.textContent = 'Saved (' + load().length + ')'; try { document.dispatchEvent(new CustomEvent('mtsign:change', {detail: {id: id, removed: true}})); } catch (er) {} } });
  }

  function get(id) { var l = load(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  window.MTSign = {open: open, close: close, list: function () { return load().map(function (g) { return {id: g.id, label: g.label, kind: g.kind, type: g.type || 'signature', png: g.png, w: g.w, h: g.h}; }); }, get: get, fonts: FONTS.map(function (f) { return f[0]; }), _typed: typed, _fonts: fonts};
})();
