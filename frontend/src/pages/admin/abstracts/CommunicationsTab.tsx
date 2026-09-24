import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, X } from 'lucide-react';
import {
  adminListCommunications,
  adminUpdateCommunication,
  adminSendCommunication,
  adminCancelCommunication,
  type AdminCommunication,
} from '../../../services/communication.service';
import type { CommunicationStatus } from '../../../services/abstract.service';
import { getApiErrorMessage } from '../../../services/api';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { AdminInput, AdminTextarea } from '../../../components/ui/AdminField';
import { useToast } from '../../../contexts/ToastContext';

const STATUS_OPTIONS: CommunicationStatus[] = ['draft', 'sent', 'failed', 'cancelled'];

const STATUS_COLOR: Record<CommunicationStatus, string> = {
  draft: 'bg-warning/10 text-warning',
  sent: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
  cancelled: 'bg-slate-100 text-slate-500',
};

const STATUS_LABEL: Record<CommunicationStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const CommunicationsTab = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommunicationStatus | ''>('');
  const [active, setActive] = useState<AdminCommunication | null>(null);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListCommunications({ status: statusFilter || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(load, [load]);

  const openDetail = (comm: AdminCommunication) => {
    setActive(comm);
    setSubjectDraft(comm.subject);
    setBodyDraft(comm.body);
  };

  const saveDraft = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const updated = await adminUpdateCommunication(active._id, { subject: subjectDraft, body: bodyDraft });
      setItems((prev) => prev.map((c) => (c._id === active._id ? updated : c)));
      setActive(updated);
      toast('success', 'Draft saved');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const updated = await adminSendCommunication(active._id);
      setItems((prev) => prev.map((c) => (c._id === active._id ? updated : c)));
      setActive(updated);
      toast('success', 'Email sent');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
      load(); // reflect a possible 'failed' status even though the request itself errored
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const updated = await adminCancelCommunication(active._id);
      setItems((prev) => prev.map((c) => (c._id === active._id ? updated : c)));
      setActive(updated);
      toast('success', 'Draft cancelled');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(false);
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
        {STATUS_OPTIONS.map((s) => (
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
          <SkeletonRows rows={6} cols={4} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-blue/15 text-chart-blue">
              <Mail size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No communications yet</p>
            <p className="mt-1 text-sm text-slate-500">A draft is created automatically when a decision is recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Abstract</th>
                <th className="px-3 py-3 font-semibold">Subject</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((c) => (
                <tr key={c._id} onClick={() => openDetail(c)} className="cursor-pointer hover:bg-offwhite">
                  <td className="max-w-xs truncate px-4 py-3 font-medium text-navy">{c.abstract.title}</td>
                  <td className="max-w-xs truncate px-3 py-3 text-slate-500">{c.subject}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500">
            <span>Page {page} of {pages} &middot; {total} communication{total === 1 ? '' : 's'}</span>
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
                <p className="font-display text-lg font-semibold text-navy">Notification</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Abstract</p>
                  <p className="mt-1 text-sm font-semibold text-navy">{active.abstract.title}</p>
                  <p className="text-sm text-slate-500">
                    To: {active.abstract.authorName} &lt;{active.abstract.authorEmail}&gt;
                  </p>
                </div>

                <div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[active.status]}`}>
                    {STATUS_LABEL[active.status]}
                  </span>
                  {active.sentAt && <span className="ml-2 text-xs text-slate-400">Sent {new Date(active.sentAt).toLocaleString()}</span>}
                </div>

                {active.status === 'failed' && active.failureReason && (
                  <Banner variant="error">{active.failureReason}</Banner>
                )}

                {active.status === 'draft' ? (
                  <>
                    <AdminInput label="Subject" value={subjectDraft} onChange={(e) => setSubjectDraft(e.target.value)} />
                    <AdminTextarea
                      label="Body (HTML)"
                      value={bodyDraft}
                      onChange={(e) => setBodyDraft(e.target.value)}
                      className="min-h-[220px]"
                    />
                  </>
                ) : (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Subject</p>
                    <p className="mt-1 text-sm text-navy">{active.subject}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Body</p>
                    <div className="mt-1 rounded-lg border border-slate-200 p-3 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: active.body }} />
                  </div>
                )}
              </div>

              {active.status === 'draft' && (
                <div className="space-y-2 border-t border-slate-100 px-5 py-4">
                  <button
                    onClick={saveDraft}
                    disabled={busy}
                    className="w-full rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40 disabled:opacity-60"
                  >
                    Save Draft
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={cancel}
                      disabled={busy}
                      className="flex-1 rounded-lg border border-danger/40 py-2.5 text-[13px] font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={send}
                      disabled={busy}
                      className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              {active.status === 'failed' && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <button
                    onClick={send}
                    disabled={busy}
                    className="w-full rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                  >
                    Retry Send
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
