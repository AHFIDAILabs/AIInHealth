import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Download, X, ClipboardList } from 'lucide-react';
import {
  listRegistrations,
  updateRegistrationStatus,
  exportRegistrationsUrl,
  type AdminRegistration,
  type RegistrationStatus,
  type RegistrationType,
} from '../../services/admin.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_OPTIONS: RegistrationStatus[] = ['pending', 'reviewed', 'confirmed', 'declined'];
const TYPE_OPTIONS: RegistrationType[] = ['attendee', 'exhibitor', 'sponsor', 'volunteer'];

const STATUS_BADGE: Record<RegistrationStatus, string> = {
  pending: 'text-warning bg-warning/10',
  reviewed: 'text-info bg-info/10',
  confirmed: 'text-success bg-success/10',
  declined: 'text-danger bg-danger/10',
};

const displayName = (r: AdminRegistration) => r.fullName || r.contactName || '—';
const displayEmail = (r: AdminRegistration) => r.email || r.contactEmail || '—';
const displayOrg = (r: AdminRegistration) => r.organization || r.companyName || '—';

const TYPE_LABEL: Record<RegistrationType, string> = {
  attendee: 'Attendees',
  exhibitor: 'Exhibitors',
  sponsor: 'Sponsors',
  volunteer: 'Volunteers',
};

