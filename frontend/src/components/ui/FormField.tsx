import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

// Admin-portal input treatment: tighter corners (rounded-lg, ~8px) and border-based
// separation rather than the public site's rounded-xl/soft-shadow language — see
// Visual Ground Truth's shape/elevation split between the two surfaces.
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id, className = '', type, ...rest }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    // A password field gets a show/hide toggle automatically — every caller
    // that passes type="password" gets this for free, nothing to opt into
    // per-page. `visible` swaps the actual input type between 'password' and
    // 'text'; the toggle button is tabIndex=-1 so Tab still moves straight
    // from the field to whatever's next, not through the icon.
    const isPassword = type === 'password';
    const [visible, setVisible] = useState(false);
    return (
      <div>
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-slate-200">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={isPassword ? (visible ? 'text' : 'password') : type}
            className={`w-full rounded-lg border bg-navy px-3.5 py-2.5 text-base sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange/50 ${
              error ? 'border-danger' : 'border-slate-700'
            } ${isPassword ? 'pr-10' : ''} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
        </div>
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
