import { useCallback, useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { listRegistrations, type AdminRegistration } from '../../services/admin.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';

type PaymentStatus = NonNullable<AdminRegistration['paymentStatus']>;

const STATUS_BADGE: Record<PaymentStatus, string> = {
  not_required: 'text-slate-400 bg-slate-100',
  unpaid: 'text-warning bg-warning/10',
  paid: 'text-success bg-success/10',
  failed: 'text-danger bg-danger/10',
};

const naira = (kobo?: number) => (kobo ? `₦${Math.round(kobo / 100).toLocaleString('en-NG')}` : '—');

export const PaymentsPage = () => {
  const [items, setItems] = useState<AdminRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listRegistrations({ type: 'attendee', paymentStatus: status || undefined, limit: 100 })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(load, [load]);

  const totalCollectedKobo = items
    .filter((r) => r.paymentStatus === 'paid')
    .reduce((sum, r) => sum + (r.amountKobo ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Payments</h1>
        <p className="text-sm text-slate-500">Paystack transactions for paid ticket categories.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Collected</p>
          <p className="mt-1.5 font-display text-xl font-bold text-navy">{naira(totalCollectedKobo)}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Paid Registrations</p>
          <p className="mt-1.5 font-display text-xl font-bold text-navy">{items.filter((r) => r.paymentStatus === 'paid').length}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Unpaid</p>
          <p className="mt-1.5 font-display text-xl font-bold text-navy">{items.filter((r) => r.paymentStatus === 'unpaid').length}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Failed</p>
          <p className="mt-1.5 font-display text-xl font-bold text-navy">{items.filter((r) => r.paymentStatus === 'failed').length}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PaymentStatus | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Payment Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
        <span className="text-xs text-slate-400">{total} matching</span>
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
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">{r.paymentReference ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-500">{r.paidAt ? new Date(r.paidAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
