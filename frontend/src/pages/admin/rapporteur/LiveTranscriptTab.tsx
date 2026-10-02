import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Radio, Mic, Square, FileText } from 'lucide-react';
import {
  adminListLiveTranscriptSessions,
  adminGetLiveTranscript,
  adminStartLiveTranscript,
  adminStopLiveTranscript,
  adminUploadLiveTranscriptChunk,
  type LiveTranscriptSession,
  type LiveTranscriptSegment,
} from '../../../services/rapporteur.service';
import { getApiErrorMessage } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { useAudioRecorder } from '../../../hooks/useAudioRecorder';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';

const SOCKET_URL = ((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/api\/?.*$/, '');
const CHUNK_SECONDS = 25;

export const LiveTranscriptTab = () => {
  const toast = useToast();
  const [sessions, setSessions] = useState<LiveTranscriptSession[] | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [segments, setSegments] = useState<LiveTranscriptSegment[]>([]);
  const [status, setStatus] = useState<'idle' | 'recording' | 'ended'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const recorder = useAudioRecorder({ maxDurationSec: CHUNK_SECONDS });
  // Tracks whether the continuous capture loop (below) should keep going —
  // a ref, not state, since the loop's own async chain reads it between
  // awaits and a stale closure over state would miss a Stop click mid-chunk.
  const loopActiveRef = useRef(false);

  const loadSessions = useCallback(() => {
    adminListLiveTranscriptSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);
  useEffect(loadSessions, [loadSessions]);

  // Socket: keeps this tab (and any other admin watching) in sync with the
  // session actually being captured, including segments appended by whichever
  // admin's browser is driving the recording loop.
  useEffect(() => {
    const socket: Socket = io(`${SOCKET_URL}/admin`, { withCredentials: true });
    socket.on('live-transcript-segment', (payload: { sessionId: string; text: string; capturedAt: string }) => {
      if (payload.sessionId === sessionId) setSegments((prev) => [...prev, { text: payload.text, capturedAt: payload.capturedAt }]);
    });
    socket.on('live-transcript-status', (payload: { sessionId: string; status: typeof status }) => {
      if (payload.sessionId === sessionId) setStatus(payload.status);
      loadSessions();
    });
    return () => {
      socket.disconnect();
    };
  }, [sessionId, loadSessions]);

  const selectSession = async (id: string) => {
    setSessionId(id);
    setSegments([]);
    setStatus('idle');
    if (!id) return;
    try {
      const detail = await adminGetLiveTranscript(id);
      setSegments(detail.segments);
      setStatus(detail.status);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  // The continuous capture loop: record one ~25s chunk, upload it, and — as
  // long as nothing has stopped it in the meantime — immediately start the
  // next one. Each returned segment is appended locally too (not just via the
  // socket) so the admin actually driving the capture sees it with zero
  // round-trip lag; the socket keeps every OTHER connected admin in sync.
  const runCaptureLoop = useCallback(async () => {
    while (loopActiveRef.current) {
      await recorder.start();
      const blob = await recorder.stop();
      if (!loopActiveRef.current) break;
      try {
        const segment = await adminUploadLiveTranscriptChunk(sessionId, blob);
        setSegments((prev) => [...prev, segment]);
      } catch (err) {
        // A single failed chunk (budget exceeded, transient network blip)
        // must not kill the whole capture — surface it once and keep going;
        // the next chunk may well succeed.
        setError(getApiErrorMessage(err));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const start = async () => {
    if (!sessionId) return;
    setBusy(true);
    setError('');
    try {
      await adminStartLiveTranscript(sessionId);
      setStatus('recording');
      setSegments([]);
      loopActiveRef.current = true;
      void runCaptureLoop();
      loadSessions();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    loopActiveRef.current = false;
    try {
      await adminStopLiveTranscript(sessionId);
      setStatus('ended');
      loadSessions();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  useEffect(
    () => () => {
      // Belt-and-braces: if the admin navigates away mid-capture, stop the
      // loop so an orphaned MediaRecorder doesn't keep the mic open.
      loopActiveRef.current = false;
    },
    []
  );

  if (!sessions) return <Skeleton className="h-64" />;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-100 bg-white shadow-card p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Radio size={14} /> Live Transcript Capture
        </p>
        <p className="mt-1.5 text-xs text-slate-400">
          Internal monitoring only — captures a continuous stream of ~{CHUNK_SECONDS}s clips while recording, transcribes each via
          Whisper, and discards the audio immediately after. Nothing here is shown to attendees.
        </p>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">Session</label>
          <select
            value={sessionId}
            onChange={(e) => void selectSession(e.target.value)}
            disabled={status === 'recording'}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-orange/40 focus:outline-none disabled:opacity-60"
          >
            <option value="">Select a session…</option>
            {sessions.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.day}, {s.startTime} — {s.title}
                {s.liveTranscriptStatus === 'recording' ? ' (recording)' : ''}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mt-3">
            <Banner variant="error">{error}</Banner>
          </div>
        )}
        {recorder.error && (
          <div className="mt-3">
            <Banner variant="error">{recorder.error}</Banner>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          {status === 'recording' ? (
            <button
              onClick={() => void stop()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
            >
              <Square size={14} /> Stop Capture
            </button>
          ) : (
            <button
              onClick={() => void start()}
              disabled={busy || !sessionId}
              className="flex items-center gap-1.5 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-hover disabled:opacity-50"
            >
              <Mic size={14} /> Start Capture
            </button>
          )}
          {status === 'recording' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-danger">
              <span className="h-2 w-2 animate-pulse rounded-full bg-danger" /> Recording
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-card p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <FileText size={14} /> Transcript
        </p>
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {segments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              {sessionId ? 'No transcript yet — start a capture to begin.' : 'Select a session to view its transcript.'}
            </p>
          ) : (
            segments.map((s, i) => (
              <p key={i} className="text-sm text-slate-700">
                <span className="mr-1.5 text-xs text-slate-400">{new Date(s.capturedAt).toLocaleTimeString()}</span>
                {s.text}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
