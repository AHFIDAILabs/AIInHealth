import type { NextFunction, Request, Response } from 'express';
import { verifyReportSessionToken } from '../services/reportAccess.service.js';
import { ApiError } from '../utils/ApiError.js';

export const requireReportAccess = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.report_token as string | undefined;
  if (!token) {
    next(new ApiError(401, 'Verify your email to download reports.', 'UNAUTHENTICATED'));
    return;
  }
  const { reportAccessId } = verifyReportSessionToken(token);
  req.reportAccess = { reportAccessId };
  next();
};
