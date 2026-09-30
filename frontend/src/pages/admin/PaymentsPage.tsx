import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CreditCard, Send, Search, Download, Wallet, CheckCircle2, Clock, XCircle, BadgeCheck } from 'lucide-react';
import {
  listRegistrations,
  bulkSendPaymentReminders,
  exportRegistrationsUrl,
  fetchPaymentStats,
  adminMarkRegistrationPaid,
  type AdminRegistration,
  type PaymentStats,
} from '../../services/admin.service';
import type { TicketCategory } from '../../services/registration.service';
import { TICKET_PRICE_NGN, formatNaira } from '../../lib/pricing';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput } from '../../components/ui/AdminField';
import { AnalyticsStatCard } from './analytics/AnalyticsStatCard';
import { useToast } from '../../contexts/ToastContext';

type PaymentStatus = NonNullable<AdminRegistration['paymentStatus']>;

const STATUS_BADGE: Record<PaymentStatus, string> = {
  not_required: 'text-slate-400 bg-slate-100',
  unpaid: 'text-warning bg-warning/10',
  paid: 'text-success bg-success/10',
  failed: 'text-danger bg-danger/10',
};

const TICKET_CATEGORIES = Object.keys(TICKET_PRICE_NGN) as TicketCategory[];
const TICKET_LABEL: Record<TicketCategory, string> = {
  international_delegate: 'International Delegate',
  nigerian_professional: 'Nigerian Professional',
  student_researcher: 'Student / Researcher',
  vip: 'VIP',
  government_official: 'Government Official',
  accredited_media: 'Accredited Media',
  staff: 'Organizer',
};

const naira = (kobo?: number) => (kobo ? `₦${Math.round(kobo / 100).toLocaleString('en-NG')}` : '—');

export const PaymentsPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [ticketCategory, setTicketCategory] = useState<TicketCategory | ''>('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [confirmRemind, setConfirmRemind] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<AdminRegistration | null>(null);
  const [markPaidNote, setMarkPaidNote] = useState('');
  const [markingPaid, setMarkingPaid] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listRegistrations({
      type: 'attendee',
      paymentStatus: status || undefined,
      ticketCategory: ticketCategory || undefined,
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
  }, [status, ticketCategory, q, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const refreshStats = () => fetchPaymentStats().then(setStats).catch(() => undefined);
  useEffect(() => {
    refreshStats();
  }, []);

  const clearFilters = () => {
    setStatus('');
    setTicketCategory('');
    setQ('');
    setPage(1);
  };

  const sendReminders = async () => {
    setSendingReminders(true);
    try {
      const result = await bulkSendPaymentReminders();
      toast('success', `Sent ${result.sent} of ${result.attempted} reminder${result.attempted === 1 ? '' : 's'}${result.failed ? ` (${result.failed} failed)` : ''}.`);
      setConfirmRemind(false);
      load();
      refreshStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSendingReminders(false);
    }
  };

  const markPaid = async () => {
    if (!markPaidTarget) return;
    setMarkingPaid(true);
    try {
      await adminMarkRegistrationPaid(markPaidTarget._id, markPaidNote.trim() || undefined);
      toast('success', `${markPaidTarget.fullName || 'Registration'} marked paid — confirmation and ticket emails sent.`);
      setMarkPaidTarget(null);
      setMarkPaidNote('');
      load();
      refreshStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Payments</h1>
          <p className="text-sm text-slate-500">Paystack transactions for paid ticket categories.</p>
        </div>
        <a
          href={exportRegistrationsUrl({ type: 'attendee', paymentStatus: status || undefined, ticketCategory: ticketCategory || undefined, q: q || undefined })}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40"
        >
          <Download size={16} /> Export CSV
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AnalyticsStatCard icon={Wallet} label="Collected" value={stats ? formatNaira(stats.collectedNaira) : null} />
        <AnalyticsStatCard icon={CheckCircle2} label="Paid Registrations" value={stats?.paidCount ?? null} />
        <AnalyticsStatCard icon={Clock} label="Unpaid" value={stats?.unpaidCount ?? null} />
        <AnalyticsStatCard icon={XCircle} label="Failed" value={stats?.failedCount ?? null} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search name, email, reference..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as PaymentStatus | '');
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Payment Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={ticketCategory}
          onChange={(e) => {
            setPage(1);
            setTicketCategory(e.target.value as TicketCategory | '');
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Ticket Categories</option>
          {TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {TICKET_LABEL[c]}
            </option>
          ))}
        </select>
        {(status || ticketCategory || q) && (
          <button onClick={clearFilters} className="text-[13px] font-semibold text-orange hover:text-orange-hover">
            Clear
          </button>
        )}
        <span className="text-xs text-slate-400">{total} matching</span>
        <button
          onClick={() => setConfirmRemind(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-orange px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover"
        >
          <Send size={14} />
          Send Payment Reminder to All Pending
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-teal/15 text-chart-teal">
              <CreditCard size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No matching transactions</p>
            {(status || ticketCategory || q) && (
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
                  <th className="px-4 py-3 font-semibold">Delegate</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Reference</th>
                  <th className="px-3 py-3 font-semibold">Paid At</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{r.fullName || '—'}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    <td className="px-3 py-3 capitalize text-slate-600">{r.ticketCategory?.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-3 text-slate-600">{naira(r.amountKobo)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_BADGE[r.paymentStatus ?? 'not_required']}`}>
                        {r.paymentStatus ?? 'not_required'}
                      </span>
                      {r.paymentMethod === 'manual' && (
                        <span className="ml-1.5 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">{r.paymentReference ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-500">{r.paidAt ? new Date(r.paidAt).toLocaleString() : '—'}</td>
                    <td className="px-3 py-3">
                      {(r.paymentStatus === 'unpaid' || r.paymentStatus === 'failed') && (
                        <button
                          onClick={() => {
                            setMarkPaidTarget(r);
                            setMarkPaidNote('');
                          }}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-navy hover:border-orange/40"
                        >
                          <BadgeCheck size={13} /> Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length > 0 && (
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
        )}
      </div>

      <ConfirmDialog
        open={confirmRemind}
        title="Send payment reminders?"
        description="Every attendee who hasn't completed payment (unpaid or failed) gets a fresh Paystack payment link by email. This can't be limited to the current filter — it always covers everyone pending."
        confirmLabel="Send Reminders"
        danger={false}
        loading={sendingReminders}
        onConfirm={sendReminders}
        onCancel={() => setConfirmRemind(false)}
      />

      {/* Custom (not ConfirmDialog) — needs an editable note field alongside
          the confirmation, which ConfirmDialog's plain-text description
          can't offer. Same overlay/card visual treatment for consistency. */}
      <AnimatePresence>
        {markPaidTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4"
            onClick={() => setMarkPaidTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
                <BadgeCheck size={20} />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold text-navy">
                Mark {markPaidTarget.fullName || 'this registration'} as paid?
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Confirms the registration and sends the same confirmation + QR ticket email a Paystack payment would — no
                payment link is sent. This can't be undone from here.
              </p>
              <div className="mt-4">
                <AdminInput
                  label="Payment Note (optional)"
                  placeholder="e.g. Bank transfer, ref #123 — leave blank if you don't have one"
                  value={markPaidNote}
                  onChange={(e) => setMarkPaidNote(e.target.value)}
                />
              </div>
              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  onClick={() => setMarkPaidTarget(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-navy hover:bg-offwhite"
                >
                  Cancel
                </button>
                <button
                  onClick={markPaid}
                  disabled={markingPaid}
                  className="rounded-lg bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  {markingPaid ? 'Please wait…' : 'Mark Paid'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
