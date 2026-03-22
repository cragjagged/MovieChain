import { createJSONStorage } from "zustand/middleware";

// Key-value store backed by the server's SQLite database via /api/storage/*.
// Returns raw string values (same interface as the old window.storage shim).

async function apiFetch(path, opts) {
  const r = await fetch(path, opts);
  if (!r.ok) throw new Error(`storage ${r.status}`);
  return r.json();
}

export const store = {
  async get(key) {
    try {
      const { value } = await apiFetch(`/api/storage/${encodeURIComponent(key)}`);
      return value;           // string | null
    } catch { return null; }
  },
  async set(key, value) {
    try {
      if (value === null) {
        await apiFetch(`/api/storage/${encodeURIComponent(key)}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/api/storage/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: String(value) }),
        });
      }
    } catch { /* fire-and-forget */ }
  },
};

export const zustandStorage = createJSONStorage(() => ({
  getItem:    (k)    => store.get(k),
  setItem:    (k, v) => store.set(k, v),
  removeItem: (k)    => store.set(k, null),
}));
