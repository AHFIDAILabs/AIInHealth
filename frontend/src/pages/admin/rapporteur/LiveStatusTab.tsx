import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Radio, CheckCircle2, Clock, Ban, Send } from 'lucide-react';
import {
  adminListLiveStatus,
  adminRevokeToken,
  adminResendLink,
  type AdminLiveStatusRow,
} from '../../../services/rapporteur.service';
import { getApiErrorMessage } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { Skeleton } from '../../../components/ui/Skeleton';

const SOCKET_URL = ((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/api\/?.*$/, '');

export const LiveStatusTab = () => {
  const toast = useToast();
  const [rows, setRows] = useState<AdminLiveStatusRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    adminListLiveStatus()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(load, [load]);

  // Any autosave/submit anywhere refreshes this whole tab — simplest correct
  // approach for a small admin list (mirrors CheckInPage.tsx's own io(...)
  // usage), rather than patching one row in place from a partial payload.
  useEffect(() => {
    const socket: Socket = io(`${SOCKET_URL}/admin`, { withCredentials: true });
    socket.on('rapporteur-report-updated', load);
    return () => {
      socket.disconnect();
    };
  }, [load]);

  const revoke = async (tokenId: string) => {
    if (!window.confirm('Revoke this rapporteur link? They will no longer be able to open or edit their notes.')) return;
    setBusy(tokenId);
    try {
      await adminRevokeToken(tokenId);
      toast('success', 'Link revoked.');
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const resend = async (tokenId: string) => {
    setBusy(tokenId);
    try {
      await adminResendLink(tokenId);
      toast('success', 'Link resent.');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (!rows) return <Skeleton className="h-64" />;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-card p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Radio size={14} /> Active Assignments
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 py-6 text-center text-sm text-slate-400">No rapporteurs assigned yet — use the Assign tab.</p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.tokenId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-navy">{r.sessionTitle}</p>
                <p className="truncate text-xs text-slate-400">
                  {r.rapporteurName} &middot; {r.rapporteurEmail}
                  {r.lastUsedAt && <> &middot; last active {new Date(r.lastUsedAt).toLocaleString()}</>}
                </p>
              </div>
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  r.revoked
                    ? 'bg-slate-100 text-slate-500'
                    : r.status === 'submitted'
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                }`}
              >
                {r.revoked ? <Ban size={11} /> : r.status === 'submitted' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                {r.revoked ? 'Revoked' : r.status === 'submitted' ? 'Submitted' : 'In progress'}
              </span>
              {!r.revoked && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => resend(r.tokenId)}
                    disabled={busy === r.tokenId}
                    title="Resend link"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy disabled:opacity-50"
                  >
                    <Send size={14} />
                  </button>
                  <button
                    onClick={() => revoke(r.tokenId)}
                    disabled={busy === r.tokenId}
                    title="Revoke link"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    <Ban size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
