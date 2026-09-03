import type { ReactNode } from 'react';
import { AhfidLockup } from '../ui/AhfidBadge';

interface AdminAuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export const AdminAuthLayout = ({ title, subtitle, children }: AdminAuthLayoutProps) => (
  <div className="flex min-h-screen items-center justify-center bg-navy px-4 py-12">
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center text-center">
        <AhfidLockup />
        <div className="mt-6 h-px w-16 bg-slate-700" />
      </div>

      <div className="rounded-lg border border-slate-700 bg-navy-secondary/60 p-8">
        <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        AI in Health Summit 2026 Admin Portal &middot; Abuja, Nigeria
      </p>
    </div>
  </div>
);
