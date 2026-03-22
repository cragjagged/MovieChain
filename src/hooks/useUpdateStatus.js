import { useState, useEffect, useRef } from 'react';

export function useUpdateStatus() {
  const [serverState, setServerState]   = useState(null);
  const [needsReload, setNeedsReload]   = useState(false);
  const wasRestartingRef                = useRef(false);

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

  return {
    state:         serverState,
    needsReload,
    dismissReload: () => setNeedsReload(false),
    triggerUpdate: () => fetch('/api/update/apply', { method: 'POST' }).catch(() => {}),
    triggerCheck:  () => fetch('/api/update/check', { method: 'POST' }).catch(() => {}),
  };
}
