import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { isValidObjectId, Types, type FilterQuery, type HydratedDocument } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { WaiHealthRegistration, type WaiHealthRegistrationDoc } from '../models/WaiHealthRegistration.model.js';
import { WaiHealthSettings, getOrCreateWaiHealthSettings } from '../models/WaiHealthSettings.model.js';
import { Registration } from '../models/Registration.model.js';
import { verifyFormToken } from '../services/formToken.service.js';
import {
  sendWaiHealthConfirmationEmail,
  sendWaiHealthRsvpConfirmedEmail,
  sendWaiHealthNotEligibleEmail,
} from '../services/email.service.js';
import { recordAudit } from '../services/audit.service.js';
import { runInBatches } from '../utils/batch.js';
import { toCsv } from '../utils/toCsv.js';
import type {
  CreateWaiHealthRegistrationInput,
  LinkWaiHealthRegistrationInput,
  ListWaiHealthQuery,
  RsvpParams,
  SetWaiHealthCapacityInput,
} from '../validations/waiHealth.validation.js';

// Opaque, random, unrelated to the QR check-in token generated elsewhere
// (qr.service.ts's generateQrToken) — same crypto idiom, different purpose
// (a public, single-use-in-spirit RSVP link, not a door-scan credential).
const generateRsvpToken = (): string => crypto.randomBytes(24).toString('base64url');

// GET /wai-health/status — public. Polled by the Breakfast page to show a
// live "X of Y spots filled" / sold-out state before anyone starts filling
// out the form.
export const status = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateWaiHealthSettings();
  res.json(
    new ApiResponse({
      capacity: settings.capacity,
      confirmedCount: settings.confirmedCount,
      full: settings.confirmedCount >= settings.capacity,
    })
  );
});

// POST /wai-health/register — public. Breakfast-only fields; the optional
// "also register for the Summit" step is a SEPARATE call the frontend makes
// to the existing, unchanged public registration endpoint (submitRegistration())
// — see WaiHealthRegistration.model.ts's header comment for why this isn't
// done server-side here.
//
// Deliberately uncapped — the real, capacity-checked seat reservation
// happens at rsvp() below, not here. This just records interest and emails
// the RSVP link.
export const register = catchAsync(async (req: Request, res: Response) => {
  const { middleName: _honeypot, formToken, ...input } = req.body as CreateWaiHealthRegistrationInput;
  if (!verifyFormToken(formToken)) {
    throw new ApiError(400, 'Verification failed, please try again.', 'FORM_VERIFICATION_FAILED');
  }

  const rsvpToken = generateRsvpToken();

  try {
    const registration = await WaiHealthRegistration.create({ ...input, rsvpToken });
    sendWaiHealthConfirmationEmail(registration.email, registration.fullName, rsvpToken).catch(() => {});
    res.status(201).json(
      new ApiResponse({
        id: registration.id,
        message: "Thanks for your interest in the Women in AI & Health Breakfast — check your email to confirm your seat.",
      })
    );
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      const existing = await WaiHealthRegistration.findOne({ email: input.email });
      res.status(200).json(
        new ApiResponse({
          id: existing?.id,
          message: "You're already on the list for the Women in AI & Health Breakfast — check your email to confirm your seat.",
        })
      );
      return;
    }
    throw err;
  }
});

// POST /wai-health/rsvp/:token — public. The real seat reservation. Clicking
// the link in the signup email redeems this token exactly once; capacity is
// checked/reserved atomically here, the same findOneAndUpdate pattern
// register() used to run at signup time.
export const rsvp = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params as unknown as RsvpParams;
  const waiHealthReg = await WaiHealthRegistration.findOne({ rsvpToken: token });
  if (!waiHealthReg) throw new ApiError(404, 'This RSVP link is invalid.', 'NOT_FOUND');

  if (waiHealthReg.declined) {
    res.json(new ApiResponse({ status: 'not_eligible' }));
    return;
  }
  if (waiHealthReg.rsvpConfirmedAt) {
    res.json(new ApiResponse({ status: 'already_confirmed', confirmedAt: waiHealthReg.rsvpConfirmedAt }));
    return;
  }

  await getOrCreateWaiHealthSettings();

  // Two people clicking their own distinct links at the same instant can't
  // both reserve past capacity — only one of these conditional updates can
  // match confirmedCount < capacity, same race-safety register() used to rely on.
  const reserved = await WaiHealthSettings.findOneAndUpdate(
    { $expr: { $lt: ['$confirmedCount', '$capacity'] } },
    { $inc: { confirmedCount: 1 } },
    { new: true }
  );
  if (!reserved) {
    // 200, not an error status — this is a normal, expected outcome the
    // frontend renders its own "sorry, full" state for, same reasoning as
    // 'already_confirmed'/'not_eligible' above. Only a genuinely invalid
    // token (no matching document at all) is a real ApiError.
    res.json(new ApiResponse({ status: 'full' }));
    return;
  }

  waiHealthReg.rsvpConfirmedAt = new Date();
  await waiHealthReg.save();
  sendWaiHealthRsvpConfirmedEmail(waiHealthReg.email, waiHealthReg.fullName).catch(() => {});

  res.json(new ApiResponse({ status: 'confirmed', confirmedAt: waiHealthReg.rsvpConfirmedAt }));
});

