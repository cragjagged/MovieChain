import { useState, useEffect, useRef } from 'react';

export function useUpdateStatus() {
  const [serverState, setServerState]     = useState(null);
  const [needsReload, setNeedsReload]     = useState(false);
  const [dismissedLabel, setDismissedLabel] = useState(null);
  const wasRestartingRef                  = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    let es;
    let reconnectTimer;

    function connect() {
      es = new EventSource('/api/update/status');
      es.onmessage = e => {
        try {
          const data = JSON.parse(e.data);
          if (wasRestartingRef.current && data.phase === 'idle') setNeedsReload(true);
          wasRestartingRef.current = data.phase === 'restarting';
          setServerState(data);
        } catch {}
      };
      es.onerror = () => {
        es.close();
        if (wasRestartingRef.current) { setNeedsReload(true); wasRestartingRef.current = false; }
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => { clearTimeout(reconnectTimer); es?.close(); };
  }, []);

  const [lastChecked, setLastChecked]   = useState(null);
  const [manualSource, setManualSource] = useState(false);

  // Reset manualSource once the update moves out of the available phase
  useEffect(() => {
    if (serverState?.phase !== 'available') setManualSource(false);
  }, [serverState?.phase]);

  const availableDismissed = dismissedLabel !== null &&
    serverState?.phase === 'available' &&
    serverState.label === dismissedLabel;

  return {
    state:             serverState,
    needsReload,
    lastChecked,
    manualSource,
    dismissReload:     () => setNeedsReload(false),
    triggerUpdate:     () => fetch('/api/update/apply', { method: 'POST' }).catch(() => {}),
    triggerCheck:      () => fetch('/api/update/check', { method: 'POST' })
      .then(r => r.json())
      .then(result => {
        setLastChecked({ at: new Date(), available: result.available });
        if (result.available) setManualSource(true);
      })
      .catch(() => {}),
    availableDismissed,
    dismissAvailable:  () => setDismissedLabel(serverState?.label ?? ''),
  };
}
