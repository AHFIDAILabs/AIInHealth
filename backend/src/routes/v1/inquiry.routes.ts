import { Router } from 'express';
import * as inquiryController from '../../controllers/inquiry.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { inquiryLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { createInquirySchema } from '../../validations/inquiry.validation.js';

const router = Router();

router.post('/partnership', inquiryLimiter, validate(createInquirySchema), inquiryController.create);

export default router;
