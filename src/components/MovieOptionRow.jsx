import { T } from "../theme.js";
import { Poster } from "./Poster.jsx";
import { EmbyDot } from "./primitives.jsx";

// A candidate movie row on the pick-movie screen.
// option = { movie, watched }
// Clicking the row calls onClick(); link chips are rendered by the parent.
export function MovieOptionRow({ option, onClick, isSelected, disabled, embyStatus, embyImgSrc }) {
  const { movie, watched } = option;
  return (
    <div
      onClick={() => !disabled && onClick?.()}
      style={{
        display: "flex", gap: 12, padding: "10px 12px",
        background: watched ? T.bg1 : T.bg2,
        border: `1px solid ${isSelected ? T.accent : T.border}`,
        borderRadius: isSelected ? "8px 8px 0 0" : 8,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "default" : "pointer",
        transition: "border-color 0.15s",
      }}
    >
      <Poster tmdbPath={movie.poster_path} embyImgSrc={embyImgSrc} title={movie.title} size={52} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: watched ? T.text2 : T.text1, lineHeight: 1.3 }}>{movie.title}</div>
            {watched && <span style={{ fontSize: 9, fontWeight: 700, color: T.text3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Watched</span>}
          </div>
          {embyStatus && !watched && <EmbyDot status={embyStatus} />}
        </div>
        <div style={{ fontSize: 12, color: T.text2, display: "flex", alignItems: "center", gap: 8 }}>
          <span>{(movie.release_date || "").slice(0, 4)}</span>
          {movie.vote_average > 0 && (
            <span style={{ color: T.star, display: "flex", alignItems: "center", gap: 3 }}>
              ★ {movie.vote_average.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", color: isSelected ? T.accent : T.text3, fontSize: 16, flexShrink: 0 }}>
        {isSelected ? "▾" : "›"}
      </div>
    </div>
  );
}
