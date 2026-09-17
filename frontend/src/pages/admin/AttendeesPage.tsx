import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Download, X, Users, UserCheck, QrCode, Wallet, Plus, Trash2, Ban } from 'lucide-react';
import {
  listRegistrations,
  updateRegistrationStatus,
  updateRegistrationActive,
  deleteRegistration,
  adminCreateRegistration,
  exportRegistrationsUrl,
  type AdminRegistration,
  type RegistrationStatus,
} from '../../services/admin.service';
import type { TicketCategory } from '../../services/registration.service';
import { TICKET_PRICE_NGN, isFreeTicketCategory, formatNaira } from '../../lib/pricing';
import { fetchAttendeeStats, type AttendeeStats } from '../../services/attendee.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminSelect } from '../../components/ui/AdminField';
import { Avatar } from '../../components/ui/Avatar';
import { AnalyticsStatCard } from './analytics/AnalyticsStatCard';
import { useToast } from '../../contexts/ToastContext';

const TICKET_CATEGORIES = Object.keys(TICKET_PRICE_NGN) as TicketCategory[];
const TICKET_LABEL: Record<TicketCategory, string> = {
  international_delegate: 'International Delegate',
  nigerian_professional: 'Nigerian Professional',
  student_researcher: 'Student / Researcher',
  vip: 'VIP',
  government_official: 'Government Official',
  accredited_media: 'Accredited Media',
};
const SCHOLARSHIP_OPTIONS = [25, 50, 100] as const;
const STATUS_OPTIONS: RegistrationStatus[] = ['pending', 'reviewed', 'confirmed', 'declined'];
const PAYMENT_OPTIONS: NonNullable<AdminRegistration['paymentStatus']>[] = ['not_required', 'unpaid', 'paid', 'failed'];

const STATUS_BADGE: Record<RegistrationStatus, string> = {
  pending: 'text-warning bg-warning/10',
  reviewed: 'text-info bg-info/10',
  confirmed: 'text-success bg-success/10',
  declined: 'text-danger bg-danger/10',
};

interface AddFormState {
  ticketCategory: TicketCategory;
  scholarshipDiscount: '' | 25 | 50 | 100;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  country: string;
}

const EMPTY_FORM: AddFormState = {
  ticketCategory: 'nigerian_professional',
  scholarshipDiscount: '',
  fullName: '',
  email: '',
  phone: '',
  organization: '',
  jobTitle: '',
  country: '',
};

