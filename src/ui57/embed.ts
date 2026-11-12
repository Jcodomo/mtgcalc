// The Simple quote screen inside the Full Suite. It works on the suite's own scenario store - the same scenario and the same
// calculation as the full suite, so the two views can never disagree. A "Simple | Advanced" switch in the top bar moves between
// them: Simple is this screen, Advanced is the full suite. In Simple, the suite's own section tabs (File, Loan, Costs, ...) lead to
// the matching Simple section; tabs Simple has no section for open the full suite on that tab. The live summary stays in Simple.
// Every fresh visit opens in Simple (spec item 4); the choice is kept while the browser tab stays open.
import { QuoteApp } from './app';
import { FIELDS, SECTIONS } from './fields';
import { MODE } from './review';

const VIEW_KEY = 'mt.v57.view';
const ME = (document.currentScript as HTMLScriptElement | null)?.src || '';
type View = 'simple' | 'advanced';
const session = { get(): View | null { try { const v = sessionStorage.getItem(VIEW_KEY); return v === 'classic' ? 'advanced' : v as View | null; } catch { return null; } }, set(v: View) { try { sessionStorage.setItem(VIEW_KEY, v); } catch { /* per-tab convenience only */ } } };

function css() {
  if (document.getElementById('q57css')) return;
  const l = document.createElement('link'); l.id = 'q57css'; l.rel = 'stylesheet';
  l.href = (ME ? ME.replace(/quote-embed\.js.*$/, '') : 'assets/v57/') + 'quote.css?v=57.6';
  document.head.appendChild(l);
}

/** the quote screens only: the Full Suite page and the Loan Suite File (Quote & Setup) page - not Documents, Scenarios and the rest */
const isQuotePage = () => { const w = window as any; return w.LOS_PAGE === 'full' || !!(w.LOS_EMBED && w.LOS_EMBED.page === 'quote'); };
function start(tries = 0) {
  if (!isQuotePage()) return;
  const w = window as any, store = w.mortgageSuite && w.mortgageSuite.store, suite = document.getElementById('suite-root'), bar = document.getElementById('shellbar');
  if (!store || !suite) { if (tries < 80) setTimeout(() => start(tries + 1), 100); return; }
  /* the v57 store (phase 5) reads blank as "calculate"; the 56.5 store (before) read 0 that way */
  MODE.classic = !store.storageKey;
  css();
  const host = document.createElement('div'); host.id = 'quote57'; host.className = 'q-embedded';
  suite.parentNode!.insertBefore(host, suite);
  /* the full suite's main section tabs; the ones with a Simple section jump there, the rest open the full suite on that tab */
  const openSuiteTab = (label: string) => () => {
    set('advanced');
    const navs = ['#v23SuitePrimaryNav', '#suite-root .v48-context', '#suite-root .v23-context-tabs'];
    for (const n of navs) { const b = [...document.querySelectorAll<HTMLElement>(n + ' a, ' + n + ' button')].find(x => x.textContent!.replace(/\s+/g, ' ').trim().toLowerCase().startsWith(label.toLowerCase())); if (b) { b.click(); return; } }
  };
  const tabs = [
    { label: 'File', section: 'property' as const }, { label: 'Renovation', section: 'renovation' as const }, { label: 'Loan', section: 'loan' as const },
    { label: 'Housing', section: 'housing' as const }, { label: 'Costs', section: 'closing' as const }, { label: 'Underwriting', section: 'qualify' as const },
    { label: 'Results', section: 'results' as const }, { label: 'Documents', open: openSuiteTab('Documents') }, { label: 'Rates', open: openSuiteTab('Rates') },
    { label: 'Property', open: openSuiteTab('Property') }, { label: 'Max mortgage', open: openSuiteTab('Max mortgage') },
  ];
  const app = new QuoteApp(host, store, { embedded: true, tabs });
  w.__q57 = { app, store, embedded: true };

  /* the switch in the top bar, beside Income Calculator | Loan Suite */
  const seg = document.createElement('div'); seg.id = 'q57view'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Loan Suite screen');
  seg.innerHTML = '<button type="button" data-v="simple" title="The Simple quote screen with the live summary">Simple</button><button type="button" data-v="advanced" title="The full Loan Suite - same scenario, same figures">Advanced</button>';
  const after = document.getElementById('modeseg'); if (bar) { after && after.nextSibling ? bar.insertBefore(seg, after.nextSibling) : bar.appendChild(seg); } else document.body.insertBefore(seg, document.body.firstChild);

  const suiteShown = () => !document.getElementById('calc-root') || getComputedStyle(document.getElementById('calc-root')!).display === 'none';
  let view: View = session.get() || 'simple';
  const apply = () => {
    const inSuite = suiteShown(), simple = view === 'simple';
    host.hidden = !(inSuite && simple); app.setHidden(host.hidden);
    suite.style.display = inSuite && simple ? 'none' : '';
    seg.hidden = !inSuite;
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === view)));
    document.documentElement.classList.toggle('q57-simple', inSuite && simple);
    document.documentElement.classList.toggle('q57-advanced', inSuite && !simple);
    if (inSuite && !simple) placeBack();
  };
  /* a "Simple" button at the start of the full suite's section tabs, which stay in view while scrolling */
  const placeBack = () => {
    const nav = document.getElementById('v23SuitePrimaryNav'); if (!nav || nav.querySelector('.q57-back')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'q57-back';
    b.title = 'Back to the Simple quote screen - same scenario, same figures'; b.innerHTML = '<span aria-hidden="true">←</span> Simple';
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); set('simple'); });
    nav.insertBefore(b, nav.firstChild);
  };
  const set = (v: View) => { view = v; session.set(v); apply(); const top = () => { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }; top(); setTimeout(top, 60); };
  seg.addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-v]'); if (b) set(b.dataset.v as View); });
  window.addEventListener('mt57:view', (e: Event) => set((e as CustomEvent).detail));
  /* switching to the Income Calculator hides both quote screens; coming back restores the chosen one */
  const calc = document.getElementById('calc-root');
  if (calc) new MutationObserver(() => apply()).observe(calc, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  apply();

  /* search: every field, including Advanced ones not built yet; selecting one shows the Simple screen first */
  const sec = (id: string) => (SECTIONS.find(s => s.id === id) || { title: id }).title;
  const go = (fid: string) => () => { if (view !== 'simple') set('simple'); app.reveal(fid); };
  const register = () => w.MTSearch && w.MTSearch.register && w.MTSearch.register(() => FIELDS.filter(f => !FIELDS.some(p => p.pair === f.id))
    .map(f => ({ kind: 'Field', title: f.label, sub: 'Simple quote › ' + sec(f.section) + (f.group ? ' › ' + f.group : ''), text: [f.label, f.keywords, sec(f.section), f.group, f.unit].filter(Boolean).join(' '), go: go(f.id) })));
  if (!register()) window.addEventListener('load', register, { once: true });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start()); else start();
