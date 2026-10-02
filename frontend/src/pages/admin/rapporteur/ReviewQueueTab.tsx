import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, FileCheck2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { adminListReports, adminUpdateReport, adminRetryPolish, type AdminSessionReport } from '../../../services/rapporteur.service';
import { getApiErrorMessage } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { Banner } from '../../../components/ui/Banner';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';

export const ReviewQueueTab = () => {
  const toast = useToast();
  const [reports, setReports] = useState<AdminSessionReport[] | null>(null);
  const [active, setActive] = useState<AdminSessionReport | null>(null);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminListReports('submitted')
      .then(setReports)
      .catch(() => setReports([]));
  };
  useEffect(load, []);

  const open = (r: AdminSessionReport) => {
    setActive(r);
    setSummaryDraft(r.aiPolishedSummary ?? '');
  };

  const save = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await adminUpdateReport(active.reportId, { aiPolishedSummary: summaryDraft });
      toast('success', 'Summary saved.');
      load();
      setActive(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await adminUpdateReport(active.reportId, { aiPolishedSummary: summaryDraft, aiPolishedStatus: 'approved' });
      toast('success', 'Summary approved.');
      load();
      setActive(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const retryPolish = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await adminRetryPolish(active.reportId);
      toast('success', 'AI polish retried.');
      load();
      setActive(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!reports) return <Skeleton className="h-64" />;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-card p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <FileCheck2 size={14} /> Submitted Reports
      </p>
      {reports.length === 0 ? (
        <p className="mt-6 py-6 text-center text-sm text-slate-400">No submitted reports yet.</p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100">
          {reports.map((r) => (
            <button
              key={r.reportId}
              onClick={() => open(r)}
              className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-navy">{r.session.title}</p>
                <p className="truncate text-xs text-slate-400">
                  {r.rapporteurName} &middot; submitted {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : ''}
                </p>
              </div>
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  r.aiPolishedStatus === 'approved'
                    ? 'bg-success/10 text-success'
                    : r.aiPolishError
                      ? 'bg-danger/10 text-danger'
                      : 'bg-warning/10 text-warning'
                }`}
              >
                {r.aiPolishedStatus === 'approved' ? <CheckCircle2 size={11} /> : r.aiPolishError ? <AlertTriangle size={11} /> : null}
                {r.aiPolishedStatus === 'approved' ? 'Approved' : r.aiPolishError ? 'AI polish failed' : 'Needs review'}
              </span>
            </button>
          ))}
        </div>
      )}

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
                <p className="font-display text-lg font-semibold text-navy">{active.session.title}</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm">
                <p className="text-xs text-slate-400">
                  Rapporteur: {active.rapporteurName} ({active.rapporteurEmail})
                </p>

                {active.keyPoints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Key Points</h4>
                    <ul className="mt-1.5 list-inside list-disc space-y-1 text-slate-700">
                      {active.keyPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {active.decisions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Decisions</h4>
                    <ul className="mt-1.5 list-inside list-disc space-y-1 text-slate-700">
                      {active.decisions.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {active.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Action Items</h4>
                    <ul className="mt-1.5 list-inside list-disc space-y-1 text-slate-700">
                      {active.actionItems.map((a, i) => (
                        <li key={i}>
                          {a.text}
                          {a.owner && <span className="text-slate-400"> — {a.owner}</span>}
                          {a.dueDate && <span className="text-slate-400"> (due {a.dueDate})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {active.notableQuotes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notable Quotes</h4>
                    <ul className="mt-1.5 space-y-1.5 text-slate-700">
                      {active.notableQuotes.map((q, i) => (
                        <li key={i} className="italic">
                          &ldquo;{q.text}&rdquo;{q.speaker && <span className="text-slate-400"> — {q.speaker}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI-Polished Summary</h4>
                    {active.aiPolishedStatus === 'approved' && (
                      <span className="text-[11px] font-semibold text-success">Approved</span>
                    )}
                  </div>
                  {active.aiPolishError && !active.aiPolishedSummary && (
                    <div className="mt-2">
                      <Banner variant="error">AI polish failed: {active.aiPolishError}</Banner>
                    </div>
                  )}
                  <textarea
                    value={summaryDraft}
                    onChange={(e) => setSummaryDraft(e.target.value)}
                    rows={8}
                    placeholder="No AI-polished summary yet — retry below, or write one manually."
                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  onClick={retryPolish}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-orange/40 disabled:opacity-50"
                >
                  <RefreshCw size={13} /> Retry AI Polish
                </button>
                <button
                  onClick={save}
                  disabled={busy}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-orange/40 disabled:opacity-50"
                >
                  Save Draft
                </button>
                <Button variant="primary" className="ml-auto !px-4 !py-2 !text-xs" loading={busy} onClick={approve}>
                  Approve
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
