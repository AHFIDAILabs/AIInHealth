import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, Rocket, Pencil, Trash2 } from 'lucide-react';
import {
  adminListInnovationShowcaseEntries,
  adminCreateInnovationShowcaseEntry,
  adminUpdateInnovationShowcaseEntry,
  adminDeleteInnovationShowcaseEntry,
  type InnovationShowcaseEntry,
  type InnovationShowcaseEntryInput,
} from '../../services/innovationShowcaseEntry.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminTextarea, AdminToggle } from '../../components/ui/AdminField';
import { ImagePicker } from '../../components/ui/ImagePicker';
import { useToast } from '../../contexts/ToastContext';
import { uploadAdminImage } from '../../services/upload.service';

const emptyForm = (): InnovationShowcaseEntryInput => ({
  startupName: '',
  founderNames: '',
  country: '',
  yearFounded: '',
  website: '',
  socialMedia: '',
  logoUrl: '',
  description: '',
  solutionName: '',
  solutionDescription: '',
  problemAddressed: '',
  aiTechnologies: '',
  category: '',
  trl: '',
  stageOfDevelopment: '',
  hasCustomers: '',
  evidenceOfImpact: '',
  demoHighlight: '',
  uniqueValue: '',
  order: 0,
  isPublished: false,
});

// Manages InnovationShowcaseEntry — the confirmed judging-tracker cohort
// behind the new public /innovation-showcase/confirmed page. Entirely
// separate from InnovationsPage.tsx's admin-curated Innovation directory.
export const InnovationShowcaseEntriesPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<InnovationShowcaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InnovationShowcaseEntry | null>(null);
  const [form, setForm] = useState<InnovationShowcaseEntryInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDelete, setToDelete] = useState<InnovationShowcaseEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListInnovationShowcaseEntries({ q: q || undefined, limit: 200 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (entry: InnovationShowcaseEntry) => {
    setEditing(entry);
    setForm({
      startupName: entry.startupName,
      founderNames: entry.founderNames ?? '',
      country: entry.country ?? '',
      yearFounded: entry.yearFounded ?? '',
      website: entry.website ?? '',
      socialMedia: entry.socialMedia ?? '',
      logoUrl: entry.logoUrl ?? '',
      description: entry.description ?? '',
      solutionName: entry.solutionName ?? '',
      solutionDescription: entry.solutionDescription ?? '',
      problemAddressed: entry.problemAddressed ?? '',
      aiTechnologies: entry.aiTechnologies ?? '',
      category: entry.category ?? '',
      trl: entry.trl ?? '',
      stageOfDevelopment: entry.stageOfDevelopment ?? '',
      hasCustomers: entry.hasCustomers ?? '',
      evidenceOfImpact: entry.evidenceOfImpact ?? '',
      demoHighlight: entry.demoHighlight ?? '',
      uniqueValue: entry.uniqueValue ?? '',
      order: entry.order,
      isPublished: entry.isPublished,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.startupName.trim()) {
      setFormError('Startup name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await adminUpdateInnovationShowcaseEntry(editing._id, form);
        setItems((prev) => prev.map((i) => (i._id === editing._id ? updated : i)));
        toast('success', 'Entry updated');
      } else {
        const created = await adminCreateInnovationShowcaseEntry(form);
        setItems((prev) => [...prev, created]);
        toast('success', 'Entry added');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (entry: InnovationShowcaseEntry) => {
    try {
      const updated = await adminUpdateInnovationShowcaseEntry(entry._id, { isPublished: !entry.isPublished });
      setItems((prev) => prev.map((i) => (i._id === entry._id ? updated : i)));
      toast('success', updated.isPublished ? 'Published' : 'Unpublished');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminDeleteInnovationShowcaseEntry(toDelete._id);
      setItems((prev) => prev.filter((i) => i._id !== toDelete._id));
      toast('success', `${toDelete.startupName} removed`);
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
          <h1 className="font-display text-2xl font-semibold text-navy">Confirmed Innovation Showcase</h1>
          <p className="text-sm text-slate-500">
            {items.length} startup{items.length === 1 ? '' : 's'} &middot; shown on the public /innovation-showcase/confirmed page
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Startup
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search startups..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <SkeletonRows rows={6} cols={4} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-violet/15 text-chart-violet">
            <Rocket size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No confirmed showcase startups yet</p>
          <button onClick={openCreate} className="mt-3 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
            Add Startup
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Startup</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Country</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => (
                  <tr key={i._id} className={!i.isPublished ? 'opacity-70' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {i.logoUrl ? (
                          <img src={i.logoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-navy-secondary text-xs font-semibold text-white">
                            {i.startupName[0]?.toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-navy">{i.startupName}</p>
                          {i.founderNames && <p className="text-xs text-slate-400">{i.founderNames}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{i.category ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-500">{i.country ?? '—'}</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => togglePublish(i)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          i.isPublished ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {i.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(i)} className="rounded-md p-1.5 text-slate-400 hover:bg-offwhite hover:text-navy">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setToDelete(i)} className="rounded-md p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger">
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
      )}

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
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Startup' : 'Add Startup'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}

                <AdminInput label="Startup Name" value={form.startupName} onChange={(e) => setForm({ ...form, startupName: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Founders" value={form.founderNames} onChange={(e) => setForm({ ...form, founderNames: e.target.value })} />
                  <AdminInput label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Diagnostics" />
                  <AdminInput label="Year Founded" value={form.yearFounded} onChange={(e) => setForm({ ...form, yearFounded: e.target.value })} />
                </div>
                <AdminInput label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
                <AdminInput label="Social Media" value={form.socialMedia} onChange={(e) => setForm({ ...form, socialMedia: e.target.value })} />
                <ImagePicker
                  label="Logo"
                  value={form.logoUrl}
                  onChange={(url) => setForm({ ...form, logoUrl: url })}
                  upload={uploadAdminImage}
                  shape="square"
                  size={56}
                  fallbackText={form.startupName}
                />
                <AdminTextarea label="Company Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

                <hr className="border-slate-100" />

                <AdminInput label="Product / Solution Name" value={form.solutionName} onChange={(e) => setForm({ ...form, solutionName: e.target.value })} />
                <AdminTextarea label="Solution Description" rows={5} value={form.solutionDescription} onChange={(e) => setForm({ ...form, solutionDescription: e.target.value })} />
                <AdminTextarea label="Problem Addressed" rows={4} value={form.problemAddressed} onChange={(e) => setForm({ ...form, problemAddressed: e.target.value })} />
                <AdminInput label="AI / ML Technologies" value={form.aiTechnologies} onChange={(e) => setForm({ ...form, aiTechnologies: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="TRL" value={form.trl} onChange={(e) => setForm({ ...form, trl: e.target.value })} />
                  <AdminInput label="Stage of Development" value={form.stageOfDevelopment} onChange={(e) => setForm({ ...form, stageOfDevelopment: e.target.value })} />
                </div>
                <AdminInput label="Has Customers / Active Users?" value={form.hasCustomers} onChange={(e) => setForm({ ...form, hasCustomers: e.target.value })} />
                <AdminTextarea label="Evidence of Impact" value={form.evidenceOfImpact} onChange={(e) => setForm({ ...form, evidenceOfImpact: e.target.value })} />
                <AdminTextarea label="Demo Highlight" value={form.demoHighlight} onChange={(e) => setForm({ ...form, demoHighlight: e.target.value })} />
                <AdminTextarea label="What Makes It Unique" value={form.uniqueValue} onChange={(e) => setForm({ ...form, uniqueValue: e.target.value })} />

                <hr className="border-slate-100" />

                <AdminInput
                  label="Order"
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Startup'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Remove ${toDelete?.startupName}?`}
        description="This will remove it from the public Confirmed Innovation Showcase page. This can't be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
