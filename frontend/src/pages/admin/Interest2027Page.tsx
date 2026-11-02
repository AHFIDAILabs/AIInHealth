import { useCallback, useEffect, useState } from 'react';
import { Search, Download, CalendarHeart } from 'lucide-react';
import {
  adminListInterest2027,
  exportInterest2027Url,
  INTEREST_2027_TYPES,
  INTEREST_2027_LABELS,
  type AdminInterest2027,
  type Interest2027Type,
} from '../../services/interest2027.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';

export const Interest2027Page = () => {
  const [items, setItems] = useState<AdminInterest2027[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [interestType, setInterestType] = useState<Interest2027Type | ''>('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListInterest2027({ interestType: interestType || undefined, q: q || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [interestType, q, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">2027 Interest List</h1>
          <p className="text-sm text-slate-500">{total} signup{total === 1 ? '' : 's'} from the public /2027 form.</p>
        </div>
        <a
          href={exportInterest2027Url({ interestType: interestType || undefined, q: q || undefined })}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40"
        >
          <Download size={16} /> Export CSV
        </a>
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
            placeholder="Search name, email, organisation..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={interestType}
          onChange={(e) => {
            setPage(1);
            setInterestType(e.target.value as Interest2027Type | '');
          }}
          className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Interests</option>
          {INTEREST_2027_TYPES.map((t) => (
            <option key={t} value={t}>
              {INTEREST_2027_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={8} cols={5} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
              <CalendarHeart size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No signups yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Email</th>
                  <th className="px-3 py-3 font-semibold">Country</th>
                  <th className="px-3 py-3 font-semibold">Interests</th>
                  <th className="px-3 py-3 font-semibold">Signed Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3 font-medium text-navy">{item.fullName}</td>
                    <td className="px-3 py-3 text-slate-600">{item.email}</td>
                    <td className="px-3 py-3 text-slate-600">{item.country}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {item.interestTypes.map((t) => (
                          <span key={t} className="rounded-full bg-navy-secondary px-2.5 py-0.5 text-[11px] font-medium text-orange">
                            {INTEREST_2027_LABELS[t]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500">
            <span>Page {page} of {pages}</span>
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
