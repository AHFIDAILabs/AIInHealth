import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton';

export const AnalyticsStatCard = ({
  icon: Icon,
  label,
  value,
  suffix,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number | null;
  suffix?: string;
  // Optional — e.g. AttendeesPage.tsx's "Confirmed" tile deep-links to its
  // own page pre-filtered. Every other caller omits this and gets the same
  // plain, inert card as before.
  onClick?: () => void;
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-card-hover ${onClick ? 'cursor-pointer hover:border-orange/30' : ''}`}
    >
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
    </Tag>
  );
};
