import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * In-memory limiter for this early build. The System Design Document specifies a
 * Redis-backed limiter (rate-limiter-flexible) for Phase 1 production, since the
 * in-memory store resets on every restart/deploy and doesn't work across multiple
 * Node instances. Fine for local/single-instance use while we validate design.
 */

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
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
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKey,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Try again in 15 minutes.' } },
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
});

export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKey,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many messages. Try again in 15 minutes.' } },
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
});
