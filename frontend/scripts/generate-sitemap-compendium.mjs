import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Separate from generate-sitemap.mjs/PUBLIC_ROUTES on purpose: those are a
// fixed, hand-maintained list of static routes, but compendium abstract URLs
// are dynamic (one per accepted-and-published abstract, decided entirely in
// the DB via the admin Compendium tab) — there's no static route table to
// mirror them from. This script reads the same already-built dist/compendium
// JSON files the SPA itself fetches at runtime, so the sitemap always matches
// whatever was actually exported, with zero duplicated source of truth.
const SITE_URL = 'https://aiinhealthsummit.org';

const distDir = path.resolve(fileURLToPath(import.meta.url), '../../dist');
const compendiumDir = path.join(distDir, 'compendium');

// Mirrors src/App.tsx's own COMPENDIUM_ENABLED check — both the client
// bundle and this postbuild script read the exact same env var, so they can
// never disagree about whether the feature is live for this deploy.
if (process.env.VITE_COMPENDIUM_ENABLED !== 'true') {
  console.log('[sitemap-compendium] VITE_COMPENDIUM_ENABLED is not "true" — skipping, nothing written.');
  process.exit(0);
}

const currentPath = path.join(compendiumDir, 'current.json');
if (!existsSync(currentPath)) {
  console.log('[sitemap-compendium] no dist/compendium/current.json — no edition exported yet, skipping.');
  process.exit(0);
}

const current = JSON.parse(readFileSync(currentPath, 'utf-8'));
const abstractsPath = path.join(compendiumDir, current.file);
const abstracts = existsSync(abstractsPath) ? JSON.parse(readFileSync(abstractsPath, 'utf-8')) : [];

// Withdrawn abstracts are tombstones (noindex'd by the page itself, see
// CompendiumAbstract.tsx) — there's nothing left to index, so they're never
// listed here.
const published = abstracts.filter((a) => a.status === 'published');

const STATIC_ENTRIES = [
  { path: '/compendium', priority: '0.8', changefreq: 'weekly' },
  { path: '/compendium/authors', priority: '0.5', changefreq: 'weekly' },
  { path: '/compendium/keywords', priority: '0.5', changefreq: 'weekly' },
  { path: '/compendium/about', priority: '0.3', changefreq: 'monthly' },
];

const today = new Date().toISOString().split('T')[0];

const entries = [
  ...STATIC_ENTRIES,
  ...published.map((a) => ({ path: `/compendium/${a.code}`, priority: '0.6', changefreq: 'monthly' })),
];

const urlEntries = entries
  .map(
    (e) => `  <url>
    <loc>${SITE_URL}${e.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

writeFileSync(path.join(distDir, 'sitemap-compendium.xml'), sitemap, 'utf-8');
console.log(`[sitemap-compendium] wrote ${entries.length} URLs (${published.length} abstracts) to dist/sitemap-compendium.xml`);
