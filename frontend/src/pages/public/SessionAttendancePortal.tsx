import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { SEO } from '../../components/seo/SEO';
import { Banner } from '../../components/ui/Banner';
import { QrScanner } from '../../components/admin/QrScanner';
import {
  fetchSessionAttendanceInfo,
  scanSessionAttendance,
  type SessionAttendanceInfo,
  type ScannedAttendee,
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

  const load = useCallback(() => {
    fetchSessionAttendanceInfo(token)
      .then(setInfo)
      .catch((err) => setLoadError(getApiErrorMessage(err, 'This attendance link is invalid or has expired.')));
  }, [token]);

  useEffect(load, [load]);

  const describeAttendee = (attendee: ScannedAttendee): string | undefined =>
    [attendee.organization, attendee.ticketCategory].filter(Boolean).join(' · ') || undefined;

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
        setFlash({
          kind: res.status,
          text: res.status === 'recorded' ? res.attendee.name : `${res.attendee.name} — already scanned`,
          sub: describeAttendee(res.attendee),
        });
        if (res.status === 'recorded') {
          setInfo((prev) => (prev ? { ...prev, count: prev.count + 1 } : prev));
        }
      } catch (err) {
        setFlash({ kind: 'error', text: getApiErrorMessage(err, "That code didn't scan.") });
      } finally {
        setTimeout(() => {
          scanLockRef.current = false;
        }, 2000);
      }
    },
    [token]
  );

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
