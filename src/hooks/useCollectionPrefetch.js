import { useEffect } from "react";
import { useConfigStore } from "../stores/configStore.js";
import { useChainStore } from "../stores/chainStore.js";
import { tmdb } from "../api/tmdb.js";
import { store } from "../stores/storage.js";

const chainStore = useChainStore;

const COL_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const _inFlight = new Set();

const parseJSON = (raw) => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } };

async function prefetchCollection(colId, tmdbKey) {
  const colKey = `mc:col:${colId}`;
  if (_inFlight.has(colKey)) return;
  const cached = parseJSON(await store.get(colKey));
  if (cached && Date.now() - (cached.fetchedAt || 0) < COL_TTL) return;

  _inFlight.add(colKey);
  try {
    const col = await tmdb(tmdbKey, `/collection/${colId}`);
    await store.set(colKey, JSON.stringify({
      id:    col.id,
      name:  col.name,
      parts: [...col.parts].sort((a, b) => (a.release_date || "").localeCompare(b.release_date || "")),
      fetchedAt: Date.now(),
    }));
    // Signal SequelsScreen to re-read — data is now available in storage.
    chainStore.getState().bumpSequelsVersion();
  } catch { /* silent */ }
  finally { _inFlight.delete(colKey); }
}

// Runs in the background whenever chain entries change.
// For each entry with a known collectionId, ensures mc:col:{id} is cached
// so SequelsScreen can render without making any TMDB calls itself.
export function useCollectionPrefetch() {
  const tmdbKey = useConfigStore(s => s.tmdbKey);
  const entries = useChainStore(s => s.entries);

  useEffect(() => {
    if (!tmdbKey || entries.length === 0) return;
    for (const entry of entries) {
      if (entry.movie.collectionId) prefetchCollection(entry.movie.collectionId, tmdbKey);
    }
  }, [entries, tmdbKey]);
}
