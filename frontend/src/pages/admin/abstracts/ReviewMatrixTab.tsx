import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, X, UserPlus } from 'lucide-react';
import {
  adminListReviewMatrix,
  adminAssignReviewer,
  adminUnassignReviewer,
  ABSTRACT_STATUSES,
  type ReviewMatrixRow,
  type AbstractStatus,
  type ScoreBand,
  type CommunicationStatus,
} from '../../../services/abstract.service';
import { adminListReviewers, adminCreateReviewer, type AdminReviewer } from '../../../services/reviewerAdmin.service';
import { getApiErrorMessage } from '../../../services/api';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { AdminInput } from '../../../components/ui/AdminField';
import { useToast } from '../../../contexts/ToastContext';

const STATUS_LABEL: Record<AbstractStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  revision_requested: 'Revision Requested',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const BAND_LABEL: Record<ScoreBand, string> = {
  strong_accept: 'Strong Accept',
  accept: 'Accept',
  borderline: 'Borderline',
  reject: 'Reject',
};

const BAND_COLOR: Record<ScoreBand, string> = {
  strong_accept: 'bg-success/10 text-success',
  accept: 'bg-orange/10 text-orange',
  borderline: 'bg-warning/10 text-warning',
  reject: 'bg-danger/10 text-danger',
};

const NOTIFICATION_LABEL: Record<CommunicationStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const NOTIFICATION_COLOR: Record<CommunicationStatus, string> = {
  draft: 'bg-warning/10 text-warning',
  sent: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
  cancelled: 'bg-slate-100 text-slate-500',
};

