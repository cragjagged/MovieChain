import { T } from "../theme.js";
import { TYPE_STYLE } from "../constants.js";

// Clickable chip showing "Person Name · TYPE". Clicking calls onClick().
// Disabled state is used while pickMovie() is in flight.
export function LinkChip({ link, onClick, disabled }) {
  const s = TYPE_STYLE[link.type] || TYPE_STYLE.Editor;
  return (
    <span
      onClick={e => { e.stopPropagation(); !disabled && onClick && onClick(); }}
      title={`Link via ${link.person.name} (${link.type})`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: disabled ? T.bg3 : s.bg,
        color: disabled ? T.text2 : s.color,
        fontSize: 11, fontWeight: 500,
        padding: "4px 8px", borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
        whiteSpace: "nowrap",
        border: `1px solid ${disabled ? T.border : s.color + "33"}`,
        transition: "opacity 0.1s",
      }}
    >
      <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", color: disabled ? T.text2 : T.text1 }}>{link.person.name}</span>
      <span style={{ color: T.text3 }}>·</span>
      <span style={{ color: disabled ? T.text3 : s.color, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>{link.type}</span>
    </span>
  );
}
