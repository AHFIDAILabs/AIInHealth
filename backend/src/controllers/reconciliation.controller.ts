import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration } from '../models/Registration.model.js';
import * as paystack from '../services/paystack.service.js';
import { confirmPaymentByReference } from './payment.controller.js';

// GET /admin/reconciliations — cross-checks recent Paystack transactions for this
// event (reference prefix AIHS-) against our own payment records, flagging anything
// Paystack says succeeded that we don't yet show as paid (a missed/late webhook)
// or where the amounts disagree. Paginated straight through to Paystack's own
// /transaction listing (which is itself paginated) — previously hardcoded to
// just the 100 most recent transactions with no way to see anything older, so
// a missed webhook on an older transaction was permanently invisible here.
export const list = catchAsync(async (req: Request, res: Response) => {
  if (!paystack.paystackConfigured) {
    res.json(new ApiResponse({ configured: false, rows: [] }, { page: 1, limit: 100, total: 0, pages: 1 }));
    return;
  }

  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50));

  const result = await paystack.listTransactions({ perPage: limit, page });
  const transactions = result.items.filter((t) => t.reference.startsWith('AIHS-'));
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

  res.json(
    new ApiResponse(
      { configured: true, rows },
      { page: result.page, limit: result.perPage, total: result.total, pages: Math.max(1, result.pageCount) }
    )
  );
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
