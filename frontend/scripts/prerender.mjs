import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { PUBLIC_ROUTES } from './publicRoutes.mjs';

const PORT = 4173;
const PREVIEW_URL = `http://localhost:${PORT}`;
const distDir = path.resolve(fileURLToPath(import.meta.url), '../../dist');

const waitForServer = async (url, timeoutMs = 20000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`preview server did not become ready within ${timeoutMs}ms`);
};

// Runs as the last step of `npm run build` (see package.json's "postbuild").
// Renders each public route in a real headless browser against the just-built
// app and writes the fully client-rendered DOM back to disk, so both Googlebot
// and non-JS social-preview bots (WhatsApp/Twitter/LinkedIn/Facebook — none of
// which execute JS) get real per-page <title>/meta/OG tags and content instead
// of the single static index.html shell every route used to share.
//
// Deliberately never fails the build: a locked-down/offline build environment
// (no Chromium, no outbound access to the live API this app fetches from)
// just means this deploy ships without prerendering — the plain CSR build
// still works fine on its own, it only loses this enhancement for that one
// deploy. See this session's SEO plan for the reasoning.
const main = async () => {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.warn('[prerender] Playwright not installed — skipping prerender, shipping plain CSR build.');
    return;
  }

  // `shell: true` is required on Windows to resolve `npx` (a .cmd wrapper),
  // but that wrapper is then the ONLY process `preview.kill()` can reach —
  // the real vite server underneath survives and keeps the whole `npm run
  // build` process (and this script's caller) hanging indefinitely after the
  // route loop finishes. `detached: true` + an explicit tree-kill (below)
  // reaches the real server process on both platforms.
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: path.resolve(fileURLToPath(import.meta.url), '../..'),
    stdio: 'pipe',
    shell: true,
    detached: process.platform !== 'win32',
  });

  const killPreview = () => {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F']);
    } else {
      try {
        process.kill(-preview.pid);
      } catch {
        preview.kill();
      }
    }
  };

  try {
    await waitForServer(PREVIEW_URL);

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      for (const route of PUBLIC_ROUTES) {
        try {
          await page.goto(`${PREVIEW_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
          const html = await page.content();
          if (route.path === '/') {
            writeFileSync(path.join(distDir, 'index.html'), html, 'utf-8');
          } else {
            // Written both ways since which one a static host resolves for a
            // trailing-slash-less request (e.g. "/agenda", how every real
            // link/share/search-result points) varies: confirmed live that
            // Render resolves "/agenda/" (trailing slash) to
            // "agenda/index.html" automatically, but a bare "/agenda" falls
            // through to the SPA rewrite instead unless a sibling
            // "agenda.html" file also exists at that exact path — the other
            // half of the same "clean URL" convention. Cheap to always write
            // both; only one is ever actually needed per host.
            const outDir = path.join(distDir, route.path);
            mkdirSync(outDir, { recursive: true });
            writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
            writeFileSync(`${path.join(distDir, route.path)}.html`, html, 'utf-8');
          }
          console.log(`[prerender] ${route.path}`);
        } catch (err) {
          console.warn(`[prerender] skipped ${route.path}:`, err instanceof Error ? err.message : err);
        }
      }
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.warn('[prerender] skipped entirely:', err instanceof Error ? err.message : err);
  } finally {
    killPreview();
  }
};

main()
  .catch((err) => {
    console.warn('[prerender] unexpected failure, shipping plain CSR build:', err instanceof Error ? err.message : err);
  })
  .finally(() => {
    // Belt-and-braces: some stray handle (a lingering socket, an undisposed
    // browser context) should never be able to hang the build indefinitely.
    process.exit(0);
  });
