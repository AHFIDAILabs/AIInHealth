import rateLimit, { type Options } from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import { recordSecurityEvent } from '../services/securityEvent.service.js';
import type { SecurityEventSeverity } from '../types/enums.js';

// Shared `handler` for every limiter below — records a security event, then
// reproduces the response express-rate-limit's default handler would have
// sent (it must be reproduced explicitly: passing a custom `handler` fully
// replaces the default one, `message` included).
const onLimitExceeded =
  (limiterName: string, severity: SecurityEventSeverity) =>
  (req: Request, res: Response, _next: NextFunction, options: Options): void => {
    void recordSecurityEvent({
      type: 'rate_limit.exceeded',
      severity,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.originalUrl,
      detail: { limiter: limiterName },
    });
    res.status(options.statusCode).json(options.message);
  };

/**
 * In-memory limiter for this early build. The System Design Document specifies a
 * Redis-backed limiter (rate-limiter-flexible) for Phase 1 production, since the
 * in-memory store resets on every restart/deploy and doesn't work across multiple
 * Node instances. Fine for local/single-instance use while we validate design.
 */

// This is the blanket net over every /api/v1 request (reads included) — unlike
// the endpoint-specific limiters below, it's keyed on IP alone with nothing to
// tell two different people apart. That's fine on the open internet, but this
// is an in-person event: a meaningful chunk of the ~100 concurrent attendees
// expected on-site will share one venue-WiFi NAT'd IP, and a single SPA page
// view is several requests (data + auth check + etc.), not one. A low ceiling
// here risks locking out legitimate attendees on the same WiFi, not stopping
// an attacker — the specific limiters below (already keyed on IP+email) are
// what actually guards the sensitive write/login endpoints, and are untouched.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again shortly.' } },
  // 'low' severity — this net is IP-only (see the comment above) and a busy
  // venue WiFi NAT can legitimately trip it; it's a volume signal, not on its
  // own evidence of an attack the way tripping loginLimiter is.
  handler: onLimitExceeded('apiLimiter', 'low'),
});

const emailKey = (req: Request): string => {
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
  return `${req.ip}:${email}`;
};

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKey,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Try again in 15 minutes.' } },
  // 'high' — this is the credential-stuffing/brute-force guard specifically.
  handler: onLimitExceeded('loginLimiter', 'high'),
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKey,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Try again in 15 minutes.' } },
  handler: onLimitExceeded('passwordResetLimiter', 'medium'),
});

export const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
    const contactEmail = typeof req.body?.contactEmail === 'string' ? req.body.contactEmail.toLowerCase() : '';
    return `${req.ip}:${email || contactEmail}`;
  },
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many submissions. Try again in 15 minutes.' } },
  handler: onLimitExceeded('registrationLimiter', 'low'),
});

export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKey,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many messages. Try again in 15 minutes.' } },
  handler: onLimitExceeded('contactLimiter', 'low'),
});

export const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.contactEmail === 'string' ? req.body.contactEmail.toLowerCase() : '';
    return `${req.ip}:${email}`;
  },
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many submissions. Try again in 15 minutes.' } },
  handler: onLimitExceeded('inquiryLimiter', 'low'),
});

// Each hit is an outbound Paystack API call, not just a DB write — the costliest
// public endpoint to leave unbounded. Keyed by registrationId (initialize) / the
// :reference param (verify) rather than just IP, since a shared office/campus IP
// legitimately registers many people in a short window.
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const key =
      (typeof req.body?.registrationId === 'string' && req.body.registrationId) ||
      (typeof req.params?.reference === 'string' && req.params.reference) ||
      '';
    return `${req.ip}:${key}`;
  },
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many payment requests. Try again in 15 minutes.' } },
  handler: onLimitExceeded('paymentLimiter', 'medium'),
});

// Public session RSVP claim — keyed by email+IP like the other public-write
// limiters above. Guards against both spam-claiming limited seats and using this
// endpoint to probe/enumerate whether a given email is already on a session's list.
export const rsvpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKey,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Try again in 15 minutes.' } },
  handler: onLimitExceeded('rsvpLimiter', 'low'),
});

export const abstractLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.authorEmail === 'string' ? req.body.authorEmail.toLowerCase() : '';
    return `${req.ip}:${email}`;
  },
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many submissions. Try again in 15 minutes.' } },
  handler: onLimitExceeded('abstractLimiter', 'low'),
});

// The public ID-card upload used by the attendee form's ID_VERIFICATION_TICKET_CATEGORIES
// gate (registration.routes.ts) — hit before the registration itself exists, so
// there's no email in the request body yet to key on the way registrationLimiter
// does; IP-only, same reasoning as apiLimiter's blanket net.
export const idCardUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many uploads. Try again in 15 minutes.' } },
  handler: onLimitExceeded('idCardUploadLimiter', 'medium'),
});
