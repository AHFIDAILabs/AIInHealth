import { Router } from 'express';
import * as abstractController from '../../controllers/abstract.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { abstractLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { createAbstractSchema } from '../../validations/abstract.validation.js';

const router = Router();

router.post('/', abstractLimiter, validate(createAbstractSchema), abstractController.create);

export default router;
