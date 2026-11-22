/* OCR progress bar and RapidOCR, shared by the Mortgage Suite (assets/rapid-ocr.js) and Ghost Calligrapher (web/rapid-ocr.js).
   MTOcrBar   - one progress bar for every OCR on the page: a thin bar across the top and a card (document, engine, page X of N,
                percent, time left). job({title, engine, pages}) -> {progress(f, note), pages(n), engine(name), finish(msg, action), fail(msg)}.
   MTRapidOCR - RapidOCR in the browser: the PP-OCRv4 text detector and recognizer RapidOCR ships (ONNX, Hugging Face SWHL/RapidOCR),
                run by onnxruntime-web. Downloaded once (about 16 MB), kept in the browser cache. read(image, onProg, {turn}) ->
                {text, lines: [{text, score, box, items}], confidence, turned}. */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : self, IN_WORKER = typeof document === 'undefined';
  if (!IN_WORKER && G.MTRapidOCR && G.MTOcrBar) return;
  var SELF_URL = !IN_WORKER && document.currentScript && document.currentScript.src || '';
  function mk(w, h) { if (IN_WORKER) return new OffscreenCanvas(w, h); var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* ================================================================= progress bar */
  if (!IN_WORKER) {
  var jobs = [], seq = 0, el = null, hideT = 0;
  function css() {
    if (document.getElementById('mt-ocrbar-css')) return;
    var s = document.createElement('style'); s.id = 'mt-ocrbar-css';
    s.textContent = '#mt-ocrbar{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483000;font:13px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
      '#mt-ocrbar .mob-top{position:fixed;top:0;left:0;right:0;height:3px;pointer-events:none}#mt-ocrbar .mob-top i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3b82f6,#22c55e);transition:width .25s}' +
      '#mt-ocrbar .mob-card{position:fixed;right:16px;bottom:16px;width:min(340px,calc(100vw - 32px));box-sizing:border-box;background:rgba(17,24,39,.97);color:#f3f4f6;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:10px 12px;box-shadow:0 8px 28px rgba(0,0,0,.4)}' +
      '#mt-ocrbar .mob-h{display:flex;align-items:center;gap:8px}#mt-ocrbar .mob-t{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#mt-ocrbar .mob-x{background:none;border:0;color:inherit;font-size:17px;cursor:pointer;opacity:.7;padding:0 2px;line-height:1}' +
      '#mt-ocrbar .mob-s{font-size:12px;opacity:.85;margin:2px 0 6px;min-height:16px}#mt-ocrbar .mob-track{height:8px;border-radius:6px;background:rgba(255,255,255,.15);overflow:hidden}' +
      '#mt-ocrbar .mob-track i{display:block;height:100%;width:0;background:#3b82f6;border-radius:6px;transition:width .25s}#mt-ocrbar .mob-n{font-size:11.5px;opacity:.78;margin-top:6px}' +
      '#mt-ocrbar .mob-a button{margin:8px 6px 0 0;background:#3b82f6;color:#fff;border:0;border-radius:6px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}' +
      '#mt-ocrbar.mob-done .mob-track i,#mt-ocrbar.mob-done .mob-top i{background:#22c55e}#mt-ocrbar.mob-fail .mob-track i,#mt-ocrbar.mob-fail .mob-top i{background:#ef4444}' +
      '#mt-ocrbar.mob-min .mob-card{display:none}#mt-ocrbar.mob-off{display:none}@media (prefers-reduced-motion:reduce){#mt-ocrbar i{transition:none}}';
    (document.head || document.documentElement).appendChild(s);
  }
  function ui() {
    if (el && el.isConnected) return el;
    css(); el = document.createElement('div'); el.id = 'mt-ocrbar'; el.className = 'mob-off';
    el.innerHTML = '<div class="mob-top"><i></i></div><div class="mob-card" role="status" aria-live="polite"><div class="mob-h"><span class="mob-t"></span><button class="mob-x" type="button" aria-label="Hide the OCR progress">×</button></div>' +
      '<div class="mob-s"></div><div class="mob-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="OCR progress"><i></i></div><div class="mob-n"></div><div class="mob-a"></div></div>';
    el.querySelector('.mob-x').onclick = function () { if (jobs.length) el.classList.add('mob-min'); else el.className = 'mob-off'; };
    (document.body || document.documentElement).appendChild(el);
    return el;
  }
  function q(s) { return ui().querySelector(s); }
  function secs(s) { return s < 60 ? Math.max(1, Math.round(s)) + ' s' : Math.round(s / 60) + ' min'; }
  function paint() {
    if (!jobs.length) return;
    var e = ui(); e.classList.remove('mob-off', 'mob-done', 'mob-fail');
    var tot = 0, got = 0; jobs.forEach(function (j) { tot += j.pages; got += j.f * j.pages; });
    var f = tot ? got / tot : 0, pct = Math.round(f * 100), j = jobs[jobs.length - 1];
    q('.mob-t').textContent = jobs.length > 1 ? 'Reading ' + jobs.length + ' documents' : j.title;
    q('.mob-s').textContent = j.engine + ' · page ' + Math.min(j.pages, Math.floor(j.f * j.pages) + 1) + ' of ' + j.pages + (j.note ? ' · ' + j.note : '');
    var el2 = (Date.now() - jobs[0].t0) / 1000, left = f > 0.04 ? el2 * (1 - f) / f : 0;
    q('.mob-n').textContent = pct + '%' + (left > 1 ? ' · about ' + secs(left) + ' left' : '');
    q('.mob-track i').style.width = q('.mob-top i').style.width = pct + '%';
    q('.mob-track').setAttribute('aria-valuenow', pct); q('.mob-a').innerHTML = '';
  }
  function end(j, msg, action, bad) {
    jobs = jobs.filter(function (x) { return x !== j; });
    if (jobs.length) return paint();
    var e = ui(); e.classList.remove('mob-off', 'mob-min'); e.classList.add(bad ? 'mob-fail' : 'mob-done');
    q('.mob-t').textContent = bad ? 'OCR stopped' : 'Done reading'; q('.mob-s').textContent = msg || '';
    q('.mob-n').textContent = bad ? '' : 'Finished in ' + secs((Date.now() - j.t0) / 1000);
    q('.mob-track i').style.width = q('.mob-top i').style.width = '100%';
    var a = q('.mob-a'); a.innerHTML = '';
    (action ? [].concat(action) : []).forEach(function (x) { var b = document.createElement('button'); b.type = 'button'; b.textContent = x.label; b.onclick = function () { e.className = 'mob-off'; x.fn(); }; a.appendChild(b); });
    clearTimeout(hideT); hideT = setTimeout(function () { if (!jobs.length) e.className = 'mob-off'; }, action ? 15000 : bad ? 10000 : 8000);
  }
  window.MTOcrBar = {
    job: function (o) {
      o = o || {}; clearTimeout(hideT);
      var j = {id: ++seq, title: o.title || 'Reading text (OCR)', engine: o.engine || 'Tesseract', pages: Math.max(1, o.pages || 1), f: 0, note: '', t0: Date.now()};
      jobs.push(j); if (el) el.classList.remove('mob-min'); paint();
      return {
        progress: function (f, note) { j.f = Math.max(j.f, Math.max(0, Math.min(1, +f || 0))); if (note != null) j.note = note; paint(); },
        pages: function (n) { j.pages = Math.max(1, n || 1); paint(); },
        engine: function (name) { j.engine = name; paint(); },
        finish: function (msg, action) { end(j, msg, action, false); },
        fail: function (msg) { end(j, msg, null, true); }
      };
    }
  };

  }   /* end of the progress bar (pages only) */

  /* ================================================================= RapidOCR */
  var ORT_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
  var MODEL_BASE = 'https://huggingface.co/SWHL/RapidOCR/resolve/main/PP-OCRv4/';
  var FILES = {det: 'ch_PP-OCRv4_det_infer.onnx', rec: 'ch_PP-OCRv4_rec_infer.onnx'}, SIZES = {det: 4745517, rec: 10857958};
  var CACHE = 'mt-rapidocr-ppocrv4', state = null;
  function loadOrt() {
    if (G.ort && G.ort.InferenceSession) return Promise.resolve(G.ort);
    if (IN_WORKER) { try { importScripts(ORT_BASE + 'ort.min.js'); } catch (e) { return Promise.reject(new Error('RapidOCR could not be downloaded (cdn.jsdelivr.net).')); } return G.ort ? Promise.resolve(G.ort) : Promise.reject(new Error('onnxruntime-web did not start')); }
    return new Promise(function (res, rej) {
      var d = window.define; window.define = undefined;   /* a page's AMD loader would swallow the UMD build */
      var s = document.createElement('script'); s.src = ORT_BASE + 'ort.min.js'; s.async = true;
      s.onload = function () { window.define = d; window.ort ? res(window.ort) : rej(new Error('onnxruntime-web did not start')); };
      s.onerror = function () { window.define = d; rej(new Error('RapidOCR could not be downloaded (cdn.jsdelivr.net).')); };
      document.head.appendChild(s);
    });
  }
  async function getBytes(name, onBytes) {
    var url = MODEL_BASE + name, cache = null;
    try { cache = await caches.open(CACHE); var hit = await cache.match(url); if (hit) { var b = await hit.arrayBuffer(); onBytes(b.byteLength, b.byteLength); return b; } } catch (e) { cache = null; }
    var r = await fetch(url); if (!r.ok) throw new Error('The RapidOCR model ' + name + ' could not be downloaded (' + r.status + ').');
    var total = +r.headers.get('content-length') || SIZES[name === FILES.det ? 'det' : 'rec'], got = 0, parts = [];
    if (r.body && r.body.getReader) { var rd = r.body.getReader(); for (;;) { var x = await rd.read(); if (x.done) break; parts.push(x.value); got += x.value.length; onBytes(got, total); } }
    else { var ab = new Uint8Array(await r.arrayBuffer()); parts.push(ab); got = ab.length; onBytes(got, got); }
    var buf = new Uint8Array(got), o = 0; parts.forEach(function (p) { buf.set(p, o); o += p.length; });
    if (cache) try { await cache.put(url, new Response(buf.slice(0))); } catch (e) {}
    return buf.buffer;
  }
  /* the recognizer's character list is stored in the model (metadata "character"): ONNX ModelProto field 14, key 1 / value 2 */
  function onnxMeta(buf) {
    var u = new Uint8Array(buf), p = 0, out = {}, td = new TextDecoder();
    function vint() { var r = 0, m = 1, b; do { b = u[p++]; r += (b & 127) * m; m *= 128; } while (b & 128 && p < u.length); return r; }
    function skip(wt) { if (wt === 0) vint(); else if (wt === 1) p += 8; else if (wt === 2) { var l = vint(); p += l; } else if (wt === 5) p += 4; else p = u.length; }
    while (p < u.length) {
      var key = vint(), f = Math.floor(key / 8), wt = key % 8;
      if (f === 14 && wt === 2) { var len = vint(), endp = p + len, k = '', v = '';
        while (p < endp) { var kk = vint(), ff = Math.floor(kk / 8), ww = kk % 8; if (ww === 2) { var l2 = vint(), s = td.decode(u.subarray(p, p + l2)); p += l2; if (ff === 1) k = s; else if (ff === 2) v = s; } else skip(ww); }
        out[k] = v; }
      else skip(wt);
    }
    return out;
  }
  function mb(n) { return (n / 1048576).toFixed(1); }
  function ready(onProg) {
    if (state) return state;
    state = (async function () {
      if (onProg) onProg(0, 'starting RapidOCR');
      var ort = await loadOrt();
      ort.env.wasm.wasmPaths = ORT_BASE;
      ort.env.wasm.numThreads = G.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;
      var got = {det: 0, rec: 0}, tot = {det: SIZES.det, rec: SIZES.rec}, slow = false;
      var tick = function (k) { return function (g, t) { got[k] = g; tot[k] = t || tot[k]; var a = got.det + got.rec, b = tot.det + tot.rec; if (a < b) slow = true; if (onProg) onProg(a / b, slow ? 'downloading RapidOCR (first time only) ' + mb(a) + ' of ' + mb(b) + ' MB' : 'loading RapidOCR'); }; };
      var bufs = await Promise.all([getBytes(FILES.det, tick('det')), getBytes(FILES.rec, tick('rec'))]);
      var meta = onnxMeta(bufs[1]); if (!meta.character) throw new Error('RapidOCR: the recognition model has no character list.');
      var chars = meta.character.split(/\r?\n/); if (chars.length && chars[chars.length - 1] === '') chars.pop();
      var opt = {executionProviders: ['wasm'], graphOptimizationLevel: 'all'};
      var det = await ort.InferenceSession.create(new Uint8Array(bufs[0]), opt);
      var rec = await ort.InferenceSession.create(new Uint8Array(bufs[1]), opt);
      return {ort: ort, det: det, rec: rec, dict: ['blank'].concat(chars, [' '])};
    })();
    state.catch(function () { state = null; });
    return state;
  }
  function canvasOf(src) {
    if (src && src.getContext) return src;
    var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, c = mk(w, h);
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(src, 0, 0); return c;
  }
  function turn(c, deg) {
    var side = deg % 180 !== 0, k = mk(side ? c.height : c.width, side ? c.width : c.height);
    var g = k.getContext('2d'); g.translate(k.width / 2, k.height / 2); g.rotate(deg * Math.PI / 180); g.drawImage(c, -c.width / 2, -c.height / 2); return k;
  }
  /* text detection (DB): the page at a side of 736-1920 px in steps of 32, BGR normalised; the probability map above 0.3 is split
     into connected areas, an area whose mean is under 0.5 is dropped, and each box grows by area x 1.6 / perimeter (RapidOCR's unclip) */
  async function detect(S, c) {
    var W = c.width, H = c.height, r = 1, mn = Math.min(W, H), mx = Math.max(W, H);
    if (mn < 736) r = 736 / mn; if (mx * r > 1920) r = 1920 / mx;
    var w = Math.max(32, Math.round(W * r / 32) * 32), h = Math.max(32, Math.round(H * r / 32) * 32), rx = w / W, ry = h / H;
    var k = mk(w, h);
    var g = k.getContext('2d', {willReadFrequently: true}); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(c, 0, 0, w, h);
    var px = g.getImageData(0, 0, w, h).data, n = w * h, x = new Float32Array(3 * n);
    for (var i = 0; i < n; i++) { var o = i * 4; x[i] = (px[o + 2] / 255 - 0.485) / 0.229; x[n + i] = (px[o + 1] / 255 - 0.456) / 0.224; x[2 * n + i] = (px[o] / 255 - 0.406) / 0.225; }
    var feeds = {}; feeds[S.det.inputNames[0]] = new S.ort.Tensor('float32', x, [1, 3, h, w]);
    var prob = (await S.det.run(feeds))[S.det.outputNames[0]].data;
    var seen = new Uint8Array(n), stack = new Int32Array(n), boxes = [], angles = [];
    for (var s0 = 0; s0 < n; s0++) {
      if (seen[s0] || prob[s0] <= 0.3) continue;
      var sp = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, cnt = 0, sum = 0, mx_ = 0, my_ = 0, mxx = 0, mxy = 0; stack[sp++] = s0; seen[s0] = 1;
      while (sp) {
        var v = stack[--sp], vx = v % w, vy = (v - vx) / w; cnt++; sum += prob[v]; mx_ += vx; my_ += vy; mxx += vx * vx; mxy += vx * vy;
        if (vx < x0) x0 = vx; if (vx > x1) x1 = vx; if (vy < y0) y0 = vy; if (vy > y1) y1 = vy;
        if (vx > 0 && !seen[v - 1] && prob[v - 1] > 0.3) { seen[v - 1] = 1; stack[sp++] = v - 1; }
        if (vx < w - 1 && !seen[v + 1] && prob[v + 1] > 0.3) { seen[v + 1] = 1; stack[sp++] = v + 1; }
        if (vy > 0 && !seen[v - w] && prob[v - w] > 0.3) { seen[v - w] = 1; stack[sp++] = v - w; }
        if (vy < h - 1 && !seen[v + w] && prob[v + w] > 0.3) { seen[v + w] = 1; stack[sp++] = v + w; }
      }
      var bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (Math.min(bw, bh) < 3 || sum / cnt < 0.5) continue;
      if (cnt < 12 || (bw < 6 && bh < 6)) continue;   /* a speck on a photo or scan, not text: reading each one is slow and turns pages wrongly */
      /* a long text line's slope (least squares through its pixels) tells the page's tilt */
      if (bw > 8 * bh && cnt > 50) { var ex = mx_ / cnt, vxx = mxx / cnt - ex * ex; if (vxx > 0) angles.push(Math.atan(((mxy / cnt) - ex * (my_ / cnt)) / vxx * (rx / ry))); }
      var dist = bw * bh * 1.6 / (2 * (bw + bh));
      var b = {x0: Math.max(0, (x0 - dist) / rx), y0: Math.max(0, (y0 - dist) / ry), x1: Math.min(W, (x1 + 1 + dist) / rx), y1: Math.min(H, (y1 + 1 + dist) / ry)};
      if (b.x1 - b.x0 >= 5 && b.y1 - b.y0 >= 5) boxes.push(b);
    }
    angles.sort(function (a, b) { return a - b; });
    boxes.skew = angles.length >= 3 ? angles[angles.length >> 1] : 0;
    return boxes;
  }
  /* recognition (CRNN + CTC): each box at a height of 48, batches of 8 boxes of similar shape, greedy CTC decoding */
  async function recognize(S, c, boxes, onStep) {
    var res = new Array(boxes.length), ar = function (b) { return (b.x1 - b.x0) / Math.max(1, b.y1 - b.y0); };
    var order = boxes.map(function (b, i) { return i; }).sort(function (a, b) { return ar(boxes[a]) - ar(boxes[b]); });
    for (var s = 0; s < order.length; s += 8) {
      var ids = order.slice(s, s + 8), maxR = 320 / 48;
      ids.forEach(function (i) { maxR = Math.max(maxR, ar(boxes[i])); });
      var W = Math.min(4800, Math.ceil(48 * maxR)), plane = 48 * W, x = new Float32Array(ids.length * 3 * plane), gapsOf = [];
      ids.forEach(function (i, bi) {
        var b = boxes[i], bw = Math.max(1, Math.round(b.x1 - b.x0)), bh = Math.max(1, Math.round(b.y1 - b.y0)), rw = Math.max(1, Math.min(W, Math.ceil(48 * bw / bh)));
        var t = mk(rw, 48); var g = t.getContext('2d', {willReadFrequently: true});
        g.drawImage(c, Math.round(b.x0), Math.round(b.y0), bw, bh, 0, 0, rw, 48);
        var d = g.getImageData(0, 0, rw, 48).data, base = bi * 3 * plane;
        gapsOf[bi] = inkGaps(d, rw);
        for (var yy = 0; yy < 48; yy++) for (var xx = 0; xx < rw; xx++) { var p4 = (yy * rw + xx) * 4, o = yy * W + xx; x[base + o] = d[p4 + 2] / 127.5 - 1; x[base + plane + o] = d[p4 + 1] / 127.5 - 1; x[base + 2 * plane + o] = d[p4] / 127.5 - 1; }
      });
      var feeds = {}; feeds[S.rec.inputNames[0]] = new S.ort.Tensor('float32', x, [ids.length, 3, 48, W]);
      var out = (await S.rec.run(feeds))[S.rec.outputNames[0]], T = out.dims[1], C = out.dims[2], P = out.data;
      ids.forEach(function (i, bi) {
        var ch = [], at = [], sc = 0, nsc = 0, prev = -1;
        for (var t2 = 0; t2 < T; t2++) { var off = (bi * T + t2) * C, best = 0, bv = -1; for (var cc = 0; cc < C; cc++) { if (P[off + cc] > bv) { bv = P[off + cc]; best = cc; } }
          if (best !== 0 && best !== prev) { ch.push(S.dict[best] || ''); at.push(t2); sc += bv; nsc++; } prev = best; }
        /* spaces from the ink, not the model: it leaves out most word spaces inside a box ("Employer'sname,address") and adds
           some inside words ("nu mber"). Each character sits at x = (t + 0.5) * W / T; a blank column run between two characters
           is a word space */
        var gp = gapsOf[bi], xs = at.map(function (t3) { return (t3 + 0.5) * W / T; }), txt = '', lastX = -1;
        for (var z2 = 0; z2 < ch.length; z2++) {
          if (ch[z2] === ' ') continue;
          /* beside a comma or point, or between two digits, the blank must be much wider: narrow punctuation leaves blank columns ("94 , 655. 65") */
          var pc = txt.charAt(txt.length - 1), nc = ch[z2], need = /[,.:;'’]/.test(pc) || /[,.:;'’]/.test(nc) ? 0.6 : /\d/.test(pc) && /\d/.test(nc) ? 0.32 : 0;
          if (txt && gp.some(function (q) { return q[0] > lastX && q[1] < xs[z2] && q[1] - q[0] >= q[2] * need; })) txt += ' ';
          txt += ch[z2]; lastX = xs[z2];
        }
        res[i] = {text: txt, score: nsc ? sc / nsc : 0};
      });
      if (onStep) onStep(Math.min(1, (s + ids.length) / order.length));
      await breathe();   /* let the page paint the progress */
    }
    return res;
  }
  /* a pause for the page to paint that a background tab does not slow down (its timers can wait up to a minute) */
  var chan = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null, waiting = [];
  if (chan) chan.port1.onmessage = function () { var w = waiting.shift(); if (w) w(); };
  function breathe() { return new Promise(function (r) { if (chan && !IN_WORKER && document.visibilityState === 'hidden') { waiting.push(r); chan.port2.postMessage(0); } else setTimeout(r, 0); }); }
  /* blank column runs inside a 48 px text crop wide enough to be a word space: about a fifth of the ink's height */
  function inkGaps(d, rw) {
    var lum = new Float32Array(rw * 48), mn = 255, mx = 0, i;
    for (i = 0; i < rw * 48; i++) { var v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; lum[i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
    if (mx - mn < 40) return [];
    var cut = mn + (mx - mn) * 0.55, col = new Uint8Array(rw), top = 48, bot = 0;
    for (var y = 0; y < 48; y++) for (var x = 0; x < rw; x++) if (lum[y * rw + x] < cut) { if (col[x] < 255) col[x]++; if (y < top) top = y; if (y > bot) bot = y; }
    for (x = 0; x < rw; x++) col[x] = col[x] >= 2 ? 1 : 0;   /* one dark pixel is a speck, not a letter */
    var hgt = Math.max(8, bot - top + 1), min = Math.max(4, hgt * 0.22), out = [], s = -1;
    for (x = 0; x <= rw; x++) { var empty = x < rw && !col[x]; if (empty && s < 0) s = x; if (!empty && s >= 0) { if (x - s >= min && s > 0 && x < rw) out.push([s, x, hgt]); s = -1; } }
    return out;
  }
  /* the model reads Chinese too: full-width punctuation becomes ASCII, CJK characters are dropped */
  function clean(s) {
    return String(s).replace(/[！-～]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); }).replace(/　/g, ' ').replace(/。/g, '.').replace(/、/g, ',')
      .replace(/[㐀-鿿豈-﫿぀-ヿ가-힯]/g, '')
      /* words and amounts the model ran together: "Overtime38.25", "GrossPay", "2,193.0041,514.00" */
      .replace(/([a-z])(?=[$(]?\d)/g, '$1 ').replace(/([a-z]{2})(?=[A-Z][a-z])/g, '$1 ').replace(/(\d[.,]\d{2})(?=[$(]?\d{1,3}(?:,\d{3})*[.,]\d{2}(?!\d))/g, '$1 ')
      .replace(/\s+/g, ' ').trim();
  }
  function rotBoxes(boxes, W, H) { return boxes.map(function (b) { return {x0: W - b.x1, y0: H - b.y1, x1: W - b.x0, y1: H - b.y0}; }); }
  function longest(boxes, k) { return boxes.slice().sort(function (a, b) { return (b.x1 - b.x0) - (a.x1 - a.x0); }).slice(0, k); }
  async function meanScore(S, c, boxes) { var r = await recognize(S, c, boxes); return r.reduce(function (a, x) { return a + x.score; }, 0) / Math.max(1, r.length); }
  async function read(src, onProg, opt) {
    opt = opt || {};
    var S = await ready(), c = canvasOf(src), turned = 0, say = function (f, n) { if (onProg) onProg(f, n); };
    say(0.02, 'finding the text');
    var boxes = await detect(S, c);
    if (opt.turn !== false && boxes.length >= 3) {
      var tall = boxes.filter(function (b) { return (b.y1 - b.y0) > 1.3 * (b.x1 - b.x0); }).length;
      if (tall > boxes.length * 0.6) {   /* a sideways page: lines stand upright */
        say(0.06, 'turning the page upright');
        var a = turn(c, 90), b2 = turn(c, 270), ba = await detect(S, a), bb = await detect(S, b2);
        var sa = await meanScore(S, a, longest(ba, 6)), sb = await meanScore(S, b2, longest(bb, 6));
        if (sa >= sb) { c = a; boxes = ba; turned = 90; } else { c = b2; boxes = bb; turned = 270; }
      } else {   /* upside down reads with low scores */
        var smp = longest(boxes, 4), s0 = await meanScore(S, c, smp);
        if (s0 < 0.85) {   /* lines that read well are upright: only an unsure page is tried upside down */
          var c180 = turn(c, 180), s1 = await meanScore(S, c180, rotBoxes(smp, c.width, c.height));
          if (s1 > s0 + 0.08) { boxes = rotBoxes(boxes, c.width, c.height); c = c180; turned = 180; }
        }
      }
    }
    /* a tilted photo: long lines get boxes much taller than their text, which the reader then sees too small - straighten the
       page by the lines' own slope and find the text again */
    if (opt.deskew !== false && Math.abs(boxes.skew || 0) > 0.006) {
      say(0.1, 'straightening the page');
      var k2 = mk(c.width, c.height); var g2 = k2.getContext('2d');
      g2.fillStyle = '#fff'; g2.fillRect(0, 0, k2.width, k2.height); g2.translate(c.width / 2, c.height / 2); g2.rotate(-boxes.skew); g2.drawImage(c, -c.width / 2, -c.height / 2);
      var nb = await detect(S, k2); if (nb.length >= boxes.length * 0.7) { c = k2; boxes = nb; }
    }
    say(0.12, 'reading ' + boxes.length + ' text boxes');
    var rs = await recognize(S, c, boxes, function (f) { say(0.12 + 0.86 * f, 'reading ' + boxes.length + ' text boxes'); });
    var items = boxes.map(function (b, i) { return {x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, text: clean(rs[i].text), score: rs[i].score}; })
      .filter(function (it) { return it.text && it.score >= 0.5; });
    /* boxes into lines: a box joins the line whose middle is within half a line height of its own */
    items.sort(function (a, b) { return (a.y0 + a.y1) - (b.y0 + b.y1); });
    var lines = [];
    items.forEach(function (it) {
      var cy = (it.y0 + it.y1) / 2, h = it.y1 - it.y0, L = null;
      for (var j = lines.length - 1; j >= 0 && j >= lines.length - 4; j--) { var ln = lines[j]; if (Math.abs(cy - ln.cy) < 0.5 * Math.max(h, ln.h)) { L = ln; break; } }
      if (!L) { L = {cy: cy, h: h, items: []}; lines.push(L); }
      L.items.push(it); L.cy = (L.cy * (L.items.length - 1) + cy) / L.items.length; L.h = Math.max(L.h, h);
    });
    lines.sort(function (a, b) { return a.cy - b.cy; });
    var outLines = lines.map(function (L) {
      L.items.sort(function (a, b) { return a.x0 - b.x0; });
      var box = {x0: Math.min.apply(null, L.items.map(function (i) { return i.x0; })), y0: Math.min.apply(null, L.items.map(function (i) { return i.y0; })), x1: Math.max.apply(null, L.items.map(function (i) { return i.x1; })), y1: Math.max.apply(null, L.items.map(function (i) { return i.y1; }))};
      /* boxes almost touching are one word or one amount split by the detector ("17,63" + "2.08") */
      var t = ''; L.items.forEach(function (i, k) { var p = L.items[k - 1]; t += k && !(i.x0 - p.x1 < 0.3 * L.h && /[\d,.]$/.test(p.text) && /^[\d,.]/.test(i.text)) ? ' ' + i.text : i.text; });
      t = t.replace(/(\d,)(\d{1,2}) (\d{1,2})(?=\.\d{2}(?!\d))/g, function (m, a, b, c2) { return b.length + c2.length === 3 ? a + b + c2 : m; });   /* "2,93 8.68" */
      return {text: t, score: L.items.reduce(function (a, i) { return a + i.score; }, 0) / L.items.length, box: box, items: L.items};
    });
    say(1, '');
    var conf = items.length ? Math.round(items.reduce(function (a, i) { return a + i.score; }, 0) / items.length * 100) : 0;
    return {text: outLines.map(function (l) { return l.text; }).join('\n'), lines: outLines, confidence: conf, turned: turned, width: c.width, height: c.height};
  }
  /* the shape Tesseract.js returns (blocks > paragraphs > lines > words with bbox), for code written for Tesseract */
  function asTesseract(r) {
    return {text: r.text, confidence: r.confidence, blocks: [{paragraphs: [{lines: r.lines.map(function (l) {
      return {text: l.text, confidence: l.score * 100, bbox: l.box, words: l.items.map(function (i) { return {text: i.text, confidence: i.score * 100, bbox: {x0: i.x0, y0: i.y0, x1: i.x1, y1: i.y1}}; })};
    })}]}]};
  }
  if (IN_WORKER) {   /* the worker: {id, op: 'ready' | 'read', bitmap, opt} -> progress messages, then the result */
    self.onmessage = async function (e) {
      var m = e.data, say = function (f, label) { self.postMessage({id: m.id, prog: f, label: label}); };
      try {
        if (m.op === 'ready') { await ready(say); self.postMessage({id: m.id, done: true}); return; }
        await ready(); var r = await read(m.bitmap, say, m.opt); if (m.bitmap.close) m.bitmap.close();
        self.postMessage({id: m.id, done: true, result: r});
      } catch (err) { self.postMessage({id: m.id, error: String(err && err.message || err)}); }
    };
    return;
  }
  /* the page: RapidOCR runs in a background worker (this same file), so a long page never freezes the screen; where a worker
     cannot start (a page opened from a file, an old browser) it runs on the page as before */
  var wk = null, wkSeq = 0, wkJobs = {}, wkBad = false;
  function worker() {
    if (wk || wkBad) return wk;
    try {
      if (!SELF_URL || typeof OffscreenCanvas === 'undefined' || /^file:/.test(SELF_URL)) throw new Error('no worker');
      wk = new Worker(SELF_URL);
      wk.onmessage = function (e) { var m = e.data, j = wkJobs[m.id]; if (!j) return; if (m.prog != null && j.prog) j.prog(m.prog, m.label);
        if (m.done) { delete wkJobs[m.id]; j.ok(m.result); } else if (m.error) { delete wkJobs[m.id]; j.no(new Error(m.error)); } };
      wk.onerror = function (e) { wkBad = true; wk = null; Object.keys(wkJobs).forEach(function (k) { var j = wkJobs[k]; delete wkJobs[k]; j.no(new Error('worker')); }); e.preventDefault && e.preventDefault(); };
    } catch (e) { wkBad = true; wk = null; }
    return wk;
  }
  function ask(msg, prog, transfer) { return new Promise(function (ok, no) { var id = ++wkSeq; wkJobs[id] = {ok: ok, no: no, prog: prog}; msg.id = id; wk.postMessage(msg, transfer || []); }); }
  function readyP(onProg) { return worker() ? ask({op: 'ready'}, onProg).catch(function () { wkBad = true; wk = null; return ready(onProg); }) : ready(onProg); }
  async function readP(src, onProg, opt) {
    if (worker()) {
      try { var bm = await createImageBitmap(src.getContext ? src : canvasOf(src)); return await ask({op: 'read', bitmap: bm, opt: opt || {}}, onProg, [bm]); }
      catch (e) { if (String(e && e.message) !== 'worker') throw e; }
    }
    return read(src, onProg, opt);
  }
  G.MTRapidOCR = {ready: readyP, read: readP, asTesseract: asTesseract, models: MODEL_BASE, onnxRuntime: ORT_BASE};
})();
