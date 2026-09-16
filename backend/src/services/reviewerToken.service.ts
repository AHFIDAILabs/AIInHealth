import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ReviewerMagicLinkToken } from '../models/ReviewerMagicLinkToken.model.js';
import { ApiError } from '../utils/ApiError.js';

// Exact mirror of delegateToken.service.ts, scoped to Reviewer instead of Registration.

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

// --- Magic link (single-use, short-lived, hashed at rest) ---

export const issueReviewerMagicLinkToken = async (reviewerId: string): Promise<string> => {
  const raw = crypto.randomBytes(32).toString('hex');
  await ReviewerMagicLinkToken.create({
    reviewer: reviewerId,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + env.REVIEWER_MAGIC_LINK_TTL_MINUTES * 60 * 1000),
  });
  return raw;
};

export const consumeReviewerMagicLinkToken = async (rawToken: string): Promise<string> => {
  const record = await ReviewerMagicLinkToken.findOne({ tokenHash: sha256(rawToken) });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'This sign-in link is invalid or has expired.', 'MAGIC_LINK_INVALID');
  }
  record.usedAt = new Date();
  await record.save();
  return record.reviewer.toString();
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
