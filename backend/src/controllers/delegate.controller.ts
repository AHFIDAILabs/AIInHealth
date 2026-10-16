import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration } from '../models/Registration.model.js';
import { Speaker } from '../models/Speaker.model.js';
import { Session } from '../models/Session.model.js';
import { LeaderboardMeta } from '../models/LeaderboardMeta.model.js';
import { DelegatePushSubscription } from '../models/DelegatePushSubscription.model.js';
import { PortalMessage } from '../models/PortalMessage.model.js';
import { env } from '../config/env.js';
import { setDelegateCookie, clearDelegateCookie } from '../utils/cookies.js';
import { signDelegateSessionToken } from '../services/delegateToken.service.js';
import { qrDataUrlForToken } from '../services/qr.service.js';
import { resendAccessCodeAndTicket } from '../services/registrationNotification.service.js';
import { publicTranslations } from '../utils/translations.js';
import type {
  DelegateLoginInput,
  DelegatePushSubscribeInput,
  DelegatePushUnsubscribeInput,
  UpdateDirectoryOptInInput,
  UpdateLeaderboardOptInInput,
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

  const unreadPortalMessages = await PortalMessage.countDocuments({
    registration: registration._id,
    isRead: false,
  });

  res.json(
    new ApiResponse({
      id: registration.id,
      unreadPortalMessages,
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
      // Self-reported, optional — see GENDERS' own comment on why the portal
      // is one of three chances to catch this. `null` (not omitted) when
      // unset, so the frontend can tell "hasn't answered" from a real value.
      gender: registration.gender ?? null,
      // Lightweight — just ids, so every page that renders a session card
      // (the public Agenda, "Build My Day") can show bookmark state without
      // its own round trip. Full session data for the "My Agenda" portal
      // page itself comes from GET /delegate/bookmarks below.
      bookmarkedSessionIds: (registration.bookmarkedSessions ?? []).map((id) => id.toString()),
      // Gamification — Engagement Score + public Leaderboard. Zero extra
      // query cost: these are already on the doc me() fetches, precomputed
      // by jobs/engagementScore.job.ts on a schedule, never computed here.
      leaderboardOptIn: registration.leaderboardOptIn ?? null,
      leaderboardVisible: registration.leaderboardVisible,
      engagementScore: registration.engagementScore,
      engagementRank: registration.engagementRank ?? null,
      // Volunteer only — admin manages these on RegistrationsPage.tsx, but until
      // now a volunteer had no way to see their own assignment except by asking
      // staff directly.
      tshirtSize: registration.tshirtSize,
      trackSelected: registration.trackSelected,
      trackAssigned: registration.trackAssigned,
      // Exhibitor only — backs the "Visit Our Booth" card (PortalMyCard.tsx).
      // Previously only reachable folded into `organization` above with no
      // way to tell a real company name from an attendee's org field.
      companyName: registration.companyName,
      boothSize: registration.boothSize,
      boothNumber: registration.boothNumber,
      productsDescription: registration.productsDescription,
      website: registration.website,
      logoUrl: registration.logoUrl,
    })
  );
});

// GET /delegate/portal-messages — admin replies delivered into this
// delegate's own portal (contact.controller.ts's adminReply). Marks every
// currently-unread message as read as a side effect of listing them — the
// delegate just saw them, by definition — so there's no separate
// mark-as-read round trip for the frontend to make.
export const portalMessages = catchAsync(async (req: Request, res: Response) => {
  const messages = await PortalMessage.find({ registration: req.delegate!.registrationId }).sort({ createdAt: -1 });

  const unreadIds = messages.filter((m) => !m.isRead).map((m) => m._id);
  if (unreadIds.length > 0) {
    await PortalMessage.updateMany({ _id: { $in: unreadIds } }, { $set: { isRead: true } });
  }

  res.json(
    new ApiResponse(
      messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
      }))
    )
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
  // Same "personal, applies across every type" reasoning as avatarUrl — see
  // GENDERS' own comment on why the portal is one of three chances to ask.
  if (input.gender !== undefined) {
    registration.gender = input.gender;
  }
  // Exhibitor's company logo — always theirs to update, unlike companyName
  // itself (registered business identity, not self-service editable here).
  if (input.logoUrl !== undefined) {
    registration.logoUrl = input.logoUrl;
  }

  await registration.save();
  res.json(
    new ApiResponse({
      name: delegateName(registration),
      phone: isContactStyle ? registration.contactPhone : registration.phone,
      organization: registration.organization || registration.companyName,
      avatarUrl: registration.avatarUrl,
      gender: registration.gender ?? null,
      logoUrl: registration.logoUrl,
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

// Mirrors session.controller.ts's public list() field selection exactly —
// kept as its own copy (not imported) since that module doesn't export
// these, same decoupling tradeoff as sanitizeAbstractHtml.ts's two copies.
const SPEAKER_FIELDS = 'fullName title photoUrl';
const PARTNER_FIELDS = 'name logoUrl website';

// POST /delegate/sessions/:id/bookmark — $addToSet is idempotent: bookmarking
// an already-bookmarked session is a harmless no-op, not an error (a toggle
// button firing twice from a slow network shouldn't surface anything to the
// delegate). 404s on an unpublished/nonexistent session rather than silently
// "succeeding" — nothing to actually save otherwise.
export const bookmarkSession = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  const session = await Session.findOne({ _id: req.params.id, isPublished: true }).select('_id');
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  await Registration.updateOne({ _id: req.delegate!.registrationId }, { $addToSet: { bookmarkedSessions: session._id } });
  res.json(new ApiResponse({ ok: true }));
});

// DELETE /delegate/sessions/:id/bookmark — $pull is equally idempotent;
// un-bookmarking something that was never bookmarked (or no longer exists)
// is just as much a no-op success as removing it for real.
export const unbookmarkSession = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  await Registration.updateOne({ _id: req.delegate!.registrationId }, { $pull: { bookmarkedSessions: req.params.id } });
  res.json(new ApiResponse({ ok: true }));
});

