// Slam of every OCR dropdown choice and the form field it is linked to. Run in the page (the browser):
//   Loan Suite page (full-suite.html or a loan-suite-*.html page):  (await import('/tests/ocr-dropdowns.mjs')).loan()
//     Every "loan:" destination in the Document Center's "Send to" list gets a value through MTDocs.send, the way a
//     document row is sent; the loan file must hold it, a form field on the page must show it, and it must still be
//     there after the page's own refreshes (3 seconds later).
//   Income Calculator page:  .calc()  then  .slots()
//     calc(): every "calc:" destination (asset accounts, monthly debt, Non-QM bank and P&L, DSCR rent) is sent and
//     checked on the worksheet and in its form field.
//     slots(): every "Goes to" choice of the Documents tab (W-2, Schedule C, K-1 / 1120, Schedule E) in every year
//     column, applied to an existing worksheet and to "+ Create a new" one, checked on the worksheet record and in the
//     input the worksheet shows for it.
// The loan file, the calculator and the document library are put back as they were afterwards.
const N = (v) => { const t = String(v == null ? '' : v).replace(/[$,%\s]/g, ''); const neg = /^\(.*\)$/.test(t); const x = +t.replace(/[()]/g, ''); return isFinite(x) ? (neg ? -x : x) : NaN; };
const near = (a, b) => Math.abs(N(a) - N(b)) < 0.006;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fields = () => [...document.querySelectorAll('input,select,textarea')];
function shows(el, want, kind) {
  const v = el.value;
  if (kind === 'text') return String(v).trim().toLowerCase() === String(want).trim().toLowerCase();
  if (kind === 'date') { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(want); return v === want || (m && v.replace(/\b0/g, '') === `${+m[2]}/${+m[3]}/${m[1]}`) || (m && v === `${m[2]}/${m[3]}/${m[1]}`); }
  if (kind === 'pct') return near(v, want) || near(N(v) * 100, want) || near(v, want / 100);
  return near(v, want);
}
async function dropDocs(prefix) {   // the test's documents leave the library
  try { await new Promise((res) => { const r = indexedDB.open('mtgcalc-docs'); r.onsuccess = () => { const d = r.result, t = d.transaction('docs', 'readwrite'), s = t.objectStore('docs'); const g = s.getAll(); g.onsuccess = () => { (g.result || []).filter((x) => String(x.id).startsWith(prefix)).forEach((x) => s.delete(x.id)); }; t.oncomplete = res; t.onerror = res; }; r.onerror = res; }); } catch (e) {}
}
const doc = (id, dest, value, label) => ({ id, name: 'dropdown-test-' + id + '.pdf', type: 'other', added: Date.now(), rows: [{ on: true, dest, value, label: label || dest }] });

export async function loan({ wait = 3000, only = null } = {}) {
  const st = window.mortgageSuite && mortgageSuite.store; if (!st) throw new Error('open a Loan Suite page');
  const key = st.storageKey, saved = key ? localStorage.getItem(key) : null;
  const D = MTDocs.DEST.filter((g) => /^Loan Suite/.test(g[0])).flatMap((g) => g[1]).filter((d) => !only || only.includes(d[0].slice(5)));
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), st.activeInputs);
  const out = { dests: D.length, stored: 0, linked: 0, kept: 0, fails: [] };
  let k = 0;
  for (const [dest, label, kind] of D) {
    k++;
    const path = dest.slice(5);
    const want = kind === 'text' ? ({ borrowerName: 'Dana Q Testperson', propertyAddress: '418 Dropdown Lane', zipCode: '10583' }[path] || 'Test ' + k)
      : kind === 'date' ? '2027-03-15' : kind === 'pct' ? 6.875 : path === 'units' ? 3 : path === 'termYears' ? 25 : path === 'creditScore' ? 742 : path === 'draws.manualDrawCount' ? 4 : 1000 + k * 111.11;
    const msg = MTDocs.send(doc('ddt-' + k, dest, want, label));
    await sleep(400);
    const stored = kind === 'pct' ? get(path) : get(path), storedOk = kind === 'pct' ? near(stored * 100, want) || near(stored, want) : kind === 'num' ? near(stored, want) : String(stored).toLowerCase() === String(want).toLowerCase();
    if (storedOk) out.stored++; else { out.fails.push(`${label} (${path}): the loan file holds ${JSON.stringify(stored)}, sent ${want} — ${msg}`); continue; }
    /* the field the user edits: qf-<path> (dots as dashes); on the summary view it opens from its "Flood insurance: $1,778" link */
    const qf = () => document.getElementById('qf-' + path.replace(/\./g, '-')) || document.getElementById('qf-' + path);
    let el = qf();
    if (!el) { const opener = [...document.querySelectorAll('[data-f]')].find((e) => e.dataset.f === path && e.dataset.act === 'open'); if (opener) { opener.click(); await sleep(350); el = qf(); } }
    const other = el ? null : fields().find((e) => e.type !== 'hidden' && shows(e, want, kind));
    if (el && shows(el, want, kind)) { out.linked++; (out.at = out.at || {})[path] = 'qf'; }
    else if (other) { out.linked++; (out.at = out.at || {})[path] = 'input'; }
    else if (el) out.fails.push(`${label} (${path}): its form field shows "${el.value}", the loan file holds ${want}`);
    else (out.notHere = out.notHere || []).push(path);
    await sleep(wait);
    const later = get(path), keptOk = kind === 'pct' ? near(later * 100, want) || near(later, want) : kind === 'num' ? near(later, want) : String(later).toLowerCase() === String(want).toLowerCase();
    if (keptOk) out.kept++; else out.fails.push(`${label} (${path}): replaced by ${JSON.stringify(later)} within ${wait / 1000} s`);
  }
  await dropDocs('ddt-');
  if (key && saved != null) { localStorage.setItem(key, saved); out.restored = 'reload the page to see your own loan file again'; }
  return out;
}

