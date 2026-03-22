// Small pure UI primitives — all stateless, all colours from the T theme object.
import { T } from "../theme.js";
import { TYPE_STYLE } from "../constants.js";

/** Uppercase credit type pill: ACTOR, DIRECTOR, etc. Used in chain connectors. */
export function Badge({ type, large }) {
  const s = TYPE_STYLE[type] || TYPE_STYLE.Editor;
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: large ? 11 : 10, fontWeight: 600, letterSpacing: "0.04em",
      padding: large ? "3px 9px" : "2px 6px",
      borderRadius: 4, whiteSpace: "nowrap", textTransform: "uppercase",
    }}>{type}</span>
  );
}

export function StatusPill({ children, variant = "neutral" }) {
  const vars = {
    neutral: { bg: T.bg3,        color: T.text2 },
    success: { bg: T.successDim, color: T.success },
    warn:    { bg: T.warnDim,    color: T.warn },
    danger:  { bg: T.dangerDim,  color: T.danger },
  }[variant] || { bg: T.bg3, color: T.text2 };
  return (
    <span style={{ background: vars.bg, color: vars.color, fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", padding: "3px 9px", borderRadius: 4, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function Toggle({ value, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: T.text2, userSelect: "none" }}>
      <div onClick={() => onChange(!value)} style={{
        width: 34, height: 20, borderRadius: 10, flexShrink: 0,
        background: value ? T.accent : T.bg3,
        border: `1px solid ${value ? T.accent : T.borderHov}`,
        position: "relative", transition: "background 0.15s, border-color 0.15s", cursor: "pointer",
      }}>
        <div style={{
          position: "absolute", top: 2, left: value ? 15 : 2,
          width: 14, height: 14, borderRadius: "50%",
          background: value ? "#fff" : T.text2, transition: "left 0.15s",
        }} />
      </div>
      {label}
    </label>
  );
}

// Emby status indicator dot shown on movie rows.
// status: "available" | "watched" | "missing"
export function EmbyDot({ status }) {
  const cfg = {
    available: { color: T.success, label: "In Emby" },
    watched:   { color: T.text3,   label: "Watched" },
    missing:   { color: T.text3,   label: "Not in Emby" },
  }[status];
  if (!cfg) return null;
  return (
    <span style={{ fontSize: 10, color: cfg.color, display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap", fontWeight: 500, letterSpacing: "0.03em", textTransform: "uppercase" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, display: "inline-block", flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

export function BackBtn({ onBack, label = "← Back" }) {
  return (
    <button onClick={onBack} style={{
      fontSize: 12, marginBottom: 20, color: T.text2, background: "none",
      border: "none", cursor: "pointer", padding: "4px 0",
      display: "flex", alignItems: "center", gap: 4, fontWeight: 500,
      letterSpacing: "0.02em",
    }}>{label}</button>
  );
}

export function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text3, marginBottom: 10 }}>
      {children}
    </div>
  );
}

export function Card({ children, accent, style: extra }) {
  return (
    <div style={{
      background: T.bg2, borderRadius: 8,
      border: `1px solid ${T.border}`,
      borderLeft: accent ? `3px solid ${accent}` : undefined,
      overflow: "hidden", ...extra,
    }}>{children}</div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: T.border, margin: "16px 0" }} />;
}
