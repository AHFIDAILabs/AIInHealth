import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Session, type SessionDoc } from '../models/Session.model.js';
import { Registration } from '../models/Registration.model.js';
import {
  createSessionSchema,
  updateSessionSchema,
  listSessionsQuerySchema,
  checkConflictSchema,
  addRsvpSchema,
  removeRsvpParamsSchema,
  publicRsvpSchema,
  type ListSessionsQuery,
} from '../validations/session.validation.js';
import { recordAudit } from '../services/audit.service.js';

const SPEAKER_FIELDS = 'fullName title photoUrl';
const PARTNER_FIELDS = 'name logoUrl website';

// GET /sessions — public, published only. rsvpList holds real attendee emails and
// is never sent here — requiresRsvp/maxAttendees stay visible (just numbers/flags,
// needed so the public agenda knows to render the RSVP badge) but the list itself
// is admin-only (see adminList below, which is left unstripped).
export const list = catchAsync(async (req: Request, res: Response) => {
  const day = typeof req.query.day === 'string' ? req.query.day : undefined;
  const track = typeof req.query.track === 'string' ? req.query.track : undefined;
  const filter: FilterQuery<SessionDoc> = { isPublished: true, ...(day ? { day } : {}), ...(track ? { track } : {}) };
  // match: isPublished:true on the speakers populate — without it, a session
  // correctly gated on its OWN isPublished still exposed every attached
  // speaker's name/photo regardless of that speaker's own publish state (a
  // withdrawn/not-yet-approved speaker would still show up here even though
  // they never appear on /speakers).
  const sessions = await Session.find(filter)
    .select('-rsvpList')
    .sort({ day: 1, startTime: 1 })
    .populate({ path: 'speakers', select: SPEAKER_FIELDS, match: { isPublished: true } })
    .populate({ path: 'partners', select: PARTNER_FIELDS, match: { isPublished: true } })
    .populate('track', 'name color');
  res.json(new ApiResponse(sessions));
});

