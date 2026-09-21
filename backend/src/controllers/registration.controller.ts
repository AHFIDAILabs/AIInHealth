import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { toCsv } from '../utils/toCsv.js';
import { Registration, type RegistrationDoc } from '../models/Registration.model.js';
import { VolunteerTrack } from '../models/VolunteerTrack.model.js';
import { EventTeamMember } from '../models/EventTeamMember.model.js';
import { AccessCode, type AccessCodeDoc } from '../models/AccessCode.model.js';
import { CustomFormField } from '../models/CustomFormField.model.js';
import { Lead } from '../models/Lead.model.js';
import type { CreateRegistrationInput, ListRegistrationsQuery, AdminCreateRegistrationInput } from '../validations/registration.validation.js';
import {
  listRegistrationsQuerySchema,
  updateRegistrationStatusSchema,
  adminCreateRegistrationSchema,
} from '../validations/registration.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { emitAdminNotification } from '../services/notification.service.js';
import { isFreeTicketCategory } from '../config/pricing.js';
import { ATTENDEE_ACCESS_CODE_TYPES } from '../types/enums.js';
import { generateQrToken, qrDataUrlForToken } from '../services/qr.service.js';
import { generateCode } from './accessCode.controller.js';
import { initializePaymentForRegistration } from './payment.controller.js';
import { sendVolunteerConfirmedEmail, sendTicketQrEmail, sendRegistrationPaymentLinkEmail } from '../services/email.service.js';
import { sendConfirmationAndTicketEmails } from '../services/registrationNotification.service.js';
import { ensureDelegateAccessCode } from '../services/delegateToken.service.js';
import { logger } from '../config/logger.js';
import type { TicketCategory } from '../types/enums.js';
import type { HydratedDocument } from 'mongoose';

const CONFIRMATION_MESSAGE: Record<CreateRegistrationInput['type'], string> = {
  attendee: "You're registered. We'll be in touch with next steps shortly.",
  exhibitor: "Thanks for applying to exhibit. Our team will follow up with booth options and pricing.",
  sponsor: "Thanks for your interest in partnering with us. Our team will follow up with sponsorship packages.",
  // Unreachable in practice — the volunteer/team branches below always return
  // their own application/confirmation message instead. Kept only because
  // every type needs an entry for this Record's type to check out.
  volunteer: "You're confirmed as a volunteer! We'll be in touch with schedule and role details shortly.",
  team: "You're confirmed! We'll be in touch with event-day details shortly.",
};

const VOLUNTEER_APPLIED_MESSAGE = "Thanks for applying to volunteer! If you're selected, we'll email you an access code to confirm your spot.";
const VOLUNTEER_ALREADY_APPLIED_MESSAGE = "You've already applied to volunteer — we'll be in touch if you're selected.";
const VOLUNTEER_CONFIRMED_MESSAGE = "You're confirmed as a volunteer! We'll be in touch with schedule and role details shortly.";
const ATTENDEE_PAID_MESSAGE = "You're one step away — complete payment to confirm your seat.";

// Team registration is gated against the EventTeamMember roster rather than an
// access code — a match auto-confirms (they're already vetted staff); no
// match falls to the normal pending review queue instead of being rejected,
// in case the roster is stale or has a typo.
const TEAM_CONFIRMED_MESSAGE = "You're confirmed! We'll be in touch with event-day details shortly.";
const TEAM_PENDING_MESSAGE = "Thanks for registering — we're verifying your details against the team roster. You'll get a confirmation email shortly.";
const TEAM_ALREADY_REGISTERED_MESSAGE = "You've already registered — check your email for your confirmation.";

// Idempotency window for the non-volunteer create() branch below — see its comment.
const DUPLICATE_SUBMIT_WINDOW_MS = 2 * 60 * 1000;

