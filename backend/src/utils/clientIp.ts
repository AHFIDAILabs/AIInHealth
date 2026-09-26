import type { Request } from 'express';

// The raw X-Forwarded-For header, verbatim — kept alongside `req.ip` on
// security events specifically so a wrong `TRUST_PROXY_HOPS` (config/env.ts)
// is self-diagnosing from the Security Center UI: if `ip` ever looks like an
// internal/proxy address again, an admin can compare it against this raw
// chain (each hop appends its own address, left-to-right, client first)
// instead of needing a code change and a redeploy just to see what the
// header actually contained.
export const getRawForwardedFor = (req: Request): string | undefined => {
  const header = req.headers['x-forwarded-for'];
  if (!header) return undefined;
  return Array.isArray(header) ? header.join(', ') : header;
};
