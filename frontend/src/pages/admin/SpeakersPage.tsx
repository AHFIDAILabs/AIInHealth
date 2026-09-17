import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, Users, Pencil, Trash2 } from 'lucide-react';
import {
  adminListSpeakers,
  adminCreateSpeaker,
  adminUpdateSpeaker,
  adminDeleteSpeaker,
  type AdminSpeaker,
  type SpeakerInput,
} from '../../services/speaker.service';
import { listTracks, type PublicTrack } from '../../services/track.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminTextarea, AdminSelect, AdminToggle } from '../../components/ui/AdminField';
import { ImagePicker } from '../../components/ui/ImagePicker';
import { useToast } from '../../contexts/ToastContext';
import { uploadAdminImage } from '../../services/upload.service';

const emptyForm = (defaultTrack: string): SpeakerInput => ({
  fullName: '',
  title: '',
  organization: '',
  bio: '',
  track: defaultTrack,
  photoUrl: '',
  isPublished: false,
});

export const SpeakersPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminSpeaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [track, setTrack] = useState('');
  const [published, setPublished] = useState<'' | 'true' | 'false'>('');
  const [tracks, setTracks] = useState<PublicTrack[] | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSpeaker | null>(null);
  const [form, setForm] = useState<SpeakerInput>(emptyForm(''));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDelete, setToDelete] = useState<AdminSpeaker | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listTracks()
      .then(setTracks)
      .catch(() => setTracks([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListSpeakers({ q: q || undefined, track: track || undefined, published: published || undefined, limit: 100 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, track, published]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(tracks?.[0]?.name ?? ''));
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (speaker: AdminSpeaker) => {
    setEditing(speaker);
    setForm({
      fullName: speaker.fullName,
      title: speaker.title,
      organization: speaker.organization ?? '',
      bio: speaker.bio ?? '',
      track: speaker.track,
      photoUrl: speaker.photoUrl ?? '',
      isPublished: speaker.isPublished,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.fullName.trim() || !form.title.trim()) {
      setFormError('Full name and title are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await adminUpdateSpeaker(editing._id, form);
        setItems((prev) => prev.map((s) => (s._id === editing._id ? updated : s)));
        toast('success', 'Speaker updated');
      } else {
        const created = await adminCreateSpeaker(form);
        setItems((prev) => [created, ...prev]);
        toast('success', 'Speaker added');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (speaker: AdminSpeaker) => {
    try {
      const updated = await adminUpdateSpeaker(speaker._id, { isPublished: !speaker.isPublished });
      setItems((prev) => prev.map((s) => (s._id === speaker._id ? updated : s)));
      toast('success', updated.isPublished ? 'Speaker published' : 'Speaker unpublished');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminDeleteSpeaker(toDelete._id);
      setItems((prev) => prev.filter((s) => s._id !== toDelete._id));
      toast('success', `${toDelete.fullName} removed`);
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
          <h1 className="font-display text-2xl font-semibold text-navy">Speakers</h1>
          <p className="text-sm text-slate-500">{items.length} speaker{items.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Speaker
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search speakers..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Tracks</option>
          {tracks?.map((t) => (
            <option key={t._id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={published}
          onChange={(e) => setPublished(e.target.value as '' | 'true' | 'false')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-violet/15 text-chart-violet">
              <Users size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No speakers added yet</p>
            <button onClick={openCreate} className="mt-3 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
              Add Speaker
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Speaker</th>
                  <th className="px-3 py-3 font-semibold">Track</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Updated</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((s) => (
                  <tr key={s._id} className={!s.isPublished ? 'opacity-70' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-secondary text-xs font-semibold text-white">
                            {s.fullName[0]?.toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-navy">{s.fullName}</p>
                          <p className="text-xs text-slate-400">{s.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-navy-secondary px-2 py-0.5 text-[11px] font-medium text-orange">{s.track}</span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => togglePublish(s)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          s.isPublished ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{new Date(s.updatedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(s)} className="rounded-md p-1.5 text-slate-400 hover:bg-offwhite hover:text-navy">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setToDelete(s)} className="rounded-md p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger">
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
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Speaker' : 'Add Speaker'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <AdminInput label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Dr. Jane Doe" />
                <AdminInput label="Title / Role" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Minister of Health" />
                <AdminInput label="Organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="Federal Ministry of Health" />
                <AdminSelect label="Track" value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })} disabled={!tracks}>
                  {!tracks ? (
                    <option value="">Loading tracks…</option>
                  ) : (
                    tracks.map((t) => (
                      <option key={t._id} value={t.name}>
                        {t.name}
                      </option>
                    ))
                  )}
                </AdminSelect>
                <ImagePicker
                  label="Photo"
                  value={form.photoUrl}
                  onChange={(url) => setForm({ ...form, photoUrl: url })}
                  upload={uploadAdminImage}
                  size={56}
                  fallbackText={form.fullName}
                />
                <AdminTextarea
                  label="Bio"
                  maxLength={2000}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Short professional biography..."
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Speaker'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Remove ${toDelete?.fullName}?`}
        description="This will remove them from the public Speakers page. This can't be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