// Fires the "you're in — complete your profile (with a photo)" email for a
// newly-confirmed volunteer, whichever path got them there (self-redeemed code,
// or an admin confirming them directly). Best-effort — a send failure here
// shouldn't fail the request that just confirmed them. The code shown here is
// the reusable delegate portal access code (ensureDelegateAccessCode) — NOT
// the AccessCode-collection code that may have been redeemed to get to this
// confirmed state (confirmVolunteerDirectly below mints one of those purely
// for its own audit trail; it's never itself a login credential).
const notifyVolunteerConfirmed = async (registration: HydratedDocument<RegistrationDoc>): Promise<void> => {
  if (!registration.email) return;
  try {
    const accessCode = await ensureDelegateAccessCode(registration);
    await sendVolunteerConfirmedEmail(registration.email, registration.fullName || 'there', { accessCode });
    // Separate email, sent right after the confirmation above — their actual
    // check-in QR, not just a link to go fetch it from the portal (matches the
    // same two-email pattern every other confirmation path uses — see
    // registrationNotification.service.ts).
    if (registration.qrToken) {
      const qrDataUrl = await qrDataUrlForToken(registration.qrToken);
      await sendTicketQrEmail(registration.email, registration.fullName || 'there', qrDataUrl);
    }
    registration.portalLastLinkSentAt = new Date();
    await registration.save();
  } catch (err) {
    logger.error({ err, registrationId: registration.id }, 'Failed to send volunteer confirmation email');
  }
};

// When an admin confirms a volunteer directly (RegistrationsPage's status action)
// rather than the volunteer self-redeeming an emailed code, there's no
// AccessCode-collection record yet. Issue one now — marked used immediately,
// since there's no self-redemption step left to do — purely so Access Codes
// stays a consistent audit trail (this code is never shown as a portal login
// credential — see notifyVolunteerConfirmed above).
const confirmVolunteerDirectly = async (registration: HydratedDocument<RegistrationDoc>, adminUserId: string): Promise<void> => {
  try {
    if (!registration.accessCode) {
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
    }
    await notifyVolunteerConfirmed(registration);
  } catch (err) {
    logger.error({ err, registrationId: registration.id }, 'Failed to issue/send volunteer confirmation');
  }
};

