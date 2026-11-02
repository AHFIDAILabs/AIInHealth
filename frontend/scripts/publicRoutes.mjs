import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Shared by generate-sitemap.mjs and prerender.mjs. Mirrors src/App.tsx's
// public route table — kept as a plain list here (not imported from the TS
// route file) since these run as plain Node scripts outside Vite/TS's build
// graph. Deliberately excludes: /classic and /home-v2 (near-duplicate
// homepage variants, canonicalized to "/" instead — see Home.tsx/NewHome.tsx),
// /register/payment-callback (transient redirect target, noindex'd), the
// "*" catch-all, and every /compendium* route (its own dynamic, abstract-
// count-scaling sitemap/prerender pair — generate-sitemap-compendium.mjs /
// prerender-compendium.mjs — reading the same static snapshot the SPA itself
// fetches at runtime, see compendium.service.ts). Keep this in sync with
// App.tsx if public routes change.
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/agenda', priority: '0.9', changefreq: 'weekly' },
  { path: '/live', priority: '0.8', changefreq: 'weekly' },
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
  // Added for the post-event/2027 restructure — previously missing from this
  // list entirely, which meant none of these got a real prerendered <title>/
  // OG/Twitter tag or a sitemap entry; a shared link just surfaced the static
  // shell's generic homepage copy instead of the actual page's own.
  { path: '/2027', priority: '0.8', changefreq: 'weekly' },
  { path: '/2026/gallery', priority: '0.6', changefreq: 'monthly' },
  { path: '/2026/videos', priority: '0.5', changefreq: 'monthly' },
];

// /2026/gallery/:albumId is dynamic in principle, but albums only ever get
// added via the manual Flickr-manifest-rebuild cycle (build-media-manifest.ts
// → commit → redeploy) — never live-published the way compendium abstracts
// are — so, unlike /compendium/:code, enumerating every known album ID at
// build time from the same static manifest the gallery itself reads never
// goes stale between rebuilds.
const albumsJsonPath = path.resolve(fileURLToPath(import.meta.url), '../../public/media/2026/albums.json');
const albumRoutes = existsSync(albumsJsonPath)
  ? JSON.parse(readFileSync(albumsJsonPath, 'utf-8')).map((album) => ({
      path: `/2026/gallery/${album.id}`,
      priority: '0.5',
      changefreq: 'monthly',
    }))
  : [];

export const PUBLIC_ROUTES = [...STATIC_ROUTES, ...albumRoutes];
