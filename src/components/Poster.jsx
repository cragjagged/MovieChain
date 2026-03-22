import { T } from "../theme.js";
import { tmdbImg } from "../api/tmdb.js";

// Movie poster image. embyImgSrc takes priority over TMDB poster_path.
// Falls back to a "NO IMAGE" placeholder if neither is available.
// Height is always 1.5× width (standard poster ratio).
export function Poster({ tmdbPath, embyImgSrc, title, size = 80 }) {
  const src = embyImgSrc || tmdbImg(tmdbPath);
  return src ? (
    <img src={src} alt={title} style={{
      width: size, height: Math.round(size * 1.5), objectFit: "cover", flexShrink: 0,
      borderRadius: 6, border: `1px solid ${T.border}`, display: "block",
    }} />
  ) : (
    <div style={{
      width: size, height: Math.round(size * 1.5), flexShrink: 0, borderRadius: 6,
      border: `1px solid ${T.border}`, background: T.bg3,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 9, color: T.text3, textAlign: "center", padding: 4, letterSpacing: "0.03em",
    }}>NO IMAGE</div>
  );
}
