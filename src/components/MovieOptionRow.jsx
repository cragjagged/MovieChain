import { T } from "../theme.js";
import { Poster } from "./Poster.jsx";
import { LinkChip } from "./LinkChip.jsx";
import { EmbyDot } from "./primitives.jsx";

// A candidate movie row on the pick-movie screen.
// option = { movie, links[], watched }
// Clicking a LinkChip calls onSelect(movie, link). Multiple chips appear
// when a film is reachable via more than one person/type combination.
export function MovieOptionRow({ option, onSelect, disabled, embyStatus, embyImgSrc }) {
  const { movie, links, watched } = option;
  return (
    <div style={{
      display: "flex", gap: 12, padding: "10px 12px",
      background: watched ? T.bg1 : T.bg2,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      opacity: disabled ? 0.5 : 1,
      transition: "border-color 0.15s",
    }}>
      <Poster tmdbPath={movie.poster_path} embyImgSrc={embyImgSrc} title={movie.title} size={52} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: watched ? T.text2 : T.text1, lineHeight: 1.3 }}>{movie.title}</div>
            {watched && <span style={{ fontSize: 9, fontWeight: 700, color: T.text3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Watched</span>}
          </div>
          {embyStatus && !watched && <EmbyDot status={embyStatus} />}
        </div>
        <div style={{ fontSize: 12, color: T.text2, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span>{(movie.release_date || "").slice(0, 4)}</span>
          {movie.vote_average > 0 && (
            <span style={{ color: T.star, display: "flex", alignItems: "center", gap: 3 }}>
              ★ {movie.vote_average.toFixed(1)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {links.map((link, i) => (
            <LinkChip key={i} link={link} disabled={disabled} onClick={() => !disabled && onSelect(movie, link)} />
          ))}
        </div>
      </div>
    </div>
  );
}
