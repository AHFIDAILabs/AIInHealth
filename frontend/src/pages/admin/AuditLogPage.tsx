import { useCallback, useEffect, useState } from 'react';
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react';
import { adminListAuditLogs, type AuditLogEntry } from '../../services/auditLog.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';

const ACTION_LABEL = (action: string) =>
  action
    .split('.')
    .join(' — ')
    .replace(/_/g, ' ');

const DiffRow = ({ label, before, after }: { label: string; before: unknown; after: unknown }) => {
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  return (
    <div className={`grid grid-cols-2 gap-3 rounded-lg px-3 py-2 text-xs ${changed ? 'bg-warning/5' : ''}`}>
      <div>
        <p className="font-semibold text-slate-400">{label}</p>
        <p className="mt-0.5 text-danger line-through decoration-danger/40">{JSON.stringify(before) ?? '—'}</p>
      </div>
      <div>
        <p className="font-semibold text-slate-400">&nbsp;</p>
        <p className="mt-0.5 text-success">{JSON.stringify(after) ?? '—'}</p>
      </div>
    </div>
  );
};

const EntryDiff = ({ entry }: { entry: AuditLogEntry }) => {
  const keys = Array.from(new Set([...Object.keys(entry.before ?? {}), ...Object.keys(entry.after ?? {})]));
  if (keys.length === 0) {
    return <p className="px-3 py-2 text-xs text-slate-400">No field-level detail recorded for this action.</p>;
  }
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-3 px-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        <span>Before</span>
        <span>After</span>
      </div>
      {keys.map((key) => (
        <DiffRow key={key} label={key} before={entry.before?.[key]} after={entry.after?.[key]} />
      ))}
    </div>
  );
};

export const AuditLogPage = () => {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListAuditLogs({
      action: actionFilter || undefined,
      resourceType: resourceFilter || undefined,
      from: from || undefined,
      to: to || undefined,
      limit: 50,
    })
      .then((res) => {
        setItems(res.items);
        setActions(res.actions);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [actionFilter, resourceFilter, from, to]);

  useEffect(load, [load]);

  const resourceTypes = Array.from(new Set(items.map((i) => i.resourceType))).sort();

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Audit Log</h1>
        <p className="text-sm text-slate-500">Every admin mutation, timestamped and attributed.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none">
          <option value="">All Actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL(a)}
            </option>
          ))}
        </select>
        <select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none">
          <option value="">All Resources</option>
          {resourceTypes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none" />
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
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-blue/15 text-chart-blue">
              <ScrollText size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No audit entries match these filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((entry) => {
              const isOpen = expanded === entry._id;
              return (
                <div key={entry._id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : entry._id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] hover:bg-offwhite"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-navy">
                        <span className="font-semibold">{entry.actorName}</span>{' '}
                        <span className="text-slate-500">{ACTION_LABEL(entry.action)}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {entry.resourceType} &middot; {new Date(entry.createdAt).toLocaleString()}
                        {entry.ip && <> &middot; {entry.ip}</>}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-navy-secondary px-2 py-0.5 text-[10px] font-medium text-orange">{entry.actorRole}</span>
                    {isOpen ? <ChevronUp size={16} className="shrink-0 text-slate-400" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-offwhite/50 px-4 py-3">
                      <EntryDiff entry={entry} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
