import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) {
    next(new ApiError(401, 'Authentication required', 'UNAUTHENTICATED'));
    return;
  }
  req.user = verifyAccessToken(token);
  next();
};
