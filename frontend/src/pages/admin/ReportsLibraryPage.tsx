import { useCallback, useEffect, useState } from 'react';
import { Search, Download, Eye, FileDown, KeyRound, Library } from 'lucide-react';
import {
  adminListReportAccessEvents,
  adminFetchReportAccessStats,
  exportReportAccessEventsUrl,
  type AdminReportAccessEvent,
  type AdminReportAccessStats,
  type ReportAccessAction,
} from '../../services/reportsAdmin.service';
import { getApiErrorMessage } from '../../services/api';
import { AnalyticsStatCard } from './analytics/AnalyticsStatCard';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';

const ACTION_LABEL: Record<ReportAccessAction, string> = { view: 'Viewed', download: 'Downloaded' };
const ACTION_BADGE: Record<ReportAccessAction, string> = {
  view: 'bg-navy-secondary text-white',
  download: 'bg-navy-secondary text-orange',
};

// Who's actually reading/pulling the 55 session reports/briefs/papers the
// Reports Library gate hands out codes for — distinct from the Newsletter
// page's "report_library" source filter, which only shows who requested a
// code, not who went on to open or save a specific document.
export const ReportsLibraryPage = () => {
  const [stats, setStats] = useState<AdminReportAccessStats | null>(null);
  const [items, setItems] = useState<AdminReportAccessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [action, setAction] = useState<ReportAccessAction | ''>('');

  useEffect(() => {
    adminFetchReportAccessStats().catch(() => null).then((s) => s && setStats(s));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListReportAccessEvents({ action: action || undefined, q: q || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [action, q, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Reports Library</h1>
          <p className="text-sm text-slate-500">Who's viewing and downloading the 55 post-Summit session reports.</p>
        </div>
        <a
          href={exportReportAccessEventsUrl({ action: action || undefined, q: q || undefined })}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40"
        >
          <Download size={16} /> Export CSV
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AnalyticsStatCard icon={KeyRound} label="Access Codes Issued" value={stats?.totalAccessCodesIssued ?? null} />
        <AnalyticsStatCard icon={Eye} label="Total Views" value={stats?.totalViews ?? null} />
        <AnalyticsStatCard icon={FileDown} label="Total Downloads" value={stats?.totalDownloads ?? null} />
        <AnalyticsStatCard icon={Library} label="Documents in Library" value={55} />
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
            placeholder="Search email..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value as ReportAccessAction | '');
          }}
          className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Activity</option>
          <option value="view">Viewed</option>
          <option value="download">Downloaded</option>
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={8} cols={4} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
              <Library size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No activity yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-3 py-3 font-semibold">Report</th>
                  <th className="px-3 py-3 font-semibold">Activity</th>
                  <th className="px-3 py-3 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((e) => (
                  <tr key={e._id}>
                    <td className="px-4 py-3 font-medium text-navy">{e.email}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {e.sessionTitle ?? e.reportId}
                      {e.docTypeLabel && <span className="block text-xs text-slate-400">{e.docTypeLabel}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${ACTION_BADGE[e.action]}`}>
                        {ACTION_LABEL[e.action]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{new Date(e.accessedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500">
            <span>
              Page {page} of {pages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
