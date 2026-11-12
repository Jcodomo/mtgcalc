// v57 shared scenario model: one saved shape for every page, with a schema version, stable IDs and the 56.x migration.
// The 56.5 store kept no version, created IDs from Date.now() (two in the same millisecond collide), and threw away
// every saved scenario when the active one was missing. Loading goes through migrateState() now.
import { defaultScenario } from '../defaults';
import { today } from '../utils/dates';
import { migrate56Inputs } from './overrides';

export const STORAGE_KEY = 'mortgage-suite-state-v2';
/** the saved state exactly as 56.x left it, kept once before the first v57 migration (the rollback path) */
export const BACKUP_KEY = 'mortgage-suite-state-v2.before-v57';
export const SCHEMA_VERSION = 57;

export const MODES = ['quote', 'setup', 'renovation', 'maxmortgage', 'closing', 'escrow', 'qualify', 'rental', 'advanced', 'scenarios', 'summary'] as const;
/** nested input groups that take the defaults for any key a saved scenario does not have */
const GROUPS = ['reno', 'draws', 'closing', 'escrow', 'bps', 'assets', 'rental', 'projection'] as const;

export interface AuditEntry { id: string; timestamp: string; user: string; action: string; field?: string; from?: string; to?: string; }
export interface ScenarioVersion { version: number; timestamp: string; user: string; label: string; inputs: any; }
export interface SavedScenario { inputs: any; borrowerId: string | null; propertyId: string | null; createdAt: string; updatedAt: string; audit: AuditEntry[]; versions: ScenarioVersion[]; }
export interface SuiteState {
  schemaVersion: number;
  activeScenarioId: string;
  scenarios: Record<string, SavedScenario>;
  borrowers: any[];
  properties: any[];
  compareIds: string[];
  mode: string;
  theme: string;
  user: string;
  lookupMessage: string;
  sections: { collapsed: Record<string, boolean>; pinned: Record<string, boolean> };
}
export interface MigrationResult { state: SuiteState; migratedFrom: number | null; notes: string[]; }

