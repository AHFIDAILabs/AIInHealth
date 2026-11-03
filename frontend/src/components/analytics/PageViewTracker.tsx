import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, isInternalPath } from '../../lib/analytics';

// Renders nothing — mounted once near the root, inside the Router, AFTER
// <Routes> in App.tsx. The routed page's own <SEO> element (react-helmet-async)
// is the only thing that ever sets <title> now, but Helmet doesn't commit it
// to the real DOM synchronously in React's commit phase — it batches the write
// behind its own requestAnimationFrame. Reading document.title in a plain
// useEffect here would race that and send GA4 the PREVIOUS page's title. Since
// our own rAF is requested after Helmet's (Helmet's commit effect lives deeper
// in the tree and so fires first within the same commit), queuing our read in
// an rAF too guarantees it runs after Helmet's has already flushed the new title.
export const PageViewTracker = () => {
  const location = useLocation();
  // Skips the very first mount — Firebase Analytics already auto-logs one
  // page_view for the initial URL the moment it initializes, whichever route
  // that happens to be. Tracking it again here would double-count every
  // session's first page.
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (isInternalPath(location.pathname)) return;
    const raf = requestAnimationFrame(() => {
      void trackPageView(location.pathname, document.title);
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  return null;
};
