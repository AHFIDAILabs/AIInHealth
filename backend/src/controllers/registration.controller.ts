import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { toCsv } from '../utils/toCsv.js';
import { Registration, type RegistrationDoc } from '../models/Registration.model.js';
import { AccessCode } from '../models/AccessCode.model.js';
import type { CreateRegistrationInput, ListRegistrationsQuery } from '../validations/registration.validation.js';
import { listRegistrationsQuerySchema, updateRegistrationStatusSchema } from '../validations/registration.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { emitAdminNotification } from '../services/notification.service.js';
import { isFreeTicketCategory } from '../config/pricing.js';
import { generateQrToken } from '../services/qr.service.js';
import { generateCode } from './accessCode.controller.js';
import { issueMagicLinkToken } from '../services/delegateToken.service.js';
import { sendVolunteerConfirmedEmail } from '../services/email.service.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { TicketCategory } from '../types/enums.js';
import type { HydratedDocument } from 'mongoose';

const CONFIRMATION_MESSAGE: Record<CreateRegistrationInput['type'], string> = {
  attendee: "You're registered. We'll be in touch with next steps shortly.",
  exhibitor: "Thanks for applying to exhibit. Our team will follow up with booth options and pricing.",
  sponsor: "Thanks for your interest in partnering with us. Our team will follow up with sponsorship packages.",
  // Unreachable in practice — the volunteer branch below always returns its own
  // application/confirmation message instead. Kept only because every type needs
  // an entry for this Record's type to check out.
  volunteer: "You're confirmed as a volunteer! We'll be in touch with schedule and role details shortly.",
};

const VOLUNTEER_APPLIED_MESSAGE = "Thanks for applying to volunteer! If you're selected, we'll email you an access code to confirm your spot.";
const VOLUNTEER_ALREADY_APPLIED_MESSAGE = "You've already applied to volunteer — we'll be in touch if you're selected.";
const VOLUNTEER_CONFIRMED_MESSAGE = "You're confirmed as a volunteer! We'll be in touch with schedule and role details shortly.";
const ATTENDEE_PAID_MESSAGE = "You're one step away — complete payment to confirm your seat.";

// Idempotency window for the non-volunteer create() branch below — see its comment.
const DUPLICATE_SUBMIT_WINDOW_MS = 2 * 60 * 1000;

// Fires the "you're in — complete your profile (with a photo)" email for a
// newly-confirmed volunteer, whichever path got them there (self-redeemed code,
// or an admin confirming them directly). Best-effort — a send failure here
// shouldn't fail the request that just confirmed them.
const notifyVolunteerConfirmed = async (registration: HydratedDocument<RegistrationDoc>, code?: string): Promise<void> => {
  if (!registration.email) return;
  try {
    const rawToken = await issueMagicLinkToken(registration.id);
    const portalUrl = `${env.FRONTEND_ORIGIN}/portal/verify?token=${rawToken}`;
    await sendVolunteerConfirmedEmail(registration.email, registration.fullName || 'there', { portalUrl, code });
    registration.portalLastLinkSentAt = new Date();
    await registration.save();
  } catch (err) {
    logger.error({ err, registrationId: registration.id }, 'Failed to send volunteer confirmation email');
  }
};

