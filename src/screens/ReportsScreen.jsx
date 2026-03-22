import { useState, useRef } from "react";
import { useChainStore } from "../stores/chainStore.js";
import { useConfigStore } from "../stores/configStore.js";
import { ALL_TYPES, TYPE_STYLE } from "../constants.js";
import { T } from "../theme.js";

const DEFAULT_LIMIT = 5;
const STEP = 5;

const REPORTS = [
  { id: "link-types",  title: "Link types" },
  { id: "other-links", title: "Top other links" },
  { id: "top-people",  title: "Top people" },
];
const DEFAULT_ORDER = REPORTS.map(r => r.id);

// ── Drag-handle grip icon ────────────────────────────────────────────────────
function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" style={{ display: "block" }}>
      <circle cx="3" cy="2"  r="1.5" /><circle cx="7" cy="2"  r="1.5" />
      <circle cx="3" cy="7"  r="1.5" /><circle cx="7" cy="7"  r="1.5" />
      <circle cx="3" cy="12" r="1.5" /><circle cx="7" cy="12" r="1.5" />
    </svg>
  );
}

// ── Shared card shell ────────────────────────────────────────────────────────
function ReportCard({ title, open, onToggle, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver, children }) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        background: T.bg1,
        border: `1px solid ${isDragOver ? T.accent : T.border}`,
        borderRadius: 8,
        overflow: "hidden",
        transition: "border-color 0.12s",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch", borderBottom: open ? `1px solid ${T.border}` : "none" }}>
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          style={{ padding: "0 8px 0 12px", display: "flex", alignItems: "center", color: T.text3, cursor: "grab", flexShrink: 0 }}
        >
          <GripIcon />
        </div>
        <button
          className="ghost"
          onClick={onToggle}
          style={{ flex: 1, padding: "10px 12px 10px 4px", borderRadius: 0, border: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {title}
          </span>
          <span style={{ fontSize: 10, color: T.text3 }}>{open ? "▾" : "▸"}</span>
        </button>
      </div>
      {open && <div style={{ padding: "1rem 1.25rem" }}>{children}</div>}
    </div>
  );
}

// ── Chart content components (no card wrapper) ───────────────────────────────

