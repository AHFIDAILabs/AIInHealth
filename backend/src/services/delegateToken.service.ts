import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { DelegateMagicLinkToken } from '../models/DelegateMagicLinkToken.model.js';
import { ApiError } from '../utils/ApiError.js';

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

// --- Magic link (single-use, short-lived, hashed at rest — mirrors token.service.ts's password reset tokens) ---

export const issueMagicLinkToken = async (registrationId: string): Promise<string> => {
  const raw = crypto.randomBytes(32).toString('hex');
  await DelegateMagicLinkToken.create({
    registration: registrationId,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + env.DELEGATE_MAGIC_LINK_TTL_MINUTES * 60 * 1000),
  });
  return raw;
};

export const consumeMagicLinkToken = async (rawToken: string): Promise<string> => {
  const record = await DelegateMagicLinkToken.findOne({ tokenHash: sha256(rawToken) });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'This sign-in link is invalid or has expired.', 'MAGIC_LINK_INVALID');
  }
  record.usedAt = new Date();
  await record.save();
  return record.registration.toString();
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
