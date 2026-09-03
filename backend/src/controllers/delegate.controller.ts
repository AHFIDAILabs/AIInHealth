import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration } from '../models/Registration.model.js';
import { DelegatePushSubscription } from '../models/DelegatePushSubscription.model.js';
import { env } from '../config/env.js';
import { setDelegateCookie, clearDelegateCookie } from '../utils/cookies.js';
import { issueMagicLinkToken, consumeMagicLinkToken, signDelegateSessionToken } from '../services/delegateToken.service.js';
import { sendDelegateMagicLinkEmail } from '../services/email.service.js';
import { qrDataUrlForToken } from '../services/qr.service.js';
import type {
  RequestMagicLinkInput,
  VerifyMagicLinkInput,
  DelegatePushSubscribeInput,
  DelegatePushUnsubscribeInput,
  UpdateDirectoryOptInInput,
  UpdateDelegateProfileInput,
} from '../validations/delegate.validation.js';

const delegateName = (r: { fullName?: string | null; contactName?: string | null; companyName?: string | null }) =>
  r.fullName || r.contactName || r.companyName || 'there';

const delegateEmail = (r: { email?: string | null; contactEmail?: string | null }) => r.email || r.contactEmail || null;

export const requestMagicLink = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body as RequestMagicLinkInput;

  const registration = await Registration.findOne({
    status: 'confirmed',
    $or: [{ email }, { contactEmail: email }],
  }).sort({ createdAt: -1 });

  if (registration) {
    const to = delegateEmail(registration);
    if (to) {
      const rawToken = await issueMagicLinkToken(registration.id);
      const linkUrl = `${env.FRONTEND_ORIGIN}/portal/verify?token=${rawToken}`;
      await sendDelegateMagicLinkEmail(to, delegateName(registration), linkUrl);
      registration.portalLastLinkSentAt = new Date();
      await registration.save();
    }
  }

  // Enumeration-safe: identical response whether or not a confirmed registration exists.
  res.json(new ApiResponse({ message: 'If that email has a confirmed registration, a sign-in link has been sent.' }));
});

export const verifyMagicLink = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.body as VerifyMagicLinkInput;
  const registrationId = await consumeMagicLinkToken(token);

  const sessionToken = signDelegateSessionToken(registrationId);
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
    })
  );
});

export const ticketQr = catchAsync(async (req: Request, res: Response) => {
  const registration = await Registration.findById(req.delegate!.registrationId).select('qrToken');
  if (!registration?.qrToken) throw new ApiError(404, 'No e-ticket available yet', 'NO_TICKET');
  const qrDataUrl = await qrDataUrlForToken(registration.qrToken);
  res.json(new ApiResponse({ qrDataUrl }));
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
