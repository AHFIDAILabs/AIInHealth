// Escapes text that gets interpolated into an HTML string template before it's
// stored and later rendered raw (e.g. via dangerouslySetInnerHTML in the admin
// Communications tab). Without this, a public submission field (abstract author
// name/title, etc.) becomes stored XSS that executes in an admin's session the
// moment the drafted email is previewed.
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
