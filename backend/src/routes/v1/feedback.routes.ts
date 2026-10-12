import { Router } from 'express';
import * as feedbackController from '../../controllers/feedback.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { feedbackLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { createFeedbackSchema } from '../../validations/feedback.validation.js';

const router = Router();

router.post('/', feedbackLimiter, validate(createFeedbackSchema), feedbackController.create);

export default router;