export async function calc() {
  const G = (n) => (0, eval)(n), S = G('S'), base = JSON.parse(JSON.stringify(S));
  const D = MTDocs.DEST.filter((g) => g[0] === 'Income Calculator').flatMap((g) => g[1]);
  const out = { dests: D.length, placed: 0, linked: 0, fails: [] };
  let k = 0;
  for (const [dest, label] of D) {
    k++; const want = 2000 + k * 123.45, msg = MTDocs.send(doc('ddc-' + k, dest, want, label));
    await sleep(300);
    let ok = false, where = '';
    if (dest.startsWith('calc:asset:')) { const r = S.assets.rows.find((x) => near(x.bal, want)); ok = !!r && r.type === dest.slice(11); where = 'asset row'; G('switchTab')('assets'); }
    else if (dest === 'calc:debt') { ok = S.dti.debts.some((x) => near(x.amt, want)); where = 'DTI debt'; G('switchTab')('dti'); }
    else if (dest === 'calc:nqm.bank') { ok = !!S.nonqm && S.nonqm.bank.deposits.some((x) => near(x.gross, want)); where = 'Non-QM bank deposit'; }
    else { const [a, b] = dest.slice(9).split('.'); ok = !!S.nonqm && near(S.nonqm[a][b], want); where = 'Non-QM ' + a + '.' + b; }
    if (ok) out.placed++; else { out.fails.push(`${label}: not on the ${where} — ${msg}`); continue; }
    await sleep(200);
    if (fields().some((e) => near(e.value, want))) out.linked++; else out.fails.push(`${label}: placed on the ${where} but no form field shows ${want.toFixed(2)}`);
  }
  await dropDocs('ddc-');
  Object.keys(S).forEach((x) => delete S[x]); Object.assign(S, base); try { G('renderAll') && G('renderAll')(); } catch (e) {} try { G('RECALC')(); } catch (e) {}
  return out;
}

