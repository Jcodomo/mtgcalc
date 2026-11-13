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

  /* ------------------------------------------------------------------ 57.11: the pen engine
     Our own handwriting engine (written for this site, no outside model): the text is set in one of the handwriting styles,
     thinned to the centre line of every letter (Zhang-Suen thinning), traced into pen strokes in writing order, and then drawn
     again as ink - pressure that swells and tapers, a hand that wanders (sloppiness, legibility), a pen that runs dry and comes
     back (fade), uneven flow with paper grain, and an animated "being written" preview at the chosen speed. */
  function noise1(seed) { var R = rng(seed), v = new Float32Array(1024); for (var i = 0; i < 1024; i++) v[i] = R() * 2 - 1;
    return function (x) { var i = Math.floor(x), f = x - i, a = v[i & 1023], b = v[(i + 1) & 1023], t = f * f * (3 - 2 * f); return a + (b - a) * t; }; }
  function hexRgb(h) { h = String(h || '#111827').replace('#', ''); return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]; }
  function wrapLines(text, n) {
    var out = []; String(text || '').replace(/\r/g, '').split('\n').forEach(function (para) { var line = ''; para.split(/\s+/).forEach(function (w) { if (!w) return; if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }); out.push(line); });
    while (out.length > 1 && !out[out.length - 1]) out.pop(); return out.slice(0, 14);
  }
  function rasterLines(lines, font, px) {
    var m = document.createElement('canvas').getContext('2d'); m.font = px + 'px "' + font + '"';
    var tw = Math.max.apply(null, lines.map(function (l) { return m.measureText(l || ' ').width; })), lh = Math.round(px * 1.45);
    var c = document.createElement('canvas'); c.width = Math.ceil(tw + px * 1.4); c.height = Math.ceil(lh * lines.length + px * 0.9);
    var g = c.getContext('2d'); g.fillStyle = '#000'; g.font = m.font; g.textBaseline = 'alphabetic';
    lines.forEach(function (l, i) { g.fillText(l, px * 0.7, px * 1.15 + i * lh); });
    return {c: c, lh: lh, base: px * 1.15};
  }
  /* Zhang-Suen thinning inside the ink's bounding box */
  function thin(c) {
    var w = c.width, h = c.height, d = c.getContext('2d', {willReadFrequently: true}).getImageData(0, 0, w, h).data, g = new Uint8Array(w * h), x0 = w, y0 = h, x1 = 0, y1 = 0, i, x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { i = y * w + x; if (d[i * 4 + 3] > 110) { g[i] = 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    x0 = Math.max(1, x0); y0 = Math.max(1, y0); x1 = Math.min(w - 2, x1); y1 = Math.min(h - 2, y1);
    var rm = [], changed = true, guard = 0;
    while (changed && guard++ < 60) { changed = false;
      for (var pass = 0; pass < 2; pass++) { rm.length = 0;
        for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) { i = y * w + x; if (!g[i]) continue;
          var p2 = g[i - w], p3 = g[i - w + 1], p4 = g[i + 1], p5 = g[i + w + 1], p6 = g[i + w], p7 = g[i + w - 1], p8 = g[i - 1], p9 = g[i - w - 1], B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          var A = (!p2 && p3 ? 1 : 0) + (!p3 && p4 ? 1 : 0) + (!p4 && p5 ? 1 : 0) + (!p5 && p6 ? 1 : 0) + (!p6 && p7 ? 1 : 0) + (!p7 && p8 ? 1 : 0) + (!p8 && p9 ? 1 : 0) + (!p9 && p2 ? 1 : 0);
          if (A !== 1) continue;
          if (pass === 0 ? (p2 && p4 && p6) || (p4 && p6 && p8) : (p2 && p4 && p8) || (p2 && p6 && p8)) continue;
          rm.push(i); }
        if (rm.length) { changed = true; for (var k = 0; k < rm.length; k++) g[rm[k]] = 0; } } }
    return {g: g, w: w, h: h, box: [x0, y0, x1, y1]};
  }
  var NB = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  /* the thinned letters become pen strokes: from each loose end, then around closed loops, always carrying on in the
     straightest direction, joined to the stroke they meet, short thinning spurs dropped, dots kept */
  function tracePaths(S, px) {
    var g = S.g, w = S.w, vis = new Uint8Array(g.length), paths = [], b = S.box;
    var nbs = function (i) { var x = i % w, y = (i - x) / w, o = []; for (var k = 0; k < 8; k++) { var j = (y + NB[k][1]) * w + x + NB[k][0]; if (g[j]) o.push(j); } return o; };
    var xy = function (i) { var x = i % w; return [x, (i - x) / w]; };
    var walk = function (s) {
      var p = [s], cur = s, dx = 0, dy = 0; vis[s] = 1;
      var pre = nbs(s).filter(function (j) { return vis[j]; })[0], joined = pre != null; if (joined) p.unshift(pre);
      for (var n = 0; n < 20000; n++) {
        var c = nbs(cur).filter(function (j) { return !vis[j]; }); if (!c.length) break;
        var best = c[0], bs = -9, cx = cur % w, cy = (cur - cx) / w;
        c.forEach(function (j) { var q = xy(j), ex = q[0] - cx, ey = q[1] - cy, sc = (dx || dy) ? (ex * dx + ey * dy) / Math.hypot(ex, ey) / Math.hypot(dx, dy) : 0; if (Math.abs(ex) + Math.abs(ey) === 1) sc += 0.02; if (sc > bs) { bs = sc; best = j; } });
        var q2 = xy(best); dx = dx * 0.55 + (q2[0] - cx); dy = dy * 0.55 + (q2[1] - cy); vis[best] = 1; p.push(best); cur = best;
      }
      var post = nbs(cur).filter(function (j) { return vis[j] && j !== p[p.length - 2] && p.indexOf(j) < 0; })[0]; if (post != null && p.length > 3) { p.push(post); joined = true; }
      p.joined = joined || nbs(cur).some(function (j) { return vis[j] && p.indexOf(j) < 0; }); return p;
    };
    var all = []; for (var y = b[1]; y <= b[3]; y++) for (var x = b[0]; x <= b[2]; x++) { var i = y * w + x; if (g[i]) all.push(i); }
    var ends = all.filter(function (i) { return nbs(i).length === 1; }).sort(function (a, c) { return (a % w) - (c % w); });
    ends.forEach(function (i) { if (!vis[i]) paths.push(walk(i)); });
    all.sort(function (a, c) { return (a % w) - (c % w); }).forEach(function (i) { if (!vis[i]) { if (!nbs(i).length) { vis[i] = 1; paths.push([i]); } else paths.push(walk(i)); } });
    var minLen = Math.max(3, px * 0.07);
    /* a short mark on its own is a dot, period or comma (kept as one dab); a short one touching a stroke is thinning debris */
    return paths.map(function (p) { var q = p.map(xy); q.joined = p.joined; return q; }).map(function (p) { if (p.length === 1) return p; var L = 0; for (var k = 1; k < p.length; k++) L += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); if (L >= minLen) return p; if (p.joined) return null;
        var cx = 0, cy = 0; p.forEach(function (q) { cx += q[0]; cy += q[1]; }); return L > minLen * 0.5 ? [p[0], p[p.length - 1]] : [[cx / p.length, cy / p.length]]; }).filter(Boolean)
      .map(function (p) { if (p.length < 2) return p; var a = p[0], z = p[p.length - 1], vert = Math.abs(z[1] - a[1]) > Math.abs(z[0] - a[0]) * 1.6; return (vert ? a[1] > z[1] : a[0] > z[0] + 2) ? p.reverse() : p; })
      .map(function (p) { return smooth(rdp(p, 0.75)); })
      .sort(function (a, c) { var la = Math.floor(a[0][1] / (px * 1.45)), lc = Math.floor(c[0][1] / (px * 1.45)); return la - lc || minX(a) - minX(c); });
  }
  function minX(p) { var m = 1e9; p.forEach(function (q) { if (q[0] < m) m = q[0]; }); return m; }
  function rdp(p, e) { if (p.length < 3) return p; var a = p[0], z = p[p.length - 1], dx = z[0] - a[0], dy = z[1] - a[1], L = Math.hypot(dx, dy) || 1, mi = 0, md = 0;
    for (var i = 1; i < p.length - 1; i++) { var d = Math.abs(dy * p[i][0] - dx * p[i][1] + z[0] * a[1] - z[1] * a[0]) / L; if (d > md) { md = d; mi = i; } }
    return md > e ? rdp(p.slice(0, mi + 1), e).slice(0, -1).concat(rdp(p.slice(mi), e)) : [a, z]; }
  function smooth(p) { if (p.length < 3) return p; for (var r = 0; r < 2; r++) { var o = [p[0]]; for (var i = 0; i < p.length - 1; i++) { var a = p[i], b = p[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(p[p.length - 1]); p = o; } return p; }
  var penCache = {};
  function penPaths(lines, font, px) {
    var key = font + '|' + px + '|' + lines.join('\n'); if (penCache[key]) return penCache[key];
    var R = rasterLines(lines, font, px), S = thin(R.c), P = {paths: tracePaths(S, px), w: R.c.width, h: R.c.height, px: px, lh: R.lh, base: R.base};
    var keys = Object.keys(penCache); if (keys.length > 24) delete penCache[keys[0]]; penCache[key] = P; return P;
  }
  /* the hand and the ink: every point moves a little (sloppiness), letters stretch and squash around their line (legibility),
     the whole line leans (slant) and drifts; pressure tapers at both ends of a stroke and wavers (uneven), the ink thins as
     the pen runs dry (fade) and has grain where it skips */
  function penInk(P, o, seed, scale) {
    var px = P.px, sl = Math.tan((o.slant || 0) * Math.PI / 180), sloppy = (o.sloppy || 0) / 10, leg = 1 - (o.legib == null ? 7 : o.legib) / 10, fade = (o.fade || 0) / 10, un = (o.uneven || 0) / 10;
    var nA = noise1(seed + 1), nB = noise1(seed + 2), nP = noise1(seed + 3), nF = noise1(seed + 4), nL = noise1(seed + 5), nL2 = noise1(seed + 6), nS = noise1(seed + 7), R = rng(seed + 8), ph = R() * 6.28;
    var pad = px * 0.6, W = Math.ceil((P.w + Math.abs(sl) * P.h + pad * 2) * scale), H = Math.ceil((P.h + pad * 2) * scale);
    var strokes = P.paths.map(function (p, k) {
      var s = 0; return p.map(function (q, j) {
        if (j) s += Math.hypot(q[0] - p[j - 1][0], q[1] - p[j - 1][1]);
        var line = Math.max(0, Math.floor((q[1] - P.base + px * 0.95) / P.lh)), base = P.base + line * P.lh, x = q[0], y = q[1];
        x += nL(x / 45 + line * 9) * leg * px * 0.13; y = base + (y - base) * (1 + nL2(x / 70 + line * 5) * leg * 0.32);
        x += nA(s / 26 + k * 7.31) * sloppy * px * 0.045; y += nB(s / 26 + k * 3.17) * sloppy * px * 0.045 + Math.sin(x / (px * 2.6) + ph + line) * sloppy * px * 0.07;
        x += sl * (base - y);
        return [(x + pad + Math.max(0, sl) * 0 + (sl < 0 ? Math.abs(sl) * P.h : 0)) * scale, (y + pad) * scale, s];
      });
    });
    var total = 0; strokes.forEach(function (p) { total += p.length ? p[p.length - 1][2] : 0; });
    var wid = Math.max(0.6, (o.width || 3) * scale * px / 110), ink = hexRgb(o.ink), op = (o.op == null ? 92 : o.op) / 100;
    var A = document.createElement('canvas'), Bc = document.createElement('canvas'); A.width = Bc.width = W; A.height = Bc.height = H;
    var ga = A.getContext('2d'), gb = Bc.getContext('2d'); ga.lineCap = ga.lineJoin = gb.lineCap = gb.lineJoin = 'round'; ga.strokeStyle = ga.fillStyle = '#fff';
    var segs = [], run = 0;
    strokes.forEach(function (p, k) {
      var L = p.length ? p[p.length - 1][2] || 1 : 1;
      if (p.length === 1) { var lv0 = Math.max(0.25, 1 - fade * 0.45 * (run / (total || 1))); segs.push({k: k, a: p[0], b: p[0], w: wid * 1.15, lv: lv0}); return; }
      for (var j = 1; j < p.length; j++) { var t = p[j][2] / L, tap = 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.92)), pr = tap * (1 + un * 0.45 * nP(p[j][2] / 14 + k * 11.3));
        var lv = 1 - fade * 0.5 * ((run + p[j][2]) / (total || 1)) - fade * 0.3 * Math.max(0, nF(p[j][2] / 45 + k * 1.7)) - un * 0.38 * Math.max(0, nS(p[j][2] / 4 + k * 5.1)) + (j < 6 ? 0.08 : 0);
        segs.push({k: k, a: p[j - 1], b: p[j], w: Math.max(0.5, wid * pr), lv: Math.max(0.12, Math.min(1, lv))}); }
      run += L;
    });
    segs.forEach(function (sg) {
      ga.lineWidth = sg.w; ga.beginPath(); ga.moveTo(sg.a[0], sg.a[1]); if (sg.a === sg.b) { ga.arc(sg.a[0], sg.a[1], sg.w / 2, 0, 7); ga.fill(); } else { ga.lineTo(sg.b[0], sg.b[1]); ga.stroke(); }
      var v = Math.round(sg.lv * 255); gb.strokeStyle = gb.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; gb.lineWidth = sg.w + 2.5 * scale; gb.beginPath(); gb.moveTo(sg.a[0], sg.a[1]); if (sg.a === sg.b) { gb.arc(sg.a[0], sg.a[1], sg.w, 0, 7); gb.fill(); } else { gb.lineTo(sg.b[0], sg.b[1]); gb.stroke(); }
    });
    var da = ga.getImageData(0, 0, W, H), pa = da.data, pb = gb.getImageData(0, 0, W, H).data, R2 = rng(seed + 13);
    for (var i = 0; i < pa.length; i += 4) { var a = pa[i + 3]; if (!a) continue; var lvp = pb[i + 3] ? pb[i] / 255 : 1, gr = 1 - un * 0.6 * Math.pow(R2(), 4); pa[i] = ink[0]; pa[i + 1] = ink[1]; pa[i + 2] = ink[2]; pa[i + 3] = Math.round(a * lvp * op * gr); }
    ga.putImageData(da, 0, 0);
    /* crop to the writing, and move the strokes with it */
    var bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; segs.forEach(function (sg) { [sg.a, sg.b].forEach(function (q) { var r2 = sg.w; if (q[0] - r2 < bx0) bx0 = q[0] - r2; if (q[1] - r2 < by0) by0 = q[1] - r2; if (q[0] + r2 > bx1) bx1 = q[0] + r2; if (q[1] + r2 > by1) by1 = q[1] + r2; }); });
    if (segs.length) { var m = 12 * scale; bx0 = Math.max(0, Math.floor(bx0 - m)); by0 = Math.max(0, Math.floor(by0 - m)); bx1 = Math.min(W, Math.ceil(bx1 + m)); by1 = Math.min(H, Math.ceil(by1 + m));
      var C = document.createElement('canvas'); C.width = bx1 - bx0; C.height = by1 - by0; C.getContext('2d').drawImage(A, bx0, by0, C.width, C.height, 0, 0, C.width, C.height); A = C; W = C.width; H = C.height;
      segs = segs.map(function (sg) { var a2 = [sg.a[0] - bx0, sg.a[1] - by0], b2 = sg.a === sg.b ? a2 : [sg.b[0] - bx0, sg.b[1] - by0]; return {k: sg.k, a: a2, b: b2, w: sg.w, lv: sg.lv}; }); }
    return {canvas: A, segs: segs, W: W, H: H, ink: o.ink, op: op};
  }
  /* "being written": the strokes drawn in order at the chosen speed, then the finished ink */
  function animatePen(cv, res, speed, done) {
    var g = cv.getContext('2d'), k = cv.width / res.W; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    if (!speed || speed >= 10 || !res.segs.length) { g.drawImage(res.canvas, 0, 0, cv.width, cv.height); if (done) done(); return function () {}; }
    var i = 0, per = Math.max(1, Math.round(speed * speed * 0.9)), stop = false, ink = res.ink;
    g.lineCap = g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = ink; g.globalAlpha = Math.min(1, res.op);
    var step = function () { if (stop) return; for (var n = 0; n < per && i < res.segs.length; n++, i++) { var sg = res.segs[i]; g.lineWidth = sg.w * k; g.beginPath(); g.moveTo(sg.a[0] * k, sg.a[1] * k); if (sg.a === sg.b) { g.arc(sg.a[0] * k, sg.a[1] * k, sg.w * k / 2, 0, 7); g.fill(); } else { g.lineTo(sg.b[0] * k, sg.b[1] * k); g.stroke(); } }
      if (i < res.segs.length) setTimeout(step, 16); else { g.globalAlpha = 1; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(res.canvas, 0, 0, cv.width, cv.height); if (done) done(); } };
    step(); return function () { stop = true; };
  }
  function penSvg(res) {
    var c = res.ink, byStroke = {}; res.segs.forEach(function (sg) { (byStroke[sg.k] = byStroke[sg.k] || []).push(sg); });
    var body = Object.keys(byStroke).map(function (k) { var L = byStroke[k], w = L.reduce(function (m, s2) { return m + s2.w; }, 0) / L.length, lv = L.reduce(function (m, s2) { return m + s2.lv; }, 0) / L.length;
      if (L.length === 1 && L[0].a === L[0].b) return '<circle cx="' + L[0].a[0].toFixed(1) + '" cy="' + L[0].a[1].toFixed(1) + '" r="' + (L[0].w / 2).toFixed(1) + '" fill="' + c + '" fill-opacity="' + (lv * res.op).toFixed(2) + '"/>';
      return '<path d="M' + L[0].a[0].toFixed(1) + ' ' + L[0].a[1].toFixed(1) + L.map(function (s2) { return 'L' + s2.b[0].toFixed(1) + ' ' + s2.b[1].toFixed(1); }).join('') + '" stroke-width="' + w.toFixed(2) + '" stroke-opacity="' + (lv * res.op).toFixed(2) + '"/>'; }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + res.W + '" height="' + res.H + '" viewBox="0 0 ' + res.W + ' ' + res.H + '"><g fill="none" stroke="' + c + '" stroke-linecap="round" stroke-linejoin="round">' + body + '</g></svg>';
  }
  /* the same ink for typed styles: opacity, a pen running dry and grain */
  function inkify(c, o, seed) {
    if (!c) return c; var op = (o.op == null ? 100 : o.op) / 100, fade = (o.fade || 0) / 10, un = (o.uneven || 0) / 10; if (op >= 1 && !fade && !un) return c;
    var g = c.getContext('2d'), d; try { d = g.getImageData(0, 0, c.width, c.height); } catch (e) { return c; } var p = d.data, nF = noise1(seed + 4), R = rng(seed + 13), W = c.width;
    for (var i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; var x = (i / 4) % W, y = Math.floor(i / 4 / W), lv = 1 - fade * 0.5 * (x / W) - fade * 0.3 * Math.max(0, nF(x / 55)) - un * 0.35 * Math.max(0, nF(x / 4 + y / 9 + 40)), gr = 1 - un * 0.6 * Math.pow(R(), 4);
      p[i + 3] = Math.round(p[i + 3] * Math.max(0.12, lv) * op * gr); }
    g.putImageData(d, 0, 0); return c;
  }
  function download(href, name, revoke) { var l = document.createElement('a'); l.href = href; l.download = name; document.body.appendChild(l); l.click(); l.remove(); if (revoke) setTimeout(function () { URL.revokeObjectURL(href); }, 4000); }

  /* ------------------------------------------------------------------ the dialog */
  var dlg = null, opts = {}, st = {tab: 'pen', penFont: 0, penText: '', speed: 6, legib: 7, width: 3, op: 92, sloppy: 3, fade: 3, uneven: 3, penSlant: 4, tOp: 100, tFade: 0, tUneven: 0, stype: 'signature', rmbg: true, font: 0, ink: INKS[0][0], slant: 6, weight: 0.6, vary: 4, size: 1, flourish: '', seed: 7, initials: false, pen: 3, thr: 190, upInk: 'keep'};
  try { var keep = JSON.parse(localStorage.getItem('mt.sign.prefs') || 'null'); if (keep) Object.keys(keep).forEach(function (k) { if (k in st && k !== 'tab') st[k] = keep[k]; }); } catch (e) {}
  function prefs() { try { var p = {}; ['font', 'ink', 'slant', 'weight', 'vary', 'size', 'flourish', 'pen', 'thr', 'upInk', 'penFont', 'speed', 'legib', 'width', 'op', 'sloppy', 'fade', 'uneven', 'penSlant', 'tOp', 'tFade', 'tUneven', 'bgMode', 'tol', 'speck'].forEach(function (k) { p[k] = st[k]; }); localStorage.setItem('mt.sign.prefs', JSON.stringify(p)); } catch (e) {} }
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
      '<div class="tb" role="tablist">' + [['pen', 'Handwriting pen'], ['type', 'Type'], ['draw', 'Draw'], ['upload', 'From a file'], ['saved', 'Saved (' + load().length + ')']].map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div class="bd"></div></div>';
    document.body.appendChild(dlg); document.addEventListener('keydown', onKey, true);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    dlg.querySelector('.sh').addEventListener('click', function (e) { if (e.target.closest('[data-s=close]')) close(); });
    dlg.querySelector('.tb').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) tab(b.getAttribute('data-tab')); });
    tab(opts.tab || (load().length && !opts.name ? 'saved' : 'pen'));
  }
  function tab(t) {
    st.tab = t; [].forEach.call(dlg.querySelectorAll('[data-tab]'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === t)); });
    var old = dlg.querySelector('.bd'), bd = old.cloneNode(false); old.parentNode.replaceChild(bd, old);   /* a fresh box: no handlers left over from the last tab */
    if (penStop) { penStop(); penStop = null; }
    ({pen: tabPen, type: tabType, draw: tabDraw, upload: tabUpload, saved: tabSaved})[t](bd);
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

  /* ----- Handwriting pen */
  var penStop = null;
  function tabPen(bd) {
    var rng10 = function (k, lab, min, max, step, tip) { return '<label' + (tip ? ' title="' + tip + '"' : '') + '>' + lab + '<input type="range" data-s="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + st[k] + '"></label>'; };
    if (!st.penText) st.penText = st.name || '';
    bd.innerHTML = '<div class="ctl"><label>Style<select data-s="penFont">' + FONTS.map(function (f, i) { return '<option value="' + i + '"' + (i === +st.penFont ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(f[0]) + '</option>'; }).join('') + '</select></label>' +
      '<label>Ink<select data-s="ink">' + INKS.map(function (k) { return '<option value="' + k[0] + '"' + (st.ink === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></label>' +
      rng10('speed', 'Speed', 1, 10, 1, '10 shows the finished ink at once') + rng10('legib', 'Legibility', 0, 10, 1, 'Lower lets the letters stretch and squash like quick handwriting') + rng10('width', 'Stroke width', 1, 7, 0.5) + rng10('op', 'Opacity', 35, 100, 5) +
      rng10('sloppy', 'Sloppiness', 0, 10, 1, 'How much the hand wanders and the line drifts') + rng10('fade', 'Faded', 0, 10, 1, 'The pen running dry along the writing') + rng10('uneven', 'Uneven ink', 0, 10, 1, 'Wavering pressure, skips and paper grain') + rng10('penSlant', 'Slant', -10, 25, 1) + '</div>' +
      '<div class="prev" style="min-height:180px;padding:6px"><canvas data-s="penCanvas" style="max-width:100%;display:block" aria-label="Handwriting preview"></canvas></div>' +
      '<div class="ft" style="align-items:stretch"><textarea data-s="penText" rows="2" aria-label="Text to write by hand" placeholder="Type a name, initials or a short note - it is written by hand above" style="flex:1 1 300px;background:#06101f;border:1px solid #2b5590;border-radius:8px;color:#fff;padding:8px 10px;font:15px/1.4 ui-monospace,Consolas,monospace;resize:vertical">' + esc(st.penText) + '</textarea>' +
      '<div style="display:flex;flex-direction:column;gap:6px"><button type="button" class="pri" data-s="write" style="font-size:14px;padding:9px 18px">Write</button><button type="button" data-s="retake" title="The same words, written again">New take</button></div></div>' +
      '<div class="ft" style="margin-top:6px"><button type="button" data-s="replay">Replay</button><button type="button" data-s="png">Download PNG</button><button type="button" data-s="svg">Download SVG (vector)</button><span class="note" style="margin:0">Our own pen engine: the letters are traced to single pen strokes and inked again.</span></div>' +
      footer(st.penText.split('\n')[0] || st.name || '', st.initials);
    var cv = bd.querySelector('[data-s=penCanvas]'), last = null, busy = 0;
    var write = function (animate) {
      var text = (bd.querySelector('[data-s=penText]').value || '').trim(); st.penText = text; prefs();
      if (!text) { say('Type something to write.', true); return; }
      var lines = wrapLines(text, 38), f = FONTS[+st.penFont] || FONTS[0], my = ++busy; say('Writing…');
      fonts(text).then(function () { return document.fonts && document.fonts.load ? document.fonts.load('80px "' + f[0] + '"', text).catch(function () {}) : null; }).then(function () {
        if (my !== busy || !cv.isConnected) return;
        setTimeout(function () {
          if (my !== busy) return; var t0 = performance.now();
          var P = penPaths(lines, f[0], Math.round(96 * (f[1] || 1))), res = penInk(P, {ink: st.ink, width: +st.width, op: +st.op, sloppy: +st.sloppy, fade: +st.fade, uneven: +st.uneven, legib: +st.legib, slant: +st.penSlant}, st.seed || 7, 2);
          last = res; var box = cv.parentNode.clientWidth - 12 || 800, k = Math.min(1, box / res.W, 360 / res.H); cv.width = Math.max(10, Math.round(res.W * k)); cv.height = Math.max(10, Math.round(res.H * k));
          if (penStop) penStop(); penStop = animatePen(cv, res, animate === false ? 10 : +st.speed, function () { say(P.paths.length + ' pen strokes, written in ' + Math.round(performance.now() - t0) + ' ms.'); });
          var lb = bd.querySelector('[data-s=label]'); if (lb && lb.__auto !== false) { lb.value = text.split('\n')[0].slice(0, 60); lb.__auto = true; }
        }, 10);
      });
    };
    var again = function () { clearTimeout(again.t); again.t = setTimeout(function () { write(false); }, 160); };
    bd.addEventListener('input', function (e) { var k = e.target.getAttribute('data-s'); if (!k || k === 'label') return; if (k === 'penText') { st.penText = e.target.value; return; } st[k] = e.target.type === 'range' ? +e.target.value : e.target.value; prefs(); if (k !== 'speed') again(); });
    bd.addEventListener('change', function (e) { var k = e.target.getAttribute('data-s'); if (k === 'penFont' || k === 'ink') { st[k] = k === 'penFont' ? +e.target.value : e.target.value; prefs(); write(true); } if (k === 'label') e.target.__auto = false; });
    bd.addEventListener('keydown', function (e) { if (e.target.getAttribute('data-s') === 'penText' && e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey && e.target.value.indexOf('\n') < 0 && e.target.value.length < 60)) { e.preventDefault(); write(true); } });
    bd.addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; var a = b.getAttribute('data-s');
      if (a === 'write') write(true); if (a === 'retake') { st.seed = 1 + Math.floor(Math.random() * 1e6); write(true); }
      if (a === 'replay' && last) { if (penStop) penStop(); penStop = animatePen(cv, last, Math.min(9, +st.speed || 6)); }
      if (a === 'png' && last) download(trim(last.canvas, 10).toDataURL('image/png'), (st.penText.split('\n')[0] || 'handwriting').replace(/[^\w -]+/g, '').slice(0, 40) + '.png');
      if (a === 'svg' && last) download(URL.createObjectURL(new Blob([penSvg(last)], {type: 'image/svg+xml'})), (st.penText.split('\n')[0] || 'handwriting').replace(/[^\w -]+/g, '').slice(0, 40) + '.svg', true);
      if (a === 'save') { if (!last) { say('Press Write first.', true); return; } saveCanvas(trim(last.canvas, 10), 'pen', {font: (FONTS[+st.penFont] || [''])[0], text: st.penText, seed: st.seed, speed: st.speed, legib: st.legib, width: st.width, op: st.op, sloppy: st.sloppy, fade: st.fade, uneven: st.uneven}); }
    });
    if (st.penText) write(true);
  }
  /* ----- Type */
  function tabType(bd) {
    bd.innerHTML = '<div class="ctl"><label style="flex:1 1 220px">Name<input type="text" data-s="name" value="' + esc(st.name || '') + '" placeholder="Full name as it is signed"></label>' +
      '<label class="ck" title="Write the initials (JS) and save them as Initials"><input type="checkbox" data-s="initials"' + (st.initials ? ' checked' : '') + '>Initials</label>' +
      '<label>Ink<select data-s="ink">' + INKS.map(function (k) { return '<option value="' + k[0] + '"' + (st.ink === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>Slant<input type="range" data-s="slant" min="-12" max="24" step="1" value="' + st.slant + '"></label><label>Stroke width<input type="range" data-s="weight" min="0" max="3" step="0.2" value="' + st.weight + '"></label>' +
      '<label>Size<input type="range" data-s="size" min="0.7" max="1.4" step="0.05" value="' + st.size + '"></label><label title="Lower is neater and more legible; higher looks more hand-made">Variation (legibility)<input type="range" data-s="vary" min="0" max="10" step="1" value="' + st.vary + '"></label>' +
      '<label>Flourish<select data-s="flourish">' + [['', 'None'], ['under', 'Underline swoosh'], ['tail', 'Return tail'], ['double', 'Double underline']].map(function (k) { return '<option value="' + k[0] + '"' + (st.flourish === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>Opacity<input type="range" data-s="tOp" min="35" max="100" step="5" value="' + st.tOp + '"></label><label title="The pen running dry along the name">Faded<input type="range" data-s="tFade" min="0" max="10" step="1" value="' + st.tFade + '"></label><label title="Skips and paper grain">Uneven ink<input type="range" data-s="tUneven" min="0" max="10" step="1" value="' + st.tUneven + '"></label>' +
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
      if (a === 'save') { var t = nameText(); if (!t) { say('Type the name first.', true); return; } var f = FONTS[st.font]; saveCanvas(inkify(typed(t, f, st), {op: st.tOp, fade: st.tFade, uneven: st.tUneven}, st.seed), 'typed', {font: f[0], text: t, ink: st.ink, slant: st.slant, weight: st.weight, vary: st.vary, flourish: st.flourish, seed: st.seed}); }
    });
    bd.addEventListener('keydown', function (e) { var c = e.target.closest('[data-f]'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); } });
    paint();
    function paint() {
      var t = nameText(), cards = bd.querySelectorAll('[data-f]'); if (!cards.length) return;
      if (!t) { [].forEach.call(cards, function (c) { var im = c.querySelector('img'); if (im) im.remove(); }); return; }
      fonts(t).then(function () { if (!bd.isConnected) return; [].forEach.call(cards, function (c, i) { var cv = inkify(typed(t, FONTS[i], st), {op: st.tOp, fade: st.tFade, uneven: st.tUneven}, st.seed); var im = c.querySelector('img') || c.insertBefore(document.createElement('img'), c.firstChild); im.alt = t + ' in ' + FONTS[i][0]; if (cv) im.src = fit(cv, 600, 160).toDataURL(); }); });
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
  /* ----- From a file: any PNG, SVG, JPG or photo becomes a signature with no background.
     The background colour is found from the picture's edges (white paper, cream or grey scans, a coloured fill, an SVG's
     background rectangle) and removed with soft edges; a picture that is already transparent is kept as it is. Specks
     are cleaned up, the ink can be recoloured, and the result is cropped close. */
  function tabUpload(bd) {
    if (!st.bgMode) st.bgMode = 'auto'; if (st.tol == null) st.tol = 60; if (st.speck == null) st.speck = true;
    bd.innerHTML = '<div class="ctl"><label style="flex:1 1 240px">PNG, SVG, JPG or a photo of a signature<input type="file" data-s="file" accept="image/png,image/svg+xml,.svg,image/jpeg,image/webp,image/*"></label>' +
      '<label>Background<select data-s="bgMode"><option value="auto">Remove the background (found automatically)</option><option value="dark">Keep only the dark ink</option><option value="none">Keep the picture as it is</option></select></label>' +
      '<label title="Higher removes more of the background, and lighter ink with it">Removal strength<input type="range" data-s="tol" min="10" max="160" step="5" value="' + st.tol + '"></label>' +
      '<label class="ck"><input type="checkbox" data-s="speck"' + (st.speck ? ' checked' : '') + '>Clean up specks</label>' +
      '<label>Ink<select data-s="upInk"><option value="keep">As in the file</option>' + INKS.map(function (k) { return '<option value="' + k[0] + '">' + k[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="prev" data-s="drop" tabindex="0" style="background:repeating-conic-gradient(#e5e7eb 0 25%,#fff 0 50%) 0 0/18px 18px;color:#374151;text-align:center;min-height:150px">Drop a PNG or SVG here, paste one (Ctrl+V), or choose a file above.<br>The background is removed and the signature is cropped close - the checkerboard shows what is transparent.</div>' +
      '<div class="note" data-s="bginfo" role="status"></div>' + footer(st.name || 'Signature from a file');
    bd.querySelector('[data-s=bgMode]').value = st.bgMode; bd.querySelector('[data-s=upInk]').value = st.upInk || 'keep';
    var img = null, out = null, fname = '';
    function build() {
      if (!img) return; var nw = img.naturalWidth || 1200, nh = img.naturalHeight || 400, k = Math.min(1, 1400 / nw, 900 / nh), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(nw * k)); c.height = Math.max(1, Math.round(nh * k));
      var g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0, c.width, c.height); var d, W = c.width, H = c.height;
      try { d = g.getImageData(0, 0, W, H); } catch (er) { say('That picture cannot be read here.', true); return; }
      var p = d.data, samp = [], stp = Math.max(1, Math.round((W + H) / 500));
      var sm = function (x, y) { var i = (y * W + x) * 4; samp.push([p[i], p[i + 1], p[i + 2], p[i + 3]]); };
      for (var x = 0; x < W; x += stp) { sm(x, 0); sm(x, H - 1); sm(x, Math.min(H - 1, 2)); sm(x, Math.max(0, H - 3)); }
      for (var y = 0; y < H; y += stp) { sm(0, y); sm(W - 1, y); sm(Math.min(W - 1, 2), y); sm(Math.max(0, W - 3), y); }
      var clear = samp.filter(function (q) { return q[3] < 40; }).length / samp.length, bg = null;
      if (clear < 0.6) { var op = samp.filter(function (q) { return q[3] >= 40; }), med = function (ch) { var v = op.map(function (q) { return q[ch]; }).sort(function (m, n) { return m - n; }); return v[v.length >> 1]; }; bg = [med(0), med(1), med(2)]; }
      var mode = st.bgMode, tol = +st.tol, rgb = st.upInk === 'keep' || !st.upInk ? null : hexRgb(st.upInk), thr = 255 - tol;
      for (var i = 0; i < p.length; i += 4) {
        if (p[i + 3] < 8) { p[i + 3] = 0; continue; }
        if (mode === 'auto' && bg) { var dist = Math.sqrt((p[i] - bg[0]) * (p[i] - bg[0]) + (p[i + 1] - bg[1]) * (p[i + 1] - bg[1]) + (p[i + 2] - bg[2]) * (p[i + 2] - bg[2])); if (dist < tol) { p[i + 3] = 0; continue; } if (dist < tol + 45) p[i + 3] = Math.round(p[i + 3] * (dist - tol) / 45); }
        else if (mode === 'dark') { var lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; if (lum >= thr) { p[i + 3] = 0; continue; } p[i + 3] = Math.round(p[i + 3] * Math.min(1, (thr - lum) / 60)); }
        if (rgb) { p[i] = rgb[0]; p[i + 1] = rgb[1]; p[i + 2] = rgb[2]; }
      }
      /* specks: small separate marks (dust, scanner noise, compression blocks) are removed; the dots of i and j are bigger and stay */
      if (st.speck && mode !== 'none') {
        var lab = new Int32Array(W * H), sizes = [0], ink = 0, stack = [], n2, comp;
        for (i = 0; i < W * H; i++) if (p[i * 4 + 3] > 40) ink++;
        for (i = 0; i < W * H; i++) { if (p[i * 4 + 3] <= 40 || lab[i]) continue; comp = sizes.length; sizes.push(0); stack.push(i); lab[i] = comp;
          while (stack.length) { n2 = stack.pop(); sizes[comp]++; var cx = n2 % W, cy = (n2 - cx) / W;
            for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var xx = cx + dx, yy = cy + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; var j = yy * W + xx; if (!lab[j] && p[j * 4 + 3] > 40) { lab[j] = comp; stack.push(j); } } } }
        var minA = Math.max(6, Math.round(ink * 0.0015));
        for (i = 0; i < W * H; i++) { if (lab[i] && sizes[lab[i]] < minA) p[i * 4 + 3] = 0; else if (!lab[i] && p[i * 4 + 3] <= 40) { var nb = 0; /* faint edge pixels next to nothing */ if (p[i * 4 + 3] > 0) { var cx2 = i % W, cy2 = (i - cx2) / W; for (var e2 = 0; e2 < 8 && !nb; e2++) { var x3 = cx2 + NB[e2][0], y3 = cy2 + NB[e2][1]; if (x3 >= 0 && y3 >= 0 && x3 < W && y3 < H && lab[y3 * W + x3]) nb = 1; } if (!nb) p[i * 4 + 3] = 0; } } }
      }
      g.putImageData(d, 0, 0); out = trim(c, 10);
      var info = bd.querySelector('[data-s=bginfo]'), hex = bg ? '#' + bg.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('') : '';
      info.innerHTML = mode === 'none' ? 'The picture is kept as it is.' : mode === 'dark' ? 'Everything lighter than the ink is removed.' : bg ? 'Background found: <span style="display:inline-block;width:12px;height:12px;border:1px solid #93a6c0;vertical-align:-2px;background:' + hex + '"></span> ' + hex + ' - removed.' + ((0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) < 110 ? ' The ink is lighter than the background - choose an ink colour so it shows on paper.' : '') : 'The picture already has a clear background - nothing to remove.';
      if (out) info.innerHTML += ' Signature: ' + out.width + ' x ' + out.height + ' px.';
      var pv = bd.querySelector('[data-s=drop]'); pv.innerHTML = out ? '<img alt="The signature with its background removed" src="' + fit(out, 900, 260).toDataURL() + '">' : 'No ink was left - lower the removal strength.';
    }
    function loadFile(f) {
      if (!f) return; var svg = /svg/i.test(f.type) || /\.svg$/i.test(f.name || ''); if (!svg && !/^image\//.test(f.type || '')) { say('Choose a PNG, SVG, JPG or photo.', true); return; }
      fname = String(f.name || '').replace(/\.[a-z0-9]+$/i, ''); var r = new FileReader();
      r.onload = function () { var src = r.result;
        if (svg) { var t = String(src), vb = t.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i), hasW = /<svg[^>]*\swidth\s*=\s*["'][\d.]+(px)?["']/i.test(t);
          if (!hasW) { var vw = vb ? +vb[1] : 1200, vh = vb ? +vb[2] : 400, k2 = 1200 / (vw || 1200); t = t.replace(/<svg\b/i, '<svg width="' + Math.round(vw * k2) + '" height="' + Math.round(vh * k2) + '"'); }
          src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t); }
        img = new Image(); img.onload = function () { var lb = bd.querySelector('[data-s=label]'); if (lb && (!lb.value || /^Signature from a file$/.test(lb.value)) && fname) lb.value = fname.slice(0, 60); build(); };
        img.onerror = function () { say('That file could not be opened as a picture.', true); }; img.src = src; };
      if (svg) r.readAsText(f); else r.readAsDataURL(f);
    }
    var drop = bd.querySelector('[data-s=drop]');
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.style.outline = '2px dashed #3d8bfd'; });
    drop.addEventListener('dragleave', function () { drop.style.outline = ''; });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.style.outline = ''; loadFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
    var onPaste = function (e) { if (!bd.isConnected) { document.removeEventListener('paste', onPaste); return; } var items = [].slice.call((e.clipboardData && e.clipboardData.items) || []), it = items.filter(function (x) { return /^image\//.test(x.type); })[0];
      if (it) { e.preventDefault(); loadFile(it.getAsFile()); return; } var txt = e.clipboardData && e.clipboardData.getData('text/plain'); if (txt && /^\s*<svg[\s>]/i.test(txt)) { e.preventDefault(); loadFile(new File([txt], 'pasted.svg', {type: 'image/svg+xml'})); } };
    document.addEventListener('paste', onPaste);
    bd.addEventListener('change', function (e) { var k = e.target.getAttribute('data-s');
      if (k === 'file') { loadFile(e.target.files && e.target.files[0]); e.target.value = ''; }
      if (k === 'bgMode' || k === 'upInk') { st[k] = e.target.value; prefs(); build(); }
      if (k === 'speck') { st.speck = e.target.checked; prefs(); build(); } });
    bd.addEventListener('input', function (e) { if (e.target.getAttribute('data-s') === 'tol') { st.tol = +e.target.value; prefs(); clearTimeout(build.t); build.t = setTimeout(build, 90); } });
    bd.addEventListener('click', function (e) { var b = e.target.closest('[data-s=save]'); if (b) saveCanvas(out, 'file'); });
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
  window.MTSign = {open: open, close: close, list: function () { return load().map(function (g) { return {id: g.id, label: g.label, kind: g.kind, type: g.type || 'signature', png: g.png, w: g.w, h: g.h}; }); }, get: get, fonts: FONTS.map(function (f) { return f[0]; }), _typed: typed, _fonts: fonts, _pen: {paths: penPaths, ink: penInk, svg: penSvg, wrap: wrapLines}};
})();
