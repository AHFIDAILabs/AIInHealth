import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, GraduationCap, Paperclip, Check, Ban, Download, Sparkles } from 'lucide-react';
import {
  fetchScholarshipApplications,
  decideScholarshipApplication,
  adminAnalyzeApplications,
  exportScholarshipApplicationsUrl,
  SCHOLARSHIP_APPLICATION_STATUSES,
  SCHOLARSHIP_DISCOUNTS,
  type AdminScholarshipApplication,
  type ScholarshipApplicationStatus,
  type ScholarshipDiscount,
  type ScholarshipStudyLevel,
} from '../../services/scholarshipApplication.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { AdminSelect, AdminTextarea } from '../../components/ui/AdminField';
import { useToast } from '../../contexts/ToastContext';

const STATUS_STYLE: Record<ScholarshipApplicationStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
};

const STUDY_LEVEL_LABEL: Record<ScholarshipStudyLevel, string> = {
  undergraduate: 'Undergraduate',
  postgraduate_masters: "Postgraduate — Master's",
  postgraduate_phd: 'Postgraduate — PhD',
  diploma_certificate: 'Diploma / Certificate',
  other: 'Other',
};

// Admin-only suggestion aid (scholarshipApplication.controller.ts's
// adminAnalyze) — never affects decide(); purely a sort/annotate hint so the
// strongest candidates in a large pending pool are easy to spot.
const scoreBadgeClass = (score: number): string =>
  score >= 70 ? 'bg-success/10 text-success' : score >= 40 ? 'bg-warning/10 text-warning' : 'bg-slate-100 text-slate-500';

