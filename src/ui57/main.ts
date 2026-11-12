// v57 quote screen entry point: the shared scenario store (its own saved copy while v57 is a preview), the screen, and a search
// source that lists every field - including Advanced ones that have not been built yet - so search never has to load them first.
import { ScenarioStore } from '../state/store';
import { QuoteApp } from './app';
import { FIELDS, SECTIONS } from './fields';

export const PREVIEW_KEY = 'mortgage-suite-v57-preview';

function start() {
  const root = document.getElementById('quote57'); if (!root) return;
  const t0 = performance.now();
  const store = new ScenarioStore(undefined, { storageKey: PREVIEW_KEY });
  const app = new QuoteApp(root, store);
  const w = window as any;
  w.__q57 = { app, store, startMs: performance.now() - t0 };
  const sec = (id: string) => (SECTIONS.find(s => s.id === id) || { title: id }).title;
  const register = () => w.MTSearch && w.MTSearch.register && w.MTSearch.register(() =>
    FIELDS.filter(f => !FIELDS.some(p => p.pair === f.id)).map(f => ({ kind: 'Field', title: f.label, sub: sec(f.section) + (f.group ? ' › ' + f.group : ''), text: [f.label, f.keywords, sec(f.section), f.group, f.unit].filter(Boolean).join(' '), go: () => app.reveal(f.id) }))
      .concat(SECTIONS.map(s => ({ kind: 'Section', title: s.title, sub: 'Quote', text: s.title + ' ' + s.hint, go: () => document.getElementById('q-' + s.id)?.scrollIntoView({ block: 'start', behavior: 'smooth' }) } as any)))
      .concat([{ kind: 'Field', title: 'Qualifying income and debts', sub: 'Qualification', text: 'income debts borrower co-borrower overtime salary qualifying', go: () => app.reveal('income') } as any]));
  if (!register()) window.addEventListener('load', register, { once: true });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
