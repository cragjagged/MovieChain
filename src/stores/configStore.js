import { create } from "zustand";
import { persist } from "zustand/middleware";
import { zustandStorage } from "./storage.js";

export const useConfigStore = create(
  persist(
    (set) => ({
      tmdbKey:      "",
      embyConfig:   null,   // { serverUrl, apiKey, userId, userName } | null
      syncInterval: 60,     // minutes between scheduled Emby syncs
      allowWatched: false,  // history-mode toggle
      reportsLayout: { order: ["link-types", "other-links", "top-people"], collapsed: {} },
      chainSortOrder: "asc",
      timeFormat: "24h",    // "24h" | "12h"

      setTmdbKey:       (k)  => set({ tmdbKey: k }),
      setEmbyConfig:    (cfg) => set({ embyConfig: cfg }),
      setSyncInterval:  (n)  => set({ syncInterval: n }),
      setAllowWatched:  (v)  => set({ allowWatched: v }),
      setReportsLayout: (layout) => set({ reportsLayout: layout }),
      setChainSortOrder: (v) => set({ chainSortOrder: v }),
      setTimeFormat:    (v)  => set({ timeFormat: v }),

      // Internal hydration flag — excluded from persistence via partialize
      _hasHydrated: false,
      _setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: "mc:config",
      storage: zustandStorage,
      skipHydration: true,
      partialize: ({ tmdbKey, embyConfig, syncInterval, allowWatched, reportsLayout, chainSortOrder, timeFormat }) =>
        ({ tmdbKey, embyConfig, syncInterval, allowWatched, reportsLayout, chainSortOrder, timeFormat }),
      onRehydrateStorage: () => (state) => { state?._setHydrated(); },
    },
  ),
);
