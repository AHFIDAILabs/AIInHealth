import type { NextFunction, Request, Response } from 'express';
import { verifyDelegateSessionToken } from '../services/delegateToken.service.js';
import { Registration } from '../models/Registration.model.js';
import { ApiError } from '../utils/ApiError.js';

// A valid JWT alone isn't enough — the token can outlive
// `env.DELEGATE_SESSION_TTL_DAYS` (default 45 days) past whatever happened to
// the registration since sign-in. Without this, an admin "Deactivate" (whose
// own confirmation dialog promises it blocks portal access — see
// AttendeesPage.tsx) would only stop a NEW sign-in, while anyone already
// signed in keeps full portal access — including their live QR ticket —
// until the token naturally expires.
export const requireDelegateAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const token = req.cookies?.delegate_token as string | undefined;
  if (!token) {
    next(new ApiError(401, 'Please sign in to the delegate portal.', 'UNAUTHENTICATED'));
    return;
  }
  try {
    const { registrationId } = verifyDelegateSessionToken(token);
    const registration = await Registration.findById(registrationId).select('isActive').lean();
    if (!registration || !registration.isActive) {
      next(new ApiError(401, 'Your portal access has been deactivated. Contact the organizing team.', 'UNAUTHENTICATED'));
      return;
    }
    req.delegate = { registrationId };
    next();
  } catch (err) {
    next(err);
  }
};
