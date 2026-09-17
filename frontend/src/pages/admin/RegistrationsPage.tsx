import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Download, X, ClipboardList, Plus, Trash2, Ban, Copy, Check } from 'lucide-react';
import {
  listRegistrations,
  updateRegistrationStatus,
  updateRegistrationActive,
  deleteRegistration,
  adminCreateRegistration,
  exportRegistrationsUrl,
  type AdminRegistration,
  type RegistrationStatus,
  type RegistrationType,
  type AdminCreateRegistrationPayload,
} from '../../services/admin.service';
import type { TicketCategory, BoothSize } from '../../services/registration.service';
import { TICKET_PRICE_NGN, isFreeTicketCategory, formatNaira } from '../../lib/pricing';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminSelect, AdminTextarea } from '../../components/ui/AdminField';
import { Avatar } from '../../components/ui/Avatar';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const TICKET_CATEGORIES = Object.keys(TICKET_PRICE_NGN) as TicketCategory[];
const TICKET_LABEL: Record<TicketCategory, string> = {
  international_delegate: 'International Delegate',
  nigerian_professional: 'Nigerian Professional',
  student_researcher: 'Student / Researcher',
  vip: 'VIP',
  government_official: 'Government Official',
  accredited_media: 'Accredited Media',
};
const BOOTH_SIZES: BoothSize[] = ['small', 'medium', 'large'];
const SCHOLARSHIP_OPTIONS = [25, 50, 100] as const;

interface AddFormState {
  type: RegistrationType;
  // attendee
  ticketCategory: TicketCategory;
  scholarshipDiscount: '' | 25 | 50 | 100;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  country: string;
  // exhibitor / sponsor
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  boothSize: '' | BoothSize;
  productsDescription: string;
  message: string;
  // volunteer
  tshirtSize: string;
  trackSelected: string;
  trackAssigned: string;
}

