// Real OCR slam, run in the Income Calculator page (it has both readers and the suite's OCR, MTDocs.ocr = Tesseract):
//   (await import('/tests/ocr-real.mjs')).run({perType: 2})
// Documents from tests/_out/handoff-docs.json (node tests/ocr-slam.mjs --emit=6), clean text only, are drawn as page images
// the way a phone photo or a scan looks - a font and size, a slight tilt, blur, specks, a grey paper tone, JPEG compression -
// then read by OCR and by the readers, and every figure is checked against the document.
const near = (a, b) => Math.abs((+a || 0) - (+b || 0)) < 0.006;
let seed = 4242; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];
async function page(text, look) {
  const lines = text.split(/\r?\n/), size = look.size, lh = Math.round(size * 1.6);
  const c = document.createElement('canvas'); c.width = 1800; c.height = 140 + lines.length * lh; const g = c.getContext('2d');
  g.fillStyle = look.paper; g.fillRect(0, 0, c.width, c.height);
  g.save(); g.translate(c.width / 2, c.height / 2); g.rotate(look.tilt * Math.PI / 180); g.translate(-c.width / 2, -c.height / 2);
  if (look.blur) g.filter = `blur(${look.blur}px)`;
  g.fillStyle = '#1a1a1a'; g.font = `${size}px "${look.font}"`; lines.forEach((l, i) => g.fillText(l, 70, 90 + i * lh)); g.restore();
  for (let k = 0; k < look.specks; k++) { g.fillStyle = `rgba(0,0,0,${0.2 + rnd() * 0.5})`; g.fillRect(rnd() * c.width, rnd() * c.height, 1 + rnd() * 2, 1 + rnd() * 2); }
  if (look.turn) { const q = look.turn !== 180, k = document.createElement('canvas'); k.width = q ? c.height : c.width; k.height = q ? c.width : c.height; const h = k.getContext('2d'); h.translate(k.width / 2, k.height / 2); h.rotate(look.turn * Math.PI / 180); h.drawImage(c, -c.width / 2, -c.height / 2); c.width = 0; return look.jpeg ? jpeg(k, look.jpeg) : k; }
  if (!look.jpeg) return c;
  return jpeg(c, look.jpeg);
}
async function jpeg(c, qy) {
  const img = new Image(); img.src = c.toDataURL('image/jpeg', qy); await img.decode();
  const d = document.createElement('canvas'); d.width = c.width; d.height = c.height; d.getContext('2d').drawImage(img, 0, 0); return d;
}
export async function run({ perType = 2, looks = ['print', 'scan', 'photo'] } = {}) {
  const G = (n) => (0, eval)(n), all = await (await fetch('/tests/_out/handoff-docs.json?' + Date.now())).json();
  const LOOK = {
    print: () => ({ font: FONTS[Math.floor(rnd() * FONTS.length)], size: 26 + Math.floor(rnd() * 6), tilt: 0, blur: 0, specks: 0, paper: '#ffffff', jpeg: 0 }),
    scan: () => ({ font: FONTS[Math.floor(rnd() * FONTS.length)], size: 22 + Math.floor(rnd() * 6), tilt: (rnd() - 0.5) * 1.6, blur: 0.4, specks: 250, paper: '#ecebe6', jpeg: 0.7 }),
    /* 57.31: a scan or photo of a page that is sideways or upside down */
    turned: () => ({ font: FONTS[Math.floor(rnd() * FONTS.length)], size: 22 + Math.floor(rnd() * 6), tilt: (rnd() - 0.5) * 1.6, blur: 0.4, specks: 250, paper: '#ecebe6', jpeg: 0.7, turn: [90, 180, 270][Math.floor(rnd() * 3)] }),
    photo: () => ({ font: FONTS[Math.floor(rnd() * FONTS.length)], size: 21 + Math.floor(rnd() * 5), tilt: (rnd() - 0.5) * 3, blur: 0.9, specks: 600, paper: '#d9d6cf', jpeg: 0.5 }),
  };
  const pick = (list) => { const by = {}; list.filter((d) => d.level === 'clean').forEach((d) => { (by[d.gen] = by[d.gen] || []).push(d); }); return Object.values(by).flatMap((a) => a.slice(0, perType)); };
  const docs = pick(all.income).map((d) => ({ ...d, reader: 'income' })).concat(pick(all.center).map((d) => ({ ...d, reader: 'center' })));
  /* 57.31: the Loan Suite's own (minified) income reader reads the same OCR text as the Income Calculator's, scored separately */
  const suSrc = await (await fetch('/assets/js/06-docs-let-auto-apply-0-window-pdfjsli.js?' + Date.now())).text();
  const stub = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
  const SU = new Function('window', 'document', 'MTOcrFix', suSrc + '\n;return {classify, extractFields};')({ MTOcrFix: window.MTOcrFix }, stub, window.MTOcrFix);
  const out = { docs: 0, typeOk: 0, fields: 0, ok: 0, wrong: 0, ms: 0, byLook: {}, misses: [], suite: { docs: 0, typeOk: 0, fields: 0, ok: 0, wrong: 0, flagged: 0 } };
  for (const lk of looks) for (const doc of docs) {
    const look = LOOK[lk](), c = await page(doc.text, look), t0 = performance.now();
    const text = await MTDocs.ocr([c]); out.ms += performance.now() - t0;
    let type, got;
    if (doc.reader === 'income') {
      const st = out.suite, sF = SU.extractFields(doc.type, text); st.docs++; if (SU.classify(text) === doc.type) st.typeOk++;
      for (const [k, want, kind] of doc.want) { st.fields++; const fx = sF.find((x) => x.slot === k && !x.generic), g = fx && !/— check:/.test(fx.label) ? fx.value : undefined; if (fx && /— check:/.test(fx.label)) st.flagged++; if (kind === 'd' ? g === want : g !== undefined && near(g, want)) st.ok++; else if (g !== undefined) st.wrong++; }
    }
    if (doc.reader === 'income') { type = G('classify')(text); const F = G('extractFields')(doc.type, text); got = (k) => { const f = F.find((x) => x.slot === k && !x.generic); if (f && /— check:/.test(f.label)) { out.flagged = (out.flagged || 0) + 1; return undefined; } return f ? f.value : undefined; }; }   // flagged for checking, not applied: blank
    else { type = MTDocs.detect(text, ''); const d = MTDocs.extract({ docType: doc.type, text }); got = (k) => { const r = d.rows.find((x) => x.dest === k); return r ? r.value : undefined; }; }
    const B = out.byLook[lk] || (out.byLook[lk] = { docs: 0, fields: 0, ok: 0 }); B.docs++; out.docs++;
    if (type === doc.type) out.typeOk++; else out.misses.push(`${doc.gen} [${lk}, ${look.font} ${look.size}px] type ${type}`);
    for (const [k, want, kind] of doc.want) {
      out.fields++; B.fields++; const g = got(k), right = kind === 'd' ? g === want : g !== undefined && near(g, want);
      if (right) { out.ok++; B.ok++; } else { if (g !== undefined) out.wrong++; out.misses.push(`${doc.gen} [${lk}, ${look.font} ${look.size}px] ${k}: want ${want} got ${g}`); if ((out.texts = out.texts || []).length < 40) out.texts.push({ doc: doc.gen, look: lk, key: k, want, got: g, ocr: text }); }
    }
  }
  out.secondsPerPage = +(out.ms / out.docs / 1000).toFixed(2); delete out.ms;
  return out;
}
