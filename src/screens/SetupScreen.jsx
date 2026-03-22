import { useState, Fragment } from "react";
import { T } from "../theme.js";
import { useConfigStore } from "../stores/configStore.js";
import { useEmbyStore } from "../stores/embyStore.js";
import { tmdb } from "../api/tmdb.js";
import { embyFetch } from "../api/emby.js";
import { ErrBanner } from "../components/banners.jsx";
import { SectionLabel } from "../components/primitives.jsx";

// Three-step wizard: "tmdb" → "emby" → "emby-user".
// Step 1 validates the TMDB key; step 2 tests the Emby connection and lists
// users; step 3 selects the user. Emby setup is optional (skip button).
export function SetupScreen({ go }) {
  const { tmdbKey, setTmdbKey, setEmbyConfig } = useConfigStore();
  const syncLibrary = useEmbyStore(s => s.syncLibrary);

  const [tmdbInput,  setTmdbInput]  = useState(tmdbKey || "");
  const [embyUrl,    setEmbyUrl]    = useState("");
  const [embyKey,    setEmbyKey]    = useState("");
  const [embyUsers,  setEmbyUsers]  = useState([]);
  const [embyUserId, setEmbyUserId] = useState("");
  const [setupStep,  setSetupStep]  = useState("tmdb");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const handleRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.type !== "full-backup" || !data.storage) throw new Error("Not a full backup file. Use a file exported via Settings → Export full backup.");
        setLoading(true);
        for (const [key, value] of Object.entries(data.storage)) {
          if (!key.startsWith('mc:') || !value) continue;
          await fetch(`/api/storage/${encodeURIComponent(key)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
          });
        }
        window.location.reload();
      } catch (err) {
        setError("Restore failed: " + (err?.message || err));
        setLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSaveTmdb = async (skipVerify = false) => {
    const key = tmdbInput.trim();
    if (!key) return;
    if (skipVerify) { setTmdbKey(key); setSetupStep("emby"); return; }
    setLoading(true); setError("");
    try {
      await tmdb(key, "/configuration");
      setTmdbKey(key); setSetupStep("emby");
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes("401")) setError("TMDB rejected the key (401) — make sure you copied it in full with no extra spaces.");
      else setError('Network error: ' + msg + '. Try "Save without verifying" to skip the check.');
    } finally { setLoading(false); }
  };

  const handleTestEmby = async () => {
    if (!embyUrl.trim() || !embyKey.trim()) return;
    setLoading(true); setError("");
    try {
      const data = await embyFetch({ serverUrl: embyUrl.trim(), apiKey: embyKey.trim(), userId: "" }, "/Users");
      setEmbyUsers(Array.isArray(data) ? data : []); setSetupStep("emby-user");
    } catch (e) { setError("Couldn't connect to Emby: " + (e?.message || e)); }
    finally { setLoading(false); }
  };

  const handleSaveEmby = async () => {
    if (!embyUserId) return;
    const user = embyUsers.find(u => u.Id === embyUserId);
    const cfg  = { serverUrl: embyUrl.trim(), apiKey: embyKey.trim(), userId: embyUserId, userName: user?.Name || "" };
    setEmbyConfig(cfg);
    syncLibrary(cfg, false);
    go("chain");
  };

  const steps = ["tmdb", "emby", "emby-user"];

  return (
    <div className="mc-root" style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px", color: T.text1, letterSpacing: "-0.02em" }}>Movie Chain</h1>
        <p style={{ fontSize: 13, color: T.text2, margin: 0, lineHeight: 1.6 }}>Connect films through shared credits.</p>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 28, alignItems: "center" }}>
        {steps.map((s, i) => (
          <Fragment key={s}>
            {i > 0 && <div style={{ flex: 1, height: 1, background: T.border }} />}
            <div style={{
              width: 26, height: 26, borderRadius: "50%", fontSize: 12, fontWeight: 500, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: setupStep === s ? T.accent : T.bg1,
              color: setupStep === s ? "#fff" : T.text2,
              border: `1px solid ${T.border}`,
            }}>{i + 1}</div>
          </Fragment>
        ))}
      </div>
      <ErrBanner msg={error} onDismiss={() => setError("")} />

      {setupStep === "tmdb" && (
        <div>
          <SectionLabel>TMDB API key</SectionLabel>
          <p style={{ fontSize: 12, color: T.text2, margin: "0 0 6px", lineHeight: 1.5 }}>
            Required for credits and film data. <a href="https://www.themoviedb.org/settings/api" style={{ color: T.accent, textDecoration: "none" }}>Get a free key →</a>
          </p>
          <p style={{ fontSize: 12, color: T.text2, margin: "0 0 10px", lineHeight: 1.5 }}>
            Paste either the <strong style={{ fontWeight: 500, color: T.text1 }}>API Key (v3)</strong> or the longer <strong style={{ fontWeight: 500, color: T.text1 }}>API Read Access Token</strong> — both work.
          </p>
          <input type="password" value={tmdbInput} autoFocus
            onChange={e => setTmdbInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSaveTmdb()}
            placeholder="Paste API key or Read Access Token…"
            style={{ width: "100%", boxSizing: "border-box", marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => handleSaveTmdb(false)} disabled={loading || !tmdbInput.trim()} className="primary">
              {loading ? "Checking…" : "Verify & save →"}
            </button>
            <button onClick={() => handleSaveTmdb(true)} disabled={loading || !tmdbInput.trim()} className="ghost" style={{ fontSize: 12 }}>
              Save without verifying
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 16px" }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 11, color: T.text3, whiteSpace: "nowrap" }}>or restore a previous setup</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>
          <label style={{
            fontSize: 12, cursor: loading ? "default" : "pointer", padding: "7px 14px",
            border: `1px solid ${T.borderHov}`, borderRadius: 6,
            background: T.bg3, color: loading ? T.text3 : T.text1, fontFamily: "inherit",
            fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {loading ? "Restoring…" : "Restore from backup"}
            <input type="file" accept=".json" onChange={handleRestore} disabled={loading} style={{ display: "none" }} />
          </label>
        </div>
      )}

      {setupStep === "emby" && (
        <div>
          <SectionLabel>Emby server <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: 10 }}>(optional)</span></SectionLabel>
          <p style={{ fontSize: 12, color: T.text2, margin: "0 0 10px", lineHeight: 1.5 }}>
            Syncs your library and watched state. Create an API key in Emby → Dashboard → API Keys.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            <input value={embyUrl} onChange={e => setEmbyUrl(e.target.value)} autoFocus placeholder="Server URL, e.g. http://192.168.1.10:8096" />
            <input type="password" value={embyKey} onChange={e => setEmbyKey(e.target.value)} onKeyDown={e => e.key === "Enter" && handleTestEmby()} placeholder="API key" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleTestEmby} disabled={loading || !embyUrl.trim() || !embyKey.trim()} className="primary">
              {loading ? "Connecting…" : "Connect →"}
            </button>
            <button onClick={() => go("chain")} className="ghost">Skip for now</button>
          </div>
        </div>
      )}

      {setupStep === "emby-user" && (
        <div>
          <SectionLabel>Which Emby user?</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {embyUsers.map(u => (
              <button key={u.Id} onClick={() => setEmbyUserId(u.Id)} className={embyUserId === u.Id ? "primary" : ""} style={{ textAlign: "left", justifyContent: "flex-start", width: "100%" }}>{u.Name}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSaveEmby} disabled={!embyUserId} className="primary">Save & start →</button>
            <button onClick={() => setSetupStep("emby")} className="ghost">← Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
