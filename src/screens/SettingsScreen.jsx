import { T } from "../theme.js";
import { STATE_VERSION } from "../constants.js";
import { useConfigStore } from "../stores/configStore.js";
import { useChainStore } from "../stores/chainStore.js";
import { useEmbyStore } from "../stores/embyStore.js";
import { ErrBanner } from "../components/banners.jsx";
import { SectionLabel, StatusPill } from "../components/primitives.jsx";
import { useState } from "react";

export function SettingsScreen({ go }) {
  const { tmdbKey, embyConfig, setEmbyConfig, syncInterval, setSyncInterval } = useConfigStore();
  const { entries, clear: clearChain, importChain } = useChainStore();
  const { library, status, lastSynced, syncLibrary, clearLibrary } = useEmbyStore();
  const [error, setError] = useState("");

  const handleDisconnectEmby = () => {
    setEmbyConfig(null);
    clearLibrary();
  };

  const handleExportChain = () => {
    const payload = JSON.stringify({ version: 1, chain: entries, exportedAt: new Date().toISOString() }, null, 2);
    download(payload, `movie-chain-${today()}.json`);
  };

  const handleExportFull = async () => {
    try {
      const r = await fetch('/api/storage');
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const all = await r.json();
      // Exclude large regenerable TMDB prefetch cache
      const storage = Object.fromEntries(
        Object.entries(all).filter(([k]) => !k.startsWith('mc:tmdblinks:'))
      );
      const payload = JSON.stringify({ version: 1, stateVersion: STATE_VERSION, type: "full-backup", exportedAt: new Date().toISOString(), storage }, null, 2);
      download(payload, `movie-chain-backup-${today()}.json`);
    } catch (e) { setError("Export failed: " + (e?.message || e)); }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);

        if (data.type === "full-backup" && data.storage) {
          const backupVersion = data.stateVersion ?? 1;
          if (backupVersion > STATE_VERSION) {
            throw new Error(`Backup is state version ${backupVersion} but this app only supports up to version ${STATE_VERSION} — update the app before restoring this backup.`);
          }
          const migrationNote = backupVersion < STATE_VERSION
            ? ` The backup will be automatically migrated from state version ${backupVersion} to ${STATE_VERSION}.`
            : '';
          if (!window.confirm(`Restore full backup? This will replace your current settings, chain, and Emby library, then reload the app.${migrationNote}`)) return;
          await writeStorage(data.storage);
          window.location.reload();
          return;
        }

        // Chain-only import
        const imported = data.chain ?? data;
        if (!Array.isArray(imported)) throw new Error("Invalid format — expected a chain array or a full backup file.");
        if (!window.confirm(`Replace your current chain (${entries.length} movies) with the imported chain (${imported.length} movies)?`)) return;
        importChain(imported);
        go("chain");
      } catch (err) { setError("Import failed: " + (err?.message || err)); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const lastSyncedDate = lastSynced ? new Date(lastSynced) : null;

  return (
    <div className="mc-root" style={{ padding: "1.25rem", maxWidth: 480 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px", color: T.text1, letterSpacing: "-0.01em" }}>Settings</h2>

      {/* TMDB */}
      <div style={{ padding: "14px 16px", marginBottom: 12, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <SectionLabel>TMDB</SectionLabel>
          <StatusPill variant="success">Connected</StatusPill>
        </div>
        <p style={{ fontSize: 12, color: T.text2, margin: "0 0 10px" }}>Key ending …{tmdbKey.slice(-6)}</p>
        <button onClick={() => go("setup")} className="ghost" style={{ fontSize: 12 }}>Change key</button>
      </div>

      {/* Emby */}
      <div style={{ padding: "14px 16px", marginBottom: 12, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <SectionLabel>Emby</SectionLabel>
          <StatusPill variant={embyConfig ? "success" : "neutral"}>{embyConfig ? "Connected" : "Not connected"}</StatusPill>
        </div>
        {embyConfig ? (
          <>
            <p style={{ fontSize: 12, color: T.text2, margin: "0 0 2px" }}>{embyConfig.serverUrl}</p>
            <p style={{ fontSize: 12, color: T.text2, margin: "0 0 10px" }}>
              User: <strong>{embyConfig.userName}</strong>{library ? ` · ${Object.keys(library).length} movies` : ""}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: T.text2, whiteSpace: "nowrap" }}>Sync every</label>
              <select
                value={syncInterval}
                onChange={async e => { const v = Number(e.target.value); setSyncInterval(v); }}
                style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.borderHov}`, background: T.bg2, color: T.text1, cursor: "pointer" }}
              >
                {[15, 30, 60, 120, 360, 720, 1440].map(m => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : m === 60 ? "1 hour" : m < 1440 ? `${m / 60} hours` : "24 hours"}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 12, color: T.text2 }}>
                {lastSyncedDate ? `· last synced ${lastSyncedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "· not yet synced"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => syncLibrary(embyConfig, false)} disabled={status === "syncing"} className="ghost" style={{ fontSize: 12 }}>
                {status === "syncing" ? "Syncing…" : "Sync now"}
              </button>
              <button onClick={handleDisconnectEmby} className="ghost danger" style={{ fontSize: 12 }}>Disconnect</button>
            </div>
          </>
        ) : (
          <button onClick={() => go("setup")} className="ghost" style={{ fontSize: 12 }}>Connect Emby →</button>
        )}
      </div>

      {/* Chain */}
      <div style={{ padding: "14px 16px", marginBottom: 12, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8 }}>
        <SectionLabel>Chain</SectionLabel>
        <p style={{ fontSize: 12, color: T.text2, margin: "0 0 10px" }}>{entries.length} {entries.length === 1 ? "movie" : "movies"} in current chain.</p>
        <button onClick={() => { if (window.confirm("Clear the entire chain?")) { clearChain(); go("chain"); } }} className="danger" style={{ fontSize: 12 }}>
          Clear chain
        </button>
      </div>

      {/* Backup */}
      <div style={{ padding: "14px 16px", background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8 }}>
        <SectionLabel>Backup</SectionLabel>
        <ErrBanner msg={error} onDismiss={() => setError("")} />

        <p style={{ fontSize: 12, color: T.text2, margin: "0 0 8px", lineHeight: 1.5 }}>
          Export your full setup (API keys, Emby config, chain, library) as a single backup file.
          Use <em>Export chain</em> for a lightweight chain-only snapshot.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <button onClick={handleExportFull} className="primary" style={{ fontSize: 12 }}>
            Export full backup
          </button>
          <button onClick={handleExportChain} disabled={entries.length === 0} className="ghost" style={{ fontSize: 12 }}>
            Export chain
          </button>
        </div>

        <p style={{ fontSize: 12, color: T.text2, margin: "0 0 8px", lineHeight: 1.5 }}>
          Import a backup or chain file. Full backups replace all settings and reload the app; chain-only files replace just the chain.
        </p>
        <FileInputLabel onChange={handleImport}>Import / restore</FileInputLabel>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }

function download(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const a   = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

async function writeStorage(storage) {
  for (const [key, value] of Object.entries(storage)) {
    if (!key.startsWith('mc:') || !value) continue;
    await fetch(`/api/storage/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
  }
}

function FileInputLabel({ onChange, children }) {
  return (
    <label style={{
      fontSize: 12, cursor: "pointer", padding: "7px 14px",
      border: `1px solid rgba(255,255,255,0.14)`, borderRadius: 6,
      background: "rgba(255,255,255,0.05)", color: "inherit", fontFamily: "inherit",
      fontWeight: 500, display: "inline-flex", alignItems: "center",
    }}>
      {children}
      <input type="file" accept=".json" onChange={onChange} style={{ display: "none" }} />
    </label>
  );
}
