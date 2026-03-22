import { useState } from "react";
import { T } from "../theme.js";
import { useConfigStore } from "../stores/configStore.js";
import { useChainStore } from "../stores/chainStore.js";
import { useEmbyStore } from "../stores/embyStore.js";
import { tmdb } from "../api/tmdb.js";
import { embyEntryFor, embyStatusFor, embyImgFor } from "../api/emby.js";
import { ErrBanner } from "../components/banners.jsx";
import { SearchRow } from "../components/SearchRow.jsx";

export function SearchFirstScreen({ go }) {
  const tmdbKey   = useConfigStore(s => s.tmdbKey);
  const embyConfig = useConfigStore(s => s.embyConfig);
  const importChain = useChainStore(s => s.importChain);
  const library   = useEmbyStore(s => s.library);

  const [searchQ,   setSearchQ]   = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    setLoading(true); setError("");
    try {
      setSearchRes((await tmdb(tmdbKey, "/search/movie", { query: searchQ, include_adult: false })).results || []);
    } catch { setError("Search failed."); }
    finally { setLoading(false); }
  };

  const addFirstMovie = async (m) => {
    setLoading(true); setError("");
    try {
      const details = await tmdb(tmdbKey, `/movie/${m.id}`);
      const entry = embyEntryFor(library, details.id);
      importChain([{
        movie: { id: details.id, title: details.title, year: (details.release_date || "").slice(0, 4), poster: details.poster_path, embyId: entry?.embyId || null, collectionId: details.belongs_to_collection?.id ?? null },
        link: null,
      }]);
      go("chain");
    } catch { setError("Failed to add movie."); }
    finally { setLoading(false); }
  };

  return (
    <div className="mc-root" style={{ padding: "1.25rem", maxWidth: 560 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px", color: T.text1, letterSpacing: "-0.01em" }}>Pick your first movie</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={searchQ} autoFocus onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()} placeholder="Search TMDB…" style={{ flex: 1 }} />
        <button onClick={doSearch} disabled={loading || !searchQ.trim()} className="primary">{loading ? "…" : "Search"}</button>
      </div>
      <ErrBanner msg={error} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {searchRes.map(m => (
          <SearchRow
            key={m.id}
            movie={m}
            onSelect={addFirstMovie}
            embyStatus={embyStatusFor(library, m.id)}
            embyImgSrc={embyImgFor(embyConfig, library, m.id)}
          />
        ))}
        {searchRes.length === 0 && searchQ && !loading && <p style={{ fontSize: 13, color: T.text2 }}>No results.</p>}
      </div>
    </div>
  );
}
