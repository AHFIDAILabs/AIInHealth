import { useEffect, useState } from 'react';
import { UserPlus, Copy, CheckCircle2 } from 'lucide-react';
import { adminListAssignableSessions, adminAssignRapporteur, type AssignableSession } from '../../../services/rapporteur.service';
import { getApiErrorMessage } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { Banner } from '../../../components/ui/Banner';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';

export const AssignTab = () => {
  const toast = useToast();
  const [sessions, setSessions] = useState<AssignableSession[] | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [rapporteurName, setRapporteurName] = useState('');
  const [rapporteurEmail, setRapporteurEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastAssigned, setLastAssigned] = useState<{ portalUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    adminListAssignableSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  };
  useEffect(load, []);

  const unassigned = (sessions ?? []).filter((s) => !s.assignment);

  const submit = async () => {
    if (!sessionId || !rapporteurName.trim() || !rapporteurEmail.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await adminAssignRapporteur({ sessionId, rapporteurName: rapporteurName.trim(), rapporteurEmail: rapporteurEmail.trim() });
      setLastAssigned({ portalUrl: res.portalUrl });
      toast('success', 'Rapporteur assigned — their link has been emailed.');
      setSessionId('');
      setRapporteurName('');
      setRapporteurEmail('');
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    if (!lastAssigned) return;
    void navigator.clipboard.writeText(lastAssigned.portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!sessions) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-100 bg-white shadow-card p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <UserPlus size={14} /> Assign a Rapporteur
        </p>

        {error && (
          <div className="mt-3">
            <Banner variant="error">{error}</Banner>
          </div>
        )}

        {lastAssigned && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-xs text-success">
            <CheckCircle2 size={14} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{lastAssigned.portalUrl}</span>
            <button type="button" onClick={copyLink} className="shrink-0 font-semibold hover:underline">
              {copied ? 'Copied!' : <Copy size={13} />}
            </button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Session</label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-orange/40 focus:outline-none"
            >
              <option value="">Select an unassigned session…</option>
              {unassigned.map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.day}, {s.startTime} — {s.title}
                </option>
              ))}
            </select>
          </div>
          <input
            value={rapporteurName}
            onChange={(e) => setRapporteurName(e.target.value)}
            placeholder="Rapporteur's full name"
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
          <input
            value={rapporteurEmail}
            onChange={(e) => setRapporteurEmail(e.target.value)}
            placeholder="Rapporteur's email"
            type="email"
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
          <Button
            variant="primary"
            className="w-full justify-center !px-4 !py-2.5 !text-sm"
            loading={submitting}
            disabled={!sessionId || !rapporteurName.trim() || !rapporteurEmail.trim()}
            onClick={submit}
          >
            Assign &amp; Email Link
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">All Sessions</p>
        <div className="mt-3 max-h-96 space-y-1.5 overflow-y-auto">
          {sessions.map((s) => (
            <div key={s.sessionId} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-navy">{s.title}</p>
                <p className="truncate text-xs text-slate-400">
                  {s.day}, {s.startTime} &middot; {s.room}
                </p>
              </div>
              {s.assignment ? (
                <span className="shrink-0 rounded-full bg-info/10 px-2.5 py-1 text-[11px] font-semibold text-info">
                  {s.assignment.rapporteurName}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Unassigned</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
