import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies.js';
import * as authService from '../services/auth.service.js';
import { rotateRefreshToken, revokeRefreshToken, signAccessToken } from '../services/token.service.js';
import { User } from '../models/User.model.js';
import type {
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  UpdateProfileInput,
  UpdateNotificationPrefsInput,
} from '../validations/auth.validation.js';
import { recordAudit } from '../services/audit.service.js';

const requestMeta = (req: Request) => ({ userAgent: req.headers['user-agent'], ip: req.ip });

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;
  const { accessToken, refreshToken, user } = await authService.login(email, password, requestMeta(req));
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json(new ApiResponse({ user }));
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.refresh_token as string | undefined;
  if (!rawToken) throw new ApiError(401, 'No active session', 'NO_REFRESH_TOKEN');

  const { userId, newRawToken } = await rotateRefreshToken(rawToken, requestMeta(req));
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw new ApiError(401, 'Account no longer active', 'ACCOUNT_INACTIVE');

  const accessToken = signAccessToken({ sub: user.id, role: user.role as never });
  setAuthCookies(res, accessToken, newRawToken);
  res.status(200).json(new ApiResponse({ ok: true }));
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.refresh_token as string | undefined;
  if (rawToken) await revokeRefreshToken(rawToken);
  clearAuthCookies(res);
  res.status(200).json(new ApiResponse({ ok: true }));
});

export const me = catchAsync(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.sub);
  if (!user) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  res.status(200).json(
    new ApiResponse({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      notificationPrefs: user.notificationPrefs,
      isRootAdmin: user.isRootAdmin,
    })
  );
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body as ForgotPasswordInput;
  await authService.requestPasswordReset(email);
  // Idempotent + enumeration-safe: identical response whether or not the account exists.
  res.status(200).json(new ApiResponse({ message: 'If that email is registered, a reset link has been sent.' }));
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as ResetPasswordInput;
  await authService.resetPassword(token, newPassword);
  res.status(200).json(new ApiResponse({ message: 'Password updated. You can now sign in.' }));
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;
  await authService.changePassword(req.user!.sub, currentPassword, newPassword);
  await recordAudit({ req, action: 'user.password_changed', resourceType: 'User', resourceId: req.user!.sub });
  res.status(200).json(new ApiResponse({ message: 'Password updated.' }));
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as UpdateProfileInput;
  const user = await User.findByIdAndUpdate(req.user!.sub, input, { new: true });
  if (!user) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  res.status(200).json(new ApiResponse({ id: user.id, fullName: user.fullName, email: user.email, role: user.role, avatarUrl: user.avatarUrl }));
});

export const updateNotificationPrefs = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as UpdateNotificationPrefsInput;
  const user = await User.findByIdAndUpdate(
    req.user!.sub,
    {
      ...(input.emailDigest !== undefined && { 'notificationPrefs.emailDigest': input.emailDigest }),
      ...(input.pushEnabled !== undefined && { 'notificationPrefs.pushEnabled': input.pushEnabled }),
      ...(input.events !== undefined && { 'notificationPrefs.events': input.events }),
    },
    { new: true }
  );
  if (!user) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  res.status(200).json(new ApiResponse(user.notificationPrefs));
});
