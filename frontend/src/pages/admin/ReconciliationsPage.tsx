import { useCallback, useEffect, useState } from 'react';
import { Scale, AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchReconciliations, resyncReconciliation, type ReconciliationRow } from '../../services/reconciliation.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { useToast } from '../../contexts/ToastContext';

const naira = (kobo: number) => `₦${Math.round(kobo / 100).toLocaleString('en-NG')}`;

export const ReconciliationsPage = () => {
  const toast = useToast();
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resyncing, setResyncing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetchReconciliations()
      .then((res) => {
        setConfigured(res.configured);
        setRows(res.rows);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const resync = async (reference: string) => {
    setResyncing(reference);
    try {
      await resyncReconciliation(reference);
      toast('success', 'Re-synced with Paystack');
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setResyncing(null);
    }
  };

  const mismatches = rows.filter((r) => r.mismatch);

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Reconciliations</h1>
        <p className="text-sm text-slate-500">Recent Paystack transactions cross-checked against our registration records.</p>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {!loading && !configured && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
            <Scale size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">Paystack isn&rsquo;t connected yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Add a live PAYSTACK_SECRET_KEY on the server to pull real transactions here — see Integrations for status.
          </p>
        </div>
      )}

      {!loading && configured && mismatches.length > 0 && (
        <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <AlertTriangle size={16} /> {mismatches.length} transaction{mismatches.length === 1 ? '' : 's'} need attention below.
        </div>
      )}

      {configured && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          {loading ? (
            <SkeletonRows rows={6} cols={6} />
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
                <Scale size={22} />
              </span>
              <p className="mt-4 font-semibold text-navy">No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-3 py-3 font-semibold">Paystack</th>
                    <th className="px-3 py-3 font-semibold">Our Record</th>
                    <th className="px-3 py-3 font-semibold">Amount</th>
                    <th className="px-3 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.reference} className={r.mismatch ? 'bg-warning/5' : ''}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.reference}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${r.paystackStatus === 'success' ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>
                          {r.paystackStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {r.localFound ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${r.localPaymentStatus === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                            {r.localPaymentStatus}
                          </span>
                        ) : (
                          <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-semibold text-danger">Not found</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{naira(r.paystackAmountKobo)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => resync(r.reference)}
                            disabled={resyncing === r.reference}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-orange/40 disabled:opacity-50"
                          >
                            <RefreshCw size={13} className={resyncing === r.reference ? 'animate-spin' : ''} /> Re-sync
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
