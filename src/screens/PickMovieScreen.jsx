import { useState, useEffect, useCallback } from "react";
import { T } from "../theme.js";
import { useConfigStore } from "../stores/configStore.js";
import { useChainStore, selectCurrentIdx, selectLastType, selectChainIds, selectWatchedIds } from "../stores/chainStore.js";
import { useEmbyStore } from "../stores/embyStore.js";
import { useTmdbPrefetch } from "../hooks/useTmdbPrefetch.js";
import { tmdb, extractCredits, moviesForPerson } from "../api/tmdb.js";
import { embyImgUrl, fetchEmbyItemPeople, fetchEmbyPersonMovies, embyStatusFor, embyImgFor } from "../api/emby.js";
import { EMBY_TYPE_MAP, ALL_TYPES, SORT_OPTIONS } from "../constants.js";
import { norm, sortOptions } from "../utils.js";
import { ErrBanner, WarnBanner, InfoBanner } from "../components/banners.jsx";
import { Toggle } from "../components/primitives.jsx";
import { Badge } from "../components/primitives.jsx";
import { MovieOptionRow } from "../components/MovieOptionRow.jsx";
import { Poster } from "../components/Poster.jsx";

export function PickMovieScreen({ go }) {
  const tmdbKey    = useConfigStore(s => s.tmdbKey);
  const embyConfig = useConfigStore(s => s.embyConfig);
  const { allowWatched, setAllowWatched } = useConfigStore();

  const { entries, add: addToChain } = useChainStore();
  const library = useEmbyStore(s => s.library);

  const currentIdx = selectCurrentIdx(entries, library);
  const lastType   = selectLastType(entries, currentIdx);
  const chainIds   = selectChainIds(entries);
  const watchedIds = selectWatchedIds(entries, library);
  const currentMovie = entries[currentIdx]?.movie ?? null;

  const { applyIfCached } = useTmdbPrefetch();

  const [movieOptions,   setMovieOptions]   = useState([]);
  const [loadProgress,   setLoadProgress]   = useState({ done: 0, total: 0 });
  const [filmFilter,     setFilmFilter]     = useState("");
  const [sortBy,         setSortBy]         = useState("emby");
  const [showAllTmdb,    setShowAllTmdb]    = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");

  // Custom link state (history mode)
  const [customStep,   setCustomStep]   = useState(null); // null | "search" | "details"
  const [customQuery,  setCustomQuery]  = useState("");
  const [customMovie,  setCustomMovie]  = useState(null);
  const [customPerson, setCustomPerson] = useState("");
  const [customType,   setCustomType]   = useState("");

  // ── Derived state ──────────────────────────────────────────────────────────
  const unwatchedOptions = movieOptions.filter(o => !o.watched);
  const visibleOptions   = allowWatched ? movieOptions : unwatchedOptions;
  const embyOptions      = visibleOptions.filter(o => library && String(o.movie.id) in library);
  const useEmbyList      = !!(embyConfig && library && !showAllTmdb);
  const baseOptions      = useEmbyList ? embyOptions : visibleOptions;
  const filtered         = baseOptions.filter(o => !filmFilter || norm(o.movie.title).includes(norm(filmFilter)));
  const sorted           = sortOptions(filtered, sortBy, library ?? {});
  const noEmbyMatch      = useEmbyList && embyOptions.length === 0 && visibleOptions.length > 0;
  const watchedCount     = movieOptions.filter(o => o.watched).length;

  // Custom link: search Emby library client-side (up to 40 results)
  const customResults = (() => {
    if (!library || !customQuery.trim()) return [];
    const q = norm(customQuery);
    return Object.entries(library)
      .filter(([tmdbId, e]) => {
        if (!norm(e.title).includes(q)) return false;
        if (!allowWatched && e.played) return false;
        if (chainIds.has(String(tmdbId))) return false;
        return true;
      })
      .sort((a, b) => a[1].title.localeCompare(b[1].title))
      .slice(0, 40);
  })();

  // ── mergeIntoOptions ────────────────────────────────────────────────────────
  const mergeIntoOptions = useCallback((optMap, person, movies) => {
    for (const m of movies) {
      const sid = String(m.id);
      if (chainIds.has(sid) || !m.title) continue;
      const isWatched = watchedIds.has(sid);
      if (!optMap.has(sid)) optMap.set(sid, { movie: m, links: [], watched: isWatched });
      const links = optMap.get(sid).links;
      if (!links.some(l => l.person.personId === person.personId && l.type === person.type))
        links.push({ person, type: person.type });
    }
  }, [chainIds, watchedIds]);

  // ── startNext ───────────────────────────────────────────────────────────────
  // Entry point when navigating to this screen. Builds the candidate movie list
  // via Emby-first path (when connected) or TMDB fallback (when not).
  const startNext = useCallback(async () => {
    setLoading(true); setError("");
    setMovieOptions([]); setFilmFilter(""); setShowAllTmdb(false);
    setCustomStep(null); setCustomQuery(""); setCustomMovie(null); setCustomPerson(""); setCustomType("");
    setLoadProgress({ done: 0, total: 0 });

    try {
      const optMap = new Map();

      if (embyConfig && library && currentMovie?.embyId) {
        // Emby-first path: 1 call for people + N parallel calls for their movies
        const embyPeople = await fetchEmbyItemPeople(embyConfig, currentMovie.embyId);
        const eligible   = embyPeople.filter(p => EMBY_TYPE_MAP[p.Type] !== lastType);
        setLoadProgress({ done: 0, total: eligible.length });

        const results = await Promise.allSettled(
          eligible.map(ep =>
            fetchEmbyPersonMovies(embyConfig, ep.Id)
              .then(movies => { setLoadProgress(p => ({ ...p, done: p.done + 1 })); return { ep, movies }; })
              .catch(()    => { setLoadProgress(p => ({ ...p, done: p.done + 1 })); return null; })
          )
        );

        for (const r of results) {
          if (r.status !== "fulfilled" || !r.value) continue;
          const { ep, movies } = r.value;
          const creditType   = EMBY_TYPE_MAP[ep.Type];
          const tmdbPersonId = ep.ProviderIds?.Tmdb || ep.ProviderIds?.tmdb || null;
          const person       = { personId: tmdbPersonId ? Number(tmdbPersonId) : ep.Id, name: ep.Name, type: creditType };
          const tmdbMovies   = movies.map(m => {
            const tid = m.ProviderIds?.Tmdb || m.ProviderIds?.tmdb;
            if (!tid) return null;
            return { id: Number(tid), title: m.Name, release_date: m.ProductionYear ? `${m.ProductionYear}-01-01` : "", vote_average: m.CommunityRating || 0, poster_path: null };
          }).filter(Boolean);
          mergeIntoOptions(optMap, person, tmdbMovies);
        }
      } else {
        // TMDB fallback: full parallel filmography fetch
        const creditsData = await tmdb(tmdbKey, `/movie/${currentMovie.id}/credits`);
        const eligible    = extractCredits(creditsData).filter(p => p.type !== lastType);
        setLoadProgress({ done: 0, total: eligible.length });

        const results = await Promise.allSettled(
          eligible.map(person =>
            tmdb(tmdbKey, `/person/${person.personId}/movie_credits`)
              .then(data => { setLoadProgress(p => ({ ...p, done: p.done + 1 })); return { person, data }; })
              .catch(()  => { setLoadProgress(p => ({ ...p, done: p.done + 1 })); return null; })
          )
        );
        for (const r of results) {
          if (r.status !== "fulfilled" || !r.value) continue;
          mergeIntoOptions(optMap, r.value.person, moviesForPerson(r.value.person, r.value.data));
        }
      }

      const baseOpts = [...optMap.values()];
      setMovieOptions(baseOpts);

      applyIfCached({ movieId: currentMovie.id, base: baseOpts, lastType, chainIds, watchedIds, onUpdate: setMovieOptions });
    } catch (e) { setError("Failed to load options: " + (e?.message || e)); }
    finally { setLoading(false); }
  }, [embyConfig, library, currentMovie, lastType, chainIds, watchedIds, tmdbKey, mergeIntoOptions, applyIfCached]);

  // ── pickMovie ───────────────────────────────────────────────────────────────
  // Validates series order (unless history mode), then appends to chain.
  const pickMovie = async (movie, link) => {
    setLoading(true); setError("");
    try {
      const details = await tmdb(tmdbKey, `/movie/${movie.id}`);
      if (details.belongs_to_collection && !allowWatched) {
        const col    = await tmdb(tmdbKey, `/collection/${details.belongs_to_collection.id}`);
        const sorted = [...col.parts].sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""));
        const idx    = sorted.findIndex(p => p.id === movie.id);
        const missing = sorted.slice(0, idx).filter(p => { const sid = String(p.id); return !watchedIds.has(sid) && !chainIds.has(sid); });
        if (missing.length > 0) {
          setError(`Series order — watch first: ${missing.map(p => `"${p.title}"`).join(", ")}`);
          setLoading(false); return;
        }
      }
      const embyEntry    = library?.[String(movie.id)] ?? null;
      const collectionId = details.belongs_to_collection?.id ?? null;
      addToChain(
        { id: details.id, title: details.title, year: (details.release_date || "").slice(0, 4), poster: details.poster_path, embyId: embyEntry?.embyId || null, collectionId },
        { person: link.person, type: link.type },
      );
      go("chain");
    } catch (e) { setError("Error adding movie: " + (e?.message || e)); }
    finally { setLoading(false); }
  };

  // ── pickCustomMovie ─────────────────────────────────────────────────────────
  // Adds a film via a manually entered credit (history mode, IMDB-only credits).
  const pickCustomMovie = async () => {
    if (!customMovie || !customPerson.trim() || !customType.trim()) return;
    setLoading(true); setError("");
    try {
      const details      = await tmdb(tmdbKey, `/movie/${customMovie.tmdbId}`);
      const embyEntry    = library?.[String(customMovie.tmdbId)] ?? null;
      const collectionId = details.belongs_to_collection?.id ?? null;
      addToChain(
        { id: details.id, title: details.title, year: (details.release_date || "").slice(0, 4), poster: details.poster_path, embyId: embyEntry?.embyId || null, collectionId },
        { person: { personId: null, name: customPerson.trim() }, type: customType.trim() },
      );
      go("chain");
    } catch (e) { setError("Error adding movie: " + (e?.message || e)); }
    finally { setLoading(false); }
  };

  // Run startNext on mount (once)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { startNext(); }, []);

  return (
    <div className="mc-root" style={{ padding: "1.25rem", maxWidth: 600 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: T.text1, letterSpacing: "-0.01em" }}>Choose next movie</h2>
      <p style={{ fontSize: 13, color: T.text2, margin: "0 0 4px" }}>
        Linking from <strong>{currentMovie?.title}</strong>
        {lastType && <> · <Badge type={lastType} /> unavailable (used last)</>}
      </p>
      <p style={{ fontSize: 13, color: T.text2, margin: "0 0 14px" }}>
        {sorted.length} option{sorted.length !== 1 ? "s" : ""}
        {visibleOptions.length !== sorted.length ? ` (of ${visibleOptions.length} total)` : ""}
        {watchedCount > 0 && !allowWatched && (
          <> · <span style={{ cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dashed", color: T.text2 }} onClick={() => setAllowWatched(true)}>{watchedCount} watched hidden</span></>
        )}
        {" · "}Click a link chip to add via that connection.
      </p>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input value={filmFilter} onChange={e => setFilmFilter(e.target.value)} placeholder="Filter by title…" style={{ flex: 1, minWidth: 140 }} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: 13, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.borderHov}`, background: T.bg2, color: T.text1, cursor: "pointer" }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {embyConfig && library && <Toggle value={!showAllTmdb} onChange={v => setShowAllTmdb(!v)} label="Emby only" />}
        {embyConfig && library && (
          <Toggle value={allowWatched} onChange={v => { setAllowWatched(v); if (!v) { setCustomStep(null); setCustomMovie(null); } }} label="Show watched" />
        )}
      </div>

      {allowWatched && <WarnBanner msg="History mode — watched films visible, series order suspended." />}

      {/* Custom link panel (history mode only) */}
      {allowWatched && library && (
        <div style={{ marginBottom: 16, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", background: T.bg1 }}>
          <button
            onClick={() => { setCustomStep(customStep ? null : "search"); setCustomQuery(""); setCustomMovie(null); setCustomPerson(""); setCustomType(""); }}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 0, border: "none", background: T.bg1, display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontWeight: 600, fontSize: 12, color: T.text2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Custom link</span>
            <span style={{ fontSize: 11, color: T.text3, fontWeight: 500 }}>{customStep ? "✕ close" : "Use a credit not in TMDB →"}</span>
          </button>

          {customStep === "search" && (
            <div style={{ padding: "12px 14px", borderTop: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 12, color: T.text2, margin: "0 0 10px" }}>
                Search your Emby library for the movie, then enter the person and credit type.
              </p>
              <input autoFocus value={customQuery} onChange={e => setCustomQuery(e.target.value)} placeholder="Search Emby library…" style={{ width: "100%", boxSizing: "border-box", marginBottom: 10 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
                {customResults.map(([tmdbId, e]) => (
                  <div key={tmdbId} onClick={() => { setCustomMovie({ tmdbId, embyId: e.embyId, title: e.title }); setCustomStep("details"); }}
                    style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: T.bg3, border: `1px solid ${T.border}` }}>
                    <Poster tmdbPath={null} embyImgSrc={embyImgUrl(embyConfig, e.embyId, 120)} title={e.title} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.text1 }}>{e.title}</div>
                      {e.played && <span style={{ fontSize: 10, color: T.text2 }}>Watched</span>}
                    </div>
                    <span style={{ fontSize: 12, color: T.accent, flexShrink: 0 }}>Select →</span>
                  </div>
                ))}
                {customQuery.trim() && customResults.length === 0 && <p style={{ fontSize: 13, color: T.text2, margin: 0 }}>No matches in your Emby library.</p>}
                {!customQuery.trim() && <p style={{ fontSize: 11, color: T.text3, margin: 0, fontStyle: "italic" }}>Type to search your Emby library…</p>}
              </div>
            </div>
          )}

          {customStep === "details" && customMovie && (
            <div style={{ padding: "12px 14px", borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, padding: "8px 10px", background: T.bg1, borderRadius: 8 }}>
                <Poster tmdbPath={null} embyImgSrc={embyImgUrl(embyConfig, customMovie.embyId, 120)} title={customMovie.title} size={36} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, color: T.text1 }}>{customMovie.title}</div></div>
                <button className="ghost" onClick={() => { setCustomMovie(null); setCustomStep("search"); }} style={{ fontSize: 11 }}>← Change</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: T.text2, display: "block", marginBottom: 4 }}>Person name</label>
                  <input autoFocus value={customPerson} onChange={e => setCustomPerson(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && customType.trim() && pickCustomMovie()}
                    placeholder="e.g. John Doe" style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: T.text2, display: "block", marginBottom: 4 }}>Credit type</label>
                  <select
                    value={ALL_TYPES.includes(customType) ? customType : (customType ? "Other" : "")}
                    onChange={e => { if (e.target.value === "Other") setCustomType("_other_"); else setCustomType(e.target.value); }}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.borderHov}`, background: T.bg2, color: T.text1 }}
                  >
                    <option value="">Select credit type…</option>
                    {ALL_TYPES.map(t => (
                      <option key={t} value={t} disabled={t === lastType}>{t}{t === lastType ? " (used last — blocked)" : ""}</option>
                    ))}
                    <option value="Other">Other (type manually)</option>
                  </select>
                  {(customType === "_other_" || (customType && !ALL_TYPES.includes(customType))) && (
                    <input autoFocus value={customType === "_other_" ? "" : customType} onChange={e => setCustomType(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && customPerson.trim() && pickCustomMovie()}
                      placeholder="e.g. Stunts, Visual Effects, Casting…"
                      style={{ width: "100%", boxSizing: "border-box", marginTop: 6 }} />
                  )}
                </div>
                <button className="primary" onClick={pickCustomMovie}
                  disabled={loading || !customPerson.trim() || !customType.trim() || customType === "_other_"}
                  style={{ marginTop: 4, width: "100%" }}>
                  {loading ? "Adding…" : "Add to chain →"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ErrBanner msg={error} onDismiss={() => setError("")} />
      {noEmbyMatch && <InfoBanner msg={`None of the linked films are in your Emby library. Toggle off "Emby only" to see all ${movieOptions.length} TMDB options.`} />}

      {/* Progress indicator */}
      {loading && loadProgress.total > 0 && (
        <div style={{ fontSize: 13, color: T.text2, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: T.border, overflow: "hidden" }}>
            <div style={{ height: "100%", background: T.accent, width: `${Math.round(loadProgress.total ? (loadProgress.done / loadProgress.total) * 100 : 0)}%`, transition: "width 0.2s" }} />
          </div>
          <span style={{ flexShrink: 0 }}>{loadProgress.done}/{loadProgress.total}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.slice(0, 100).map(option => (
          <MovieOptionRow
            key={option.movie.id}
            option={option}
            onSelect={pickMovie}
            disabled={loading}
            embyStatus={embyConfig ? embyStatusFor(library, option.movie.id) : null}
            embyImgSrc={embyImgFor(embyConfig, library, option.movie.id)}
          />
        ))}
        {sorted.length === 0 && !noEmbyMatch && (
          <p style={{ fontSize: 13, color: T.text2 }}>
            {movieOptions.length === 0 ? "No options found." : "No movies match your filter."}
          </p>
        )}
        {sorted.length > 100 && (
          <p style={{ fontSize: 12, color: T.text2, textAlign: "center", marginTop: 4 }}>
            Showing first 100 — use the filter to narrow down.
          </p>
        )}
      </div>
    </div>
  );
}
