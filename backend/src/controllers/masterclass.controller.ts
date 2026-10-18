import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import type { FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration, type RegistrationDoc } from '../models/Registration.model.js';
import { env } from '../config/env.js';
import { recordAudit } from '../services/audit.service.js';
import { runInBatches } from '../utils/batch.js';
import { toCsv } from '../utils/toCsv.js';
import { sendMasterclassRsvpInviteEmail, sendMasterclassRsvpConfirmedEmail } from '../services/email.service.js';
import type {
  AdminSendMasterclassInvitesInput,
  MasterclassRsvpParams,
  ListMasterclassQuery,
} from '../validations/masterclass.validation.js';

// Same crypto idiom as qr.service.ts's generateQrToken / registrationRsvp.controller.ts's
// generateRsvpToken — a distinct token namespace from both (this one
// one-click-confirms a seat at a specific optional session, it never touches
// `status` the way the generic rsvpToken does).
const generateMasterclassToken = (): string => crypto.randomBytes(24).toString('base64url');

// POST /admin/masterclass/send-invites — same re-runnable, idempotent shape
// as registration.controller.ts's adminSendWaiHealthBreakfastInvite: safe to
// click again as the confirmed list grows, since masterclassRsvpInviteSentAt
// is read back into the filter so a re-click only reaches people confirmed
// (or added via ids) since the last send. Unlike that WAI invite, this mails
// a direct one-click RSVP link (no separate signup form needed — the
// recipient is already a confirmed attendee) and is deliberately uncapped —
// no capacity settings model, unlike WaiHealthSettings.
export const adminSendInvites = catchAsync(async (req: Request, res: Response) => {
  const { ids }: AdminSendMasterclassInvitesInput = req.body;

  const targets = await Registration.find({
    type: 'attendee',
    status: 'confirmed',
    ...(ids && ids.length > 0 ? { _id: { $in: ids } } : { masterclassRsvpInviteSentAt: { $exists: false } }),
  });
  const targetable = targets.filter((r) => !!r.email);

  const { succeeded, failed } = await runInBatches(targetable, 3, async (registration) => {
    if (!registration.masterclassRsvpToken) registration.masterclassRsvpToken = generateMasterclassToken();
    registration.masterclassRsvpInviteSentAt = new Date();
    await registration.save();

    const rsvpUrl = `${env.FRONTEND_ORIGIN}/masterclass/rsvp/${registration.masterclassRsvpToken}`;
    await sendMasterclassRsvpInviteEmail(registration.email!, registration.fullName ?? 'there', rsvpUrl);
  });

  await recordAudit({
    req,
    action: 'masterclass.invites_sent',
    resourceType: 'Registration',
    resourceId: 'bulk',
    after: { targeted: targetable.length, sent: succeeded, failed: failed.length },
  });

  res.json(new ApiResponse({ targeted: targetable.length, sent: succeeded, failed: failed.length }));
});

type RsvpStatus = 'confirmed' | 'already_confirmed' | 'invalid';

// POST /masterclass/rsvp/:token — public. One click, no form — just records
// masterclassRsvpConfirmedAt on the already-confirmed Registration this token
// belongs to. Never touches `status`/`checkedIn`/anything else.
export const rsvp = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params as unknown as MasterclassRsvpParams;
  const registration = await Registration.findOne({ masterclassRsvpToken: token });

  if (!registration) {
    res.json(new ApiResponse({ status: 'invalid' as RsvpStatus }));
    return;
  }
  if (registration.masterclassRsvpConfirmedAt) {
    res.json(new ApiResponse({ status: 'already_confirmed' as RsvpStatus, confirmedAt: registration.masterclassRsvpConfirmedAt }));
    return;
  }

  registration.masterclassRsvpConfirmedAt = new Date();
  await registration.save();
  sendMasterclassRsvpConfirmedEmail(registration.email!, registration.fullName ?? 'there').catch(() => {});

  res.json(new ApiResponse({ status: 'confirmed' as RsvpStatus, confirmedAt: registration.masterclassRsvpConfirmedAt }));
});

// GET /admin/masterclass/stats — the "monitor end-to-end" numbers: how many
// confirmed attendees are even eligible to be invited, how many have been
// invited so far, and how many have actually RSVP'd yes. No capacity/full
// state here (deliberately uncapped), unlike waiHealth.controller.ts's status().
export const adminStats = catchAsync(async (_req: Request, res: Response) => {
  const [eligible, invited, confirmed] = await Promise.all([
    Registration.countDocuments({ type: 'attendee', status: 'confirmed' }),
    Registration.countDocuments({ type: 'attendee', status: 'confirmed', masterclassRsvpInviteSentAt: { $exists: true } }),
    Registration.countDocuments({ type: 'attendee', status: 'confirmed', masterclassRsvpConfirmedAt: { $exists: true } }),
  ]);
  res.json(new ApiResponse({ eligible, invited, confirmed }));
});

const buildFilter = (query: ListMasterclassQuery): FilterQuery<RegistrationDoc> => {
  const filter: FilterQuery<RegistrationDoc> = { type: 'attendee', status: 'confirmed' };
  if (query.confirmed === 'true') filter.masterclassRsvpConfirmedAt = { $exists: true };
  if (query.confirmed === 'false') filter.masterclassRsvpConfirmedAt = { $exists: false };
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { organization: rx }];
  }
  return filter;
};

// GET /admin/masterclass/list — paginated monitoring list, same page/limit/
// total/pages response shape as waiHealth.controller.ts's adminList.
export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListMasterclassQuery;
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Registration.find(filter)
      .select('fullName email organization ticketCategory masterclassRsvpInviteSentAt masterclassRsvpConfirmedAt createdAt')
      .sort({ masterclassRsvpConfirmedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Registration.countDocuments(filter),
  ]);

  res.json(new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 }));
});

const EXPORT_COLUMNS = ['fullName', 'email', 'organization', 'ticketCategory', 'masterclassRsvpInviteSentAt', 'masterclassRsvpConfirmedAt'];

export const adminExport = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListMasterclassQuery;
  const filter = buildFilter(query);
  const items = await Registration.find(filter)
    .select('fullName email organization ticketCategory masterclassRsvpInviteSentAt masterclassRsvpConfirmedAt')
    .lean();

  const csv = toCsv(items, EXPORT_COLUMNS);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="masterclass-rsvps.csv"');
  res.send(csv);
});
