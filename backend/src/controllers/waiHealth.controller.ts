import type { Request, Response } from 'express';
import { isValidObjectId, Types, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { WaiHealthRegistration, type WaiHealthRegistrationDoc } from '../models/WaiHealthRegistration.model.js';
import { WaiHealthSettings, getOrCreateWaiHealthSettings } from '../models/WaiHealthSettings.model.js';
import { Registration } from '../models/Registration.model.js';
import { verifyFormToken } from '../services/formToken.service.js';
import { sendWaiHealthConfirmationEmail } from '../services/email.service.js';
import { recordAudit } from '../services/audit.service.js';
import { toCsv } from '../utils/toCsv.js';
import type {
  CreateWaiHealthRegistrationInput,
  LinkWaiHealthRegistrationInput,
  ListWaiHealthQuery,
  SetWaiHealthCapacityInput,
} from '../validations/waiHealth.validation.js';

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
export const register = catchAsync(async (req: Request, res: Response) => {
  const { middleName: _honeypot, formToken, ...input } = req.body as CreateWaiHealthRegistrationInput;
  if (!verifyFormToken(formToken)) {
    throw new ApiError(400, 'Verification failed, please try again.', 'FORM_VERIFICATION_FAILED');
  }

  // getOrCreateWaiHealthSettings ensures the one settings doc exists before
  // the conditional update below — findOneAndUpdate with no filter beyond the
  // capacity check would otherwise match nothing on a brand-new deployment.
  await getOrCreateWaiHealthSettings();

  // Reserve a slot atomically BEFORE creating the registration doc — two
  // visitors racing for the last seat can't both reserve past capacity, since
  // only one of these conditional updates can match confirmedCount < capacity.
  const reserved = await WaiHealthSettings.findOneAndUpdate(
    { $expr: { $lt: ['$confirmedCount', '$capacity'] } },
    { $inc: { confirmedCount: 1 } },
    { new: true }
  );
  if (!reserved) {
    throw new ApiError(409, 'The Breakfast is at capacity. Please contact us to be added to the waitlist.', 'WAI_HEALTH_FULL');
  }

  try {
    const registration = await WaiHealthRegistration.create(input);
    sendWaiHealthConfirmationEmail(registration.email, registration.fullName).catch(() => {});
    res.status(201).json(
      new ApiResponse({
        id: registration.id,
        message: "You're on the list for the Women in AI & Health Breakfast. See you at 08:00 on Day 1!",
      })
    );
  } catch (err) {
    // Roll back the reservation — either a genuine duplicate email (the
    // partial-unique index caught it) or any other write failure. Either way
    // the slot wasn't actually used, so it must go back into the pool.
    await WaiHealthSettings.updateOne({ _id: reserved._id }, { $inc: { confirmedCount: -1 } });
    if ((err as { code?: number }).code === 11000) {
      const existing = await WaiHealthRegistration.findOne({ email: input.email });
      res.status(200).json(
        new ApiResponse({
          id: existing?.id,
          message: "You're already on the list for the Women in AI & Health Breakfast. See you at 08:00 on Day 1!",
        })
      );
      return;
    }
    throw err;
  }
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

const EXPORT_COLUMNS = ['fullName', 'email', 'phone', 'organization', 'jobTitle', 'country', 'coHostNetwork', 'hasSummitRegistration', 'createdAt'];

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
