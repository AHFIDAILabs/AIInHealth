// Retired routes → their replacement, consumed by App.tsx to generate a
// <Navigate> for each one. The retired page's component is NOT deleted —
// it stays in the repo (and, per tsconfig's `include: ["src"]`, still gets
// type-checked on every build) — it's just taken out of the router so it's
// no longer reachable or part of the shipped bundle.
export interface RedirectRule {
  from: string;
  to: string;
  reason: string;
}

export const REDIRECTS: RedirectRule[] = [
  {
    from: '/classic',
    to: '/',
    reason: "Retired homepage variant (pages/public/Home.tsx) — already marked dead in its own code comments before this redirect existed.",
  },
  {
    from: '/home-v2',
    to: '/',
    reason: "Retired homepage variant (pages/public/NewHome.tsx) — already marked dead in its own code comments before this redirect existed.",
  },
];
