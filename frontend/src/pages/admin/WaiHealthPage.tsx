import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Users, Download, CheckCircle2, Clock, Ban, Send } from 'lucide-react';
import {
  adminListWaiHealth,
  adminExportWaiHealthUrl,
  adminFetchWaiHealthSettings,
  adminSetWaiHealthCapacity,
  adminNotifyNotEligible,
  adminBulkNotifyNotEligible,
  type AdminWaiHealthRegistration,
  type WaiHealthGender,
} from '../../services/waiHealth.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const RsvpBadge = ({ r }: { r: AdminWaiHealthRegistration }) => {
  if (r.declined) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
        <Ban size={11} /> Declined
      </span>
    );
  }
  if (r.rsvpConfirmedAt) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
        <CheckCircle2 size={11} /> Confirmed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
      <Clock size={11} /> Pending
    </span>
  );
};

export const WaiHealthPage = () => {
  const toast = useToast();
  const { user } = useAuth();
  // registrations_officer gets view-only access to this page (list, filters,
  // export, detail drawer) — admin.routes.ts already enforces this at the API
  // level for capacity/notify-not-eligible; this just keeps those controls
  // from appearing for a role that would only get a 403 clicking them.
  const canManage = user?.role !== 'registrations_officer';

  const [items, setItems] = useState<AdminWaiHealthRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [gender, setGender] = useState<WaiHealthGender | ''>('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [active, setActive] = useState<AdminWaiHealthRegistration | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [bulkNotifying, setBulkNotifying] = useState(false);

  const [capacity, setCapacity] = useState<number | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [capacityInput, setCapacityInput] = useState('');
  const [savingCapacity, setSavingCapacity] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListWaiHealth({ q: q || undefined, gender: gender || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, gender, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  useEffect(() => {
    adminFetchWaiHealthSettings()
      .then((s) => {
        setCapacity(s.capacity);
        setConfirmedCount(s.confirmedCount);
        setCapacityInput(String(s.capacity));
      })
      .catch(() => {});
  }, []);

  const saveCapacity = async () => {
    const next = Number(capacityInput);
    if (!Number.isInteger(next) || next < 1) {
      toast('error', 'Enter a whole number of at least 1');
      return;
    }
    setSavingCapacity(true);
    try {
      const settings = await adminSetWaiHealthCapacity(next);
      setCapacity(settings.capacity);
      setConfirmedCount(settings.confirmedCount);
      toast('success', 'Capacity updated');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSavingCapacity(false);
    }
  };

  const notifyOne = async (reg: AdminWaiHealthRegistration) => {
    if (!window.confirm(`Send ${reg.fullName} the "not eligible" notice? This also releases their seat if they'd RSVP'd.`)) return;
    setNotifying(true);
    try {
      await adminNotifyNotEligible(reg._id);
      toast('success', 'Notice sent');
      load();
      adminFetchWaiHealthSettings()
        .then((s) => setConfirmedCount(s.confirmedCount))
        .catch(() => {});
      setActive(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setNotifying(false);
    }
  };

  const notifyAllMale = async () => {
    if (!window.confirm('Send the "not eligible" notice to EVERY Male registrant not yet notified? This releases any seats they held.')) return;
    setBulkNotifying(true);
    try {
      const res = await adminBulkNotifyNotEligible();
      toast('success', `Sent to ${res.sent} of ${res.attempted}${res.failed ? ` (${res.failed} failed)` : ''}`);
      load();
      adminFetchWaiHealthSettings()
        .then((s) => setConfirmedCount(s.confirmedCount))
        .catch(() => {});
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBulkNotifying(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Women in AI & Health Breakfast</h1>
          <p className="text-sm text-slate-500">
            {total} registration{total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={notifyAllMale}
              disabled={bulkNotifying}
              className="flex items-center gap-2 rounded-xl border border-danger/30 bg-white px-4 py-2.5 text-[13px] font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
            >
              <Send size={16} /> {bulkNotifying ? 'Sending…' : 'Notify all Male registrants'}
            </button>
          )}
          <a
            href={adminExportWaiHealthUrl({ q: q || undefined })}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40"
          >
            <Download size={16} /> Export CSV
          </a>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-slate-600">
          <span className="font-semibold text-navy">{confirmedCount}</span> of{' '}
          <span className="font-semibold text-navy">{capacity ?? '…'}</span> spots filled
        </p>
        {canManage && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={capacityInput}
              onChange={(e) => setCapacityInput(e.target.value)}
              className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
            />
            <button
              onClick={saveCapacity}
              disabled={savingCapacity || capacityInput === String(capacity)}
              className="rounded-lg bg-orange px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-orange-hover disabled:opacity-50"
            >
              {savingCapacity ? 'Saving…' : 'Update Capacity'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search by name, email, or organization..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(['', 'female', 'male'] as const).map((g) => (
            <button
              key={g || 'all'}
              onClick={() => {
                setPage(1);
                setGender(g);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize ${
                gender === g ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600'
              }`}
            >
              {g || 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <SkeletonRows rows={6} cols={5} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 text-center shadow-card transition-shadow hover:shadow-card-hover">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
            <Users size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No registrations yet</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Gender</th>
                  <th className="px-3 py-3 font-semibold">RSVP</th>
                  <th className="px-3 py-3 font-semibold">Organization</th>
                  <th className="px-3 py-3 font-semibold">Network</th>
                  <th className="px-3 py-3 font-semibold">Summit Registration</th>
                  <th className="px-3 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r._id} onClick={() => setActive(r)} className="cursor-pointer hover:bg-offwhite/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{r.fullName}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    <td className="px-3 py-3 capitalize text-slate-500">{r.gender}</td>
                    <td className="px-3 py-3">
                      <RsvpBadge r={r} />
                    </td>
                    <td className="px-3 py-3 text-slate-500">{r.organization}</td>
                    <td className="px-3 py-3 text-slate-500">{r.coHostNetwork || '—'}</td>
                    <td className="px-3 py-3">
                      {r.registration ? (
                        <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-success">
                          <CheckCircle2 size={11} /> {r.registration.status}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Breakfast only</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </div>
      )}

      {/* Detail slide-over */}
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
                <p className="font-display text-lg font-semibold text-navy">{active.fullName}</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-[13px]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Email</p>
                    <p className="break-all text-navy">{active.email}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Phone</p>
                    <p className="text-navy">{active.phone}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Organization</p>
                    <p className="text-navy">{active.organization}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Country</p>
                    <p className="text-navy">{active.country}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Job Title</p>
                    <p className="text-navy">{active.jobTitle || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Women's Network</p>
                    <p className="text-navy">{active.coHostNetwork || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Gender</p>
                    <p className="capitalize text-navy">{active.gender}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">RSVP</p>
                    <div className="mt-0.5">
                      <RsvpBadge r={active} />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Summit Registration</p>
                  {active.registration ? (
                    <p className="mt-1 text-navy">
                      {active.registration.ticketCategory ? `${active.registration.ticketCategory}: ` : ''}
                      {active.registration.status} / {active.registration.paymentStatus}
                    </p>
                  ) : (
                    <p className="mt-1 text-slate-400">Breakfast only, did not opt in.</p>
                  )}
                </div>

                <p className="text-xs text-slate-400">Submitted {new Date(active.createdAt).toLocaleString()}</p>
              </div>

              {canManage && !active.declined && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <button
                    onClick={() => notifyOne(active)}
                    disabled={notifying}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 py-2.5 text-[13px] font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
                  >
                    <Send size={15} /> Send Not Eligible Email
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
