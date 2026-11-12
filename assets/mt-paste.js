/* Mortgage Suite 56.7 - paste screenshots and text into any document reader.
   Every place that reads documents (the Document Builder's drop zones, the shared document library, the Income Calculator's
   Document Import, Non-QM statements, asset statements, the Loan Suite's document pages and the Doc Organizer) gets a
   "Paste screenshot" button, and Ctrl+V / Cmd+V with an image on the clipboard sends it to the reader you last used or the
   one on screen. Readers that take images get the image; readers that only take PDF or text get the screenshot's text,
   read with OCR first. A pasted file copied from the computer (PDF, image) works the same way. Nothing leaves the browser.
   56.7: the paste tray gathers several screenshots and pasted text and sends them together - a reader that takes one file
   gets one text file with everything read in order. Text copied from an email or a web page pastes the same way.
   Windows Snipping Tool (Win+Shift+S) and Mac clipboard screenshots (Cmd+Ctrl+Shift+4) paste with Ctrl+V / Cmd+V. */
(function () {
  'use strict';
  if (window.MTPaste) return;
  var lastInput = null, lastAt = 0;

  /* ------------------------------------------------ which inputs read documents */
  function accepts(inp) { return String(inp.getAttribute('accept') || '').toLowerCase(); }
  function isReader(inp) {
    if (!inp || inp.type !== 'file' || inp.disabled) return false;
    if (inp.getAttribute('data-a') === 'logo') return false;                 /* logos are uploads, not documents to read */
    var a = accepts(inp); if (!a) return true;                                /* no filter: takes anything (Doc Organizer) */
    return /pdf|image|png|jpe?g|webp|\.txt|text/.test(a) && !/^\.?json|^application\/json/.test(a.split(',')[0].trim()) && !/^(\.json,?\s*)+$/.test(a);
  }
  function takesImages(inp) { var a = accepts(inp); return !a || /image|png|jpe?g|webp/.test(a); }
  function takesText(inp) { var a = accepts(inp); return !a || /\.txt|text/.test(a); }
  function visible(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && el.offsetParent !== null; }

  /* the visible control that opens an input: its label, or a button whose click handler clicks it */
  function anchorFor(inp) {
    var lab = inp.closest('label'); if (lab && visible(lab)) return lab;
    if (inp.id) {
      var sel = '[onclick*="' + inp.id + '"]', c = [].filter.call(document.querySelectorAll(sel), function (x) { return x !== inp && visible(x) && /click\(\)/.test(x.getAttribute('onclick') || ''); })[0];
      if (c) return c;
      var l2 = document.querySelector('label[for="' + inp.id + '"]'); if (l2 && visible(l2)) return l2;
    }
    if (visible(inp)) return inp;
    var zone = inp.closest('[data-drop], .drop, .dz, .dropzone, .drop-zone'); if (zone && visible(zone)) return zone;
    return null;
  }

  /* ------------------------------------------------ delivering pasted files */
  function stamp() { var d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds()); }
  var seq = 0;
  function named(f) { if (f.__named || (f.name && !/^image\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name))) return f; var ext = (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg'); var n = new File([f], 'Pasted screenshot ' + stamp() + (seq++ ? ' (' + seq + ')' : '') + '.' + ext, {type: f.type}); n.__named = true; return n; }
  function labelOf(inp) {
    var z = inp.closest('[data-drop], .drop, .dz, fieldset, .card, section, .modal');
    var t = z && (z.querySelector('b, h2, h3, legend, .card-title, .doc-name') || z);
    return String((t && t.textContent) || inp.getAttribute('aria-label') || 'the document reader').replace(/\s+/g, ' ').trim().slice(0, 70);
  }
  function hand(inp, files) {
    var dt = new DataTransfer(); files.forEach(function (f) { dt.items.add(f); });
    inp.files = dt.files; inp.dispatchEvent(new Event('change', {bubbles: true}));
    lastInput = inp; lastAt = Date.now();
  }
  function isImg(f) { return /^image\//.test(f.type); }
  function isTxt(f) { return /^text\//.test(f.type); }
  function canRead() { return !!(window.MTDocs && MTDocs.readText); }
  /* read every item (OCR for screenshots and scans) and join the text in order */
  function combine(files) {
    return Promise.all(files.map(function (f) {
      var p = isTxt(f) ? f.text() : canRead() ? MTDocs.readText(f) : Promise.resolve('');
      return Promise.resolve(p).then(function (t) { return String(t || '').trim(); }, function () { return ''; });
    })).then(function (texts) {
      if (files.length === 1) return texts[0];
      return texts.map(function (t, i) { return t ? '----- ' + (isTxt(files[i]) ? 'Pasted text' : isImg(files[i]) ? 'Screenshot' : 'File') + ' ' + (i + 1) + ' of ' + files.length + ' -----\n' + t : ''; }).filter(Boolean).join('\n\n');
    });
  }
  function readAndHand(inp, toRead, keep, what) {
    toast(toRead.length > 1 ? 'Reading ' + toRead.length + ' items…' : 'Reading the screenshot…');
    return combine(toRead).then(function (txt) {
      if (!txt) { toast('No text could be read - try a clearer capture.', true); return; }
      hand(inp, keep.concat([new File([txt], what + ' ' + stamp() + '.txt', {type: 'text/plain'})]));
      toast((toRead.length > 1 ? toRead.length + ' items read and pasted' : 'Screenshot text read and pasted') + ' into ' + labelOf(inp) + '.');
    }).catch(function (e) { toast('The screenshot could not be read: ' + (e && e.message || e), true); });
  }
  function deliver(inp, files) {
    if (!inp || !files.length) return;
    files = files.map(named);
    var images = files.filter(isImg), several = files.length > 1 && !inp.multiple;
    if (!several && (!images.length || takesImages(inp))) { hand(inp, files); toast('Pasted into ' + labelOf(inp) + '.'); return; }
    if (!takesText(inp) || !canRead()) {
      if (several && (!images.length || takesImages(inp))) { hand(inp, files.slice(0, 1)); toast('This reader takes one file at a time - the first was pasted; paste the others one by one.', true); return; }
      toast('This reader takes PDF files only - save the screenshot as a PDF, or use the Documents library.', true); return;
    }
    /* several items into a one-file reader, or screenshots into a PDF/text reader: read them first, hand over the text */
    if (several) return readAndHand(inp, files, [], images.length ? 'Pasted screenshots' : 'Pasted files');
    readAndHand(inp, images, files.filter(function (f) { return !isImg(f); }), 'Pasted screenshot');
  }

  /* ------------------------------------------------ the paste tray: gather screenshots and text, then send together */
  var tray = null;
  function trayOpen() { return !!(tray && !tray.box.hidden); }
  function trayAdd(files) { files.forEach(function (f) { tray.items.push(named(f)); }); trayDraw(); }
  function trayDraw() {
    var L = tray.box.querySelector('.mtp-list'); L.innerHTML = '';
    tray.items.forEach(function (f, i) {
      var d = document.createElement('div'); d.className = 'mtp-item';
      if (isImg(f)) { var im = document.createElement('img'); im.alt = 'Screenshot ' + (i + 1); im.src = f.__url || (f.__url = URL.createObjectURL(f)); d.appendChild(im); }
      else { var sp = document.createElement('span'); sp.textContent = f.name; d.appendChild(sp); }
      var x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Remove item ' + (i + 1));
      x.addEventListener('click', function () { if (f.__url) URL.revokeObjectURL(f.__url); tray.items.splice(i, 1); trayDraw(); }); d.appendChild(x);
      L.appendChild(d);
    });
    var n = tray.items.length;
    tray.box.querySelector('.mtp-count').textContent = n ? n + ' screenshot' + (n > 1 ? 's or files' : ' or file') + ' gathered - they are read in this order.' : 'No screenshots yet.';
  }
  function trayClose() { if (!tray) return; tray.box.hidden = true; tray.items.forEach(function (f) { if (f.__url) URL.revokeObjectURL(f.__url); }); tray.items = []; if (tray.prev && tray.prev.focus && tray.prev.isConnected) try { tray.prev.focus(); } catch (e) {} }
  function traySend() {
    var inp = tray.inp, fs = tray.items.slice(), txt = tray.ta.value.trim();
    if (txt) fs.push(new File([txt], 'Pasted text ' + stamp() + '.txt', {type: 'text/plain'}));
    if (!fs.length) { toast('Nothing to send yet - paste a screenshot or some text first.', true); return; }
    if (txt && !takesText(inp)) { toast('This reader takes PDF or image files only - remove the text, or use the Documents library.', true); return; }
    tray.items = []; tray.box.hidden = true;
    /* a reader that takes many images gets them as they are when nothing was typed; otherwise everything becomes one text file */
    if (fs.length > 1 && !(inp.multiple && !txt && takesImages(inp)) && takesText(inp) && canRead()) return readAndHand(inp, fs, [], 'Pasted text and screenshots');
    if (fs.length === 1 && txt) { hand(inp, fs); toast('Text pasted into ' + labelOf(inp) + '.'); return; }
    deliver(inp, fs);
  }
  function openTray(inp, text, files) {
    css();
    if (!tray) {
      var box = document.createElement('div'); box.id = 'mtPasteTray'; box.className = 'no-print'; box.hidden = true;
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'mtPasteTrayT');
      box.innerHTML = '<div class="mtp-card"><h3 id="mtPasteTrayT">Paste text and screenshots</h3>' +
        '<p class="mtp-hint">Press <b>Ctrl+V</b> (<b>Cmd+V</b> on a Mac) as often as you like: each screenshot is added below and text goes into the box. ' +
        'Windows: press <b>Win+Shift+S</b>, snip, then Ctrl+V here - repeat for each part of the page. Everything is read in order and sent as one.</p>' +
        '<textarea rows="7" placeholder="Paste or type text here - an email, a web page, figures copied from a PDF…" aria-label="Pasted text"></textarea>' +
        '<div class="mtp-count" aria-live="polite"></div><div class="mtp-list"></div>' +
        '<div class="mtp-row"><span class="mtp-to"></span><span style="flex:1"></span><button type="button" class="mtp-btn" data-t="clip">Paste from clipboard</button>' +
        '<button type="button" class="mtp-btn" data-t="cancel">Cancel</button><button type="button" class="mtp-btn mtp-go" data-t="send">Read and send</button></div></div>';
      document.body.appendChild(box);
      tray = {box: box, items: [], inp: null, ta: box.querySelector('textarea')};
      box.addEventListener('mousedown', function (e) { if (e.target === box) trayClose(); });
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-t]'); if (!b) return; var t = b.getAttribute('data-t');
        if (t === 'cancel') return trayClose();
        if (t === 'send') return traySend();
        if (t === 'clip') clipInto(function (fs, txt) {
          if (fs.length) trayAdd(fs);
          if (txt) tray.ta.value += (tray.ta.value ? '\n\n' : '') + txt;
          if (!fs.length && !txt) toast('The clipboard is empty - copy text or a screenshot first.', true);
        });
      });
      box.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); trayClose(); } });
    }
    tray.inp = inp; tray.prev = document.activeElement; tray.items = []; tray.ta.value = text || '';
    tray.box.querySelector('.mtp-to').textContent = 'Sends to: ' + labelOf(inp);
    trayDraw(); if (files && files.length) trayAdd(files);
    tray.box.hidden = false; tray.ta.focus();
  }
  /* read the clipboard from a button (the browser may ask permission first) */
  function clipInto(cb) {
    if (!navigator.clipboard || !(navigator.clipboard.read || navigator.clipboard.readText)) { toast('This browser cannot read the clipboard from a button - press Ctrl+V (Cmd+V on a Mac) instead.', true); return; }
    var p = navigator.clipboard.read ? navigator.clipboard.read().then(function (items) {
      var jobs = [], txt = Promise.resolve('');
      items.forEach(function (it) {
        var ty = it.types.filter(function (t) { return /^image\//.test(t); })[0] || it.types.filter(function (t) { return t === 'application/pdf'; })[0];
        if (ty) jobs.push(it.getType(ty).then(function (bl) { return new File([bl], 'image.' + (ty.split('/')[1] || 'png'), {type: ty}); }));
        else if (it.types.indexOf('text/plain') >= 0) txt = it.getType('text/plain').then(function (bl) { return bl.text(); });
      });
      return Promise.all([Promise.all(jobs), txt]);
    }) : navigator.clipboard.readText().then(function (t) { return [[], t]; });
    p.then(function (r) { cb(r[0], r[1]); }).catch(function () { toast('The browser did not allow reading the clipboard - press Ctrl+V (Cmd+V on a Mac) instead.', true); });
  }

  /* ------------------------------------------------ where Ctrl+V goes */
  function readers() { return [].filter.call(document.querySelectorAll('input[type=file]'), isReader); }
  function target() {
    var b = document.getElementById('mtB');
    if (b && b.classList.contains('open')) { var bi = [].filter.call(b.querySelectorAll('.mb-form input[type=file]'), isReader)[0]; if (bi) return bi; }
    var dc = document.querySelector('#mtDocs.open, .mtd-modal.open, [data-mtdocs].open'); if (dc) { var di = [].filter.call(dc.querySelectorAll('input[type=file]'), isReader)[0]; if (di) return di; }
    if (lastInput && lastInput.isConnected && Date.now() - lastAt < 30 * 60 * 1000 && anchorFor(lastInput)) return lastInput;
    var vh = window.innerHeight, best = null, bestD = 1e9;
    readers().forEach(function (inp) { var a = anchorFor(inp); if (!a) return; var r = a.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return; var d = Math.abs(r.top - vh / 3); if (d < bestD) { bestD = d; best = inp; } });
    return best;
  }
  function clipFiles(cd) {
    var out = []; if (!cd) return out;
    [].forEach.call(cd.files || [], function (f) { out.push(f); });
    if (!out.length) [].forEach.call(cd.items || [], function (it) { if (it.kind === 'file') { var f = it.getAsFile(); if (f) out.push(f); } });
    return out;
  }
  function editable(el) {
    if (!el) return false;
    if (el.isContentEditable || (el.ownerDocument && el.ownerDocument.designMode === 'on')) return true;
    if (el.tagName === 'TEXTAREA') return !el.readOnly && !el.disabled;
    return el.tagName === 'INPUT' && !el.readOnly && !el.disabled && /^(text|search|email|tel|url|number|password|date|month|)$/.test(el.type || '');
  }
  /* a reader is "in play" when the builder or the document library is open with it, or it was used in the last few minutes */
  function readerInPlay(inp) {
    var b = document.getElementById('mtB'); if (b && b.classList.contains('open') && b.contains(inp)) return true;
    var dc = document.querySelector('#mtDocs.open, .mtd-modal.open, [data-mtdocs].open'); if (dc && dc.contains(inp)) return true;
    return inp === lastInput && Date.now() - lastAt < 5 * 60 * 1000;
  }
  document.addEventListener('paste', function (e) {
    var cd = e.clipboardData, files = clipFiles(cd);
    /* Excel, Word and web pages put a picture of the copied cells next to the text; the text is what was meant.
       A real screenshot (Win+Shift+S, Cmd+Ctrl+Shift+4) carries no text, so it still goes to the reader as an image. */
    var plain = cd && cd.getData('text/plain');
    if (files.length && plain && plain.trim() && files.every(function (f) { return /^image\//.test(f.type); })) files = [];
    if (trayOpen()) {                                                              /* the tray gathers everything */
      if (files.length) { e.preventDefault(); trayAdd(files); return; }
      if (document.activeElement !== tray.ta) { var t0 = cd && cd.getData('text/plain'); if (t0) { e.preventDefault(); tray.ta.value += (tray.ta.value ? '\n\n' : '') + t0; } }
      return;
    }
    var ae = document.activeElement;
    if (!files.length) {                                                           /* text: fields paste normally */
      var txt = plain; if (!txt || !txt.trim() || editable(ae)) return;            /* any length of text */
      var ti = target(); if (!ti || !takesText(ti) || !readerInPlay(ti)) return;
      e.preventDefault(); openTray(ti, txt); return;                               /* show it before sending */
    }
    if (ae && (ae.isContentEditable || (ae.ownerDocument && ae.ownerDocument.designMode === 'on'))) return;
    var inp = target(); if (!inp) return;
    e.preventDefault(); deliver(inp, files);
  }, true);
  /* remember the reader last used, so Ctrl+V goes back to it */
  document.addEventListener('pointerdown', function (e) { var z = e.target.closest && e.target.closest('[data-drop], .drop, .dz, label, button, [onclick]'); if (!z) return; var inp = z.querySelector && z.querySelector('input[type=file]'); if (!inp && z.getAttribute) { var m = String(z.getAttribute('onclick') || '').match(/getElementById\(['"]([\w-]+)['"]\)\.click\(\)|\$\(['"]([\w-]+)['"]\)\.click\(\)/); if (m) inp = document.getElementById(m[1] || m[2]); } if (inp && isReader(inp)) { lastInput = inp; lastAt = Date.now(); } }, true);

  /* ------------------------------------------------ the Paste buttons */
  function fromClipboard(inp) {
    if (!navigator.clipboard || !navigator.clipboard.read) { toast('This browser cannot read the clipboard from a button - click the page and press Ctrl+V (Cmd+V on a Mac).', true); return; }
    clipInto(function (fs, txt) {
      if (fs.length) return deliver(inp, fs);
      if (txt && txt.trim() && takesText(inp)) return openTray(inp, txt);           /* text on the clipboard: show it before sending */
      toast('The clipboard has no screenshot - copy one first (Windows: Win+Shift+S, Mac: Cmd+Ctrl+Shift+4).', true);
    });
  }
  function css() {
    if (document.getElementById('mtPasteCss')) return; var s = document.createElement('style'); s.id = 'mtPasteCss';
    s.textContent = '.mtp-btn{display:inline-flex;align-items:center;gap:5px;margin:0 0 0 6px;padding:5px 10px;border-radius:8px;border:1px dashed #5aa2ff;background:transparent;color:#5aa2ff;font:600 12px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;vertical-align:middle;white-space:nowrap}.mtp-btn:hover{background:rgba(90,162,255,.12)}.mtp-btn:focus-visible{outline:2px solid #5aa2ff;outline-offset:2px}' +
      '#mtPasteToast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483600;max-width:min(560px,calc(100vw - 32px));padding:10px 16px;border-radius:10px;background:#0a1b38;color:#e6eefb;border:1px solid #2b5590;box-shadow:0 12px 30px rgba(0,0,0,.4);font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}#mtPasteToast.bad{border-color:#f0b357;color:#f6d79a}' +
      '#mtPasteTray{position:fixed;inset:0;z-index:2147483500;background:rgba(3,10,26,.6);display:flex;align-items:flex-start;justify-content:center;padding:7vh 12px 12px;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#e6eefb}#mtPasteTray[hidden]{display:none}' +
      '#mtPasteTray .mtp-card{width:min(640px,100%);max-height:86vh;overflow:auto;background:#0a1b38;border:1px solid #2b5590;border-radius:14px;padding:16px 18px;box-shadow:0 24px 60px rgba(0,0,0,.5);box-sizing:border-box}#mtPasteTray h3{margin:0 0 6px;font-size:17px;color:#e6eefb}#mtPasteTray .mtp-hint{margin:0 0 10px;color:#9db0c8;font-size:12.5px}' +
      '#mtPasteTray textarea{box-sizing:border-box;width:100%;background:#061430;color:#e6eefb;border:1px solid #2b5590;border-radius:9px;padding:9px;font:13px/1.4 ui-monospace,Consolas,monospace;resize:vertical}#mtPasteTray .mtp-count{margin:8px 0 6px;font-size:12.5px;color:#9db0c8}' +
      '#mtPasteTray .mtp-list{display:flex;flex-wrap:wrap;gap:8px}#mtPasteTray .mtp-item{position:relative;border:1px solid #2b5590;border-radius:8px;padding:4px;background:#061430;max-width:150px}#mtPasteTray .mtp-item img{display:block;max-width:140px;max-height:100px}#mtPasteTray .mtp-item span{display:block;font-size:11.5px;padding:6px 20px 6px 4px;word-break:break-all}' +
      '#mtPasteTray .mtp-item button{position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;border:0;background:#123a75;color:#fff;cursor:pointer;line-height:20px;padding:0}#mtPasteTray .mtp-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}#mtPasteTray .mtp-row .mtp-btn{margin:0}#mtPasteTray .mtp-to{font-size:12px;color:#9db0c8}#mtPasteTray .mtp-go{background:#2f6fe0;color:#fff;border-style:solid}' +
      '@media print{.mtp-btn,#mtPasteToast,#mtPasteTray{display:none!important}}';
    document.head.appendChild(s);
  }
  var tt = 0;
  function toast(msg, bad) { css(); var t = document.getElementById('mtPasteToast'); if (!t) { t = document.createElement('div'); t.id = 'mtPasteToast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); } t.className = bad ? 'bad' : ''; t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, bad ? 7000 : 4000); }
  function decorate() {
    css();
    readers().forEach(function (inp) {
      if (inp.__mtpBtn && inp.__mtpBtn.isConnected) return;
      var zone = inp.closest('[data-drop]'); if (zone && zone.querySelector('[data-mtpaste]')) return;   /* the builder draws its own buttons */
      var a = anchorFor(inp); if (!a || a.__mtpDone) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mtp-btn no-print'; b.textContent = 'Paste screenshot'; b.title = 'Paste a screenshot from the clipboard (or press Ctrl+V). Windows: Win+Shift+S to snip first.';
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fromClipboard(inp); });
      if (a === inp) inp.insertAdjacentElement('afterend', b); else a.insertAdjacentElement('afterend', b);
      if (takesText(inp) || inp.multiple) {
        var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'mtp-btn no-print'; b2.textContent = 'Paste text / several'; b2.title = 'Gather several screenshots and pasted text, then read and send them together';
        b2.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); lastInput = inp; lastAt = Date.now(); openTray(inp); });
        b.insertAdjacentElement('afterend', b2);
      }
      a.__mtpDone = true; inp.__mtpBtn = b;
    });
  }
  /* buttons drawn by the Document Builder carry data-mtpaste / data-mtpastetray */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-mtpaste], [data-mtpastetray]'); if (!b) return; e.preventDefault();
    var z = b.closest('[data-drop]') || b.parentNode, inp = z && z.querySelector('input[type=file]'); if (!inp) return;
    lastInput = inp; lastAt = Date.now();
    if (b.hasAttribute('data-mtpastetray')) openTray(inp); else fromClipboard(inp);
  });
  var mo = new MutationObserver(function (m) { if (m.some(function (r) { return r.addedNodes.length; })) { clearTimeout(mo.t); mo.t = setTimeout(decorate, 250); } });
  /* tabs and panels that are shown by switching a class add no nodes - look again shortly after each click */
  var ct = 0; document.addEventListener('click', function () { clearTimeout(ct); ct = setTimeout(decorate, 350); }, true);
  function start() { decorate(); mo.observe(document.body, {childList: true, subtree: true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.MTPaste = {deliver: deliver, target: target, decorate: decorate, tray: openTray, combine: combine};
})();
