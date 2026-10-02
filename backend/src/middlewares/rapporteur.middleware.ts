import type { NextFunction, Request, Response } from 'express';
import { RapporteurAccessToken } from '../models/RapporteurAccessToken.model.js';
import { ApiError } from '../utils/ApiError.js';

// Async, not reviewer.middleware.ts's sync JWT-only check — this needs a DB
// lookup (there's no signed session token, the raw token in the URL IS the
// credential). revoked/expiresAt are checked fresh on every request, so an
// admin's Revoke or a token past RAPPORTEUR_TOKEN_EXPIRES_AT takes effect on
// the rapporteur's very next call, not just future sign-ins.
export const requireRapporteurToken = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const token = req.params.token;
  if (!token) {
    next(new ApiError(404, 'Invalid rapporteur link.', 'NOT_FOUND'));
    return;
  }
  try {
    const record = await RapporteurAccessToken.findOne({ token });
    if (!record) {
      next(new ApiError(404, 'Invalid rapporteur link.', 'NOT_FOUND'));
      return;
    }
    if (record.revoked) {
      next(new ApiError(403, 'This rapporteur link has been revoked.', 'TOKEN_REVOKED'));
      return;
    }
    if (record.expiresAt.getTime() < Date.now()) {
      next(new ApiError(403, 'This rapporteur link has expired.', 'TOKEN_EXPIRED'));
      return;
    }

    record.lastUsedAt = new Date();
    await record.save();

    req.rapporteur = {
      tokenId: record.id,
      sessionId: record.session.toString(),
      reportId: record.report.toString(),
    };
    next();
  } catch (err) {
    next(err);
  }
};
