import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, isInternalPath } from '../../lib/analytics';

// Renders nothing — mounted once near the root, inside the Router, AFTER
// <Routes> in App.tsx (not just "somewhere inside it"): React commits sibling
// effects in JSX order, and the routed page's own useDocumentTitle effect must
// run before this one reads document.title, or every tracked title lags one
// navigation behind the page it's actually for.
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
    void trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  return null;
};
