// v57 scenario model: saved-state migration from 56.x, stable IDs, import errors, and the store built on them.
// Runs against the rebuilt engine (dist/engine.js); `npm run build:engine` first.
import { loadEngine } from './engine-loader.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'engine.js');

function memStorage(init = {}) { const m = { ...init }; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, dump: () => m }; }
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });

const base = loadEngine(dist);
const M = base.require('src/core/model/scenario'), D = base.require('src/core/defaults'), E = base.require('src/core/calc/engine');

/* a state shaped the way 56.5 saved it: no schemaVersion, 0 for "calculate" overrides and unentered assets */
function state56() {
  const a = D.defaultScenario('2026-11-12', 'scenario-1'), b = D.defaultScenario('2026-11-12', 'scenario-2');
  a.fhaMipOverrideRate = 0; a.pmiOverrideRate = 0; a.taxInsuranceOverrideMonthly = 0; a.assets = { ...a.assets, liquidAssets: 0, retirementOtherAssets: 0, giftFunds: 0 };
  b.assets = { ...b.assets, liquidAssets: 25000 }; b.id = 'old-copy-id';
  const sv = s => ({ inputs: s, borrowerId: null, propertyId: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z', audit: [], versions: [{ version: 1, timestamp: 'x', user: 'local', label: 'v1', inputs: { ...s, fhaMipOverrideRate: 0 } }] });
  return { activeScenarioId: 'scenario-1', scenarios: { 'scenario-1': sv(a), 'scenario-2': sv(b) }, borrowers: [], properties: [], compareIds: ['scenario-2', 'gone', 'scenario-2'], mode: 'renovation', theme: 'dark', user: 'local', lookupMessage: 'stale', sections: { collapsed: { x: true }, pinned: {} } };
}

/* 1. migration from 56.x */
{
  const r = M.migrateState(state56()), s = r.state, a = s.scenarios['scenario-1'].inputs, b = s.scenarios['scenario-2'].inputs;
  check('56.x state gets schema version 57', s.schemaVersion === 57 && r.migratedFrom === 56);
  check('0 overrides become blank (calculate)', a.fhaMipOverrideRate === null && a.pmiOverrideRate === null && a.taxInsuranceOverrideMonthly === null, JSON.stringify([a.fhaMipOverrideRate, a.pmiOverrideRate, a.taxInsuranceOverrideMonthly]));
  check('0 assets become blank (not entered); entered assets stay', a.assets.liquidAssets === null && b.assets.liquidAssets === 25000);
  check('saved versions are migrated too', s.scenarios['scenario-1'].versions[0].inputs.fhaMipOverrideRate === null);
  check('scenario id follows its key', b.id === 'scenario-2' && r.notes.some(n => /carried the id/.test(n)));
  check('compare list drops missing and duplicate ids', JSON.stringify(s.compareIds) === '["scenario-2"]', JSON.stringify(s.compareIds));
  check('mode, theme and sections kept; lookup message cleared', s.mode === 'renovation' && s.theme === 'dark' && s.sections.collapsed.x === true && s.lookupMessage === '');
  check('stateProblems finds nothing after migration', M.stateProblems(s).length === 0, M.stateProblems(s).join('; '));
  const again = M.migrateState(JSON.parse(JSON.stringify(s)));
  check('migrating a v57 state again changes nothing', JSON.stringify(again.state) === JSON.stringify(s) && again.migratedFrom === null && again.notes.length === 0, again.notes.join('; '));
  let ok = true, msg = ''; for (const id of Object.keys(s.scenarios)) { try { const o = E.runScenario(s.scenarios[id].inputs); if (!o || !o.loan) { ok = false; msg = id + ': no output'; } } catch (e) { ok = false; msg = id + ': ' + e.message; } }
  check('the engine runs every migrated scenario', ok, msg);
}
/* 2. nothing discarded when the open scenario is missing (56.5 started over and lost every saved scenario) */
{
  const raw = state56(); raw.activeScenarioId = 'deleted-elsewhere';
  const r = M.migrateState(raw);
  check('missing open scenario: the others are kept and the first opens', Object.keys(r.state.scenarios).length === 2 && r.state.activeScenarioId === 'scenario-1');
  const raw2 = state56(); raw2.scenarios['scenario-2'] = { inputs: null };
  check('a scenario without inputs is skipped with a note', Object.keys(M.migrateState(raw2).state.scenarios).length === 1 && M.migrateState(raw2).notes.some(n => /skipped/.test(n)));
}
/* 3. loading from storage: the 56.x original is kept once as the rollback copy; damaged JSON is left in place */
{
  const text = JSON.stringify(state56()), st = memStorage({ [M.STORAGE_KEY]: text });
  const r = M.loadState(st);
  check('load migrates and keeps the 56.x original under the backup key', r.migratedFrom === 56 && st.getItem(M.BACKUP_KEY) === text);
  st.setItem(M.BACKUP_KEY, 'first'); M.loadState(st);
  check('the backup is written only once', st.getItem(M.BACKUP_KEY) === 'first');
  const bad = memStorage({ [M.STORAGE_KEY]: '{"scenarios": {' }), rb = M.loadState(bad);
  check('damaged JSON: a new scenario starts, the saved text is not overwritten', rb.state.schemaVersion === 57 && bad.getItem(M.STORAGE_KEY) === '{"scenarios": {' && /damaged/.test(rb.notes[0] || ''));
  check('no saved state: a fresh start with no notes', M.loadState(memStorage()).notes.length === 0);
}
/* 4. IDs */
{
  const seen = new Set(); let dup = 0; for (let i = 0; i < 20000; i++) { const id = M.newId('scenario'); if (seen.has(id)) dup++; seen.add(id); }
  check('20,000 IDs made in a tight loop are all different', dup === 0, dup + ' duplicates');
}
/* 5. import */
{
  const e1 = M.importScenario('not json'), e2 = M.importScenario('{"hello": 1}');
  check('import: invalid JSON says so', !e1.scenario && /not valid JSON/.test(e1.error));
  check('import: a file without a scenario says so', !e2.scenario && /does not contain a scenario/.test(e2.error));
  const one = state56().scenarios['scenario-1'], ok = M.importScenario(JSON.stringify(one));
  check('import: a 56.x scenario file is migrated and gets a new id', ok.scenario && ok.scenario.inputs.fhaMipOverrideRate === null && /^scenario-/.test(ok.scenario.inputs.id) && ok.scenario.inputs.id !== 'scenario-1');
  const round = M.importScenario(M.exportScenario(M.migrateState(state56()).state.scenarios['scenario-2']));
  check('export then import keeps the inputs', round.scenario && round.scenario.inputs.assets.liquidAssets === 25000);
}
/* 6. the store: loads through the model, persists the schema version, new scenarios never collide */
{
  const st = memStorage({ 'mortgage-suite-state-v2': JSON.stringify(state56()) });
  const FixedDate = class extends Date { static now() { return 1790000000000; } };
  const eng = loadEngine(dist, { ctx: { localStorage: st, Date: FixedDate } });
  const S = eng.require('src/state/store'), store = new S.ScenarioStore();
  check('store opens the migrated state', store.snapshot.schemaVersion === 57 && store.activeInputs.fhaMipOverrideRate === null && store.migration && store.migration.migratedFrom === 56);
  check('store saves the migrated state with its schema version', JSON.parse(st.getItem('mortgage-suite-state-v2')).schemaVersion === 57);
  const n1 = store.newScenario(), n2 = store.newScenario(), d1 = store.duplicateScenario();
  const ids = Object.keys(store.snapshot.scenarios);
  check('three scenarios made in the same millisecond are three scenarios (56.5 kept one)', ids.length === 5 && new Set([n1, n2, d1]).size === 3 && [n1, n2, d1].every(id => store.snapshot.scenarios[id] && store.snapshot.scenarios[id].inputs.id === id), ids.join(', '));
  const c = store.compareProgramScenario();
  check('program comparison pairs the right two scenarios', store.snapshot.compareIds.length === 2 && store.snapshot.compareIds[1] === c && store.snapshot.scenarios[c]);
  check('outputs still compute from the store', store.outputs && store.outputs.loan && store.outputs.loan.totalLoan > 0);
}

const w = Math.max(...results.map(r => r.name.length));
for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name.padEnd(w) + (r.ok || !r.detail ? '' : '   ' + r.detail));
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length} checks: ${results.length - failed} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
