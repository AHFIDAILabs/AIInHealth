import { useCallback, useEffect, useState } from 'react';
import { Search, Smartphone, Send, CheckCircle2 } from 'lucide-react';
import { adminListPortalTokens, adminSendPortalLink, type PortalTokenRow } from '../../services/portalToken.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { useToast } from '../../contexts/ToastContext';

export const PortalTokensPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<PortalTokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListPortalTokens(q || undefined)
      .then(setItems)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const sendLink = async (row: PortalTokenRow) => {
    if (!row.email) {
      toast('error', 'This registration has no email on file.');
      return;
    }
    setSendingId(row.id);
    try {
      const res = await adminSendPortalLink(row.id);
      setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, portalLastLinkSentAt: res.sentAt } : r)));
      toast('success', `Sign-in link sent to ${row.email}`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Portal Tokens</h1>
        <p className="text-sm text-slate-500">Delegate portal access — resend a sign-in link for anyone who lost theirs.</p>
      </div>

      <div className="mt-6 relative max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <SkeletonRows rows={6} cols={5} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-blue/15 text-chart-blue">
            <Smartphone size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No confirmed registrations yet</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Delegate</th>
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
                          onClick={() => sendLink(r)}
                          disabled={sendingId === r.id || !r.email}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-orange/40 disabled:opacity-40"
                        >
                          <Send size={13} /> Send Link
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
    </div>
  );
};