const AssignReviewerForm = ({
  abstractId,
  reviewers,
  onAssigned,
  onReviewerCreated,
}: {
  abstractId: string;
  reviewers: AdminReviewer[];
  onAssigned: () => void;
  onReviewerCreated: (r: AdminReviewer) => void;
}) => {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Does the actual assign call — no `submitting` guard of its own, since
  // both call sites below already manage that flag around whatever else
  // they need to do first (createAndAssign creates the reviewer first).
  const doAssign = async (reviewerId: string) => {
    await adminAssignReviewer(abstractId, reviewerId);
    toast('success', 'Reviewer assigned — an invite email has been sent');
    onAssigned();
    setSelectedId('');
  };

  const assign = async (reviewerId: string) => {
    // Synchronous re-entrance guard — `disabled={submitting}` on the button
    // closes this for a normal click, but React only applies that to the DOM
    // on the next render, leaving a brief window where a fast double-click
    // (or an impatient second click on a slow connection) can fire this twice
    // before the button visually disables. That second call would otherwise
    // succeed at the API layer too — assignment is idempotent from the
    // backend's point of view — but it'd surface a confusing "already
    // assigned" error even though the first call already succeeded.
    if (submitting) return;
    setSubmitting(true);
    try {
      await doAssign(reviewerId);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const createAndAssign = async () => {
    if (!newName.trim() || !newEmail.trim() || submitting) return;
    setSubmitting(true);
    try {
      const reviewer = await adminCreateReviewer({ fullName: newName.trim(), email: newEmail.trim() });
      onReviewerCreated(reviewer);
      await doAssign(reviewer._id);
      setNewName('');
      setNewEmail('');
      setShowNew(false);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (showNew) {
    return (
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-48">
          <AdminInput label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <div className="w-56">
          <AdminInput label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </div>
        <button
          onClick={createAndAssign}
          disabled={submitting || !newName.trim() || !newEmail.trim()}
          className="rounded-lg bg-orange px-3.5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add & Assign'}
        </button>
        <button onClick={() => setShowNew(false)} className="text-xs font-medium text-slate-500 hover:text-navy">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
      >
        <option value="">Select a reviewer&hellip;</option>
        {reviewers.map((r) => (
          <option key={r._id} value={r._id}>
            {r.fullName} ({r.email})
          </option>
        ))}
      </select>
      <button
        onClick={() => selectedId && assign(selectedId)}
        disabled={!selectedId || submitting}
        className="rounded-lg border border-orange px-3.5 py-2 text-xs font-semibold text-orange hover:bg-orange/10 disabled:opacity-50"
      >
        {submitting ? 'Assigning…' : 'Assign'}
      </button>
      <button
        onClick={() => setShowNew(true)}
        className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy"
      >
        <UserPlus size={13} /> New reviewer
      </button>
    </div>
  );
};

export const ReviewMatrixTab = () => {
  const toast = useToast();
  const [rows, setRows] = useState<ReviewMatrixRow[]>([]);
  const [reviewers, setReviewers] = useState<AdminReviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<AbstractStatus | ''>('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListReviewMatrix({ status: statusFilter || undefined, page, limit: 20 })
      .then((res) => {
        setRows(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminListReviewers().then(setReviewers).catch(() => setReviewers([]));
  }, []);

  const unassign = async (abstractId: string, reviewId: string) => {
    try {
      await adminUnassignReviewer(abstractId, reviewId);
      toast('success', 'Reviewer unassigned');
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  return (
    <div>
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

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        {loading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No abstracts to review yet.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="w-8 px-4 py-3" />
                <th className="px-3 py-3 font-semibold">Abstract</th>
                <th className="px-3 py-3 font-semibold">Reviewers</th>
                <th className="px-3 py-3 font-semibold">Reviews</th>
                <th className="px-3 py-3 font-semibold">Consensus</th>
                <th className="px-3 py-3 font-semibold">Notification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const isOpen = expanded === row.abstract._id;
                return (
                  <Fragment key={row.abstract._id}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : row.abstract._id)}
                      className="cursor-pointer hover:bg-offwhite"
                    >
                      <td className="px-4 py-3 text-slate-400">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                      <td className="max-w-xs px-3 py-3">
                        <p className="truncate font-medium text-navy">{row.abstract.title}</p>
                        <p className="text-xs text-slate-400">
                          {row.abstract.authorName} &middot; {row.abstract.track}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {row.reviews.length === 0 ? (
                            <span className="text-xs text-slate-400">None assigned</span>
                          ) : (
                            row.reviews.map((r) => (
                              <span
                                key={r.reviewId}
                                title={
                                  r.reviewerStatus === 'declined'
                                    ? `${r.reviewer.email} — declined, needs reassignment`
                                    : r.reviewer.email
                                }
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  r.reviewerStatus === 'declined'
                                    ? 'bg-danger/10 text-danger'
                                    : r.status === 'completed'
                                      ? 'bg-success/10 text-success'
                                      : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {r.reviewer.fullName}:{' '}
                                {r.reviewerStatus === 'declined'
                                  ? 'Declined'
                                  : r.status === 'completed'
                                    ? r.weightedScore
                                    : r.reviewerStatus === 'pending'
                                      ? 'Awaiting response'
                                      : 'Pending'}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {row.reviewsCompleted} / {row.reviewsTotal}
                      </td>
                      <td className="px-3 py-3">
                        {row.consensus !== null && row.scoreBand ? (
                          <div>
                            <span className="font-semibold text-navy">{row.consensus}/100</span>
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BAND_COLOR[row.scoreBand]}`}>
                              {BAND_LABEL[row.scoreBand]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {row.notificationStatus ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${NOTIFICATION_COLOR[row.notificationStatus]}`}>
                            {NOTIFICATION_LABEL[row.notificationStatus]}
                          </span>
                        ) : (
                          <span className="text-slate-300">&mdash;</span>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-offwhite/40">
                        <td />
                        <td colSpan={5} className="space-y-3 px-3 py-4">
                          {row.reviews.length > 0 && (
                            <div className="space-y-1.5">
                              {row.reviews.map((r) => (
                                <div key={r.reviewId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                                  <span className="text-slate-600">
                                    {r.reviewer.fullName} <span className="text-slate-400">({r.reviewer.email})</span>
                                  </span>
                                  <button
                                    onClick={() => unassign(row.abstract._id, r.reviewId)}
                                    className="flex items-center gap-1 text-xs font-semibold text-danger hover:text-danger/80"
                                  >
                                    <X size={13} /> Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <AssignReviewerForm
                            abstractId={row.abstract._id}
                            reviewers={reviewers.filter((r) => !row.reviews.some((rev) => rev.reviewer._id === r._id))}
                            onAssigned={load}
                            onReviewerCreated={(r) => setReviewers((prev) => [...prev, r])}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        {!loading && rows.length > 0 && (
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
    </div>
  );
};
