// Shared by generate-sitemap.mjs and prerender.mjs. Mirrors src/App.tsx's
// public route table — kept as a plain list here (not imported from the TS
// route file) since these run as plain Node scripts outside Vite/TS's build
// graph. Deliberately excludes: /classic and /home-v2 (near-duplicate
// homepage variants, canonicalized to "/" instead — see Home.tsx/NewHome.tsx),
// /register/payment-callback (transient redirect target, noindex'd), and the
// "*" catch-all. Keep this in sync with App.tsx if public routes change.
export const PUBLIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/agenda', priority: '0.9', changefreq: 'weekly' },
  { path: '/speakers', priority: '0.9', changefreq: 'weekly' },
  { path: '/volunteers', priority: '0.5', changefreq: 'monthly' },
  { path: '/innovation-showcase', priority: '0.7', changefreq: 'weekly' },
  { path: '/innovation-showcase/confirmed', priority: '0.7', changefreq: 'weekly' },
  { path: '/abstracts/confirmed', priority: '0.7', changefreq: 'weekly' },
  { path: '/participants-outcomes', priority: '0.6', changefreq: 'monthly' },
  { path: '/policy-tracker', priority: '0.6', changefreq: 'weekly' },
  { path: '/partners', priority: '0.7', changefreq: 'monthly' },
  { path: '/gallery', priority: '0.6', changefreq: 'monthly' },
  { path: '/about-ahfid', priority: '0.5', changefreq: 'monthly' },
  { path: '/register', priority: '0.8', changefreq: 'monthly' },
  { path: '/sponsored-delegates', priority: '0.7', changefreq: 'monthly' },
  { path: '/abstracts/submit', priority: '0.6', changefreq: 'monthly' },
  { path: '/team/register', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
];
