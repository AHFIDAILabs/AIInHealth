import type { NextFunction, Request, Response } from 'express';
import { verifyReviewerSessionToken } from '../services/reviewerToken.service.js';
import { ApiError } from '../utils/ApiError.js';

export const requireReviewerAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.reviewer_token as string | undefined;
  if (!token) {
    next(new ApiError(401, 'Please sign in to the reviewer portal.', 'UNAUTHENTICATED'));
    return;
  }
  const { reviewerId } = verifyReviewerSessionToken(token);
  req.reviewer = { reviewerId };
  next();
};
