import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Users, Search, UserCheck } from 'lucide-react';
import { SEO } from '../../components/seo/SEO';
import { Banner } from '../../components/ui/Banner';
import { QrScanner } from '../../components/admin/QrScanner';
import {
  fetchSessionAttendanceInfo,
  scanSessionAttendance,
  searchSessionAttendees,
  manualRecordSessionAttendance,
  type SessionAttendanceInfo,
  type ScannedAttendee,
  type ScanAttendanceResult,
  type AttendeeSearchResult,
} from '../../services/sessionAttendance.service';
import { getApiErrorMessage } from '../../services/api';

type Flash = { kind: 'recorded' | 'already_recorded' | 'error'; text: string; sub?: string } | null;

// The volunteer-facing scanning page — no login, the token in the URL is the
// whole credential (see backend sessionAttendance.middleware.ts). Built to be
// read at a glance by someone standing at a doorway with people streaming
// past, not studied: one big camera view, one big result flash, nothing else
// to tap or configure. Reuses the exact same <QrScanner> component as the
// main-entrance check-in desk — same camera library, same "upload an image"
// fallback — so there's no new scanning code to trust on event night.
export const SessionAttendancePortal = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [info, setInfo] = useState<SessionAttendanceInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const scanLockRef = useRef(false);
  const [showManual, setShowManual] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState<AttendeeSearchResult[]>([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [manualBusyId, setManualBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchSessionAttendanceInfo(token)
      .then(setInfo)
      .catch((err) => setLoadError(getApiErrorMessage(err, 'This attendance link is invalid or has expired.')));
  }, [token]);

  useEffect(load, [load]);

  const describeAttendee = (attendee: ScannedAttendee): string | undefined =>
    [attendee.organization, attendee.ticketCategory].filter(Boolean).join(' · ') || undefined;

  // Shared by a real scan and a manual-search pick below — same flash/count
  // update either way, so the volunteer sees identical feedback regardless
  // of which path actually recorded the person.
  const applyResult = useCallback((res: ScanAttendanceResult) => {
    setFlash({
      kind: res.status,
      text: res.status === 'recorded' ? res.attendee.name : `${res.attendee.name} — already scanned`,
      sub: describeAttendee(res.attendee),
    });
    if (res.status === 'recorded') {
      setInfo((prev) => (prev ? { ...prev, count: prev.count + 1 } : prev));
    }
  }, []);

  const handleScan = useCallback(
    async (qrToken: string) => {
      // Same 2s cooldown as the main check-in desk's QrScanner usage — the
      // camera keeps firing onScan for every frame the same code stays in
      // view, so without this one badge would otherwise register as several
      // rapid scans.
      if (scanLockRef.current) return;
      scanLockRef.current = true;
      try {
        const res = await scanSessionAttendance(token, qrToken);
        applyResult(res);
      } catch (err) {
        setFlash({ kind: 'error', text: getApiErrorMessage(err, "That code didn't scan.") });
      } finally {
        setTimeout(() => {
          scanLockRef.current = false;
        }, 2000);
      }
    },
    [token, applyResult]
  );

  const runManualSearch = (q: string) => {
    setManualQuery(q);
    if (q.trim().length < 2) {
      setManualResults([]);
      return;
    }
    setManualSearching(true);
    searchSessionAttendees(token, q.trim())
      .then(setManualResults)
      .catch(() => setManualResults([]))
      .finally(() => setManualSearching(false));
  };

  const pickManualResult = async (result: AttendeeSearchResult) => {
    const busyKey = result.memberIndex !== undefined ? `${result.id}-${result.memberIndex}` : result.id;
    setManualBusyId(busyKey);
    try {
      const res = await manualRecordSessionAttendance(token, result.id, result.memberIndex);
      applyResult(res);
      setManualQuery('');
      setManualResults([]);
    } catch (err) {
      setFlash({ kind: 'error', text: getApiErrorMessage(err, "Couldn't record that person.") });
    } finally {
      setManualBusyId(null);
    }
  };

  if (loadError) {
    return (
      <section className="bg-offwhite py-20">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <Banner variant="error">{loadError}</Banner>
        </div>
      </section>
    );
  }

  if (!info) {
    return (
      <section className="bg-offwhite py-20">
        <div className="mx-auto max-w-md px-4 text-center text-sm text-slate-400">Loading your room&rsquo;s attendance scanner…</div>
      </section>
    );
  }

  return (
    <section className="bg-offwhite py-10">
      <SEO title="Session Attendance" description="Volunteer room-attendance scanner." path="/session-attendance" noindex />
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scanning for</p>
          <h1 className="mt-1 font-display text-lg font-semibold text-navy">{info.session.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {info.session.day}, {info.session.startTime} &middot; Room {info.session.room}
          </p>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-offwhite px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Users size={14} /> Scanned in
            </span>
            <span className="font-display text-xl font-bold text-orange">{info.count}</span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <QrScanner onScan={handleScan} />
        </div>

        <div className="mt-4">
          {!showManual ? (
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="w-full rounded-xl border border-dashed border-slate-300 bg-white py-3 text-center text-sm font-semibold text-slate-500 hover:border-orange/40 hover:text-orange"
            >
              Badge won&rsquo;t scan? Find them by name
            </button>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search instead</p>
              <div className="relative mt-2">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={manualQuery}
                  onChange={(e) => runManualSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
                />
              </div>
              {manualSearching && <p className="mt-2 text-xs text-slate-400">Searching…</p>}
              {!manualSearching && manualQuery.trim().length >= 2 && manualResults.length === 0 && (
                <p className="mt-2 text-xs text-slate-400">No confirmed registration matches.</p>
              )}
              {manualResults.length > 0 && (
                <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                  {manualResults.map((r) => {
                    const key = r.memberIndex !== undefined ? `${r.id}-${r.memberIndex}` : r.id;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={manualBusyId === key}
                        onClick={() => pickManualResult(r)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2.5 text-left hover:border-orange/40 hover:bg-offwhite disabled:opacity-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-navy">{r.name}</span>
                          {r.organization && <span className="block truncate text-xs text-slate-400">{r.organization}</span>}
                        </span>
                        <UserCheck size={16} className="shrink-0 text-orange" />
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowManual(false);
                  setManualQuery('');
                  setManualResults([]);
                }}
                className="mt-3 text-xs font-semibold text-slate-400 hover:text-navy"
              >
                Back to scanning
              </button>
            </div>
          )}
        </div>

        {flash && (
          <div
            className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${
              flash.kind === 'error'
                ? 'border-danger/30 bg-danger/5'
                : flash.kind === 'already_recorded'
                  ? 'border-warning/30 bg-warning/5'
                  : 'border-success/30 bg-success/5'
            }`}
          >
            {flash.kind === 'error' ? (
              <AlertCircle size={22} className="mt-0.5 shrink-0 text-danger" />
            ) : (
              <CheckCircle2 size={22} className={`mt-0.5 shrink-0 ${flash.kind === 'already_recorded' ? 'text-warning' : 'text-success'}`} />
            )}
            <div className="min-w-0">
              <p className="font-display text-base font-semibold text-navy">{flash.text}</p>
              {flash.sub && <p className="text-sm text-slate-500">{flash.sub}</p>}
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-slate-400">Signed in as {info.volunteerName}</p>
      </div>
    </section>
  );
};
