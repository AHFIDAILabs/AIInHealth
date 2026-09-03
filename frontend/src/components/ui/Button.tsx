import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

interface CommonProps {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

const variantClasses: Record<NonNullable<CommonProps['variant']>, string> = {
  primary:
    'bg-orange hover:bg-orange-hover text-white font-semibold shadow-lg shadow-orange/25 hover:scale-[1.03] active:scale-95',
  secondary:
    'bg-white/5 hover:bg-white/10 text-white border border-white/15 font-medium backdrop-blur-sm',
};

const baseClasses =
  'inline-flex items-center justify-center gap-2 text-[14.5px] sm:text-[15px] px-7 py-3.5 rounded-full transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100';

export const buttonClasses = (variant: NonNullable<CommonProps['variant']> = 'primary', className = ''): string =>
  `${baseClasses} ${variantClasses[variant]} ${className}`;

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, className = '', children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

type ButtonLinkProps = CommonProps & LinkProps;

// Internal SPA navigation styled like Button — uses react-router's Link (not a plain
// <a>) so clicking these CTAs doesn't force a full page reload.
export const ButtonLink = ({ variant = 'primary', className = '', children, ...rest }: ButtonLinkProps) => (
  <Link className={buttonClasses(variant, className)} {...rest}>
    {children}
  </Link>
);
