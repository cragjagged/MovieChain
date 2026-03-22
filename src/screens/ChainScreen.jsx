import { useState, useEffect, useRef } from "react";
import { T } from "../theme.js";
import { useConfigStore } from "../stores/configStore.js";
import { useChainStore, selectCurrentIdx } from "../stores/chainStore.js";
import { useEmbyStore } from "../stores/embyStore.js";
import { embyEntryFor, embyImgFor } from "../api/emby.js";
import { ErrBanner } from "../components/banners.jsx";
import { ChainEntry } from "../components/ChainEntry.jsx";

const PAGE = 20;

export function ChainScreen({ error, setError, sortOrder, setSortOrder }) {
  const embyConfig  = useConfigStore(s => s.embyConfig);
  const { entries } = useChainStore();
  const { library } = useEmbyStore();

  const currentIdx = selectCurrentIdx(entries, library);

  const isReversed       = sortOrder === "desc";
  const displayedEntries = isReversed ? [...entries].reverse() : entries;

  const [visibleCount, setVisibleCount] = useState(PAGE);
  const sentinelRef = useRef(null);

  // Reset window when sort order changes.
  useEffect(() => { setVisibleCount(PAGE); }, [sortOrder]);

  // Grow window when the sentinel enters the viewport (with 300px lookahead).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisibleCount(c => c + PAGE); },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, displayedEntries.length]);

  const sliced  = displayedEntries.slice(0, visibleCount);
  const hasMore = visibleCount < displayedEntries.length;

  return (
    <div style={{ padding: "1.25rem" }}>

      <ErrBanner msg={error} onDismiss={() => setError("")} />

      {entries.length === 0 ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 8 }}>
          <p style={{ fontSize: 14, color: T.text3, margin: 0 }}>Your chain is empty — start with any movie.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, gap: 4 }}>
            {[["asc", "↓", "Oldest first"], ["desc", "↑", "Newest first"]].map(([val, arrow, label]) => (
              <button
                key={val}
                onClick={() => setSortOrder(val)}
                style={{
                  fontSize: 10, padding: "4px 10px",
                  background: sortOrder === val ? T.accentDim : T.bg1,
                  border: `1px solid ${sortOrder === val ? T.accent : T.border}`,
                  color: sortOrder === val ? T.accent : T.text2,
                  borderRadius: 4, fontWeight: 600,
                  letterSpacing: "0.05em", textTransform: "uppercase", gap: 4,
                }}
              >
                <span>{arrow}</span>{label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {sliced.map((entry, i) => {
              const origIdx   = isReversed ? entries.length - 1 - i : i;
              const embyEntry = embyEntryFor(library, entry.movie.id);
              const isPlayed  = library ? (embyEntry?.played ?? false) : origIdx < currentIdx;
              // Connector link: look into the full displayedEntries so the boundary
              // entry still shows its connector even when the next entry isn't sliced yet.
              const linkForConnector = isReversed
                ? entry.link
                : displayedEntries[i + 1]?.link || null;
              return (
                <ChainEntry
                  key={entry.movie.id}
                  movie={entry.movie}
                  link={linkForConnector}
                  isCurrent={origIdx === currentIdx}
                  isPlayed={isPlayed}
                  watchedDate={embyEntry?.lastPlayedDate ?? null}
                  isLast={i === sliced.length - 1 && !hasMore}
                  embyImgSrc={embyImgFor(embyConfig, library, entry.movie.id, 200)}
                  direction={isReversed ? "up" : "down"}
                />
              );
            })}
          </div>

          {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
        </>
      )}

    </div>
  );
}
