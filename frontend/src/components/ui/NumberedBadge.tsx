type Size = 'sm' | 'md' | 'lg';
type Variant = 'orange' | 'navy' | 'white';

const sizeClasses: Record<Size, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-13 h-13 text-lg',
};

const variantClasses: Record<Variant, string> = {
  orange: 'bg-orange text-white shadow-md shadow-orange/20',
  navy: 'bg-navy-secondary text-white border border-slate-700',
  white: 'bg-white text-navy-secondary border border-slate-200 shadow-sm',
};

interface NumberedBadgeProps {
  number: number;
  size?: Size;
  variant?: Variant;
  className?: string;
}

export const NumberedBadge = ({ number, size = 'md', variant = 'orange', className = '' }: NumberedBadgeProps) => (
  <div
    className={`flex shrink-0 items-center justify-center rounded-full font-bold font-display ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
  >
    {String(number).padStart(2, '0')}
  </div>
);