// POST /wai-health/register/:id/link-registration — public. Called right
// after the frontend's separate submitRegistration({ type: 'attendee' }) call
// succeeds, to record that this Breakfast registrant also has a real Summit
// Registration. Idempotent — never overwrites an existing link.
export const linkRegistration = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Breakfast registration not found', 'NOT_FOUND');
  const { registrationId } = req.body as LinkWaiHealthRegistrationInput;
  if (!isValidObjectId(registrationId)) throw new ApiError(422, 'Invalid registration reference', 'VALIDATION_ERROR');

  const [waiHealthReg, registrationExists] = await Promise.all([
    WaiHealthRegistration.findById(req.params.id),
    Registration.exists({ _id: registrationId }),
  ]);
  if (!waiHealthReg) throw new ApiError(404, 'Breakfast registration not found', 'NOT_FOUND');
  if (!registrationExists) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');

  if (!waiHealthReg.registration) {
    waiHealthReg.registration = new Types.ObjectId(registrationId);
    await waiHealthReg.save();
  }

  res.json(new ApiResponse({ id: waiHealthReg.id, linked: true }));
});

const buildFilter = (query: ListWaiHealthQuery): FilterQuery<WaiHealthRegistrationDoc> => {
  const filter: FilterQuery<WaiHealthRegistrationDoc> = {};
  if (query.gender) filter.gender = query.gender;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { organization: rx }, { coHostNetwork: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListWaiHealthQuery;
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    WaiHealthRegistration.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('registration', 'status paymentStatus ticketCategory'),
    WaiHealthRegistration.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

const EXPORT_COLUMNS = [
  'fullName',
  'email',
  'phone',
  'organization',
  'jobTitle',
  'country',
  'coHostNetwork',
  'gender',
  'rsvpConfirmedAt',
  'declined',
  'hasSummitRegistration',
  'createdAt',
];

export const adminExport = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListWaiHealthQuery;
  const filter = buildFilter(query);
  const items = await WaiHealthRegistration.find(filter).sort({ createdAt: -1 }).lean();

  const rows = items.map((r) => ({ ...r, hasSummitRegistration: Boolean(r.registration) }));
  const csv = toCsv(rows, EXPORT_COLUMNS);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="wai-health-registrations.csv"');
  res.send(csv);
});

export const adminGetSettings = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateWaiHealthSettings();
  res.json(new ApiResponse({ capacity: settings.capacity, confirmedCount: settings.confirmedCount }));
});

export const adminSetCapacity = catchAsync(async (req: Request, res: Response) => {
  const { capacity } = req.body as SetWaiHealthCapacityInput;
  const settings = await getOrCreateWaiHealthSettings();
  const before = settings.capacity;
  settings.capacity = capacity;
  await settings.save();

  await recordAudit({
    req,
    action: 'waiHealth.capacity_changed',
    resourceType: 'WaiHealthSettings',
    resourceId: settings.id,
    before: { capacity: before },
    after: { capacity },
  });

  res.json(new ApiResponse({ capacity: settings.capacity, confirmedCount: settings.confirmedCount }));
});

// Shared by adminNotifyNotEligible (single) and adminBulkNotifyNotEligible —
// releases a held seat (if any) and sends the notice, same release-then-notify
// order either way. Returns false (does nothing further) for a row already
// declined, so the bulk action's targets query doubling as its own
// idempotency guard isn't the only thing protecting against a double release.
const notifyNotEligible = async (reg: HydratedDocument<WaiHealthRegistrationDoc>): Promise<boolean> => {
  if (reg.declined) return false;

  if (reg.rsvpConfirmedAt) {
    await WaiHealthSettings.updateOne({}, { $inc: { confirmedCount: -1 } });
  }
  reg.declined = true;
  reg.notifiedNotEligibleAt = new Date();
  await reg.save();

  await sendWaiHealthNotEligibleEmail(reg.email, reg.fullName);
  return true;
};

// POST /admin/wai-health/:id/notify-not-eligible — one registrant, triggered
// from the detail drawer.
export const adminNotifyNotEligible = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  const reg = await WaiHealthRegistration.findById(req.params.id);
  if (!reg) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');

  const sent = await notifyNotEligible(reg);

  await recordAudit({
    req,
    action: 'waiHealth.not_eligible_sent',
    resourceType: 'WaiHealthRegistration',
    resourceId: reg.id,
    after: { declined: reg.declined, notifiedNotEligibleAt: reg.notifiedNotEligibleAt },
  });

  res.json(new ApiResponse({ sent, declined: reg.declined }));
});

// POST /admin/wai-health/notify-not-eligible/bulk — "distill the Male
// registrants and notify them" in one click. Targets every gender: 'male' row
// never yet notified, REGARDLESS of whether they ever RSVP'd — a seat is only
// released for the ones who actually held one (see notifyNotEligible above),
// so nobody who registered but hadn't RSVP'd yet is left out of the notice.
export const adminBulkNotifyNotEligible = catchAsync(async (req: Request, res: Response) => {
  const targets = await WaiHealthRegistration.find({ gender: 'male', notifiedNotEligibleAt: { $exists: false } });

  const { succeeded, failed } = await runInBatches(targets, 10, (reg) => notifyNotEligible(reg));

  await recordAudit({
    req,
    action: 'waiHealth.not_eligible_bulk_sent',
    resourceType: 'WaiHealthRegistration',
    resourceId: 'bulk',
    after: { attempted: targets.length, sent: succeeded, failed: failed.length },
  });

  res.json(new ApiResponse({ attempted: targets.length, sent: succeeded, failed: failed.length }));
});
