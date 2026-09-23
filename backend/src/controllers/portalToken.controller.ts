import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration } from '../models/Registration.model.js';
import { resendAccessCodeAndTicket } from '../services/registrationNotification.service.js';
import { recordAudit } from '../services/audit.service.js';
import { generateQrToken } from '../services/qr.service.js';
import { runInBatches } from '../utils/batch.js';
import { REGISTRATION_STATUSES, REGISTRATION_TYPES } from '../types/enums.js';

const delegateName = (r: { fullName?: string | null; contactName?: string | null; companyName?: string | null }) =>
  r.fullName || r.contactName || r.companyName || 'there';
const delegateEmail = (r: { email?: string | null; contactEmail?: string | null }) => r.email || r.contactEmail || null;

// GET /admin/portal-tokens — every confirmed registration and its portal access
// state, filterable by Status/Type same as RegistrationsPage.tsx. Status
// defaults to 'confirmed' (portal access only ever exists for a confirmed
// registration) when the param is omitted entirely — the same default this
// endpoint always had — but an explicit empty string ("All Statuses" in the
// UI) lifts that default so the admin can still see other statuses if needed.
export const adminList = catchAsync(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;
  const typeParam = typeof req.query.type === 'string' ? req.query.type : undefined;

  const filter: Record<string, unknown> = {};
  if (statusParam === undefined) {
    filter.status = 'confirmed';
  } else if (statusParam && (REGISTRATION_STATUSES as readonly string[]).includes(statusParam)) {
    filter.status = statusParam;
  }
  if (typeParam && (REGISTRATION_TYPES as readonly string[]).includes(typeParam)) {
    filter.type = typeParam;
  }

  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { contactName: rx }, { companyName: rx }, { email: rx }, { contactEmail: rx }];
  }

  const items = await Registration.find(filter)
    .select('type status fullName contactName companyName email contactEmail qrToken directoryOptIn portalLastLinkSentAt checkedIn')
    .sort({ portalLastLinkSentAt: -1, createdAt: -1 })
    .limit(200)
    .lean();

  res.json(
    new ApiResponse(
      items.map((r) => ({
        id: r._id,
        type: r.type,
        status: r.status,
        name: delegateName(r),
        email: delegateEmail(r),
        hasTicket: Boolean(r.qrToken),
        directoryOptIn: r.directoryOptIn,
        checkedIn: r.checkedIn,
        portalLastLinkSentAt: r.portalLastLinkSentAt,
      }))
    )
  );
});

// POST /admin/portal-tokens/:id/send-code — staff-triggered access-code email, for
// a delegate who never got (or lost) their portal access code.
export const adminSendCode = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  const registration = await Registration.findById(req.params.id);
  if (!registration) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  if (registration.status !== 'confirmed') {
    throw new ApiError(400, 'Only confirmed registrations can access the delegate portal.', 'NOT_CONFIRMED');
  }
  if (!delegateEmail(registration)) throw new ApiError(400, 'This registration has no email on file.', 'NO_EMAIL');

  const result = await resendAccessCodeAndTicket(registration);

  await recordAudit({
    req,
    action: 'portal_token.sent',
    resourceType: 'Registration',
    resourceId: registration.id,
    after: { sentAt: result?.sentAt },
  });

  res.status(201).json(new ApiResponse({ ok: true, sentAt: result?.sentAt }));
});

// POST /admin/portal-tokens/bulk-send — one click, every confirmed
// registration that's NEVER had anything sent (portalLastLinkSentAt unset)
// gets its access code + QR ticket email. Deliberately keyed on
// portalLastLinkSentAt rather than "missing qrToken" — a registration
// imported from the previous site can already have a qrToken (the migration
// script mints one for anything paid/comped) despite that person never
// actually having been emailed it, so "missing qrToken" alone would wrongly
// skip them. For the (rarer) case where qrToken really is missing too, one is
// generated here first — resendAccessCodeAndTicket silently skips the QR
// email otherwise rather than minting one itself.
export const adminBulkSendCodes = catchAsync(async (req: Request, res: Response) => {
  const targets = await Registration.find({ status: 'confirmed', portalLastLinkSentAt: { $exists: false } });

  const { succeeded, failed } = await runInBatches(targets, 10, async (reg) => {
    if (!delegateEmail(reg)) throw new Error('No email on file');
    if (!reg.qrToken) {
      reg.qrToken = generateQrToken();
      await reg.save();
    }
    await resendAccessCodeAndTicket(reg);
  });

  await recordAudit({
    req,
    action: 'portal_token.bulk_sent',
    resourceType: 'Registration',
    resourceId: 'bulk',
    after: { attempted: targets.length, sent: succeeded, failed: failed.length },
  });

  res.json(new ApiResponse({ attempted: targets.length, sent: succeeded, failed: failed.length }));
});
