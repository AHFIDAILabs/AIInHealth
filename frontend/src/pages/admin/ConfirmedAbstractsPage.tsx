import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, FileText, Pencil, Trash2 } from 'lucide-react';
import {
  adminListConfirmedAbstracts,
  adminCreateConfirmedAbstract,
  adminUpdateConfirmedAbstract,
  adminDeleteConfirmedAbstract,
  PRESENTATION_TYPES,
  type AdminConfirmedAbstract,
  type ConfirmedAbstractInput,
} from '../../services/confirmedAbstract.service';
import { listTracks, type PublicTrack } from '../../services/track.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminTextarea, AdminSelect, AdminToggle } from '../../components/ui/AdminField';
import { useToast } from '../../contexts/ToastContext';

const emptyForm = (): ConfirmedAbstractInput => ({
  code: '',
  authorName: '',
  title: '',
  presentationType: undefined,
  track: '',
  country: '',
  order: 0,
  isPublished: false,
  internalNotes: '',
});

// Manages ConfirmedAbstract — the curated "confirmed presenters" list behind
// the new public /abstracts/confirmed page. Entirely separate collection
// from the submission/review pipeline managed on AbstractsPage.tsx.
export const ConfirmedAbstractsPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminConfirmedAbstract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [tracks, setTracks] = useState<PublicTrack[] | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminConfirmedAbstract | null>(null);
  const [form, setForm] = useState<ConfirmedAbstractInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDelete, setToDelete] = useState<AdminConfirmedAbstract | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listTracks()
      .then(setTracks)
      .catch(() => setTracks([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListConfirmedAbstracts({ q: q || undefined, track: trackFilter || undefined, limit: 200 })
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
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (abstract: AdminConfirmedAbstract) => {
    setEditing(abstract);
    setForm({
      code: abstract.code,
      authorName: abstract.authorName,
      title: abstract.title,
      presentationType: abstract.presentationType,
      track: abstract.track ?? '',
      country: abstract.country ?? '',
      order: abstract.order,
      isPublished: abstract.isPublished,
      internalNotes: abstract.internalNotes ?? '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.code.trim()) {
      setFormError('Abstract code is required.');
      return;
    }
    if (!form.authorName.trim()) {
      setFormError('Author name is required.');
      return;
    }
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await adminUpdateConfirmedAbstract(editing._id, form);
        setItems((prev) => prev.map((i) => (i._id === editing._id ? updated : i)));
        toast('success', 'Abstract updated');
      } else {
        const created = await adminCreateConfirmedAbstract(form);
        setItems((prev) => [...prev, created]);
        toast('success', 'Abstract added');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (abstract: AdminConfirmedAbstract) => {
    try {
      const updated = await adminUpdateConfirmedAbstract(abstract._id, { isPublished: !abstract.isPublished });
      setItems((prev) => prev.map((i) => (i._id === abstract._id ? updated : i)));
      toast('success', updated.isPublished ? 'Published' : 'Unpublished');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminDeleteConfirmedAbstract(toDelete._id);
      setItems((prev) => prev.filter((i) => i._id !== toDelete._id));
      toast('success', `${toDelete.code} removed`);
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
          <h1 className="font-display text-2xl font-semibold text-navy">Confirmed Abstracts</h1>
          <p className="text-sm text-slate-500">
            {items.length} presenter{items.length === 1 ? '' : 's'} &middot; shown on the public /abstracts/confirmed page
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Presenter
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by author, title, or code..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Tracks</option>
          {tracks?.map((t) => (
            <option key={t._id} value={t.name}>
              {t.name}
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
            <FileText size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No confirmed abstracts yet</p>
          <button onClick={openCreate} className="mt-3 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
            Add Presenter
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Presenter</th>
                  <th className="px-3 py-3 font-semibold">Code</th>
                  <th className="px-3 py-3 font-semibold">Track</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((a) => (
                  <tr key={a._id} className={!a.isPublished ? 'opacity-70' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{a.authorName}</p>
                      <p className="max-w-xs truncate text-xs text-slate-400">{a.title}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{a.code}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {a.track ?? <span className="italic text-danger/70">Unassigned</span>}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => togglePublish(a)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          a.isPublished ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {a.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(a)} className="rounded-md p-1.5 text-slate-400 hover:bg-offwhite hover:text-navy">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setToDelete(a)} className="rounded-md p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger">
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
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Presenter' : 'Add Presenter'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Abstract Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="AIHS261001" />
                  <AdminSelect
                    label="Presentation Type"
                    value={form.presentationType ?? ''}
                    onChange={(e) => setForm({ ...form, presentationType: (e.target.value || undefined) as ConfirmedAbstractInput['presentationType'] })}
                  >
                    <option value="">Not set</option>
                    {PRESENTATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t === 'oral' ? 'Oral' : 'Poster'}
                      </option>
                    ))}
                  </AdminSelect>
                </div>
                <AdminInput label="Author Name" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
                <AdminTextarea label="Abstract Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <AdminSelect label="Track" value={form.track ?? ''} onChange={(e) => setForm({ ...form, track: e.target.value })} disabled={!tracks}>
                    <option value="">Unassigned</option>
                    {tracks?.map((t) => (
                      <option key={t._id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </AdminSelect>
                  <AdminInput label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
                <AdminInput
                  label="Order"
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
                <AdminTextarea
                  label="Internal Notes (staff only, never shown publicly)"
                  value={form.internalNotes}
                  onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Presenter'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Remove ${toDelete?.authorName}?`}
        description="This will remove it from the public Confirmed Abstracts page. This can't be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
