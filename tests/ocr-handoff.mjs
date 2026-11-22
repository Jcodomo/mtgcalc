// OCR handoff test, run inside the pages (the browser), on documents written by: node tests/ocr-slam.mjs --emit=6
//   Income Calculator page:  (await import('/tests/ocr-handoff.mjs')).income()
//     Each pay stub, W-2, Work Number report, Schedule C / E and K-1 goes through the page's own upload steps
//     (classify, extractFields, placeDoc, applyDoc), lands on a worksheet, and the worksheet's figures and the monthly
//     income the calculator then works out are checked against the document and a hand calculation.
//   Document Center, on the Income Calculator then on a Loan Suite page:  .centerSend()  then  .centerCheck()
//     Each statement, contract, appraisal, bill ... is read and sent; Income Calculator values are placed at once,
//     Loan Suite values wait in the queue and are placed when a Loan Suite page opens, where they are checked.
const near = (a, b, t = 0.006) => Math.abs((+a || 0) - (+b || 0)) <= t;
const WS_DIM = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];          // the worksheet's month lengths
const pd = (s) => { const [y, m, d] = String(s).split('-').map(Number); return { y, m: m - 1, d }; };
async function docs() { const r = await fetch('/tests/_out/handoff-docs.json?' + Date.now()); if (!r.ok) throw new Error('run: node tests/ocr-slam.mjs --emit=6'); return r.json(); }
const W = (doc, k) => { const f = doc.want.find((x) => x[0] === k); return f ? f[1] : undefined; };

