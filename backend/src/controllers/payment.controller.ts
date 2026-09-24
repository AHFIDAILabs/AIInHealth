import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration, type RegistrationDoc } from '../models/Registration.model.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import * as paystack from '../services/paystack.service.js';
import { nairaToKobo, priceForRegistration, isFreeTicketCategory } from '../config/pricing.js';
import { generateQrToken } from '../services/qr.service.js';
import { emitAdminNotification } from '../services/notification.service.js';
import { sendConfirmationAndTicketEmails } from '../services/registrationNotification.service.js';
import { sendPaymentPendingIdVerificationEmail } from '../services/email.service.js';
import type { InitializePaymentInput } from '../validations/payment.validation.js';
import { ID_VERIFICATION_TICKET_CATEGORIES, type TicketCategory } from '../types/enums.js';

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

  const { authorizationUrl, reference } = await initializePaymentForRegistration(registration);
  res.status(201).json(new ApiResponse({ authorizationUrl, reference }));
});

// Computes the charge from the registration's own stored ticketCategory/
// discountPercent/group size, opens a Paystack transaction, and persists the
// resulting reference/authorizationUrl/amount on the registration. Shared by the
// public `initialize` handler above (which does its own guard checks — already
// paid, free category, a still-fresh pending transaction to reuse — before
// calling this) and registration.controller.ts's admin-create-registration flow,
// which needs the exact same "turn this registration into a real Paystack
// checkout link" step but with no guards of its own (a freshly admin-created
// registration is never already paid or mid-checkout).
export const initializePaymentForRegistration = async (
  registration: HydratedDocument<RegistrationDoc>
): Promise<{ authorizationUrl: string; reference: string }> => {
  const attendeeCount = 1 + (registration.groupAttendees?.length ?? 0);
  // A 100%-scholarship registration never reaches here — callers mark it
  // 'not_required' at creation and skip payment entirely — so discountPercent
  // below is only ever undefined, 25, or 50.
  const amountNaira = priceForRegistration(registration.ticketCategory as TicketCategory, attendeeCount, registration.discountPercent ?? undefined);
  const amountKobo = nairaToKobo(amountNaira);
  const reference = `AIHS-${registration.id}-${crypto.randomBytes(4).toString('hex')}`;

  const { authorizationUrl } = await paystack.initializeTransaction({
    email: registration.email!,
    amountKobo,
    reference,
    callbackUrl: `${env.FRONTEND_ORIGIN}/register/payment-callback`,
    metadata: { registrationId: registration.id, ticketCategory: registration.ticketCategory },
  });

  // Retire the OLD reference (if any) rather than just discarding it — a payer
  // who still has an older checkout link open (e.g. this call is a bulk
  // reminder minting a fresh one) can still complete THAT payment; Paystack's
  // webhook/redirect will carry the old reference, and confirmPaymentByReference
  // needs to still be able to find this registration by it.
  if (registration.paymentReference && registration.paymentReference !== reference) {
    registration.previousPaymentReferences = [...(registration.previousPaymentReferences ?? []), registration.paymentReference];
  }
  registration.paymentReference = reference;
  registration.paymentAuthorizationUrl = authorizationUrl;
  registration.paymentInitializedAt = new Date();
  registration.amountKobo = amountKobo;
  await registration.save();

  return { authorizationUrl, reference };
};