export const RegistrationsPage = () => {
  const toast = useToast();
  const { user } = useAuth();
  // content_editor's Volunteers access is scoped to volunteer-type registrations
  // only — the backend forces this regardless of what's requested, so the type
  // filter is locked here too rather than offering options that would silently
  // no-op.
  const contentEditorOnly = user?.role === 'content_editor';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type');
  const [items, setItems] = useState<AdminRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<RegistrationStatus | ''>('');
  const [type, setType] = useState<RegistrationType | ''>(
    contentEditorOnly ? 'volunteer' : TYPE_OPTIONS.includes(initialType as RegistrationType) ? (initialType as RegistrationType) : ''
  );
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<AdminRegistration | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listRegistrations({ status: status || undefined, type: type || undefined, q: q || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [status, type, q, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyStatus = async (id: string, next: RegistrationStatus) => {
    setSavingId(id);
    try {
      const updated = await updateRegistrationStatus(id, next);
      setItems((prev) => prev.map((r) => (r._id === id ? updated : r)));
      if (active?._id === id) setActive(updated);
      toast('success', `Status updated to ${next}`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const bulkApply = async (next: RegistrationStatus) => {
    const ids = Array.from(selected);
    setSelected(new Set());
    try {
      await Promise.all(ids.map((id) => updateRegistrationStatus(id, next)));
      toast('success', `${ids.length} registration${ids.length === 1 ? '' : 's'} marked ${next}`);
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const clearFilters = () => {
    setStatus('');
    if (!contentEditorOnly) setType('');
    setQ('');
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-navy">{type ? TYPE_LABEL[type] : 'Registrations'}</h1>
        <p className="text-sm text-slate-500">
          {type
            ? `${total} ${TYPE_LABEL[type].toLowerCase()} submission${total === 1 ? '' : 's'}.`
            : `${total} total submission${total === 1 ? '' : 's'} across attendees, exhibitors, sponsors, and volunteers.`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search name, email, org..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as RegistrationStatus | '');
          }}
          className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        {!contentEditorOnly && (
          <select
            value={type}
            onChange={(e) => {
              setPage(1);
              const next = e.target.value as RegistrationType | '';
              setType(next);
              setSearchParams(next ? { type: next } : {}, { replace: true });
            }}
            className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        )}
        {(status || (!contentEditorOnly && type) || q) && (
          <button onClick={clearFilters} className="text-[13px] font-semibold text-orange hover:text-orange-hover">
            Clear
          </button>
        )}
        {!contentEditorOnly && (
          <a
            href={exportRegistrationsUrl({ status: status || undefined, type: type || undefined, q: q || undefined })}
            className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-navy transition-colors hover:border-orange/40"
          >
            <Download size={15} /> Export (current filters)
          </a>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky top-[4.5rem] z-20 mt-4 flex items-center gap-3 rounded-lg border border-orange/30 bg-orange/5 px-4 py-2.5"
          >
            <span className="text-[13px] font-semibold text-navy">{selected.size} selected</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => bulkApply('reviewed')} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange/40">
                Mark Reviewed
              </button>
              <button onClick={() => bulkApply('confirmed')} className="rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                Confirm
              </button>
              <button onClick={() => bulkApply('declined')} className="rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange/15 text-orange">
              <ClipboardList size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No registrations match your filters</p>
            <button onClick={clearFilters} className="mt-2 text-sm font-semibold text-orange hover:text-orange-hover">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === items.length}
                      onChange={(e) =>
                        setSelected(e.target.checked ? new Set(items.map((i) => i._id)) : new Set())
                      }
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Organization</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr
                    key={r._id}
                    className="cursor-pointer transition-colors hover:bg-offwhite/50"
                    onClick={() => setActive(r)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r._id)} onChange={() => toggleSelected(r._id)} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-navy">{displayName(r)}</p>
                      <p className="text-xs text-slate-400">{displayEmail(r)}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{displayOrg(r)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-navy-secondary px-2 py-0.5 text-[11px] font-medium text-orange">{r.type}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
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
                <p className="font-display text-lg font-semibold text-navy">Registration Detail</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <span className="rounded-full bg-navy-secondary px-2.5 py-1 text-[11px] font-medium text-orange">{active.type}</span>
                <h2 className="mt-3 font-display text-xl font-semibold text-navy">{displayName(active)}</h2>
                <p className="text-sm text-slate-500">{displayEmail(active)}</p>

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
                  {displayOrg(active) !== '—' && (
                    <DetailRow label="Organization" value={displayOrg(active)} />
                  )}
                  {active.jobTitle && <DetailRow label="Job Title" value={active.jobTitle} />}
                  {active.country && <DetailRow label="Country" value={active.country} />}
                  {active.phone && <DetailRow label="Phone" value={active.phone} />}
                  {active.contactPhone && <DetailRow label="Phone" value={active.contactPhone} />}
                  {active.registrationMode && <DetailRow label="Mode" value={active.registrationMode} />}
                  {active.ticketCategory && <DetailRow label="Ticket Category" value={active.ticketCategory.replace(/_/g, ' ')} />}
                  {active.boothSize && <DetailRow label="Booth Size" value={active.boothSize} />}
                  {active.website && <DetailRow label="Website" value={active.website} />}
                  {active.productsDescription && <DetailRow label="Products" value={active.productsDescription} />}
                  {active.message && <DetailRow label="Message" value={active.message} />}
                  {active.accessCode && <DetailRow label="Access Code" value={active.accessCode} />}
                  {typeof active.discountPercent === 'number' && (
                    <DetailRow
                      label="Discount"
                      value={active.discountPercent === 100 ? 'Full scholarship (100%)' : `${active.discountPercent}% scholarship`}
                    />
                  )}
                  {active.paymentStatus && active.paymentStatus !== 'not_required' && (
                    <DetailRow label="Payment" value={active.paymentStatus} />
                  )}
                  {typeof active.amountKobo === 'number' && active.amountKobo > 0 && (
                    <DetailRow label="Amount" value={`₦${Math.round(active.amountKobo / 100).toLocaleString('en-NG')}`} />
                  )}
                  {active.checkedIn && (
                    <DetailRow
                      label="Checked In"
                      value={active.checkedInAt ? new Date(active.checkedInAt).toLocaleString() : 'Yes'}
                    />
                  )}
                  <DetailRow label="Submitted" value={new Date(active.createdAt).toLocaleString()} />
                </div>
              </div>

              <div className="border-t border-slate-100 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      disabled={savingId === active._id}
                      onClick={() => applyStatus(active._id, s)}
                      className={`rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                        active.status === s
                          ? 'border-orange bg-orange text-white'
                          : 'border-slate-200 text-navy hover:border-orange/40'
                      }`}
                    >
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-0.5 text-navy">{value}</p>
  </div>
);
