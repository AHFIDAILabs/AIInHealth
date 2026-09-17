import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import {
  adminListPackages,
  adminCreatePackage,
  adminUpdatePackage,
  adminDeletePackage,
  type AdminSponsorshipPackage,
  type SponsorshipPackageInput,
} from '../../../services/sponsorshipPackage.service';
import { getApiErrorMessage } from '../../../services/api';
import { AdminInput, AdminTextarea } from '../../../components/ui/AdminField';
import { Banner } from '../../../components/ui/Banner';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useToast } from '../../../contexts/ToastContext';
import { CARD_CLASS } from '../../../lib/adminUi';

const EMPTY_FORM: SponsorshipPackageInput = { name: '', price: 0, tierOrder: 0, benefits: [] };

export const PackagesTab = () => {
  const toast = useToast();
  const [packages, setPackages] = useState<AdminSponsorshipPackage[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSponsorshipPackage | null>(null);
  const [form, setForm] = useState<SponsorshipPackageInput>(EMPTY_FORM);
  const [benefitsText, setBenefitsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState<AdminSponsorshipPackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    adminListPackages()
      .then(setPackages)
      .catch((err) => setLoadError(getApiErrorMessage(err)));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setBenefitsText('');
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (pkg: AdminSponsorshipPackage) => {
    setEditing(pkg);
    setForm({ name: pkg.name, price: pkg.price, tierOrder: pkg.tierOrder, benefits: pkg.benefits ?? [] });
    setBenefitsText((pkg.benefits ?? []).join('\n'));
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setFormError('Enter a package name.');
      return;
    }
    setSaving(true);
    setFormError('');
    const benefits = benefitsText
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);
    const payload = { ...form, benefits: benefits.length > 0 ? benefits : undefined };
    try {
      if (editing) {
        const updated = await adminUpdatePackage(editing._id, payload);
        setPackages((prev) => prev?.map((p) => (p._id === editing._id ? { ...updated, utilization: p.utilization } : p)) ?? null);
        toast('success', 'Package updated');
      } else {
        await adminCreatePackage(payload);
        toast('success', 'Package added');
        load();
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
      await adminDeletePackage(toDelete._id);
      setPackages((prev) => prev?.filter((p) => p._id !== toDelete._id) ?? null);
      toast('success', `${toDelete.name} removed`);
      setToDelete(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (loadError) return <Banner variant="error">{loadError}</Banner>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy">Sponsorship Packages</h2>
          <p className="text-sm text-slate-500">Define packages, pricing, and benefits.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Package
        </button>
      </div>

      {!packages ? (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500">
          No packages yet — add one to get started.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <div key={pkg._id} className={`border-l-4 border-l-orange p-5 ${CARD_CLASS}`}>
              <div className="flex items-start justify-between">
                <p className="font-display text-base font-semibold text-navy">{pkg.name}</p>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(pkg)} className="rounded-md p-2 text-slate-400 hover:bg-offwhite hover:text-navy">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setToDelete(pkg)} className="rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Price</p>
                  <p className="mt-0.5 text-sm font-bold text-navy">₦{pkg.price.toLocaleString('en-NG')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tier Order</p>
                  <p className="mt-0.5 text-sm font-bold text-navy">{pkg.tierOrder}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Utilization</p>
                  <p className="mt-0.5 text-sm font-bold text-navy">{pkg.utilization}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/50 p-4" onClick={() => setFormOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Package' : 'Add Package'}</p>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              {formError && <Banner variant="error">{formError}</Banner>}
              <AdminInput label="Package Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pioneer" />
              <div className="grid grid-cols-2 gap-3">
                <AdminInput
                  label="Price (NGN)"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
                <AdminInput
                  label="Tier Order"
                  type="number"
                  value={form.tierOrder}
                  onChange={(e) => setForm({ ...form, tierOrder: Number(e.target.value) })}
                />
              </div>
              <AdminTextarea
                label="Benefits (one per line)"
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
                placeholder={'Top-tier branding\nSpeaking slot\nVIP passes'}
              />
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
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Package'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={`Remove ${toDelete?.name}?`}
        description={
          toDelete && toDelete.utilization > 0
            ? `${toDelete.utilization} sponsor(s) currently hold this package — you'll need to reassign them first.`
            : "This can't be undone."
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