function LinkTypeBar({ type, count, max }) {
  const style = TYPE_STYLE[type];
  const dim = count === 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 28px", alignItems: "center", gap: 10, opacity: dim ? 0.35 : 1 }}>
      <span style={{ fontSize: 13, color: dim ? T.text3 : style.color, fontWeight: 500, textAlign: "right" }}>{type}</span>
      <div style={{ height: 18, borderRadius: 4, background: T.bg2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${(count / max) * 100}%`,
          background: style.bg, borderRight: count > 0 ? `2px solid ${style.color}` : "none",
          borderRadius: 4, transition: "width 0.3s ease",
        }} />
      </div>
      <span style={{ fontSize: 13, color: dim ? T.text3 : T.text2, fontWeight: 600, textAlign: "right" }}>{count}</span>
    </div>
  );
}

function LinkTypeContent({ entries }) {
  const counts = Object.fromEntries(ALL_TYPES.map(t => [t, 0]));
  let otherCount = 0;
  for (const entry of entries) {
    const type = entry?.link?.type;
    if (!type) continue;
    if (type in counts) counts[type]++;
    else otherCount++;
  }
  const max = Math.max(1, ...Object.values(counts), otherCount);
  const total = entries.filter(e => e.link).length;
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ALL_TYPES.map(type => <LinkTypeBar key={type} type={type} count={counts[type]} max={max} />)}
        <LinkTypeBar type="Other" count={otherCount} max={max} />
      </div>
      {total > 0 && (
        <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.text3, textAlign: "right" }}>
          {total} link{total !== 1 ? "s" : ""} total
        </div>
      )}
    </>
  );
}

function OtherTypeContent({ entries }) {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const tally = {};
  for (const entry of entries) {
    const type = entry?.link?.type;
    if (!type || ALL_TYPES.includes(type)) continue;
    tally[type] = (tally[type] || 0) + 1;
  }
  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>No custom link types used yet.</p>;

  const visible = ranked.slice(0, limit);
  const max = ranked[0][1];
  const remaining = ranked.length - limit;
  return (
    <>
      <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map(([type, count], i) => (
          <div key={type} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: T.text3, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 13, color: T.text1, fontWeight: 500 }}>{type}</span>
              <div style={{ height: 6, borderRadius: 3, background: T.bg2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: T.accent, opacity: 0.5, borderRadius: 3 }} />
              </div>
            </div>
            <span style={{ fontSize: 13, color: T.text2, fontWeight: 600, textAlign: "right" }}>{count}</span>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <button className="ghost" onClick={() => setLimit(l => l + STEP)}
          style={{ marginTop: 10, width: "100%", fontSize: 12, color: T.text3 }}>
          Show {Math.min(STEP, remaining)} more ({remaining} remaining)
        </button>
      )}
    </>
  );
}

function TopPeopleContent({ entries }) {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const tally = {};
  for (const entry of entries) {
    const link = entry?.link;
    if (!link?.person?.personId) continue;
    const { personId, name } = link.person;
    if (!tally[personId]) tally[personId] = { personId, name, count: 0, types: new Set() };
    tally[personId].count++;
    if (link.type && TYPE_STYLE[link.type]) tally[personId].types.add(link.type);
  }
  const ranked = Object.values(tally).sort((a, b) => b.count - a.count);
  if (ranked.length === 0) return <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>No people links recorded yet.</p>;

  const visible = ranked.slice(0, limit);
  const max = ranked[0].count;
  const remaining = ranked.length - limit;
  return (
    <>
      <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map(({ personId, name, count, types }, i) => (
          <div key={personId} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: T.text3, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 13, color: T.text1, fontWeight: 500 }}>{name}</span>
              <div style={{ height: 6, borderRadius: 3, background: T.bg2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: T.accent, opacity: 0.5, borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
              <span style={{ fontSize: 13, color: T.text2, fontWeight: 600 }}>{count}</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[...types].map(t => (
                  <span key={t} style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: TYPE_STYLE[t].bg, color: TYPE_STYLE[t].color, fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <button className="ghost" onClick={() => setLimit(l => l + STEP)}
          style={{ marginTop: 10, width: "100%", fontSize: 12, color: T.text3 }}>
          Show {Math.min(STEP, remaining)} more ({remaining} remaining)
        </button>
      )}
    </>
  );
}

const CONTENT_MAP = {
  "link-types":  LinkTypeContent,
  "other-links": OtherTypeContent,
  "top-people":  TopPeopleContent,
};

// ── Screen ───────────────────────────────────────────────────────────────────
export function ReportsScreen() {
  const entries = useChainStore(s => s.entries);
  const reportsLayout = useConfigStore(s => s.reportsLayout);
  const setReportsLayout = useConfigStore(s => s.setReportsLayout);

  const order     = reportsLayout?.order     ?? DEFAULT_ORDER;
  const collapsed = reportsLayout?.collapsed ?? {};

  const dragSrcId = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const toggleCollapsed = (id) => {
    setReportsLayout({ order, collapsed: { ...collapsed, [id]: !collapsed[id] } });
  };

  const handleDrop = (targetId) => {
    const srcId = dragSrcId.current;
    if (!srcId || srcId === targetId) return;
    const next = [...order];
    next.splice(next.indexOf(srcId), 1);
    next.splice(next.indexOf(targetId), 0, srcId);
    setReportsLayout({ order: next, collapsed });
    dragSrcId.current = null;
    setDragOver(null);
  };

  return (
    <div style={{ padding: "1.25rem" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px", color: T.text1, letterSpacing: "-0.01em" }}>Reports</h2>
      {entries.length < 2 ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 8 }}>
          <p style={{ fontSize: 14, color: T.text3, margin: 0 }}>Add at least two movies to see reports.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {order.map(id => {
            const report = REPORTS.find(r => r.id === id);
            if (!report) return null;
            const Content = CONTENT_MAP[id];
            return (
              <ReportCard
                key={id}
                title={report.title}
                open={!collapsed[id]}
                onToggle={() => toggleCollapsed(id)}
                onDragStart={() => { dragSrcId.current = id; }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(id); }}
                onDrop={() => handleDrop(id)}
                onDragEnd={() => { dragSrcId.current = null; setDragOver(null); }}
                isDragOver={dragOver === id}
              >
                <Content entries={entries} />
              </ReportCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
