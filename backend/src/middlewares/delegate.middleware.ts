import type { NextFunction, Request, Response } from 'express';
import { verifyDelegateSessionToken } from '../services/delegateToken.service.js';
import { ApiError } from '../utils/ApiError.js';

export const requireDelegateAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.delegate_token as string | undefined;
  if (!token) {
    next(new ApiError(401, 'Please sign in to the delegate portal.', 'UNAUTHENTICATED'));
    return;
  }
  const { registrationId } = verifyDelegateSessionToken(token);
  req.delegate = { registrationId };
  next();
};
