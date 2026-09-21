import type { NextFunction, Request, Response } from 'express';
import { isIpBlocked, recordSecurityEvent } from '../services/securityEvent.service.js';
import { ApiError } from '../utils/ApiError.js';

// Exempts the Security Command Center's own routes so a root admin can still
// reach the "Unblock IP" button even from an IP that's (accidentally or
// otherwise) on the blocklist — those routes are already gated behind
// requireAuth + requireRootAdmin, so this exemption isn't a bypass for
// anyone else, just an escape hatch against locking the one person who can
// undo the block out of the only screen that can undo it.
const EXEMPT_PREFIX = '/api/v1/admin/security';

export const blockedIpGuard = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.path.startsWith(EXEMPT_PREFIX) || !isIpBlocked(req.ip)) {
    next();
    return;
  }
  void recordSecurityEvent({
    type: 'blocked_ip.request_denied',
    severity: 'medium',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    path: req.originalUrl,
  });
  next(new ApiError(403, 'Forbidden', 'IP_BLOCKED'));
};
