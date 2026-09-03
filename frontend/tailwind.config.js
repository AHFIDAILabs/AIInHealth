/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — see AI_in_Health_Summit_2026_Visual_Ground_Truth.md, Section 1.
        // Orange is the accent; navy is the base; red is ONLY the AHFID convener credit.
        orange: { DEFAULT: '#E8792C', hover: '#D46B22' },
        navy: { DEFAULT: '#0F172A', nav: '#090E17', secondary: '#14213D' },
        ahfid: '#AA1F29',
        offwhite: '#F8F9FA',
        // Semantic — admin portal status colors only (badges/alerts), never used
        // as brand accents.
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#2563EB',
        // Data-viz accent set — purely decorative variety for KPI icon badges and
        // chart series (e.g. distinguishing 4 stat cards at a glance), distinct
        // from the semantic status colors above which carry meaning. Orange stays
        // the one brand/action color; these never appear on buttons or links.
        chart: {
          violet: '#7C3AED',
          teal: '#0D9488',
          rose: '#E11D48',
          amber: '#D97706',
          blue: '#2563EB',
        },
      },
      fontFamily: {
        display: ['Sora', 'Plus Jakarta Sans', 'sans-serif'],
        body: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-orange': '0 0 50px -10px rgba(232, 121, 44, 0.25)',
        'glow-subtle': '0 20px 40px -15px rgba(0, 0, 0, 0.07)',
        // Tight, low-radius elevation for dense admin surfaces (KPI cards, table
        // rows) — glow-subtle's large diffuse blur reads right on marketing pages
        // but is too heavy at admin density; this is the Stripe-dashboard-style
        // double-layer shadow instead.
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 2px 4px rgba(15, 23, 42, 0.05), 0 6px 16px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
