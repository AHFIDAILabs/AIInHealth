import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

type BannerVariant = 'error' | 'warning' | 'success' | 'info';

const variantStyles: Record<BannerVariant, { classes: string; Icon: typeof Info }> = {
  error: { classes: 'border-danger/40 bg-danger/10 text-danger', Icon: XCircle },
  warning: { classes: 'border-warning/40 bg-warning/10 text-warning', Icon: AlertTriangle },
  success: { classes: 'border-success/40 bg-success/10 text-success', Icon: CheckCircle2 },
  info: { classes: 'border-info/40 bg-info/10 text-info', Icon: Info },
};

export const Banner = ({ variant, children }: { variant: BannerVariant; children: ReactNode }) => {
  const { classes, Icon } = variantStyles[variant];
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${classes}`} role="alert">
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
};
