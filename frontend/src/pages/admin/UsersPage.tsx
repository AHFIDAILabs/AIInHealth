import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X, UserCog, Trash2, Search } from 'lucide-react';
import { adminListUsers, adminCreateUser, adminUpdateUser, adminDeleteUser, type AdminStaffUser, type CreateUserInput } from '../../services/adminUser.service';
import { ROLES, type Role } from '../../services/auth.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminSelect } from '../../components/ui/AdminField';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super Admin',
  content_editor: 'Content Editor',
  registrations_officer: 'Registrations Officer',
  viewer: 'Viewer',
};

const EMPTY_FORM: CreateUserInput = { fullName: '', email: '', role: 'viewer' };

export const UsersPage = () => {
  const toast = useToast();
  const { user: me } = useAuth();
  const [items, setItems] = useState<AdminStaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateUserInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDeactivate, setToDeactivate] = useState<AdminStaffUser | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const [toDelete, setToDelete] = useState<AdminStaffUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListUsers({ role: roleFilter || undefined, q: q || undefined, limit: 100 })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [roleFilter, q]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const clearFilters = () => {
    setRoleFilter('');
    setQ('');
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      setFormError('Full name and email are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const created = await adminCreateUser(form);
      load();
      toast('success', `Invite sent to ${created.email}`);
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (u: AdminStaffUser, role: Role) => {
    try {
      const updated = await adminUpdateUser(u._id, { role });
      setItems((prev) => prev.map((i) => (i._id === u._id ? updated : i)));
      toast('success', `${updated.fullName}'s role updated`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const confirmDeactivate = async () => {
    if (!toDeactivate) return;
    setDeactivating(true);
    try {
      const updated = await adminUpdateUser(toDeactivate._id, { isActive: !toDeactivate.isActive });
      setItems((prev) => prev.map((i) => (i._id === toDeactivate._id ? updated : i)));
      toast('success', updated.isActive ? `${updated.fullName} reactivated` : `${updated.fullName} deactivated`);
      setToDeactivate(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeactivating(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminDeleteUser(toDelete._id);
      setItems((prev) => prev.filter((i) => i._id !== toDelete._id));
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
          <h1 className="font-display text-2xl font-semibold text-navy">User Management</h1>
          <p className="text-sm text-slate-500">{total} staff account{total === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | '')}
          className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        {(roleFilter || q) && (
          <button onClick={clearFilters} className="text-[13px] font-semibold text-orange hover:text-orange-hover">
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={5} cols={5} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-blue/15 text-chart-blue">
              <UserCog size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">
              {roleFilter || q ? 'No staff accounts match your filters' : 'No staff accounts yet'}
            </p>
            {(roleFilter || q) && (
              <button onClick={clearFilters} className="mt-2 text-sm font-semibold text-orange hover:text-orange-hover">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                  <th className="px-3 py-3 font-semibold">Last Login</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => {
                  const isSelf = u._id === me?.id;
                  return (
                    <tr key={u._id} className={!u.isActive ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-navy">
                          {u.fullName} {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => changeRole(u, e.target.value as Role)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-navy disabled:opacity-50"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${u.isActive ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            disabled={isSelf}
                            onClick={() => setToDeactivate(u)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:border-danger/40 hover:text-danger disabled:opacity-40"
                          >
                            {u.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <button
                            disabled={isSelf}
                            onClick={() => setToDelete(u)}
                            title={isSelf ? "You can't delete your own account" : 'Delete'}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {formOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/50 p-4" onClick={() => setFormOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-semibold text-navy">Add User</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">They&rsquo;ll get an email to set their own password.</p>

              <div className="mt-5 space-y-4">
                {formError && <Banner variant="error">{formError}</Banner>}
                <AdminInput label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                <AdminInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <AdminSelect label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </AdminSelect>
              </div>

              <div className="mt-6 flex gap-2.5">
                <button onClick={() => setFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button onClick={submit} disabled={saving} className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60">
                  {saving ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDeactivate}
        title={`${toDeactivate?.isActive ? 'Deactivate' : 'Reactivate'} ${toDeactivate?.fullName}?`}
        description={
          toDeactivate?.isActive
            ? 'They will immediately lose access to the admin portal. You can reactivate their account later.'
            : 'They will regain access to the admin portal with their existing role.'
        }
        confirmLabel={toDeactivate?.isActive ? 'Deactivate' : 'Reactivate'}
        danger={!!toDeactivate?.isActive}
        loading={deactivating}
        onConfirm={confirmDeactivate}
        onCancel={() => setToDeactivate(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.fullName}?`}
        description="This permanently removes their admin account. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
