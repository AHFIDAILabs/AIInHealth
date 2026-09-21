import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.model.js';
import { PasswordResetToken } from '../models/PasswordResetToken.model.js';
import { ApiError } from '../utils/ApiError.js';
import { recordSecurityEvent } from './securityEvent.service.js';
import type { Role } from '../types/enums.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    // Explicitly pinned rather than left to jsonwebtoken's default inference —
    // a plain-string secret already restricts verify() to HMAC algs, but
    // naming it here means a future switch to a PEM-keyed algorithm can't
    // silently widen what this endpoint accepts.
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
  } catch {
    throw new ApiError(401, 'Invalid or expired session', 'INVALID_ACCESS_TOKEN');
  }
};

const refreshTtlMs = () => env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export const issueRefreshToken = async (
  userId: string,
  meta: { userAgent?: string; ip?: string }
): Promise<string> => {
  const raw = crypto.randomBytes(64).toString('hex');
  await RefreshToken.create({
    user: userId,
    tokenHash: sha256(raw),
    status: 'active',
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt: new Date(Date.now() + refreshTtlMs()),
  });
  return raw; // only moment this is ever in plaintext
};

/**
 * Verifies + rotates a refresh token. A token presented after it's already been
 * rotated-out is treated as a breach signal: every active session for that user
 * is revoked rather than just rejecting the one request.
 */
export const rotateRefreshToken = async (
  rawToken: string,
  meta: { userAgent?: string; ip?: string }
): Promise<{ userId: string; newRawToken: string }> => {
  const tokenHash = sha256(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing || existing.expiresAt < new Date()) {
    throw new ApiError(401, 'Session expired, please log in again', 'REFRESH_INVALID');
  }

  if (existing.status !== 'active') {
    // Reuse of an already-rotated or revoked token — assume compromise.
    await RefreshToken.updateMany({ user: existing.user, status: 'active' }, { status: 'revoked' });
    void recordSecurityEvent({
      type: 'auth.refresh_reuse_detected',
      severity: 'high',
      ip: meta.ip,
      userAgent: meta.userAgent,
      userId: existing.user.toString(),
    });
    throw new ApiError(401, 'Session invalidated, please log in again', 'REFRESH_REUSE_DETECTED');
  }

  existing.status = 'used';
  await existing.save();

  const newRawToken = await issueRefreshToken(existing.user.toString(), meta);
  return { userId: existing.user.toString(), newRawToken };
};

export const revokeRefreshToken = async (rawToken: string): Promise<void> => {
  await RefreshToken.updateOne({ tokenHash: sha256(rawToken) }, { status: 'revoked' });
};

// --- Password reset tokens (single-use, short-lived, hashed at rest) ---

export const issuePasswordResetToken = async (userId: string): Promise<string> => {
  const raw = crypto.randomBytes(32).toString('hex');
  await PasswordResetToken.create({
    user: userId,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + env.RESET_TOKEN_TTL_MINUTES * 60 * 1000),
  });
  return raw;
};

export const consumePasswordResetToken = async (rawToken: string): Promise<string> => {
  const tokenHash = sha256(rawToken);
  const record = await PasswordResetToken.findOne({ tokenHash });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'This reset link is invalid or has expired', 'RESET_TOKEN_INVALID');
  }

  record.usedAt = new Date();
  await record.save();
  return record.user.toString();
};
