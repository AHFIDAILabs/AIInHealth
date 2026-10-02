import rateLimit, { type Options } from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import { recordSecurityEvent } from '../services/securityEvent.service.js';
import { getRawForwardedFor } from '../utils/clientIp.js';
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
      rawForwardedFor: getRawForwardedFor(req),
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

// scholarshipApplication.routes.ts's public submit — same email+IP keying and
// window as abstractLimiter/registrationLimiter.
export const scholarshipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
    return `${req.ip}:${email}`;
  },
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many submissions. Try again in 15 minutes.' } },
  handler: onLimitExceeded('scholarshipLimiter', 'low'),
});

// The optional supporting-document upload on the scholarship application form
// — same reasoning as idCardUploadLimiter: hit before any application record
// exists, so IP-only.
export const scholarshipUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many uploads. Try again in 15 minutes.' } },
  handler: onLimitExceeded('scholarshipUploadLimiter', 'medium'),
});

// Ask the Concept Note (rag.service.ts) — the one fully public, uncapped-by-
// design AI endpoint, and the highest-risk one on the shared Groq daily
// budget (see aiBudget.service.ts). IP-only, tight window: a single visitor
// asking 5 real questions in 15 minutes is generous; a bot loop hitting this
// unbounded could exhaust the whole day's budget for every other AI feature
// in minutes.
// promo.controller.ts's public issueToken — hit automatically by the landing
// page's banner widget once per "pass" (every ~45-100s per visitor), no email
// in the request yet to key on. IP-only; the real abuse guard is the token's
// own short TTL + single-use, not this ceiling — this just blunts a scripted
// harvesting loop.
export const promoTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many requests. Try again shortly.' } },
  handler: onLimitExceeded('promoTokenLimiter', 'medium'),
});

// promo.controller.ts's public claim — this one actually mints a 100%-off
// access code, so it's the highest-value public endpoint in the app to leave
// unbounded. Email+IP keyed like the other claim/registration limiters.
export const promoClaimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKey,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Try again in 15 minutes.' } },
  handler: onLimitExceeded('promoClaimLimiter', 'high'),
});

// Rapporteur portal — keyed on the bearer token itself (there's no login/email
// here, the token in the URL IS the identity), not IP, since several rapporteurs
// on the same venue WiFi must never share one ceiling.
const tokenKey = (req: Request): string => (typeof req.params?.token === 'string' ? req.params.token : req.ip ?? 'unknown');

// Generous — this gates both the rapporteur's own polling/autosave PATCHes and
// the admin Live Status tab's indirect read load, so it needs headroom for a
// rapporteur typing continuously through a long session.
export const rapporteurReadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: tokenKey,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again shortly.' } },
  handler: onLimitExceeded('rapporteurReadLimiter', 'low'),
});

// Tighter — this is the one endpoint that triggers a Groq call per assignment
// (rapporteurPolish.service.ts), so it also protects the daily AI budget from
// a retry loop.
export const rapporteurSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: tokenKey,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Try again in 15 minutes.' } },
  handler: onLimitExceeded('rapporteurSubmitLimiter', 'medium'),
});

// Layer 2 "Capture This Quote" — reuses the same token-keying as
// rapporteurReadLimiter/rapporteurSubmitLimiter above. A handful of quote
// captures per session is the expected usage; this also backstops the shared
// Whisper budget against a runaway client-side retry loop.
export const rapporteurTranscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: tokenKey,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Try again in 15 minutes.' } },
  handler: onLimitExceeded('rapporteurTranscribeLimiter', 'medium'),
});

// Layer 3 live transcript — cookie-authenticated (admin), keyed by user id
// rather than token/IP. 200/15min comfortably covers continuous ~25s chunking
// for the whole window (~36 chunks) with headroom for a retry here and there.
export const liveTranscriptChunkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.sub ?? req.ip ?? 'unknown',
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again shortly.' } },
  handler: onLimitExceeded('liveTranscriptChunkLimiter', 'low'),
});

export const askAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many questions. Try again in 15 minutes.' } },
  handler: onLimitExceeded('askAiLimiter', 'low'),
});