export async function income() {
  const G = (n) => (0, eval)(n);                                          // the page's own functions and state
  const S = G('S'), DOCS = G('DOCS'), base = JSON.parse(JSON.stringify(S));
  const reset = () => { Object.keys(S).forEach((k) => delete S[k]); Object.assign(S, JSON.parse(JSON.stringify(base))); ['w2', 'schc', 'corp', 'sche'].forEach((k) => { S[k] = []; }); DOCS.length = 0; };
  const all = (await docs()).income, out = { n: 0, ok: 0, checks: 0, pass: 0, fails: [], byGen: {} };
  for (const doc of all) {
    reset();
    const type = G('classify')(doc.text), d = { id: 'h' + out.n, name: doc.gen + '.pdf', status: 'done', text: doc.text, type, fields: G('extractFields')(type, doc.text) };
    DOCS.push(d);
    try { const p = G('placeDoc')(d); G('stampDoc')(p); } catch (e) { d.target = G('defaultTarget')(type); }
    if (!d.target) d.target = G('defaultTarget')(type);
    G('applyDoc')(d.id, true);
    const [kind, rid] = String(d.target).split('|'), rec = (S[kind] || []).find((r) => r.id === rid);
    const B = out.byGen[doc.gen + ' / ' + doc.level] || (out.byGen[doc.gen + ' / ' + doc.level] = { docs: 0, ok: 0 });
    let good = true; out.n++; B.docs++;
    const ck = (what, cond, got, want) => { out.checks++; if (cond) { out.pass++; return; } good = false; if (out.fails.length < 60) out.fails.push(`${doc.gen} [${doc.level}] ${what}: want ${want} got ${got}`); };
    ck('worksheet', !!rec, d.target, { paystub: 'w2', w2: 'w2', wvoe: 'w2', schedc: 'schc', schede: 'sche', k1_1065: 'corp', k1_1120s: 'corp' }[doc.type]);
    if (rec) {
      if (doc.type === 'paystub') {
        const ytd = W(doc, 'base'), thru = W(doc, 'ytdThru'), r = G('calcW2')(rec), e = pd(thru), mo = e.d / WS_DIM[e.m] + e.m;
        ck('YTD base', near(rec.y1.base, ytd), rec.y1.base, ytd); ck('pay period end', rec.ytdThru === thru, rec.ytdThru, thru);
        if (W(doc, 'rate') != null) ck('rate', near(rec.rate, W(doc, 'rate')), rec.rate, W(doc, 'rate'));
        if (W(doc, 'ot') != null) ck('YTD overtime', near(rec.y1.ot, W(doc, 'ot')), rec.y1.ot, W(doc, 'ot'));
        if (W(doc, 'bonus') != null) ck('YTD bonus', near(rec.y1.bonus, W(doc, 'bonus')), rec.y1.bonus, W(doc, 'bonus'));
        ck('base method (no weekly hours on a stub: YTD average)', rec.m.base === 'ytd', rec.m.base, 'ytd');
        ck('monthly income = YTD / months', near(r.total, ytd / mo, 0.02), r.total.toFixed(2), (ytd / mo).toFixed(2));
      } else if (doc.type === 'w2') {
        const yr = +(doc.text.match(/20\d{2}/) || [])[0], box1 = W(doc, 'base'), r = G('calcW2')(rec);
        ck('box 1 in the year column', near(rec.y1.base, box1), rec.y1.base, box1); ck('a full year through Dec 31', rec.ytdThru === yr + '-12-31', rec.ytdThru, yr + '-12-31');
        ck('monthly income = box 1 / 12', near(r.total, box1 / 12, 0.02), r.total.toFixed(2), (box1 / 12).toFixed(2));
      } else if (doc.type === 'wvoe') {
        const rate = W(doc, 'rate'), r = G('calcW2')(rec), mb = rate * 40 * 52 / 12;
        ck('rate', near(rec.rate, rate), rec.rate, rate); ck('hours per week (80 per bi-weekly period)', near(rec.hours, 40), rec.hours, 40);
        ck('hire date', rec.hireDate === W(doc, 'hireDate'), rec.hireDate, W(doc, 'hireDate')); ck('current as of', rec.ytdThru === W(doc, 'ytdThru'), rec.ytdThru, W(doc, 'ytdThru'));
        ck('current-year base', near(rec.y1.base, W(doc, 'base')), rec.y1.base, W(doc, 'base'));
        ck('monthly base = rate x 40 x 52 / 12', near(r.parts.base, mb, 0.02), r.parts.base.toFixed(2), mb.toFixed(2));
      } else if (doc.type === 'schedc') {
        const col = d.yearCol || 'y1', y = rec[col] || rec.y1;
        for (const k of ['net31', 'depr13', 'meals', 'home30']) if (W(doc, k) != null) ck(k, near(y[k], W(doc, k)), y[k], W(doc, k));
      } else if (doc.type === 'schede') {
        // no tax year printed: the most recent filed year's column (y2); one year entered, so the worksheet averages the
        // blank prior year in as zero (its own rule, with a note) unless the AUS asks for one year
        const y = rec.y2 || {}, c = G('calcSchE')(rec), yrs = W(doc, 'fairDays') / 365 * 12;
        for (const k of ['rents', 'ins', 'mortInt', 'taxes', 'depr', 'totalExp', 'fairDays']) ck(k + ' (most recent year)', near(y[k], W(doc, k)), y[k], W(doc, k));
        ck('most recent year is the last filed', +y.yr === new Date().getFullYear() - 1, y.yr, new Date().getFullYear() - 1);
        const annual = W(doc, 'rents') + W(doc, 'ins') + W(doc, 'mortInt') + W(doc, 'taxes') + W(doc, 'depr') + (y.otherAdd || 0) - W(doc, 'totalExp');
        if (W(doc, 'fairDays') >= 365) ck('monthly = one year averaged with a blank prior year', near(c.worksheetMonthly, annual / 24, 0.02), (+c.worksheetMonthly).toFixed(2), (annual / 24).toFixed(2));
        else ck('monthly income is worked out', isFinite(c.worksheetMonthly) && c.worksheetMonthly !== 0, c.worksheetMonthly, 'a figure');
      } else {
        const col = d.yearCol || 'y1', y = rec[col] || rec.y1;
        ck('ordinary income', near(y.ordinary, W(doc, 'ordinary')), y.ordinary, W(doc, 'ordinary')); ck('ownership', near(rec.own, W(doc, '_own')), rec.own, W(doc, '_own'));
        if (W(doc, 'dist') != null) ck('distributions', near(y.dist, W(doc, 'dist')), y.dist, W(doc, 'dist'));
      }
    }
    if (good) { out.ok++; B.ok++; }
  }
  reset(); Object.assign(S, JSON.parse(JSON.stringify(base)));
  try { G('renderW2')(); G('RECALC')(); } catch (e) {}
  return out;
}

