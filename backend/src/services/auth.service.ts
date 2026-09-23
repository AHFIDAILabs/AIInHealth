import argon2 from 'argon2';
import { User } from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import {
  consumePasswordResetToken,
  issuePasswordResetToken,
  issueRefreshToken,
  signAccessToken,
} from './token.service.js';
import { sendPasswordResetEmail } from './email.service.js';
import { recordSecurityEvent } from './securityEvent.service.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { Role } from '../types/enums.js';

interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

export const login = async (email: string, password: string, meta: RequestMeta, rememberMe = false) => {
  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  // Same generic error whether the email doesn't exist or the password is wrong —
  // never let a login form confirm which admin emails exist.
  const invalidCredentials = () => new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

  if (!user || !user.isActive) {
    void recordSecurityEvent({
      type: 'auth.login_failed',
      severity: 'medium',
      ip: meta.ip,
      userAgent: meta.userAgent,
      email: normalizedEmail,
    });
    throw invalidCredentials();
  }

  const passwordOk = await argon2.verify(user.passwordHash, password);
  if (!passwordOk) {
    void recordSecurityEvent({
      type: 'auth.login_failed',
      severity: 'medium',
      ip: meta.ip,
      userAgent: meta.userAgent,
      userId: user.id,
      email: normalizedEmail,
    });
    throw invalidCredentials();
  }

  void recordSecurityEvent({
    type: 'auth.login_succeeded',
    severity: 'low',
    ip: meta.ip,
    userAgent: meta.userAgent,
    userId: user.id,
    email: normalizedEmail,
  });

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken({ sub: user.id, role: user.role as Role });
  const refreshToken = await issueRefreshToken(user.id, meta, rememberMe);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isRootAdmin: user.isRootAdmin,
    },
  };
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  // Always behave the same way regardless of whether the account exists —
  // prevents using this endpoint to enumerate admin email addresses.
  if (!user) return;

  const rawToken = await issuePasswordResetToken(user.id);
  const resetUrl = `${env.FRONTEND_ORIGIN}/admin/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    // Never let an email-provider outage change this endpoint's response — that would
    // leak account existence via timing/error behavior. Log loudly for someone to notice
    // and fix Graph/mailbox config; the client still gets the generic success message.
    logger.error({ err, userId: user.id }, 'Failed to send password reset email');
  }
};

export const resetPassword = async (rawToken: string, newPassword: string): Promise<void> => {
  const userId = await consumePasswordResetToken(rawToken);
  const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await User.findByIdAndUpdate(userId, { passwordHash });
};

// Authenticated self-service change — distinct from the reset-token flow above,
// which is for a signed-out user who's lost their password. This one requires
// proving you already know it.
export const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');

  const currentOk = await argon2.verify(user.passwordHash, currentPassword);
  if (!currentOk) throw new ApiError(401, 'Current password is incorrect', 'INVALID_CURRENT_PASSWORD');

  user.passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await user.save();
};
