import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const labelClass = 'mb-1.5 block text-[13px] font-semibold text-navy';
const baseClass =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-[13px] text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange/30';
const errorRing = (error?: string) => (error ? 'border-danger' : 'border-slate-200 focus:border-orange/40');

// Light, dense form primitives for the admin CRUD forms (Speakers/Sessions/Partners/
// Users/etc) — distinct from FormField.tsx, which is dark-styled for the navy login
// pages. Same field shape (label + error) so both read as one system, different surface.

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}
export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        <label htmlFor={fieldId} className={labelClass}>
          {label}
        </label>
        <input ref={ref} id={fieldId} className={`${baseClass} ${errorRing(error)} ${className}`} {...rest} />
        {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }
);
AdminInput.displayName = 'AdminInput';

interface AdminTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  maxLength?: number;
}
export const AdminTextarea = forwardRef<HTMLTextAreaElement, AdminTextareaProps>(
  ({ label, error, id, className = '', maxLength, value, ...rest }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    const count = typeof value === 'string' ? value.length : 0;
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor={fieldId} className={labelClass.replace('mb-1.5 block', '')}>
            {label}
          </label>
          {maxLength && (
            <span className="text-[11px] text-slate-400">
              {count}/{maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={fieldId}
          value={value}
          maxLength={maxLength}
          className={`${baseClass} ${errorRing(error)} min-h-[90px] resize-y ${className}`}
          {...rest}
        />
        {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }
);
AdminTextarea.displayName = 'AdminTextarea';

interface AdminSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}
export const AdminSelect = forwardRef<HTMLSelectElement, AdminSelectProps>(
  ({ label, error, id, className = '', children, ...rest }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        <label htmlFor={fieldId} className={labelClass}>
          {label}
        </label>
        <select ref={ref} id={fieldId} className={`${baseClass} ${errorRing(error)}`} {...rest}>
          {children}
        </select>
        {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }
);
AdminSelect.displayName = 'AdminSelect';

export const AdminToggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5">
    <span className="text-[13px] font-semibold text-navy">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-orange' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-[16px]' : 'translate-x-0'}`}
      />
    </button>
  </label>
);
