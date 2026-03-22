import React from 'react'
import ReactDOM from 'react-dom/client'
import { useConfigStore } from './stores/configStore.js'
import { useChainStore }  from './stores/chainStore.js'
import { useEmbyStore }   from './stores/embyStore.js'
import MovieChain from './movie-chain.jsx'

async function boot() {
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
