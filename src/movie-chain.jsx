import { useState, useEffect, useCallback } from "react";
import { T } from "./theme.js";
import { useConfigStore } from "./stores/configStore.js";
import { useChainStore, selectCurrentIdx } from "./stores/chainStore.js";
import { useEmbyStore } from "./stores/embyStore.js";
import { Badge } from "./components/primitives.jsx";
import { embyImgFor, embyThumbFor } from "./api/emby.js";
import { store } from "./stores/storage.js";
import { useTmdbPrefetch } from "./hooks/useTmdbPrefetch.js";
import { useCollectionPrefetch } from "./hooks/useCollectionPrefetch.js";
import { useUpdateStatus } from "./hooks/useUpdateStatus.js";
import { SetupScreen }       from "./screens/SetupScreen.jsx";
import { ChainScreen }       from "./screens/ChainScreen.jsx";
import { PickMovieScreen }   from "./screens/PickMovieScreen.jsx";
import { SettingsScreen }    from "./screens/SettingsScreen.jsx";
import { SearchFirstScreen } from "./screens/SearchFirstScreen.jsx";
import { ReportsScreen }     from "./screens/ReportsScreen.jsx";
import { SequelsScreen }     from "./screens/SequelsScreen.jsx";
import { SystemScreen }      from "./screens/SystemScreen.jsx";
import { UpdateBanner }      from "./components/UpdateBanner.jsx";

// Renders the landscape thumb for a widget, falling back to a text block when
// the Emby image URL 404s (item exists in library but has no Thumb image stored).
// key={id} on the call site ensures state resets when the movie changes.
// children = row shown above the image (hidden on fallback to avoid title duplication)
// extra    = extra content shown in the text fallback after year
function WidgetThumb({ src, alt, title, year, extra, children }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <>
        {children}
        <img src={src} alt={alt} onError={() => setFailed(true)}
          style={{ display: "block", width: "100%", height: 110, objectFit: "cover" }} />
      </>
    );
  }
  return (
    <div style={{ padding: "10px 10px 12px", background: T.bg2, textAlign: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.text1 }}>{title}</div>
      {year && <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>{year}</div>}
      {extra}
    </div>
  );
}

