import { Router } from 'express';
import * as promoController from '../../controllers/promo.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { promoTokenLimiter, promoClaimLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { claimPromoCodeSchema } from '../../validations/promo.validation.js';

const router = Router();

router.get('/status', promoController.status);
router.get('/token', promoTokenLimiter, promoController.issueToken);
router.post('/claim', promoClaimLimiter, validate(claimPromoCodeSchema), promoController.claim);

export default router;
