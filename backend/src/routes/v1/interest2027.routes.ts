import { Router } from 'express';
import * as interest2027Controller from '../../controllers/interest2027.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { interest2027Limiter, interest2027InviteReadLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { submitInterest2027Schema, interest2027InviteParamsSchema } from '../../validations/interest2027.validation.js';

const router = Router();

router.post('/', interest2027Limiter, validate(submitInterest2027Schema), interest2027Controller.submit);
router.get('/invite/:token', interest2027InviteReadLimiter, validate(interest2027InviteParamsSchema), interest2027Controller.inviteInfo);

export default router;
