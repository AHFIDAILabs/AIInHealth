import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { HydratedDocument } from 'mongoose';
import { env } from '../config/env.js';
import { REVIEWER_ACCESS_CODE_EXPIRES_AT } from '../config/event.js';
import { Reviewer, type ReviewerDoc } from '../models/Reviewer.model.js';
import { ApiError } from '../utils/ApiError.js';

// --- Access code (stable, reusable, hand-typed — replaces the old single-use
// magic-link token) ---

// Excludes visually ambiguous characters (0/O, 1/I) — same alphabet as
// accessCode.controller.ts's generateCode; a reviewer may read/type this by
// hand off an email weeks after receiving it.
const SAFE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomCode = (): string =>
  `RV-${Array.from({ length: 6 }, () => SAFE_ALPHABET[crypto.randomInt(SAFE_ALPHABET.length)]).join('')}`;

// Generates a reviewer's access code once and reuses it forever after — every
// future assignment email or resend request hands back the SAME code, so a
// reviewer who's already noted theirs down never has it invalidated out from
// under them. Every reviewer's code expires at the same fixed cutoff
// (REVIEWER_ACCESS_CODE_EXPIRES_AT, a week after the Summit), not on a
// rolling per-issue timer.
export const ensureReviewerAccessCode = async (reviewer: HydratedDocument<ReviewerDoc>): Promise<string> => {
  if (reviewer.accessCode) return reviewer.accessCode;
  let code = randomCode();
  // Collision odds at this alphabet/length are astronomically low, but check anyway.
  // eslint-disable-next-line no-await-in-loop
  while (await Reviewer.exists({ accessCode: code })) code = randomCode();
  reviewer.accessCode = code;
  reviewer.accessCodeExpiresAt = REVIEWER_ACCESS_CODE_EXPIRES_AT;
  await reviewer.save();
  return code;
};

export const verifyReviewerAccessCode = async (email: string, code: string): Promise<string> => {
  const reviewer = await Reviewer.findOne({ email: email.trim().toLowerCase(), isActive: true });
  const normalizedCode = code.trim().toUpperCase();
  if (!reviewer || !reviewer.accessCode || reviewer.accessCode !== normalizedCode) {
    throw new ApiError(400, 'That email/access code combination is invalid.', 'ACCESS_CODE_INVALID');
  }
  if (!reviewer.accessCodeExpiresAt || reviewer.accessCodeExpiresAt < new Date()) {
    throw new ApiError(400, 'This access code has expired.', 'ACCESS_CODE_EXPIRED');
  }
  return reviewer.id;
};

// --- Session token (long-lived JWT cookie, no rotation) ---

export interface ReviewerSessionPayload {
  reviewerId: string;
}

export const signReviewerSessionToken = (reviewerId: string): string =>
  jwt.sign({ reviewerId } satisfies ReviewerSessionPayload, env.REVIEWER_TOKEN_SECRET, {
    expiresIn: `${env.REVIEWER_SESSION_TTL_DAYS}d`,
  });

export const verifyReviewerSessionToken = (token: string): ReviewerSessionPayload => {
  try {
    return jwt.verify(token, env.REVIEWER_TOKEN_SECRET) as ReviewerSessionPayload;
  } catch {
    throw new ApiError(401, 'Your reviewer session has expired. Please sign in again.', 'INVALID_REVIEWER_TOKEN');
  }
};
