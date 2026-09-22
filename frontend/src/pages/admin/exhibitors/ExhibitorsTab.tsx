import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Upload, Plus, Trash2, X, Building2, Users, Flame, Store, UserPlus } from 'lucide-react';
import {
  listRegistrations,
  adminCreateRegistration,
  updateRegistrationDetails,
  deleteRegistration,
  type AdminRegistration,
} from '../../../services/admin.service';
import type { BoothSize } from '../../../services/registration.service';
import { fetchExhibitorStats, importExhibitorsCsv, type ExhibitorStats, type ExhibitorImportReport } from '../../../services/exhibitor.service';
import { adminListCustomFormFields, type CustomFormField } from '../../../services/customFormField.service';
import { listLeadsForExhibitor, createLead, updateLead, deleteLead, type Lead, type LeadInterestLevel } from '../../../services/lead.service';
import { getApiErrorMessage } from '../../../services/api';
import { SkeletonRows, Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { AdminInput, AdminSelect, AdminTextarea } from '../../../components/ui/AdminField';
import { AnalyticsStatCard } from '../analytics/AnalyticsStatCard';
import { useToast } from '../../../contexts/ToastContext';

const BOOTH_SIZES: BoothSize[] = ['small', 'medium', 'large'];
const INTEREST_LEVELS: LeadInterestLevel[] = ['hot', 'warm', 'cold'];
const INTEREST_BADGE: Record<LeadInterestLevel, string> = {
  hot: 'text-danger bg-danger/10',
  warm: 'text-warning bg-warning/10',
  cold: 'text-info bg-info/10',
};

interface ExhibitorFormState {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  boothSize: '' | BoothSize;
  productsDescription: string;
  customFieldAnswers: Record<string, string>;
}

const EMPTY_FORM: ExhibitorFormState = {
  companyName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  boothSize: '',
  productsDescription: '',
  customFieldAnswers: {},
};

const EMPTY_LEAD_FORM = { fullName: '', email: '', phone: '', organization: '', interestLevel: 'warm' as LeadInterestLevel, notes: '' };

export const ExhibitorsTab = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');

  const [stats, setStats] = useState<ExhibitorStats | null>(null);
  const [customFields, setCustomFields] = useState<CustomFormField[]>([]);

  const [active, setActive] = useState<AdminRegistration | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD_FORM);
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadFormOpen, setLeadFormOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRegistration | null>(null);
  const [form, setForm] = useState<ExhibitorFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AdminRegistration | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [importReport, setImportReport] = useState<ExhibitorImportReport | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listRegistrations({ type: 'exhibitor', q: q || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  useEffect(() => {
    fetchExhibitorStats().then(setStats).catch(() => undefined);
    adminListCustomFormFields('exhibitor').then(setCustomFields).catch(() => undefined);
  }, []);

  const refreshStats = () => fetchExhibitorStats().then(setStats).catch(() => undefined);

  const openDetail = (exhibitor: AdminRegistration) => {
    setActive(exhibitor);
    setLeads(null);
    listLeadsForExhibitor(exhibitor._id)
      .then(setLeads)
      .catch((err) => toast('error', getApiErrorMessage(err)));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (exhibitor: AdminRegistration) => {
    setEditing(exhibitor);
    setForm({
      companyName: exhibitor.companyName ?? '',
      contactName: exhibitor.contactName ?? '',
      contactEmail: exhibitor.contactEmail ?? '',
      contactPhone: exhibitor.contactPhone ?? '',
      website: exhibitor.website ?? '',
      boothSize: exhibitor.boothSize ?? '',
      productsDescription: exhibitor.productsDescription ?? '',
      customFieldAnswers: { ...(exhibitor.customFieldAnswers ?? {}) },
    });
    setFormError('');
    setFormOpen(true);
  };

  const submitForm = async () => {
    setFormError('');
    if (!form.companyName.trim() || !form.contactName.trim() || !form.contactEmail.trim()) {
      setFormError('Company name, contact name, and contact email are required.');
      return;
    }
    const missingRequired = customFields.find((f) => f.required && !form.customFieldAnswers[f._id]?.trim());
    if (missingRequired) {
      setFormError(`"${missingRequired.label}" is required.`);
      return;
    }

    setSaving(true);
    try {
      const shared = {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        website: form.website.trim() || undefined,
        boothSize: form.boothSize || undefined,
        productsDescription: form.productsDescription.trim() || undefined,
        customFieldAnswers: Object.keys(form.customFieldAnswers).length ? form.customFieldAnswers : undefined,
      };
      if (editing) {
        await updateRegistrationDetails(editing._id, shared);
        toast('success', 'Exhibitor updated');
      } else {
        await adminCreateRegistration({ type: 'exhibitor', ...shared });
        toast('success', 'Exhibitor added and confirmed');
      }
      setFormOpen(false);
      load();
      refreshStats();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteExhibitor = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteRegistration(toDelete._id);
      setItems((prev) => prev.filter((r) => r._id !== toDelete._id));
      setTotal((prev) => prev - 1);
      if (active?._id === toDelete._id) setActive(null);
      toast('success', `${toDelete.companyName ?? 'Exhibitor'} removed`);
      setToDelete(null);
      refreshStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const openLeadForm = () => {
    setLeadForm(EMPTY_LEAD_FORM);
    setLeadFormOpen(true);
  };

  const submitLead = async () => {
    if (!active || !leadForm.fullName.trim()) {
      toast('error', "Enter the lead's name.");
      return;
    }
    setLeadSaving(true);
    try {
      const created = await createLead(active._id, {
        fullName: leadForm.fullName.trim(),
        email: leadForm.email.trim() || undefined,
        phone: leadForm.phone.trim() || undefined,
        organization: leadForm.organization.trim() || undefined,
        interestLevel: leadForm.interestLevel,
        notes: leadForm.notes.trim() || undefined,
      });
      setLeads((prev) => [created, ...(prev ?? [])]);
      setLeadFormOpen(false);
      toast('success', 'Lead captured');
      refreshStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setLeadSaving(false);
    }
  };

  const changeLeadInterest = async (lead: Lead, interestLevel: LeadInterestLevel) => {
    try {
      const updated = await updateLead(lead._id, { interestLevel });
      setLeads((prev) => prev?.map((l) => (l._id === updated._id ? updated : l)) ?? null);
      refreshStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const removeLead = async (lead: Lead) => {
    try {
      await deleteLead(lead._id);
      setLeads((prev) => prev?.filter((l) => l._id !== lead._id) ?? null);
      toast('success', 'Lead removed');
      refreshStats();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const triggerImport = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportError('');
    try {
      const report = await importExhibitorsCsv(file);
      setImportReport(report);
      load();
      refreshStats();
    } catch (err) {
      setImportError(getApiErrorMessage(err));
      setImportReport({ totalRows: 0, inserted: [], skippedDuplicates: [], validationFailures: [] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AnalyticsStatCard icon={Building2} label="Total Exhibitors" value={stats?.totalExhibitors ?? null} />
        <AnalyticsStatCard icon={Store} label="Active Exhibitors" value={stats?.activeExhibitors ?? null} />
        <AnalyticsStatCard icon={Users} label="Total Leads Captured" value={stats?.totalLeadsCaptured ?? null} />
        <AnalyticsStatCard icon={Flame} label="Hot Leads" value={stats?.hotLeads ?? null} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search company, contact..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
          <button
            onClick={triggerImport}
            disabled={importing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy hover:border-orange/40 disabled:opacity-60"
          >
            <Upload size={16} /> {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
          >
            <Plus size={16} /> Add Exhibitor
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={8} cols={5} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange/15 text-orange">
              <Building2 size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No exhibitors yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-3 py-3 font-semibold">Contact</th>
                  <th className="px-3 py-3 font-semibold">Booth Size</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r._id} className="cursor-pointer transition-colors hover:bg-offwhite/50" onClick={() => openDetail(r)}>
                    <td className="px-4 py-3 font-medium text-navy">{r.companyName}</td>
                    <td className="px-3 py-3 text-slate-600">
                      <p>{r.contactName}</p>
                      <p className="text-xs text-slate-400">{r.contactEmail}</p>
                    </td>
                    <td className="px-3 py-3 capitalize text-slate-600">{r.boothSize ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-navy-secondary px-2.5 py-0.5 text-[11px] font-medium text-orange">{r.status}</span>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(r)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-offwhite">
                          Edit
                        </button>
                        <button onClick={() => setToDelete(r)} className="rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger">
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
              Page {page} of {pages} — {total} total
            </span>
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

      {/* Detail slide-over — exhibitor info + leads */}
      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-navy/50" onClick={() => setActive(null)}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">{active.companyName}</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-3 text-sm">
                  <DetailRow label="Contact" value={`${active.contactName} — ${active.contactEmail}`} />
                  {active.contactPhone && <DetailRow label="Phone" value={active.contactPhone} />}
                  {active.website && <DetailRow label="Website" value={active.website} />}
                  {active.boothSize && <DetailRow label="Booth Size" value={active.boothSize} />}
                  {active.productsDescription && <DetailRow label="Products" value={active.productsDescription} />}
                  {customFields.map((f) =>
                    active.customFieldAnswers?.[f._id] ? <DetailRow key={f._id} label={f.label} value={active.customFieldAnswers[f._id]} /> : null
                  )}
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-semibold text-navy">Leads ({leads?.length ?? 0})</p>
                    <button onClick={openLeadForm} className="flex items-center gap-1.5 text-xs font-semibold text-orange hover:text-orange-hover">
                      <UserPlus size={14} /> Capture Lead
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {leads === null ? (
                      <Skeleton className="h-12 w-full" />
                    ) : leads.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-400">No leads captured yet.</p>
                    ) : (
                      leads.map((lead) => (
                        <div key={lead._id} className="rounded-xl border border-slate-100 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-navy">{lead.fullName}</p>
                            <div className="flex items-center gap-2">
                              <select
                                value={lead.interestLevel}
                                onChange={(e) => changeLeadInterest(lead, e.target.value as LeadInterestLevel)}
                                className={`rounded-full border-none px-2 py-0.5 text-[11px] font-semibold ${INTEREST_BADGE[lead.interestLevel]}`}
                              >
                                {INTEREST_LEVELS.map((l) => (
                                  <option key={l} value={l}>
                                    {l[0].toUpperCase() + l.slice(1)}
                                  </option>
                                ))}
                              </select>
                              <button onClick={() => removeLead(lead)} className="text-slate-400 hover:text-danger">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {[lead.organization, lead.email, lead.phone].filter(Boolean).join(' · ') || '—'}
                          </p>
                          {lead.notes && <p className="mt-1 text-xs text-slate-500">{lead.notes}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capture Lead slide-over */}
      <AnimatePresence>
        {leadFormOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-navy/50" onClick={() => setLeadFormOpen(false)}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">Capture Lead</p>
                <button onClick={() => setLeadFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <AdminInput label="Full Name" value={leadForm.fullName} onChange={(e) => setLeadForm({ ...leadForm, fullName: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Email" type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} />
                  <AdminInput label="Phone" type="tel" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} />
                </div>
                <AdminInput label="Organization" value={leadForm.organization} onChange={(e) => setLeadForm({ ...leadForm, organization: e.target.value })} />
                <AdminSelect
                  label="Interest Level"
                  value={leadForm.interestLevel}
                  onChange={(e) => setLeadForm({ ...leadForm, interestLevel: e.target.value as LeadInterestLevel })}
                >
                  {INTEREST_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l[0].toUpperCase() + l.slice(1)}
                    </option>
                  ))}
                </AdminSelect>
                <AdminTextarea label="Notes" value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button onClick={() => setLeadFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button
                  onClick={submitLead}
                  disabled={leadSaving}
                  className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  {leadSaving ? 'Saving…' : 'Capture Lead'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Exhibitor slide-over */}
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
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Exhibitor' : 'Add Exhibitor'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Company Name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                  <AdminInput label="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                  <AdminInput label="Contact Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                  <AdminInput label="Contact Phone" type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                  <AdminInput label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="col-span-2" />
                </div>
                <AdminSelect label="Booth Size" value={form.boothSize} onChange={(e) => setForm({ ...form, boothSize: e.target.value as BoothSize | '' })}>
                  <option value="">Not set</option>
                  {BOOTH_SIZES.map((b) => (
                    <option key={b} value={b}>
                      {b[0].toUpperCase() + b.slice(1)}
                    </option>
                  ))}
                </AdminSelect>
                <AdminTextarea label="Products" value={form.productsDescription} onChange={(e) => setForm({ ...form, productsDescription: e.target.value })} />

                {customFields.length > 0 && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Additional Questions</p>
                    {customFields.map((f) => (
                      <CustomFieldInput
                        key={f._id}
                        field={f}
                        value={form.customFieldAnswers[f._id] ?? ''}
                        onChange={(v) => setForm({ ...form, customFieldAnswers: { ...form.customFieldAnswers, [f._id]: v } })}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button onClick={() => setFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button
                  onClick={submitForm}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Exhibitor'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import report */}
      <AnimatePresence>
        {importReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4" onClick={() => setImportReport(null)}>
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <p className="font-display text-lg font-semibold text-navy">Import Result</p>
              {importError ? (
                <div className="mt-3">
                  <Banner variant="error">{importError}</Banner>
                </div>
              ) : (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-slate-600">{importReport.totalRows} row(s) processed.</p>
                  <p className="text-success">{importReport.inserted.length} exhibitor(s) added.</p>
                  {importReport.skippedDuplicates.length > 0 && (
                    <p className="text-warning">{importReport.skippedDuplicates.length} skipped — already registered.</p>
                  )}
                  {importReport.validationFailures.length > 0 && (
                    <div className="rounded-lg bg-danger/5 p-3 text-danger">
                      <p className="font-semibold">{importReport.validationFailures.length} row(s) failed:</p>
                      <ul className="mt-1 list-disc pl-4">
                        {importReport.validationFailures.map((f) => (
                          <li key={f.row}>
                            Row {f.row}: {f.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => setImportReport(null)} className="mt-5 w-full rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover">
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.companyName ?? 'this exhibitor'}?`}
        description="This permanently removes the exhibitor and all of their captured leads. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDeleteExhibitor}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-0.5 whitespace-pre-line break-words text-navy">{value}</p>
  </div>
);

const CustomFieldInput = ({ field, value, onChange }: { field: CustomFormField; value: string; onChange: (v: string) => void }) => {
  if (field.fieldType === 'select') {
    return (
      <AdminSelect label={field.label} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </AdminSelect>
    );
  }
  if (field.fieldType === 'textarea') {
    return <AdminTextarea label={field.label} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.fieldType === 'checkbox') {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-navy">
        <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : 'false')} />
        {field.label}
      </label>
    );
  }
  return <AdminInput label={field.label} value={value} onChange={(e) => onChange(e.target.value)} />;
};
