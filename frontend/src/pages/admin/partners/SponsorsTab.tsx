import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, Handshake, Pencil, Trash2, DollarSign, CheckCircle2, ClipboardList } from 'lucide-react';
import {
  adminListPartners,
  adminCreatePartner,
  adminUpdatePartner,
  adminDeletePartner,
  fetchPartnerAnalytics,
  PARTNER_CATEGORIES,
  PARTNER_STATUSES,
  type AdminPartner,
  type PartnerInput,
  type PartnerStatus,
  type PartnerAnalytics,
} from '../../../services/partner.service';
import { adminListPackages, type AdminSponsorshipPackage } from '../../../services/sponsorshipPackage.service';
import {
  adminListInteractions,
  adminCreateInteraction,
  adminMarkFollowUpDone,
  PARTNER_INTERACTION_TYPES,
  type AdminPartnerInteraction,
  type PartnerInteractionType,
} from '../../../services/partnerInteraction.service';
import {
  adminListDeliverables,
  adminCreateDeliverable,
  adminUpdateDeliverable,
  type AdminDeliverable,
} from '../../../services/deliverable.service';
import { getApiErrorMessage } from '../../../services/api';
import { SkeletonRows, Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { AdminInput, AdminTextarea, AdminSelect, AdminToggle } from '../../../components/ui/AdminField';
import { ImagePicker } from '../../../components/ui/ImagePicker';
import { uploadAdminImage } from '../../../services/upload.service';
import { useToast } from '../../../contexts/ToastContext';
import { CARD_CLASS } from '../../../lib/adminUi';

const naira = (kobo?: number) => (kobo ? `₦${Math.round(kobo / 100).toLocaleString('en-NG')}` : '₦0');

const STATUS_LABEL: Record<PartnerStatus, string> = {
  lead: 'Lead',
  contacted: 'Contacted',
  negotiating: 'Negotiating',
  confirmed: 'Confirmed',
  active: 'Active',
};

const STATUS_COLOR: Record<PartnerStatus, string> = {
  lead: 'bg-slate-100 text-slate-500',
  contacted: 'bg-info/10 text-info',
  negotiating: 'bg-warning/10 text-warning',
  confirmed: 'bg-chart-violet/10 text-chart-violet',
  active: 'bg-success/10 text-success',
};

const EMPTY_FORM: PartnerInput = {
  name: '',
  category: PARTNER_CATEGORIES[0],
  website: '',
  description: '',
  logoUrl: '',
  order: 0,
  isPublished: false,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  status: 'lead',
  package: null,
  amountPaidKobo: 0,
};

const StatCard = ({ icon: Icon, color, label, value }: { icon: typeof Handshake; color: string; label: string; value: string | number | null }) => (
  <div className={`overflow-hidden p-5 ${CARD_CLASS}`}>
    <div className="flex items-center gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={20} />
      </span>
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
    </div>
    {value === null ? <Skeleton className="mt-3 h-8 w-14" /> : (
      <p className="mt-3 font-display text-[26px] font-extrabold leading-none tracking-tight text-navy tabular-nums">{value}</p>
    )}
  </div>
);

export const SponsorsTab = () => {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<AdminPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | ''>('');
  const [analytics, setAnalytics] = useState<PartnerAnalytics | null>(null);
  const [packages, setPackages] = useState<AdminSponsorshipPackage[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPartner | null>(null);
  const [form, setForm] = useState<PartnerInput>(EMPTY_FORM);
  const [amountPaidNaira, setAmountPaidNaira] = useState('0');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDelete, setToDelete] = useState<AdminPartner | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Interaction/deliverable logging — only relevant once a partner exists.
  const [interactions, setInteractions] = useState<AdminPartnerInteraction[]>([]);
  const [deliverables, setDeliverables] = useState<AdminDeliverable[]>([]);
  const [newInteractionType, setNewInteractionType] = useState<PartnerInteractionType>('note');
  const [newInteractionNotes, setNewInteractionNotes] = useState('');
  const [newInteractionFollowUp, setNewInteractionFollowUp] = useState('');
  const [newDeliverableDesc, setNewDeliverableDesc] = useState('');
  const [newDeliverableDue, setNewDeliverableDue] = useState('');
  const [loggingActivity, setLoggingActivity] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListPartners({ q: q || undefined, status: statusFilter || undefined, limit: 200 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, statusFilter]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  useEffect(() => {
    fetchPartnerAnalytics().then(setAnalytics).catch(() => setAnalytics(null));
    adminListPackages().then(setPackages).catch(() => setPackages([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setAmountPaidNaira('0');
    setInteractions([]);
    setDeliverables([]);
    setFormError('');
    setFormOpen(true);
  };

  // Arriving from a converted Partnership Inquiry — pre-fill the Add Sponsor
  // form and clear the nav state so a refresh doesn't reopen it.
  useEffect(() => {
    const prefill = (location.state as { prefill?: { name?: string; contactName?: string; contactEmail?: string } } | null)?.prefill;
    if (!prefill) return;
    setEditing(null);
    setForm({ ...EMPTY_FORM, name: prefill.name ?? '', contactName: prefill.contactName ?? '', contactEmail: prefill.contactEmail ?? '' });
    setAmountPaidNaira('0');
    setFormOpen(true);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActivity = (partnerId: string) => {
    Promise.all([adminListInteractions(), adminListDeliverables()])
      .then(([allInteractions, allDeliverables]) => {
        setInteractions(allInteractions.filter((i) => i.partner._id === partnerId));
        setDeliverables(allDeliverables.filter((d) => d.partner._id === partnerId));
      })
      .catch(() => {
        setInteractions([]);
        setDeliverables([]);
      });
  };

  const openEdit = (partner: AdminPartner) => {
    setEditing(partner);
    setForm({
      name: partner.name,
      category: partner.category,
      website: partner.website ?? '',
      description: partner.description ?? '',
      logoUrl: partner.logoUrl ?? '',
      order: partner.order,
      isPublished: partner.isPublished,
      contactName: partner.contactName ?? '',
      contactEmail: partner.contactEmail ?? '',
      contactPhone: partner.contactPhone ?? '',
      status: partner.status,
      package: partner.package?._id ?? null,
      amountPaidKobo: partner.amountPaidKobo,
    });
    setAmountPaidNaira(String(Math.round(partner.amountPaidKobo / 100)));
    setFormError('');
    setFormOpen(true);
    loadActivity(partner._id);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setFormError('Sponsor/partner name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload: PartnerInput = { ...form, amountPaidKobo: Math.round(Number(amountPaidNaira || 0) * 100) };
    try {
      if (editing) {
        const updated = await adminUpdatePartner(editing._id, payload);
        setItems((prev) => prev.map((p) => (p._id === editing._id ? updated : p)));
        toast('success', 'Updated');
      } else {
        const created = await adminCreatePartner(payload);
        setItems((prev) => [...prev, created]);
        toast('success', 'Added');
      }
      setFormOpen(false);
      fetchPartnerAnalytics().then(setAnalytics).catch(() => {});
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminDeletePartner(toDelete._id);
      setItems((prev) => prev.filter((p) => p._id !== toDelete._id));
      toast('success', `${toDelete.name} removed`);
      setToDelete(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const logInteraction = async () => {
    if (!editing) return;
    setLoggingActivity(true);
    try {
      await adminCreateInteraction(editing._id, {
        type: newInteractionType,
        notes: newInteractionNotes || undefined,
        followUpDueAt: newInteractionFollowUp || undefined,
      });
      setNewInteractionNotes('');
      setNewInteractionFollowUp('');
      loadActivity(editing._id);
      toast('success', 'Interaction logged');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setLoggingActivity(false);
    }
  };

  const addDeliverable = async () => {
    if (!editing || !newDeliverableDesc.trim() || !newDeliverableDue) return;
    setLoggingActivity(true);
    try {
      await adminCreateDeliverable(editing._id, { description: newDeliverableDesc.trim(), dueDate: newDeliverableDue });
      setNewDeliverableDesc('');
      setNewDeliverableDue('');
      loadActivity(editing._id);
      toast('success', 'Deliverable added');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setLoggingActivity(false);
    }
  };

  const toggleDeliverableDone = async (d: AdminDeliverable) => {
    try {
      await adminUpdateDeliverable(d._id, { status: d.status === 'completed' ? 'pending' : 'completed' });
      if (editing) loadActivity(editing._id);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const completeFollowUp = async (i: AdminPartnerInteraction) => {
    try {
      await adminMarkFollowUpDone(i._id);
      if (editing) loadActivity(editing._id);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Handshake} color="bg-orange/15 text-orange" label="Total Sponsors" value={analytics ? analytics.totalSponsors : null} />
        <StatCard icon={CheckCircle2} color="bg-success/15 text-success" label="Active Sponsors" value={analytics ? analytics.activeSponsors : null} />
        <StatCard icon={DollarSign} color="bg-chart-blue/15 text-chart-blue" label="Total Revenue" value={analytics ? `₦${analytics.totalRevenueNaira.toLocaleString('en-NG')}` : null} />
        <StatCard icon={ClipboardList} color="bg-warning/15 text-warning" label="Pending Deliverables" value={analytics ? analytics.pendingDeliverables : null} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search company, contact..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PartnerStatus | '')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {PARTNER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Sponsor
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={6} cols={7} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-rose/15 text-chart-rose">
              <Handshake size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No sponsors or partners added yet</p>
            <button onClick={openCreate} className="mt-3 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
              Add Sponsor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Company Name</th>
                  <th className="px-3 py-3 font-semibold">Package</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Contact</th>
                  <th className="px-3 py-3 font-semibold">Amount Paid</th>
                  <th className="px-3 py-3 font-semibold">Deliverables</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => (
                  <tr key={p._id} onClick={() => openEdit(p)} className="cursor-pointer hover:bg-offwhite">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.logoUrl ? (
                          <img src={p.logoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-navy-secondary text-xs font-semibold text-white">
                            {p.name[0]?.toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-navy">{p.name}</p>
                          {p.website && <p className="text-xs text-slate-400">{p.website.replace(/^https?:\/\//, '')}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{p.package?.name ?? <span className="text-slate-300">None</span>}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {p.contactName || p.contactEmail ? (
                        <>
                          <p className="text-navy">{p.contactName || '—'}</p>
                          {p.contactEmail && <p className="text-xs text-slate-400">{p.contactEmail}</p>}
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{naira(p.amountPaidKobo)}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {p.deliverablesCompleted} / {p.deliverablesTotal}
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(p)} className="rounded-md p-1.5 text-slate-400 hover:bg-offwhite hover:text-navy">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setToDelete(p)} className="rounded-md p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger">
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
      </div>

      {/* Create/Edit slide-over */}
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
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Sponsor / Partner' : 'Add Sponsor / Partner'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <AdminInput label="Company Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="World Health Organization" />
                <div className="grid grid-cols-2 gap-3">
                  <AdminSelect label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PartnerInput['category'] })}>
                    {PARTNER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </AdminSelect>
                  <AdminSelect label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PartnerStatus })}>
                    {PARTNER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </AdminSelect>
                </div>
                <AdminSelect
                  label="Package"
                  value={form.package ?? ''}
                  onChange={(e) => setForm({ ...form, package: e.target.value || null })}
                >
                  <option value="">None</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} — ₦{pkg.price.toLocaleString('en-NG')}
                    </option>
                  ))}
                </AdminSelect>
                <AdminInput
                  label="Amount Paid (NGN)"
                  type="number"
                  min={0}
                  value={amountPaidNaira}
                  onChange={(e) => setAmountPaidNaira(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                  <AdminInput label="Contact Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                </div>
                <AdminInput label="Contact Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />

                <AdminInput label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
                <ImagePicker
                  label="Logo"
                  value={form.logoUrl}
                  onChange={(url) => setForm({ ...form, logoUrl: url })}
                  upload={uploadAdminImage}
                  shape="square"
                  size={56}
                  fallbackText={form.name}
                />
                <AdminTextarea label="Description" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description..." />
                <AdminInput
                  label="Order (on public page)"
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
                <AdminToggle label="Published on public site" checked={!!form.isPublished} onChange={(v) => setForm({ ...form, isPublished: v })} />

                {editing && (
                  <div className="space-y-5 border-t border-slate-100 pt-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outreach Log</p>
                      <div className="mt-2 space-y-1.5">
                        {interactions.length === 0 && <p className="text-xs text-slate-400">No interactions logged yet.</p>}
                        {interactions.map((i) => (
                          <div key={i._id} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold capitalize text-navy">{i.type}</span>
                              <span className="text-slate-400">{new Date(i.occurredAt).toLocaleDateString()}</span>
                            </div>
                            {i.notes && <p className="mt-1 text-slate-500">{i.notes}</p>}
                            {i.followUpDueAt && (
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className={i.followUpCompleted ? 'text-slate-400 line-through' : 'text-warning'}>
                                  Follow-up: {new Date(i.followUpDueAt).toLocaleDateString()}
                                </span>
                                {!i.followUpCompleted && (
                                  <button onClick={() => completeFollowUp(i)} className="font-semibold text-orange hover:text-orange-hover">
                                    Mark done
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 space-y-2 rounded-lg bg-offwhite p-3">
                        <div className="flex gap-2">
                          <select
                            value={newInteractionType}
                            onChange={(e) => setNewInteractionType(e.target.value as PartnerInteractionType)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-navy"
                          >
                            {PARTNER_INTERACTION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={newInteractionFollowUp}
                            onChange={(e) => setNewInteractionFollowUp(e.target.value)}
                            title="Follow-up due date (optional)"
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-navy"
                          />
                        </div>
                        <textarea
                          value={newInteractionNotes}
                          onChange={(e) => setNewInteractionNotes(e.target.value)}
                          placeholder="Notes..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-navy"
                          rows={2}
                        />
                        <button
                          onClick={logInteraction}
                          disabled={loggingActivity}
                          className="w-full rounded-lg bg-navy py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Log Interaction
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deliverables</p>
                      <div className="mt-2 space-y-1.5">
                        {deliverables.length === 0 && <p className="text-xs text-slate-400">No deliverables yet.</p>}
                        {deliverables.map((d) => {
                          const overdue = d.status === 'pending' && new Date(d.dueDate) < new Date();
                          return (
                            <div key={d._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
                              <div>
                                <p className={d.status === 'completed' ? 'text-slate-400 line-through' : 'text-navy'}>{d.description}</p>
                                <p className={overdue ? 'text-danger' : 'text-slate-400'}>
                                  Due {new Date(d.dueDate).toLocaleDateString()} {overdue && '· Overdue'}
                                </p>
                              </div>
                              <button
                                onClick={() => toggleDeliverableDone(d)}
                                className={`font-semibold ${d.status === 'completed' ? 'text-slate-400' : 'text-success'}`}
                              >
                                {d.status === 'completed' ? 'Reopen' : 'Complete'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex gap-2 rounded-lg bg-offwhite p-3">
                        <input
                          value={newDeliverableDesc}
                          onChange={(e) => setNewDeliverableDesc(e.target.value)}
                          placeholder="Description"
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-navy"
                        />
                        <input
                          type="date"
                          value={newDeliverableDue}
                          onChange={(e) => setNewDeliverableDue(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-navy"
                        />
                        <button
                          onClick={addDeliverable}
                          disabled={loggingActivity || !newDeliverableDesc.trim() || !newDeliverableDue}
                          className="shrink-0 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Sponsor'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Remove ${toDelete?.name}?`}
        description="This will remove them from the public Partners page and delete their outreach/deliverable history. This can't be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
