import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, X, ArrowRightCircle } from 'lucide-react';
import {
  adminListInquiries,
  adminUpdateInquiryStatus,
  INQUIRY_STATUSES,
  type AdminInquiry,
  type InquiryStatus,
} from '../../services/adminInquiry.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { useToast } from '../../contexts/ToastContext';

const STATUS_COLOR: Record<InquiryStatus, string> = {
  New: 'bg-info/10 text-info',
  Contacted: 'bg-warning/10 text-warning',
  Converted: 'bg-success/10 text-success',
  Declined: 'bg-danger/10 text-danger',
};

export const InquiriesPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | ''>('');
  const [active, setActive] = useState<AdminInquiry | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListInquiries({ status: statusFilter || undefined, limit: 100 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(load, [load]);

  const updateStatus = async (inquiry: AdminInquiry, status: InquiryStatus) => {
    setUpdating(true);
    try {
      const updated = await adminUpdateInquiryStatus(inquiry._id, status);
      setItems((prev) => prev.map((i) => (i._id === inquiry._id ? updated : i)));
      setActive(updated);
      toast('success', `Marked as ${status}`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const convertToPartner = async (inquiry: AdminInquiry) => {
    await updateStatus(inquiry, 'Converted');
    navigate('/admin/partners', {
      state: {
        prefill: {
          name: inquiry.organizationName,
          contactName: inquiry.contactName,
          contactEmail: inquiry.contactEmail,
        },
      },
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Partnership Inquiries</h1>
        <p className="text-sm text-slate-500">{items.length} inquir{items.length === 1 ? 'y' : 'ies'}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${!statusFilter ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600'}`}
        >
          All
        </button>
        {INQUIRY_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${statusFilter === s ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-teal/15 text-chart-teal">
              <Mail size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No partnership inquiries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-3 py-3 font-semibold">Contact</th>
                  <th className="px-3 py-3 font-semibold">Tier</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((inq) => (
                  <tr key={inq._id} onClick={() => setActive(inq)} className="cursor-pointer hover:bg-offwhite">
                    <td className="px-4 py-3 font-medium text-navy">{inq.organizationName}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {inq.contactName} <span className="text-slate-400">&middot; {inq.contactEmail}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{inq.tierInterested ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[inq.status]}`}>{inq.status}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-400">{new Date(inq.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">{active.organizationName}</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact</p>
                  <p className="mt-1 text-sm text-navy">{active.contactName}</p>
                  <a href={`mailto:${active.contactEmail}`} className="text-sm text-orange hover:text-orange-hover">
                    {active.contactEmail}
                  </a>
                </div>
                {active.tierInterested && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tier Interested</p>
                    <p className="mt-1 text-sm text-navy">{active.tierInterested}</p>
                  </div>
                )}
                {active.message && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Message</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-navy">{active.message}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {INQUIRY_STATUSES.map((s) => (
                      <button
                        key={s}
                        disabled={updating}
                        onClick={() => updateStatus(active, s)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                          active.status === s ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 px-5 py-4">
                <button
                  onClick={() => convertToPartner(active)}
                  disabled={updating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  <ArrowRightCircle size={16} /> Convert to Partner
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