const buildAdminFilter = (query: ListSessionsQuery): FilterQuery<SessionDoc> => {
  const filter: FilterQuery<SessionDoc> = {};
  if (query.day) filter.day = query.day;
  if (query.track) filter.track = query.track;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { room: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listSessionsQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Session.find(filter)
      .sort({ day: 1, startTime: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate('speakers', SPEAKER_FIELDS)
      .populate('partners', PARTNER_FIELDS)
      .populate('track', 'name color'),
    Session.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

const timeRangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean =>
  aStart < bEnd && bStart < aEnd;

const findConflicts = async (day: string, room: string, startTime: string, endTime: string, excludeId?: string) => {
  const candidates = await Session.find({
    day,
    room,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).select('title startTime endTime room');
  return candidates.filter((s) => timeRangesOverlap(startTime, endTime, s.startTime, s.endTime));
};

export const checkConflict = catchAsync(async (req: Request, res: Response) => {
  const { day, room, startTime, endTime, excludeId } = checkConflictSchema.parse({ body: req.body }).body;
  const conflicts = await findConflicts(day, room, startTime, endTime, excludeId);
  res.json(new ApiResponse({ hasConflict: conflicts.length > 0, conflicts }));
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createSessionSchema.parse({ body: req.body }).body;
  const conflicts = await findConflicts(input.day, input.room, input.startTime, input.endTime);
  const session = await Session.create(input);
  await session.populate('speakers', SPEAKER_FIELDS);
  await session.populate('partners', PARTNER_FIELDS);
  const populated = await session.populate('track', 'name color');
  await recordAudit({ req, action: 'session.created', resourceType: 'Session', resourceId: session.id, after: session.toObject() });
  res.status(201).json(new ApiResponse(populated, { conflicts }));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  const input = updateSessionSchema.parse({ body: req.body }).body;

  let conflicts: Awaited<ReturnType<typeof findConflicts>> = [];
  if (input.day && input.room && input.startTime && input.endTime) {
    conflicts = await findConflicts(input.day, input.room, input.startTime, input.endTime, req.params.id);
  }

  const before = await Session.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  // Cross-field check createSessionSchema's superRefine can't run here — this
  // is a .partial() patch, so a request that only sends `maxAttendees` (or only
  // `requiresRsvp`) must be checked against the session's CURRENT other value,
  // not just whatever this one request happens to include.
  const effectiveRequiresRsvp = input.requiresRsvp ?? before.requiresRsvp;
  const effectiveMaxAttendees = input.maxAttendees ?? before.maxAttendees;
  if (effectiveRequiresRsvp && !effectiveMaxAttendees) {
    throw new ApiError(422, 'Set a maximum number of attendees for an RSVP session.', 'VALIDATION_ERROR');
  }

  const session = await Session.findByIdAndUpdate(req.params.id, input, { new: true })
    .populate('speakers', SPEAKER_FIELDS)
    .populate('partners', PARTNER_FIELDS)
    .populate('track', 'name color');
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'session.updated',
    resourceType: 'Session',
    resourceId: session.id,
    before: before.toObject(),
    after: session.toObject(),
  });
  res.json(new ApiResponse(session, { conflicts }));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  const session = await Session.findByIdAndDelete(req.params.id);
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'session.deleted', resourceType: 'Session', resourceId: req.params.id, before: session.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});

// POST /admin/sessions/:id/rsvp — add one or many emails to the RSVP allow-list.
// Deliberately NOT capped by maxAttendees: the cap only ever blocks the public
// self-service claim path (publicRsvp below) — an admin can always add a VIP,
// even past capacity, per the product decision this was built against.
export const adminAddRsvp = catchAsync(async (req: Request, res: Response) => {
  const { params, body } = addRsvpSchema.parse({ params: req.params, body: req.body });
  const before = await Session.findById(params.id);
  if (!before) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  const existing = new Set(before.rsvpList.map((r) => r.email));
  const toAdd = [...new Set(body.emails)].filter((email) => !existing.has(email));

  if (toAdd.length > 0) {
    before.rsvpList.push(...toAdd.map((email) => ({ email, source: 'admin' as const, addedAt: new Date() })));
    await before.save();
    await recordAudit({
      req,
      action: 'session.rsvp_added',
      resourceType: 'Session',
      resourceId: before.id,
      after: { added: toAdd },
    });
  }

  await before.populate('speakers', SPEAKER_FIELDS);
  await before.populate('partners', PARTNER_FIELDS);
  const session = await before.populate('track', 'name color');
  res.status(201).json(new ApiResponse(session));
});

// DELETE /admin/sessions/:id/rsvp/:email — remove a single entry, admin or self.
export const adminRemoveRsvp = catchAsync(async (req: Request, res: Response) => {
  const { params } = removeRsvpParamsSchema.parse({ params: req.params });
  const session = await Session.findByIdAndUpdate(
    params.id,
    { $pull: { rsvpList: { email: params.email } } },
    { new: true }
  )
    .populate('speakers', SPEAKER_FIELDS)
    .populate('partners', PARTNER_FIELDS)
    .populate('track', 'name color');
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'session.rsvp_removed', resourceType: 'Session', resourceId: session.id, before: { email: params.email } });
  res.json(new ApiResponse(session));
});

// A self-service claim is gated to actual registered attendees — anyone can
// otherwise type an arbitrary email into the public modal and claim a limited
// seat. Admin-added entries (adminAddRsvp above) are exempt on purpose: staff
// explicitly vouching for a VIP by email is a different trust level than an
// anonymous visitor claiming their own spot. 'confirmed' specifically (not just
// "has a Registration doc") — a still-pending application isn't a real attendee
// yet, matching how payment/check-in already treat 'confirmed' as the real
// attendee status.
const isRegisteredAttendee = async (email: string): Promise<boolean> =>
  Registration.exists({ $or: [{ email }, { contactEmail: email }], status: 'confirmed' }).then(Boolean);

// POST /sessions/:id/rsvp — public. A pure self-service claim: already-on-the-list
// is a no-op confirmation, a fresh email under the cap gets added right here, and
// a fresh email at/over the cap is turned away. The push is done as one atomic
// conditional update (rather than read-then-write) so two visitors racing for the
// last seat can't both get confirmed past maxAttendees.
export const publicRsvp = catchAsync(async (req: Request, res: Response) => {
  const { params, body } = publicRsvpSchema.parse({ params: req.params, body: req.body });

  const session = await Session.findOne({ _id: params.id, requiresRsvp: true, isPublished: true }).select(
    'rsvpList maxAttendees'
  );
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  if (session.rsvpList.some((r) => r.email === body.email)) {
    res.json(new ApiResponse({ status: 'already_rsvpd', message: "You're already on the list for this session — see you there!" }));
    return;
  }

  if (!(await isRegisteredAttendee(body.email))) {
    throw new ApiError(
      403,
      "This session is for confirmed Summit registrants only. Register (or complete payment) with this email first, then come back to RSVP.",
      'RSVP_NOT_REGISTERED'
    );
  }

  const result = await Session.updateOne(
    {
      _id: params.id,
      requiresRsvp: true,
      'rsvpList.email': { $ne: body.email },
      $expr: { $lt: [{ $size: '$rsvpList' }, '$maxAttendees'] },
    },
    { $push: { rsvpList: { email: body.email, source: 'self', addedAt: new Date() } } }
  );

  if (result.modifiedCount !== 1) {
    throw new ApiError(422, 'This session has reached capacity.', 'RSVP_FULL');
  }

  res.status(201).json(new ApiResponse({ status: 'confirmed', message: "You're RSVP'd! See you there." }));
});
