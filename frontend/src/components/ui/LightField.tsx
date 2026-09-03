import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

// Public-site input treatment (rounded-xl, soft border, light surface) — the
// counterpart to FormField.tsx's dark admin-portal styling. Shared by Contact and
// Register, the two public forms that live outside the admin portal.
const fieldClasses = (error?: string, className = '') =>
  `w-full rounded-xl border bg-white px-4 py-3 text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange/40 ${
    error ? 'border-danger' : 'border-slate-200'
  } ${className}`;

const idFromLabel = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

interface LightFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}
export const LightField = forwardRef<HTMLInputElement, LightFieldProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    const fieldId = id ?? idFromLabel(label);
    return (
      <div>
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-navy">
          {label}
        </label>
        <input ref={ref} id={fieldId} className={fieldClasses(error, className)} aria-invalid={!!error} {...rest} />
        {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }
);
LightField.displayName = 'LightField';

interface LightTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}
export const LightTextArea = forwardRef<HTMLTextAreaElement, LightTextAreaProps>(
  ({ label, error, id, className = '', rows = 5, ...rest }, ref) => {
    const fieldId = id ?? idFromLabel(label);
    return (
      <div>
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-navy">
          {label}
        </label>
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          className={`resize-none ${fieldClasses(error, className)}`}
          aria-invalid={!!error}
          {...rest}
        />
        {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }
);
LightTextArea.displayName = 'LightTextArea';

interface LightSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}
export const LightSelect = forwardRef<HTMLSelectElement, LightSelectProps>(
  ({ label, error, id, className = '', children, ...rest }, ref) => {
    const fieldId = id ?? idFromLabel(label);
    return (
      <div>
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-navy">
          {label}
        </label>
        <select ref={ref} id={fieldId} className={fieldClasses(error, className)} aria-invalid={!!error} {...rest}>
          {children}
        </select>
        {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }
);
LightSelect.displayName = 'LightSelect';
