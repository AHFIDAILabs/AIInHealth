import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Lighter, deliberate alternative to prerender.mjs's real-browser approach:
// that script drives Playwright over a fixed, small, hand-maintained route
// list (PUBLIC_ROUTES) — fine for ~20 pages, but the compendium can grow to
// however many abstracts get published, and none of that content is
// client-side-only (it's plain data already sitting in static JSON). Rather
// than pay a full browser render per abstract, this just string-templates
// the same per-route <title>/meta/OG/JSON-LD that src/components/seo/SEO.tsx
// (react-helmet-async) would produce at runtime, onto the plain CSR shell —
// so a non-JS crawler or social-preview bot gets real per-abstract metadata
// without the cost (or the growing build time) of a browser pass per record.
//
// Reads dist/compendium/*.json — the exact files the SPA itself fetches at
// runtime (already copied there by `vite build`'s public-dir copy) — so this
// can never drift from what a real visitor sees.
//
// Deliberately never fails the build (see prerender.mjs's own comment):
// worst case, this deploy's compendium pages ship as plain CSR, same as any
// other route when Playwright prerendering is unavailable.
const SITE_URL = 'https://aiinhealthsummit.org';
const SITE_NAME = 'AI in Health Summit 2026';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const FALLBACK_EDITION_TITLE = 'AI in Health Summit 2026 — Compendium of Abstracts';

const distDir = path.resolve(fileURLToPath(import.meta.url), '../../dist');
const compendiumDir = path.join(distDir, 'compendium');
const shellPath = path.join(distDir, 'app-shell.html');

const escapeAttr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Mirrors src/lib/citation.ts's authorList() fallback — never an empty
// author list in the structured data.
const authorList = (record) => {
  const names = (record.authors ?? []).map((a) => a.name).filter(Boolean);
  return names.length > 0 ? names : ['Unknown author'];
};

// Mirrors src/lib/citation.ts's citeUrl().
const citeUrl = (record, edition) =>
  edition.doi ? `https://doi.org/${edition.doi}` : `${SITE_URL}/compendium/${record.code}`;

// Mirrors src/lib/citation.ts's buildScholarlyArticleJsonLd() exactly — kept
// in sync by hand, same precedent as sanitizeAbstractHtml.ts's frontend/
// backend duplicate (no shared package between this plain-Node script and
// the Vite/TS app).
const buildScholarlyArticleJsonLd = (record, edition) => ({
  '@context': 'https://schema.org',
  '@type': 'ScholarlyArticle',
  headline: record.title,
  author: authorList(record).map((name) => ({ '@type': 'Person', name })),
  ...(record.keywords && record.keywords.length > 0 ? { keywords: record.keywords.join(', ') } : {}),
  inLanguage: record.language ?? 'en',
  ...(edition.publishedAt ? { datePublished: edition.publishedAt } : {}),
  url: citeUrl(record, edition),
  isPartOf: { '@type': 'PublicationVolume', name: edition.editionTitle ?? FALLBACK_EDITION_TITLE },
  license: edition.licence.url,
});