// Same "validate free text against a live admin-managed list" pattern as
// speaker.controller.ts's assertValidTrack — trackSelected/trackAssigned stay
// plain strings on Registration (not an ObjectId ref) so nothing has to
// change if a track is later renamed, but a submission naming one that
// doesn't exist in VolunteerTrack is rejected here.
const assertValidVolunteerTrack = async (track: string | undefined): Promise<void> => {
  if (!track) return;
  const exists = await VolunteerTrack.exists({ name: track });
  if (!exists) throw new ApiError(422, 'Select a valid track.', 'INVALID_VOLUNTEER_TRACK');
};

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreateRegistrationInput;

  if (input.type === 'volunteer') {
    await assertValidVolunteerTrack(input.trackSelected);
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
    void notifyVolunteerConfirmed(registration);

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

  if (input.type === 'team') {
    const existing = await Registration.findOne({ type: 'team', email: input.email });
    if (existing) {
      res.status(200).json(new ApiResponse({ id: existing.id, message: TEAM_ALREADY_REGISTERED_MESSAGE }));
      return;
    }

    // Auto-confirm only when the email matches an active roster entry —
    // staff already vetted by management. Anyone else lands in the normal
    // pending review queue rather than being rejected outright (the roster
    // may be stale, or the email may have a typo either side).
    const isRosterMatch = await EventTeamMember.exists({ email: input.email, isActive: true });

    const registration = await Registration.create({
      ...input,
      ...(isRosterMatch && { status: 'confirmed', qrToken: generateQrToken() }),
    });

    await emitAdminNotification({
      type: 'registration.new',
      title: isRosterMatch ? 'Team registration confirmed' : 'New team registration (needs review)',
      body: input.fullName,
      resourceType: 'Registration',
      resourceId: registration.id,
    });

    if (isRosterMatch) {
      void sendConfirmationAndTicketEmails(registration);
    }

    res.status(201).json(new ApiResponse({ id: registration.id, message: isRosterMatch ? TEAM_CONFIRMED_MESSAGE : TEAM_PENDING_MESSAGE }));
    return;
  }

  // Idempotency: a double-click or a network-retried submit shouldn't create a
  // second registration — return the one that already exists instead. Scoped to a
  // short recent window (not "ever") so someone who genuinely wants to submit again
  // later (e.g. after correcting a mistake) isn't blocked indefinitely.
  //
  // Deliberately computed BEFORE the scholarship-code redemption below: a retried
  // submit must return the same registration the first request already created
  // (and whose code was already marked used) without re-validating the code — the
  // second look-up would otherwise find it 'used' and throw, turning a harmless
  // double-click into a scary error on a submission that actually already succeeded.
  const dedupeEmail = input.type === 'attendee' ? input.email : input.contactEmail;
  const recentDuplicate = await Registration.findOne({
    type: input.type,
    ...(input.type === 'attendee' ? { email: dedupeEmail } : { contactEmail: dedupeEmail }),
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_SUBMIT_WINDOW_MS) },
  }).sort({ createdAt: -1 });

  // Comp-code redemption — attendee-only, and only on a genuinely new submission
  // (see the comment above). Same validation shape as the volunteer branch above
  // (unknown/used/revoked/expired/email-mismatch), just against any of the three
  // attendee-side code types instead of 'volunteer'. keynote_speaker/complimentary
  // carry no discountPercent of their own (AccessCode.model.ts) — they're a full
  // comp seat, same end state as a 100%-scholarship, just tracked under their own
  // type for reporting (e.g. "5 keynote speakers" vs "12 scholarships").
  let discountPercent: number | undefined;
  let redeemedCode: HydratedDocument<AccessCodeDoc> | null = null;
  const trimmedAttendeeCode = input.type === 'attendee' ? input.accessCode?.trim().toUpperCase() : undefined;

  if (!recentDuplicate && input.type === 'attendee' && trimmedAttendeeCode) {
    const code = await AccessCode.findOne({ code: trimmedAttendeeCode });
    if (!code || !ATTENDEE_ACCESS_CODE_TYPES.includes(code.type as (typeof ATTENDEE_ACCESS_CODE_TYPES)[number])) {
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
    if (code.issuedTo !== input.email.trim().toLowerCase()) {
      throw new ApiError(422, 'This access code was issued to a different email address. Please use the email it was sent to.', 'ACCESS_CODE_EMAIL_MISMATCH');
    }
    discountPercent = code.type === 'scholarship' ? code.discountPercent ?? undefined : 100;
    redeemedCode = code;
  }

  // Paid ticket categories start life unpaid — payment.controller.ts's initialize
  // flips this to 'paid'/'confirmed' once Paystack verifies the charge. Free
  // categories (government_official, accredited_media), and any fully-comped
  // code redemption (100%-scholarship, keynote_speaker, complimentary), keep
  // the default 'not_required' — a full comp is not a ₦0 charge, so it never
  // touches Paystack at all, same as a free category.
  const isFullyComped = input.type === 'attendee' && discountPercent === 100;
  const requiresPayment = input.type === 'attendee' && !isFreeTicketCategory(input.ticketCategory as TicketCategory) && !isFullyComped;

  let registration: HydratedDocument<RegistrationDoc>;
  let isNewRegistration = false;

  if (recentDuplicate) {
    registration = recentDuplicate;
  } else {
    try {
      registration = await Registration.create({
        ...input,
        ...(requiresPayment && { paymentStatus: 'unpaid' }),
        ...(discountPercent !== undefined && { discountPercent }),
        ...(isFullyComped && { status: 'confirmed', paymentStatus: 'not_required', qrToken: generateQrToken() }),
      });
      isNewRegistration = true;
    } catch (err) {
      // The Registration.model.ts partial-unique index on {type,email}/
      // {type,contactEmail} caught a genuine duplicate the recentDuplicate window
      // above missed — either a true race (two near-simultaneous submits) or a
      // resubmit outside the 2-minute window. Fall back to the existing record
      // with the SAME graceful "already registered" response shape, rather than
      // surfacing a raw duplicate-key error to what's usually just an innocent
      // double-click or someone forgetting they already signed up.
      if ((err as { code?: number }).code !== 11000) throw err;
      const existing = await Registration.findOne({
        type: input.type,
        ...(input.type === 'attendee' ? { email: dedupeEmail } : { contactEmail: dedupeEmail }),
      }).sort({ createdAt: -1 });
      if (!existing) throw err;
      registration = existing;
    }
  }

  if (redeemedCode && isNewRegistration) {
    redeemedCode.status = 'used';
    redeemedCode.usedByRegistration = registration.id;
    redeemedCode.usedAt = new Date();
    await redeemedCode.save();
  }

  if (isNewRegistration) {
    const who = input.type === 'attendee' ? input.fullName : input.companyName;
    await emitAdminNotification({
      type: 'registration.new',
      title: `New ${input.type} registration`,
      body: who,
      resourceType: 'Registration',
      resourceId: registration.id,
    });

    // The only auto-confirmed-with-no-payment path through this handler — a free
    // ticket category still goes through manual admin review (see the comment
    // above), so this fires only for a fully-comped code redemption.
    if (isFullyComped) {
      void sendConfirmationAndTicketEmails(registration);
    }
  }

  // Derived from the registration's own saved paymentStatus (not the pre-creation
  // `requiresPayment` local above) so a deduped retry — which skips re-validating
  // any code — still reports the seat's TRUE state, e.g. a 100%-comped registration
  // correctly reports no payment needed even though this request's own
  // `discountPercent` local is undefined (it never re-ran the code lookup).
  const stillRequiresPayment = registration.paymentStatus === 'unpaid' || registration.paymentStatus === 'failed';
  const appliedDiscount = registration.discountPercent ?? undefined;
  const message = (() => {
    if (input.type === 'attendee' && appliedDiscount === 100) {
      // Covers all three ways a seat ends up fully comped (100%-scholarship,
      // keynote_speaker, complimentary) without assuming which one it was.
      return "Your registration fee is fully covered — you're all set!";
    }
    if (stillRequiresPayment) {
      return appliedDiscount
        ? `Your ${appliedDiscount}% scholarship discount has been applied — complete payment to confirm your seat.`
        : ATTENDEE_PAID_MESSAGE;
    }
    return CONFIRMATION_MESSAGE[input.type];
  })();

  res.status(recentDuplicate ? 200 : 201).json(
    new ApiResponse({
      id: registration.id,
      requiresPayment: stillRequiresPayment,
      message,
      ...(appliedDiscount !== undefined && appliedDiscount < 100 && { discountApplied: appliedDiscount }),
    })
  );
});

