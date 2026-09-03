import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const Forbidden = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
      <ShieldAlert size={26} />
    </span>
    <h1 className="mt-5 font-display text-xl font-semibold text-navy">You don&rsquo;t have permission to view this page</h1>
    <p className="mt-2 max-w-sm text-sm text-slate-500">
      Your role doesn&rsquo;t include access to this section. If you believe this is a mistake, ask a Super Admin to
      update your role.
    </p>
    <Link
      to="/admin/dashboard"
      className="mt-6 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange/25 transition-all hover:scale-[1.02] hover:bg-orange-hover"
    >
      Back to Dashboard
    </Link>
  </div>
);
