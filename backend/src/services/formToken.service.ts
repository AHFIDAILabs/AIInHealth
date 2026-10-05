import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Public form spam hardening — a time-trap. Every public form fetches a
// token on mount (GET /forms/token) and sends it straight back as
// `formToken` on submit; a bot that POSTs directly to the API without first
// loading the page (or one that submits instantly, faster than a human could
// possibly fill the form) never has a valid-aged token to send.
//
// The token is self-contained (`${issuedAt}.${hmac}`) rather than a bare HMAC
// the client has to pair with a separately-remembered issuedAt — one string,
// one field, nothing for the client to get out of sync.
const MIN_AGE_MS = 3 * 1000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

const sign = (issuedAt: number): string => crypto.createHmac('sha256', env.FORM_TOKEN_SECRET).update(String(issuedAt)).digest('hex');

export const issueFormToken = (): { token: string; issuedAt: number } => {
  const issuedAt = Date.now();
  return { token: `${issuedAt}.${sign(issuedAt)}`, issuedAt };
};

// Always valid when FORM_TOKEN_SECRET is unset (env.ts's own comment) — this
// layer silently no-ops rather than locking out real submitters over a
// missing env var the moment this ships.
export const verifyFormToken = (token: unknown): boolean => {
  if (!env.FORM_TOKEN_SECRET) return true;
  if (typeof token !== 'string') return false;

  const [issuedAtStr, hmac] = token.split('.');
  const issuedAt = Number(issuedAtStr);
  if (!issuedAtStr || !hmac || !Number.isFinite(issuedAt)) return false;

  const expected = sign(issuedAt);
  const expectedBuf = Buffer.from(expected, 'hex');
  const givenBuf = Buffer.from(hmac, 'hex');
  if (expectedBuf.length !== givenBuf.length || !crypto.timingSafeEqual(expectedBuf, givenBuf)) return false;

  const age = Date.now() - issuedAt;
  return age >= MIN_AGE_MS && age <= MAX_AGE_MS;
};
