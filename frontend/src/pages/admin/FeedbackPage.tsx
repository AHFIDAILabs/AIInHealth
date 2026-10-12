import { useCallback, useEffect, useState } from 'react';
import { Star, Download, Eye, X } from 'lucide-react';
import {
  adminFeedbackSummary,
  adminListFeedback,
  adminFeedbackQrUrl,
  type FeedbackSummaryRow,
  type AdminFeedbackItem,
} from '../../services/feedback.service';
import { adminListSessions, type AdminSession } from '../../services/session.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { AdminSelect } from '../../components/ui/AdminField';

const Stars = ({ value }: { value: number }) => (
  <span className="inline-flex items-center gap-0.5" title={`${value.toFixed(1)} / 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={14} className={n <= Math.round(value) ? 'fill-orange text-orange' : 'text-slate-200'} />
    ))}
  </span>
);

// Anonymous session/event feedback collected via a venue QR code — event-
// extras plan, Batch 4. Two parts: a QR-generation tool for any session (so
// codes can be printed before any feedback ever comes in) and a results view
// once submissions exist.
export const FeedbackPage = () => {
  const [summary, setSummary] = useState<FeedbackSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [qrSessionId, setQrSessionId] = useState('');
  const [viewing, setViewing] = useState<{ sessionRef: string; title: string } | null>(null);
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminFeedbackSummary()
      .then(setSummary)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    adminListSessions({ limit: 300 })
      .then((res) => setSessions(res.items))
      .catch(() => setSessions([]));
  }, []);

  const openView = (row: { sessionRef: string | null; sessionTitle: string }) => {
    const bucket = row.sessionRef ?? 'general';
    setViewing({ sessionRef: bucket, title: row.sessionTitle });
    setItemsLoading(true);
    setItemsError('');
    adminListFeedback({ sessionRef: bucket, limit: 100 })
      .then((res) => setItems(res.items))
      .catch((err) => setItemsError(getApiErrorMessage(err)))
      .finally(() => setItemsLoading(false));
  };

  const generalRow = summary.find((s) => s.sessionRef === null);
  const sessionRows = summary.filter((s) => s.sessionRef !== null);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-semibold text-navy">Feedback</h1>
      <p className="text-sm text-slate-500">Anonymous ratings and comments collected via QR codes at the venue.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">General Event Feedback</p>
          {generalRow ? (
            <div className="mt-2 flex items-center gap-3">
              <Stars value={generalRow.averageRating} />
              <span className="text-sm text-slate-500">
                {generalRow.averageRating.toFixed(1)} · {generalRow.count} response{generalRow.count === 1 ? '' : 's'}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No responses yet.</p>
          )}
          <div className="mt-4 flex gap-2">
            <a
              href={adminFeedbackQrUrl()}
              download="aihs-2026-feedback-general-qr.png"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange/40"
            >
              <Download size={13} /> Download QR
            </a>
            {generalRow && (
              <button
                onClick={() => openView(generalRow)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange/40"
              >
                <Eye size={13} /> View Responses
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Get a QR for a Session</p>
          <p className="mt-1 text-xs text-slate-400">Print these before the session — they work with zero responses on file.</p>
          <div className="mt-3">
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
              className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange/40"
            >
              <Download size={13} /> Download QR
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-5">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-semibold text-navy">Per-Session Results</p>
        {loading ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
            <SkeletonRows rows={4} cols={4} />
          </div>
        ) : sessionRows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No session feedback has come in yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Session</th>
                  <th className="px-3 py-3 font-semibold">Rating</th>
                  <th className="px-3 py-3 font-semibold">Responses</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessionRows.map((row) => (
                  <tr key={row.sessionRef}>
                    <td className="px-4 py-3 font-medium text-navy">{row.sessionTitle}</td>
                    <td className="px-3 py-3">
                      <Stars value={row.averageRating} />
                    </td>
                    <td className="px-3 py-3 text-slate-500">{row.count}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => openView(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-offwhite hover:text-navy" title="View responses">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4" onClick={() => setViewing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <p className="font-display text-base font-semibold text-navy">{viewing.title}</p>
              <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-navy">
                <X size={18} />
              </button>
            </div>
            <div className="divide-y divide-slate-100 px-5">
              {itemsLoading ? (
                <p className="py-6 text-sm text-slate-400">Loading…</p>
              ) : itemsError ? (
                <p className="py-6 text-sm text-danger">{itemsError}</p>
              ) : items.length === 0 ? (
                <p className="py-6 text-sm text-slate-400">No responses yet.</p>
              ) : (
                items.map((item) => (
                  <div key={item._id} className="py-3">
                    <div className="flex items-center justify-between">
                      <Stars value={item.rating} />
                      <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString('en-GB')}</span>
                    </div>
                    {item.comment && <p className="mt-1.5 text-sm text-slate-600">{item.comment}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
