import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  adminListVolunteerTracks,
  adminCreateVolunteerTrack,
  adminDeleteVolunteerTrack,
  type AdminVolunteerTrack,
} from '../../services/volunteerTrack.service';
import { getApiErrorMessage } from '../../services/api';
import { Banner } from '../ui/Banner';

interface VolunteerTrackManagerModalProps {
  open: boolean;
  onClose: () => void;
  // Called after any change (add/delete) so the caller's own track dropdown
  // options stay in sync without this modal needing to know how that list is
  // used elsewhere (the Add Registration form, the detail panel's edit select).
  onChange: () => void;
}

// Small admin-managed CRUD for the volunteer track/role list — same principle
// as Sessions' TracksTab.tsx, just lighter (no color/session counts, since
// volunteer tracks don't carry those). Reachable from wherever a "Track
// Selected"/"Track Assigned" dropdown is offered in the Volunteers admin UI,
// so staff can add a new option (e.g. a role nobody anticipated) without
// leaving the flow they're in.
export const VolunteerTrackManagerModal = ({ open, onClose, onChange }: VolunteerTrackManagerModalProps) => {
  const [tracks, setTracks] = useState<AdminVolunteerTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminListVolunteerTracks()
      .then(setTracks)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const addTrack = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError('');
    try {
      const track = await adminCreateVolunteerTrack({ name, order: tracks.length });
      setTracks((prev) => [...prev, track]);
      setNewName('');
      onChange();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const removeTrack = async (track: AdminVolunteerTrack) => {
    setDeletingId(track._id);
    setError('');
    try {
      await adminDeleteVolunteerTrack(track._id);
      setTracks((prev) => prev.filter((t) => t._id !== track._id));
      onChange();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-navy/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-navy">Volunteer Tracks</h2>
                <p className="text-xs text-slate-500">Manage the roles offered on the volunteer form.</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-navy">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mt-3">
                <Banner variant="error">{error}</Banner>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTrack()}
                placeholder="e.g. Ushers & Event Coordination"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
              />
              <button
                onClick={addTrack}
                disabled={adding || !newName.trim()}
                className="flex items-center gap-1 rounded-lg bg-orange px-3 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-slate-200">
              {loading ? (
                <p className="px-3 py-4 text-center text-xs text-slate-400">Loading…</p>
              ) : tracks.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-slate-400">No tracks yet — add one above.</p>
              ) : (
                tracks.map((t) => (
                  <div key={t._id} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-[13px] last:border-b-0">
                    <div className="min-w-0">
                      <p className="truncate text-navy">{t.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {t.volunteersCount} volunteer{t.volunteersCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeTrack(t)}
                      disabled={deletingId === t._id}
                      title={t.volunteersCount > 0 ? 'Reassign volunteers off this track first' : 'Remove'}
                      className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
