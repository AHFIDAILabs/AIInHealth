import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration } from '../models/Registration.model.js';
import { Speaker } from '../models/Speaker.model.js';
import { Session } from '../models/Session.model.js';
import { DelegatePushSubscription } from '../models/DelegatePushSubscription.model.js';
import { env } from '../config/env.js';
import { setDelegateCookie, clearDelegateCookie } from '../utils/cookies.js';
import { signDelegateSessionToken } from '../services/delegateToken.service.js';
import { qrDataUrlForToken } from '../services/qr.service.js';
import { resendAccessCodeAndTicket } from '../services/registrationNotification.service.js';
import type {
  DelegateLoginInput,
  DelegatePushSubscribeInput,
  DelegatePushUnsubscribeInput,
  UpdateDirectoryOptInInput,
  UpdateDelegateProfileInput,
} from '../validations/delegate.validation.js';

const delegateName = (r: { fullName?: string | null; contactName?: string | null; companyName?: string | null }) =>
  r.fullName || r.contactName || r.companyName || 'there';

const delegateEmail = (r: { email?: string | null; contactEmail?: string | null }) => r.email || r.contactEmail || null;

// POST /delegate/login — email-only portal access, deliberately no code or
// password: a confirmed, active registration matching this email signs
// straight in. This replaces the old two-step request-code/verify-code flow;
// the friction of copying a code out of an email was stopping people from
// bothering to log in at all (and, by extension, from ever generating their
// "I will be attending" share card). loginLimiter below is the real guard
// against abuse now — rate-limited per ip+email, same as the old flow.
export const login = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body as DelegateLoginInput;

  const registration = await Registration.findOne({
    status: 'confirmed',
    isActive: true,
    $or: [{ email }, { contactEmail: email }],
  }).sort({ createdAt: -1 });

  if (!registration) {
    throw new ApiError(404, "We couldn't find a confirmed registration for that email.", 'REGISTRATION_NOT_FOUND');
  }

  const sessionToken = signDelegateSessionToken(registration.id);
  setDelegateCookie(res, sessionToken, env.DELEGATE_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  res.json(new ApiResponse({ ok: true }));
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  clearDelegateCookie(res);
  res.json(new ApiResponse({ ok: true }));
});

export const me = catchAsync(async (req: Request, res: Response) => {
  const registration = await Registration.findById(req.delegate!.registrationId);
  if (!registration) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');

  res.json(
    new ApiResponse({
      id: registration.id,
      type: registration.type,
      name: delegateName(registration),
      email: delegateEmail(registration),
      phone: registration.phone || registration.contactPhone,
      organization: registration.organization || registration.companyName,
      ticketCategory: registration.ticketCategory,
      status: registration.status,
      paymentStatus: registration.paymentStatus,
      checkedIn: registration.checkedIn,
      checkedInAt: registration.checkedInAt,
      hasTicket: Boolean(registration.qrToken),
      directoryOptIn: registration.directoryOptIn,
      avatarUrl: registration.avatarUrl,
      // Volunteer only — admin manages these on RegistrationsPage.tsx, but until
      // now a volunteer had no way to see their own assignment except by asking
      // staff directly.
      tshirtSize: registration.tshirtSize,
      trackSelected: registration.trackSelected,
      trackAssigned: registration.trackAssigned,
    })
  );
});

// GET /delegate/speaker-sessions — "I am speaking at AIHS 2026" card data
// (Batch 3 of the event-extras plan). Speaker has no field of its own
// pointing back at who's logged in; the only reliable link is the one that
// already exists the other way (Speaker.registration), set when
// speaker.controller.ts's adminRegister creates their Registration — so this
// looks itself up via that field rather than ever matching by name/email.
// Returns isSpeaker:false (not an error) for the common case of a delegate
// who simply isn't a speaker at all.
export const speakerSessions = catchAsync(async (req: Request, res: Response) => {
  const speaker = await Speaker.findOne({ registration: req.delegate!.registrationId, isPublished: true });
  if (!speaker) {
    res.json(new ApiResponse({ isSpeaker: false, sessions: [] }));
    return;
  }

  // Moderating counts as "speaking at" for this card's purposes — the brief
  // never distinguished the two, and a moderator is just as much a reason to
  // announce "I'm part of this session" as a listed speaker is.
  const sessions = await Session.find({
    $or: [{ speakers: speaker._id }, { moderator: speaker._id }],
    isPublished: true,
  })
    .select('title day startTime endTime room')
    .sort({ day: 1, startTime: 1 });

  res.json(
    new ApiResponse({
      isSpeaker: true,
      photoUrl: speaker.photoUrl ?? null,
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
      })),
    })
  );
});

