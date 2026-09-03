import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration } from '../models/Registration.model.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import * as paystack from '../services/paystack.service.js';
import { nairaToKobo, priceForRegistration, isFreeTicketCategory } from '../config/pricing.js';
import { generateQrToken } from '../services/qr.service.js';
import { emitAdminNotification } from '../services/notification.service.js';
import { sendPaymentConfirmationEmail } from '../services/email.service.js';
import type { InitializePaymentInput } from '../validations/payment.validation.js';
import type { TicketCategory } from '../types/enums.js';

// A retried "Pay Now" click (double-click, a network timeout the client retries)
// shouldn't open a second Paystack transaction for the same seat — Paystack has no
// idempotency-key support on initialize, so this is enforced here by reusing a
// still-open transaction within a short window instead of minting a new one.
const PENDING_PAYMENT_REUSE_WINDOW_MS = 30 * 60 * 1000;

export const initialize = catchAsync(async (req: Request, res: Response) => {
  const { registrationId } = req.body as InitializePaymentInput;
  const registration = await Registration.findById(registrationId);

  if (!registration || registration.type !== 'attendee' || !registration.ticketCategory) {
    throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  }
  if (isFreeTicketCategory(registration.ticketCategory as TicketCategory)) {
    throw new ApiError(400, 'This ticket category does not require payment.', 'PAYMENT_NOT_REQUIRED');
  }
  if (registration.paymentStatus === 'paid') {
    throw new ApiError(400, 'This registration has already been paid for.', 'ALREADY_PAID');
  }

  const hasFreshPendingTransaction =
    registration.paymentReference &&
    registration.paymentAuthorizationUrl &&
    registration.paymentInitializedAt &&
    Date.now() - registration.paymentInitializedAt.getTime() < PENDING_PAYMENT_REUSE_WINDOW_MS;

  if (hasFreshPendingTransaction) {
    res.status(200).json(new ApiResponse({ authorizationUrl: registration.paymentAuthorizationUrl, reference: registration.paymentReference }));
    return;
  }

  const attendeeCount = 1 + (registration.groupAttendees?.length ?? 0);
  const amountNaira = priceForRegistration(registration.ticketCategory as TicketCategory, attendeeCount);
  const amountKobo = nairaToKobo(amountNaira);
  const reference = `AIHS-${registration.id}-${crypto.randomBytes(4).toString('hex')}`;

  const { authorizationUrl } = await paystack.initializeTransaction({
    email: registration.email!,
    amountKobo,
    reference,
    callbackUrl: `${env.FRONTEND_ORIGIN}/register/payment-callback`,
    metadata: { registrationId: registration.id, ticketCategory: registration.ticketCategory },
  });

  registration.paymentReference = reference;
  registration.paymentAuthorizationUrl = authorizationUrl;
  registration.paymentInitializedAt = new Date();
  registration.amountKobo = amountKobo;
  await registration.save();

  res.status(201).json(new ApiResponse({ authorizationUrl, reference }));
});

// Shared by both the frontend's post-redirect verify call and the webhook — always
// re-verifies against Paystack directly rather than trusting either caller's data,
// and is safe to run twice for the same reference (already-paid short-circuits).
export const confirmPaymentByReference = async (reference: string): Promise<void> => {
  const registration = await Registration.findOne({ paymentReference: reference });
  if (!registration) {
    logger.warn({ reference }, 'Payment confirmation for unknown reference');
    return;
  }
  if (registration.paymentStatus === 'paid') return;

  const result = await paystack.verifyTransaction(reference);

  if (result.status !== 'success') {
    registration.paymentStatus = 'failed';
    await registration.save();
    return;
  }

  registration.paymentStatus = 'paid';
  registration.status = 'confirmed';
  registration.paidAt = result.paidAt ? new Date(result.paidAt) : new Date();
  if (!registration.qrToken) registration.qrToken = generateQrToken();
  await registration.save();

  await emitAdminNotification({
    type: 'registration.new',
    title: 'Payment confirmed',
    body: `${registration.fullName} — ${registration.ticketCategory}`,
    resourceType: 'Registration',
    resourceId: registration.id,
  });

  if (registration.email) {
    sendPaymentConfirmationEmail(registration.email, registration.fullName ?? 'there', {
      amountNaira: Math.round((registration.amountKobo ?? 0) / 100),
      ticketCategory: registration.ticketCategory ?? '',
      portalUrl: `${env.FRONTEND_ORIGIN}/portal/login`,
    }).catch((err) => logger.error({ err }, 'sendPaymentConfirmationEmail failed'));
  }
};

export const verify = catchAsync(async (req: Request, res: Response) => {
  const { reference } = req.params;
  await confirmPaymentByReference(reference);

  const registration = await Registration.findOne({ paymentReference: reference }).select(
    'fullName ticketCategory paymentStatus status amountKobo'
  );
  if (!registration) throw new ApiError(404, 'Payment reference not found', 'NOT_FOUND');

  res.json(
    new ApiResponse({
      paymentStatus: registration.paymentStatus,
      status: registration.status,
      fullName: registration.fullName,
      ticketCategory: registration.ticketCategory,
      amountNaira: Math.round((registration.amountKobo ?? 0) / 100),
    })
  );
});

// Paystack webhook — not behind requireAuth (Paystack's servers call this directly),
// authenticated instead by the HMAC signature over the raw body.
export const webhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string | undefined;
  if (!req.rawBody || !paystack.isValidWebhookSignature(req.rawBody, signature)) {
    throw new ApiError(401, 'Invalid webhook signature', 'INVALID_SIGNATURE');
  }

  // Ack immediately — Paystack retries on non-2xx/timeout, and our own re-verify
  // step means processing this a little late (or twice) is harmless.
  res.status(200).json({ received: true });

  const event = req.body as { event?: string; data?: { reference?: string } };
  if (event.event === 'charge.success' && event.data?.reference) {
    confirmPaymentByReference(event.data.reference).catch((err) =>
      logger.error({ err, reference: event.data?.reference }, 'Webhook payment confirmation failed')
    );
  }
});
