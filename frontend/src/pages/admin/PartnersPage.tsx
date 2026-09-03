import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, Handshake, Pencil, Trash2 } from 'lucide-react';
import {
  adminListPartners,
  adminCreatePartner,
  adminUpdatePartner,
  adminDeletePartner,
  PARTNER_TIERS,
  PARTNER_CATEGORIES,
  type AdminPartner,
  type PartnerInput,
  type PartnerTier,
} from '../../services/partner.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminTextarea, AdminSelect, AdminToggle } from '../../components/ui/AdminField';
import { ImagePicker } from '../../components/ui/ImagePicker';
import { uploadAdminImage } from '../../services/upload.service';
import { useToast } from '../../contexts/ToastContext';

const EMPTY_FORM: PartnerInput = {
  name: '',
  tier: PARTNER_TIERS[0],
  category: PARTNER_CATEGORIES[0],
  website: '',
  description: '',
  logoUrl: '',
  order: 0,
  isPublished: false,
};

export const PartnersPage = () => {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [tierFilter, setTierFilter] = useState<PartnerTier | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPartner | null>(null);
  const [form, setForm] = useState<PartnerInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDelete, setToDelete] = useState<AdminPartner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListPartners({ q: q || undefined, tier: tierFilter || undefined, limit: 200 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, tierFilter]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const grouped = useMemo(() => {
    const map = new Map<PartnerTier, AdminPartner[]>();
    for (const tier of PARTNER_TIERS) map.set(tier, []);
    items.forEach((p) => map.get(p.tier)?.push(p));
    return map;
  }, [items]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  // Arriving from a converted Partnership Inquiry — pre-fill the Add Partner form
  // and clear the nav state so a refresh doesn't reopen it.
  useEffect(() => {
    const prefill = (location.state as { prefill?: { name?: string; tier?: PartnerTier } } | null)?.prefill;
    if (!prefill) return;
    setEditing(null);
    setForm({ ...EMPTY_FORM, name: prefill.name ?? '', tier: prefill.tier ?? PARTNER_TIERS[0] });
    setFormOpen(true);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (partner: AdminPartner) => {
    setEditing(partner);
    setForm({
      name: partner.name,
      tier: partner.tier,
      category: partner.category,
      website: partner.website ?? '',
      description: partner.description ?? '',
      logoUrl: partner.logoUrl ?? '',
      order: partner.order,
      isPublished: partner.isPublished,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setFormError("Partner name is required.");
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await adminUpdatePartner(editing._id, form);
        setItems((prev) => prev.map((p) => (p._id === editing._id ? updated : p)));
        toast('success', 'Partner updated');
      } else {
        const created = await adminCreatePartner(form);
        setItems((prev) => [...prev, created]);
        toast('success', 'Partner added');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (partner: AdminPartner) => {
    try {
      const updated = await adminUpdatePartner(partner._id, { isPublished: !partner.isPublished });
      setItems((prev) => prev.map((p) => (p._id === partner._id ? updated : p)));
      toast('success', updated.isPublished ? 'Partner published' : 'Partner unpublished');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Partners</h1>
          <p className="text-sm text-slate-500">{items.length} partner{items.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Partner
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search partners..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as PartnerTier | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Tiers</option>
          {PARTNER_TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-rose/15 text-chart-rose">
            <Handshake size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No partners added yet</p>
          <button onClick={openCreate} className="mt-3 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
            Add Partner
          </button>
        </div>
      ) : (
        (tierFilter ? [tierFilter] : PARTNER_TIERS).map((tier) => {
          const tierPartners = grouped.get(tier) ?? [];
          if (tierPartners.length === 0) return null;
          return (
            <div key={tier} className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tier} <span className="text-slate-300">({tierPartners.length})</span>
              </p>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Partner</th>
                        <th className="px-3 py-3 font-semibold">Category</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tierPartners.map((p) => (
                        <tr key={p._id} className={!p.isPublished ? 'opacity-70' : ''}>
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
                          <td className="px-3 py-3 text-slate-500">{p.category}</td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => togglePublish(p)}
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                p.isPublished ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {p.isPublished ? 'Published' : 'Draft'}
                            </button>
                          </td>
                          <td className="px-3 py-3">
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
              </div>
            </div>
          );
        })
      )}

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
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Partner' : 'Add Partner'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <AdminInput label="Partner Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="World Health Organization" />
                <div className="grid grid-cols-2 gap-3">
                  <AdminSelect label="Tier" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as PartnerTier })}>
                    {PARTNER_TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </AdminSelect>
                  <AdminSelect label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PartnerInput['category'] })}>
                    {PARTNER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </AdminSelect>
                </div>
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
                  label="Order (within tier)"
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
                <AdminToggle label="Published" checked={!!form.isPublished} onChange={(v) => setForm({ ...form, isPublished: v })} />
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Partner'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Remove ${toDelete?.name}?`}
        description="This will remove them from the public Partners page. This can't be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
