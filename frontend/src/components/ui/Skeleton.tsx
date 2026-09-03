export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />
);

export const SkeletonRows = ({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="divide-y divide-slate-100">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-4 px-4 py-3.5">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-1/4' : 'flex-1'}`} />
        ))}
      </div>
    ))}
  </div>
);
