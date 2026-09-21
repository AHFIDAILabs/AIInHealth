import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const hasConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

// Internal tool areas — staff/delegate/reviewer usage isn't "how people
// interact with the site" the way a visitor's journey through the public
// pages is, and blending the two would quietly skew every number management
// actually looks at (same reasoning as excluding Registration's 'team' type
// from the attendee-facing analytics totals). Exported so
// PageViewTracker.tsx's per-navigation check uses this exact same rule,
// rather than a second copy that could drift out of sync with it.
export const isInternalPath = (pathname: string): boolean =>
  pathname.startsWith('/admin') || pathname.startsWith('/portal') || pathname.startsWith('/review');

let analytics: Analytics | null = null;
// Lazily resolved once, memoized — isSupported() is itself async (it feature-detects
// IndexedDB/cookies, which can be blocked by a browser privacy mode), and every call
// site below awaits this same promise instead of re-running the check.
let readyPromise: Promise<Analytics | null> | null = null;

// Analytics only ever initializes in an actual production build, never in local dev
// or a PR preview — every dev/test page load would otherwise land in the same GA4
// property as real visitors, permanently mixing developer clicks into the numbers
// management actually looks at. There's no separate "staging" GA property to redirect
// this to instead, so "off unless truly prod" is the only safe default.
//
// Also never initializes at all when the page's FIRST load of this session is
// already an internal route (staff almost always reach /admin/login by a
// bookmark or typed URL — a real page load, not a client-side navigation from
// the public site). Firebase Analytics auto-logs one page_view for whatever
// URL is current the moment it initializes, before PageViewTracker's own
// per-navigation filter ever gets a chance to run — the only way to keep that
// automatic hit off an internal route is to never load the SDK there at all.
const shouldInit = hasConfig && import.meta.env.PROD && !isInternalPath(window.location.pathname);

const init = (): Promise<Analytics | null> => {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (!shouldInit) return null;
      try {
        // Firebase Analytics (built on gtag.js) needs cookies/IndexedDB — unsupported
        // in some in-app browsers and always-incognito setups. Fails soft: the rest
        // of the app must never break because analytics couldn't load.
        if (!(await isSupported())) return null;
        const app: FirebaseApp = initializeApp(firebaseConfig);
        return getAnalytics(app);
      } catch {
        return null;
      }
    })();
  }
  return readyPromise;
};

if (shouldInit) void init();

// Fires once per route change (see components/analytics/PageViewTracker.tsx) —
// the Firebase SDK only auto-logs a page_view on its own initial load, which for
// a single-page app means only the very first route the visitor happened to land
// on ever gets counted otherwise.
export const trackPageView = async (path: string, title: string): Promise<void> => {
  const instance = analytics ?? (analytics = await init());
  if (!instance) return;
  logEvent(instance, 'page_view', { page_path: path, page_title: title, page_location: window.location.href });
};

// General-purpose export for future custom events (e.g. "Register Now" clicked,
// an abstract submitted) — not wired to anything yet, kept here so call sites don't
// need to know or care whether analytics actually loaded.
export const trackEvent = async (name: string, params?: Record<string, unknown>): Promise<void> => {
  const instance = analytics ?? (analytics = await init());
  if (!instance) return;
  logEvent(instance, name, params);
};
