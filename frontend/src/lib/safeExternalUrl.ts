// Guards an `href` built from a publicly-submitted free-text URL field (a
// sponsor/exhibitor/innovator's own "website" link) before it's rendered as a
// real anchor. zod's `.url()` validation (used wherever these are collected)
// accepts any syntactically valid URL per the WHATWG URL spec — including
// `javascript:alert(document.cookie)`, which IS a syntactically valid URL —
// so that check alone doesn't rule this out. A malicious submitter could
// otherwise get an admin reviewing new partner/exhibitor/innovator
// submissions to execute arbitrary script in their own authenticated session
// just by clicking "visit their website." Only http/https survive; anything
// else renders as a plain inert string instead of a clickable link.
export const safeExternalUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
};
