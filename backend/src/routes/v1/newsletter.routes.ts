import { Router } from 'express';
import * as newsletterController from '../../controllers/newsletter.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { contactLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { subscribeNewsletterSchema } from '../../validations/newsletter.validation.js';

const router = Router();

router.post('/subscribe', contactLimiter, validate(subscribeNewsletterSchema), newsletterController.subscribe);

export default router;
