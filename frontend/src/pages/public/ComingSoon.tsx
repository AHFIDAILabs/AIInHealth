export const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
    <p className="text-xs font-extrabold uppercase tracking-widest text-orange">Coming Soon</p>
    <h1 className="mt-3 font-display text-3xl font-bold text-navy">{title}</h1>
    <p className="mt-3 max-w-md text-slate-500">
      This page is part of the next build pass. The Home page and admin auth flows are the current design
      checkpoint.
    </p>
  </div>
);
