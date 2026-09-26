import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, X, RefreshCw, ExternalLink, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  adminListPolicyEntries,
  adminUpdatePolicyEntry,
  adminRefreshPolicyTrackerNow,
  POLICY_FRAMEWORK_STATUSES,
  POLICY_ENTRY_STATUSES,
  type PolicyTrackerEntry,
  type PolicyFrameworkStatus,
  type PolicyEntryStatus,
} from '../../../services/policyTracker.service';
import { getApiErrorMessage } from '../../../services/api';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { AdminInput, AdminTextarea, AdminSelect } from '../../../components/ui/AdminField';
import { useToast } from '../../../contexts/ToastContext';

const FRAMEWORK_LABEL: Record<PolicyFrameworkStatus, string> = {
  none_identified: 'None Identified',
  drafting: 'Drafting',
  adopted: 'Adopted',
  unclear: 'Unclear',
};
const FRAMEWORK_COLOR: Record<PolicyFrameworkStatus, string> = {
  none_identified: 'bg-slate-100 text-slate-500',
  drafting: 'bg-warning/10 text-warning',
  adopted: 'bg-success/10 text-success',
  unclear: 'bg-chart-amber/10 text-chart-amber',
};
const STATUS_LABEL: Record<PolicyEntryStatus, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};
const STATUS_COLOR: Record<PolicyEntryStatus, string> = {
  pending_review: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
};

export const EntriesTab = () => {
  const toast = useToast();
  const [items, setItems] = useState<PolicyTrackerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<PolicyEntryStatus | ''>('pending_review');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const [active, setActive] = useState<PolicyTrackerEntry | null>(null);
  const [draft, setDraft] = useState({ country: '', frameworkStatus: 'unclear' as PolicyFrameworkStatus, summary: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListPolicyEntries({ status: statusFilter || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(load, [load]);

  const openDetail = (entry: PolicyTrackerEntry) => {
    setActive(entry);
    setDraft({ country: entry.country, frameworkStatus: entry.frameworkStatus, summary: entry.summary });
  };

  const runRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await adminRefreshPolicyTrackerNow();
      toast(
        'success',
        `Checked ${result.checked} source${result.checked === 1 ? '' : 's'} · ${result.changed} changed${result.failed > 0 ? ` · ${result.failed} failed` : ''}`
      );
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  const save = async (status?: PolicyEntryStatus) => {
    if (!active) return;
    setSaving(true);
    try {
      const updated = await adminUpdatePolicyEntry(active._id, { ...draft, ...(status ? { status } : {}) });
      setItems((prev) => (statusFilter && updated.status !== statusFilter ? prev.filter((e) => e._id !== updated._id) : prev.map((e) => (e._id === updated._id ? updated : e))));
      setActive(null);
      toast('success', status === 'approved' ? 'Entry approved' : status === 'rejected' ? 'Entry rejected' : 'Entry saved');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy">Policy Tracker Entries</h2>
          <p className="text-sm text-slate-500">
            AI-drafted from your trusted sources, weekly — {total} entr{total === 1 ? 'y' : 'ies'}. Nothing here reaches the
            public page until approved.
          </p>
        </div>
        <button
          onClick={runRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh Now'}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setPage(1);
            setStatusFilter('');
          }}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${!statusFilter ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600'}`}
        >
          All
        </button>
        {POLICY_ENTRY_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setPage(1);
              setStatusFilter(s);
            }}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${statusFilter === s ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600'}`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={6} cols={4} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-violet/15 text-chart-violet">
              <Globe2 size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">
              {statusFilter ? `No ${STATUS_LABEL[statusFilter].toLowerCase()} entries` : 'No entries yet'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Add trusted sources on the Sources tab, then click "Refresh Now" to run the extraction.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((entry) => (
              <div key={entry._id} className="flex items-start justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-offwhite" onClick={() => openDetail(entry)}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-navy">{entry.country}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${FRAMEWORK_COLOR[entry.frameworkStatus]}`}>
                      {FRAMEWORK_LABEL[entry.frameworkStatus]}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[entry.status]}`}>
                      {STATUS_LABEL[entry.status]}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13px] text-slate-600">{entry.summary}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Checked {new Date(entry.lastCheckedAt).toLocaleDateString()} · {entry.sourceUrl}
                  </p>
                </div>
              </div>
            ))}
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

      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-navy/50" onClick={() => setActive(null)}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">Review Entry</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <a
                  href={active.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-orange hover:text-orange-hover"
                >
                  {active.sourceUrl} <ExternalLink size={13} />
                </a>
                <AdminInput label="Country" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
                <AdminSelect
                  label="Framework Status"
                  value={draft.frameworkStatus}
                  onChange={(e) => setDraft({ ...draft, frameworkStatus: e.target.value as PolicyFrameworkStatus })}
                >
                  {POLICY_FRAMEWORK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FRAMEWORK_LABEL[s]}
                    </option>
                  ))}
                </AdminSelect>
                <AdminTextarea
                  label="Summary"
                  maxLength={1500}
                  value={draft.summary}
                  onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                />
                <p className="text-xs text-slate-400">
                  Last checked {new Date(active.lastCheckedAt).toLocaleString()}
                  {active.reviewedBy && ` · Last reviewed by ${active.reviewedBy.fullName}`}
                </p>
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button
                  onClick={() => save('rejected')}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-danger/30 py-2.5 text-[13px] font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
                >
                  <XCircle size={15} /> Reject
                </button>
                <button
                  onClick={() => save()}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40 disabled:opacity-50"
                >
                  <Clock size={15} /> Save Only
                </button>
                <button
                  onClick={() => save('approved')}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success py-2.5 text-[13px] font-semibold text-white hover:bg-success/90 disabled:opacity-50"
                >
                  <CheckCircle2 size={15} /> Approve
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
