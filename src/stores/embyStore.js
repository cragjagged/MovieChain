import { create } from "zustand";
import { persist } from "zustand/middleware";
import { zustandStorage } from "./storage.js";
import { fetchEmbyLibrary } from "../api/emby.js";

export const useEmbyStore = create(
  persist(
    (set) => ({
      // Emby movie library stored as a plain object for JSON-safe persistence.
      // Shape: Record<tmdbId(string), { embyId, played, lastPlayedDate(ISO|null), title }>
      // Use embyEntryFor/embyStatusFor/embyImgFor helpers from api/emby.js for lookups.
      library:    null,     // null until first sync completes
      lastSynced: null,     // ISO date string of last successful sync
      status:     "disconnected", // "disconnected" | "syncing" | "synced" | "error"

      // Converts a Map<tmdbId, EmbyEntry> (returned by fetchEmbyLibrary) to the
      // plain-object form stored here, serialising Date → ISO string.
      setLibrary: (map) => {
        const library = {};
        for (const [id, e] of map) {
          library[id] = {
            embyId:         e.embyId,
            played:         e.played,
            lastPlayedDate: e.lastPlayedDate ? e.lastPlayedDate.toISOString() : null,
            title:          e.title,
          };
        }
        set({ library, lastSynced: new Date().toISOString(), status: "synced" });
      },

      setStatus:    (s) => set({ status: s }),
      clearLibrary: ()  => set({ library: null, lastSynced: null, status: "disconnected" }),

      // Fetch the full Emby library and update the store.
      // background=true suppresses the "syncing" status flash so the UI
      // isn't interrupted while already showing data from the cached library.
      syncLibrary: async (cfg, background = false) => {
        if (!cfg) return;
        if (!background) set({ status: "syncing" });
        try {
          const map = await fetchEmbyLibrary(cfg);
          const library = {};
          for (const [id, e] of map) {
            library[id] = {
              embyId:         e.embyId,
              played:         e.played,
              lastPlayedDate: e.lastPlayedDate ? e.lastPlayedDate.toISOString() : null,
              title:          e.title,
            };
          }
          set({ library, lastSynced: new Date().toISOString(), status: "synced" });
        } catch (e) {
          console.error("Emby sync:", e);
          set({ status: "error" });
        }
      },

      // Internal hydration flag — excluded from persistence via partialize
      _hasHydrated: false,
      _setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: "mc:emby",
      storage: zustandStorage,
      skipHydration: true,
      partialize: ({ library, lastSynced }) => ({ library, lastSynced }),
      onRehydrateStorage: () => (state) => { state?._setHydrated(); },
    },
  ),
);