// GET /delegate/bookmarks — full session data (not just the ids `me()`
// carries) for the "My Agenda" portal page and its "download my schedule"
// .ics export, neither of which can render anything useful from an id alone.
// isPublished:true again here — a since-unpublished session just quietly
// drops off this list, same as it would from the public Agenda.
export const bookmarks = catchAsync(async (req: Request, res: Response) => {
  const registration = await Registration.findById(req.delegate!.registrationId).select('bookmarkedSessions');
  if (!registration) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');

  const sessions = await Session.find({ _id: { $in: registration.bookmarkedSessions ?? [] }, isPublished: true })
    .select('-rsvpList')
    .sort({ day: 1, startTime: 1 })
    .populate({ path: 'speakers', select: SPEAKER_FIELDS, match: { isPublished: true } })
    .populate({ path: 'moderator', select: SPEAKER_FIELDS, match: { isPublished: true } })
    .populate({ path: 'partners', select: PARTNER_FIELDS, match: { isPublished: true } })
    .populate('tracks', 'name color');
  const sanitized = sessions.map((s) => ({ ...s.toObject(), translations: publicTranslations(s.translations) }));
  res.json(new ApiResponse(sanitized));
});

// PATCH /delegate/leaderboard-opt-in — exact mirror of updateDirectoryOptIn
// above. The actual visibility decision (team exclusion, sensitive-category
// default, this flag's override) is resolved server-side by
// utils/engagementScoring.ts's resolveLeaderboardVisibility, run inside
// jobs/engagementScore.job.ts — this endpoint only ever records the
// delegate's own explicit choice, it never computes visibility itself.
export const updateLeaderboardOptIn = catchAsync(async (req: Request, res: Response) => {
  const { leaderboardOptIn } = req.body as UpdateLeaderboardOptInInput;
  const registration = await Registration.findByIdAndUpdate(
    req.delegate!.registrationId,
    { leaderboardOptIn },
    { new: true }
  ).select('leaderboardOptIn');
  if (!registration) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  res.json(new ApiResponse({ leaderboardOptIn: registration.leaderboardOptIn }));
});

// GET /delegate/leaderboard — the Portal's public Engagement Score board.
// Both queries below are cheap and indexed; no live aggregation ever runs on
// this read path — the only aggregate-shaped work in this whole feature is
// jobs/engagementScore.job.ts's scheduled recompute, which already wrote
// every field this endpoint reads.
export const leaderboard = catchAsync(async (req: Request, res: Response) => {
  const [meta, top, you] = await Promise.all([
    LeaderboardMeta.findOne().select('lastComputedAt'),
    Registration.find({ leaderboardVisible: true })
      .sort({ engagementRank: 1 })
      .limit(50)
      .select('fullName contactName companyName organization avatarUrl engagementScore engagementRank engagementBadges'),
    Registration.findById(req.delegate!.registrationId).select(
      'engagementScore engagementRank engagementBreakdown engagementBadges previousEngagementRank leaderboardVisible leaderboardOptIn ticketCategory type'
    ),
  ]);

  if (!you) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');

  res.json(
    new ApiResponse({
      computedAt: meta?.lastComputedAt ?? null,
      top: top.map((r) => ({
        id: r.id,
        name: delegateName(r),
        organization: r.organization || r.companyName || null,
        avatarUrl: r.avatarUrl ?? null,
        score: r.engagementScore,
        rank: r.engagementRank,
        badges: r.engagementBadges ?? [],
        isYou: r.id === req.delegate!.registrationId,
      })),
      you: {
        rank: you.engagementRank ?? null,
        score: you.engagementScore,
        breakdown: you.engagementBreakdown ?? { checkIn: 0, meetings: 0, bookmarks: 0, profile: 0 },
        badges: you.engagementBadges ?? [],
        previousRank: you.previousEngagementRank ?? null,
        visible: you.leaderboardVisible,
        leaderboardOptIn: you.leaderboardOptIn ?? null,
        ticketCategory: you.ticketCategory,
        type: you.type,
      },
    })
  );
});
