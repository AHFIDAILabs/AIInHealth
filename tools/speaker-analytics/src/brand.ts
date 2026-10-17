// Exact values copied from frontend/tailwind.config.js — this tool is
// self-contained (no import path back into Frontend/), so these are
// duplicated here rather than shared, kept byte-for-byte identical to the
// source of truth. If the real brand config ever changes, re-copy from there.
export const BRAND = {
  color: {
    orange: '#E8792C',
    orangeHover: '#D46B22',
    navy: '#0F172A',
    navyNav: '#090E17',
    navySecondary: '#14213D',
    // Reserved for the AHFID convener credit only — never a general accent,
    // per tailwind.config.js's own comment on this color.
    ahfidRed: '#AA1F29',
    offwhite: '#F8F9FA',
    chart: {
      violet: '#7C3AED',
      teal: '#0D9488',
      rose: '#E11D48',
      amber: '#D97706',
      blue: '#2563EB',
    },
  },
  font: {
    display: "'Sora', 'Plus Jakarta Sans', sans-serif",
    body: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
} as const;

// One color per sector, in the spec's own listed order — orange first (the
// one true brand accent), then the 5 chart colors, cycling only if there
// were ever more than 6 sectors (there are exactly 8 defined categories, so
// two of them repeat a chart color — acceptable for a one-off graphic, but
// flagged here rather than silently invented).
export const SECTOR_COLOR_ORDER = [
  BRAND.color.orange,
  BRAND.color.chart.blue,
  BRAND.color.chart.teal,
  BRAND.color.chart.violet,
  BRAND.color.chart.amber,
  BRAND.color.chart.rose,
  BRAND.color.navySecondary,
  BRAND.color.chart.blue,
] as const;
