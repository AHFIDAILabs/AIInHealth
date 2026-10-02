import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Trash2, X, Lightbulb } from 'lucide-react';
import {
  listRegistrations,
  adminCreateRegistration,
  updateRegistrationDetails,
  updateRegistrationStatus,
  deleteRegistration,
  type AdminRegistration,
  type RegistrationStatus,
} from '../../services/admin.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminTextarea } from '../../components/ui/AdminField';
import { useToast } from '../../contexts/ToastContext';

interface InnovatorFormState {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  solutionDescription: string;
}

const EMPTY_FORM: InnovatorFormState = {
  companyName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  solutionDescription: '',
};

const STATUS_BADGE: Record<RegistrationStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  reviewed: 'bg-info/10 text-info',
  confirmed: 'bg-success/10 text-success',
  declined: 'bg-danger/10 text-danger',
};

// Mirrors ExhibitorsTab.tsx's core (list/add/edit/delete) — no Leads or Form
// Fields sub-tabs, those are exhibitor-booth-specific concerns that don't
// apply here. Status transitions (pending -> confirmed/declined) happen on
// the generic Registrations page, same division of labor already in place
// for Exhibitor — this page is the CRM-style detail/edit view.
export const InnovatorsPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRegistration | null>(null);
  const [form, setForm] = useState<InnovatorFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AdminRegistration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listRegistrations({ type: 'innovator', q: q || undefined, page, limit: 20 })
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

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (innovator: AdminRegistration) => {
    setEditing(innovator);
    setForm({
      companyName: innovator.companyName ?? '',
      contactName: innovator.contactName ?? '',
      contactEmail: innovator.contactEmail ?? '',
      contactPhone: innovator.contactPhone ?? '',
      website: innovator.website ?? '',
      solutionDescription: innovator.solutionDescription ?? '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const submitForm = async () => {
    setFormError('');
    if (!form.companyName.trim() || !form.contactName.trim() || !form.contactEmail.trim()) {
      setFormError('Startup/project name, contact name, and contact email are required.');
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
        solutionDescription: form.solutionDescription.trim() || undefined,
      };
      if (editing) {
        await updateRegistrationDetails(editing._id, shared);
        toast('success', 'Innovator updated');
      } else {
        await adminCreateRegistration({ type: 'innovator', ...shared });
        toast('success', 'Innovator added and confirmed');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (innovator: AdminRegistration, status: RegistrationStatus) => {
    setBusyId(innovator._id);
    try {
      const updated = await updateRegistrationStatus(innovator._id, status);
      setItems((prev) => prev.map((r) => (r._id === innovator._id ? updated : r)));
      toast('success', `Marked ${status}`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeleteInnovator = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteRegistration(toDelete._id);
      setItems((prev) => prev.filter((r) => r._id !== toDelete._id));
      setTotal((prev) => prev - 1);
      toast('success', `${toDelete.companyName ?? 'Innovator'} removed`);
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
          <h1 className="font-display text-2xl font-semibold text-navy">Innovators</h1>
          <p className="text-sm text-slate-500">{total} innovator{total === 1 ? '' : 's'} registered to showcase.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Innovator
        </button>
      </div>

      <div className="mt-6 relative max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search startup, contact..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
        />
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
              <Lightbulb size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No innovators yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Startup / Project</th>
                  <th className="px-3 py-3 font-semibold">Contact</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r._id} className="hover:bg-offwhite/50">
                    <td className="px-4 py-3 font-medium text-navy">{r.companyName}</td>
                    <td className="px-3 py-3 text-slate-600">
                      <p>{r.contactName}</p>
                      <p className="text-xs text-slate-400">{r.contactEmail}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setStatus(r, 'confirmed')}
                              disabled={busyId === r._id}
                              className="rounded-md bg-success px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setStatus(r, 'declined')}
                              disabled={busyId === r._id}
                              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-offwhite disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </>
                        )}
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
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Innovator' : 'Add Innovator'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Startup / Project Name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                  <AdminInput label="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                  <AdminInput label="Contact Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                  <AdminInput label="Contact Phone" type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                  <AdminInput label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="col-span-2" />
                </div>
                <AdminTextarea
                  label="What does their solution do?"
                  value={form.solutionDescription}
                  onChange={(e) => setForm({ ...form, solutionDescription: e.target.value })}
                />
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Innovator'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.companyName ?? 'this innovator'}?`}
        description="This permanently removes the innovator's registration. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDeleteInnovator}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
