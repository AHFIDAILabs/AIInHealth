import { useCallback, useEffect, useState } from 'react';
import { Search, Send, Download, Users, CheckCircle2, Clock, Mail } from 'lucide-react';
import {
  adminFetchMasterclassStats,
  adminSendMasterclassInvites,
  adminListMasterclass,
  adminMasterclassExportUrl,
  type MasterclassStats,
  type AdminMasterclassRow,
} from '../../services/masterclass.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { useToast } from '../../contexts/ToastContext';

const StatTile = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
      <Icon size={13} /> {label}
    </div>
    <p className="mt-1.5 font-display text-2xl font-bold text-navy">{value}</p>
  </div>
);

// Monitors the AI in Health Masterclass RSVP campaign end-to-end — same
// "stats + send button + searchable list + CSV export" shape as
// WaiHealthPage.tsx, trimmed down: no capacity/gender/decline controls, since
// this session is open to every confirmed attendee and deliberately uncapped.
export const MasterclassPage = () => {
  const toast = useToast();
  const [stats, setStats] = useState<MasterclassStats | null>(null);
  const [items, setItems] = useState<AdminMasterclassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [confirmedFilter, setConfirmedFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sending, setSending] = useState(false);

  const loadStats = useCallback(() => {
    adminFetchMasterclassStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const loadList = useCallback(() => {
    setLoading(true);
    setError('');
    adminListMasterclass({ q: q || undefined, confirmed: confirmedFilter || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, confirmedFilter, page]);

  useEffect(loadStats, [loadStats]);
  useEffect(() => {
    const id = setTimeout(loadList, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [loadList, q]);

  const sendInvites = async () => {
    if (!window.confirm('Send the Masterclass RSVP invite to every confirmed attendee not yet invited?')) return;
    setSending(true);
    try {
      const res = await adminSendMasterclassInvites();
      toast('success', `Sent to ${res.sent} of ${res.targeted}${res.failed ? ` (${res.failed} failed)` : ''}`);
      loadStats();
      loadList();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const responseRate = stats && stats.invited > 0 ? `${Math.round((stats.confirmed / stats.invited) * 100)}%` : '—';

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">AI in Health Masterclass</h1>
          <p className="text-sm text-slate-500">Day 1, 08:00&ndash;09:30, Main Hall &middot; registration-only, uncapped.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={sendInvites}
            disabled={sending}
            className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover disabled:opacity-50"
          >
            <Send size={16} /> {sending ? 'Sending…' : 'Send Invites to All Confirmed'}
          </button>
          <a
            href={adminMasterclassExportUrl({ confirmed: confirmedFilter || undefined, q: q || undefined })}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40"
          >
            <Download size={16} /> Export CSV
          </a>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Eligible" value={stats?.eligible ?? '…'} icon={Users} />
        <StatTile label="Invited" value={stats?.invited ?? '…'} icon={Mail} />
        <StatTile label="Confirmed" value={stats?.confirmed ?? '…'} icon={CheckCircle2} />
        <StatTile label="Response Rate" value={responseRate} icon={Clock} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search by name, email, or organization..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: '', label: 'All' },
            { key: 'true', label: 'RSVP’d' },
            { key: 'false', label: 'Not yet' },
          ] as const).map((f) => (
            <button
              key={f.key || 'all'}
              onClick={() => {
                setPage(1);
                setConfirmedFilter(f.key);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                confirmedFilter === f.key ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          <SkeletonRows rows={6} cols={5} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 text-center shadow-card">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
            <Users size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No attendees match this filter</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Organization</th>
                  <th className="px-3 py-3 font-semibold">Ticket</th>
                  <th className="px-3 py-3 font-semibold">Invited</th>
                  <th className="px-3 py-3 font-semibold">RSVP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r._id} className="hover:bg-offwhite/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{r.fullName}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{r.organization || '—'}</td>
                    <td className="px-3 py-3 capitalize text-slate-500">{r.ticketCategory || '—'}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {r.masterclassRsvpInviteSentAt ? new Date(r.masterclassRsvpInviteSentAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-3">
                      {r.masterclassRsvpConfirmedAt ? (
                        <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          <CheckCircle2 size={11} /> Confirmed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          <Clock size={11} /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500">
            <span>
              Page {page} of {pages} &middot; {total} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
