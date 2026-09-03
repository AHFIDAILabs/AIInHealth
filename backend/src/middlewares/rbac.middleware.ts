import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type { Role } from '../types/enums.js';

export const requireRole =
  (...allowed: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required', 'UNAUTHENTICATED'));
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(new ApiError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
      return;
    }
    next();
  };
