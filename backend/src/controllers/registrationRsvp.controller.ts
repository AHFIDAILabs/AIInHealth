import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration } from '../models/Registration.model.js';
import { env } from '../config/env.js';
import { recordAudit } from '../services/audit.service.js';
import { runInBatches } from '../utils/batch.js';
import { sendPendingRsvpReminderEmail } from '../services/email.service.js';
import { sendRsvpRemindersSchema } from '../validations/registration.validation.js';
import type { SendRsvpRemindersInput, RedeemRsvpParams } from '../validations/registration.validation.js';

// Opaque, random, unrelated to the check-in QR token (qr.service.ts's
// generateQrToken) — same crypto idiom, different purpose (a public,
// re-clickable "still interested?" link, not a door-scan credential).
const generateRsvpToken = (): string => crypto.randomBytes(24).toString('base64url');

// POST /admin/registrations/rsvp/send-reminders — nudges pending attendees to
// reconfirm interest, irrespective of ticketCategory (the explicit ask: ID-
// verification categories awaiting review get asked too — see redeem() below
// for why clicking the link still can't bypass that review). ids omitted ->
// every {type:'attendee', status:'pending'} registration with an email.
export const adminSendReminders = catchAsync(async (req: Request, res: Response) => {
  const { ids }: SendRsvpRemindersInput = sendRsvpRemindersSchema.parse({ body: req.body }).body;

  const registrations = await Registration.find({
    type: 'attendee',
    status: 'pending',
    ...(ids && ids.length > 0 && { _id: { $in: ids } }),
  });
  const targetable = registrations.filter((r) => !!r.email);

  const { succeeded, failed } = await runInBatches(targetable, 3, async (registration) => {
    if (!registration.rsvpToken) registration.rsvpToken = generateRsvpToken();
    registration.rsvpRequestedAt = new Date();
    await registration.save();

    const rsvpUrl = `${env.FRONTEND_ORIGIN}/rsvp/${registration.rsvpToken}`;
    await sendPendingRsvpReminderEmail(registration.email!, registration.fullName ?? 'there', rsvpUrl);
  });

  await recordAudit({
    req,
    action: 'registration.rsvp_reminders_sent',
    resourceType: 'Registration',
    resourceId: 'bulk',
    after: { targeted: targetable.length, sent: succeeded, failed: failed.length },
  });

  res.json(new ApiResponse({ targeted: targetable.length, sent: succeeded, failed: failed.length }));
});

type RsvpRedeemStatus = 'responded' | 'already_responded' | 'already_handled' | 'invalid';

// POST /registrations/rsvp/:token — public. Records interest ONLY — never
// confirms the registration, never generates a QR, never sends any email.
// An admin must still explicitly confirm (singly or in bulk — the existing
// PATCH /admin/registrations/:id / RegistrationsPage.tsx's bulk "Confirm"
// action already does exactly this, no new endpoint needed) from the
// resulting "RSVP'd — Awaiting Confirmation" list (?rsvpResponded=true) —
// this is what keeps the ID-verification review step intact even though
// every pending attendee, regardless of category, is sent this same link.
export const redeem = catchAsync(async (req: Request, res: Response) => {
  // Shape already checked by registration.routes.ts's validate(redeemRsvpSchema).
  const { token } = req.params as unknown as RedeemRsvpParams;
  const registration = await Registration.findOne({ rsvpToken: token });

  if (!registration) {
    res.json(new ApiResponse({ status: 'invalid' as RsvpRedeemStatus }));
    return;
  }
  if (registration.status !== 'pending') {
    res.json(new ApiResponse({ status: 'already_handled' as RsvpRedeemStatus }));
    return;
  }
  if (registration.rsvpRespondedAt) {
    res.json(new ApiResponse({ status: 'already_responded' as RsvpRedeemStatus, respondedAt: registration.rsvpRespondedAt }));
    return;
  }

  registration.rsvpRespondedAt = new Date();
  await registration.save();

  res.json(new ApiResponse({ status: 'responded' as RsvpRedeemStatus, respondedAt: registration.rsvpRespondedAt }));
});