function Sidebar({ screen, go, entries, undo, currentLink, currentMovie, library, embyConfig, status, lastSynced, syncLibrary, suggestedSequel, onCycleSequel, hasMultipleSequels, updateAvailable }) {
  const isChainActive    = ["chain", "search-first", "pick-movie"].includes(screen);
  const isSettingsActive = screen === "settings";
  const isReportsActive  = screen === "reports";
  const isSequelsActive  = screen === "sequels";
  const isSystemActive   = screen === "system";

  const lastSyncedDate = lastSynced ? new Date(lastSynced) : null;
  const embyBadge = embyConfig ? {
    syncing:      { label: "Emby syncing…",   color: T.warn },
    synced:       { label: lastSyncedDate ? lastSyncedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "synced", color: T.success },
    error:        { label: "Emby error",       color: T.danger },
    disconnected: { label: "Emby off",         color: T.text3 },
  }[status] : null;

  const IconChain = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="20" height="20" rx="2"/>
      <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/>
      <line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/>
    </svg>
  );

  const IconSettings = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );

  const IconReports = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );

  const IconSequels = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  );

  const IconSystem = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <polyline points="3 6 4 7 6 5"/>
      <polyline points="3 12 4 13 6 11"/>
      <polyline points="3 18 4 19 6 17"/>
    </svg>
  );

  const navItem = (label, Icon, active, onClick, dot) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 6,
        background: active ? T.accentDim : "transparent",
        border: `1px solid ${active ? T.borderAcc : "transparent"}`,
        color: active ? T.accent : T.text2,
        fontSize: 13, fontWeight: active ? 600 : 500,
        marginBottom: 2, justifyContent: "flex-start", gap: 9,
        position: "relative",
      }}
    >
      <Icon />{label}
      {dot && <span style={{
        position: "absolute", top: 7, right: 9,
        width: 7, height: 7, borderRadius: "50%",
        background: T.accent, border: `1.5px solid ${T.bg1}`,
      }} />}
    </button>
  );

  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: T.bg1, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column",
      height: "100%",
    }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <svg width="26" height="26" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <rect x="6" y="13" width="36" height="22" rx="10" fill={T.accent}/>
            <rect x="15" y="19" width="18" height="10" rx="5" fill={T.bg1}/>
            <rect x="16" y="14.5" width="4" height="3" rx="0.7" fill={T.bg1}/>
            <rect x="22" y="14.5" width="4" height="3" rx="0.7" fill={T.bg1}/>
            <rect x="28" y="14.5" width="4" height="3" rx="0.7" fill={T.bg1}/>
            <rect x="16" y="30.5" width="4" height="3" rx="0.7" fill={T.bg1}/>
            <rect x="22" y="30.5" width="4" height="3" rx="0.7" fill={T.bg1}/>
            <rect x="28" y="30.5" width="4" height="3" rx="0.7" fill={T.bg1}/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text1, letterSpacing: "-0.02em" }}>Movie Chain</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text2, marginTop: 4 }}>
          {entries.length === 0 ? "No movies yet" : `${entries.length} movie${entries.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: "10px 8px" }}>
        {navItem("Chain",   IconChain,    isChainActive,   () => go("chain"))}
        {navItem("Sequels", IconSequels,  isSequelsActive, () => go("sequels"))}
        {navItem("Reports", IconReports,  isReportsActive, () => go("reports"))}
        {navItem("System",  IconSystem,   isSystemActive,  () => go("system"), updateAvailable && !isSystemActive)}
        {navItem("Settings",IconSettings, isSettingsActive,() => go("settings"))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Watch Free suggestion */}
      {suggestedSequel && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          <div style={{ overflow: "hidden" }}>
            <div style={{ padding: "7px 10px", background: T.bg3, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: T.text1, flexShrink: 0 }}>
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.text1 }}>Watch Free</span>
            </div>
            <WidgetThumb
              key={suggestedSequel.part.id}
              src={embyThumbFor(embyConfig, library, String(suggestedSequel.part.id), 200)
                || embyImgFor(embyConfig, library, String(suggestedSequel.part.id), 200)}
              alt={suggestedSequel.part.title}
              title={suggestedSequel.part.title}
            />
          </div>
          <div style={{ padding: "12px" }}>
            {hasMultipleSequels && (
              <button style={{ width: "100%", fontSize: 13, gap: 5 }} onClick={onCycleSequel}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Pick again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ borderTop: `1px solid ${T.border}` }}>
        {currentLink && currentMovie && (
          <div style={{ overflow: "hidden", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ padding: "7px 10px", background: T.bg3, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: T.text1, flexShrink: 0 }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.text1 }}>Last Link</span>
            </div>
            <div style={{ padding: "8px 10px 0", background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: T.text1 }}>{currentLink.person.name}</span>
              <Badge type={currentLink.type} />
            </div>
            <WidgetThumb
              key={currentMovie.id}
              src={embyThumbFor(embyConfig, library, currentMovie.id, 200)
                || embyImgFor(embyConfig, library, currentMovie.id, 200)}
              alt={currentMovie.title}
              title={currentMovie.title}
            />
          </div>
        )}
        <div style={{ padding: "12px" }}>
          <button
            style={{ width: "100%", marginBottom: 8, fontSize: 13 }}
            onClick={() => go(entries.length === 0 ? "search-first" : "pick-movie")}
          >
            {entries.length === 0 ? "Start chain" : "Add next →"}
          </button>
          {entries.length > 0 && (
            <button
              style={{ width: "100%", fontSize: 12 }}
              onClick={() => { if (window.confirm("Remove the last movie?")) undo(); }}
            >
              ← Undo last
            </button>
          )}
        </div>
      </div>

      {/* Emby status */}
      {embyConfig && embyBadge && (
        <div
          onClick={status !== "syncing" ? () => syncLibrary(embyConfig, false) : undefined}
          style={{
            padding: "10px 16px", borderTop: `1px solid ${T.border}`,
            cursor: status !== "syncing" ? "pointer" : "default",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: embyBadge.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: embyBadge.color, fontWeight: 600, letterSpacing: "0.04em" }}>
            {embyBadge.label}
          </span>
        </div>
      )}
    </div>
  );
}

export default function MovieChain() {
  const updateStatus = useUpdateStatus();
  const tmdbKey    = useConfigStore(s => s.tmdbKey);
  const embyConfig = useConfigStore(s => s.embyConfig);
  const syncInterval = useConfigStore(s => s.syncInterval);
  const { entries, undo } = useChainStore();
  const { library, status, lastSynced, syncLibrary } = useEmbyStore();
  const currentIdx = selectCurrentIdx(entries, library);
  const currentEntry = entries[currentIdx] ?? null;
  const currentMovie = currentEntry?.movie ?? null;
  const currentLink  = currentEntry?.link ?? null;
  const sequelsVersion = useChainStore(s => s.sequelsVersion);
  const { prefetch } = useTmdbPrefetch();
  useCollectionPrefetch();

  const [sequelCandidates, setSequelCandidates] = useState([]);
  const [sequelIdx, setSequelIdx] = useState(0);
  useEffect(() => {
    if (entries.length === 0) { setSequelCandidates([]); setSequelIdx(0); return; }
    let cancelled = false;
    async function load() {
      const colCache = {};
      for (const entry of entries) {
        const colId = entry.movie.collectionId;
        if (!colId || colId in colCache) continue;
        try {
          const raw = await store.get(`mc:col:${colId}`);
          const col = raw ? JSON.parse(raw) : null;
          if (col?.parts?.length >= 2) colCache[colId] = col;
        } catch {}
      }
      if (cancelled) return;
      const chainIds = new Set(entries.map(e => String(e.movie.id)));
      const watchedIds = library
        ? new Set(Object.entries(library).filter(([, v]) => v.played).map(([k]) => k))
        : new Set(entries.slice(0, -1).map(e => String(e.movie.id)));
      const chainWatchedIds = new Set([...chainIds].filter(id => watchedIds.has(id)));
      const candidates = [];
      for (const col of Object.values(colCache)) {
        const parts = [...col.parts].sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""));
        if (!chainWatchedIds.has(String(parts[0]?.id))) continue;
        const nextIdx = parts.findIndex(p => !watchedIds.has(String(p.id)));
        if (nextIdx === -1) continue;
        const next = parts[nextIdx];
        const nextId = String(next.id);
        if (!library || !(nextId in library) || library[nextId].played) continue;
        candidates.push({ part: next, nextIdx, partNum: nextIdx + 1, totalParts: parts.length, colName: col.name });
      }
      candidates.sort((a, b) => b.nextIdx - a.nextIdx);
      if (!cancelled) { setSequelCandidates(candidates); setSequelIdx(0); }
    }
    load();
    return () => { cancelled = true; };
  }, [entries, library, sequelsVersion]);
  const suggestedSequel = sequelCandidates.length > 0 ? sequelCandidates[sequelIdx % sequelCandidates.length] : null;
  const cycleSequel = () => setSequelIdx(i => (i + 1) % sequelCandidates.length);

  const chainSortOrder    = useConfigStore(s => s.chainSortOrder);
  const setChainSortOrder = useConfigStore(s => s.setChainSortOrder);

  const [screen, setScreen] = useState(tmdbKey ? "chain" : "setup");
  const [error,  setError]  = useState("");
  const go = useCallback((s) => { setError(""); setScreen(s); }, []);

  // ── Global CSS injection ───────────────────────────────────────────────────
  useEffect(() => {
    const id = "mc-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
      body { margin: 0; }
      .mc-root * { box-sizing: border-box; font-family: 'Outfit', system-ui, sans-serif; }
      .mc-root { background: ${T.bg0}; color: ${T.text1}; min-height: 100vh; }
      .mc-root input, .mc-root select, .mc-root textarea {
        background: ${T.bg3} !important; color: ${T.text1} !important;
        border: 1px solid ${T.border} !important; border-radius: 6px !important;
        padding: 7px 10px !important; font-size: 13px !important;
        font-family: inherit !important; outline: none !important;
        transition: border-color 0.15s !important;
      }
      .mc-root input:focus, .mc-root select:focus { border-color: ${T.accent} !important; }
      .mc-root input::placeholder { color: ${T.text3} !important; }
      .mc-root input[type=number]::-webkit-outer-spin-button,
      .mc-root input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      .mc-root input[type=number] { -moz-appearance: textfield; }
      .mc-root button {
        background: ${T.bg3}; color: ${T.text1}; border: 1px solid ${T.borderHov};
        border-radius: 6px; padding: 7px 14px; font-size: 13px; font-weight: 500;
        cursor: pointer; font-family: inherit; transition: background 0.15s, border-color 0.15s;
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      }
      .mc-root button:hover:not(:disabled) { background: ${T.bg2}; border-color: ${T.borderAcc}; color: ${T.accent}; }
      .mc-root button:disabled { opacity: 0.35; cursor: default; }
      .mc-root button.primary { background: ${T.accent}; color: #fff; border-color: ${T.accent}; }
      .mc-root button.primary:hover:not(:disabled) { background: #00caf0; border-color: #00caf0; color: #fff; }
      .mc-root button.ghost { background: none; border-color: transparent; color: ${T.text2}; }
      .mc-root button.ghost:hover:not(:disabled) { background: ${T.bg3}; border-color: ${T.border}; color: ${T.text1}; }
      .mc-root button.danger { color: #e87474; }
      .mc-root button.danger:hover:not(:disabled) { background: ${T.dangerDim}; border-color: ${T.danger}44; color: ${T.danger}; }
      .mc-root select option { background: ${T.bg3}; }
      .mc-root ::-webkit-scrollbar { width: 6px; height: 6px; }
      .mc-root ::-webkit-scrollbar-track { background: transparent; }
      .mc-root ::-webkit-scrollbar-thumb { background: ${T.bg3}; border-radius: 3px; }
    `;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  // ── Prefetch TMDB links whenever the chain's last entry changes ────────────
  useEffect(() => {
    if (entries.length > 0) prefetch(entries[entries.length - 1].movie.id);
  }, [entries, prefetch]);

  // ── Background Emby sync on boot + scheduled interval ─────────────────────
  useEffect(() => {
    if (!embyConfig) return;
    syncLibrary(embyConfig, true);
    const ms = syncInterval * 60 * 1000;
    const id = setInterval(() => syncLibrary(embyConfig, true), ms);
    return () => clearInterval(id);
  }, [embyConfig, syncInterval, syncLibrary]);

  // ── Setup is full-screen (no sidebar) ─────────────────────────────────────
  if (screen === "setup") return <SetupScreen go={go} />;

  // ── All other screens use sidebar layout ──────────────────────────────────
  return (
    <div className="mc-root" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <UpdateBanner {...updateStatus} />
      <Sidebar
        screen={screen} go={go}
        entries={entries} undo={undo} currentLink={currentLink} currentMovie={currentMovie} library={library}
        embyConfig={embyConfig}
        status={status} lastSynced={lastSynced} syncLibrary={syncLibrary}
        suggestedSequel={suggestedSequel}
        onCycleSequel={cycleSequel}
        hasMultipleSequels={sequelCandidates.length > 1}
        updateAvailable={updateStatus.availableDismissed || updateStatus.manualSource}
      />
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {screen === "settings"     && <SettingsScreen go={go} />}
        {screen === "search-first" && <SearchFirstScreen go={go} />}
        {screen === "pick-movie"   && <PickMovieScreen go={go} />}
        {screen === "reports"      && <ReportsScreen />}
        {screen === "sequels"      && <SequelsScreen />}
        {screen === "system"       && <SystemScreen updateStatus={updateStatus} />}
        {screen === "chain"        && <ChainScreen error={error} setError={setError} sortOrder={chainSortOrder} setSortOrder={setChainSortOrder} />}
      </div>
    </div>
  );
}
