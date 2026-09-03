import { Router } from 'express';
import * as paymentController from '../../controllers/payment.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { initializePaymentSchema } from '../../validations/payment.validation.js';

const router = Router();

router.post('/initialize', validate(initializePaymentSchema), paymentController.initialize);
router.get('/verify/:reference', paymentController.verify);
router.post('/webhook', paymentController.webhook);

export default router;
