import { T } from '../theme.js';

const PHASE_LABEL = {
  downloading: 'Downloading…',
  extracting:  'Extracting…',
  installing:  'Installing dependencies…',
  building:    'Building…',
  applying:    'Applying update…',
  restarting:  'Restarting server…',
};

const bannerBase = {
  position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
  color: '#fff', padding: '10px 16px',
  display: 'flex', alignItems: 'center', gap: 10,
  fontSize: 13, fontFamily: 'inherit',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
};

const ghostBtn = {
  fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
  color: 'rgba(255,255,255,0.8)', fontFamily: 'inherit', fontWeight: 500,
};

const solidBtn = { ...ghostBtn, background: 'rgba(255,255,255,0.25)', color: '#fff' };

export function UpdateBanner({ state, needsReload, dismissReload, triggerUpdate, availableDismissed, dismissAvailable }) {

  if (needsReload) {
    return (
      <div style={{ ...bannerBase, background: T.success }}>
        <span style={{ fontWeight: 600 }}>Update installed</span>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Reload to run the new version.</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={solidBtn} onClick={() => window.location.reload()}>Reload now</button>
          <button style={ghostBtn} onClick={dismissReload}>Later</button>
        </div>
      </div>
    );
  }

  if (!state || state.phase === 'idle' || state.phase === 'error') return null;

  if (state.phase === 'available') {
    if (availableDismissed) return null;
    return (
      <div style={{ ...bannerBase, background: T.accent }}>
        <span style={{ fontWeight: 600 }}>Update available</span>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{state.label}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={solidBtn} onClick={triggerUpdate}>Update now</button>
          <button style={ghostBtn} onClick={dismissAvailable}>Dismiss</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...bannerBase, background: T.accent }}>
      <Spinner />
      <span>{PHASE_LABEL[state.phase] ?? state.phase}</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'mc-spin 1s linear infinite', flexShrink: 0 }}>
      <style>{`@keyframes mc-spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
