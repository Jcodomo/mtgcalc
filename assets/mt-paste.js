/* Mortgage Suite 56.6 - paste a screenshot into any document reader.
   Every place that reads documents (the Document Builder's drop zones, the shared document library, the Income Calculator's
   Document Import, Non-QM statements, asset statements, the Loan Suite's document pages and the Doc Organizer) gets a
   "Paste screenshot" button, and Ctrl+V / Cmd+V with an image on the clipboard sends it to the reader you last used or the
   one on screen. Readers that take images get the image; readers that only take PDF or text get the screenshot's text,
   read with OCR first. A pasted file copied from the computer (PDF, image) works the same way. Nothing leaves the browser. */
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

  /* ------------------------------------------------ delivering a pasted file */
  function stamp() { var d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds()); }
  function named(f) { if (f.name && !/^image\.(png|jpe?g)$/i.test(f.name)) return f; var ext = (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg'); return new File([f], 'Pasted screenshot ' + stamp() + '.' + ext, {type: f.type}); }
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
  function deliver(inp, files) {
    if (!inp || !files.length) return;
    files = files.map(named);
    if (!inp.multiple) files = files.slice(0, 1);
    var images = files.filter(function (f) { return /^image\//.test(f.type); });
    if (!images.length || takesImages(inp)) { hand(inp, files); toast('Pasted into ' + labelOf(inp) + '.'); return; }
    /* this reader takes PDF or text only: read the screenshot first and hand over its text */
    if (!takesText(inp) || !(window.MTDocs && MTDocs.readText)) { toast('This reader takes PDF files only - save the screenshot as a PDF, or use the Documents library.', true); return; }
    toast('Reading the screenshot…');
    Promise.all(images.map(function (f) { return MTDocs.readText(f); })).then(function (texts) {
      var txt = texts.join('\n\n').trim(); if (!txt) { toast('No text could be read from the screenshot - try a clearer capture.', true); return; }
      var others = files.filter(function (f) { return !/^image\//.test(f.type); });
      hand(inp, others.concat([new File([txt], 'Pasted screenshot ' + stamp() + '.txt', {type: 'text/plain'})]));
      toast('Screenshot text read and pasted into ' + labelOf(inp) + '.');
    }).catch(function (e) { toast('The screenshot could not be read: ' + (e && e.message || e), true); });
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
  document.addEventListener('paste', function (e) {
    var files = clipFiles(e.clipboardData); if (!files.length) return;            /* plain text pastes normally */
    var ae = document.activeElement; if (ae && (ae.isContentEditable || (ae.ownerDocument && ae.ownerDocument.designMode === 'on'))) return;
    var inp = target(); if (!inp) return;
    e.preventDefault(); deliver(inp, files);
  }, true);
  /* remember the reader last used, so Ctrl+V goes back to it */
  document.addEventListener('pointerdown', function (e) { var z = e.target.closest && e.target.closest('[data-drop], .drop, .dz, label, button, [onclick]'); if (!z) return; var inp = z.querySelector && z.querySelector('input[type=file]'); if (!inp && z.getAttribute) { var m = String(z.getAttribute('onclick') || '').match(/getElementById\(['"]([\w-]+)['"]\)\.click\(\)|\$\(['"]([\w-]+)['"]\)\.click\(\)/); if (m) inp = document.getElementById(m[1] || m[2]); } if (inp && isReader(inp)) { lastInput = inp; lastAt = Date.now(); } }, true);

  /* ------------------------------------------------ the Paste screenshot buttons */
  function fromClipboard(inp) {
    if (!navigator.clipboard || !navigator.clipboard.read) { toast('This browser cannot read the clipboard from a button - click the page and press Ctrl+V (Cmd+V on a Mac).', true); return; }
    navigator.clipboard.read().then(function (items) {
      var jobs = [];
      items.forEach(function (it) { var ty = it.types.filter(function (t) { return /^image\//.test(t); })[0] || it.types.filter(function (t) { return t === 'application/pdf'; })[0]; if (ty) jobs.push(it.getType(ty).then(function (bl) { return new File([bl], 'image.' + (ty.split('/')[1] || 'png'), {type: ty}); })); });
      if (!jobs.length) { toast('The clipboard has no screenshot - copy one first (Windows: Win+Shift+S, Mac: Cmd+Ctrl+Shift+4).', true); return; }
      return Promise.all(jobs).then(function (fs) { deliver(inp, fs); });
    }).catch(function () { toast('The browser did not allow reading the clipboard - click the page and press Ctrl+V (Cmd+V on a Mac) instead.', true); });
  }
  function css() {
    if (document.getElementById('mtPasteCss')) return; var s = document.createElement('style'); s.id = 'mtPasteCss';
    s.textContent = '.mtp-btn{display:inline-flex;align-items:center;gap:5px;margin:0 0 0 6px;padding:5px 10px;border-radius:8px;border:1px dashed #5aa2ff;background:transparent;color:#5aa2ff;font:600 12px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;vertical-align:middle;white-space:nowrap}.mtp-btn:hover{background:rgba(90,162,255,.12)}.mtp-btn:focus-visible{outline:2px solid #5aa2ff;outline-offset:2px}' +
      '#mtPasteToast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483600;max-width:min(560px,calc(100vw - 32px));padding:10px 16px;border-radius:10px;background:#0a1b38;color:#e6eefb;border:1px solid #2b5590;box-shadow:0 12px 30px rgba(0,0,0,.4);font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}#mtPasteToast.bad{border-color:#f0b357;color:#f6d79a}@media print{.mtp-btn,#mtPasteToast{display:none!important}}';
    document.head.appendChild(s);
  }
  var tt = 0;
  function toast(msg, bad) { css(); var t = document.getElementById('mtPasteToast'); if (!t) { t = document.createElement('div'); t.id = 'mtPasteToast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); } t.className = bad ? 'bad' : ''; t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, bad ? 7000 : 4000); }
  function decorate() {
    css();
    readers().forEach(function (inp) {
      if (inp.__mtpBtn && inp.__mtpBtn.isConnected) return;
      var zone = inp.closest('[data-drop]'); if (zone && zone.querySelector('[data-mtpaste]')) return;   /* the builder draws its own button */
      var a = anchorFor(inp); if (!a || a.__mtpDone) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mtp-btn no-print'; b.textContent = 'Paste screenshot'; b.title = 'Paste a screenshot from the clipboard (or press Ctrl+V)';
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fromClipboard(inp); });
      if (a === inp) inp.insertAdjacentElement('afterend', b); else a.insertAdjacentElement('afterend', b);
      a.__mtpDone = true; inp.__mtpBtn = b;
    });
  }
  /* buttons drawn by the Document Builder carry data-mtpaste */
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-mtpaste]'); if (!b) return; e.preventDefault(); var z = b.closest('[data-drop]') || b.parentNode, inp = z && z.querySelector('input[type=file]'); if (inp) fromClipboard(inp); });
  var mo = new MutationObserver(function (m) { if (m.some(function (r) { return r.addedNodes.length; })) { clearTimeout(mo.t); mo.t = setTimeout(decorate, 250); } });
  /* tabs and panels that are shown by switching a class add no nodes - look again shortly after each click */
  var ct = 0; document.addEventListener('click', function () { clearTimeout(ct); ct = setTimeout(decorate, 350); }, true);
  function start() { decorate(); mo.observe(document.body, {childList: true, subtree: true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.MTPaste = {deliver: deliver, target: target, decorate: decorate};
})();
