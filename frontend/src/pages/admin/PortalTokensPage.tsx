import { useCallback, useEffect, useState } from 'react';
import { Search, Smartphone, Send, CheckCircle2, Mail } from 'lucide-react';
import { adminListPortalTokens, adminSendPortalCode, adminBulkSendPortalCodes, type PortalTokenRow } from '../../services/portalToken.service';
import type { RegistrationStatus, RegistrationType } from '../../services/admin.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';

// Same option sets (and badge colors) as RegistrationsPage.tsx's Status/Type filters.
const STATUS_OPTIONS: RegistrationStatus[] = ['pending', 'reviewed', 'confirmed', 'declined'];
const TYPE_OPTIONS: RegistrationType[] = ['attendee', 'exhibitor', 'sponsor', 'volunteer', 'team'];
const STATUS_BADGE: Record<RegistrationStatus, string> = {
  pending: 'text-warning bg-warning/10',
  reviewed: 'text-info bg-info/10',
  confirmed: 'text-success bg-success/10',
  declined: 'text-danger bg-danger/10',
};

export const PortalTokensPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<PortalTokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  // Defaults to 'confirmed' — matches this page's original scope (portal
  // access only ever exists for a confirmed registration) — with an "All
  // Statuses" option ('') for anyone who wants to see the rest too.
  const [status, setStatus] = useState<RegistrationStatus | ''>('confirmed');
  const [type, setType] = useState<RegistrationType | ''>('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListPortalTokens({ q: q || undefined, status, type: type || undefined })
      .then(setItems)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, status, type]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const sendCode = async (row: PortalTokenRow) => {
    if (!row.email) {
      toast('error', 'This registration has no email on file.');
      return;
    }
    setSendingId(row.id);
    try {
      const res = await adminSendPortalCode(row.id);
      setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, portalLastLinkSentAt: res.sentAt } : r)));
      toast('success', `Access code sent to ${row.email}`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSendingId(null);
    }
  };

  const sendBulkCodes = async () => {
    setBulkSending(true);
    try {
      const result = await adminBulkSendPortalCodes();
      toast('success', `Sent ${result.sent} of ${result.attempted} access code${result.attempted === 1 ? '' : 's'}${result.failed ? ` (${result.failed} failed)` : ''}.`);
      setConfirmBulk(false);
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Portal Tokens</h1>
        <p className="text-sm text-slate-500">Delegate portal access — resend an access code for anyone who lost theirs.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RegistrationStatus | '')}
          className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RegistrationType | '')}
          className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        {(status !== 'confirmed' || type || q) && (
          <button
            onClick={() => {
              setStatus('confirmed');
              setType('');
              setQ('');
            }}
            className="text-[13px] font-semibold text-orange hover:text-orange-hover"
          >
            Clear
          </button>
        )}
        <button
          onClick={() => setConfirmBulk(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-orange px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover"
        >
          <Mail size={14} />
          Send to All Never Sent
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <SkeletonRows rows={6} cols={7} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-blue/15 text-chart-blue">
            <Smartphone size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">
            {status !== 'confirmed' || type || q ? 'No registrations match these filters' : 'No confirmed registrations yet'}
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Delegate</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Ticket</th>
                  <th className="px-3 py-3 font-semibold">Directory</th>
                  <th className="px-3 py-3 font-semibold">Last Link Sent</th>
                  <th className="px-3 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.email ?? 'no email on file'}</p>
                    </td>
                    <td className="px-3 py-3 text-xs capitalize text-slate-600">{r.type}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {r.hasTicket ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                          <CheckCircle2 size={13} /> Issued
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not yet</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{r.directoryOptIn ? 'Opted in' : '—'}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {r.portalLastLinkSentAt ? new Date(r.portalLastLinkSentAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => sendCode(r)}
                          disabled={sendingId === r.id || !r.email || r.status !== 'confirmed'}
                          title={r.status !== 'confirmed' ? 'Only confirmed registrations can access the delegate portal.' : undefined}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-orange/40 disabled:opacity-40"
                        >
                          <Send size={13} /> Send Code
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmBulk}
        title="Send access codes to everyone?"
        description="Every confirmed registration that's never had an access code or ticket emailed (including anyone imported from the old site) gets their access code and QR ticket now. Already-sent delegates are skipped."
        confirmLabel="Send to All"
        danger={false}
        loading={bulkSending}
        onConfirm={sendBulkCodes}
        onCancel={() => setConfirmBulk(false)}
      />
    </div>
  );
};
