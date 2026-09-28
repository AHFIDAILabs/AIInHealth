import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PUBLIC_ROUTES } from './publicRoutes.mjs';

const SITE_URL = 'https://aiinhealthsummit.org';

const today = new Date().toISOString().split('T')[0];

const urlEntries = PUBLIC_ROUTES.map(
  (route) => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

const distDir = path.resolve(fileURLToPath(import.meta.url), '../../dist');
writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf-8');
console.log(`[sitemap] wrote ${PUBLIC_ROUTES.length} URLs to dist/sitemap.xml`);
