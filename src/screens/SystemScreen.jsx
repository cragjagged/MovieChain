import { useState, useEffect } from "react";
import { T } from "../theme.js";
import { useConfigStore } from "../stores/configStore.js";
import { Badge } from "../components/primitives.jsx";
import { ALL_TYPES } from "../constants.js";
import { useUpdateStatus } from "../hooks/useUpdateStatus.js";

const IS_DEV = import.meta.env.DEV;

export function SystemScreen() {
  const embyConfig = useConfigStore(s => s.embyConfig);
  const { state, triggerCheck, triggerUpdate, lastChecked } = useUpdateStatus();

  const handleChannelChange = async (e) => {
    const next = e.target.value;
    const prev = cfg.updateChannel;
    if (next === prev) return;

    if (next === 'stable' && prev === 'develop') {
      window.alert(
        'Switching from develop to stable is not supported — your data may be incompatible with the stable release. Staying on develop.'
      );
      return; // controlled select reverts automatically
    }

    if (next === 'develop' && prev === 'stable') {
      const ok = window.confirm(
        'Switch to the develop channel? This cannot be undone — once your data has been updated by a develop build it may be incompatible with stable releases.'
      );
      if (!ok) return;
    }

    await saveCfg({ updateChannel: next });
    triggerCheck();
  };

  const [cfg, setCfg]         = useState(null);
  const [serverVersion, setServerVersion] = useState(null);

  useEffect(() => {
    if (IS_DEV) return;
    fetch('/api/update/config').then(r => r.json()).then(setCfg).catch(() => {});
    fetch('/api/version').then(r => r.json()).then(setServerVersion).catch(() => {});
  }, []);

  const saveCfg = async (patch) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    await fetch('/api/update/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => {});
  };

  const isUpdating = state && !['idle', 'available', 'error'].includes(state.phase);

  return (
    <div style={{ padding: "1.25rem", maxWidth: 540 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px", color: T.text1, letterSpacing: "-0.01em" }}>System</h2>

      {/* Version */}
      <div style={{ marginBottom: 12, padding: "12px 16px", background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8 }}>
        <div style={{ color: T.text2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10, marginBottom: 6 }}>Version</div>
        <div style={{ fontSize: 13, color: T.text1 }}>
          Movie Chain&nbsp;
          <span style={{ color: T.accent, fontWeight: 600 }}>
            v{serverVersion?.version ?? __APP_VERSION__}
          </span>
        </div>
        {(serverVersion?.sha ?? __GIT_SHA__) !== 'unknown' && (
          <div style={{ fontSize: 11, color: T.text3, marginTop: 2, fontFamily: "monospace" }}>
            {serverVersion?.sha ?? __GIT_SHA__}
          </div>
        )}
      </div>

      {/* Updates */}
      <div style={{ marginBottom: 12, padding: "14px 16px", background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8 }}>
        <div style={{ color: T.text2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10, marginBottom: 10 }}>Updates</div>

        {IS_DEV ? (
          <p style={{ fontSize: 12, color: T.text3, margin: 0 }}>
            Update management is only available when running the production server (<code>npm start</code>).
          </p>
        ) : !cfg ? (
          <p style={{ fontSize: 12, color: T.text3, margin: 0 }}>Connecting to server…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Channel */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 12, color: T.text2, whiteSpace: "nowrap" }}>Channel</label>
              <select
                value={cfg.updateChannel}
                onChange={handleChannelChange}
                style={{ fontSize: 12, padding: "4px 8px" }}
              >
                <option value="stable">Stable (releases)</option>
                <option value="develop">Development (develop branch)</option>
              </select>
            </div>

            {/* Interval */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 12, color: T.text2, whiteSpace: "nowrap" }}>Check every</label>
              <select
                value={cfg.checkIntervalHours}
                onChange={e => saveCfg({ checkIntervalHours: Number(e.target.value) })}
                style={{ fontSize: 12, padding: "4px 8px" }}
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>

            {/* Actions / status */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
              {state?.phase === 'available' ? (
                <>
                  <span style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>
                    {state.label} available
                  </span>
                  <button
                    onClick={triggerUpdate}
                    disabled={isUpdating}
                    className="primary"
                    style={{ fontSize: 12 }}
                  >
                    Update now
                  </button>
                </>
              ) : isUpdating ? (
                <span style={{ fontSize: 12, color: T.text2 }}>Updating…</span>
              ) : (
                <>
                  <button
                    onClick={triggerCheck}
                    className="ghost"
                    style={{ fontSize: 12 }}
                  >
                    Check now
                  </button>
                  {lastChecked && !lastChecked.available && (
                    <span style={{ fontSize: 12, color: T.success }}>
                      Up to date · checked {lastChecked.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </>
              )}
              {state?.phase === 'error' && (
                <span style={{ fontSize: 12, color: T.danger }}>Error: {state.error}</span>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Chain Rules */}
      <div style={{ marginBottom: 12, padding: "10px 14px", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, color: T.text2, lineHeight: 1.7 }}>
        <div style={{ color: T.text2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10, marginBottom: 4 }}>Chain Rules</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Rule>Consecutive movies must share at least one credited person.</Rule>
          <Rule>The same credit type cannot be used on back-to-back links.</Rule>
          <Rule noEmby={!embyConfig}>No rewatches — films already marked watched in Emby are blocked{embyConfig ? " (from Emby)" : ""}.</Rule>
          <Rule>Series films must be added in release order — earlier unwatched entries block later ones.</Rule>
          <Rule>Sequels are free — once the first film of a series is on the chain and marked watched, its sequels may be watched outside the chain without using a link.</Rule>
        </div>
      </div>

      {/* Credit Types */}
      <div style={{ padding: "10px 14px", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, color: T.text2, lineHeight: 1.7 }}>
        <div style={{ color: T.text2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10, marginBottom: 4 }}>Credit Types</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ALL_TYPES.map(t => (
            <Badge key={t} type={t} large />
          ))}
          <Badge type="Other" large />
        </div>
        <div style={{ marginTop: 8, color: T.text2, fontSize: 13 }}>
          Emby collapses all cast to Actor — TMDB data distinguishes Actor vs Actress where available.<br />
          Other covers any free-form credit entered via the custom link form.
        </div>
      </div>
    </div>
  );
}

function Rule({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ color: T.accent, fontSize: 10, marginTop: 1, flexShrink: 0 }}>▸</span>
      <span>{children}</span>
    </div>
  );
}
