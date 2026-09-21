import type { NextFunction, Request, Response } from 'express';
import { isLockdownActive } from '../services/securityEvent.service.js';
import { ApiError } from '../utils/ApiError.js';

// Exempt prefixes stay fully open during lockdown: /admin (already behind
// requireAuth — an admin session isn't what lockdown is defending against),
// /auth (an admin must still be able to log in to turn lockdown back off),
// /payments (a Paystack webhook retried while lockdown is on must never be
// dropped — that would desync a real payment from its registration), and
// /delegate + /reviewer (access-code-gated staff/reviewer portals, not the
// open public).
const EXEMPT_PREFIXES = [
  '/api/v1/admin',
  '/api/v1/auth',
  '/api/v1/payments',
  '/api/v1/delegate',
  '/api/v1/reviewer',
  '/healthz',
];

const isMutating = (method: string): boolean => method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

// Only ever blocks writes — reads stay open everywhere. Taking down the
// public site's ability to load pages would be a far bigger action than this
// button is meant to be; what it actually stops is a flood of malicious/spam
// submissions hitting public forms (registration, abstracts, inquiries, the
// newsletter, etc.) while an admin investigates.
export const lockdownGuard = (req: Request, _res: Response, next: NextFunction): void => {
  if (!isLockdownActive() || !isMutating(req.method) || EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    next();
    return;
  }
  next(new ApiError(503, 'Submissions are temporarily paused for maintenance. Please try again shortly.', 'LOCKDOWN_ACTIVE'));
};
