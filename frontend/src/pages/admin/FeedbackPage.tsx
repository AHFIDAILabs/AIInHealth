import { useCallback, useEffect, useState } from 'react';
import { Star, Download, Send, MessageSquareOff, MessageSquareText } from 'lucide-react';
import {
  adminFeedbackSummary,
  adminFeedbackStats,
  adminListFeedback,
  adminFeedbackQrUrl,
  adminFeedbackInviteStats,
  adminSendFeedbackInvites,
  type FeedbackSummaryRow,
  type FeedbackStats,
  type AdminFeedbackItem,
  type FeedbackInviteStats,
} from '../../services/feedback.service';
import { adminListSessions, type AdminSession } from '../../services/session.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { AdminSelect } from '../../components/ui/AdminField';
import { AnalyticsStatCard } from './analytics/AnalyticsStatCard';
import { HorizontalBarChart } from './analytics/HorizontalBarChart';
import { TrendAreaChart } from './analytics/TrendAreaChart';

const Stars = ({ value }: { value: number }) => (
  <span className="inline-flex items-center gap-0.5" title={`${value.toFixed(1)} / 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={14} className={n <= Math.round(value) ? 'fill-orange text-orange' : 'text-slate-200'} />
    ))}
  </span>
);

const relativeDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

type Bucket = { sessionRef: string; title: string };

// Anonymous session/event feedback collected via a venue QR code or a post-
// event email invite (feedback.service.ts's adminSendFeedbackInvites) — event-
// extras plan, Batch 4, extended. Responses show inline with filters +
// pagination rather than a modal, so a reviewer can keep the charts in view
// while paging through comments.
export const FeedbackPage = () => {
  const [summary, setSummary] = useState<FeedbackSummaryRow[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [qrSessionId, setQrSessionId] = useState('');
  const [inviteStats, setInviteStats] = useState<FeedbackInviteStats | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');
  const [sendError, setSendError] = useState('');

  const [bucket, setBucket] = useState<Bucket>({ sessionRef: 'general', title: 'General Event Feedback' });
  const [ratingFilter, setRatingFilter] = useState('');
  const [commentFilter, setCommentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([adminFeedbackSummary(), adminFeedbackStats()])
      .then(([summaryRes, statsRes]) => {
        setSummary(summaryRes);
        setStats(statsRes);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const loadInviteStats = useCallback(() => {
    adminFeedbackInviteStats().then(setInviteStats).catch(() => undefined);
  }, []);

  useEffect(load, [load]);
  useEffect(loadInviteStats, [loadInviteStats]);

  useEffect(() => {
    adminListSessions({ limit: 300 })
      .then((res) => setSessions(res.items))
      .catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    setItemsLoading(true);
    setItemsError('');
    adminListFeedback({
      sessionRef: bucket.sessionRef,
      rating: ratingFilter ? Number(ratingFilter) : undefined,
      hasComment: commentFilter ? commentFilter === 'true' : undefined,
      page,
      limit: 10,
    })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setItemsError(getApiErrorMessage(err)))
      .finally(() => setItemsLoading(false));
  }, [bucket, ratingFilter, commentFilter, page]);

  const selectBucket = (next: Bucket) => {
    setBucket(next);
    setPage(1);
  };

  const notYetInvited = inviteStats ? inviteStats.confirmedAttendees - inviteStats.invited : 0;

  const sendInvites = async () => {
    setSending(true);
    setSendError('');
    setSendResult('');
    try {
      const res = await adminSendFeedbackInvites();
      setSendResult(`Sent to ${res.sent} of ${res.targeted} registrants${res.failed ? ` (${res.failed} failed)` : ''}.`);
      loadInviteStats();
    } catch (err) {
      setSendError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const generalRow = summary.find((s) => s.sessionRef === null);
  const sessionRows = summary.filter((s) => s.sessionRef !== null);

  const distributionData =
    stats?.distribution.map((d) => ({ label: `${d.rating} ${d.rating === 1 ? 'star' : 'stars'}`, value: d.count })) ?? null;
  const bySessionRatingData = loading ? null : sessionRows.map((s) => ({ label: s.sessionTitle, value: s.averageRating }));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-2xl font-semibold text-navy">Feedback</h1>
      <p className="text-sm text-slate-500">Anonymous ratings and comments collected via QR codes and post-event email invites.</p>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Send Feedback Request</p>
        <p className="mt-1 text-xs text-slate-400">
          Emails every confirmed registrant &mdash; attendees, speakers, VIPs, volunteers, exhibitors, innovators,
          sponsors and staff alike &mdash; a personal link to the feedback form below.
        </p>
        {inviteStats && (
          <p className="mt-3 text-sm text-slate-600">
            {inviteStats.invited} of {inviteStats.confirmedAttendees} confirmed registrants invited &middot;{' '}
            {inviteStats.responded} responded
          </p>
        )}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={sendInvites}
            disabled={sending || notYetInvited <= 0}
            className="flex items-center gap-1.5 rounded-lg bg-orange px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange/90 disabled:opacity-50"
          >
            <Send size={13} />
            {sending
              ? 'Sending…'
              : notYetInvited > 0
                ? `Send to ${notYetInvited} Not Yet Invited`
                : 'Everyone Confirmed Has Been Invited'}
          </button>
          {sendResult && <span className="text-xs text-slate-500">{sendResult}</span>}
        </div>
        {sendError && (
          <div className="mt-3">
            <Banner variant="error">{sendError}</Banner>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AnalyticsStatCard icon={MessageSquareText} label="Total Responses" value={loading ? null : stats?.count ?? 0} />
        <AnalyticsStatCard icon={Star} label="Average Rating" value={loading ? null : `${stats?.averageRating ?? 0} / 5`} />
        <AnalyticsStatCard icon={MessageSquareText} label="General Event Responses" value={loading ? null : generalRow?.count ?? 0} />
        <AnalyticsStatCard icon={MessageSquareOff} label="Sessions With Feedback" value={loading ? null : sessionRows.length} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rating Distribution</p>
          <HorizontalBarChart data={distributionData} color="#E8792C" emptyLabel="No responses yet" />
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Average Rating by Session</p>
          <HorizontalBarChart
            data={bySessionRatingData}
            color="#7C3AED"
            emptyLabel="No session feedback has come in yet"
            valueFormatter={(n) => `${n.toFixed(1)} / 5`}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Responses Over Time</p>
        <TrendAreaChart
          data={loading ? null : stats?.byDay ?? []}
          color="#0D9488"
          emptyLabel="No responses yet"
          unitLabel={(n) => `response${n === 1 ? '' : 's'}`}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">General Event QR</p>
          <p className="mt-1 text-xs text-slate-400">Printable signage for the venue&rsquo;s general feedback link.</p>
          <a
            href={adminFeedbackQrUrl()}
            download="aihs-2026-feedback-general-qr.png"
            className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange/40"
          >
            <Download size={13} /> Download QR
          </a>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">QR for a Session</p>
          <p className="mt-1 text-xs text-slate-400">Print these before the session &mdash; they work with zero responses on file.</p>
          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <AdminSelect label="Session" value={qrSessionId} onChange={(e) => setQrSessionId(e.target.value)} disabled={!sessions}>
                <option value="">Choose a session…</option>
                {sessions?.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.title}
                  </option>
                ))}
              </AdminSelect>
            </div>
            {qrSessionId && (
              <a
                href={adminFeedbackQrUrl(qrSessionId)}
                download={`aihs-2026-feedback-${qrSessionId}-qr.png`}
                className="flex h-[42px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange/40"
              >
                <Download size={13} /> Download
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <p className="text-sm font-semibold text-navy">Responses</p>

        {/* Bucket chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => selectBucket({ sessionRef: 'general', title: 'General Event Feedback' })}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              bucket.sessionRef === 'general' ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500 hover:border-orange/30'
            }`}
          >
            General ({generalRow?.count ?? 0})
          </button>
          {sessionRows.map((row) => (
            <button
              key={row.sessionRef}
              onClick={() => selectBucket({ sessionRef: row.sessionRef as string, title: row.sessionTitle })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                bucket.sessionRef === row.sessionRef ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500 hover:border-orange/30'
              }`}
            >
              {row.sessionTitle} ({row.count})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <div className="w-40">
            <AdminSelect
              label="Rating"
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'star' : 'stars'}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div className="w-48">
            <AdminSelect
              label="Comments"
              value={commentFilter}
              onChange={(e) => {
                setCommentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All responses</option>
              <option value="true">With comments only</option>
              <option value="false">Rating only</option>
            </AdminSelect>
          </div>
          <span className="pb-2.5 text-xs text-slate-400">{total} matching</span>
        </div>

        {/* Inline paginated list */}
        <div className="mt-4 divide-y divide-slate-100">
          {itemsLoading ? (
            <SkeletonRows rows={4} cols={1} />
          ) : itemsError ? (
            <Banner variant="error">{itemsError}</Banner>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No responses match these filters.</p>
          ) : (
            items.map((item) => (
              <div key={item._id} className="py-3">
                <div className="flex items-center justify-between">
                  <Stars value={item.rating} />
                  <span className="text-xs text-slate-400">{relativeDate(item.createdAt)}</span>
                </div>
                {item.comment && <p className="mt-1.5 text-sm text-slate-600">{item.comment}</p>}
              </div>
            ))
          )}
        </div>

        {!itemsLoading && items.length > 0 && (
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-[13px] text-slate-500">
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