// When an admin confirms a volunteer directly (RegistrationsPage's status action)
// rather than the volunteer self-redeeming an emailed code, there's no code on
// record yet. Issue one now — marked used immediately, since there's no
// self-redemption step left to do — purely so Access Codes stays a consistent
// audit trail, then send the same confirmation email a code redemption would have.
const confirmVolunteerDirectly = async (registration: HydratedDocument<RegistrationDoc>, adminUserId: string): Promise<void> => {
  try {
    let code = registration.accessCode ?? undefined;
    if (!code) {
      let generated = generateCode('volunteer');
      // eslint-disable-next-line no-await-in-loop
      while (await AccessCode.exists({ code: generated })) generated = generateCode('volunteer');
      const accessCode = await AccessCode.create({
        code: generated,
        type: 'volunteer',
        issuedTo: registration.email,
        status: 'used',
        usedByRegistration: registration.id,
        usedAt: new Date(),
        createdBy: adminUserId,
      });
      registration.accessCode = accessCode.code;
      await registration.save();
      code = accessCode.code;
    }
    await notifyVolunteerConfirmed(registration, code);
  } catch (err) {
    logger.error({ err, registrationId: registration.id }, 'Failed to issue/send volunteer confirmation');
  }
};

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreateRegistrationInput;

  if (input.type === 'volunteer') {
    const trimmedCode = input.accessCode?.trim().toUpperCase();

    // No code yet — this is an application, not a confirmation. Most people
    // filling this form are applying for the first time; staff review applications
    // and email a code to whoever they pick (see accessCode.controller.ts).
    if (!trimmedCode) {
      const existingApplication = await Registration.findOne({
        type: 'volunteer',
        email: input.email,
        status: { $in: ['pending', 'reviewed'] },
      });
      if (existingApplication) {
        res.status(200).json(new ApiResponse({ id: existingApplication.id, message: VOLUNTEER_ALREADY_APPLIED_MESSAGE }));
        return;
      }

      const registration = await Registration.create(input);
      await emitAdminNotification({
        type: 'registration.new',
        title: 'New volunteer application',
        body: input.fullName,
        resourceType: 'Registration',
        resourceId: registration.id,
      });
      res.status(201).json(new ApiResponse({ id: registration.id, message: VOLUNTEER_APPLIED_MESSAGE }));
      return;
    }

    // A code was provided — this confirms a spot, whether or not they applied
    // first through the path above.
    const code = await AccessCode.findOne({ code: trimmedCode });
    if (!code || code.type !== 'volunteer') {
      throw new ApiError(422, 'That access code is not valid.', 'INVALID_ACCESS_CODE');
    }
    if (code.status === 'used') {
      throw new ApiError(422, 'That access code has already been used.', 'ACCESS_CODE_USED');
    }
    if (code.status === 'revoked') {
      throw new ApiError(422, 'That access code has been revoked. Contact the organizing team.', 'ACCESS_CODE_REVOKED');
    }
    if (code.expiresAt && code.expiresAt < new Date()) {
      throw new ApiError(422, 'That access code has expired. Contact the organizing team.', 'ACCESS_CODE_EXPIRED');
    }
    // The code is the identity anchor, not just a shared secret — it was emailed to
    // one specific address, so redeeming it requires proving you're that person
    // rather than just knowing the string. Without this, a leaked/shared code could
    // be redeemed by anyone under any name.
    if (code.issuedTo !== input.email.trim().toLowerCase()) {
      throw new ApiError(422, 'This access code was issued to a different email address. Please use the email it was sent to.', 'ACCESS_CODE_EMAIL_MISMATCH');
    }

    // If they already applied earlier (the no-code path above), promote that same
    // record to confirmed instead of creating a second, duplicate registration.
    const existingApplication = await Registration.findOne({
      type: 'volunteer',
      email: input.email,
      status: { $in: ['pending', 'reviewed'] },
    });
    let registration;
    if (existingApplication) {
      existingApplication.set({ ...input, accessCode: trimmedCode, status: 'confirmed', qrToken: generateQrToken() });
      registration = await existingApplication.save();
    } else {
      registration = await Registration.create({ ...input, accessCode: trimmedCode, status: 'confirmed', qrToken: generateQrToken() });
    }

    code.status = 'used';
    code.usedByRegistration = registration.id;
    code.usedAt = new Date();
    await code.save();

    // Fire-and-forget — the browser confirmation message already told them they're
    // in; this email is the durable follow-up (in case the tab is closed) prompting
    // them to add a profile photo.
    void notifyVolunteerConfirmed(registration, trimmedCode);

    await emitAdminNotification({
      type: 'registration.new',
      title: 'Volunteer registration confirmed',
      body: input.fullName,
      resourceType: 'Registration',
      resourceId: registration.id,
    });

    res.status(existingApplication ? 200 : 201).json(new ApiResponse({ id: registration.id, message: VOLUNTEER_CONFIRMED_MESSAGE }));
    return;
  }

  // Paid ticket categories start life unpaid — payment.controller.ts's initialize
  // flips this to 'paid'/'confirmed' once Paystack verifies the charge. Free
  // categories (government_official, accredited_media) keep the default
  // 'not_required' and go through the same manual admin review as before.
  const requiresPayment = input.type === 'attendee' && !isFreeTicketCategory(input.ticketCategory as TicketCategory);

  // Idempotency: a double-click or a network-retried submit shouldn't create a
  // second registration — return the one that already exists instead. Scoped to a
  // short recent window (not "ever") so someone who genuinely wants to submit again
  // later (e.g. after correcting a mistake) isn't blocked indefinitely.
  const dedupeEmail = input.type === 'attendee' ? input.email : input.contactEmail;
  const recentDuplicate = await Registration.findOne({
    type: input.type,
    ...(input.type === 'attendee' ? { email: dedupeEmail } : { contactEmail: dedupeEmail }),
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_SUBMIT_WINDOW_MS) },
  }).sort({ createdAt: -1 });

  const registration =
    recentDuplicate ??
    (await Registration.create({
      ...input,
      ...(requiresPayment && { paymentStatus: 'unpaid' }),
    }));

  if (!recentDuplicate) {
    const who = input.type === 'attendee' ? input.fullName : input.companyName;
    await emitAdminNotification({
      type: 'registration.new',
      title: `New ${input.type} registration`,
      body: who,
      resourceType: 'Registration',
      resourceId: registration.id,
    });
  }

  const stillRequiresPayment = requiresPayment && registration.paymentStatus !== 'paid';
  res.status(recentDuplicate ? 200 : 201).json(
    new ApiResponse({
      id: registration.id,
      requiresPayment: stillRequiresPayment,
      message: stillRequiresPayment ? ATTENDEE_PAID_MESSAGE : CONFIRMATION_MESSAGE[input.type],
    })
  );
});

