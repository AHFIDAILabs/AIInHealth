import { useEffect, useState } from 'react';
import { Ban, Plus } from 'lucide-react';
import { listBlockedIps, blockIp, unblockIp, type BlockedIp } from '../../../services/security.service';
import { getApiErrorMessage } from '../../../services/api';
import { Banner } from '../../../components/ui/Banner';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { CARD_CLASS } from '../../../lib/adminUi';
import { useToast } from '../../../contexts/ToastContext';

export const BlockedIpsTab = () => {
  const toast = useToast();
  const [items, setItems] = useState<BlockedIp[] | null>(null);
  // Reserved for the list-load failure specifically (a persistent, page-level
  // problem) — every transient action below (block/unblock) reports through
  // toast instead, same split every other admin CRUD page already uses.
  const [error, setError] = useState('');
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    listBlockedIps()
      .then(setItems)
      .catch((err) => setError(getApiErrorMessage(err)));
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) return;
    if (!window.confirm(`Block ${ip.trim()}? Every request from this IP will be rejected until you unblock it.`)) return;
    setSubmitting(true);
    try {
      await blockIp(ip.trim(), reason.trim() || undefined);
      toast('success', `${ip.trim()} blocked`);
      setIp('');
      setReason('');
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (target: string) => {
    if (!window.confirm(`Unblock ${target}?`)) return;
    try {
      await unblockIp(target);
      toast('success', `${target} unblocked`);
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className={`flex flex-wrap items-end gap-3 p-5 ${CARD_CLASS}`}>
        <div className="min-w-[180px] flex-1">
          <label className="text-xs font-semibold text-slate-500">IP address</label>
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="e.g. 203.0.113.42"
            required
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
          />
        </div>
        <div className="min-w-[220px] flex-[2]">
          <label className="text-xs font-semibold text-slate-500">Reason (optional)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. repeated login brute-force attempts"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
        >
          <Plus size={16} /> Block IP
        </button>
      </form>

      {error && <Banner variant="error">{error}</Banner>}

      <div className={`overflow-hidden ${CARD_CLASS}`}>
        {items === null ? (
          <SkeletonRows rows={4} cols={3} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
              <Ban size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No IPs are currently blocked</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((b) => (
              <div key={b._id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-[13px]">
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-navy">{b.ip}</p>
                  <p className="truncate text-xs text-slate-400">
                    {b.reason || 'No reason given'} &middot; blocked by {b.blockedBy?.fullName ?? 'unknown'} &middot;{' '}
                    {new Date(b.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleUnblock(b.ip)}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-danger/40 hover:text-danger"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
