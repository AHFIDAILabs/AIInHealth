import { Router } from 'express';
import * as whatsappController from '../../controllers/whatsapp.controller.js';

const router = Router();

// Public, no requireAuth, no rate limiter — Twilio retries undelivered
// webhooks, same reasoning as the Paystack webhook never having one.
// Signature verification (twilio.service.ts) is the real gate here.
router.post('/webhook', whatsappController.webhook);

export default router;
