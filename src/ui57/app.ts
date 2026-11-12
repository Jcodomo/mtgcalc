// v57 quote screen. One scrolling page: seven sections in the loan officer's order, a Simple / Advanced switch (Simple on every
// fresh open), Advanced groups that are not even built until they are opened, one live summary, and the review list.
// Edits go to the shared scenario store; only the parts of the page whose figures changed are redrawn, so focus and scroll stay put.
import { SECTIONS, FIELDS, GROUPS, Field, SectionId, byId, getPath, isSimple } from './fields';
import { checks, assumptions, summary, usd, pct, fmt, STATUS_LABEL, Check, MODE, overrideSet, gapOf, creditOf } from './review';
import { defaultScenario } from '../core/defaults';
import { today } from '../core/utils/dates';
import { migrateState, newId, exportScenario, importScenario, STORAGE_KEY } from '../core/model/scenario';

type Store = any;
const esc = (v: unknown) => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const pref = { get(k: string) { try { return localStorage.getItem(k); } catch { return null; } }, set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* per-viewer convenience only */ } } };
const SUMMARY_KEY = 'mt.v57.summary', OPEN_ADV_KEY = 'mt.v57.openAdvanced';

export class QuoteApp {
  store: Store; root: HTMLElement;
  /** Simple on every fresh open unless the separate preference says otherwise (spec item 4) */
  mode: 'simple' | 'advanced';
  /** Advanced groups opened one at a time while in Simple mode: "section|group" */
  opened = new Set<string>();
  summaryState: 'compact' | 'expanded' | 'hidden';
  defaults: any;
  last: Record<string, string> = {};
  pending = false;
  note = '';
  timings: number[] = [];

  /** embedded: shown inside the Full Suite on its own scenario (no separate copy, no preview tag) */
  embedded = false;
  /** while hidden behind the classic screen, updates wait until it is shown again */
  hidden = false; stale = false;
  /** the Full Suite's own section tabs: each jumps to a Simple section, or opens the full suite on that tab */
  tabs: { label: string; section?: SectionId; open?: () => void }[] = [];
  constructor(root: HTMLElement, store: Store, opts: { embedded?: boolean; tabs?: { label: string; section?: SectionId; open?: () => void }[] } = {}) {
    this.root = root; this.store = store; this.embedded = !!opts.embedded; this.tabs = opts.tabs || [];
    /* in the Full Suite, "Advanced" is the full suite itself (the switch in the top bar); here the screen stays Simple and
       each Advanced group still opens on its own */
    this.mode = !this.embedded && pref.get(OPEN_ADV_KEY) === '1' ? 'advanced' : 'simple';
    const ss = pref.get(SUMMARY_KEY); this.summaryState = ss === 'expanded' || ss === 'hidden' ? ss : 'compact';
    this.defaults = defaultScenario(today(), 'defaults');
    if (store.migration && store.migration.notes.length) this.note = store.migration.notes.join(' ');
    this.build();
    store.subscribe(() => this.schedule());
  }

  get i() { return this.store.activeInputs; }
  get o() { return this.store.outputs; }

  /* ------------------------------------------------------------ the page frame */
  build() {
    this.root.innerHTML = `
<header class="q-head">
  <div class="q-title"><h1>Quote</h1>${this.embedded ? '<button type="button" class="q-classic" data-act="classic" title="The full Loan Suite - same scenario, same figures">Advanced: full suite</button>' : '<span class="q-tag" title="This page keeps its own copy of the scenarios while v57 is being built; the Loan Suite pages are unchanged">v57 preview</span>'}</div>
  ${this.embedded ? '' : '<div class="q-mode" role="group" aria-label="Display mode"><button type="button" data-act="mode" data-v="simple">Simple</button><button type="button" data-act="mode" data-v="advanced">Advanced</button></div>'}
  <div class="q-scn"><label class="sr" for="qScn">Scenario</label><select id="qScn" data-act="scn"></select>
    <button type="button" data-act="new">New</button><button type="button" data-act="dup">Duplicate</button>${this.embedded ? '' : '<button type="button" data-act="import56" title="Copy the scenario open in the Loan Suite into this page (the Loan Suite file is not changed)">Copy from Loan Suite</button>'}
    <button type="button" data-act="export">Export</button><label class="q-file">Import<input type="file" accept=".json,application/json" data-act="importFile"></label></div>
</header>
${this.tabs.length ? `<nav class="q-nav" aria-label="Loan Suite sections">${this.tabs.map((t, k) => t.section ? `<a href="#q-${t.section}" data-act="go" data-s="${t.section}"${k ? '' : ' aria-current="page"'}>${esc(t.label)}</a>` : `<button type="button" data-act="tab" data-i="${k}" title="Opens the full suite on this tab">${esc(t.label)} <span aria-hidden="true">↗</span></button>`).join('')}</nav>` :
  `<nav class="q-nav" aria-label="Areas"><a href="#q-property" data-act="go" data-s="property" aria-current="page">Quote</a><a href="#q-renovation" data-act="go" data-s="renovation">Renovation</a><a href="income-calculator.html">Qualification &amp; Income</a><a href="#q-scenarios" data-act="go" data-s="scenarios">Scenarios</a><button type="button" data-act="docs">Documents &amp; Reports</button></nav>`}
<div class="q-note" role="status" aria-live="polite" hidden></div>
<div class="q-body">
  <main class="q-main no-search" id="qMain"></main>
  <aside class="q-sum" id="qSum" aria-label="Live summary"></aside>
</div>`;
    const main = this.root.querySelector('#qMain') as HTMLElement;
    main.innerHTML = `<section class="q-assume" id="qAssume" aria-label="Assumptions in use"></section>` + SECTIONS.map(s => `<section class="q-sec" id="q-${s.id}" data-sec="${s.id}" aria-labelledby="qh-${s.id}"></section>`).join('') +
      `<section class="q-sec" id="q-scenarios" aria-labelledby="qh-scenarios"><h2 id="qh-scenarios">Scenarios</h2><div id="qCompare"></div></section>`;
    this.root.addEventListener('input', e => this.onInput(e as InputEvent));
    this.root.addEventListener('change', e => this.onChange(e));
    this.root.addEventListener('click', e => this.onClick(e as MouseEvent));
    this.root.addEventListener('focusout', e => this.onBlur(e as FocusEvent));
    this.renderAll();
  }

