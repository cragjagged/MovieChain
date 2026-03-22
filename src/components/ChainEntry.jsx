import { T } from "../theme.js";
import { Poster } from "./Poster.jsx";
import { Badge } from "./primitives.jsx";

// The same chain-link icon used in the "Last Link" sidebar widget, rotated -45°
// so the two rings hang vertically rather than diagonally.
function ChainIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={T.text2} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}>
      <g transform="rotate(-45, 12, 12)">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </g>
    </svg>
  );
}

function ArrowChevron({ direction }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
      {direction === "up"
        ? <polyline points="18 15 12 9 6 15"/>
        : <polyline points="6 9 12 15 18 9"/>}
    </svg>
  );
}

// One entry in the main chain list, plus the connector below it.
// isCurrent:  true for the "Up Next" film (cyan accent).
// isPlayed:   true when Emby reports the film as watched.
// isLast:     suppresses the connector line below the final entry.
// direction:  "down" (oldest→newest) or "up" (newest→oldest) — shown in connector.
// The connector shows the person name + Badge for the link INTO the next entry.
export function ChainEntry({ movie, link, isCurrent, isPlayed, watchedDate, embyImgSrc, isLast, direction = "down" }) {
  const fmtDate = (d) => {
    if (!d) return null;
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

  const borderColor = isCurrent ? T.accent : T.border;
  const bgColor     = isCurrent ? T.accentDim : isPlayed ? T.bg1 : T.bg2;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", gap: 12, alignItems: "center", padding: "12px 14px",
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${isCurrent ? T.accent : isPlayed ? T.bg3 : T.border}`,
        borderRadius: 8,
        opacity: isPlayed && !isCurrent ? 0.6 : 1,
      }}>
        <Poster tmdbPath={movie.poster} embyImgSrc={embyImgSrc} title={movie.title} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: isPlayed && !isCurrent ? T.text2 : T.text1, lineHeight: 1.3, marginBottom: 3 }}>{movie.title}</div>
          <div style={{ fontSize: 12, color: T.text2 }}>{movie.year}</div>
          {watchedDate && (
            <div style={{ fontSize: 11, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, fontSize: 9 }}>Watched</span>
              <span style={{ color: T.text2 }}>{fmtDate(watchedDate)}</span>
            </div>
          )}
        </div>
        {isCurrent && (
          <span style={{ fontSize: 9, fontWeight: 700, color: T.accent, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0, background: T.accentDim, padding: "3px 8px", borderRadius: 4 }}>Up Next</span>
        )}
        {!isCurrent && !isPlayed && (
          <span style={{ fontSize: 9, fontWeight: 700, color: T.text3, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>Upcoming</span>
        )}
        {!isCurrent && isPlayed && (
          <span style={{ fontSize: 9, fontWeight: 700, color: T.success, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>Watched</span>
        )}
      </div>
      {!isLast && link && (
        <div style={{ display: "flex", padding: "0 14px" }}>
          {/* Left column: wire → chain icon → wire */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div style={{ width: 1, flex: 1, background: T.text2, opacity: 0.35 }} />
            <ChainIcon size={13} />
            <div style={{ width: 1, flex: 1, background: T.text2, opacity: 0.35 }} />
          </div>
          {/* Centre column: wire → pill → wire */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 1, height: 10, background: T.text2, opacity: 0.35 }} />
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: T.bg2, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: "4px 12px",
            }}>
              <ArrowChevron direction={direction} />
              <span style={{ fontSize: 12, color: T.text2 }}>{link.person.name}</span>
              <Badge type={link.type} />
              <ArrowChevron direction={direction} />
            </div>
            <div style={{ width: 1, height: 10, background: T.text2, opacity: 0.35 }} />
          </div>
          {/* Right column: wire → chain icon → wire */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div style={{ width: 1, flex: 1, background: T.text2, opacity: 0.35 }} />
            <ChainIcon size={13} />
            <div style={{ width: 1, flex: 1, background: T.text2, opacity: 0.35 }} />
          </div>
        </div>
      )}
    </div>
  );
}
