import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ListChecks, Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  adminListCustomFormFields,
  createCustomFormField,
  updateCustomFormField,
  deleteCustomFormField,
  type CustomFormField,
  type CustomFieldType,
} from '../../../services/customFormField.service';
import { getApiErrorMessage } from '../../../services/api';
import { AdminInput, AdminSelect, AdminToggle } from '../../../components/ui/AdminField';
import { Banner } from '../../../components/ui/Banner';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useToast } from '../../../contexts/ToastContext';
import { CARD_CLASS, emptyStateBadgeClass } from '../../../lib/adminUi';

const FIELD_TYPES: CustomFieldType[] = ['text', 'textarea', 'select', 'checkbox'];
const FIELD_TYPE_LABEL: Record<CustomFieldType, string> = {
  text: 'Text',
  textarea: 'Paragraph',
  select: 'Dropdown',
  checkbox: 'Checkbox',
};

interface FormState {
  label: string;
  fieldType: CustomFieldType;
  optionsText: string;
  required: boolean;
}

const EMPTY_FORM: FormState = { label: '', fieldType: 'text', optionsText: '', required: false };

// Every add/edit/delete here saves immediately via the API — unlike RubricTab's
// batch "Save Configuration" step, there's no ordering-dependent weight math to
// validate first, so there's nothing gained by deferring the write.
export const FormFieldsTab = () => {
  const toast = useToast();
  const [fields, setFields] = useState<CustomFormField[] | null>(null);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFormField | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CustomFormField | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    adminListCustomFormFields('exhibitor')
      .then(setFields)
      .catch((err) => setError(getApiErrorMessage(err)));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (field: CustomFormField) => {
    setEditing(field);
    setForm({
      label: field.label,
      fieldType: field.fieldType,
      optionsText: field.options?.join(', ') ?? '',
      required: field.required,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    setFormError('');
    if (!form.label.trim()) {
      setFormError('Enter a label for this field.');
      return;
    }
    const options = form.optionsText
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (form.fieldType === 'select' && options.length < 2) {
      setFormError('A dropdown needs at least 2 comma-separated options.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateCustomFormField(editing._id, {
          label: form.label.trim(),
          fieldType: form.fieldType,
          options: form.fieldType === 'select' ? options : undefined,
          required: form.required,
        });
        setFields((prev) => prev?.map((f) => (f._id === updated._id ? updated : f)) ?? null);
        toast('success', 'Field updated');
      } else {
        const created = await createCustomFormField({
          formType: 'exhibitor',
          label: form.label.trim(),
          fieldType: form.fieldType,
          options: form.fieldType === 'select' ? options : undefined,
          required: form.required,
          order: fields?.length ?? 0,
        });
        setFields((prev) => [...(prev ?? []), created]);
        toast('success', 'Field added');
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
      await deleteCustomFormField(toDelete._id);
      setFields((prev) => prev?.filter((f) => f._id !== toDelete._id) ?? null);
      toast('success', 'Field removed');
      setToDelete(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <Banner variant="error">{error}</Banner>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy">Custom Form Fields</h2>
          <p className="text-sm text-slate-500">Extra questions shown on the public exhibitor signup form.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Field
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {!fields ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : fields.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 text-center ${CARD_CLASS}`}>
            <span className={emptyStateBadgeClass('orange')}>
              <ListChecks size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No custom fields configured yet</p>
            <p className="mt-1 text-sm text-slate-500">Add a field to collect extra information from exhibitors at signup.</p>
          </div>
        ) : (
          fields.map((f) => (
            <div key={f._id} className={`flex items-center justify-between p-4 ${CARD_CLASS}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-navy">{f.label}</p>
                  {f.required && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">Required</span>}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {FIELD_TYPE_LABEL[f.fieldType]}
                  {f.options?.length ? ` — ${f.options.join(', ')}` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(f)} className="rounded-md p-2 text-slate-400 hover:bg-offwhite hover:text-navy">
                  <Pencil size={15} />
                </button>
                <button onClick={() => setToDelete(f)} className="rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Field' : 'Add Field'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <AdminInput label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Products of Interest" />
                <AdminSelect
                  label="Field Type"
                  value={form.fieldType}
                  onChange={(e) => setForm({ ...form, fieldType: e.target.value as CustomFieldType })}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABEL[t]}
                    </option>
                  ))}
                </AdminSelect>
                {form.fieldType === 'select' && (
                  <AdminInput
                    label="Options (comma-separated)"
                    value={form.optionsText}
                    onChange={(e) => setForm({ ...form, optionsText: e.target.value })}
                    placeholder="e.g. Small, Medium, Large"
                  />
                )}
                <AdminToggle label="Required" checked={form.required} onChange={(v) => setForm({ ...form, required: v })} />
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Field'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.label}"?`}
        description="This removes the question from the exhibitor signup form. Answers already submitted are not deleted."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