  renderAll() {
    this.renderHead();
    SECTIONS.forEach(s => this.renderSection(s.id));
    this.renderAssumptions(); this.renderSummary(); this.renderCompare(); this.showNote();
  }

  renderHead() {
    this.root.querySelectorAll<HTMLButtonElement>('[data-act="mode"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === this.mode)));
    this.root.classList.toggle('q-advmode', this.mode === 'advanced');
    const sel = this.root.querySelector('#qScn') as HTMLSelectElement, st = this.store.snapshot;
    sel.innerHTML = Object.entries<any>(st.scenarios).map(([id, s]) => `<option value="${esc(id)}"${id === st.activeScenarioId ? ' selected' : ''}>${esc(s.inputs.name || id)}</option>`).join('');
  }

  /* ------------------------------------------------------------ sections and fields */
  visible(f: Field) { return !f.when || f.when(this.i); }
  groupOpen(sec: SectionId, g: string) { return this.mode === 'advanced' || this.opened.has(sec + '|' + g); }

  /** a section in three parts: its fields, its calculated rows and its Advanced groups; each is patched on its own */
  sectionParts(id: SectionId): { head: string; fields: string; calc: string; adv: string } {
    const s = SECTIONS.find(x => x.id === id)!, i = this.i, o = this.o;
    const head = `<h2 id="qh-${id}">${s.title}</h2><p class="q-hint">${s.hint}</p>`;
    if (id === 'results') return { head, fields: '', calc: this.resultsHtml(), adv: '' };
    const simple = FIELDS.filter(f => f.section === id && isSimple(f) && this.visible(f) && !FIELDS.some(p => p.pair === f.id));
    const fields = `<div class="q-grid">` + simple.map(f => this.fieldHtml(f)).join('') + (id === 'qualify' ? this.borrowersHtml() : '') + `</div>`;
    const calc = this.calcHtml(id, i, o);
    let h = '';
    const groups = GROUPS.filter(g => FIELDS.some(f => f.section === id && f.group === g && this.visible(f)));
    if (groups.length) {
      h += `<div class="q-advrow">` + groups.map(g => {
        const open = this.groupOpen(id, g), set = FIELDS.filter(f => f.section === id && f.group === g && this.visible(f) && this.differs(f)).length;
        return `<button type="button" class="q-advbtn" data-act="group" data-s="${id}" data-g="${esc(g)}" aria-expanded="${open}">${open ? '▾' : '▸'} ${esc(g)}${set ? ` <span class="q-badge">${set} changed</span>` : ''}</button>`;
      }).join('') + `</div>`;
      /* a closed group is not built at all - Simple mode does not pay for controls it does not show */
      h += groups.filter(g => this.groupOpen(id, g)).map(g => `<fieldset class="q-adv" data-group="${esc(g)}"><legend>${esc(g)}</legend><div class="q-grid">` +
        FIELDS.filter(f => f.section === id && f.group === g && this.visible(f) && !FIELDS.some(p => p.pair === f.id)).map(f => this.fieldHtml(f)).join('') + `</div></fieldset>`).join('');
    }
    return { head, fields, calc, adv: h };
  }

  placeholder(f: Field, calc: number | null): string { return f.blankNotEntered ? 'Not entered' : f.override ? (calc != null ? 'calc ' + (f.kind === 'pct' ? (calc * 100).toFixed(f.digits ?? 2) : calc.toFixed(2)) : 'calculated') : f.notEnteredWhenZero ? 'Not entered' : ''; }
  differs(f: Field) { const v = getPath(this.i, f.path); return f.override ? overrideSet(v) : JSON.stringify(v) !== JSON.stringify(getPath(this.defaults, f.path)); }

  /** the input's text as it should read now */
  shown(f: Field, v: any): string {
    if (v == null || (f.override && !overrideSet(v))) return '';
    if (f.kind === 'pct') return v === '' ? '' : String(+(+v * 100).toFixed(f.digits ?? 2));
    if (f.kind === 'money') return f.notEnteredWhenZero && !v ? '' : String(v);
    return String(v);
  }

  fieldHtml(f: Field): string {
    const i = this.i, v = getPath(i, f.path), id = 'qf-' + f.id.replace(/\./g, '-');
    const calc = f.calc ? f.calc(this.o, i) : null;
    const origin = f.override ? (!overrideSet(v) ? (f.blankNotEntered ? 'missing' : 'calc') : f.blankNotEntered ? 'entered' : 'override') : f.notEnteredWhenZero && !v ? 'missing' : f.id === 'propertyTaxAmount' && /Manual|Estimate/.test(i.taxSourceType) ? 'estimate' : 'entered';
    const tag = origin === 'override' ? '<span class="q-o o-ovr">override</span>' : origin === 'calc' ? '<span class="q-o o-calc">calculated</span>' : origin === 'missing' ? '<span class="q-o o-miss">not entered</span>' : origin === 'estimate' ? '<span class="q-o o-est">estimate</span>' : '';
    let ctl = '';
    if (f.kind === 'select') ctl = `<select id="${id}" data-f="${f.id}">` + (f.options || []).map(([val, lab]) => `<option value="${esc(val)}"${String(v) === val ? ' selected' : ''}>${esc(lab)}</option>`).join('') + `</select>`;
    else if (f.kind === 'check') return `<label class="q-f q-ck" data-fid="${f.id}"><input type="checkbox" id="${id}" data-f="${f.id}"${v ? ' checked' : ''}><span>${esc(f.label)}</span>${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</label>`;
    else {
      const ph = this.placeholder(f, calc);
      ctl = `<input id="${id}" data-f="${f.id}" type="text" inputmode="${f.kind === 'text' ? 'text' : 'decimal'}" autocomplete="off" value="${esc(this.shown(f, v))}" placeholder="${esc(ph)}">`;
    }
    const pair = FIELDS.find(p => p.id === f.pair);
    const pairCtl = pair ? `<select data-f="${pair.id}" aria-label="${esc(pair.label)}" class="q-pair">` + (pair.options || []).map(([val, lab]) => `<option value="${esc(val)}"${getPath(i, pair.path) === val ? ' selected' : ''}>${esc(lab)}</option>`).join('') + `</select>` : '';
    const unit = f.unit && !pair ? `<span class="q-unit">${esc(f.unit)}</span>` : f.unit === '$' && pair ? `<span class="q-unit">$</span>` : '';
    const reset = f.override && !f.blankNotEntered && overrideSet(v) ? `<button type="button" class="q-reset" data-act="useCalc" data-f="${f.id}">Use calculated value</button>` : '';
    const sugg = f.id === 'reno.contingencyPct' && this.o.renovationOut && Math.abs(this.o.renovationOut.suggestedContingencyPct - v) > 1e-9 ? `<small class="q-sugg">suggested ${pct(this.o.renovationOut.suggestedContingencyPct)}</small>` : '';
    return `<div class="q-f o-${origin}" data-fid="${f.id}"><label for="${id}">${esc(f.label)} ${tag}</label><div class="q-in">${ctl}${unit}${pairCtl}</div>${f.hint ? `<small>${esc(f.hint)}</small>` : ''}${sugg}${reset}</div>`;
  }

  borrowersHtml(): string {
    const B: any[] = this.i.borrowers || [], used = B.map((b, k) => k === 0 || b.grossMonthlyIncome > 0 || b.otherMonthlyIncome > 0 || b.monthlyDebts > 0 || !/^Borrower \d$/.test(b.name || '')).lastIndexOf(true) + 1;
    const rows = B.slice(0, Math.max(1, used + (this.addRow ? 1 : 0))).map((b, k) => `<tr data-row="${k}"><td><input data-bp="borrowers.${k}.name" value="${esc(b.name)}" aria-label="Borrower ${k + 1} name"></td>` +
      ['grossMonthlyIncome', 'otherMonthlyIncome', 'monthlyDebts'].map(c => `<td><input data-bp="borrowers.${k}.${c}" inputmode="decimal" value="${b[c] ? esc(b[c]) : ''}" placeholder="0" aria-label="Borrower ${k + 1} ${c === 'monthlyDebts' ? 'monthly debts' : c === 'otherMonthlyIncome' ? 'other monthly income' : 'qualifying monthly income'}"></td>`).join('') + `</tr>`).join('');
    return `<div class="q-bor q-wide" data-fid="income"><table><thead><tr><th>Borrower</th><th>Qualifying income <span class="q-unit">$ a month</span></th><th>Other income <span class="q-unit">$ a month</span></th><th>Debts <span class="q-unit">$ a month</span></th></tr></thead><tbody>${rows}</tbody></table>` +
      (used < B.length ? `<button type="button" class="q-link" data-act="addBorrower">+ Add a co-borrower</button>` : '') + `<small>Income comes from the Income Calculator or is typed here; the DTI is not shown until income is entered.</small></div>`;
  }
  addRow = false;

  /** calculated rows: read-only, styled apart from inputs (spec item 12) */
  calcHtml(id: SectionId, i: any, o: any): string {
    const row = (l: string, v: string, cls = '') => `<div class="q-cr ${cls}"><span>${l}</span><b>${v}</b></div>`;
    let r = '';
    if (id === 'property') r = row('Final price', usd(o.purchase.finalPurchasePrice, true)) + (o.isFha ? row('FHA loan limit', usd(o.loan.fhaLimitApplied) + ' · ' + esc(o.loan.fhaTier)) : '');
    if (id === 'renovation' && i.renovation) r = row('Construction', usd(o.renovationOut.baseCost, true)) + row('Contingency reserve', usd(o.renovationOut.contingencyReserve, true)) + row('Inspection and title fees', usd(o.renovationOut.inspectionFees + o.renovationOut.titleUpdateFees, true)) + row('Soft costs (consultant, plans, permits)', usd(o.renovationOut.softCosts, true)) +
      row('Supplemental origination', usd(o.renovationOut.supplementalOrigination, true)) + (o.renovationOut.paymentReserve ? row('Financed payments', usd(o.renovationOut.paymentReserve, true)) : '') + row('Rehabilitation escrow', usd(o.renovationOut.escrowHoldback, true)) + row('Total renovation amount', usd(o.renovationOut.finalRenovationAmount, true), 'q-tot') + row('Draws', String(o.renovationOut.drawCount));
    if (id === 'loan') r = row('Required investment', usd(o.loan.requiredInvestment, true)) + row('Base loan', usd(o.loan.totalLoan - (o.loan.ufmip || 0), true)) + (o.loan.ufmip ? row('Upfront MIP', usd(o.loan.ufmip, true)) : '') + row('Total loan', usd(o.loan.totalLoan, true), 'q-tot') + row('Principal & interest', usd(o.payment.principalAndInterest, true));
    if (id === 'housing') r = row('Taxes', usd(o.payment.monthlyTaxes, true) + ' a month') + row('Insurance', usd(o.payment.monthlyInsurance, true) + ' a month') + (o.payment.usingTiOverride ? row('Taxes & insurance used (override)', usd(o.payment.monthlyTaxesAndInsuranceUsed, true), 'q-ovr') : '') +
      row(o.isFha ? 'FHA MIP' : 'PMI', usd(o.isFha ? o.payment.monthlyFhaMip : o.payment.monthlyPmi, true)) + row('Total monthly payment', usd(o.payment.totalMonthlyPayment, true), 'q-tot');
    if (id === 'closing') {
      const G = gapOf(o), C = creditOf(o);
      r = row('Estimated closing costs', usd(o.cash.buyerClosingCosts, true)) + row('Required investment', usd(o.cash.requiredInvestment, true)) +
        (G.amount > 0 ? row(G.inCash ? 'Not financed - borrower brings' : 'Not financed - NOT in the cash to close below', usd(G.amount, true), 'q-warn') : '') +
        (C.requested > 0 ? row('Seller credit requested / allowed', usd(C.requested, true) + ' / ' + usd(C.allowed, true)) + row('Seller credit applied', '-' + usd(C.applied, true)) + (C.unused > 0 ? row('Unused credit (not cash back)', usd(C.unused, true), 'q-warn') : '') : '') +
        (o.cash.earnestMoneyDeposit > 0 ? row('Deposit already paid', '-' + usd(o.cash.earnestMoneyDeposit, true)) : '') + (o.cash.deficit > 0 ? row('Deposit returned at closing', usd(o.cash.deficit, true), 'q-warn') : '') + row('Cash to close', usd(o.cash.cashToClose, true), 'q-tot') +
        `<details class="q-lines"><summary>Closing cost lines</summary>` + (o.closing.lines || []).map((l: any) => row(esc(l.label) + (l.overridden ? ' <span class="q-o o-ovr">override</span>' : ''), usd(l.amount, true))).join('') + `</details>`;
    }
    if (id === 'qualify') { const a = o.aus, none = a.overallDti === 'ENTER INCOME'; r = row('Qualifying income', none ? 'Not entered' : usd(a.totalQualifyingIncome, true)) + row('Housing / total DTI', none ? 'Not entered' : pct(a.frontEndDti) + ' / ' + pct(a.backEndDti)) + row('Credit tier', esc(a.creditTier)); }
    return r ? `<div class="q-calc" aria-label="Calculated">${r}</div>` : '';
  }

  resultsHtml(): string {
    const C = checks(this.i, this.o), order: Record<string, number> = { fail: 0, review: 1, missing: 2, pass: 3, na: 4 };
    C.sort((a, b) => order[a.status] - order[b.status]);
    const counts = (['fail', 'review', 'missing', 'pass', 'na'] as const).map(s => [s, C.filter(c => c.status === s).length] as const).filter(x => x[1]);
    return `<p class="q-counts">` + counts.map(([s, n]) => `<span class="q-st st-${s}">${n} ${STATUS_LABEL[s]}</span>`).join(' ') + `</p><ul class="q-checks">` +
      C.map((c: Check) => `<li class="st-${c.status}"><span class="q-st st-${c.status}">${STATUS_LABEL[c.status]}</span><div><b>${esc(c.title)}</b><p>${esc(c.detail)}</p></div>${c.field ? `<button type="button" class="q-link" data-act="open" data-f="${esc(c.field)}">Go to</button>` : ''}</li>`).join('') + `</ul>`;
  }

  /* typing changes values, not structure: a part is rebuilt only when its fields change; otherwise values and calculated
     placeholders are updated in place, so the field being typed in is never replaced */
  renderSection(id: SectionId) {
    const el = this.root.querySelector(`#q-${id}`) as HTMLElement; if (!el) return;
    const P = this.sectionParts(id);
    if (this.last[id + ':head'] !== P.head) { el.innerHTML = P.head + '<div class="q-fw"></div><div class="q-cw"></div><div class="q-aw"></div>'; this.last[id + ':head'] = P.head; ['fw', 'cw', 'aw'].forEach(k => delete this.last[id + ':' + k]); }
    this.patch(el.querySelector('.q-fw') as HTMLElement, id + ':fw', P.fields, true);
    this.patch(el.querySelector('.q-cw') as HTMLElement, id + ':cw', P.calc, false);
    this.patch(el.querySelector('.q-aw') as HTMLElement, id + ':aw', P.adv, true);
  }
  structure(html: string) { return html.replace(/ (value|placeholder)="[^"]*"/g, '').replace(/ (checked|selected)(?=[ >])/g, ''); }
  patch(box: HTMLElement, key: string, html: string, hasInputs: boolean) {
    if (!hasInputs) {
      if (this.last[key] === html) return;
      const open = [...box.querySelectorAll('details[open] > summary')].map(x => x.textContent);
      box.innerHTML = html; this.last[key] = html;
      box.querySelectorAll('details > summary').forEach(x => { if (open.includes(x.textContent)) (x.parentElement as HTMLDetailsElement).open = true; });
      return;
    }
    const k = this.structure(html);
    if (this.last[key] === k) { this.syncValues(box); return; }
    const ae = document.activeElement as HTMLInputElement | null, inside = ae && box.contains(ae), fk = inside ? (ae!.dataset.f || ae!.dataset.bp) : null, sel = inside && ae!.type === 'text' ? [ae!.selectionStart, ae!.selectionEnd] : null, val = inside ? ae!.value : null;
    box.innerHTML = html; this.last[key] = k;
    if (fk) { const n = box.querySelector<HTMLInputElement>(`[data-f="${fk}"],[data-bp="${fk}"]`); if (n) { if (val != null && n.type === 'text' && ae!.tagName === 'INPUT' && ae!.type === 'text') n.value = val; n.focus({ preventScroll: true }); if (sel && sel[0] != null) try { n.setSelectionRange(sel[0], sel[1]); } catch { /* not a text field */ } } }
  }
  /** bring every input in a part up to date with the scenario, except the one being typed in */
  syncValues(box: HTMLElement) {
    const i = this.i, o = this.o, ae = document.activeElement;
    box.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-f]').forEach(n => {
      const f = byId[n.dataset.f!]; if (!f) return; const v = getPath(i, f.path);
      if (n instanceof HTMLInputElement && n.type === 'checkbox') { n.checked = !!v; return; }
      if (n instanceof HTMLInputElement && f.override) n.placeholder = this.placeholder(f, f.calc ? f.calc(o, i) : null);
      if (n === ae) return;
      const want = f.kind === 'select' ? String(v) : this.shown(f, v); if (n.value !== want) n.value = want;
    });
    box.querySelectorAll<HTMLInputElement>('[data-bp]').forEach(n => { if (n === ae) return; const v = getPath(i, n.dataset.bp!), want = /\.name$/.test(n.dataset.bp!) ? String(v || '') : v ? String(v) : ''; if (n.value !== want) n.value = want; });
  }

  renderAssumptions() {
    const A = assumptions(this.i, this.o, this.defaults), el = this.root.querySelector('#qAssume') as HTMLElement;
    const html = A.length ? `<h2>Assumptions in use</h2><ul>` + A.map(a => `<li class="a-${a.kind}"><button type="button" class="q-link" data-act="open" data-f="${esc(a.field)}">${esc(a.text)}</button></li>`).join('') + `</ul>` : `<h2>Assumptions in use</h2><p class="q-hint">None - every figure uses the standard calculation.</p>`;
    if (this.last.assume !== html) { el.innerHTML = html; this.last.assume = html; }
  }

  renderSummary() {
    const el = this.root.querySelector('#qSum') as HTMLElement, S = summary(this.i, this.o), st = this.summaryState;
    const fig = (f: any) => `<div class="q-fig${f.tone ? ' t-' + f.tone : ''}" data-fig="${f.id}"><span>${esc(f.label)}</span><b>${esc(f.value)}</b>${f.note ? `<small>${esc(f.note)}</small>` : ''}</div>`;
    const C = checks(this.i, this.o), bad = C.filter(c => c.status === 'fail').length, rev = C.filter(c => c.status === 'review').length, miss = C.filter(c => c.status === 'missing').length;
    const html = `<div class="q-sumbar"><b>Summary</b><div role="group" aria-label="Summary size">` + (['compact', 'expanded', 'hidden'] as const).map(s => `<button type="button" data-act="sum" data-v="${s}" aria-pressed="${s === st}">${s === 'compact' ? 'Compact' : s === 'expanded' ? 'Expanded' : 'Hide'}</button>`).join('') + `</div></div>` +
      (st === 'hidden' ? '' : `<div class="q-figs">${S.primary.map(fig).join('')}</div>` + (st === 'expanded' ? `<div class="q-figs q-more">${S.more.map(fig).join('')}</div>` : `<button type="button" class="q-link" data-act="sum" data-v="expanded">More figures</button>`) +
        `<button type="button" class="q-review" data-act="go" data-s="results">${bad ? `<span class="q-st st-fail">${bad} fail</span>` : ''}${rev ? `<span class="q-st st-review">${rev} review</span>` : ''}${miss ? `<span class="q-st st-missing">${miss} not entered</span>` : ''}${!bad && !rev && !miss ? '<span class="q-st st-pass">All checks pass</span>' : ''}</button>`) +
      (this.store.saveError ? `<p class="q-warn">${esc(this.store.saveError)}</p>` : '');
    if (this.last.sum !== html) { el.innerHTML = html; this.last.sum = html; }
    this.root.classList.toggle('q-sumhidden', st === 'hidden');
  }

  renderCompare() {
    const st = this.store.snapshot, ids = Object.keys(st.scenarios).slice(0, 4), el = this.root.querySelector('#qCompare') as HTMLElement;
    const rows: [string, (o: any, i: any) => string][] = [['Program', (o, i) => esc(i.loanProgram) + (i.renovation ? ' renovation' : '')], ['Price', (o) => usd(o.purchase.finalPurchasePrice)], ['Rate', (o, i) => pct(i.interestRate, 3)], ['Total loan', o => usd(o.loan.totalLoan)], ['Monthly payment', o => usd(o.payment.totalMonthlyPayment, true)], ['Cash to close', o => usd(o.cash.cashToClose)], ['DTI', o => o.aus.overallDti === 'ENTER INCOME' ? 'Not entered' : pct(o.aus.backEndDti)]];
    const outs = ids.map(id => ({ id, i: st.scenarios[id].inputs, o: id === st.activeScenarioId ? this.o : this.store.outputsFor(id) }));
    const html = `<p class="q-hint">Up to four scenarios side by side, all from the same calculation. Choose one above to edit it.</p><div class="q-cmpw"><table class="q-cmp"><thead><tr><th></th>${outs.map(x => `<th${x.id === st.activeScenarioId ? ' class="on"' : ''}>${esc(x.i.name || x.id)}</th>`).join('')}</tr></thead><tbody>` +
      rows.map(([l, f]) => `<tr><th>${l}</th>${outs.map(x => `<td>${x.o ? f(x.o, x.i) : '-'}</td>`).join('')}</tr>`).join('') + `</tbody></table></div>`;
    if (this.last.cmp !== html) { el.innerHTML = html; this.last.cmp = html; }
  }

  showNote(msg?: string) { if (msg != null) this.note = msg; const n = this.root.querySelector('.q-note') as HTMLElement; n.hidden = !this.note; n.textContent = this.note; }

  /* ------------------------------------------------------------ updates: only what changed */
  schedule() { if (this.pending) return; this.pending = true; queueMicrotask(() => { this.pending = false; this.refresh(); }); }
  /** shown again after the classic screen: catch up once */
  setHidden(h: boolean) { this.hidden = h; if (!h && this.stale) { this.stale = false; this.refresh(); } }
  refresh() {
    if (this.hidden) { this.stale = true; return; }
    const t0 = performance.now();
    this.renderHead(); SECTIONS.forEach(s => this.renderSection(s.id)); this.renderAssumptions(); this.renderSummary(); this.renderCompare();
    this.timings.push(performance.now() - t0); if (this.timings.length > 200) this.timings.shift();
  }

  /* ------------------------------------------------------------ reading what was typed */
  parse(f: Field, raw: string): any {
    const t = raw.trim();
    if (f.kind === 'text') return raw;
    if (t === '') return f.override ? (MODE.classic ? 0 : null) : 0;
    const n = Number(t.replace(/[$,\s%]/g, ''));
    if (!isFinite(n)) return undefined;
    if (f.kind === 'pct') return Math.round(n * 1e7) / 1e9;
    if (f.kind === 'int') return Math.round(n);
    return n;
  }
  onInput(e: InputEvent) {
    const t = e.target as HTMLInputElement;
    if (t.dataset.bp) { const p = t.dataset.bp, v = /\.name$/.test(p) ? t.value : (t.value.trim() === '' ? 0 : Number(t.value.replace(/[$,\s]/g, ''))); if (typeof v === 'number' && !isFinite(v)) return; this.store.setField(p, v, 'Borrowers'); return; }
    const f = t.dataset.f && byId[t.dataset.f]; if (!f || f.kind === 'select' || f.kind === 'check') return;
    const v = this.parse(f, t.value); if (v === undefined) { t.setAttribute('aria-invalid', 'true'); return; } t.removeAttribute('aria-invalid');
    this.store.setField(f.path, v, f.label, { exact: true });
  }
  onBlur(e: FocusEvent) {
    /* tidy the text once the cursor leaves (12,500 -> 12500.00 style stays as typed until then) */
    const t = e.target as HTMLInputElement, f = t.dataset && t.dataset.f && byId[t.dataset.f]; if (!f || f.kind === 'select' || f.kind === 'check' || f.kind === 'text') return;
    const v = getPath(this.i, f.path); if (t.getAttribute('aria-invalid') !== 'true') t.value = this.shown(f, v);
  }
  onChange(e: Event) {
    const t = e.target as HTMLInputElement;
    if (t.dataset.act === 'scn') { this.store.selectScenario(t.value); this.showNote(''); return; }
    if (t.dataset.act === 'importFile') { const fl = t.files && t.files[0]; t.value = ''; if (fl) fl.text().then(x => this.importText(x)); return; }
    const f = t.dataset.f && byId[t.dataset.f]; if (!f) return;
    if (f.kind === 'check') { this.store.setField(f.path, t.checked, f.label, { exact: true }); return; }
    if (f.kind !== 'select') return;
    if (f.id === 'loanProgram') return this.switchProgram(t.value);
    const v = (f.options || []).some(o => typeof o[0] === 'string' && /^\d+$/.test(o[0])) ? +t.value : t.value;
    this.store.setField(f.path, v, f.label, { exact: true });
  }

  /** a program change says what else changed and which deliberate overrides no longer apply (spec item 25) */
  switchProgram(p: string) {
    const before = JSON.parse(JSON.stringify(this.i));
    this.store.switchProgram(p);
    const after = this.i, msg: string[] = [];
    if (before.interestRate !== after.interestRate) msg.push(`rate ${pct(before.interestRate, 3)} to ${pct(after.interestRate, 3)}` + (after.conventionalRatePremiumApplied ? ' (conventional premium added)' : ' (conventional premium removed)'));
    if (before.finalDownPaymentPct !== after.finalDownPaymentPct) msg.push(`down payment ${pct(before.finalDownPaymentPct)} to ${pct(after.finalDownPaymentPct)} (the program minimum)`);
    if (p === 'Conventional' && after.fhaMipOverrideRate != null) msg.push('your FHA MIP override is kept but not used');
    if (p === 'FHA' && after.pmiOverrideRate != null) msg.push('your PMI override is kept but not used');
    this.showNote(`Program changed to ${p}` + (msg.length ? ': ' + msg.join('; ') + '.' : '. Nothing else changed.'));
  }

  /* ------------------------------------------------------------ buttons */
  onClick(e: MouseEvent) {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!b || b.tagName === 'SELECT' || (b.tagName === 'INPUT' && (b as HTMLInputElement).type !== 'button')) return;
    const a = b.dataset.act;
    if (a === 'mode') { this.mode = b.dataset.v === 'advanced' ? 'advanced' : 'simple'; this.opened.clear(); this.refresh(); return; }
    if (a === 'group') { const k = b.dataset.s + '|' + b.dataset.g; if (this.mode === 'advanced') return; this.opened.has(k) ? this.opened.delete(k) : this.opened.add(k); this.renderSection(b.dataset.s as SectionId); (this.root.querySelector(`[data-act="group"][data-g="${CSS.escape(b.dataset.g!)}"]`) as HTMLElement)?.focus(); return; }
    if (a === 'useCalc') { const f = byId[b.dataset.f!]; this.store.setField(f.path, MODE.classic ? 0 : null, f.label + ' (use calculated)', { exact: true }); return; }
    if (a === 'classic') { window.dispatchEvent(new CustomEvent('mt57:view', { detail: 'advanced' })); return; }
    if (a === 'tab') { const t = this.tabs[+b.dataset.i!]; if (t && t.open) t.open(); return; }
    if (a === 'open') { e.preventDefault(); this.reveal(b.dataset.f!); return; }
    if (a === 'go') { e.preventDefault(); const s = b.dataset.s!; this.root.querySelector(`#q-${s}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); this.root.querySelectorAll('.q-nav a').forEach(x => x.removeAttribute('aria-current')); if (b.tagName === 'A') b.setAttribute('aria-current', 'page'); return; }
    if (a === 'sum') { this.summaryState = b.dataset.v as any; pref.set(SUMMARY_KEY, this.summaryState); this.renderSummary(); return; }
    if (a === 'addBorrower') { this.addRow = true; this.renderSection('qualify'); const n = this.root.querySelectorAll<HTMLInputElement>('.q-bor tbody tr'); n[n.length - 1]?.querySelector('input')?.focus(); this.addRow = false; return; }
    if (a === 'new') { this.store.newScenario(); this.showNote('New scenario started from the standard figures.'); return; }
    if (a === 'dup') { this.store.duplicateScenario(); this.showNote('Scenario duplicated.'); return; }
    if (a === 'import56') return this.copyFromSuite();
    if (a === 'export') return this.exportActive();
    if (a === 'docs') return this.openDocuments();
  }

  /** open the exact field: build its Advanced group if needed, scroll to it and put the cursor in it (spec item 15) */
  reveal(fid: string) {
    const f = byId[fid], sec = f ? f.section : fid === 'income' ? 'qualify' : null; if (!sec) return;
    if (f && f.when && !f.when(this.i)) { this.showNote(`"${f.label}" applies only ${f.section === 'renovation' ? 'to renovation loans' : 'in other circumstances'} - it is not used in this scenario.`); }
    if (f && f.group && this.mode !== 'advanced') { this.opened.add(sec + '|' + f.group); this.renderSection(sec); }
    const el = this.root.querySelector<HTMLElement>(`[data-fid="${CSS.escape(fid)}"]`) || this.root.querySelector<HTMLElement>(`#q-${sec}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const inp = el.querySelector<HTMLElement>('input,select'); if (inp) inp.focus({ preventScroll: true });
    el.classList.add('q-flash'); setTimeout(() => el.classList.remove('q-flash'), 1600);
  }

  /* ------------------------------------------------------------ scenarios in and out */
  addScenario(sc: any, note: string) {
    const st = this.store.snapshot, id = sc.inputs.id && !st.scenarios[sc.inputs.id] ? sc.inputs.id : newId('scenario');
    sc.inputs.id = id; st.scenarios[id] = sc; st.activeScenarioId = id; this.store.emit(); this.showNote(note);
  }
  copyFromSuite() {
    let raw: any = null; try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { /* unreadable */ }
    if (!raw) { this.showNote('No Loan Suite scenario is saved in this browser yet.'); return; }
    const r = migrateState(raw), sc = r.state.scenarios[r.state.activeScenarioId];
    sc.inputs = JSON.parse(JSON.stringify(sc.inputs)); sc.inputs.name = (sc.inputs.name || 'Loan Suite scenario') + ' (from Loan Suite)';
    this.addScenario(sc, 'Copied the open Loan Suite scenario. The Loan Suite file was not changed.' + (r.migratedFrom ? ' Fields the Loan Suite stores as 0 to mean "calculate" are blank here.' : ''));
  }
  exportActive() {
    const blob = new Blob([exportScenario(this.store.active)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = (this.i.name || 'scenario').replace(/[^\w -]+/g, '') + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  importText(text: string) { const r = importScenario(text); if (r.error || !r.scenario) { this.showNote('Import failed: ' + r.error); return; } this.addScenario(r.scenario, 'Imported "' + (r.scenario.inputs.name || 'scenario') + '".' + (r.notes.length ? ' ' + r.notes.join(' ') : '')); }

  /** documents load only when asked for (spec item 5); they read this page's scenario store */
  openDocuments() {
    const w = window as any; w.mortgageSuite = w.mortgageSuite || {}; w.mortgageSuite.store = this.store;
    if (w.MTBuild) return w.MTBuild.open();
    this.showNote('Loading the document builder…');
    const s = document.createElement('script'); s.src = 'assets/doc-builder.js?v=56.8';
    s.onload = () => { this.showNote(''); w.MTBuild && w.MTBuild.open(); };
    s.onerror = () => this.showNote('The document builder could not be loaded - check the connection and try again.');
    document.head.appendChild(s);
  }
}
void fmt;
