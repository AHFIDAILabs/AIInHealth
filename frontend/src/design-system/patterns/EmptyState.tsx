import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  body: string;
  action?: ReactNode;
}

// Generic, content-agnostic "nothing more to do here" card — section 4's
// patterns list names this explicitly. Used for a stale RSVP link today
// (see the four *Rsvp*.tsx pages), but deliberately not named/worded for
// that specific case so it's reusable anywhere else one comes up.
export const EmptyState = ({ icon: Icon, iconClassName = 'bg-slate-100 text-slate-400', title, body, action }: EmptyStateProps) => (
  <div className="py-6 text-center">
    <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${iconClassName}`}>
      <Icon size={32} />
    </span>
    <h3 className="mt-4 font-display text-xl font-semibold text-navy">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{body}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);
