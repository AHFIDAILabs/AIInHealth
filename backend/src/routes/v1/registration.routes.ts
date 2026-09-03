import { Router } from 'express';
import * as registrationController from '../../controllers/registration.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { registrationLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { createRegistrationSchema } from '../../validations/registration.validation.js';

const router = Router();

router.post('/', registrationLimiter, validate(createRegistrationSchema), registrationController.create);

export default router;