// content_editor's "Volunteers" access is scoped to volunteer-type registrations
// only — everything else (attendee payment data, exhibitor/sponsor contacts) stays
// out of their lane, same enforcement pattern as accessCode.controller.ts.
const isContentEditor = (req: Request) => req.user!.role === 'content_editor';

const buildAdminFilter = (query: ListRegistrationsQuery, req: Request): FilterQuery<RegistrationDoc> => {
  const filter: FilterQuery<RegistrationDoc> = {};
  if (isContentEditor(req)) {
    filter.type = 'volunteer';
  } else if (query.type) {
    filter.type = query.type;
  }
  if (query.status) filter.status = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { fullName: rx },
      { email: rx },
      { organization: rx },
      { companyName: rx },
      { contactEmail: rx },
      { contactName: rx },
    ];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listRegistrationsQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query, req);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Registration.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Registration.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminUpdateStatus = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) {
    throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  }
  const { status } = updateRegistrationStatusSchema.parse({ body: req.body }).body;
  const before = await Registration.findById(req.params.id).select('status qrToken type');
  if (!before) {
    throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  }
  if (isContentEditor(req) && before.type !== 'volunteer') {
    throw new ApiError(403, 'You can only manage volunteer registrations.', 'FORBIDDEN');
  }
  // Any registration type earns a check-in QR the moment it's confirmed, whichever
  // path got it there (payment, volunteer code, or a manual admin decision here).
  const update: { status: typeof status; qrToken?: string } = { status };
  if (status === 'confirmed' && !before.qrToken) update.qrToken = generateQrToken();
  const registration = await Registration.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!registration) {
    throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  }
  await recordAudit({
    req,
    action: 'registration.status_changed',
    resourceType: 'Registration',
    resourceId: registration.id,
    before: { status: before.status },
    after: { status: registration.status },
  });

  // Volunteers confirmed straight from this status action (not through a
  // self-redeemed access code) get no other notification of any kind otherwise —
  // this is the only place that tells them they were chosen.
  if (registration.type === 'volunteer' && status === 'confirmed' && before.status !== 'confirmed') {
    void confirmVolunteerDirectly(registration, req.user!.sub);
  }

  res.json(new ApiResponse(registration));
});

const CSV_COLUMNS = [
  '_id', 'type', 'status', 'createdAt', 'registrationMode', 'ticketCategory', 'fullName', 'email', 'phone',
  'organization', 'jobTitle', 'country', 'companyName', 'contactName', 'contactEmail', 'contactPhone', 'website',
  'boothSize', 'productsDescription', 'message', 'accessCode',
];

export const adminExport = catchAsync(async (req: Request, res: Response) => {
  // page/limit are ignored here on purpose — export always returns every matching row.
  const query = listRegistrationsQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query, req);
  const items = await Registration.find(filter).sort({ createdAt: -1 }).lean();

  const csv = toCsv(items as unknown as Record<string, unknown>[], CSV_COLUMNS);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="registrations-${Date.now()}.csv"`);
  res.send(csv);
});
