import { useEffect, useState } from 'react';
import { UserPlus, Copy, CheckCircle2, Trash2, Download, Plus, ScanLine, Mail, Smartphone, Search } from 'lucide-react';
import {
  adminListAttendanceSessions,
  adminCreateAttendanceTokens,
  adminRevokeAttendanceToken,
  adminAttendanceExportUrl,
  adminSearchVolunteers,
  type AdminAttendanceSession,
  type CreatedAttendanceToken,
  type VolunteerSearchResult,
} from '../../services/sessionAttendance.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

interface VolunteerDraft {
  name: string;
  email: string;
  // Set once the admin picks a match from the search dropdown — delivery
  // then goes straight to that Registration's portal (see
  // sessionAttendanceToken.service.ts's resolveDeliveryRegistration). Cleared
  // again the moment they hand-edit the name/email away from the match, so a
  // stale id can never point at the wrong person.
  registrationId?: string;
}

const emptyVolunteer = (): VolunteerDraft => ({ name: '', email: '' });

// One volunteer row: a name field that doubles as a live search box over
// existing confirmed volunteer registrations, so the admin doesn't have to
// retype an email the system already has on file. Falls back to plain manual
// entry (no match picked) for a volunteer not registered as a 'volunteer' —
// the token still gets created, it just won't auto-deliver anywhere.
const VolunteerRow = ({
  draft,
  onChange,
  onRemove,
  removable,
}: {
  draft: VolunteerDraft;
  onChange: (next: VolunteerDraft) => void;
  onRemove?: () => void;
  removable: boolean;
}) => {
  const [results, setResults] = useState<VolunteerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const runSearch = (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    adminSearchVolunteers(q.trim())
      .then((rows) => {
        setResults(rows);
        setOpen(true);
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  };

  const pick = (r: VolunteerSearchResult) => {
    onChange({ name: r.name, email: r.email, registrationId: r.registrationId });
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <input
          value={draft.name}
          onChange={(e) => {
            onChange({ name: e.target.value, email: draft.email, registrationId: undefined });
            runSearch(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search registered volunteers or type a name"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-3.5 text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
        />
        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
        {open && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {searching && <p className="px-3 py-2 text-xs text-slate-400">Searching…</p>}
            {!searching && results.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No registered volunteer matches.</p>}
            {results.map((r) => (
              <button
                key={r.registrationId}
                type="button"
                onMouseDown={() => pick(r)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-offwhite"
              >
                <span className="font-medium text-navy">{r.name}</span>
                <span className="text-xs text-slate-400">
                  {r.email}
                  {r.organization ? ` · ${r.organization}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
        {draft.registrationId && (
          <span className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
            <CheckCircle2 size={10} /> Matched
          </span>
        )}
      </div>
      <input
        value={draft.email}
        onChange={(e) => onChange({ name: draft.name, email: e.target.value, registrationId: undefined })}
        placeholder="Email (optional)"
        type="email"
        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
      />
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg border border-slate-200 px-2.5 text-slate-400 hover:border-danger/40 hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

export const SessionAttendancePage = () => {
  const toast = useToast();
  const [sessions, setSessions] = useState<AdminAttendanceSession[] | null>(null);
  const [sessionId, setSessionId] = useState('');
  // Starts with two rows — matches the "two volunteers per breakout room"
  // staffing plan this feature was built for, while still letting an admin
  // add more or remove down to one for a lightly-staffed room.
  const [volunteers, setVolunteers] = useState<VolunteerDraft[]>([emptyVolunteer(), emptyVolunteer()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastCreated, setLastCreated] = useState<CreatedAttendanceToken[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = () => {
    adminListAttendanceSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  };
  useEffect(load, []);

  const validVolunteers = volunteers.filter((v) => v.name.trim());

  const submit = async () => {
    if (!sessionId || validVolunteers.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await adminCreateAttendanceTokens(
        sessionId,
        validVolunteers.map((v) => ({ name: v.name.trim(), email: v.email.trim() || undefined, registrationId: v.registrationId }))
      );
      setLastCreated(res.tokens);
      const delivered = res.tokens.filter((t) => t.emailed || t.deliveredToPortal).length;
      toast(
        'success',
        `${res.tokens.length} attendance link${res.tokens.length === 1 ? '' : 's'} created for ${res.sessionTitle}` +
          (delivered > 0 ? ` — ${delivered} delivered automatically.` : '.')
      );
      setSessionId('');
      setVolunteers([emptyVolunteer(), emptyVolunteer()]);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = (url: string, index: number) => {
    void navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex((i) => (i === index ? null : i)), 2000);
  };

  const revoke = async (tokenId: string) => {
    setRevokingId(tokenId);
    try {
      await adminRevokeAttendanceToken(tokenId);
      toast('success', 'Link revoked.');
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setRevokingId(null);
    }
  };

  if (!sessions) {
    return (
      <div className="mx-auto max-w-6xl space-y-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Session Attendance</h1>
        <p className="text-sm text-slate-500">
          Give breakout-room volunteers a scan-only link on their own phone — no app, no login, no handheld scanner needed.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <UserPlus size={14} /> Assign Attendance-Takers
          </p>

          {error && (
            <div className="mt-3">
              <Banner variant="error">{error}</Banner>
            </div>
          )}

          {lastCreated && (
            <div className="mt-3 space-y-2">
              {lastCreated.map((t, i) => (
                <div key={i} className="rounded-lg bg-success/10 px-3 py-2.5 text-xs text-success">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      <strong>{t.volunteerName}:</strong> {t.portalUrl}
                    </span>
                    <button type="button" onClick={() => copyLink(t.portalUrl, i)} className="shrink-0 font-semibold hover:underline">
                      {copiedIndex === i ? 'Copied!' : <Copy size={13} />}
                    </button>
                  </div>
                  {(t.emailed || t.deliveredToPortal) && (
                    <div className="mt-1.5 flex items-center gap-3 pl-5 text-[11px] text-success/80">
                      {t.emailed && (
                        <span className="flex items-center gap-1">
                          <Mail size={11} /> Emailed
                        </span>
                      )}
                      {t.deliveredToPortal && (
                        <span className="flex items-center gap-1">
                          <Smartphone size={11} /> Sent to their portal
                        </span>
                      )}
                    </div>
                  )}
                  {!t.emailed && !t.deliveredToPortal && (
                    <p className="mt-1.5 pl-5 text-[11px] text-slate-400">
                      No email or registration match — share this link directly.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Session / Room</label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-orange/40 focus:outline-none"
              >
                <option value="">Select a session…</option>
                {sessions.map((s) => (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.day}, {s.startTime} — {s.title} (Room {s.room})
                  </option>
                ))}
              </select>
            </div>

            <label className="block text-xs font-semibold text-slate-500">Volunteers</label>
            {volunteers.map((v, i) => (
              <VolunteerRow
                key={i}
                draft={v}
                onChange={(next) => setVolunteers((prev) => prev.map((p, j) => (j === i ? next : p)))}
                onRemove={() => setVolunteers((prev) => prev.filter((_, j) => j !== i))}
                removable={volunteers.length > 1}
              />
            ))}
            {volunteers.length < 5 && (
              <button
                type="button"
                onClick={() => setVolunteers((prev) => [...prev, emptyVolunteer()])}
                className="flex items-center gap-1.5 text-xs font-semibold text-orange hover:underline"
              >
                <Plus size={13} /> Add another volunteer
              </button>
            )}

            <Button
              variant="primary"
              className="w-full justify-center !px-4 !py-2.5 !text-sm"
              loading={submitting}
              disabled={!sessionId || validVolunteers.length === 0}
              onClick={submit}
            >
              Generate {validVolunteers.length > 1 ? `${validVolunteers.length} Links` : 'Link'}
            </Button>
            <p className="text-xs text-slate-400">
              Pick a registered volunteer and their link is emailed and sent straight to their portal automatically. No match or
              email? Copy the link and share it yourself.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">All Sessions</p>
          <div className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto">
            {sessions.map((s) => (
              <div key={s.sessionId} className="rounded-lg border border-slate-100 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-navy">{s.title}</p>
                    <p className="truncate text-xs text-slate-400">
                      {s.day}, {s.startTime} &middot; Room {s.room}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-semibold text-orange">
                      <ScanLine size={11} /> {s.scannedCount}
                    </span>
                    {s.scannedCount > 0 && (
                      <a
                        href={adminAttendanceExportUrl(s.sessionId)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-orange/40 hover:text-orange"
                        title="Export CSV"
                      >
                        <Download size={12} />
                      </a>
                    )}
                  </div>
                </div>
                {s.tokens.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.tokens.map((t) => (
                      <span
                        key={t.tokenId}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          t.revoked ? 'bg-slate-100 text-slate-400 line-through' : 'bg-info/10 text-info'
                        }`}
                      >
                        {t.volunteerName}
                        {!t.revoked && (
                          <button
                            type="button"
                            onClick={() => revoke(t.tokenId)}
                            disabled={revokingId === t.tokenId}
                            title="Revoke link"
                            className="text-info/60 hover:text-danger"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