export const ticketQr = catchAsync(async (req: Request, res: Response) => {
  const registration = await Registration.findById(req.delegate!.registrationId).select('qrToken');
  if (!registration?.qrToken) throw new ApiError(404, 'No e-ticket available yet', 'NO_TICKET');
  const qrDataUrl = await qrDataUrlForToken(registration.qrToken);
  res.json(new ApiResponse({ qrDataUrl }));
});

// POST /delegate/resend-ticket — an "email me a copy" convenience from inside
// the portal itself (distinct from requestAccessCode, which is the pre-login
// "I lost my code" flow on PortalLogin.tsx) — useful to forward the ticket to
// a personal inbox, or keep a copy for offline access at the door.
export const resendTicket = catchAsync(async (req: Request, res: Response) => {
  const registration = await Registration.findById(req.delegate!.registrationId);
  if (!registration) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  const result = await resendAccessCodeAndTicket(registration);
  if (!result) throw new ApiError(400, 'No email is on file for this registration.', 'NO_EMAIL');
  res.json(new ApiResponse({ ok: true, sentTo: result.to }));
});

// PATCH /delegate/profile — name/phone/organization only (see the validation
// schema's comment on why email is excluded). Field names on Registration differ
// by type (fullName vs contactName, phone vs contactPhone), so this maps the
// generic input onto whichever pair actually applies to this registration.
export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as UpdateDelegateProfileInput;
  const registration = await Registration.findById(req.delegate!.registrationId);
  if (!registration) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');

  const isContactStyle = registration.type === 'exhibitor' || registration.type === 'sponsor';
  if (input.name !== undefined) {
    if (isContactStyle) registration.contactName = input.name;
    else registration.fullName = input.name;
  }
  if (input.phone !== undefined) {
    if (isContactStyle) registration.contactPhone = input.phone;
    else registration.phone = input.phone;
  }
  // Organization is the delegate's own employer/affiliation for attendees and
  // volunteers — for exhibitor/sponsor it's their registered companyName, which
  // stays out of self-service editing (that's their business identity on record).
  if (input.organization !== undefined && !isContactStyle) {
    registration.organization = input.organization;
  }
  // Profile photo — personal, not tied to fullName/contactName, so it applies the
  // same way across every registration type.
  if (input.avatarUrl !== undefined) {
    registration.avatarUrl = input.avatarUrl;
  }

  await registration.save();
  res.json(
    new ApiResponse({
      name: delegateName(registration),
      phone: isContactStyle ? registration.contactPhone : registration.phone,
      organization: registration.organization || registration.companyName,
      avatarUrl: registration.avatarUrl,
    })
  );
});

export const updateDirectoryOptIn = catchAsync(async (req: Request, res: Response) => {
  const { directoryOptIn } = req.body as UpdateDirectoryOptInInput;
  const registration = await Registration.findByIdAndUpdate(
    req.delegate!.registrationId,
    { directoryOptIn },
    { new: true }
  ).select('directoryOptIn');
  if (!registration) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  res.json(new ApiResponse({ directoryOptIn: registration.directoryOptIn }));
});

export const pushSubscribe = catchAsync(async (req: Request, res: Response) => {
  const { endpoint, keys } = req.body as DelegatePushSubscribeInput;
  await DelegatePushSubscription.findOneAndUpdate(
    { endpoint },
    { registration: req.delegate!.registrationId, endpoint, keys },
    { upsert: true, new: true }
  );
  res.status(201).json(new ApiResponse({ ok: true }));
});

export const pushUnsubscribe = catchAsync(async (req: Request, res: Response) => {
  const { endpoint } = req.body as DelegatePushUnsubscribeInput;
  await DelegatePushSubscription.deleteOne({ endpoint, registration: req.delegate!.registrationId });
  res.json(new ApiResponse({ ok: true }));
});

export const pushPublicKey = catchAsync(async (_req: Request, res: Response) => {
  res.json(new ApiResponse({ publicKey: env.VAPID_PUBLIC_KEY, configured: Boolean(env.VAPID_PUBLIC_KEY) }));
});
