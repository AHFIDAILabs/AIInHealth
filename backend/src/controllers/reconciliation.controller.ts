import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration } from '../models/Registration.model.js';
import * as paystack from '../services/paystack.service.js';
import { confirmPaymentByReference } from './payment.controller.js';

// GET /admin/reconciliations — cross-checks recent Paystack transactions for this
// event (reference prefix AIHS-) against our own payment records, flagging anything
// Paystack says succeeded that we don't yet show as paid (a missed/late webhook)
// or where the amounts disagree.
export const list = catchAsync(async (_req: Request, res: Response) => {
  if (!paystack.paystackConfigured) {
    res.json(new ApiResponse({ configured: false, rows: [] }));
    return;
  }

  const transactions = (await paystack.listTransactions({ perPage: 100 })).filter((t) => t.reference.startsWith('AIHS-'));
  const references = transactions.map((t) => t.reference);
  const registrations = await Registration.find({ paymentReference: { $in: references } }).select(
    'fullName email ticketCategory paymentStatus amountKobo paymentReference'
  );
  const byReference = new Map(registrations.map((r) => [r.paymentReference!, r]));

  const rows = transactions.map((t) => {
    const local = byReference.get(t.reference);
    const localPaid = local?.paymentStatus === 'paid';
    const paystackSucceeded = t.status === 'success';
    const amountMismatch = localPaid && local?.amountKobo != null && local.amountKobo !== t.amountKobo;
    return {
      reference: t.reference,
      paystackStatus: t.status,
      paystackAmountKobo: t.amountKobo,
      paystackPaidAt: t.paidAt,
      customerEmail: t.customerEmail,
      localFound: Boolean(local),
      localName: local?.fullName,
      localTicketCategory: local?.ticketCategory,
      localPaymentStatus: local?.paymentStatus,
      localAmountKobo: local?.amountKobo,
      mismatch: (paystackSucceeded && !localPaid) || Boolean(amountMismatch),
    };
  });

  res.json(new ApiResponse({ configured: true, rows }));
});

// POST /admin/reconciliations/:reference/resync — force re-verify one reference
// against Paystack directly (the same idempotent path payments/verify uses).
// allowAmountMismatch: true — an admin looking at this exact row's flagged
// mismatch and choosing to push it through anyway is a deliberate human
// decision, unlike the automatic webhook/frontend-verify paths.
export const resync = catchAsync(async (req: Request, res: Response) => {
  await confirmPaymentByReference(req.params.reference, { allowAmountMismatch: true });
  const registration = await Registration.findOne({
    $or: [{ paymentReference: req.params.reference }, { previousPaymentReferences: req.params.reference }],
  }).select('paymentStatus status amountKobo');
  res.json(new ApiResponse({ ok: true, registration }));
});