// Injects into the plain CSR shell exactly what SEO.tsx would render at
// runtime: a replaced <title>, plus description/canonical/OG/Twitter/JSON-LD
// tags inserted fresh (the shell has none of those to begin with — see
// index.html's own comment on why no static duplicates are kept there).
const injectMeta = (shellHtmlRaw, { title, description, routePath, structuredData, noindex }) => {
  // index.html's own HTML comment contains the literal substring "<title>"
  // as prose (explaining Helmet's behavior) ahead of the real <title> tag —
  // a naive regex's lazy match would span from that prose occurrence all the
  // way to the real tag's closing </title>, eating the comment's closing
  // "-->" and the real original title with it. Stripping comments first
  // removes that false match entirely, leaving only the one real tag.
  const shellHtml = shellHtmlRaw.replace(/<!--[\s\S]*?-->/g, '');
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${routePath}`;
  // \u003c-encode "<" the same way src/components/seo/SEO.tsx does — a raw
  // "<" from free-text content (e.g. a title containing "</script>") would
  // otherwise prematurely close this raw-text element when parsed as HTML.
  const jsonLd = structuredData
    ? `\n    <script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>`
    : '';

  const headAdditions = `
    <meta name="description" content="${escapeAttr(description)}" />
    <link rel="canonical" href="${escapeAttr(url)}" />
    ${noindex ? '<meta name="robots" content="noindex,nofollow" />' : ''}
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeAttr(SITE_NAME)}" />
    <meta property="og:title" content="${escapeAttr(fullTitle)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:image" content="${escapeAttr(DEFAULT_IMAGE)}" />
    <meta property="og:url" content="${escapeAttr(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(fullTitle)}" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />
    <meta name="twitter:image" content="${escapeAttr(DEFAULT_IMAGE)}" />${jsonLd}
  </head>`;

  return shellHtml
    .replace(/<title>.*?<\/title>/s, `<title>${escapeAttr(fullTitle)}</title>`)
    .replace('</head>', headAdditions);
};

const writeRoute = (routePath, html) => {
  if (routePath === '/') {
    writeFileSync(path.join(distDir, 'index.html'), html, 'utf-8');
    return;
  }
  const outDir = path.join(distDir, routePath);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
  writeFileSync(`${path.join(distDir, routePath)}.html`, html, 'utf-8');
};

const main = () => {
  if (process.env.VITE_COMPENDIUM_ENABLED !== 'true') {
    console.log('[prerender-compendium] VITE_COMPENDIUM_ENABLED is not "true" — skipping.');
    return;
  }
  if (!existsSync(shellPath)) {
    console.log('[prerender-compendium] no dist/app-shell.html (prerender.mjs runs first and always writes it) — skipping.');
    return;
  }
  const currentPath = path.join(compendiumDir, 'current.json');
  if (!existsSync(currentPath)) {
    console.log('[prerender-compendium] no dist/compendium/current.json — no edition exported yet, skipping.');
    return;
  }

  const shell = readFileSync(shellPath, 'utf-8');
  const current = JSON.parse(readFileSync(currentPath, 'utf-8'));
  const edition = JSON.parse(readFileSync(path.join(compendiumDir, 'edition.json'), 'utf-8'));
  const abstracts = JSON.parse(readFileSync(path.join(compendiumDir, current.file), 'utf-8'));

  const STATIC_PAGES = [
    {
      path: '/compendium',
      title: 'Open Access Compendium',
      description: 'The open-access compendium of abstracts from the AI in Health Summit 2026 — browse, search, and cite accepted abstracts.',
    },
    {
      path: '/compendium/authors',
      title: 'Author Index',
      description: 'Alphabetical index of authors in the AI in Health Summit 2026 Compendium of Abstracts.',
    },
    {
      path: '/compendium/keywords',
      title: 'Keyword Index',
      description: 'Alphabetical index of keywords in the AI in Health Summit 2026 Compendium of Abstracts.',
    },
    {
      path: '/compendium/about',
      title: 'About the Compendium',
      description: 'Licence, citation, and corrections policy for the AI in Health Summit 2026 Compendium of Abstracts.',
    },
  ];

  for (const page of STATIC_PAGES) {
    const html = injectMeta(shell, { title: page.title, description: page.description, routePath: page.path });
    writeRoute(page.path, html);
    console.log(`[prerender-compendium] ${page.path}`);
  }

  // Withdrawn records are tombstones with nothing left to index (see
  // exportSnapshot.ts) — only published abstracts get a static snapshot.
  const published = abstracts.filter((a) => a.status === 'published');
  for (const record of published) {
    const routePath = `/compendium/${record.code}`;
    const html = injectMeta(shell, {
      title: record.title,
      description: `${record.title} — AI in Health Summit 2026 Compendium of Abstracts.`,
      routePath,
      structuredData: buildScholarlyArticleJsonLd(record, edition),
    });
    writeRoute(routePath, html);
    console.log(`[prerender-compendium] ${routePath}`);
  }

  console.log(`[prerender-compendium] done — ${STATIC_PAGES.length} static pages + ${published.length} abstracts.`);
};

try {
  main();
} catch (err) {
  console.warn('[prerender-compendium] skipped entirely:', err instanceof Error ? err.message : err);
}
