import { Router } from 'express';
import * as contactController from '../../controllers/contact.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { contactLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { createContactMessageSchema } from '../../validations/contact.validation.js';

const router = Router();

router.post('/', contactLimiter, validate(createContactMessageSchema), contactController.create);

export default router;
