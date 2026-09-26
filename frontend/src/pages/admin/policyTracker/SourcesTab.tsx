import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link2, Plus, Trash2, X } from 'lucide-react';
import {
  adminListPolicySources,
  adminCreatePolicySource,
  adminUpdatePolicySource,
  adminDeletePolicySource,
  type PolicySource,
} from '../../../services/policyTracker.service';
import { getApiErrorMessage } from '../../../services/api';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { AdminInput, AdminToggle } from '../../../components/ui/AdminField';
import { useToast } from '../../../contexts/ToastContext';

interface FormState {
  country: string;
  label: string;
  url: string;
  isActive: boolean;
}
const EMPTY_FORM: FormState = { country: '', label: '', url: '', isActive: true };

export const SourcesTab = () => {
  const toast = useToast();
  const [items, setItems] = useState<PolicySource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<PolicySource | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListPolicySources({ limit: 200 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (source: PolicySource) => {
    setEditingId(source._id);
    setForm({ country: source.country, label: source.label, url: source.url, isActive: source.isActive });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    setFormError('');
    if (!form.country.trim() || !form.label.trim() || !form.url.trim()) {
      setFormError('Country, label, and URL are required.');
      return;
    }
    setSaving(true);
    try {
      const input = { country: form.country.trim(), label: form.label.trim(), url: form.url.trim(), isActive: form.isActive };
      if (editingId) {
        await adminUpdatePolicySource(editingId, input);
        toast('success', 'Source updated');
      } else {
        await adminCreatePolicySource(input);
        toast('success', 'Source added');
      }
      setFormOpen(false);
      load();
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
      await adminDeletePolicySource(toDelete._id);
      setItems((prev) => prev.filter((i) => i._id !== toDelete._id));
      toast('success', 'Source removed');
      setToDelete(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy">Trusted Sources</h2>
          <p className="text-sm text-slate-500">
            Fetched weekly (or on demand via "Refresh Now" on the Entries tab) — {items.length} source{items.length === 1 ? '' : 's'}.
            No live web browsing: each URL is fetched once per run, nothing outside its own page text is used.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Source
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={6} cols={3} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange/15 text-orange">
              <Link2 size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No trusted sources yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Add a WHO AFRO page, a ministry of health site, or an AU Commission publication for a country.
            </p>
            <button onClick={openAdd} className="mt-3 text-sm font-semibold text-orange hover:text-orange-hover">
              Add the first source
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((source) => (
              <div key={source._id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEdit(source)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-navy-secondary px-2.5 py-0.5 text-[10px] font-semibold text-orange">{source.country}</span>
                    <span className="text-[11px] font-medium text-slate-400">{source.label}</span>
                    {!source.isActive && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">Inactive</span>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] text-slate-600">{source.url}</p>
                </div>
                <button
                  onClick={() => setToDelete(source)}
                  className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
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
                <p className="font-display text-lg font-semibold text-navy">{editingId ? 'Edit Source' : 'Add Source'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <AdminInput label="Country" placeholder="e.g. Rwanda" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                <AdminInput
                  label="Label"
                  placeholder="e.g. Ministry of Health — National Digital Health Strategy"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
                <AdminInput label="URL" placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                <AdminToggle label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
                <p className="text-xs text-slate-400">Inactive sources are skipped by the weekly refresh and "Refresh Now".</p>
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button onClick={() => setFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button onClick={submit} disabled={saving} className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Source'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title="Remove this source?"
        description="It will no longer be checked by the weekly refresh. This can't be undone."
        confirmLabel="Remove"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