let counter = 0;
/** an ID that stays unique even when several are made in the same millisecond */
export function newId(prefix: string): string {
  counter = (counter + 1) % 1296;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 6)}`;
}
const nowISO = () => new Date().toISOString();
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

export function newSavedScenario(inputs: any, user = 'local'): SavedScenario {
  const t = nowISO();
  return { inputs, borrowerId: null, propertyId: null, createdAt: t, updatedAt: t, audit: [{ id: newId('a'), timestamp: t, user, action: 'Scenario created' }], versions: [] };
}

export function initialState(): SuiteState {
  const id = 'scenario-1', inputs = defaultScenario(today(), id);
  return { schemaVersion: SCHEMA_VERSION, activeScenarioId: id, scenarios: { [id]: newSavedScenario(inputs) }, borrowers: [], properties: [], compareIds: [], mode: 'quote', theme: 'light', user: 'local', lookupMessage: '', sections: { collapsed: {}, pinned: {} } };
}

/** fill the keys a saved scenario is missing from the defaults (the same merge 56.5 made on load) */
export function withDefaults(inputs: any, id: string): any {
  const d = defaultScenario(today(), id), out: any = { ...d, ...inputs, id };
  for (const g of GROUPS) out[g] = { ...d[g], ...(isObj(inputs[g]) ? inputs[g] : {}) };
  out.closing.overrides = { ...d.closing.overrides, ...(isObj(inputs.closing) && isObj(inputs.closing.overrides) ? inputs.closing.overrides : {}) };
  out.borrowers = Array.isArray(inputs.borrowers) && inputs.borrowers.length ? inputs.borrowers : d.borrowers;
  return out;
}

/** bring any saved state (56.x or v57) to the current shape; nothing that can be kept is thrown away */
export function migrateState(raw: unknown): MigrationResult {
  const notes: string[] = [];
  if (!isObj(raw) || !isObj(raw.scenarios) || !Object.keys(raw.scenarios).length) return { state: initialState(), migratedFrom: null, notes: isObj(raw) ? ['The saved state had no scenarios - started a new one.'] : [] };
  const from = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 56;
  if (from > SCHEMA_VERSION) notes.push(`Saved by a newer version (${from}); loaded as far as this version understands it.`);
  const scenarios: Record<string, SavedScenario> = {};
  for (const [key, sc] of Object.entries<any>(raw.scenarios)) {
    if (!isObj(sc) || !isObj(sc.inputs)) { notes.push(`Scenario "${key}" had no inputs and was skipped.`); continue; }
    if (sc.inputs.id && sc.inputs.id !== key) notes.push(`Scenario "${key}" carried the id "${sc.inputs.id}"; it now uses "${key}".`);
    let inputs = withDefaults(sc.inputs, key);
    let versions: ScenarioVersion[] = Array.isArray(sc.versions) ? sc.versions.filter((v: any) => isObj(v) && isObj(v.inputs)) : [];
    if (from < 57) { inputs = migrate56Inputs(inputs); versions = versions.map(v => ({ ...v, inputs: migrate56Inputs(v.inputs) })); }
    const t = typeof sc.createdAt === 'string' ? sc.createdAt : nowISO();
    scenarios[key] = { inputs, borrowerId: sc.borrowerId ?? null, propertyId: sc.propertyId ?? null, createdAt: t, updatedAt: typeof sc.updatedAt === 'string' ? sc.updatedAt : t, audit: Array.isArray(sc.audit) ? sc.audit.slice(0, 200) : [], versions };
  }
  const keys = Object.keys(scenarios);
  if (!keys.length) return { state: initialState(), migratedFrom: from, notes: notes.concat('No usable scenarios were saved - started a new one.') };
  let active = String(raw.activeScenarioId || '');
  if (!scenarios[active]) { notes.push(`The open scenario "${active || '(none)'}" was missing; opened "${keys[0]}" instead (56.5 discarded every saved scenario here).`); active = keys[0]; }
  const base = initialState(), sec = isObj(raw.sections) ? raw.sections : {};
  const state: SuiteState = {
    schemaVersion: SCHEMA_VERSION, activeScenarioId: active, scenarios,
    borrowers: Array.isArray(raw.borrowers) ? raw.borrowers : [], properties: Array.isArray(raw.properties) ? raw.properties : [],
    compareIds: Array.isArray(raw.compareIds) ? raw.compareIds.filter((id: string, i: number, a: string[]) => scenarios[id] && a.indexOf(id) === i) : [],
    mode: (MODES as readonly string[]).includes(String(raw.mode)) ? String(raw.mode) : 'quote',
    theme: raw.theme === 'dark' ? 'dark' : base.theme, user: typeof raw.user === 'string' && raw.user ? raw.user : base.user, lookupMessage: '',
    sections: { collapsed: { ...(isObj(sec.collapsed) ? sec.collapsed : {}) }, pinned: { ...(isObj(sec.pinned) ? sec.pinned : {}) } },
  };
  if (from < 57) notes.push(`Migrated ${keys.length} scenario(s) from 56.x: blank overrides and assets that 56.x stored as 0 now mean "calculate" / "not entered".`);
  return { state, migratedFrom: from < SCHEMA_VERSION ? from : null, notes };
}

/** what is wrong with a state, for import checks and tests (empty when it is sound) */
export function stateProblems(s: any): string[] {
  const p: string[] = [];
  if (!isObj(s)) return ['Not a saved state.'];
  if (s.schemaVersion !== SCHEMA_VERSION) p.push(`schemaVersion is ${s.schemaVersion}, expected ${SCHEMA_VERSION}.`);
  if (!isObj(s.scenarios) || !Object.keys(s.scenarios).length) p.push('No scenarios.');
  else {
    if (!s.scenarios[s.activeScenarioId]) p.push('The open scenario is missing.');
    for (const [k, sc] of Object.entries<any>(s.scenarios)) if (!isObj(sc?.inputs) || sc.inputs.id !== k) p.push(`Scenario "${k}" has no inputs or a mismatched id.`);
  }
  return p;
}

type Storage = { getItem(k: string): string | null; setItem(k: string, v: string): void } | null;
const storage = (): Storage => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };

/** read and migrate the saved state; the 56.x original is kept once under BACKUP_KEY before it is replaced */
export function loadState(store: Storage = storage(), key: string = STORAGE_KEY): MigrationResult {
  let text: string | null = null;
  try { text = store ? store.getItem(key) : null; } catch { /* storage blocked */ }
  if (!text) return { state: initialState(), migratedFrom: null, notes: [] };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { state: initialState(), migratedFrom: null, notes: ['The saved state could not be read (damaged JSON); it was left in place and a new scenario started.'] }; }
  const res = migrateState(raw);
  const backup = key + '.before-v57';
  if (res.migratedFrom !== null && store) { try { if (!store.getItem(backup)) store.setItem(backup, text); } catch { /* full storage: the migration still proceeds in memory */ } }
  return res;
}

/** save the state; returns why it could not be saved (storage full or blocked), or null when it was */
export function saveState(state: SuiteState, key: string = STORAGE_KEY, store: Storage = storage()): string | null {
  if (!store) return 'This browser is not keeping saved data (private window or storage blocked) - the quote is kept only until the page closes.';
  try { store.setItem(key, JSON.stringify(state)); return null; } catch (e) { return 'Could not save: ' + ((e as Error).message || 'storage is full') + '. Export the scenario to keep it.'; }
}

/** a scenario as a file to share, and back (with the reason when a file cannot be used) */
export function exportScenario(sc: SavedScenario): string { return JSON.stringify({ kind: 'mortgage-suite-scenario', schemaVersion: SCHEMA_VERSION, scenario: sc }, null, 2); }
export function importScenario(text: string): { scenario: SavedScenario | null; error: string | null; notes: string[] } {
  let raw: any;
  try { raw = JSON.parse(text); } catch (e) { return { scenario: null, error: 'This file is not valid JSON: ' + (e as Error).message, notes: [] }; }
  const sc = raw && raw.kind === 'mortgage-suite-scenario' ? raw.scenario : raw && raw.inputs ? raw : null;
  if (!isObj(sc) || !isObj(sc.inputs)) return { scenario: null, error: 'This file does not contain a scenario (no "inputs" were found).', notes: [] };
  const id = newId('scenario');
  const res = migrateState({ schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 56, activeScenarioId: id, scenarios: { [id]: clone(sc) } });
  return { scenario: res.state.scenarios[id] || null, error: null, notes: res.notes.filter(n => !/carried the id/.test(n)) };
}
