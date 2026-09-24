import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, X, Search, CheckCircle2, Clock, Users2 } from 'lucide-react';
import {
  adminListAbstracts,
  adminUpdateAbstract,
  fetchAbstractsAnalytics,
  ABSTRACT_STATUSES,
  ABSTRACT_DECISIONS,
  type AdminAbstract,
  type AbstractStatus,
  type AbstractDecision,
  type AbstractAnalytics,
} from '../../../services/abstract.service';
import { listTracks, type PublicTrack } from '../../../services/track.service';
import { getApiErrorMessage } from '../../../services/api';
import { SkeletonRows, Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { AdminTextarea } from '../../../components/ui/AdminField';
import { useToast } from '../../../contexts/ToastContext';
import { CARD_CLASS } from '../../../lib/adminUi';

const STATUS_COLOR: Record<AbstractStatus, string> = {
  submitted: 'bg-warning/10 text-warning',
  under_review: 'bg-info/10 text-info',
  revision_requested: 'bg-chart-amber/10 text-chart-amber',
  accepted: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
};

const STATUS_LABEL: Record<AbstractStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  revision_requested: 'Revision Requested',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const DECISION_LABEL: Record<AbstractDecision, string> = {
  accepted_oral: 'Accepted – Oral',
  accepted_poster: 'Accepted – Poster',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
};

const DECISION_COLOR: Record<AbstractDecision, string> = {
  accepted_oral: 'bg-success/10 text-success',
  accepted_poster: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  waitlisted: 'bg-warning/10 text-warning',
};

const StatCard = ({ icon: Icon, color, label, value }: { icon: typeof FileText; color: string; label: string; value: number | null }) => (
  <div className={`overflow-hidden p-5 ${CARD_CLASS}`}>
    <div className="flex items-center gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={20} />
      </span>
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
    </div>
    {value === null ? (
      <Skeleton className="mt-3 h-8 w-14" />
    ) : (
      <p className="mt-3 font-display text-[26px] font-extrabold leading-none tracking-tight text-navy tabular-nums">{value}</p>
    )}
  </div>
);

export const AbstractsListTab = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminAbstract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<AbstractStatus | ''>('');
  const [decisionFilter, setDecisionFilter] = useState<AbstractDecision | ''>('');
  const [trackFilter, setTrackFilter] = useState('');
  const [tracks, setTracks] = useState<PublicTrack[]>([]);
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [active, setActive] = useState<AdminAbstract | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [updating, setUpdating] = useState(false);

  const [stats, setStats] = useState<AbstractAnalytics | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListAbstracts({
      status: statusFilter || undefined,
      decision: decisionFilter || undefined,
      track: trackFilter || undefined,
      q: q || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [statusFilter, decisionFilter, trackFilter, q, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const refreshStats = () => fetchAbstractsAnalytics().then(setStats).catch(() => undefined);
  useEffect(() => {
    refreshStats();
    listTracks().then(setTracks).catch(() => undefined);
  }, []);

  const clearFilters = () => {
    setStatusFilter('');
    setDecisionFilter('');
    setTrackFilter('');
    setQ('');
    setPage(1);
  };

  const openDetail = (abstract: AdminAbstract) => {
    setActive(abstract);
    setNotesDraft(abstract.reviewNotes ?? '');
  };

  const updateStatus = async (abstract: AdminAbstract, status: AbstractStatus) => {
    setUpdating(true);
    try {
      const updated = await adminUpdateAbstract(abstract._id, { status });
      setItems((prev) => prev.map((a) => (a._id === abstract._id ? { ...a, ...updated } : a)));
      setActive((prev) => (prev ? { ...prev, ...updated } : prev));
      toast('success', `Marked as ${STATUS_LABEL[status]}`);
      refreshStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const recordDecision = async (abstract: AdminAbstract, decision: AbstractDecision) => {
    setUpdating(true);
    try {
      const updated = await adminUpdateAbstract(abstract._id, { decision });
      setItems((prev) => prev.map((a) => (a._id === abstract._id ? { ...a, ...updated } : a)));
      setActive((prev) => (prev ? { ...prev, ...updated } : prev));
      toast('success', `Decision recorded: ${DECISION_LABEL[decision]}`);
      refreshStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    if (!active) return;
    setUpdating(true);
    try {
      const updated = await adminUpdateAbstract(active._id, { reviewNotes: notesDraft });
      setItems((prev) => prev.map((a) => (a._id === active._id ? { ...a, ...updated } : a)));
      setActive((prev) => (prev ? { ...prev, ...updated } : prev));
      toast('success', 'Review notes saved');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const decidedCount = (stats?.statusCounts.accepted ?? 0) + (stats?.statusCounts.rejected ?? 0);
  const underReviewCount = stats?.statusCounts.under_review ?? 0;
  const reviewsCompletedTotal = stats?.reviewCompletion.completed ?? 0;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={FileText} color="bg-orange/15 text-orange" label="Total Abstracts" value={stats ? stats.total : null} />
        <StatCard icon={CheckCircle2} color="bg-success/15 text-success" label="Decisions Made" value={stats ? decidedCount : null} />
        <StatCard icon={Clock} color="bg-info/15 text-info" label="Under Review" value={stats ? underReviewCount : null} />
        <StatCard icon={Users2} color="bg-chart-violet/15 text-chart-violet" label="Reviews Completed" value={stats ? reviewsCompletedTotal : null} />
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
            placeholder="Search title, author..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setPage(1);
              setStatusFilter('');
            }}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${!statusFilter ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600'}`}
          >
            All
          </button>
          {ABSTRACT_STATUSES.map((s) => (
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
        <select
          value={decisionFilter}
          onChange={(e) => {
            setPage(1);
            setDecisionFilter(e.target.value as AbstractDecision | '');
          }}
          className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Decisions</option>
          {ABSTRACT_DECISIONS.map((d) => (
            <option key={d} value={d}>
              {DECISION_LABEL[d]}
            </option>
          ))}
        </select>
        <select
          value={trackFilter}
          onChange={(e) => {
            setPage(1);
            setTrackFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Tracks</option>
          {tracks.map((t) => (
            <option key={t._id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        {(statusFilter || decisionFilter || trackFilter || q) && (
          <button onClick={clearFilters} className="text-[13px] font-semibold text-orange hover:text-orange-hover">
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={6} cols={7} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-violet/15 text-chart-violet">
              <FileText size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">
              {statusFilter || decisionFilter || trackFilter || q ? 'No abstracts match your filters' : 'No abstract submissions yet'}
            </p>
            {(statusFilter || decisionFilter || trackFilter || q) && (
              <button onClick={clearFilters} className="mt-2 text-sm font-semibold text-orange hover:text-orange-hover">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-3 py-3 font-semibold">Author</th>
                  <th className="px-3 py-3 font-semibold">Track</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Reviews</th>
                  <th className="px-3 py-3 font-semibold">Decision</th>
                  <th className="px-3 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((a) => (
                  <tr key={a._id} onClick={() => openDetail(a)} className="cursor-pointer hover:bg-offwhite">
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-navy">{a.title}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {a.authorName} <span className="text-slate-400">&middot; {a.organization || a.authorEmail}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{a.track}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {a.reviewsCompleted} / {a.reviewsTotal} completed
                      {a.consensus !== null && <span className="ml-1.5 font-semibold text-navy">&middot; {a.consensus}/100</span>}
                    </td>
                    <td className="px-3 py-3">
                      {a.decision ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${DECISION_COLOR[a.decision]}`}>
                          {DECISION_LABEL[a.decision]}
                        </span>
                      ) : (
                        <span className="text-slate-300">&mdash;</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500">
            <span>Page {page} of {pages} &middot; {total} abstract{total === 1 ? '' : 's'}</span>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy/50"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">Abstract Review</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Title</p>
                  <p className="mt-1 text-sm font-semibold text-navy">{active.title}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Author</p>
                  <p className="mt-1 text-sm text-navy">{active.authorName}</p>
                  <a href={`mailto:${active.authorEmail}`} className="text-sm text-orange hover:text-orange-hover">
                    {active.authorEmail}
                  </a>
                  {active.organization && <p className="text-sm text-slate-500">{active.organization}</p>}
                </div>
                {active.coAuthors && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Co-Authors</p>
                    <p className="mt-1 text-sm text-navy">{active.coAuthors}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Track</p>
                  <p className="mt-1 text-sm text-navy">{active.track}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Abstract</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-navy">{active.abstractText}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Reviews ({active.reviewsCompleted}/{active.reviewsTotal})
                  </p>
                  <p className="mt-1 text-sm text-navy">
                    {active.consensus !== null ? `Consensus: ${active.consensus}/100` : 'No completed reviews yet'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ABSTRACT_STATUSES.map((s) => (
                      <button
                        key={s}
                        disabled={updating}
                        onClick={() => updateStatus(active, s)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                          active.status === s ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Committee Decision</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ABSTRACT_DECISIONS.map((d) => (
                      <button
                        key={d}
                        disabled={updating}
                        onClick={() => recordDecision(active, d)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                          active.decision === d ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
                        }`}
                      >
                        {DECISION_LABEL[d]}
                      </button>
                    ))}
                  </div>
                </div>
                <AdminTextarea
                  label="Internal Review Notes (not visible to submitter)"
                  maxLength={1000}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Notes for the programme committee..."
                />
              </div>

              <div className="border-t border-slate-100 px-5 py-4">
                <button
                  onClick={saveNotes}
                  disabled={updating}
                  className="w-full rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40 disabled:opacity-60"
                >
                  Save Notes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