// content_editor's "Volunteers" access is scoped to volunteer-type registrations
// only — everything else (attendee payment data, exhibitor/sponsor contacts) stays
// out of their lane, same enforcement pattern as accessCode.controller.ts.
const isContentEditor = (req: Request) => req.user!.role === 'content_editor';

// POST /admin/registrations — admin registers someone directly (a walk-in, a
// phone registration, a manual comp) rather than them filling the public form.
// Every non-attendee type is confirmed immediately — staff is vouching for the
// record, no review queue. Attendee is confirmed immediately too if the admin
// grants a full (100%) scholarship or the ticket category is free; otherwise a
// real Paystack payment link is generated and emailed, since there's no
// self-service checkout step for them to land on the way the public flow has.
export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = adminCreateRegistrationSchema.parse({ body: req.body }).body as AdminCreateRegistrationInput;

  if (isContentEditor(req) && input.type !== 'volunteer') {
    throw new ApiError(403, 'You can only register volunteers.', 'FORBIDDEN');
  }

  if (input.type === 'attendee') {
    const { scholarshipDiscount, ...rest } = input;
    const isFullyComped = scholarshipDiscount === 100;
    const willRequirePayment = !isFreeTicketCategory(rest.ticketCategory as TicketCategory) && !isFullyComped;

    let registration: HydratedDocument<RegistrationDoc>;
    try {
      registration = await Registration.create({
        ...rest,
        ...(scholarshipDiscount !== undefined && { discountPercent: scholarshipDiscount }),
        ...(willRequirePayment
          ? { paymentStatus: 'unpaid' }
          : { status: 'confirmed', paymentStatus: 'not_required', qrToken: generateQrToken() }),
      });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      throw new ApiError(409, 'A registration with this email already exists.', 'DUPLICATE_REGISTRATION');
    }

    await emitAdminNotification({
      type: 'registration.new',
      title: 'New attendee registration (admin)',
      body: rest.fullName,
      resourceType: 'Registration',
      resourceId: registration.id,
    });

    if (!willRequirePayment) {
      void sendConfirmationAndTicketEmails(registration);
      res.status(201).json(new ApiResponse({ id: registration.id, status: registration.status, requiresPayment: false }));
      return;
    }

    const { authorizationUrl } = await initializePaymentForRegistration(registration);
    const amountNaira = Math.round((registration.amountKobo ?? 0) / 100);
    if (registration.email) {
      sendRegistrationPaymentLinkEmail(registration.email, registration.fullName || 'there', {
        authorizationUrl,
        ticketCategory: registration.ticketCategory ?? '',
        amountNaira,
        discountPercent: scholarshipDiscount,
      }).catch((err) => logger.error({ err, registrationId: registration.id }, 'sendRegistrationPaymentLinkEmail failed'));
    }

    // authorizationUrl is included so the admin UI can offer a copy-link
    // fallback in case the email doesn't land — not sensitive, it's the exact
    // same checkout link Paystack shows the payer.
    res.status(201).json(
      new ApiResponse({
        id: registration.id,
        status: registration.status,
        requiresPayment: true,
        paymentLinkSent: Boolean(registration.email),
        authorizationUrl,
      })
    );
    return;
  }

  // exhibitor / sponsor / volunteer — confirmed immediately, admin is vouching.
  if (input.type === 'volunteer') {
    await assertValidVolunteerTrack(input.trackSelected);
    await assertValidVolunteerTrack(input.trackAssigned);
  }
  let registration: HydratedDocument<RegistrationDoc>;
  try {
    registration = await Registration.create({ ...input, status: 'confirmed', qrToken: generateQrToken() });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    throw new ApiError(409, 'A registration with this email already exists.', 'DUPLICATE_REGISTRATION');
  }

  await emitAdminNotification({
    type: 'registration.new',
    title: `New ${input.type} registration (admin)`,
    body: input.type === 'volunteer' || input.type === 'team' ? input.fullName : input.companyName,
    resourceType: 'Registration',
    resourceId: registration.id,
  });

  void sendConfirmationAndTicketEmails(registration);

  res.status(201).json(new ApiResponse({ id: registration.id, status: registration.status, requiresPayment: false }));
});

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

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) {
    throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  }
  const { status, isActive, ...detailFields } = updateRegistrationStatusSchema.parse({ body: req.body }).body;
  const before = await Registration.findById(req.params.id).select('status qrToken type isActive');
  if (!before) {
    throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  }
  if (isContentEditor(req) && before.type !== 'volunteer') {
    throw new ApiError(403, 'You can only manage volunteer registrations.', 'FORBIDDEN');
  }
  if (before.type === 'volunteer') {
    await assertValidVolunteerTrack(detailFields.trackSelected);
    await assertValidVolunteerTrack(detailFields.trackAssigned);
  }
  // Any registration type earns a check-in QR the moment it's confirmed, whichever
  // path got it there (payment, volunteer code, or a manual admin decision here).
  // detailFields (companyName/contactEmail/boothSize/customFieldAnswers/etc — see
  // the validation schema) is a generic pass-through: exhibitor-oriented today,
  // but harmless to spread onto any type since every field is optional and
  // Registration.model.ts already scopes each to the type that actually uses it.
  const update: Record<string, unknown> = { ...detailFields };
  if (status !== undefined) update.status = status;
  if (isActive !== undefined) update.isActive = isActive;
  if (status === 'confirmed' && !before.qrToken) update.qrToken = generateQrToken();

  const registration = await Registration.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!registration) {
    throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  }
  await recordAudit({
    req,
    action: 'registration.updated',
    resourceType: 'Registration',
    resourceId: registration.id,
    before: { status: before.status, isActive: before.isActive },
    after: { status: registration.status, isActive: registration.isActive },
  });

  const justConfirmed = status === 'confirmed' && before.status !== 'confirmed';
  if (justConfirmed && registration.type === 'volunteer') {
    // Volunteers confirmed straight from this status action (not through a
    // self-redeemed access code) get no other notification of any kind otherwise —
    // this is the only place that tells them they were chosen.
    void confirmVolunteerDirectly(registration, req.user!.sub);
  } else if (justConfirmed) {
    // Same deal for any other type an admin approves here directly (e.g. a free
    // ticket category attendee, or an exhibitor/sponsor) — no other path notifies
    // them otherwise.
    void sendConfirmationAndTicketEmails(registration);
  }

  res.json(new ApiResponse(registration));
});

