import { Router } from 'express';
import * as masterclassController from '../../controllers/masterclass.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { rsvpRedeemLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { masterclassRsvpParamsSchema } from '../../validations/masterclass.validation.js';

const router = Router();

// Public, one-click — same rsvpRedeemLimiter as registration.routes.ts's
// generic /registrations/rsvp/:token (IP-keyed, 30/15min, no email collected
// here either).
router.post('/rsvp/:token', rsvpRedeemLimiter, validate(masterclassRsvpParamsSchema), masterclassController.rsvp);

export default router;