export async function slots() {
  const G = (n) => (0, eval)(n), S = G('S'), DOCS = G('DOCS'), base = JSON.parse(JSON.stringify(S));
  const slotOptions = G('slotOptions'), applyDoc = G('applyDoc'), renderDocs = G('renderDocs');
  const KIND = { w2: { type: 'paystub', cols: ['y1', 'y2', 'y3'] }, schc: { type: 'schedc', cols: ['y1', 'y2'] }, corp: { type: 'k1_1065', cols: ['y1', 'y2'] }, sche: { type: 'schede', cols: ['y1'] } };
  const DATE = ['ytdThru', 'hireDate'], TEXT = ['employer', 'freq', '_borrower'];
  const NOT_YEAR = G('NOT_YEAR_SCOPED');
  const out = { choices: 0, applied: 0, linked: 0, dropdownOk: 0, fails: [] };
  const reset = () => { Object.keys(S).forEach((x) => delete S[x]); Object.assign(S, JSON.parse(JSON.stringify(base))); ['w2', 'schc', 'corp', 'sche'].forEach((x) => { S[x] = []; }); DOCS.length = 0; };
  let n = 0;
  for (const [kind, K] of Object.entries(KIND)) for (const col of K.cols) for (const [slot, label] of slotOptions(kind)) for (const mode of ['new', 'existing']) {
    reset(); n++; out.choices++;
    const isDate = DATE.includes(slot), isText = TEXT.includes(slot);
    const value = isDate ? '2026-10-31' : slot === 'freq' ? 'Bi-Weekly' : isText ? 'Dropdown Test Co' : slot === '_own' ? 37.5 : slot === 'fairDays' ? 300 : slot === 'personalDays' ? 12 : slot === 'hours' ? 37.5 : slot === 'rate' ? 31.25 : 1000 + n * 7.31;
    if (mode === 'existing') { const mk = { w2: G('newW2'), schc: G('newSchC'), corp: G('newCorp'), sche: G('newSchE') }[kind]; S[kind].push(mk()); }
    const target = mode === 'existing' ? kind + '|' + S[kind][0].id : kind + '|NEW';
    const yearScoped = !(NOT_YEAR[kind] || []).includes(slot);
    const d = { id: 'dd' + n, name: 'dropdown-' + kind + '-' + slot + '.pdf', size: 1000, note: '', status: 'done', text: '', type: K.type, target, yearCol: col,
      fields: [{ slot, label: label, value, apply: true, isDate, isText, yearScoped, src: 'test' }] };
    DOCS.push(d);
    renderDocs();   // the dropdown the user sees must offer this choice
    const sel = [...document.querySelectorAll('#panel-docs select')].find((s) => [...s.options].some((o) => o.value === slot) && s.getAttribute('onchange') && s.getAttribute('onchange').includes("'slot'"));
    if (sel && sel.value === slot) out.dropdownOk++; else out.fails.push(`${kind} ${label}: the "Goes to" dropdown does not offer or select it`);
    try { applyDoc(d.id, true); } catch (e) { out.fails.push(`${kind} ${label} [${col}, ${mode}]: applyDoc threw ${e.message}`); continue; }
    if (slot === '_borrower') { const ok = S.b1 === value; if (ok) { out.applied++; out.linked += document.getElementById('b1Name').value === value ? 1 : 0; } else out.fails.push(`${kind} ${label}: file header borrower is "${S.b1}"`); continue; }
    const rec = S[kind][0];
    if (!rec) { out.fails.push(`${kind} ${label} [${col}, ${mode}]: no worksheet`); continue; }
    if (kind === 'sche') try { G('calcSchE')(rec); } catch (e) {}   /* the two-year Schedule E view settles the record's columns */
    const cands = kind === 'sche' ? [rec.y2 && rec.y2[slot], rec.y1 && rec.y1[slot], rec[slot]] : slot === '_own' ? [rec.own] : yearScoped && rec[col] ? [rec[col][slot]] : [rec[slot]];
    const got = cands.find((v) => v !== undefined && (isDate || isText ? String(v) === String(value) : near(v, value)));
    if (got === undefined) { out.fails.push(`${kind} ${label} [${col}, ${mode}]: worksheet holds ${JSON.stringify(cands)}, applied ${value}`); continue; }
    out.applied++;
    G('switchTab')(kind === 'w2' ? 'w2' : kind);
    await sleep(0);
    const panel = document.getElementById('panel-' + kind) || document;
    const want = isDate ? value : value;
    const linked = [...panel.querySelectorAll('input,select,textarea')].some((e) => isText ? String(e.value).toLowerCase() === String(want).toLowerCase() : isDate ? (e.value === want || e.value === '10/31/2026') : near(e.value, want));
    if (linked) out.linked++; else out.fails.push(`${kind} ${label} [${col}, ${mode}]: on the worksheet but no input on the ${kind} tab shows ${want}`);
  }
  /* an entity document makes its worksheet the right form, and the figures count in the income */
  out.forms = 0;
  for (const [type, form, flds] of [['f1120', '1120', [['taxable', 150000], ['tax', 31500], ['depr', 12000]]], ['k1_1120s', '1120S', [['ordinary', 96000], ['w2biz', 40000]]], ['k1_1065', '1065', [['ordinary', 88000], ['guar', 30000]]]]) {
    reset(); n++;
    DOCS.push({ id: 'ddf' + n, name: type + '.pdf', size: 1, note: '', status: 'done', text: '', type, target: 'corp|NEW', yearCol: 'y1', fields: flds.map(([slot, value]) => ({ slot, label: slot, value, apply: true, yearScoped: true, src: 'test' })) });
    applyDoc('ddf' + n, true);
    const rec = S.corp[0], m = rec ? G('calcCorp')(rec).monthly : 0;
    if (rec && rec.form === form && m > 0) out.forms++; else out.fails.push(`${type}: worksheet form ${rec && rec.form}, monthly income ${m}`);
  }
  reset(); Object.keys(S).forEach((x) => delete S[x]); Object.assign(S, base); try { G('renderAll') && G('renderAll')(); } catch (e) {} try { G('RECALC')(); } catch (e) {}
  return out;
}