// Route-gated to super_admin/registrations_officer only (admin.routes.ts) — a
// step above what content_editor can touch elsewhere in this controller, so no
// in-handler role check is needed here the way the others above have one.
export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) {
    throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  }
  const registration = await Registration.findByIdAndDelete(req.params.id);
  if (!registration) {
    throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  }

  // Exhibitor-only — Leads have no meaning without the exhibitor that captured
  // them, and there's no UI to view/reference leads whose exhibitor no longer
  // exists (they'd just permanently inflate the Leads stat cards as an
  // unreachable "Unknown" bucket). Cascade so deleting an exhibitor actually
  // means what its confirm dialog says.
  let deletedLeads = 0;
  if (registration.type === 'exhibitor') {
    const leadResult = await Lead.deleteMany({ exhibitor: registration._id });
    deletedLeads = leadResult.deletedCount ?? 0;
  }

  await recordAudit({
    req,
    action: 'registration.deleted',
    resourceType: 'Registration',
    resourceId: req.params.id,
    before: registration.toObject(),
    ...(deletedLeads > 0 && { after: { deletedLeads } }),
  });
  res.json(new ApiResponse({ id: req.params.id }));
});

// Every field an admin can actually see on RegistrationsPage.tsx/AttendeesPage.tsx —
// this list drifted behind the UI over time (paymentStatus, checkedIn, isActive,
// volunteer track/t-shirt fields, exhibitor custom answers, and more were all
// visible on-screen but silently missing from the export). amountKobo/
// customFieldAnswers/groupAttendees are pre-formatted into readable columns below
// rather than exported as raw kobo/ObjectId-keyed-object/array — see toRow().
const CSV_COLUMNS = [
  '_id', 'type', 'status', 'isActive', 'createdAt', 'registrationMode', 'ticketCategory', 'fullName', 'email', 'phone',
  'organization', 'jobTitle', 'country', 'groupAttendees', 'companyName', 'contactName', 'contactEmail', 'contactPhone',
  'website', 'boothSize', 'productsDescription', 'customFieldAnswers', 'message', 'accessCode', 'discountPercent',
  'paymentStatus', 'amountNaira', 'paidAt', 'paymentReference', 'checkedIn', 'checkedInAt', 'directoryOptIn',
  'tshirtSize', 'trackSelected', 'trackAssigned', 'avatarUrl',
];

