import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { HydratedDocument } from 'mongoose';
import { env } from '../config/env.js';
import { DELEGATE_ACCESS_CODE_EXPIRES_AT } from '../config/event.js';
import { Registration, type RegistrationDoc } from '../models/Registration.model.js';
import { ApiError } from '../utils/ApiError.js';

// --- Access code (stable, reusable, hand-typed — replaces the old single-use
// magic-link token) ---

// Excludes visually ambiguous characters (0/O, 1/I) — same alphabet as
// accessCode.controller.ts's generateCode and reviewerToken.service.ts's
// reviewer codes; a delegate may read/type this by hand off an email weeks
// after receiving it.
const SAFE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomCode = (): string =>
  `DL-${Array.from({ length: 6 }, () => SAFE_ALPHABET[crypto.randomInt(SAFE_ALPHABET.length)]).join('')}`;

// Generates a delegate's portal access code once and reuses it forever after
// — every future confirmation email or resend request hands back the SAME
// code. Every registration's code expires at the same fixed cutoff
// (DELEGATE_ACCESS_CODE_EXPIRES_AT, a week after the Summit), not on a
// rolling per-issue timer.
export const ensureDelegateAccessCode = async (registration: HydratedDocument<RegistrationDoc>): Promise<string> => {
  if (registration.portalAccessCode) return registration.portalAccessCode;
  let code = randomCode();
  // Collision odds at this alphabet/length are astronomically low, but check anyway.
  // eslint-disable-next-line no-await-in-loop
  while (await Registration.exists({ portalAccessCode: code })) code = randomCode();
  registration.portalAccessCode = code;
  registration.portalAccessCodeExpiresAt = DELEGATE_ACCESS_CODE_EXPIRES_AT;
  await registration.save();
  return code;
};

export const verifyDelegateAccessCode = async (email: string, code: string): Promise<string> => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim().toUpperCase();
  const registration = await Registration.findOne({
    status: 'confirmed',
    isActive: true,
    $or: [{ email: normalizedEmail }, { contactEmail: normalizedEmail }],
  }).sort({ createdAt: -1 });

  if (!registration || !registration.portalAccessCode || registration.portalAccessCode !== normalizedCode) {
    throw new ApiError(400, 'That email/access code combination is invalid.', 'ACCESS_CODE_INVALID');
  }
  if (!registration.portalAccessCodeExpiresAt || registration.portalAccessCodeExpiresAt < new Date()) {
    throw new ApiError(400, 'This access code has expired.', 'ACCESS_CODE_EXPIRED');
  }
  return registration.id;
};

// --- Session token (long-lived JWT cookie, no rotation — low-stakes, short event window) ---

export interface DelegateSessionPayload {
  registrationId: string;
}

export const signDelegateSessionToken = (registrationId: string): string =>
  jwt.sign({ registrationId } satisfies DelegateSessionPayload, env.DELEGATE_TOKEN_SECRET, {
    expiresIn: `${env.DELEGATE_SESSION_TTL_DAYS}d`,
  });

export const verifyDelegateSessionToken = (token: string): DelegateSessionPayload => {
  try {
    return jwt.verify(token, env.DELEGATE_TOKEN_SECRET) as DelegateSessionPayload;
  } catch {
    throw new ApiError(401, 'Your portal session has expired. Please sign in again.', 'INVALID_DELEGATE_TOKEN');
  }
};
