import { T } from "../theme.js";
import { Poster } from "./Poster.jsx";
import { EmbyDot } from "./primitives.jsx";

// TMDB search result row used on the "search-first" screen.
// Shows title, year, rating, and Emby availability dot.
export function SearchRow({ movie, onSelect, embyImgSrc, embyStatus }) {
  return (
    <div onClick={() => onSelect(movie)} style={{
      display: "flex", gap: 12, alignItems: "center", padding: "10px 14px",
      background: T.bg2, border: `1px solid ${T.border}`,
      borderRadius: 8, cursor: "pointer", transition: "border-color 0.15s",
    }}>
      <Poster tmdbPath={movie.poster_path} embyImgSrc={embyImgSrc} title={movie.title} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: T.text1, marginBottom: 3 }}>{movie.title}</div>
        <div style={{ fontSize: 12, color: T.text2, display: "flex", gap: 8 }}>
          <span>{(movie.release_date || "").slice(0, 4)}</span>
          {movie.vote_average > 0 && <span style={{ color: T.star }}>★ {movie.vote_average.toFixed(1)}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
        {embyStatus && <EmbyDot status={embyStatus} />}
        <span style={{ fontSize: 11, color: T.accent, fontWeight: 500 }}>Select →</span>
      </div>
    </div>
  );
}
