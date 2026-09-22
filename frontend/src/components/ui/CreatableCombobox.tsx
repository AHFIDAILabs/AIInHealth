import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { getApiErrorMessage } from '../../services/api';

export interface ComboboxOption {
  id: string;
  name: string;
  // Shown in the delete-confirmation copy when set — lets the caller warn
  // "N session(s) still use this" before the admin commits, even though the
  // server has the final say (see sessionType.controller.ts's adminDelete).
  inUseCount?: number;
}

interface CreatableComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  // Deletes an existing option — async so the caller can await the API call,
  // refetch its option list, and surface a server-side block (e.g. "still in
  // use") back through the thrown error's message.
  onDelete: (option: ComboboxOption) => Promise<void>;
  placeholder?: string;
  error?: string;
}

// A plain text field, not a picker locked to a fixed list — typing a value
// that doesn't match any existing option is valid on its own (the value IS
// whatever's typed) and becomes a real, reusable option automatically the
// next time this form is saved (see session.controller.ts's
// upsertSessionType). The dropdown is just a shortcut for picking an
// existing one, plus the only place an option can be deleted.
export const CreatableCombobox = ({ label, value, onChange, options, onDelete, placeholder, error }: CreatableComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ComboboxOption | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const trimmed = value.trim();
  const filtered = options.filter((o) => o.name.toLowerCase().includes(trimmed.toLowerCase()));
  const isNewValue = trimmed.length > 0 && !options.some((o) => o.name.toLowerCase() === trimmed.toLowerCase());

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await onDelete(toDelete);
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, 'Could not delete this session type.'));
    } finally {
      setToDelete(null);
      setDeleting(false);
    }
  };

  const fieldId = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="relative">
      <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-semibold text-navy">
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange/30 sm:text-[13px] ${
          error ? 'border-danger' : 'border-slate-200 focus:border-orange/40'
        }`}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && !isNewValue && (
                <p className="px-3.5 py-3 text-xs text-slate-400">No session types yet — type one above.</p>
              )}
              {filtered.map((opt) => (
                <div key={opt.id} className="group flex items-center gap-1 px-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.name);
                      setOpen(false);
                    }}
                    className="flex-1 truncate rounded-lg px-2.5 py-2 text-left text-[13px] text-navy hover:bg-offwhite"
                  >
                    {opt.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(opt)}
                    aria-label={`Delete ${opt.name}`}
                    className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {isNewValue && (
                <div className="flex items-center gap-2 border-t border-slate-100 px-3.5 py-2.5 text-[12px] text-slate-500">
                  <Plus size={13} className="shrink-0 text-orange" />
                  <span>
                    &ldquo;{trimmed}&rdquo; will be added as a new session type when you save
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.name}"?`}
        description={
          toDelete && toDelete.inUseCount
            ? `${toDelete.inUseCount} session(s) still use this type — change them first.`
            : "This can't be undone."
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          setToDelete(null);
          setDeleteError('');
        }}
      />
      {deleteError && <p className="mt-1.5 text-xs font-medium text-danger">{deleteError}</p>}
    </div>
  );
};
