import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './i18n/config';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Registers the same /sw.js the push-notification opt-in flows already use
// (delegate.service.ts, push.service.ts) — calling register() again there
// with an unchanged script is a no-op against this, it just reuses the
// existing registration. Production-only: registering it in dev would have
// Vite's own dev-server responses sitting behind the service worker's
// cache-first static-asset handling, which is exactly the kind of stale-file
// confusion a dev workflow doesn't want. Fire-and-forget — a failed/
// unsupported registration must never block the app from rendering.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
