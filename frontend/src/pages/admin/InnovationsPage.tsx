import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, Lightbulb, Pencil, Trash2 } from 'lucide-react';
import {
  adminListInnovations,
  adminCreateInnovation,
  adminUpdateInnovation,
  adminDeleteInnovation,
  TRACKS,
  type Innovation,
  type InnovationInput,
  type Track,
} from '../../services/innovation.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminTextarea, AdminSelect, AdminToggle } from '../../components/ui/AdminField';
import { ImagePicker } from '../../components/ui/ImagePicker';
import { useToast } from '../../contexts/ToastContext';
import { uploadAdminImage } from '../../services/upload.service';

const EMPTY_FORM: InnovationInput = {
  name: '',
  organization: '',
  founderName: '',
  tagline: '',
  description: '',
  track: TRACKS[0],
  website: '',
  logoUrl: '',
  order: 0,
  isPublished: false,
};

export const InnovationsPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<Innovation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [trackFilter, setTrackFilter] = useState<Track | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Innovation | null>(null);
  const [form, setForm] = useState<InnovationInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDelete, setToDelete] = useState<Innovation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListInnovations({ q: q || undefined, track: trackFilter || undefined, limit: 200 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, trackFilter]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (innovation: Innovation) => {
    setEditing(innovation);
    setForm({
      name: innovation.name,
      organization: innovation.organization ?? '',
      founderName: innovation.founderName ?? '',
      tagline: innovation.tagline,
      description: innovation.description ?? '',
      track: innovation.track,
      website: innovation.website ?? '',
      logoUrl: innovation.logoUrl ?? '',
      order: innovation.order,
      isPublished: innovation.isPublished,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setFormError('Innovation name is required.');
      return;
    }
    if (!form.tagline.trim()) {
      setFormError('A short tagline is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await adminUpdateInnovation(editing._id, form);
        setItems((prev) => prev.map((i) => (i._id === editing._id ? updated : i)));
        toast('success', 'Innovation updated');
      } else {
        const created = await adminCreateInnovation(form);
        setItems((prev) => [...prev, created]);
        toast('success', 'Innovation added');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (innovation: Innovation) => {
    try {
      const updated = await adminUpdateInnovation(innovation._id, { isPublished: !innovation.isPublished });
      setItems((prev) => prev.map((i) => (i._id === innovation._id ? updated : i)));
      toast('success', updated.isPublished ? 'Innovation published' : 'Innovation unpublished');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminDeleteInnovation(toDelete._id);
      setItems((prev) => prev.filter((i) => i._id !== toDelete._id));
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
          <h1 className="font-display text-2xl font-semibold text-navy">Innovation Showcase</h1>
          <p className="text-sm text-slate-500">{items.length} innovation{items.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Innovation
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search innovations..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value as Track | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Tracks</option>
          {TRACKS.map((t) => (
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
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-violet/15 text-chart-violet">
            <Lightbulb size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No innovations added yet</p>
          <button onClick={openCreate} className="mt-3 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
            Add Innovation
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Innovation</th>
                  <th className="px-3 py-3 font-semibold">Track</th>
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
                            {i.name[0]?.toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-navy">{i.name}</p>
                          <p className="text-xs text-slate-400">{i.tagline}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{i.track}</td>
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
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Innovation' : 'Add Innovation'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <AdminInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product or startup name" />
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
                  <AdminInput label="Founder Name" value={form.founderName} onChange={(e) => setForm({ ...form, founderName: e.target.value })} />
                </div>
                <AdminInput label="Tagline" maxLength={150} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="One-line summary" />
                <AdminSelect label="Track" value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value as Track })}>
                  {TRACKS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </AdminSelect>
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
                <AdminTextarea label="Description" maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What they've built..." />
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Innovation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Remove ${toDelete?.name}?`}
        description="This will remove it from the public Innovation Showcase page. This can't be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
