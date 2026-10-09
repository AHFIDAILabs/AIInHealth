/**
 * scripts/compendium/sanitizeAbstractHtml.ts
 *
 * The compendium brief permits a tiny whitelist of inline formatting in
 * abstract text — <i>, <b>, <sub>, <sup> — nothing else, applied "at export
 * time AND again at render time" (Phase 6's public pages re-sanitize on
 * their own, independently, before ever using dangerouslySetInnerHTML).
 *
 * Escape-first, not strip-first: a naive "find <tag> and remove it if not
 * allowed" regex is unsafe against real abstract text, which contains bare
 * angle brackets that are NOT markup at all — e.g. "CD4 <200 without TB-LAM
 * testing" (AIHS261054) or "p < 0.05". A stray `<` followed, anywhere later
 * in the same string, by an unrelated `>` would make a naive regex treat
 * everything between them as one giant "tag" and delete it — silently
 * eating real prose. Escaping everything first and then selectively
 * restoring only an exact, attribute-free `<tag>`/`</tag>` match removes
 * that ambiguity entirely: a stray `<200` can never masquerade as a tag.
 */
const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ALLOWED_TAGS = ['i', 'b', 'sub', 'sup'];
const ALLOWED_TAG_RE = new RegExp(`&lt;(/?)(${ALLOWED_TAGS.join('|')})&gt;`, 'gi');

export const sanitizeAbstractHtml = (text: string): string =>
  escapeHtml(text).replace(ALLOWED_TAG_RE, (_match, closing: string, tag: string) => `<${closing}${tag.toLowerCase()}>`);
