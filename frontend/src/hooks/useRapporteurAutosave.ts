import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchRapporteurReport,
  patchRapporteurReport,
  type RapporteurDraftPatch,
  type RapporteurReport,
} from '../services/rapporteur.service';
import { getDraft, setDraft, clearDraft } from '../lib/rapporteurDraftCache';

export type SyncState = 'synced' | 'pending' | 'offline' | 'error';

const emptyDraft: RapporteurDraftPatch = { keyPoints: [], decisions: [], actionItems: [], notableQuotes: [] };

// The whole offline-first autosave engine for the rapporteur form — plain
// localStorage + debounced timers, deliberately not a service worker /
// IndexedDB queue (see the Stage 1 plan: this app has no such infrastructure
// to extend, and this feature's needs are simple enough not to need one).
//
// Two independent debounces run off the same field change:
//   - 600ms -> localStorage (the actual offline guarantee, zero network)
//   - 3s    -> server PATCH (best-effort; retried by the interval/online
//              listener below until it lands)
export const useRapporteurAutosave = (token: string) => {
  const [report, setReport] = useState<RapporteurReport | null>(null);
  const [loadError, setLoadError] = useState('');
  const [data, setData] = useState<RapporteurDraftPatch>(emptyDraft);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  // Mount: fetch the server's current state, then compare against any local
  // draft. A single-writer form (one rapporteur, their own link) makes
  // last-write-wins by `updatedAt` the correct and simplest merge rule — no
  // field-by-field reconciliation needed.
  useEffect(() => {
    let cancelled = false;
    fetchRapporteurReport(token)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        const local = getDraft(token);
        const useLocal = local && new Date(local.updatedAt).getTime() > new Date(r.updatedAt).getTime();
        setData(
          useLocal
            ? {
                keyPoints: local!.keyPoints ?? r.keyPoints,
                decisions: local!.decisions ?? r.decisions,
                actionItems: local!.actionItems ?? r.actionItems,
                notableQuotes: local!.notableQuotes ?? r.notableQuotes,
              }
            : { keyPoints: r.keyPoints, decisions: r.decisions, actionItems: r.actionItems, notableQuotes: r.notableQuotes }
        );
        setSyncState(useLocal ? 'pending' : 'synced');
        if (!useLocal) setLastSyncedAt(new Date(r.updatedAt));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.response?.data?.error?.message ?? "This rapporteur link isn't valid.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const flushToServer = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) {
      setSyncState('offline');
      return;
    }
    if (inFlight.current) return inFlight.current;
    setSyncState('pending');
    const promise = patchRapporteurReport(token, dataRef.current)
      .then(() => {
        setSyncState('synced');
        setLastSyncedAt(new Date());
        clearDraft(token);
      })
      .catch(() => {
        setSyncState('error');
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = promise;
    return promise;
  }, [token]);

  const setField = useCallback(
    <K extends keyof RapporteurDraftPatch>(key: K, value: RapporteurDraftPatch[K]) => {
      setData((prev) => {
        const next = { ...prev, [key]: value };
        return next;
      });
      setSyncState((s) => (s === 'synced' ? 'pending' : s));

      if (localTimer.current) clearTimeout(localTimer.current);
      localTimer.current = setTimeout(() => {
        setDraft(token, dataRef.current);
      }, 600);

      if (serverTimer.current) clearTimeout(serverTimer.current);
      serverTimer.current = setTimeout(() => {
        void flushToServer();
      }, 3000);
    },
    [token, flushToServer]
  );

  // Retry loop: a 20s tick while anything other than 'synced', plus an
  // immediate retry the instant the browser regains connectivity rather than
  // waiting for the next tick.
  useEffect(() => {
    const interval = setInterval(() => {
      if (syncState !== 'synced') void flushToServer();
    }, 20000);
    const onOnline = () => void flushToServer();
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, [syncState, flushToServer]);

  // Best-effort only — localStorage already holds the latest draft regardless
  // of whether this lands, so nothing depends on it succeeding. A plain
  // `fetch` with `keepalive` (not sendBeacon, which can only POST) so the
  // request can still be a PATCH to the same endpoint the debounced flush
  // above uses.
  useEffect(() => {
    const onBeforeUnload = () => {
      try {
        void fetch(`${import.meta.env.VITE_API_URL}/rapporteur/${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataRef.current),
          keepalive: true,
        });
      } catch {
        // Nothing to recover — localStorage already holds this same draft.
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [token]);

  const saveNow = useCallback(async () => {
    if (localTimer.current) clearTimeout(localTimer.current);
    if (serverTimer.current) clearTimeout(serverTimer.current);
    setDraft(token, dataRef.current);
    await flushToServer();
  }, [token, flushToServer]);

  // Awaited by the form's Submit button before calling submitRapporteurReport
  // — makes sure whatever's still mid-debounce actually lands first.
  const flushPending = useCallback(async () => {
    if (localTimer.current) clearTimeout(localTimer.current);
    if (serverTimer.current) clearTimeout(serverTimer.current);
    await flushToServer();
  }, [flushToServer]);

  return { report, loadError, data, setField, syncState, lastSyncedAt, saveNow, flushPending };
};
