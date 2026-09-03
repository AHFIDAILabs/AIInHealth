import { Router } from 'express';
import * as paymentController from '../../controllers/payment.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { paymentLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { initializePaymentSchema } from '../../validations/payment.validation.js';

const router = Router();

router.post('/initialize', paymentLimiter, validate(initializePaymentSchema), paymentController.initialize);
router.get('/verify/:reference', paymentLimiter, paymentController.verify);
// Paystack's own webhook — no rate limiter (would risk dropping legitimate delivery
// retries); it's protected by HMAC signature verification instead, not request volume.
router.post('/webhook', paymentController.webhook);

export default router;
