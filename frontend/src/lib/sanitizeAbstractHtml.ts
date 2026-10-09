// Render-time half of the compendium's double-sanitization (the brief's own
// rule — export-time AND render-time, independently). This is a deliberate
// duplicate of backend/src/scripts/compendium/sanitizeAbstractHtml.ts: there
// is no shared package between the two halves of this app, and re-sanitizing
// a value that's already clean is cheap insurance against a hand-edited
// static JSON file (or a future export-script bug) ever reaching
// dangerouslySetInnerHTML unescaped.
//
// Escape-first, not strip-first — a naive "find <tag>, remove if not
// allowed" regex is unsafe against real abstract text containing a bare "<"
// that isn't markup at all (e.g. "CD4 <200 without TB-LAM testing"); escaping
// everything first and then selectively restoring only an exact,
// attribute-free allowed tag removes that ambiguity entirely.
const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ALLOWED_TAGS = ['i', 'b', 'sub', 'sup'];
const ALLOWED_TAG_RE = new RegExp(`&lt;(/?)(${ALLOWED_TAGS.join('|')})&gt;`, 'gi');

export const sanitizeAbstractHtml = (text: string): string =>
  escapeHtml(text).replace(ALLOWED_TAG_RE, (_match, closing: string, tag: string) => `<${closing}${tag.toLowerCase()}>`);
