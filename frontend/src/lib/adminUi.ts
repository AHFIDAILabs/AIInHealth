// Shared visual tokens for the admin portal's card-based pages — established on
// DashboardPage.tsx and rolled out from there. Keeping these in one place means
// every list/detail/CRUD page reads as one system instead of drifting per file.

export const CARD_CLASS = 'rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover';

// Static per-key class strings, not string-interpolated — Tailwind's JIT scanner
// needs literal class names at build time, so `bg-${color}/15` wouldn't compile.
export const CHIP_COLOR = {
  orange: { bg: 'bg-orange/15', text: 'text-orange' },
  violet: { bg: 'bg-chart-violet/15', text: 'text-chart-violet' },
  teal: { bg: 'bg-chart-teal/15', text: 'text-chart-teal' },
  rose: { bg: 'bg-chart-rose/15', text: 'text-chart-rose' },
  blue: { bg: 'bg-chart-blue/15', text: 'text-chart-blue' },
  amber: { bg: 'bg-chart-amber/15', text: 'text-chart-amber' },
} as const;

export type ChipColorKey = keyof typeof CHIP_COLOR;

export const CHART_HEX: Record<ChipColorKey, string> = {
  orange: '#E8792C',
  violet: '#7C3AED',
  teal: '#0D9488',
  rose: '#E11D48',
  blue: '#2563EB',
  amber: '#D97706',
};

// A big, colorful circular badge for empty states — replaces the old flat
// `bg-offwhite text-slate-400` treatment.
export const emptyStateBadgeClass = (color: ChipColorKey = 'orange') =>
  `flex h-14 w-14 items-center justify-center rounded-2xl ${CHIP_COLOR[color].bg} ${CHIP_COLOR[color].text}`;