// Shared by both the frontend's post-redirect verify call and the webhook — always
// re-verifies against Paystack directly rather than trusting either caller's data,
// and is safe to run twice for the same reference (already-paid short-circuits).
//
// allowAmountMismatch: only ever passed true by the admin Reconciliations
// "resync" action (reconciliation.controller.ts) — a human who's already
// looking at the flagged mismatch and deciding to push it through anyway. Every
// automatic path (the frontend's post-redirect verify, the webhook) leaves this
// false, so an amount that doesn't match what we expected never auto-confirms.
export const confirmPaymentByReference = async (reference: string, options: { allowAmountMismatch?: boolean } = {}): Promise<void> => {
  // Matches on the CURRENT reference or any RETIRED one (previousPaymentReferences) —
  // a payer can still complete checkout through an older link after a newer
  // reference was minted (e.g. a bulk payment reminder always opens a fresh
  // transaction); without this, a real successful charge on that older
  // reference would never match any registration at all.
  const registration = await Registration.findOne({ $or: [{ paymentReference: reference }, { previousPaymentReferences: reference }] });
  if (!registration) {
    logger.warn({ reference }, 'Payment confirmation for unknown reference');
    return;
  }
  if (registration.paymentStatus === 'paid') return;

  const result = await paystack.verifyTransaction(reference);

  if (result.status !== 'success') {
    await Registration.updateOne({ _id: registration._id, paymentStatus: { $ne: 'paid' } }, { $set: { paymentStatus: 'failed' } });
    return;
  }

  // Paystack's checkout page amount is generated server-side from what WE sent
  // at initialize, so a legitimate flow never diverges — a mismatch means
  // something is wrong (reference confusion, a stale/reused reference, direct
  // tampering) and must never silently confirm a seat for the wrong price.
  // Surfaced through the existing Reconciliations mismatch flag
  // (reconciliation.controller.ts) for a human to actually look at, instead.
  // Skipped when Paystack isn't configured (local dev/test) — verifyTransaction's
  // dev fallback always reports amountKobo: 0, which isn't a real amount to
  // compare against and would otherwise permanently "mismatch" every dev payment.
  if (
    paystack.paystackConfigured &&
    !options.allowAmountMismatch &&
    registration.amountKobo != null &&
    result.amountKobo !== registration.amountKobo
  ) {
    logger.error(
      { reference, expectedKobo: registration.amountKobo, verifiedKobo: result.amountKobo, registrationId: registration.id },
      'Payment amount mismatch — refusing to auto-confirm; awaiting manual reconciliation'
    );
    await emitAdminNotification({
      type: 'registration.new',
      title: 'Payment amount mismatch — needs review',
      body: `${registration.fullName || registration.email} paid ${result.amountKobo} kobo, expected ${registration.amountKobo} kobo (ref ${reference})`,
      resourceType: 'Registration',
      resourceId: registration.id,
    });
    return;
  }

  // A ticket category in ID_VERIFICATION_TICKET_CATEGORIES (student_researcher —
  // the only one of the three that's actually PAID, hence reaching Paystack at
  // all) never auto-confirms on payment alone, even a successful one — an
  // admin still has to check the uploaded ID first. Paying just moves it from
  // "unpaid" to "paid, awaiting review" (status stays 'pending'), not straight
  // to a confirmed seat with a live QR ticket.
  const requiresIdReview = ID_VERIFICATION_TICKET_CATEGORIES.includes(registration.ticketCategory as (typeof ID_VERIFICATION_TICKET_CATEGORIES)[number]);

  // Atomic, filtered on paymentStatus not already 'paid': the frontend's
  // post-redirect verify call and Paystack's webhook call legitimately race for
  // the same reference (both can arrive within milliseconds of a real checkout).
  // Only the call that actually wins this update proceeds to notify/email below,
  // so the race can't double-send the confirmation + ticket emails.
  const updated = await Registration.findOneAndUpdate(
    { _id: registration._id, paymentStatus: { $ne: 'paid' } },
    {
      $set: {
        paymentStatus: 'paid',
        ...(requiresIdReview ? {} : { status: 'confirmed' }),
        paidAt: result.paidAt ? new Date(result.paidAt) : new Date(),
        ...(!requiresIdReview && !registration.qrToken && { qrToken: generateQrToken() }),
      },
    },
    { new: true }
  );
  if (!updated) return;

  await emitAdminNotification({
    type: 'registration.new',
    title: requiresIdReview ? 'Payment received — ID verification needed' : 'Payment confirmed',
    body: `${updated.fullName} — ${updated.ticketCategory}`,
    resourceType: 'Registration',
    resourceId: updated.id,
  });

  if (requiresIdReview) {
    void sendPaymentPendingIdVerificationEmail(updated.email!, updated.fullName || 'there', {
      amountNaira: Math.round((updated.amountKobo ?? 0) / 100),
      ticketCategory: updated.ticketCategory ?? '',
    });
  } else {
    void sendConfirmationAndTicketEmails(updated, { amountNaira: Math.round((updated.amountKobo ?? 0) / 100) });
  }
};

export const verify = catchAsync(async (req: Request, res: Response) => {
  const { reference } = req.params;
  await confirmPaymentByReference(reference);

  // Same $or as confirmPaymentByReference itself — this reference may since have
  // been retired to previousPaymentReferences by a later initialize() call, in
  // which case it no longer matches the registration's current paymentReference.
  const registration = await Registration.findOne({
    $or: [{ paymentReference: reference }, { previousPaymentReferences: reference }],
  }).select('fullName ticketCategory paymentStatus status amountKobo');
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

// GET /admin/payments-stats — the Payments page's stat cards. Computed
// server-side across every matching attendee registration, not just the
// current page — the page's own `items` array is paginated/filtered and
// would silently under-count once there's more than one page of results
// (same reasoning as attendee.controller.ts's adminStats, which this mirrors).
export const adminStats = catchAsync(async (_req: Request, res: Response) => {
  const [paidCount, unpaidCount, failedCount, collectedAgg] = await Promise.all([
    Registration.countDocuments({ type: 'attendee', paymentStatus: 'paid' }),
    Registration.countDocuments({ type: 'attendee', paymentStatus: 'unpaid' }),
    Registration.countDocuments({ type: 'attendee', paymentStatus: 'failed' }),
    Registration.aggregate<{ total: number }>([
      { $match: { type: 'attendee', paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amountKobo' } } },
    ]),
  ]);

  res.json(
    new ApiResponse({
      collectedNaira: Math.round((collectedAgg[0]?.total ?? 0) / 100),
      paidCount,
      unpaidCount,
      failedCount,
    })
  );
});
