// Real OCR slam, run in the Income Calculator page (it has both readers and the suite's OCR, MTDocs.ocr = Tesseract):
//   (await import('/tests/ocr-real.mjs')).run({perType: 2})
// Documents from tests/_out/handoff-docs.json (node tests/ocr-slam.mjs --emit=6), clean text only, are drawn as page images
// the way a phone photo or a scan looks - a font and size, a slight tilt, blur, specks, a grey paper tone, JPEG compression -
// then read by OCR and by the readers, and every figure is checked against the document.
// 57.34: run({src: 'income-battle'}) reads the income battle documents instead (node tests/ocr-income-battle.mjs --emit):
// pay stubs, W-2s, VOEs, Schedules C / E, K-1s and Form 1120 in the layouts payroll services and the IRS print.
const near = (a, b) => (typeof b === 'string' ? String(a) === b : Math.abs((+a || 0) - (+b || 0)) < 0.006);
/* a figure the reader should find: [slot, value, kind, year column]; kind 'none' is a figure it must leave blank */
const pickF = (F, k, col) => { const c = F.filter((x) => x.slot === k && !x.generic && (!col || x.col === col)); return c.find((x) => !/— check:/.test(x.label) && x.apply !== false) || c[0]; };
const judge = (g, want, kind) => (kind === 'none' ? (g === undefined || g === 0 ? 'ok' : 'wrong') : g !== undefined && (kind === 'd' ? g === want : near(g, want)) ? 'ok' : g === undefined ? 'blank' : 'wrong');
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
  const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = c.toDataURL('image/jpeg', qy); });   // decode() never settles in a hidden tab
  const d = document.createElement('canvas'); d.width = c.width; d.height = c.height; d.getContext('2d').drawImage(img, 0, 0); return d;
}
// keep: true returns every page's OCR text (out.pages), to score reader changes again without running OCR again.
export async function run({ perType = 2, looks = ['print', 'scan', 'photo'], src = 'handoff-docs', keep = false, engine = 'tesseract' } = {}) {
  const G = (n) => (0, eval)(n), all = await (await fetch(`/tests/_out/${src}.json?` + Date.now())).json();
  const LOOK = {
    print: () => ({ font: FONTS[Math.floor(rnd() * FONTS.length)], size: 26 + Math.floor(rnd() * 6), tilt: 0, blur: 0, specks: 0, paper: '#ffffff', jpeg: 0 }),
    scan: () => ({ font: FONTS[Math.floor(rnd() * FONTS.length)], size: 22 + Math.floor(rnd() * 6), tilt: (rnd() - 0.5) * 1.6, blur: 0.4, specks: 250, paper: '#ecebe6', jpeg: 0.7 }),
    /* 57.31: a scan or photo of a page that is sideways or upside down */
    turned: () => ({ font: FONTS[Math.floor(rnd() * FONTS.length)], size: 22 + Math.floor(rnd() * 6), tilt: (rnd() - 0.5) * 1.6, blur: 0.4, specks: 250, paper: '#ecebe6', jpeg: 0.7, turn: [90, 180, 270][Math.floor(rnd() * 3)] }),
    photo: () => ({ font: FONTS[Math.floor(rnd() * FONTS.length)], size: 21 + Math.floor(rnd() * 5), tilt: (rnd() - 0.5) * 3, blur: 0.9, specks: 600, paper: '#d9d6cf', jpeg: 0.5 }),
  };
  const pick = (list) => { const by = {}; list.filter((d) => d.level === 'clean').forEach((d) => { (by[d.gen] = by[d.gen] || []).push(d); }); return Object.values(by).flatMap((a) => a.slice(0, perType)); };
  const docs = pick(all.income).map((d) => ({ ...d, reader: 'income' })).concat(pick(all.center).map((d) => ({ ...d, reader: 'center' })));
  /* 57.31: the Loan Suite's own income reader reads the same OCR text as the Income Calculator's, scored separately;
     57.34: loaded as the Loan Suite pages load it, with assets/income-reader.js, to which it hands the work */
  const suSrc = await (await fetch('/assets/js/06-docs-let-auto-apply-0-window-pdfjsli.js?' + Date.now())).text();
  const irSrc = await (await fetch('/assets/income-reader.js?' + Date.now())).text();
  const stub = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
  const SU = new Function('window', 'document', 'MTOcrFix', irSrc + '\n' + suSrc + '\n;return {classify, extractFields};')({ MTOcrFix: window.MTOcrFix }, stub, window.MTOcrFix);
  const out = { docs: 0, typeOk: 0, fields: 0, ok: 0, wrong: 0, ms: 0, byLook: {}, misses: [], suite: { docs: 0, typeOk: 0, fields: 0, ok: 0, wrong: 0, flagged: 0 } };
  for (const lk of looks) for (const doc of docs) {
    const look = LOOK[lk](), c = await page(doc.text, look), t0 = performance.now();
    const text = await MTDocs.ocr([c], null, false, { engine }); out.ms += performance.now() - t0;
    if (keep) (out.pages = out.pages || []).push({ gen: doc.gen, look: lk, type: doc.type, reader: doc.reader, want: doc.want, text });
    let type, got;
    if (doc.reader === 'income') {
      const st = out.suite, sF = SU.extractFields(doc.type, text); st.docs++; if (SU.classify(text) === doc.type) st.typeOk++;
      for (const [k, want, kind, col] of doc.want) { st.fields++; const fx = pickF(sF, k, col), g = fx && !/— check:/.test(fx.label) ? fx.value : undefined; if (fx && /— check:/.test(fx.label)) st.flagged++; const j = judge(g, want, kind); if (j === 'ok') st.ok++; else if (j === 'wrong') st.wrong++; }
    }
    if (doc.reader === 'income') { type = G('classify')(text); const F = G('extractFields')(doc.type, text); got = (k, col) => { const f = pickF(F, k, col); if (f && /— check:/.test(f.label)) { out.flagged = (out.flagged || 0) + 1; return undefined; } return f ? f.value : undefined; }; }   // flagged for checking, not applied: blank
    else { type = MTDocs.detect(text, ''); const d = MTDocs.extract({ docType: doc.type, text }); got = (k) => { const r = d.rows.find((x) => x.dest === k); return r ? r.value : undefined; }; }
    const B = out.byLook[lk] || (out.byLook[lk] = { docs: 0, fields: 0, ok: 0 }); B.docs++; out.docs++;
    if (type === doc.type) out.typeOk++; else out.misses.push(`${doc.gen} [${lk}, ${look.font} ${look.size}px] type ${type}`);
    for (const [k, want, kind, col] of doc.want) {
      out.fields++; B.fields++; const g = got(k, col), j = judge(g, want, kind);
      if (j === 'ok') { out.ok++; B.ok++; } else { if (j === 'wrong') { out.wrong++; (out.wrongs = out.wrongs || []).push(`${doc.gen} [${lk}] ${k}${col ? ' ' + col : ''}: want ${want} got ${g}`); } out.misses.push(`${doc.gen} [${lk}, ${look.font} ${look.size}px] ${k}${col ? ' ' + col : ''}: want ${want} got ${g}`); out.texts = out.texts || []; if (j === 'wrong' ? out.texts.filter((x) => x.got !== undefined).length < 60 : out.texts.filter((x) => x.got === undefined).length < 25) out.texts.push({ doc: doc.gen, look: lk, key: k, want, got: g, ocr: text }); }
    }
  }
  out.secondsPerPage = +(out.ms / out.docs / 1000).toFixed(2); delete out.ms;
  return out;
}
/* 57.34: score the OCR text a run kept (run({keep: true}).pages) with the income reader as it is now on disk
   (assets/income-reader.js, rebuilt from income-calculator.html) - a reader change checked in seconds, without running OCR again */
export async function rescore(pages) {
  const ctx = { window: {} };
  new Function('window', (await (await fetch('/assets/income-reader.js?' + Date.now())).text()))(ctx.window);
  const R = ctx.window.MTIncomeReader, out = { docs: 0, typeOk: 0, fields: 0, ok: 0, wrong: 0, byLook: {}, wrongs: [] };
  for (const p of pages.filter((x) => x.reader === 'income')) {
    const B = out.byLook[p.look] || (out.byLook[p.look] = { fields: 0, ok: 0 }); out.docs++;
    if (R.classify(p.text) === p.type) out.typeOk++;
    const F = R.extractFields(p.type, p.text);
    for (const [k, want, kind, col] of p.want) {
      const f = pickF(F, k, col), g = f && !/— check:/.test(f.label) ? f.value : undefined, j = judge(g, want, kind);
      out.fields++; B.fields++; if (j === 'ok') { out.ok++; B.ok++; } else if (j === 'wrong') { out.wrong++; out.wrongs.push(`${p.gen} [${p.look}] ${k}${col ? ' ' + col : ''}: want ${want} got ${g}`); }
    }
  }
  return out;
}
