import type { LucideIcon } from 'lucide-react';

interface AdminComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

// Honest placeholder for sections that don't have a backend resource yet
// (Speakers/Sessions/Partners/Inquiries/Messages/Audit Log/Users) — a designed state
// instead of a dead link, matching how the public Speakers page handled the same gap.
export const AdminComingSoon = ({ icon: Icon, title, description }: AdminComingSoonProps) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange/10 text-orange">
      <Icon size={24} />
    </span>
    <h1 className="mt-5 font-display text-xl font-semibold text-navy">{title}</h1>
    <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
    <span className="mt-5 rounded-full bg-offwhite px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
      Coming in the next build pass
    </span>
  </div>
);
