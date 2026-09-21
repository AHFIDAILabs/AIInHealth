import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { catchAsync } from '../utils/catchAsync.js';

// Deliberately a fresh DB read on every call rather than trusting a claim
// baked into the access token — this gate gets checked far less often than
// requireRole (only Security Command Center routes) and the extra query buys
// an important property: a root admin demoted mid-session (isRootAdmin
// flipped false — not exposed via any API today, but this is the one place
// in the app where "can't happen yet" isn't good enough to rely on) loses
// access on their very next request instead of whenever their 15-minute
// access token happens to expire.
export const requireRootAdmin = catchAsync(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    next(new ApiError(401, 'Authentication required', 'UNAUTHENTICATED'));
    return;
  }
  const user = await User.findById(req.user.sub).select('isRootAdmin isActive');
  if (!user || !user.isActive || !user.isRootAdmin) {
    next(new ApiError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
    return;
  }
  next();
});
