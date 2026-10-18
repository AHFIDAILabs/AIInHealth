import { Router } from 'express';
import * as livestreamSettingsController from '../../controllers/livestreamSettings.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { livestreamAccessLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { requestLivestreamAccessSchema } from '../../validations/livestreamSettings.validation.js';

const router = Router();

router.get('/status', livestreamSettingsController.status);
router.post(
  '/access',
  livestreamAccessLimiter,
  validate(requestLivestreamAccessSchema),
  livestreamSettingsController.requestAccess
);

export default router;
