import { create } from "zustand";
import { persist } from "zustand/middleware";
import { zustandStorage } from "./storage.js";

export const useChainStore = create(
  persist(
    (set) => ({
      entries: [],  // ChainEntry[]

      // Append a new entry. link is null only for the first movie in the chain.
      add: (movie, link) => set(s => ({ entries: [...s.entries, { movie, link }] })),

      // Remove the last entry (undo last pick).
      undo: () => set(s => ({ entries: s.entries.slice(0, -1) })),

      // Empty the chain.
      clear: () => set({ entries: [] }),

      // Replace the entire chain (used for backup restore and first-movie setup).
      importChain: (entries) => set({ entries }),

      // Incremented by useCollectionPrefetch after each new mc:col:{id} is written.
      // SequelsScreen subscribes so it re-reads storage as background fetches complete.
      // Not persisted — resets to 0 on every boot.
      sequelsVersion: 0,
      bumpSequelsVersion: () => set(s => ({ sequelsVersion: s.sequelsVersion + 1 })),

      // Internal hydration flag — excluded from persistence via partialize
      _hasHydrated: false,
      _setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: "mc:chain",
      storage: zustandStorage,
      skipHydration: true,
      partialize: ({ entries }) => ({ entries }),
      onRehydrateStorage: () => (state) => { state?._setHydrated(); },
    },
  ),
);

// ── Pure selectors ──────────────────────────────────────────────────────────
// These are plain functions (not hooks) for use in components that already
// have the values from useChainStore / useEmbyStore.

// Index of the "Up Next" film: first entry Emby hasn't marked as played.
// Falls back to the last entry when Emby is not connected or all are played.
// library is Record<tmdbId, EmbyEntry> | null
export function selectCurrentIdx(entries, library) {
  if (!library || entries.length === 0) return entries.length - 1;
  const idx = entries.findIndex(e => !library[String(e.movie.id)]?.played);
  return idx === -1 ? entries.length - 1 : idx;
}

// The link type used to arrive at the current movie (blocks the next pick).
export function selectLastType(entries, currentIdx) {
  return entries[currentIdx]?.link?.type ?? null;
}

// Set of TMDB IDs already in the chain (used to exclude from candidate list).
export function selectChainIds(entries) {
  return new Set(entries.map(e => String(e.movie.id)));
}

// Set of TMDB IDs considered "watched" for the purpose of the no-rewatch rule.
// Without Emby: all entries before the last are treated as used.
// With Emby: uses actual played state from the library.
export function selectWatchedIds(entries, library) {
  if (!library) return new Set(entries.slice(0, -1).map(e => String(e.movie.id)));
  return new Set(
    Object.entries(library).filter(([, v]) => v.played).map(([k]) => k)
  );
}
