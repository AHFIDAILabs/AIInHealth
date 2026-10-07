import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X, Layers, Copy, Check, CheckCircle2, Clock, Ban } from 'lucide-react';
import {
  adminListAccessCodeBatches,
  adminGetAccessCodeBatch,
  adminGenerateAccessCodeBatch,
  type AdminAccessCodeBatch,
  type AdminAccessCodeBatchDetail,
} from '../../services/accessCodeBatch.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { AdminInput } from '../../components/ui/AdminField';
import { useToast } from '../../contexts/ToastContext';

const QUICK_QUANTITIES = [5, 10, 20] as const;

interface FormState {
  quantity: string;
  distributorEmail: string;
  label: string;
}
const EMPTY_FORM: FormState = { quantity: '10', distributorEmail: '', label: '' };

export const AccessCodeBatchesPage = () => {
  const toast = useToast();

  const [items, setItems] = useState<AdminAccessCodeBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<AdminAccessCodeBatchDetail | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListAccessCodeBatches({ page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      return;
    }
    setActiveLoading(true);
    adminGetAccessCodeBatch(activeId)
      .then(setActive)
      .catch((err) => toast('error', getApiErrorMessage(err)))
      .finally(() => setActiveLoading(false));
  }, [activeId, toast]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      setFormError('Enter a whole number between 1 and 100.');
      return;
    }
    if (!form.distributorEmail.trim()) {
      setFormError('Enter the distributor’s email.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await adminGenerateAccessCodeBatch({
        quantity,
        distributorEmail: form.distributorEmail.trim(),
        label: form.label.trim() || undefined,
      });
      toast('success', `${quantity} code${quantity === 1 ? '' : 's'} generated and emailed to ${form.distributorEmail.trim()}`);
      setFormOpen(false);
      if (page === 1) load();
      else setPage(1);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 1500);
    } catch {
      toast('error', 'Could not copy — copy it manually.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Access Code Batches</h1>
          <p className="text-sm text-slate-500">{total} batch{total === 1 ? '' : 'es'}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Generate Batch
        </button>
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
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
            <Layers size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No batches yet</p>
          <button onClick={openCreate} className="mt-3 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
            Generate Batch
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Label</th>
                  <th className="px-3 py-3 font-semibold">Distributor</th>
                  <th className="px-3 py-3 font-semibold">Quantity</th>
                  <th className="px-3 py-3 font-semibold">Used / Pending / Expired</th>
                  <th className="px-3 py-3 font-semibold">Expires</th>
                  <th className="px-3 py-3 font-semibold">Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((b) => (
                  <tr key={b._id} onClick={() => setActiveId(b._id)} className="cursor-pointer hover:bg-offwhite/60">
                    <td className="px-4 py-3 text-navy">{b.label || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {b.distributorEmail}
                      {!b.sentAt && <p className="text-xs text-warning">Not yet sent</p>}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{b.quantity}</td>
                    <td className="px-3 py-3 text-slate-500">
                      <span className="text-success">{b.counts.used}</span> / <span className="text-info">{b.counts.pending}</span> /{' '}
                      <span className="text-danger">{b.counts.expired}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{new Date(b.expiresAt).toLocaleString()}</td>
                    <td className="px-3 py-3 text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </div>
      )}

      {/* Generate slide-over */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy/50"
            onClick={() => setFormOpen(false)}
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
                <p className="font-display text-lg font-semibold text-navy">Generate Access Code Batch</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <div>
                  <AdminInput
                    label="Quantity"
                    type="number"
                    min={1}
                    max={100}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                  <div className="mt-2 flex gap-2">
                    {QUICK_QUANTITIES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setForm({ ...form, quantity: String(q) })}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          form.quantity === String(q) ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
                <AdminInput
                  label="Distributor Email"
                  type="email"
                  placeholder="who should receive the whole batch"
                  value={form.distributorEmail}
                  onChange={(e) => setForm({ ...form, distributorEmail: e.target.value })}
                />
                <AdminInput
                  label="Label (optional)"
                  placeholder="e.g. AHFID Partner Outreach — Oct 2026"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
                <p className="flex items-start gap-1.5 text-xs text-slate-400">
                  Each code fully covers one free attendee registration, redeemable by anyone the distributor shares it
                  with. All codes in this batch expire 48 hours from generation, whether used or not.
                </p>
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button onClick={() => setFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  {saving ? 'Generating…' : 'Generate & Send'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch detail drawer */}
      <AnimatePresence>
        {activeId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy/50"
            onClick={() => setActiveId(null)}
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
                <p className="font-display text-lg font-semibold text-navy">{active?.label || 'Batch'}</p>
                <button onClick={() => setActiveId(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 text-[13px]">
                {activeLoading || !active ? (
                  <SkeletonRows rows={4} cols={1} />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Distributor</p>
                        <p className="break-all text-navy">{active.distributorEmail}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Expires</p>
                        <p className="text-navy">{new Date(active.expiresAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <p className="mb-2 mt-5 text-[11px] uppercase tracking-wide text-slate-400">Codes ({active.codes.length})</p>
                    <div className="space-y-2">
                      {active.codes.map((c) => (
                        <div key={c._id} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-md bg-navy px-2 py-1 font-mono text-xs font-semibold tracking-wider text-white">{c.code}</span>
                            <div className="flex items-center gap-1.5">
                              {c.status === 'used' ? (
                                <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                                  <CheckCircle2 size={11} /> Used
                                </span>
                              ) : c.status === 'revoked' ? (
                                <span className="flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                                  <Ban size={11} /> Revoked
                                </span>
                              ) : c.expiresAt && new Date(c.expiresAt) < new Date() ? (
                                <span className="flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                                  <Clock size={11} /> Expired
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-semibold text-info">
                                  <Clock size={11} /> Pending
                                </span>
                              )}
                              <button onClick={() => copyCode(c.code)} className="rounded-md p-1.5 text-slate-400 hover:bg-offwhite hover:text-navy" title="Copy code">
                                {copiedCode === c.code ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </div>
                          {c.usedByRegistration && (
                            <p className="mt-1.5 text-xs text-slate-400">
                              Used by {c.usedByRegistration.fullName ?? c.usedByRegistration.email ?? c.usedByRegistration._id}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
