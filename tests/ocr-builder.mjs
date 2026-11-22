// OCR slam for the Document Builder's conditional approval reader (MTBuild.parseApproval), run in any page with the shared reader:
//   (await import('/tests/ocr-builder.mjs')).run({n: 6})
// Approvals are generated (header fields + PTA / PTD / PTF / AC conditions), drawn as page images that look printed, scanned,
// photographed or turned sideways, read by the shared OCR (MTDocs.ocr + MTOcrFix) and by the builder's parser, and every header
// field and condition is checked against what was drawn.
let seed = 777; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];
const FIRST = ['Maria', 'James', 'Aisha', 'Daniel', 'Priya', 'Robert', 'Elena', 'Marcus'], LAST = ['Gonzalez', 'Thompson', 'Okafor', 'Nguyen', 'Patel', 'Russo', 'Kowalski', 'Bennett'];
const CONDS = {
  PTA: [['Income', 'Provide most recent 30 days paystubs for the borrower showing year to date earnings'], ['Assets', 'Provide two most recent consecutive months of bank statements for checking account ending 4417'], ['Credit', 'Provide letter of explanation for credit inquiries within the last 90 days'], ['Income', 'Provide signed and dated 2025 and 2024 federal tax returns with all schedules']],
  PTD: [['Property', 'Appraisal to be reviewed and approved by underwriter'], ['Title', 'Provide preliminary title report with 24 month chain of title'], ['Assets', 'Source the large deposit of $12,450.00 on 10/14/2026'], ['Credit', 'Provide verification of rent for the most recent 12 months'], ['Income', 'Verbal verification of employment within 10 business days of closing']],
  PTF: [['Closing', 'Provide final signed closing disclosure'], ['Title', 'Provide final title policy with lender endorsements'], ['Escrow / Closing Agent', 'Collect payoff for the existing lien in the amount of $184,322.17']],
  AC: [['Closing', 'Borrower to sign the 4506-C at closing'], ['Legal', 'Power of attorney is not permitted for this transaction']],
};
const fmt = (n) => n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
function approval() {
  const f = pick(FIRST), l = pick(LAST), amt = Math.round(150 + rnd() * 600) * 1000, price = Math.round(amt / (0.8 + rnd() * 0.15) / 1000) * 1000;
  const loan = String(1000000000 + Math.floor(rnd() * 8999999999)), rate = (5.5 + Math.floor(rnd() * 16) * 0.125).toFixed(3);
  const want = {b1: f + ' ' + l, loanNumber: loan, amount: fmt(amt), rate, price: fmt(price), purpose: 'Purchase', occupancy: 'Primary Residence'};
  const lines = ['Underwriting Conditional Approval', 'Lender: Hudson Valley Home Lending, LLC', 'Borrower: ' + l + ', ' + f + '     Loan #: ' + loan,
    'Approved Loan Amount: $' + fmt(amt) + '     Note Rate: ' + rate + '%', 'Sales Price: $' + fmt(price) + '     Appraised Value: $' + fmt(price + 5000),
    'Purpose: Purchase     Occupancy: Primary Residence', 'Loan Program: Conventional 30 Year Fixed', ''];
  const conds = [];
  for (const [code, head] of [['PTA', 'Prior to Approval'], ['PTD', 'Prior to Docs'], ['PTF', 'Prior to Funding'], ['AC', 'At Closing']]) {
    lines.push(head + ' (' + code + ') Conditions:');
    const all = CONDS[code].slice().sort(() => rnd() - 0.5).slice(0, code === 'AC' ? 2 : 2 + Math.floor(rnd() * 2));
    for (const [cat, text] of all) { lines.push(cat + ' - ' + text); lines.push('-'); conds.push({stage: code, cat, text}); }
    lines.push('');
  }
  return {text: lines.join('\n'), want, conds};
}
function wrap(line, max) { const out = []; let cur = ''; for (const w of line.split(' ')) { if ((cur + ' ' + w).trim().length > max) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out.length ? out : ['']; }
async function page(text, look) {
  const lines = text.split('\n').flatMap((l) => wrap(l, 92)), size = look.size, lh = Math.round(size * 1.55);
  const c = document.createElement('canvas'); c.width = 1800; c.height = 140 + lines.length * lh; const g = c.getContext('2d');
  g.fillStyle = look.paper; g.fillRect(0, 0, c.width, c.height);
  g.save(); g.translate(c.width / 2, c.height / 2); g.rotate(look.tilt * Math.PI / 180); g.translate(-c.width / 2, -c.height / 2);
  if (look.blur) g.filter = `blur(${look.blur}px)`;
  g.fillStyle = '#1a1a1a'; g.font = `${size}px "${look.font}"`; lines.forEach((l, i) => g.fillText(l, 70, 90 + i * lh)); g.restore();
  for (let k = 0; k < look.specks; k++) { g.fillStyle = `rgba(0,0,0,${0.2 + rnd() * 0.5})`; g.fillRect(rnd() * c.width, rnd() * c.height, 1 + rnd() * 2, 1 + rnd() * 2); }
  let out = c;
  if (look.turn) { const q = look.turn !== 180, k = document.createElement('canvas'); k.width = q ? c.height : c.width; k.height = q ? c.width : c.height; const h = k.getContext('2d'); h.translate(k.width / 2, k.height / 2); h.rotate(look.turn * Math.PI / 180); h.drawImage(c, -c.width / 2, -c.height / 2); out = k; }
  if (!look.jpeg) return out;
  const img = new Image(); img.src = out.toDataURL('image/jpeg', look.jpeg); await img.decode();
  const d = document.createElement('canvas'); d.width = out.width; d.height = out.height; d.getContext('2d').drawImage(img, 0, 0); return d;
}
const LOOK = {
  print: () => ({ font: pick(FONTS), size: 26 + Math.floor(rnd() * 5), tilt: 0, blur: 0, specks: 0, paper: '#ffffff', jpeg: 0 }),
  scan: () => ({ font: pick(FONTS), size: 23 + Math.floor(rnd() * 5), tilt: (rnd() - 0.5) * 1.6, blur: 0.4, specks: 250, paper: '#ecebe6', jpeg: 0.7 }),
  photo: () => ({ font: pick(FONTS), size: 22 + Math.floor(rnd() * 4), tilt: (rnd() - 0.5) * 3, blur: 0.9, specks: 600, paper: '#d9d6cf', jpeg: 0.5 }),
  turned: () => ({ font: pick(FONTS), size: 23 + Math.floor(rnd() * 5), tilt: (rnd() - 0.5) * 1.6, blur: 0.4, specks: 250, paper: '#ecebe6', jpeg: 0.7, turn: pick([90, 180, 270]) }),
};
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9$.,/ ]/g, ' ').split(/\s+/).filter(Boolean);
function sim(a, b) { const A = words(a), B = new Set(words(b)); if (!A.length) return 0; return A.filter((w) => B.has(w)).length / A.length; }
export async function run({ n = 6, looks = ['print', 'scan', 'photo', 'turned'] } = {}) {
  if (!(window.MTBuild && MTBuild.parseApproval)) { await new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/assets/doc-builder.js?t=' + Date.now(); s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  const out = { pages: 0, fields: 0, fieldsOk: 0, conds: 0, condsFound: 0, condsExact: 0, stageOk: 0, extra: 0, byLook: {}, misses: [], ms: 0 };
  for (const lk of looks) for (let i = 0; i < n; i++) {
    const a = approval(), look = LOOK[lk](), c = await page(a.text, look), t0 = performance.now();
    let text = await MTDocs.ocr([c]); if (window.MTOcrFix) text = MTOcrFix(text); out.ms += performance.now() - t0;
    const p = MTBuild.parseApproval(text), B = out.byLook[lk] || (out.byLook[lk] = { pages: 0, fields: 0, fieldsOk: 0, conds: 0, condsFound: 0 });
    out.pages++; B.pages++;
    for (const [k, v] of Object.entries(a.want)) {
      out.fields++; B.fields++; const got = String(p[k] || '').trim(), ok = got.toLowerCase() === String(v).toLowerCase();
      if (ok) { out.fieldsOk++; B.fieldsOk++; } else out.misses.push(`[${lk} ${look.font}] ${k}: want "${v}" got "${got}"`);
    }
    const used = new Set(); let miss = false;
    for (const w of a.conds) {
      out.conds++; B.conds++;
      let best = -1, bs = 0; (p.conds || []).forEach((g, j) => { if (used.has(j)) return; const s = sim(w.text, g.text); if (s > bs) { bs = s; best = j; } });
      if (best >= 0 && bs >= 0.85) { used.add(best); out.condsFound++; B.condsFound++; if (bs === 1) out.condsExact++; if (p.conds[best].stage === w.stage) out.stageOk++; else out.misses.push(`[${lk}] stage of "${w.text.slice(0, 40)}": want ${w.stage} got ${p.conds[best].stage}`); }
      else { out.misses.push(`[${lk} ${look.font}] condition missing (${(bs * 100).toFixed(0)}%): ${w.stage} ${w.text.slice(0, 60)}`); miss = true; }
    }
    if (miss && (out.samples = out.samples || []).length < 8) out.samples.push({ look: lk, font: look.font, heads: text.split('\n').filter((l) => /pri[o0]r|c[o0]ndit|clos/i.test(l)).slice(0, 8), conds: (p.conds || []).map((c) => c.stage + ' ' + c.text.slice(0, 50)) });
    out.extra += Math.max(0, (p.conds || []).length - used.size);
  }
  out.secondsPerPage = +(out.ms / out.pages / 1000).toFixed(2); delete out.ms;
  return out;
}
