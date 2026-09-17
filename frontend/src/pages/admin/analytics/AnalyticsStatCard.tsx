import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton';

export const AnalyticsStatCard = ({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number | null;
  suffix?: string;
}) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      <Icon size={12} /> {label}
    </p>
    {value === null ? (
      <Skeleton className="mt-2 h-7 w-16" />
    ) : (
      <p className="mt-1.5 font-display text-2xl font-bold text-navy">
        {value}
        {suffix && <span className="text-sm font-medium text-slate-400"> {suffix}</span>}
      </p>
    )}
  </div>
);
