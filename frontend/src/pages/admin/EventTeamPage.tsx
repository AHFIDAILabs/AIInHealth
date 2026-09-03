import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, UsersRound, Pencil, Trash2 } from 'lucide-react';
import {
  adminListEventTeam,
  adminCreateEventTeamMember,
  adminUpdateEventTeamMember,
  adminDeleteEventTeamMember,
  TEAM_MEMBER_DAYS,
  type EventTeamMember,
  type EventTeamMemberInput,
  type TeamMemberDay,
} from '../../services/eventTeam.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminTextarea, AdminSelect, AdminToggle } from '../../components/ui/AdminField';
import { useToast } from '../../contexts/ToastContext';

const DAY_LABEL: Record<TeamMemberDay, string> = { day1: 'Day 1', day2: 'Day 2', both: 'Both Days' };

const EMPTY_FORM: EventTeamMemberInput = {
  fullName: '',
  role: '',
  phone: '',
  email: '',
  day: 'both',
  notes: '',
  order: 0,
  isActive: true,
};

export const EventTeamPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<EventTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventTeamMember | null>(null);
  const [form, setForm] = useState<EventTeamMemberInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDelete, setToDelete] = useState<EventTeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListEventTeam({ q: q || undefined, limit: 200 })
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
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (member: EventTeamMember) => {
    setEditing(member);
    setForm({
      fullName: member.fullName,
      role: member.role,
      phone: member.phone ?? '',
      email: member.email ?? '',
      day: member.day,
      notes: member.notes ?? '',
      order: member.order,
      isActive: member.isActive,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.fullName.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!form.role.trim()) {
      setFormError('Role/assignment is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await adminUpdateEventTeamMember(editing._id, form);
        setItems((prev) => prev.map((m) => (m._id === editing._id ? updated : m)));
        toast('success', 'Team member updated');
      } else {
        const created = await adminCreateEventTeamMember(form);
        setItems((prev) => [...prev, created]);
        toast('success', 'Team member added');
      }
      setFormOpen(false);
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
      await adminDeleteEventTeamMember(toDelete._id);
      setItems((prev) => prev.filter((m) => m._id !== toDelete._id));
      toast('success', `${toDelete.fullName} removed`);
      setToDelete(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Event Team</h1>
          <p className="text-sm text-slate-500">{items.length} team member{items.length === 1 ? '' : 's'} rostered for event day</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Team Member
        </button>
      </div>

      <div className="mt-6 relative max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or role..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
        />
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
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
            <UsersRound size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No team members added yet</p>
          <button onClick={openCreate} className="mt-3 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
            Add Team Member
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                  <th className="px-3 py-3 font-semibold">Day</th>
                  <th className="px-3 py-3 font-semibold">Contact</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((m) => (
                  <tr key={m._id} className={!m.isActive ? 'opacity-60' : ''}>
                    <td className="px-4 py-3 font-medium text-navy">{m.fullName}</td>
                    <td className="px-3 py-3 text-slate-600">{m.role}</td>
                    <td className="px-3 py-3 text-slate-500">{DAY_LABEL[m.day]}</td>
                    <td className="px-3 py-3 text-slate-500">{m.phone || m.email || '—'}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(m)} className="rounded-md p-1.5 text-slate-400 hover:bg-offwhite hover:text-navy">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setToDelete(m)} className="rounded-md p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger">
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
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Team Member' : 'Add Team Member'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <AdminInput label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                <AdminInput label="Role / Assignment" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Registration Desk Lead" />
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <AdminInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <AdminSelect label="Day" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value as TeamMemberDay })}>
                  {TEAM_MEMBER_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {DAY_LABEL[d]}
                    </option>
                  ))}
                </AdminSelect>
                <AdminTextarea label="Notes" maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <AdminToggle label="Active" checked={!!form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Team Member'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Remove ${toDelete?.fullName}?`}
        description="This removes them from the event team roster. This can't be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
