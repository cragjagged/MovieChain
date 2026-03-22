import { useState, useEffect, useRef, useMemo } from "react";
import { T } from "../theme.js";
import { useConfigStore } from "../stores/configStore.js";
import { useEmbyStore } from "../stores/embyStore.js";
import { useChainStore } from "../stores/chainStore.js";
import { embyImgFor } from "../api/emby.js";
import { store } from "../stores/storage.js";
import { Poster } from "../components/Poster.jsx";

const parseJSON = (raw) => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } };

const PAGE = 15;

// Renders a paginated, independently-scrolling column of collection cards.
function CollectionColumn({ label, collections, embyConfig, library, hasLibrary, isCollapsed, toggle }) {
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const sentinelRef  = useRef(null);
  const containerRef = useRef(null);

  // Reset when the list changes.
  useEffect(() => { setVisibleCount(PAGE); }, [collections]);

  // Grow when sentinel enters the column's own scroll viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisibleCount(c => c + PAGE); },
      { root: containerRef.current, rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, collections.length]);

  const sliced  = collections.slice(0, visibleCount);
  const hasMore = visibleCount < collections.length;

  return (
    <div ref={containerRef} style={{ overflowY: "auto", height: "calc(100vh - 220px)" }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {label && (
        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </div>
      )}

      {sliced.map(col => {
        const watchedCount   = col.parts.filter(p => p.watched).length;
        const availableCount = col.parts.filter(p => !p.watched && p.inLibrary).length;
        const allDone = watchedCount === col.parts.length;
        const open    = !isCollapsed(col);

        return (
          <div key={col.id} style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", background: T.bg1 }}>
            {/* Header */}
            <div onClick={() => toggle(col)} style={{
              padding: "10px 14px", background: T.bg2,
              borderBottom: open ? `1px solid ${T.border}` : undefined,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              cursor: "pointer", userSelect: "none",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {col.name}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {allDone ? (
                  <span style={{ fontSize: 11, color: T.success, fontWeight: 600 }}>Complete</span>
                ) : (
                  <>
                    <span style={{ fontSize: 11, color: T.text3, fontWeight: 500 }}>{watchedCount}/{col.parts.length}</span>
                    {hasLibrary && availableCount > 0 && (
                      <span style={{ fontSize: 11, color: T.accent, fontWeight: 600, background: T.accentDim, padding: "2px 7px", borderRadius: 10 }}>
                        {availableCount} free
                      </span>
                    )}
                  </>
                )}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: T.text3, flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {/* Parts */}
            {open && col.parts.map((part, i) => {
              const embyImgSrc = embyImgFor(embyConfig, library, part.id);
              const isUnlocked = !part.watched && part.inLibrary;
              let statusDot = T.text3, statusLabel = hasLibrary ? "Not in library" : "";
              if (part.watched)        { statusDot = T.success; statusLabel = "Watched"; }
              else if (part.inLibrary) { statusDot = T.accent;  statusLabel = "In Emby"; }

              return (
                <div key={part.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  borderBottom: i < col.parts.length - 1 ? `1px solid ${T.border}` : undefined,
                  background: isUnlocked ? T.accentDim : "transparent",
                }}>
                  <span style={{ fontSize: 10, color: T.text3, width: 14, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                  <Poster tmdbPath={part.poster_path} embyImgSrc={embyImgSrc} title={part.title} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {part.title}
                    </div>
                    {part.year && <div style={{ fontSize: 10, color: T.text3, marginTop: 1 }}>{part.year}</div>}
                  </div>
                  {(part.watched || part.inLibrary || hasLibrary) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: statusDot, fontWeight: 600 }}>{statusLabel}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </div>
    </div>
  );
}

export function SequelsScreen() {
  const embyConfig = useConfigStore(s => s.embyConfig);
  const library    = useEmbyStore(s => s.library);
  const entries        = useChainStore(s => s.entries);
  const sequelsVersion = useChainStore(s => s.sequelsVersion);

  const [colCache, setColCache] = useState({});

  const chainIds = useMemo(() => new Set(entries.map(e => String(e.movie.id))), [entries]);

  const watchedIds = useMemo(() => {
    if (library) {
      return new Set(Object.entries(library).filter(([, v]) => v.played).map(([k]) => k));
    }
    return new Set(entries.slice(0, -1).map(e => String(e.movie.id)));
  }, [library, entries]);

  const chainWatchedIds = useMemo(
    () => new Set([...chainIds].filter(id => watchedIds.has(id))),
    [chainIds, watchedIds],
  );

  useEffect(() => {
    if (entries.length === 0) { setColCache({}); return; }
    async function load() {
      const next = {};
      for (const entry of entries) {
        const colId = entry.movie.collectionId;
        if (!colId || colId in next) continue;
        const col = parseJSON(await store.get(`mc:col:${colId}`));
        if (col?.parts?.length >= 2) next[colId] = col;
      }
      setColCache(next);
    }
    load();
  }, [entries, sequelsVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const collections = useMemo(() => {
    const result = Object.values(colCache)
      .filter(col => chainWatchedIds.has(String(col.parts[0]?.id)))
      .map(col => ({
        id:   col.id,
        name: col.name,
        parts: col.parts.map(p => ({
          id:          p.id,
          title:       p.title,
          year:        (p.release_date || "").slice(0, 4),
          poster_path: p.poster_path,
          watched:     watchedIds.has(String(p.id)),
          inLibrary:   library ? String(p.id) in library : false,
          embyId:      library?.[String(p.id)]?.embyId ?? null,
        })),
      }));
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [colCache, chainWatchedIds, watchedIds, library]);

  const active   = collections.filter(c => !c.parts.every(p => p.watched));
  const complete = collections.filter(c =>  c.parts.every(p => p.watched));

  const hasLibrary = !!(embyConfig && library);
  const freeCount  = active.reduce((n, col) =>
    n + col.parts.filter(p => !p.watched && p.inLibrary).length, 0);

  const [collapsed, setCollapsed] = useState({});
  const isCollapsed = (col) => {
    if (col.id in collapsed) return collapsed[col.id];
    return col.parts.every(p => p.watched);
  };
  const toggle = (col) => setCollapsed(prev => ({ ...prev, [col.id]: !isCollapsed(col) }));

  return (
    <div style={{ padding: "1.25rem" }}>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: T.text1, letterSpacing: "-0.01em" }}>Sequels</h2>
      </div>
      <p style={{ fontSize: 13, color: T.text3, margin: "0 0 16px" }}>
        Add the first film in a series to the chain and watch it to unlock its sequels for free.
      </p>

      {/* Empty state */}
      {collections.length === 0 && (
        <div style={{ padding: "4rem 2rem", textAlign: "center", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 8 }}>
          <p style={{ fontSize: 14, color: T.text3, margin: 0 }}>
            {chainWatchedIds.size === 0
              ? "No watched chain films yet."
              : "No series unlocked yet — add the first film in a series to the chain and watch it to unlock its sequels."}
          </p>
        </div>
      )}

      {/* 2-column layout — each column scrolls independently */}
      {collections.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          <CollectionColumn
            label={hasLibrary && freeCount > 0
              ? `${active.length} series in progress · ${freeCount} free movies`
              : `${active.length} series in progress`}
            collections={active}
            embyConfig={embyConfig}
            library={library}
            hasLibrary={hasLibrary}
            isCollapsed={isCollapsed}
            toggle={toggle}
          />
          <CollectionColumn
            label={`${Math.round(complete.length / collections.length * 100)}% of series complete`}
            collections={complete}
            embyConfig={embyConfig}
            library={library}
            hasLibrary={hasLibrary}
            isCollapsed={isCollapsed}
            toggle={toggle}
          />
        </div>
      )}
    </div>
  );
}
