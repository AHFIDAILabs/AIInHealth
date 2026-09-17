import { forwardRef, type InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

// Admin-portal input treatment: tighter corners (rounded-lg, ~8px) and border-based
// separation rather than the public site's rounded-xl/soft-shadow language — see
// Visual Ground Truth's shape/elevation split between the two surfaces.
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-slate-200">
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={`w-full rounded-lg border bg-navy px-3.5 py-2.5 text-base sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange/50 ${
            error ? 'border-danger' : 'border-slate-700'
          } ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...rest}
        />
        {error && (
          <p id={`${fieldId}-error`} className="mt-1.5 text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';
