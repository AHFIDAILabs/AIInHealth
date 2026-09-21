import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  listSecurityEvents,
  SECURITY_EVENT_TYPES,
  SECURITY_EVENT_SEVERITIES,
  type SecurityEvent,
  type SecurityEventType,
  type SecurityEventSeverity,
} from '../../../services/security.service';
import { getApiErrorMessage } from '../../../services/api';
import { Banner } from '../../../components/ui/Banner';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { CARD_CLASS } from '../../../lib/adminUi';

const TYPE_LABEL = (type: string) => type.replace(/[._]/g, ' ');

const SEVERITY_CLASS: Record<SecurityEventSeverity, string> = {
  low: 'bg-info/10 text-info',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-danger/10 text-danger',
};

export const EventsTab = () => {
  const [items, setItems] = useState<SecurityEvent[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<SecurityEventType | ''>('');
  const [severityFilter, setSeverityFilter] = useState<SecurityEventSeverity | ''>('');
  const [ipFilter, setIpFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listSecurityEvents({
      type: typeFilter || undefined,
      severity: severityFilter || undefined,
      ip: ipFilter || undefined,
      page,
      limit: 50,
    })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [typeFilter, severityFilter, ipFilter, page]);

  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as SecurityEventType | '');
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Types</option>
          {SECURITY_EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL(t)}
            </option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value as SecurityEventSeverity | '');
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Severities</option>
          {SECURITY_EVENT_SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <input
          value={ipFilter}
          onChange={(e) => {
            setIpFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by IP"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        />
      </div>

      {error && <Banner variant="error">{error}</Banner>}

      <div className={`overflow-hidden ${CARD_CLASS}`}>
        {loading ? (
          <SkeletonRows rows={10} cols={4} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-blue/15 text-chart-blue">
              <ShieldAlert size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No events match these filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((e) => (
              <div key={e._id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
                <div className="min-w-0 flex-1">
                  <p className="font-medium capitalize text-navy">{TYPE_LABEL(e.type)}</p>
                  <p className="truncate text-xs text-slate-400">
                    {e.ip ?? 'unknown IP'} &middot; {new Date(e.createdAt).toLocaleString()}
                    {e.path && <> &middot; {e.path}</>}
                    {e.email && <> &middot; {e.email}</>}
                    {e.user && <> &middot; {e.user.fullName}</>}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_CLASS[e.severity]}`}>
                  {e.severity}
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500">
            <span>
              Page {page} of {pages}
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
        )}
      </div>
    </div>
  );
};