export const AttendeesPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<RegistrationStatus | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<AdminRegistration['paymentStatus'] | ''>('');

  const [stats, setStats] = useState<AttendeeStats | null>(null);
  const [active, setActive] = useState<AdminRegistration | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [toToggleActive, setToToggleActive] = useState<AdminRegistration | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const [toDelete, setToDelete] = useState<AdminRegistration | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listRegistrations({
      type: 'attendee',
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
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
  }, [status, paymentStatus, q, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const refreshStats = () => fetchAttendeeStats().then(setStats).catch(() => undefined);
  useEffect(() => {
    refreshStats();
  }, []);

  const clearFilters = () => {
    setStatus('');
    setPaymentStatus('');
    setQ('');
    setPage(1);
  };

  const applyStatus = async (id: string, next: RegistrationStatus) => {
    setSavingId(id);
    try {
      const updated = await updateRegistrationStatus(id, next);
      setItems((prev) => prev.map((r) => (r._id === id ? updated : r)));
      if (active?._id === id) setActive(updated);
      toast('success', `Status updated to ${next}`);
      refreshStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const confirmToggleActive = async () => {
    if (!toToggleActive) return;
    setTogglingActive(true);
    try {
      const updated = await updateRegistrationActive(toToggleActive._id, !toToggleActive.isActive);
      setItems((prev) => prev.map((r) => (r._id === toToggleActive._id ? updated : r)));
      if (active?._id === toToggleActive._id) setActive(updated);
      toast('success', updated.isActive ? 'Attendee reactivated' : 'Attendee deactivated');
      setToToggleActive(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setTogglingActive(false);
    }
  };

  const confirmDeleteAttendee = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteRegistration(toDelete._id);
      setItems((prev) => prev.filter((r) => r._id !== toDelete._id));
      setTotal((prev) => prev - 1);
      if (active?._id === toDelete._id) setActive(null);
      toast('success', `${toDelete.fullName ?? 'Attendee'} removed`);
      setToDelete(null);
      refreshStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const submitAdd = async () => {
    setFormError('');
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.country.trim()) {
      setFormError('Full name, email, phone, and country are required.');
      return;
    }
    setSaving(true);
    try {
      await adminCreateRegistration({
        type: 'attendee',
        registrationMode: 'individual',
        ticketCategory: form.ticketCategory,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        organization: form.organization.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        country: form.country.trim(),
        scholarshipDiscount: form.scholarshipDiscount || undefined,
      });
      load();
      refreshStats();
      setFormOpen(false);
      toast('success', 'Attendee added.');
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Attendees</h1>
          <p className="text-sm text-slate-500">{total} attendee registration{total === 1 ? '' : 's'}.</p>
        </div>
        <div className="flex gap-2">
          <a
            href={exportRegistrationsUrl({ type: 'attendee', status: status || undefined, paymentStatus: paymentStatus || undefined, q: q || undefined })}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40"
          >
            <Download size={16} /> Export CSV
          </a>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
          >
            <Plus size={16} /> Add Attendee
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AnalyticsStatCard icon={Users} label="Total Attendees" value={stats?.total ?? null} />
        <AnalyticsStatCard icon={UserCheck} label="Confirmed" value={stats?.confirmed ?? null} />
        <AnalyticsStatCard icon={QrCode} label="Checked In" value={stats?.checkedIn ?? null} suffix={stats ? `(${stats.checkInRate}%)` : undefined} />
        <AnalyticsStatCard icon={Wallet} label="Revenue" value={stats ? formatNaira(stats.revenueNaira) : null} />
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
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPage(1);
            setPaymentStatus(e.target.value as AdminRegistration['paymentStatus'] | '');
          }}
          className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Payment Statuses</option>
          {PAYMENT_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p.replace('_', ' ')}
            </option>
          ))}
        </select>
        {(status || paymentStatus || q) && (
          <button onClick={clearFilters} className="text-[13px] font-semibold text-orange hover:text-orange-hover">
            Clear
          </button>
        )}
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
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange/15 text-orange">
              <Users size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No attendees match your filters</p>
            <button onClick={clearFilters} className="mt-2 text-sm font-semibold text-orange hover:text-orange-hover">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Ticket</th>
                  <th className="px-3 py-3 font-semibold">Payment</th>
                  <th className="px-3 py-3 font-semibold">Check-In</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr
                    key={r._id}
                    className={`cursor-pointer transition-colors hover:bg-offwhite/50 ${!r.isActive ? 'opacity-60' : ''}`}
                    onClick={() => setActive(r)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.fullName ?? '—'} avatarUrl={r.avatarUrl} size={32} />
                        <div>
                          <p className="font-medium text-navy">{r.fullName}</p>
                          <p className="text-xs text-slate-400">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 capitalize text-slate-600">{r.ticketCategory?.replace(/_/g, ' ') ?? '—'}</td>
                    <td className="px-3 py-3 capitalize text-slate-600">{r.paymentStatus?.replace('_', ' ') ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-600">{r.checkedIn ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                        {!r.isActive && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">Inactive</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setToToggleActive(r)} title={r.isActive ? 'Deactivate' : 'Reactivate'} className="rounded-md p-2 text-slate-400 hover:bg-offwhite hover:text-navy">
                          <Ban size={15} />
                        </button>
                        <button onClick={() => setToDelete(r)} title="Delete" className="rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length > 0 && (
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
        )}
      </div>

      {/* Detail slide-over */}
      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-navy/50" onClick={() => setActive(null)}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">Attendee Detail</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setToToggleActive(active)} title={active.isActive ? 'Deactivate' : 'Reactivate'} className="rounded-md p-2 text-slate-400 hover:bg-offwhite hover:text-navy">
                    <Ban size={16} />
                  </button>
                  <button onClick={() => setToDelete(active)} title="Delete" className="rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => setActive(null)} className="ml-1 text-slate-400 hover:text-navy">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="flex items-center gap-3">
                  <Avatar name={active.fullName ?? '—'} avatarUrl={active.avatarUrl} size={48} />
                  <div>
                    <h2 className="font-display text-xl font-semibold text-navy">{active.fullName}</h2>
                    <p className="text-sm text-slate-500">{active.email}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
                  {active.organization && <DetailRow label="Organization" value={active.organization} />}
                  {active.jobTitle && <DetailRow label="Job Title" value={active.jobTitle} />}
                  {active.country && <DetailRow label="Country" value={active.country} />}
                  {active.phone && <DetailRow label="Phone" value={active.phone} />}
                  {active.ticketCategory && <DetailRow label="Ticket Category" value={active.ticketCategory.replace(/_/g, ' ')} />}
                  {active.groupAttendees && active.groupAttendees.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Group Attendees ({active.groupAttendees.length})
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {active.groupAttendees.map((member, i) => (
                          <li key={i} className="text-navy">
                            {member.fullName || '—'} {member.email && <span className="text-slate-400">({member.email})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {typeof active.discountPercent === 'number' && (
                    <DetailRow label="Discount" value={active.discountPercent === 100 ? 'Fully comped (100%)' : `${active.discountPercent}% scholarship`} />
                  )}
                  {active.paymentStatus && active.paymentStatus !== 'not_required' && <DetailRow label="Payment" value={active.paymentStatus} />}
                  {typeof active.amountKobo === 'number' && active.amountKobo > 0 && (
                    <DetailRow label="Amount" value={`₦${Math.round(active.amountKobo / 100).toLocaleString('en-NG')}`} />
                  )}
                  {active.checkedIn && <DetailRow label="Checked In" value={active.checkedInAt ? new Date(active.checkedInAt).toLocaleString() : 'Yes'} />}
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
                        active.status === s ? 'border-orange bg-orange text-white' : 'border-slate-200 text-navy hover:border-orange/40'
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

      {/* Add Attendee slide-over */}
      <AnimatePresence>
        {formOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-navy/50" onClick={() => setFormOpen(false)}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">Add Attendee</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}

                <AdminSelect
                  label="Ticket Category"
                  value={form.ticketCategory}
                  onChange={(e) => setForm({ ...form, ticketCategory: e.target.value as TicketCategory, scholarshipDiscount: '' })}
                >
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {TICKET_LABEL[c]} — {formatNaira(TICKET_PRICE_NGN[c])}
                    </option>
                  ))}
                </AdminSelect>

                {!isFreeTicketCategory(form.ticketCategory) && (
                  <div>
                    <p className="mb-1.5 text-[13px] font-semibold text-navy">Scholarship</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setForm({ ...form, scholarshipDiscount: '' })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                          form.scholarshipDiscount === '' ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        None
                      </button>
                      {SCHOLARSHIP_OPTIONS.map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setForm({ ...form, scholarshipDiscount: pct })}
                          className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                            form.scholarshipDiscount === pct ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                  <AdminInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <AdminInput label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <AdminInput label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  <AdminInput label="Organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
                  <AdminInput label="Job Title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button onClick={() => setFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button onClick={submitAdd} disabled={saving} className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60">
                  {saving ? 'Registering…' : 'Add Attendee'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toToggleActive}
        title={`${toToggleActive?.isActive ? 'Deactivate' : 'Reactivate'} ${toToggleActive?.fullName ?? ''}?`}
        description={
          toToggleActive?.isActive
            ? 'They will be blocked from delegate portal sign-in and check-in at the door. Status and history are unaffected — you can reactivate any time.'
            : 'They will regain portal sign-in and check-in access.'
        }
        confirmLabel={toToggleActive?.isActive ? 'Deactivate' : 'Reactivate'}
        danger={!!toToggleActive?.isActive}
        loading={togglingActive}
        onConfirm={confirmToggleActive}
        onCancel={() => setToToggleActive(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.fullName ?? ''}?`}
        description="This permanently removes the registration record. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDeleteAttendee}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-0.5 break-words text-navy">{value}</p>
  </div>
);
