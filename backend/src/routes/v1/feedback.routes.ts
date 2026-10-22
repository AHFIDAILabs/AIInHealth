import { Router } from 'express';
import * as feedbackController from '../../controllers/feedback.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { feedbackLimiter, feedbackInviteReadLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { createFeedbackSchema, feedbackInviteParamsSchema } from '../../validations/feedback.validation.js';

const router = Router();

router.post('/', feedbackLimiter, validate(createFeedbackSchema), feedbackController.create);
router.get('/invite/:token', feedbackInviteReadLimiter, validate(feedbackInviteParamsSchema), feedbackController.inviteInfo);

export default router;
