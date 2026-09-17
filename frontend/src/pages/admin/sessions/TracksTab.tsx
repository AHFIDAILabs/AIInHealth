import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Layers, X } from 'lucide-react';
import {
  adminListTracks,
  adminCreateTrack,
  adminUpdateTrack,
  adminDeleteTrack,
  type AdminTrack,
  type TrackInput,
} from '../../../services/track.service';
import { getApiErrorMessage } from '../../../services/api';
import { AdminInput } from '../../../components/ui/AdminField';
import { Banner } from '../../../components/ui/Banner';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useToast } from '../../../contexts/ToastContext';
import { CARD_CLASS } from '../../../lib/adminUi';

const EMPTY_FORM: TrackInput = { name: '', color: '#E8792C', order: 0 };

export const TracksTab = () => {
  const toast = useToast();
  const [tracks, setTracks] = useState<AdminTrack[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTrack | null>(null);
  const [form, setForm] = useState<TrackInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState<AdminTrack | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = () => {
    adminListTracks()
      .then(setTracks)
      .catch((err) => setLoadError(getApiErrorMessage(err)));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, order: tracks?.length ?? 0 });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (track: AdminTrack) => {
    setEditing(track);
    setForm({ name: track.name, color: track.color, order: track.order });
    setFormError('');
    setDeleteError('');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setFormError('Enter a track name.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await adminUpdateTrack(editing._id, form);
        setTracks((prev) => prev?.map((t) => (t._id === editing._id ? { ...updated, sessionsCount: t.sessionsCount, speakersCount: t.speakersCount } : t)) ?? null);
        toast('success', 'Track updated');
      } else {
        await adminCreateTrack(form);
        toast('success', 'Track added');
        load();
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (track: AdminTrack) => {
    setDeleteError('');
    setToDelete(track);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await adminDeleteTrack(toDelete._id);
      setTracks((prev) => prev?.filter((t) => t._id !== toDelete._id) ?? null);
      toast('success', `${toDelete.name} removed`);
      setToDelete(null);
      setFormOpen(false);
    } catch (err) {
      setDeleteError(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (loadError) return <Banner variant="error">{loadError}</Banner>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy">Tracks</h2>
          <p className="text-sm text-slate-500">Organize sessions into named, color-coded tracks.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Track
        </button>
      </div>

      {!tracks ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <Layers size={28} className="text-slate-300" />
          <p className="mt-3 font-semibold text-navy">No tracks yet</p>
          <p className="mt-1 text-sm text-slate-500">Add a track before creating sessions.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => (
            <div key={t._id} className={`p-5 ${CARD_CLASS}`} style={{ borderTop: `4px solid ${t.color}` }}>
              <p className="font-display text-base font-semibold text-navy">{t.name}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-navy">{t.sessionsCount}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sessions</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-navy">{t.speakersCount}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Speakers</p>
                </div>
              </div>
              <button
                onClick={() => openEdit(t)}
                className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-[13px] font-semibold text-navy hover:border-orange/40 hover:text-orange"
              >
                Manage Track
              </button>
            </div>
          ))}
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
                <div>
                  <p className="font-display text-lg font-semibold text-navy">{editing ? 'Manage Track' : 'Add Track'}</p>
                  <p className="text-xs text-slate-500">{editing ? 'Update track details and view its sessions.' : 'Create a new track for sessions to belong to.'}</p>
                </div>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <AdminInput label="Track Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Clinical AI & Diagnostics" />
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-navy">Track Color</p>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-200 p-1"
                    />
                    <input
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
                    />
                  </div>
                </div>
                {editing && (
                  <p className="text-xs text-slate-400">
                    {editing.sessionsCount > 0
                      ? `${editing.sessionsCount} session(s) currently use this track.`
                      : 'No sessions in this track yet.'}
                  </p>
                )}
                {deleteError && <Banner variant="error">{deleteError}</Banner>}
              </div>

              <div className="flex flex-col gap-2.5 border-t border-slate-100 px-5 py-4">
                {editing && (
                  <button
                    onClick={() => requestDelete(editing)}
                    className="w-full rounded-lg bg-danger py-2.5 text-[13px] font-semibold text-white hover:bg-danger/90"
                  >
                    Delete Track
                  </button>
                )}
                <div className="flex gap-2.5">
                  <button onClick={() => setFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.name}"?`}
        description={
          toDelete && toDelete.sessionsCount > 0
            ? `${toDelete.sessionsCount} session(s) still use this track — reassign them from the Sessions List tab first.`
            : "This can't be undone."
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
