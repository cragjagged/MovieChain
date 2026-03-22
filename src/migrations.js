// Data migrations — keyed by the version they migrate TO.
//
// Each function receives the raw `store` adapter and must read/write
// data directly via store.get / store.set. Do NOT use Zustand stores
// here — they haven't been rehydrated yet when migrations run.
//
// To add a migration:
//   1. Increment STATE_VERSION in constants.js
//   2. Add an entry here: async (store) => { ... }
//   3. Note the change in CLAUDE.md under "State version"
//
// Example:
//   3: async (store) => {
//     const raw = await store.get('mc:chain');
//     if (!raw) return;
//     const { state } = JSON.parse(raw);
//     const migrated = state.entries.map(e => ({ ...e, newField: null }));
//     await store.set('mc:chain', JSON.stringify({ state: { ...state, entries: migrated } }));
//   },

import { store } from './stores/storage.js';

export const migrations = {
  // No migrations yet — first versioned release is v1.
};

export async function runMigrations(fromVersion) {
  const { STATE_VERSION } = await import('./constants.js');
  for (let v = fromVersion + 1; v <= STATE_VERSION; v++) {
    if (migrations[v]) await migrations[v](store);
    await store.set('mc:stateVersion', String(v));
  }
}
