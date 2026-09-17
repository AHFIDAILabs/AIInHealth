import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { CheckCircle2, XCircle, Search, ScanLine, UserCheck } from 'lucide-react';
import { fetchCheckInStats, scanQrToken, searchCheckIn, manualCheckIn, type CheckInSummary, type CheckInSearchResult } from '../../services/checkin.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { QrScanner } from '../../components/admin/QrScanner';

const SOCKET_URL = ((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/api\/?.*$/, '');

type Feedback = { kind: 'success' | 'error'; text: string; sub?: string } | null;

export const CheckInPage = () => {
  const toast = useToast();
  const [stats, setStats] = useState<{ confirmed: number; checkedIn: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [recent, setRecent] = useState<CheckInSummary[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CheckInSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualBusy, setManualBusy] = useState<string | null>(null);
  const scanLockRef = useRef(false);

  const loadStats = useCallback(() => {
    fetchCheckInStats().then(setStats).catch(() => {});
  }, []);

  useEffect(loadStats, [loadStats]);

  // Live feed of check-ins from any device/staff member scanning right now.
  useEffect(() => {
    const socket: Socket = io(`${SOCKET_URL}/admin`, { withCredentials: true });
    socket.on('checkin', (payload: CheckInSummary) => {
      setRecent((prev) => [payload, ...prev].slice(0, 20));
      setStats((prev) => (prev ? { ...prev, checkedIn: prev.checkedIn + 1 } : prev));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleScanResult = useCallback(
    async (qrToken: string) => {
      if (scanLockRef.current) return;
      scanLockRef.current = true;
      try {
        const summary = await scanQrToken(qrToken);
        setFeedback({ kind: 'success', text: `${summary.name} checked in`, sub: summary.organization || summary.ticketCategory });
        setRecent((prev) => [summary, ...prev].slice(0, 20));
        loadStats();
      } catch (err) {
        setFeedback({ kind: 'error', text: getApiErrorMessage(err, "That code didn't check in.") });
      } finally {
        setTimeout(() => {
          scanLockRef.current = false;
        }, 2000);
      }
    },
    [loadStats]
  );

  const runSearch = useCallback((value: string) => {
    setQ(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchCheckIn(value.trim())
      .then(setResults)
      .catch(() => {})
      .finally(() => setSearching(false));
  }, []);

  const doManualCheckIn = async (result: CheckInSearchResult) => {
    setManualBusy(result.id);
    try {
      const summary = await manualCheckIn(result.id);
      toast('success', `${summary.name} checked in`);
      setResults((prev) => prev.map((r) => (r.id === result.id ? { ...r, checkedIn: true } : r)));
      setRecent((prev) => [summary, ...prev].slice(0, 20));
      loadStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setManualBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Check-In</h1>
          <p className="text-sm text-slate-500">Scan a delegate&rsquo;s QR e-ticket, or search by name/email.</p>
        </div>
        {stats && (
          <div className="flex gap-4 rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover px-4 py-2.5 text-center">
            <div title="Across every registration type (attendees, exhibitors, sponsors, volunteers) — see the Attendees page for attendee-only figures.">
              <p className="font-display text-lg font-bold text-navy">{stats.checkedIn}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Checked In (All)</p>
            </div>
            <div
              className="border-l border-slate-100 pl-4"
              title="Across every registration type (attendees, exhibitors, sponsors, volunteers) — see the Attendees page for attendee-only figures."
            >
              <p className="font-display text-lg font-bold text-navy">{stats.confirmed}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Confirmed (All)</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Scanner */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <ScanLine size={14} /> Camera Scanner
          </p>
          <div className="mt-3">
            <QrScanner onScan={handleScanResult} />
          </div>
          {feedback && (
            <div
              className={`mt-3 flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                feedback.kind === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              }`}
            >
              {feedback.kind === 'success' ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
              <span>
                {feedback.text}
                {feedback.sub && <span className="ml-1 opacity-70">— {feedback.sub}</span>}
              </span>
            </div>
          )}
        </div>

        {/* Manual search */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Search size={14} /> Manual Search
          </p>
          <input
            value={q}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search name or email..."
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
          <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
            {searching && <p className="py-4 text-center text-xs text-slate-400">Searching…</p>}
            {!searching && q.trim().length >= 2 && results.length === 0 && (
              <p className="py-4 text-center text-xs text-slate-400">No confirmed registrations match.</p>
            )}
            {results.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 ${r.isActive === false ? 'opacity-60' : ''}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-navy">{r.name}</p>
                  <p className="truncate text-xs text-slate-400">{r.organization || r.ticketCategory || r.type}</p>
                </div>
                {r.isActive === false ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                    Inactive
                  </span>
                ) : r.checkedIn ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-success">
                    <CheckCircle2 size={14} /> In
                  </span>
                ) : (
                  <button
                    onClick={() => doManualCheckIn(r)}
                    disabled={manualBusy === r.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                  >
                    <UserCheck size={13} /> Check In
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live feed */}
      <div className="mt-5 rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Check-Ins</p>
        {recent.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-slate-400">Check-ins from any device will appear here live.</p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {recent.map((r, i) => (
              <div key={`${r.id}-${i}`} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-navy">{r.name}</p>
                  <p className="truncate text-xs text-slate-400">{r.organization || r.ticketCategory}</p>
                </div>
                {r.checkedInAt && (
                  <span className="shrink-0 text-xs text-slate-400">{new Date(r.checkedInAt).toLocaleTimeString()}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
