import DOMPurify from 'dompurify';

// Admin-authored email bodies (CommunicationsTab.tsx) are composed as free-
// text HTML in a plain textarea, then rendered back via
// dangerouslySetInnerHTML once the communication isn't a draft anymore (sent/
// failed/cancelled, read-only view). Unlike sanitizeAbstractHtml.ts's narrow
// i/b/sub/sup allowlist (public-facing abstract text, never meant to contain
// links or structure), an email genuinely needs paragraphs/links/lists/basic
// emphasis — so this uses DOMPurify with an explicit allowlist instead of a
// hand-rolled escape, rather than widening that other, deliberately-narrow
// sanitizer for an unrelated use case. Threat model here is narrower than a
// public-facing sink (only admins write this body), but still real: a
// compromised or lower-privileged admin account could otherwise store script
// that executes in a colleague's session the next time they open the draft.
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'blockquote', 'span'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export const sanitizeEmailHtml = (html: string): string =>
  DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false });