export const ScholarshipApplicationsPage = () => {
  const toast = useToast();

  const [items, setItems] = useState<AdminScholarshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScholarshipApplicationStatus | ''>('pending');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [active, setActive] = useState<AdminScholarshipApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState<ScholarshipDiscount>(100);
  const [deciding, setDeciding] = useState<'approved' | 'rejected' | null>(null);
  const [decideError, setDecideError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetchScholarshipApplications({ q: q || undefined, status: statusFilter || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, statusFilter, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const analyzeWithAi = async () => {
    setAnalyzing(true);
    try {
      const result = await adminAnalyzeApplications();
      toast('success', `Scored ${result.scored} of ${result.items.length} application${result.items.length === 1 ? '' : 's'}.`);
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  // Display-only — sorts just the current page, highest-scored first;
  // unscored applications (aiScore undefined) sort after every scored one.
  const sortedItems = [...items].sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));

  const openReview = (item: AdminScholarshipApplication) => {
    setActive(item);
    setReviewNotes(item.reviewNotes ?? '');
    setDiscountPercent(100);
    setDecideError('');
  };

  const decide = async (status: 'approved' | 'rejected') => {
    if (!active) return;
    setDeciding(status);
    setDecideError('');
    try {
      const updated = await decideScholarshipApplication(active._id, {
        status,
        reviewNotes: reviewNotes || undefined,
        discountPercent: status === 'approved' ? discountPercent : undefined,
      });
      setItems((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      toast('success', status === 'approved' ? `Approved — a sponsorship code was emailed to ${updated.email}` : 'Application declined');
      setActive(null);
    } catch (err) {
      setDecideError(getApiErrorMessage(err));
    } finally {
      setDeciding(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Sponsorship Applications</h1>
          <p className="text-sm text-slate-500">
            {total} application{total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={analyzeWithAi}
            disabled={analyzing}
            title="Score every pending application so the strongest candidates are easy to spot — never auto-approves anyone"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:border-orange/40 disabled:opacity-60"
          >
            <Sparkles size={16} /> {analyzing ? 'Analyzing…' : 'Analyze with AI'}
          </button>
          <a
            href={exportScholarshipApplicationsUrl({ status: statusFilter || undefined, q: q || undefined })}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40"
          >
            <Download size={16} /> Export CSV
          </a>
        </div>
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
            placeholder="Search by name, email, or country..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as ScholarshipApplicationStatus | '');
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {SCHOLARSHIP_APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <SkeletonRows rows={6} cols={6} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 text-center shadow-card transition-shadow hover:shadow-card-hover">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
            <GraduationCap size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No applications yet</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Applicant</th>
                  <th className="px-3 py-3 font-semibold">Country</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">AI Score</th>
                  <th className="px-3 py-3 font-semibold">Submitted</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((a) => (
                  <tr key={a._id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{a.fullName}</p>
                      <p className="text-xs text-slate-400">{a.email}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{a.country}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[a.status]}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {a.aiScore !== undefined ? (
                        <span
                          title={a.aiRationale}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${scoreBadgeClass(a.aiScore)}`}
                        >
                          {a.aiScore}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => openReview(a)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-offwhite"
                      >
                        {a.status === 'pending' ? 'Review' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </div>
      )}

      {/* Review slide-over */}
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
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">{active.fullName}</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-[13px]">
                {decideError && <Banner variant="error">{decideError}</Banner>}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Email</p>
                    <p className="break-all text-navy">{active.email}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Phone</p>
                    <p className="text-navy">{active.phone}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Country</p>
                    <p className="text-navy">{active.country}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      {active.applicantType === 'student' ? 'School / Institution' : 'Organization / Institution'}
                    </p>
                    <p className="text-navy">{active.organization}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Applicant Type</p>
                    <p className="capitalize text-navy">{active.applicantType}</p>
                  </div>
                  {active.applicantType === 'student' ? (
                    <>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Course of Study</p>
                        <p className="text-navy">{active.courseOfStudy || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Level</p>
                        <p className="text-navy">{STUDY_LEVEL_LABEL[active.level as ScholarshipStudyLevel] ?? '—'}</p>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        {active.applicantType === 'employee' ? 'Designation / Job Title' : 'Occupation'}
                      </p>
                      <p className="text-navy">{active.designation || '—'}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Why they want to attend</p>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-navy">{active.reason}</p>
                </div>

                {active.aiScore !== undefined && (
                  <div className="rounded-lg border border-slate-200 bg-offwhite/60 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400">
                      <Sparkles size={12} /> AI Score
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal ${scoreBadgeClass(active.aiScore)}`}>
                        {active.aiScore}/100
                      </span>
                    </p>
                    {active.aiRationale && <p className="mt-1.5 text-navy">{active.aiRationale}</p>}
                  </div>
                )}

                {active.supportingDocumentUrl && (
                  <a
                    href={active.supportingDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-orange hover:bg-offwhite"
                  >
                    <Paperclip size={14} /> View supporting document
                  </a>
                )}

                {active.status === 'pending' ? (
                  <>
                    <AdminSelect
                      label="Sponsorship discount (if approved)"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value) as ScholarshipDiscount)}
                    >
                      {SCHOLARSHIP_DISCOUNTS.map((d) => (
                        <option key={d} value={d}>
                          {d}% off{d === 100 ? ' (fully covered)' : ''}
                        </option>
                      ))}
                    </AdminSelect>
                    <AdminTextarea
                      label="Review notes (optional, internal only)"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </>
                ) : (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Review notes</p>
                    <p className="mt-1 text-navy">{active.reviewNotes || '—'}</p>
                    {active.decidedAt && (
                      <p className="mt-2 text-xs text-slate-400">Decided {new Date(active.decidedAt).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>

              {active.status === 'pending' && (
                <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                  <button
                    onClick={() => decide('rejected')}
                    disabled={deciding !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-danger/30 py-2.5 text-[13px] font-semibold text-danger hover:bg-danger/5 disabled:opacity-60"
                  >
                    <Ban size={15} /> {deciding === 'rejected' ? 'Declining…' : 'Decline'}
                  </button>
                  <button
                    onClick={() => decide('approved')}
                    disabled={deciding !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                  >
                    <Check size={15} /> {deciding === 'approved' ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
