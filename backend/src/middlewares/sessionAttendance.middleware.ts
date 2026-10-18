import type { NextFunction, Request, Response } from 'express';
import { SessionAttendanceToken } from '../models/SessionAttendanceToken.model.js';
import { ApiError } from '../utils/ApiError.js';

// Same shape as rapporteur.middleware.ts's requireRapporteurToken — async DB
// lookup (the raw token in the URL IS the credential, no signed session
// token), revoked/expiresAt checked fresh on every request so an admin's
// revoke takes effect on the volunteer's very next scan, not just future
// sign-ins.
export const requireSessionAttendanceToken = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const token = req.params.token;
  if (!token) {
    next(new ApiError(404, 'Invalid attendance link.', 'NOT_FOUND'));
    return;
  }
  try {
    const record = await SessionAttendanceToken.findOne({ token });
    if (!record) {
      next(new ApiError(404, 'Invalid attendance link.', 'NOT_FOUND'));
      return;
    }
    if (record.revoked) {
      next(new ApiError(403, 'This attendance link has been revoked.', 'TOKEN_REVOKED'));
      return;
    }
    if (record.expiresAt.getTime() < Date.now()) {
      next(new ApiError(403, 'This attendance link has expired.', 'TOKEN_EXPIRED'));
      return;
    }

    record.lastUsedAt = new Date();
    await record.save();

    req.sessionAttendance = {
      tokenId: record.id,
      sessionId: record.session.toString(),
      volunteerName: record.volunteerName,
    };
    next();
  } catch (err) {
    next(err);
  }
};
