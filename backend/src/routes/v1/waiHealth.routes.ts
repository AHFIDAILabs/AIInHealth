import { Router } from 'express';
import * as waiHealthController from '../../controllers/waiHealth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { waiHealthLimiter, apiLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { createWaiHealthRegistrationSchema, linkWaiHealthRegistrationSchema } from '../../validations/waiHealth.validation.js';

const router = Router();

// Public — polled by the Breakfast page before/while the form is filled out.
// apiLimiter's blanket net is enough here (read-only, no email to key on).
router.get('/status', apiLimiter, waiHealthController.status);

router.post('/register', waiHealthLimiter, validate(createWaiHealthRegistrationSchema), waiHealthController.register);

// Called right after the frontend's separate submitRegistration() call
// succeeds — see WaiHealthRegistration.model.ts's header comment.
router.post(
  '/register/:id/link-registration',
  waiHealthLimiter,
  validate(linkWaiHealthRegistrationSchema),
  waiHealthController.linkRegistration
);

export default router;
