import { T } from "../theme.js";

export function ErrBanner({ msg, onDismiss }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "10px 14px", marginBottom: 14,
      background: T.dangerDim, border: `1px solid ${T.danger}44`,
      borderLeft: `3px solid ${T.danger}`,
      borderRadius: 6, fontSize: 13, color: T.danger,
      display: "flex", gap: 8, alignItems: "flex-start",
    }}>
      <span style={{ flex: 1, lineHeight: 1.5 }}>{msg}</span>
      {onDismiss && <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, color: T.danger, lineHeight: 1, opacity: 0.7 }}>✕</button>}
    </div>
  );
}

export function InfoBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "10px 14px", marginBottom: 14,
      background: T.accentDim, border: `1px solid ${T.accent}33`,
      borderLeft: `3px solid ${T.accent}`,
      borderRadius: 6, fontSize: 13, color: T.accent, lineHeight: 1.5,
    }}>{msg}</div>
  );
}

export function WarnBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "10px 14px", marginBottom: 14,
      background: T.warnDim, border: `1px solid ${T.warn}33`,
      borderLeft: `3px solid ${T.warn}`,
      borderRadius: 6, fontSize: 12, color: T.warn, lineHeight: 1.5,
    }}>{msg}</div>
  );
}
