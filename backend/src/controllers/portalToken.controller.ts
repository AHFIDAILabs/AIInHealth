import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration } from '../models/Registration.model.js';
import { env } from '../config/env.js';
import { issueMagicLinkToken } from '../services/delegateToken.service.js';
import { sendDelegateMagicLinkEmail } from '../services/email.service.js';
import { recordAudit } from '../services/audit.service.js';

const delegateName = (r: { fullName?: string | null; contactName?: string | null; companyName?: string | null }) =>
  r.fullName || r.contactName || r.companyName || 'there';
const delegateEmail = (r: { email?: string | null; contactEmail?: string | null }) => r.email || r.contactEmail || null;

// GET /admin/portal-tokens — every confirmed registration and its portal access state
export const adminList = catchAsync(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const filter: Record<string, unknown> = { status: 'confirmed' };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { contactName: rx }, { companyName: rx }, { email: rx }, { contactEmail: rx }];
  }

  const items = await Registration.find(filter)
    .select('type fullName contactName companyName email contactEmail qrToken directoryOptIn portalLastLinkSentAt checkedIn')
    .sort({ portalLastLinkSentAt: -1, createdAt: -1 })
    .limit(200)
    .lean();

  res.json(
    new ApiResponse(
      items.map((r) => ({
        id: r._id,
        type: r.type,
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

// POST /admin/portal-tokens/:id/send-link — staff-triggered magic-link email, for a
// delegate who never got (or lost) their self-service sign-in link.
export const adminSendLink = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  const registration = await Registration.findById(req.params.id);
  if (!registration) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  if (registration.status !== 'confirmed') {
    throw new ApiError(400, 'Only confirmed registrations can access the delegate portal.', 'NOT_CONFIRMED');
  }
  const to = delegateEmail(registration);
  if (!to) throw new ApiError(400, 'This registration has no email on file.', 'NO_EMAIL');

  const rawToken = await issueMagicLinkToken(registration.id);
  const linkUrl = `${env.FRONTEND_ORIGIN}/portal/verify?token=${rawToken}`;
  await sendDelegateMagicLinkEmail(to, delegateName(registration), linkUrl);

  registration.portalLastLinkSentAt = new Date();
  await registration.save();

  await recordAudit({
    req,
    action: 'portal_token.sent',
    resourceType: 'Registration',
    resourceId: registration.id,
    after: { sentAt: registration.portalLastLinkSentAt },
  });

  res.status(201).json(new ApiResponse({ ok: true, sentAt: registration.portalLastLinkSentAt }));
});