export const adminExport = catchAsync(async (req: Request, res: Response) => {
  // page/limit are ignored here on purpose — export always returns every matching row.
  const query = listRegistrationsQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query, req);
  const items = await Registration.find(filter).sort({ createdAt: -1 }).lean();

  // Custom field answers are keyed by CustomFormField _id, not label — look the
  // labels up once so the export reads like the question, not a Mongo id.
  const fieldLabelById = new Map(
    (await CustomFormField.find({ formType: 'exhibitor' }).select('label').lean()).map((f) => [f._id.toString(), f.label])
  );

  const rows = items.map((item) => ({
    ...item,
    groupAttendees: (item.groupAttendees ?? []).map((a) => `${a.fullName ?? ''} <${a.email ?? ''}>`).join('; '),
    customFieldAnswers: item.customFieldAnswers
      ? Object.entries(item.customFieldAnswers)
          .map(([id, value]) => `${fieldLabelById.get(id) ?? id}: ${value}`)
          .join('; ')
      : '',
    amountNaira: typeof item.amountKobo === 'number' ? Math.round(item.amountKobo / 100) : '',
  }));

  const csv = toCsv(rows as unknown as Record<string, unknown>[], CSV_COLUMNS);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="registrations-${Date.now()}.csv"`);
  res.send(csv);
});