const EMPTY_ADD_FORM: AddFormState = {
  type: 'attendee',
  ticketCategory: 'nigerian_professional',
  scholarshipDiscount: '',
  fullName: '',
  email: '',
  phone: '',
  organization: '',
  jobTitle: '',
  country: '',
  companyName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  boothSize: '',
  productsDescription: '',
  message: '',
  tshirtSize: '',
  trackSelected: '',
  trackAssigned: '',
};

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

  const [toToggleActive, setToToggleActive] = useState<AdminRegistration | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const [toDelete, setToDelete] = useState<AdminRegistration | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(EMPTY_ADD_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentLinkCopied, setPaymentLinkCopied] = useState(false);

  // The sidebar's Attendees/Exhibitors/Volunteers links all point at THIS route with
  // only ?type= differing (AdminSidebar.tsx's isItemActive comment explains why), so
  // react-router never remounts this component between them — `type` above only gets
  // seeded from the URL once, at first mount. Without this, clicking from Attendees to
  // Volunteers updates the address bar but the page keeps showing whatever loaded
  // first, and only "recovers" once some other navigation unmounts and remounts the
  // page fresh. Re-sync whenever the URL's own type param changes under us.
  useEffect(() => {
    if (contentEditorOnly) return;
    const urlType = searchParams.get('type');
    const next = TYPE_OPTIONS.includes(urlType as RegistrationType) ? (urlType as RegistrationType) : '';
    setType((prev) => (prev === next ? prev : next));
    setPage(1);
  }, [searchParams, contentEditorOnly]);

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

  const confirmToggleActive = async () => {
    if (!toToggleActive) return;
    setTogglingActive(true);
    try {
      const updated = await updateRegistrationActive(toToggleActive._id, !toToggleActive.isActive);
      setItems((prev) => prev.map((r) => (r._id === toToggleActive._id ? updated : r)));
      if (active?._id === toToggleActive._id) setActive(updated);
      toast('success', updated.isActive ? 'Registration reactivated' : 'Registration deactivated');
      setToToggleActive(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setTogglingActive(false);
    }
  };

  const confirmDeleteRegistration = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteRegistration(toDelete._id);
      setItems((prev) => prev.filter((r) => r._id !== toDelete._id));
      setTotal((prev) => prev - 1);
      if (active?._id === toDelete._id) setActive(null);
      toast('success', `${displayName(toDelete)} removed`);
      setToDelete(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const openAddForm = () => {
    setAddForm({ ...EMPTY_ADD_FORM, type: contentEditorOnly ? 'volunteer' : 'attendee' });
    setAddError('');
    setAddFormOpen(true);
  };

  const submitAdd = async () => {
    setAddError('');
    let payload: AdminCreateRegistrationPayload;

    if (addForm.type === 'attendee') {
      if (!addForm.fullName.trim() || !addForm.email.trim() || !addForm.phone.trim() || !addForm.country.trim()) {
        setAddError('Full name, email, phone, and country are required.');
        return;
      }
      payload = {
        type: 'attendee',
        registrationMode: 'individual',
        ticketCategory: addForm.ticketCategory,
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        organization: addForm.organization.trim() || undefined,
        jobTitle: addForm.jobTitle.trim() || undefined,
        country: addForm.country.trim(),
        scholarshipDiscount: addForm.scholarshipDiscount || undefined,
      };
    } else if (addForm.type === 'volunteer') {
      if (!addForm.fullName.trim() || !addForm.email.trim() || !addForm.phone.trim()) {
        setAddError('Full name, email, and phone are required.');
        return;
      }
      payload = {
        type: 'volunteer',
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        tshirtSize: addForm.tshirtSize.trim() || undefined,
        trackSelected: addForm.trackSelected.trim() || undefined,
        trackAssigned: addForm.trackAssigned.trim() || undefined,
      };
    } else {
      if (!addForm.companyName.trim() || !addForm.contactName.trim() || !addForm.contactEmail.trim()) {
        setAddError('Company name, contact name, and contact email are required.');
        return;
      }
      const shared = {
        companyName: addForm.companyName.trim(),
        contactName: addForm.contactName.trim(),
        contactEmail: addForm.contactEmail.trim(),
        contactPhone: addForm.contactPhone.trim() || undefined,
        website: addForm.website.trim() || undefined,
      };
      payload =
        addForm.type === 'exhibitor'
          ? { type: 'exhibitor', ...shared, boothSize: addForm.boothSize || undefined, productsDescription: addForm.productsDescription.trim() || undefined }
          : { type: 'sponsor', ...shared, message: addForm.message.trim() || undefined };
    }

    setAddSaving(true);
    try {
      const result = await adminCreateRegistration(payload);
      load();
      setAddFormOpen(false);
      if (result.requiresPayment) {
        toast('success', result.paymentLinkSent ? 'Registered — a payment link was emailed to them.' : 'Registered — payment link generated.');
        if (result.authorizationUrl) {
          setPaymentLink(result.authorizationUrl);
          setPaymentLinkCopied(false);
        }
      } else {
        toast('success', 'Registration added and confirmed.');
      }
    } catch (err) {
      setAddError(getApiErrorMessage(err));
    } finally {
      setAddSaving(false);
    }
  };

  const copyPaymentLink = async () => {
    if (!paymentLink) return;
    try {
      await navigator.clipboard.writeText(paymentLink);
      setPaymentLinkCopied(true);
      setTimeout(() => setPaymentLinkCopied(false), 1500);
    } catch {
      toast('error', 'Could not copy — copy it manually.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">{type ? TYPE_LABEL[type] : 'Registrations'}</h1>
          <p className="text-sm text-slate-500">
            {type
              ? `${total} ${TYPE_LABEL[type].toLowerCase()} submission${total === 1 ? '' : 's'}.`
              : `${total} total submission${total === 1 ? '' : 's'} across attendees, exhibitors, sponsors, and volunteers.`}
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Registration
        </button>
      </div>

      {paymentLink && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-orange/30 bg-orange/5 px-4 py-3 text-[13px]">
          <span className="font-semibold text-navy">Payment link:</span>
          <span className="min-w-0 flex-1 truncate text-slate-500">{paymentLink}</span>
          <button
            onClick={copyPaymentLink}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-semibold text-navy hover:border-orange/40"
          >
            {paymentLinkCopied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            {paymentLinkCopied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={() => setPaymentLink(null)} className="shrink-0 text-slate-400 hover:text-navy">
            <X size={15} />
          </button>
        </div>
      )}

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
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r._id)} onChange={() => toggleSelected(r._id)} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={displayName(r)} avatarUrl={r.avatarUrl} size={32} />
                        <div>
                          <p className="font-medium text-navy">{displayName(r)}</p>
                          <p className="text-xs text-slate-400">{displayEmail(r)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{displayOrg(r)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-navy-secondary px-2 py-0.5 text-[11px] font-medium text-orange">{r.type}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>
                          {r.status}
                        </span>
                        {!r.isActive && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setToToggleActive(r)}
                          title={r.isActive ? 'Deactivate' : 'Reactivate'}
                          className="rounded-md p-2 text-slate-400 hover:bg-offwhite hover:text-navy"
                        >
                          <Ban size={15} />
                        </button>
                        <button
                          onClick={() => setToDelete(r)}
                          title="Delete"
                          className="rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger"
                        >
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setToToggleActive(active)}
                    title={active.isActive ? 'Deactivate' : 'Reactivate'}
                    className="rounded-md p-2 text-slate-400 hover:bg-offwhite hover:text-navy"
                  >
                    <Ban size={16} />
                  </button>
                  <button
                    onClick={() => setToDelete(active)}
                    title="Delete"
                    className="rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => setActive(null)} className="ml-1 text-slate-400 hover:text-navy">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-navy-secondary px-2.5 py-1 text-[11px] font-medium text-orange">{active.type}</span>
                  {!active.isActive && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Inactive</span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar name={displayName(active)} avatarUrl={active.avatarUrl} size={48} />
                  <div>
                    <h2 className="font-display text-xl font-semibold text-navy">{displayName(active)}</h2>
                    <p className="text-sm text-slate-500">{displayEmail(active)}</p>
                  </div>
                </div>

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
                  {active.boothSize && <DetailRow label="Booth Size" value={active.boothSize} />}
                  {active.tshirtSize && <DetailRow label="T-Shirt Size" value={active.tshirtSize} />}
                  {active.trackSelected && <DetailRow label="Track Selected" value={active.trackSelected} />}
                  {active.trackAssigned && <DetailRow label="Track Assigned" value={active.trackAssigned} />}
                  {active.website && <DetailRow label="Website" value={active.website} />}
                  {active.productsDescription && <DetailRow label="Products" value={active.productsDescription} />}
                  {active.message && <DetailRow label="Message" value={active.message} />}
                  {active.accessCode && <DetailRow label="Access Code" value={active.accessCode} />}
                  {typeof active.discountPercent === 'number' && (
                    <DetailRow
                      label="Discount"
                      value={active.discountPercent === 100 ? 'Fully comped (100%)' : `${active.discountPercent}% scholarship`}
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

      {/* Add Registration slide-over */}
      <AnimatePresence>
        {addFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy/50"
            onClick={() => setAddFormOpen(false)}
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
                <p className="font-display text-lg font-semibold text-navy">Add Registration</p>
                <button onClick={() => setAddFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {addError && <Banner variant="error">{addError}</Banner>}

                {!contentEditorOnly && (
                  <div className="flex gap-2">
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setAddForm({ ...EMPTY_ADD_FORM, type: t })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                          addForm.type === t ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        {TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                )}

                {addForm.type === 'attendee' && (
                  <>
                    <AdminSelect
                      label="Ticket Category"
                      value={addForm.ticketCategory}
                      onChange={(e) => setAddForm({ ...addForm, ticketCategory: e.target.value as TicketCategory, scholarshipDiscount: '' })}
                    >
                      {TICKET_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {TICKET_LABEL[c]} — {formatNaira(TICKET_PRICE_NGN[c])}
                        </option>
                      ))}
                    </AdminSelect>

                    {!isFreeTicketCategory(addForm.ticketCategory) && (
                      <div>
                        <p className="mb-1.5 text-[13px] font-semibold text-navy">Scholarship</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAddForm({ ...addForm, scholarshipDiscount: '' })}
                            className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                              addForm.scholarshipDiscount === '' ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500'
                            }`}
                          >
                            None
                          </button>
                          {SCHOLARSHIP_OPTIONS.map((pct) => (
                            <button
                              key={pct}
                              onClick={() => setAddForm({ ...addForm, scholarshipDiscount: pct })}
                              className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                                addForm.scholarshipDiscount === pct ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400">
                          {addForm.scholarshipDiscount === 100
                            ? 'Fully covered — confirmed immediately, no payment needed.'
                            : 'Anything less than 100% still needs payment — a Paystack link is emailed automatically.'}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <AdminInput label="Full Name" value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} />
                      <AdminInput label="Email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                      <AdminInput label="Phone" type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
                      <AdminInput label="Country" value={addForm.country} onChange={(e) => setAddForm({ ...addForm, country: e.target.value })} />
                      <AdminInput label="Organization" value={addForm.organization} onChange={(e) => setAddForm({ ...addForm, organization: e.target.value })} />
                      <AdminInput label="Job Title" value={addForm.jobTitle} onChange={(e) => setAddForm({ ...addForm, jobTitle: e.target.value })} />
                    </div>
                  </>
                )}

                {addForm.type === 'volunteer' && (
                  <div className="grid grid-cols-2 gap-3">
                    <AdminInput label="Full Name" value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} />
                    <AdminInput label="Email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                    <AdminInput label="Phone" type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
                    <AdminInput label="T-Shirt Size" value={addForm.tshirtSize} onChange={(e) => setAddForm({ ...addForm, tshirtSize: e.target.value })} placeholder="e.g. L" />
                    <AdminInput label="Track Selected" value={addForm.trackSelected} onChange={(e) => setAddForm({ ...addForm, trackSelected: e.target.value })} />
                    <AdminInput label="Track Assigned" value={addForm.trackAssigned} onChange={(e) => setAddForm({ ...addForm, trackAssigned: e.target.value })} />
                  </div>
                )}

                {(addForm.type === 'exhibitor' || addForm.type === 'sponsor') && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <AdminInput label="Company Name" value={addForm.companyName} onChange={(e) => setAddForm({ ...addForm, companyName: e.target.value })} />
                      <AdminInput label="Contact Name" value={addForm.contactName} onChange={(e) => setAddForm({ ...addForm, contactName: e.target.value })} />
                      <AdminInput label="Contact Email" type="email" value={addForm.contactEmail} onChange={(e) => setAddForm({ ...addForm, contactEmail: e.target.value })} />
                      <AdminInput label="Contact Phone" type="tel" value={addForm.contactPhone} onChange={(e) => setAddForm({ ...addForm, contactPhone: e.target.value })} />
                      <AdminInput label="Website" value={addForm.website} onChange={(e) => setAddForm({ ...addForm, website: e.target.value })} className="col-span-2" />
                    </div>
                    {addForm.type === 'exhibitor' ? (
                      <>
                        <AdminSelect label="Booth Size" value={addForm.boothSize} onChange={(e) => setAddForm({ ...addForm, boothSize: e.target.value as BoothSize | '' })}>
                          <option value="">Not set</option>
                          {BOOTH_SIZES.map((b) => (
                            <option key={b} value={b}>
                              {b[0].toUpperCase() + b.slice(1)}
                            </option>
                          ))}
                        </AdminSelect>
                        <AdminTextarea label="Products" value={addForm.productsDescription} onChange={(e) => setAddForm({ ...addForm, productsDescription: e.target.value })} />
                      </>
                    ) : (
                      <AdminTextarea label="Message" value={addForm.message} onChange={(e) => setAddForm({ ...addForm, message: e.target.value })} />
                    )}
                  </>
                )}

                <p className="text-xs text-slate-400">
                  {addForm.type === 'attendee'
                    ? 'Non-attendee types are confirmed immediately — this one is too, unless it needs payment.'
                    : 'This registration is confirmed immediately — you are vouching for it directly.'}
                </p>
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button onClick={() => setAddFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button
                  onClick={submitAdd}
                  disabled={addSaving}
                  className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  {addSaving ? 'Registering…' : 'Add Registration'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toToggleActive}
        title={`${toToggleActive?.isActive ? 'Deactivate' : 'Reactivate'} ${toToggleActive ? displayName(toToggleActive) : ''}?`}
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
        title={`Delete ${toDelete ? displayName(toDelete) : ''}?`}
        description="This permanently removes the registration record. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDeleteRegistration}
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
