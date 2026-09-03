import { useEffect } from 'react';

const SITE_NAME = 'AI in Health Summit 2026';

// Every public route previously inherited the same static <title> from index.html —
// a shared link to /agenda, /speakers, /register etc. all looked identical in a
// browser tab or a press/social share. No new dependency needed for just the title;
// restores the site-wide default on unmount so navigating away (e.g. to a route that
// doesn't call this hook) doesn't leave a stale page-specific title behind.
export const useDocumentTitle = (pageTitle: string): void => {
  useEffect(() => {
    const previous = document.title;
    document.title = `${pageTitle} | ${SITE_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);
};
