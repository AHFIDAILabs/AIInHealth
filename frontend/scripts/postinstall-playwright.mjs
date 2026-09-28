import { spawnSync } from 'node:child_process';

// Best-effort browser download for the prerender step (see scripts/prerender.mjs).
// Never fails `npm install` — a locked-down or offline build environment just
// means prerendering degrades to a no-op later, not a broken install. Plain
// Node child_process instead of `... || true` in package.json because that
// shell syntax isn't portable to Windows' cmd.exe (no `true` command there).
const result = spawnSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit', shell: true });
if (result.status !== 0) {
  console.warn('[postinstall] Playwright Chromium install failed or was skipped — prerendering will be skipped at build time.');
}
process.exit(0);