const QKEY = 'mt.docs.queue.v1', SENT = 'mt.handoff.sent.v1';
export async function centerSend() {
  const M = window.MTDocs, all = (await docs()).center, sent = [];
  localStorage.setItem(QKEY, '[]');
  const S = (0, eval)('S'), rows0 = S.assets.rows.length, debts0 = S.dti.debts.length;
  let calcOk = 0, calcN = 0; const fails = [];
  all.forEach((doc, i) => {
    const d = M.extract({ id: 'c' + i, name: doc.gen + '-' + i + '.pdf', docType: M.detect(doc.text, ''), text: doc.text });
    d.rows.forEach((r) => { r.on = !!r.dest; });                        // everything with a destination is ticked
    const before = { rows: S.assets.rows.length, debts: S.dti.debts.length };
    M.send(d);
    for (const [dest, want] of doc.want) {
      if (dest.indexOf('calc:') === 0) {
        calcN++;
        const got = dest === 'calc:debt' ? (S.dti.debts[before.debts] || {}).amt : (S.assets.rows[before.rows] || {}).bal;
        if (near(got, want)) calcOk++; else fails.push(`${doc.gen} [${doc.level}] ${dest}: want ${want} got ${got}`);
      } else sent.push({ gen: doc.gen, level: doc.level, dest, want, doc: d.name });
    }
  });
  const q = JSON.parse(localStorage.getItem(QKEY) || '[]');
  localStorage.setItem(SENT, JSON.stringify(sent));
  const added = { assets: S.assets.rows.length - rows0, debts: S.dti.debts.length - debts0 };
  S.assets.rows.length = rows0; S.dti.debts.length = debts0;             // leave the calculator as it was
  try { (0, eval)('renderAssets')(); (0, eval)('renderDTI')(); (0, eval)('RECALC')(); } catch (e) {}
  return { documents: all.length, incomeCalculatorValues: `${calcOk}/${calcN} placed right`, added, waitingForLoanSuite: q.length, loanValuesExpected: sent.length, fails: fails.slice(0, 20) };
}

// on a Loan Suite page after centerSend: the queue drains when the page opens; one document's values at a time are checked
// by replaying the queue item by item (the store keeps only the last value of each field)
export async function centerCheck() {
  const st = window.mortgageSuite && window.mortgageSuite.store; if (!st) throw new Error('open a Loan Suite page');
  const inputs = () => { const s = st.state; return s.scenarios[s.activeScenarioId].inputs; };   // the active loan file's fields
  const get = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), inputs());
  const same = (dest, got, want) => { if (dest === 'loan:interestRate' && got < 1) got *= 100; return near(got, want) || String(got) === String(want); };
  const sent = JSON.parse(localStorage.getItem(SENT) || '[]'), out = {};
  // 1. what waited in the queue was placed when this page opened: each field holds the last value sent to it, and the queue is empty
  const last = {}; sent.forEach((s) => { last[s.dest] = s; });
  let qOk = 0; const qFails = [];
  for (const [dest, s] of Object.entries(last)) { const g = get(dest.slice(5)); if (same(dest, g, s.want)) qOk++; else qFails.push(`${dest}: want ${s.want} got ${g}`); }
  out.queue = { left: JSON.parse(localStorage.getItem(QKEY) || '[]').length, fieldsRight: `${qOk}/${Object.keys(last).length}`, fails: qFails.slice(0, 10) };
  // 2. sent from this page: every document, one at a time, every value it should place
  const M = window.MTDocs, all = (await docs()).center; let ok = 0, n = 0; const fails = [];
  for (const [i, doc] of all.entries()) {
    const d = M.extract({ id: 'l' + i, name: doc.gen + '-' + i + '.pdf', docType: M.detect(doc.text, ''), text: doc.text });
    d.rows.forEach((r) => { r.on = !!r.dest && r.dest.indexOf('loan:') === 0; });
    M.send(d);
    for (const [dest, want] of doc.want) { if (dest.indexOf('loan:') !== 0) continue; n++; const g = get(dest.slice(5)); if (same(dest, g, want)) ok++; else fails.push(`${doc.gen} [${doc.level}] ${dest}: want ${want} got ${g}`); }
  }
  out.direct = { valuesRight: `${ok}/${n}`, fails: fails.slice(0, 20) };
  localStorage.setItem(QKEY, '[]');
  return out;
}
