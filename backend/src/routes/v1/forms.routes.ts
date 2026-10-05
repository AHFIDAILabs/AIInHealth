import { Router } from 'express';
import * as formsController from '../../controllers/forms.controller.js';
import { formTokenLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

router.get('/token', formTokenLimiter, formsController.getToken);

export default router;
