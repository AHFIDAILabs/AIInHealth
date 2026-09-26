import { Router } from 'express';
import * as aiController from '../../controllers/ai.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { askAiLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { askQuestionSchema } from '../../validations/ai.validation.js';

const router = Router();

router.post('/ask', askAiLimiter, validate(askQuestionSchema), aiController.ask);

export default router;
