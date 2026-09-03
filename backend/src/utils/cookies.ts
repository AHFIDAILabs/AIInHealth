import type { Response } from 'express';
import { env, isProd } from '../config/env.js';

// Browsers require Secure whenever SameSite=None is used — force it regardless of
// isProd so a 'none' deployment can't end up with a cookie the browser just drops.
const baseCookieOptions = {
  httpOnly: true,
  secure: isProd || env.COOKIE_SAME_SITE === 'none',
  sameSite: env.COOKIE_SAME_SITE,
  domain: env.COOKIE_DOMAIN,
  path: '/',
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie('access_token', accessToken, { ...baseCookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, {
    ...baseCookieOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth', // only sent back to auth routes, minimizes exposure
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('access_token', baseCookieOptions);
  res.clearCookie('refresh_token', { ...baseCookieOptions, path: '/api/v1/auth' });
};

// Delegate portal — a separate cookie namespace from the admin tokens above, scoped
// to /api/v1/delegate so it's never sent to (or confused with) admin routes.
const delegateCookieOptions = { ...baseCookieOptions, path: '/api/v1/delegate' };

export const setDelegateCookie = (res: Response, token: string, maxAgeMs: number): void => {
  res.cookie('delegate_token', token, { ...delegateCookieOptions, maxAge: maxAgeMs });
};

export const clearDelegateCookie = (res: Response): void => {
  res.clearCookie('delegate_token', delegateCookieOptions);
};
