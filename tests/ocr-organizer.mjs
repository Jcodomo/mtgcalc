// End-to-end OCR check of the Documents page organizer (doc-organizer.html), which now reads pictures with the shared reader:
//   (await import('/tests/ocr-organizer.mjs')).run({perType: 1})
// Documents from tests/_out/handoff-docs.json are drawn as scanned pictures (one of them sideways), added through the organizer's
// own file box, read with "Local OCR + detect all", and the document type it shows is checked.
let seed = 99; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const EXPECT = { paystub: /pay ?stub|earnings/i, w2: /W-?2/i, wvoe: /VOE|verification of employment|work number/i, schedc: /schedule c|tax return/i, schede: /schedule e|tax return/i,
  k1: /K-?1|1065|1120/i, bank: /bank statement/i, retirement: /401|IRA|retirement/i, gift: /gift/i, contract: /contract/i, lecd: /loan estimate|closing disclosure/i,
  mortgage: /mortgage statement/i, appraisal: /appraisal/i, tax: /property tax/i, insurance: /insurance/i, hoa: /HOA|condo|association/i, lease: /lease|1007/i,
  reno: /contractor|renovation|estimate|bid/i, credit: /credit report/i };
async function picture(text, turn) {
  const lines = text.split(/\r?\n/), size = 24, lh = 38, c = document.createElement('canvas'); c.width = 1800; c.height = 140 + lines.length * lh;
  const g = c.getContext('2d'); g.fillStyle = '#ecebe6'; g.fillRect(0, 0, c.width, c.height);
  g.save(); g.translate(c.width / 2, c.height / 2); g.rotate((rnd() - 0.5) * 1.4 * Math.PI / 180); g.translate(-c.width / 2, -c.height / 2);
  g.filter = 'blur(0.4px)'; g.fillStyle = '#1a1a1a'; g.font = `${size}px Arial`; lines.forEach((l, i) => g.fillText(l, 70, 90 + i * lh)); g.restore();
  for (let k = 0; k < 250; k++) { g.fillStyle = `rgba(0,0,0,${0.2 + rnd() * 0.5})`; g.fillRect(rnd() * c.width, rnd() * c.height, 1 + rnd() * 2, 1 + rnd() * 2); }
  let out = c;
  if (turn) { const k = document.createElement('canvas'); k.width = c.height; k.height = c.width; const h = k.getContext('2d'); h.translate(k.width / 2, k.height / 2); h.rotate(Math.PI / 2); h.drawImage(c, -c.width / 2, -c.height / 2); out = k; }
  return new Promise((res) => out.toBlob((b) => res(b), 'image/jpeg', 0.75));
}
export async function run({ perType = 1 } = {}) {
  const all = await (await fetch('/tests/_out/handoff-docs.json?' + Date.now())).json(), by = {};
  all.income.concat(all.center).filter((d) => d.level === 'clean').forEach((d) => { (by[d.gen] = by[d.gen] || []).push(d); });
  const docs = Object.values(by).flatMap((a) => a.slice(0, perType)), files = [];
  for (let i = 0; i < docs.length; i++) files.push(new File([await picture(docs[i].text, i === 0)], `scan-${i + 1}-${docs[i].gen}.jpg`, { type: 'image/jpeg' }));
  const input = document.getElementById('file-input'), dt = new DataTransfer(); files.forEach((f) => dt.items.add(f)); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 500));
  document.getElementById('detect-all').click();
  const rows = () => [...document.querySelectorAll('table.files tbody tr')];
  const t0 = performance.now();
  while (performance.now() - t0 < 15 * 60 * 1000) {
    await new Promise((r) => setTimeout(r, 3000));
    const txt = rows().map((r) => r.innerText).join('\n');
    if (rows().length >= files.length && rows().every((r) => { const c = r.querySelectorAll('td'); return c[4] && /confidence|failed|Error/i.test(c[4].innerText) && !/…/.test(c[4].innerText); })) break;
  }
  const out = { files: files.length, typeOk: 0, misses: [], seconds: Math.round((performance.now() - t0) / 1000) };
  rows().forEach((r) => {
    const cells = [...r.querySelectorAll('td')].map((c) => (c.querySelector('select') ? c.querySelector('select').value : c.innerText).trim());
    const gen = (/scan-\d+-([a-z0-9]+)\.jpg/.exec(cells[0]) || [])[1]; if (!gen) return;
    const type = cells[2] || ''; if (EXPECT[gen] && EXPECT[gen].test(type)) out.typeOk++; else out.misses.push(`${gen}: "${type}"`);
  });
  return out;
}
