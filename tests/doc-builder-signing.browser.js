// Browser test for the Document Builder's signing block (sample signature only). Run as an async function body in
// full-suite.html (e.g. with a headless driver): every builder x every style, every signature line gets the sample
// signature in the "Signing block" look with the date ticked; the page must show one block per line, the same signing
// time on every dated line, a signing code that is the same on every line and changes when the document's wording
// changes, every part removable or editable, and Download PDF must still make a PDF.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = []; const ok = (name, cond, info) => { out.push({ name, pass: !!cond, info: String(info == null ? '' : info).slice(0, 220) }); return !!cond; };
const errs = []; addEventListener('error', (e) => errs.push(String(e.message))); addEventListener('unhandledrejection', (e) => errs.push('promise: ' + String((e.reason && (e.reason.message || e.reason)) || '')));
window.print = () => {};
const blobs = []; const oc = URL.createObjectURL; URL.createObjectURL = function (b) { blobs.push(b); return oc.apply(URL, arguments); };
const ac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) return; return ac.apply(this, arguments); };
const fire = (e, v) => { const proto = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  if (e.type === 'checkbox') e.checked = !!v; else Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v);
  e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
const doc = () => { const f = document.getElementById('mtBframe'); return f && f.contentDocument; };
const form = () => document.querySelector('#mtB .mb-form');
const until = async (fn, ms = 6000) => { const t = performance.now(); while (performance.now() - t < ms) { const v = fn(); if (v) return v; await sleep(60); } return null; };
// a sample signature in the signature store
const c = document.createElement('canvas'); c.width = 360; c.height = 90; const g = c.getContext('2d'); g.strokeStyle = '#111'; g.lineWidth = 4; g.beginPath(); g.moveTo(10, 60); g.bezierCurveTo(80, 0, 120, 100, 180, 40); g.bezierCurveTo(230, 0, 280, 90, 350, 30); g.stroke();
const SIG = { id: 'stest1', label: 'Jane Sample', kind: 'draw', type: 'signature', png: c.toDataURL('image/png'), w: 360, h: 90, at: Date.now(), meta: {} };
localStorage.setItem('mt.sign.v1', JSON.stringify([SIG]));
await MTBuild.open('addendum'); await sleep(1200);
await until(() => window.MTSign, 8000);
const cat = MTBuild.catalog();
let builders = 0, lines = 0;
for (const cItem of cat) {
  const styles = cItem.styles && cItem.styles.length ? cItem.styles.map((s) => (Array.isArray(s) ? s[0] : s.id || s)) : [null];
  for (const style of styles) {
    const tag = cItem.type + (style ? '/' + style : '');
    await MTBuild.open(cItem.type, style ? { style } : undefined); await sleep(500);
    // the styles of one document share its draft: start each one with no signatures
    const clr = form().querySelector('[data-a="esigClear"]'); if (clr) { clr.click(); await sleep(400); }
    const picks = [...form().querySelectorAll('select[data-a="esig"]')];
    if (!picks.length) continue;
    builders++;
    for (let i = 0; i < picks.length; i++) { const p = form().querySelectorAll('select[data-a="esig"]')[i]; if (p) { fire(p, SIG.id); await sleep(140); } }
    for (let i = 0; i < picks.length; i++) {
      const st = form().querySelector(`select[data-a="esigOpt"][data-o="style"][data-i="${i}"]`); if (st) { fire(st, 'block'); await sleep(140); }
      const d = form().querySelector(`input[data-a="esigDate"][data-i="${i}"]`); if (d && !d.checked) { fire(d, true); await sleep(120); }
    }
    const fmt = form().querySelector('select[data-k="esigFmt"]'); if (fmt) { fire(fmt, 'stamp'); await sleep(300); }
    const tm = form().querySelector('input[data-k="esigTime"]'); if (tm) { fire(tm, '8:33 AM'); await sleep(200); }
    const tz = form().querySelector('select[data-k="esigTz"]'); if (tz) { fire(tz, 'PST'); await sleep(300); }
    const day = form().querySelector('input[data-k="esigDay"]'); if (day) { fire(day, '11/23/2026'); await sleep(500); }
    await sleep(700);
    const D = doc(), blocks = D ? [...D.querySelectorAll('.esb')] : [];
    lines += picks.length;
    ok(`${tag}: a signing block on every line`, blocks.length === picks.length, `${blocks.length} of ${picks.length}`);
    const codes = blocks.map((b) => ((b.querySelector('i') || {}).textContent || '').match(/[0-9A-F]{16}/)).map((m) => m && m[0]);
    ok(`${tag}: one signing code on every line`, codes.length && codes.every((x) => x && x === codes[0]), codes.slice(0, 3).join(','));
    ok(`${tag}: the printed name and label`, blocks.every((b) => /Signed by/.test(b.textContent) && /Jane Sample/.test(b.textContent)), blocks[0] && blocks[0].textContent.slice(0, 60));
    const dates = D ? [...D.querySelectorAll('.esd')].map((e) => e.textContent) : [];
    ok(`${tag}: every dated line shows the same signing time`, dates.length === picks.length && dates.every((x) => x === '11/23/2026 | 8:33 AM PST'), dates.slice(0, 2).join(' / '));
    // edit / remove the parts of line 1
    const set = async (o, v) => { const e = form().querySelector(`input[data-a="esigTxt"][data-o="${o}"][data-i="0"]`); if (e) { fire(e, v); await sleep(260); } return !!e; };
    await set('label', ''); await set('footer', 'Approved copy'); const pn = form().querySelector('select[data-a="esigOpt"][data-o="pname"][data-i="0"]'); if (pn) { fire(pn, 'off'); await sleep(300); }
    const fr = form().querySelector('select[data-a="esigOpt"][data-o="frame"][data-i="0"]'); if (fr) { fire(fr, 'off'); await sleep(500); }
    const b0 = doc().querySelector('.esb');
    ok(`${tag}: the label, name, footer and frame can be changed or removed`, b0 && !/Signed by/.test(b0.textContent) && !/Jane Sample/.test(b0.textContent) && /Approved copy/.test(b0.textContent) && b0.classList.contains('nofr'), b0 && b0.className + ' ' + b0.textContent.slice(0, 60));
    // the code follows the document's wording: change a text field, the code changes
    const txt = [...form().querySelectorAll('input[type=text][data-k]')].find((e) => !/esig/.test(e.getAttribute('data-k')) && !e.hasAttribute('data-fdate'));
    if (txt && picks.length > 1) {
      const before = codes[0]; fire(txt, (txt.value || '') + ' changed'); await sleep(900);
      const after = ((doc().querySelectorAll('.esb')[1] || {}).textContent || '').match(/[0-9A-F]{16}/);
      ok(`${tag}: the code changes when the wording changes`, after && after[0] !== before, before + ' -> ' + (after && after[0]));
    }
    if (builders % 4 === 1) { blobs.length = 0; const pdfB = document.querySelector('#mtB [data-a="pdf"]'); pdfB.click(); const got = await until(() => blobs.find((b) => b && b.type === 'application/pdf'), 30000); ok(`${tag}: Download PDF with signing blocks`, got && got.size > 2000, got ? got.size : 'none'); }
  }
}
const pass = out.filter((o) => o.pass).length;
return JSON.stringify({ summary: `${pass}/${out.length} passed; ${builders} builder looks with signature lines, ${lines} lines`, fails: out.filter((o) => !o.pass).slice(0, 12), errors: errs.slice(0, 6) }, null, 1);
