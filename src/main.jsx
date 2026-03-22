import React from 'react'
import ReactDOM from 'react-dom/client'
import { useConfigStore } from './stores/configStore.js'
import { useChainStore }  from './stores/chainStore.js'
import { useEmbyStore }   from './stores/embyStore.js'
import { store }          from './stores/storage.js'
import { STATE_VERSION }  from './constants.js'
import { runMigrations }  from './migrations.js'
import MovieChain from './movie-chain.jsx'

function showError(title, body) {
  document.getElementById('root').innerHTML = `
    <div style="font-family:system-ui,sans-serif;padding:40px;max-width:480px;margin:0 auto;color:#e2e8f0;background:#0f1117;min-height:100vh">
      <h2 style="color:#f87171;margin:0 0 12px">${title}</h2>
      <p style="margin:0;color:#94a3b8;line-height:1.6">${body}</p>
    </div>`;
}

async function boot() {
  const storedVersion = await store.get('mc:stateVersion');

  if (storedVersion === null) {
    // First run or pre-versioning install — stamp current version and proceed
    await store.set('mc:stateVersion', String(STATE_VERSION));
  } else {
    const stored = Number(storedVersion);

    if (stored < STATE_VERSION) {
      // Run migrations to bring data up to current version
      try {
        await runMigrations(stored);
      } catch (e) {
        showError(
          'Migration failed',
          `Could not migrate your database from version <strong style="color:#e2e8f0">${stored}</strong> to version <strong style="color:#e2e8f0">${STATE_VERSION}</strong>: ${e.message}. Restore a compatible backup to continue.`
        );
        return;
      }
    }
  }

  await Promise.all([
    useConfigStore.persist.rehydrate(),
    useChainStore.persist.rehydrate(),
    useEmbyStore.persist.rehydrate(),
  ]);

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MovieChain />
    </React.StrictMode>
  );
}

boot();
