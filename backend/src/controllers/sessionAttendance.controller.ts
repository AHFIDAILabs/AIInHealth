import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Session } from '../models/Session.model.js';
import { Registration } from '../models/Registration.model.js';
import { SessionAttendanceToken } from '../models/SessionAttendanceToken.model.js';
import { SessionAttendanceRecord } from '../models/SessionAttendanceRecord.model.js';
import { createAttendanceTokens } from '../services/sessionAttendanceToken.service.js';
import { recordAudit } from '../services/audit.service.js';
import { broadcastAdminEvent } from '../sockets/adminNamespace.js';
import type {
  AdminCreateAttendanceTokensInput,
  ScanAttendanceInput,
  ManualRecordAttendanceInput,
} from '../validations/sessionAttendance.validation.js';

interface SessionLike {
  _id: unknown;
  title: string;
  day: string;
  startTime: string;
  room: string;
}

// Deliberately a standalone lookup, not imported from checkin.controller.ts —
// that controller's `scan` is the live main-entrance check-in path running
// all night before the event; duplicating this ~15-line read here keeps this
// brand-new feature from being able to affect that one in any way, at the
// cost of a small amount of repetition. Unlike check-in's atomic
// findOneAndUpdate (which flips a one-time checkedIn flag), this is a plain
// read — session attendance can be scanned again at a different room without
// conflicting with "already checked in at the door."
const findRegistrationByQrToken = async (
  qrToken: string
): Promise<{ registration: InstanceType<typeof Registration>; memberIndex?: number } | null> => {
  const registration = await Registration.findOne({
    $or: [{ qrToken }, { 'groupAttendees.qrToken': qrToken }],
    status: 'confirmed',
    isActive: true,
  });
  if (!registration) return null;
  const memberIndex = registration.qrToken === qrToken ? undefined : registration.groupAttendees?.findIndex((m) => m.qrToken === qrToken);
  return { registration, memberIndex: memberIndex === -1 ? undefined : memberIndex };
};

const personName = (registration: InstanceType<typeof Registration>, memberIndex?: number): string => {
  if (memberIndex !== undefined) return registration.groupAttendees?.[memberIndex]?.fullName || 'Group member';
  return registration.fullName || registration.contactName || registration.companyName || 'Unknown';
};

// --- Public, token-scoped (no admin cookie — req.sessionAttendance comes
// from requireSessionAttendanceToken) ---

// GET /:token — the volunteer's landing info: which room/session they're
// scanning for, plus the running count so the page shows something useful
// even before their first scan.
export const getSessionInfo = catchAsync(async (req: Request, res: Response) => {
  const session = await Session.findById(req.sessionAttendance!.sessionId).select('title day startTime room').lean();
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  const count = await SessionAttendanceRecord.countDocuments({ session: session._id });

  res.json(
    new ApiResponse({
      session: { _id: session._id, title: session.title, day: session.day, startTime: session.startTime, room: session.room },
      volunteerName: req.sessionAttendance!.volunteerName,
      count,
    })
  );
});

// Shared by scan() and manualRecord() below — looks up (or confirms) the
// existing record first, same as before, but now also tolerates losing a
// race to a second simultaneous scan of the same person: the unique index on
// {session, registration, memberIndex} is the real guarantee against a
// duplicate row, and a create() that loses that race no longer bubbles up as
// a raw 409/500 — it's re-read and returned as the same friendly
// 'already_recorded' response a sequential duplicate scan would get. Two
// volunteers' phones catching the same badge at the same instant is exactly
// the scenario this room's "two attendance-takers" staffing plan invites.
const recordAttendance = async (
  sessionId: string,
  registration: InstanceType<typeof Registration>,
  memberIndex: number | undefined,
  scannedByToken: string
) => {
  const attendee = {
    name: personName(registration, memberIndex),
    organization: registration.organization || registration.companyName || undefined,
    ticketCategory: registration.ticketCategory ?? undefined,
  };

  const existing = await SessionAttendanceRecord.findOne({
    session: sessionId,
    registration: registration.id,
    memberIndex: memberIndex ?? null,
  });
  if (existing) {
    return { status: 'already_recorded' as const, attendee, scannedAt: existing.scannedAt };
  }

  try {
    const record = await SessionAttendanceRecord.create({
      session: sessionId,
      registration: registration.id,
      memberIndex,
      scannedByToken,
    });
    broadcastAdminEvent('session-attendance.scan', { sessionId, attendee, scannedAt: record.scannedAt });
    return { status: 'recorded' as const, attendee, scannedAt: record.scannedAt };
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    // Lost the race — someone else's request inserted the same
    // (session, registration, memberIndex) a moment earlier.
    const winner = await SessionAttendanceRecord.findOne({ session: sessionId, registration: registration.id, memberIndex: memberIndex ?? null });
    return { status: 'already_recorded' as const, attendee, scannedAt: winner?.scannedAt ?? new Date() };
  }
};

// POST /:token/scan — body: { qrToken }. Idempotent: scanning the same
// person into the same room twice returns 'already_recorded' instead of a
// duplicate row or an error — a volunteer re-scanning by accident (or two
// volunteers' phones both catching the same badge) shouldn't produce a
// confusing failure.
export const scan = catchAsync(async (req: Request, res: Response) => {
  const { qrToken } = req.body as ScanAttendanceInput;
  const sessionId = req.sessionAttendance!.sessionId;

  const found = await findRegistrationByQrToken(qrToken);
  if (!found) throw new ApiError(404, "That QR code doesn't match any confirmed registration.", 'NOT_FOUND');

  const result = await recordAttendance(sessionId, found.registration, found.memberIndex, req.sessionAttendance!.tokenId);
  res.json(new ApiResponse(result));
});

// GET /:token/search?q= — manual fallback when a badge's QR genuinely won't
// scan (bad print, damaged badge, poor lighting) — same shape as
// checkin.controller.ts's search, but deliberately a separate, standalone
// query (not a shared import) for the same reason findRegistrationByQrToken
// above is: this brand-new, still-being-proven feature should never be able
// to affect the live main-entrance desk's own code, even by accident.
export const searchAttendees = catchAsync(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) {
    res.json(new ApiResponse([]));
    return;
  }
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const items = await Registration.find({
    status: 'confirmed',
    isActive: true,
    $or: [
      { fullName: rx },
      { email: rx },
      { contactName: rx },
      { companyName: rx },
      { 'groupAttendees.fullName': rx },
      { 'groupAttendees.email': rx },
    ],
  })
    .limit(30)
    .lean();

  const rows: { id: string; name: string; organization?: string; memberIndex?: number }[] = [];
  for (const r of items) {
    if (rx.test(r.fullName ?? '') || rx.test(r.email ?? '') || rx.test(r.contactName ?? '') || rx.test(r.companyName ?? '')) {
      rows.push({ id: String(r._id), name: r.fullName || r.contactName || r.companyName || 'Unknown', organization: (r.organization || r.companyName) ?? undefined });
    }
    (r.groupAttendees ?? []).forEach((m, i) => {
      if (rx.test(m.fullName ?? '') || rx.test(m.email ?? '')) {
        rows.push({ id: String(r._id), name: m.fullName || 'Group member', organization: (r.organization || r.companyName) ?? undefined, memberIndex: i });
      }
    });
    if (rows.length >= 15) break;
  }

  res.json(new ApiResponse(rows.slice(0, 15)));
});

// POST /:token/manual — body: { registrationId, memberIndex? }. The actual
// record-attendance step once a volunteer has found the right person via
// search() above — same recordAttendance() helper and same
// recorded/already_recorded shape as a real scan, so the frontend doesn't
// need to know which path produced the result.
export const manualRecord = catchAsync(async (req: Request, res: Response) => {
  const { registrationId, memberIndex } = req.body as ManualRecordAttendanceInput;
  if (!isValidObjectId(registrationId)) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  const sessionId = req.sessionAttendance!.sessionId;

  const registration = await Registration.findOne({ _id: registrationId, status: 'confirmed', isActive: true });
  if (!registration) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  if (memberIndex !== undefined && !registration.groupAttendees?.[memberIndex]) {
    throw new ApiError(404, 'Group member not found', 'NOT_FOUND');
  }

  const result = await recordAttendance(sessionId, registration, memberIndex, req.sessionAttendance!.tokenId);
  res.json(new ApiResponse(result));
});

// --- Admin-side ---

// GET /admin/session-attendance/sessions — every session with its assigned
// volunteer tokens and current scan count, for the admin page's one list view.
export const adminListSessions = catchAsync(async (_req: Request, res: Response) => {
  const [sessions, tokens, counts] = await Promise.all([
    Session.find().select('title day startTime room').sort({ day: 1, startTime: 1 }).lean(),
    SessionAttendanceToken.find().select('session volunteerName volunteerEmail revoked lastUsedAt').lean(),
    SessionAttendanceRecord.aggregate([{ $group: { _id: '$session', count: { $sum: 1 } } }]),
  ]);

  const tokensBySession = new Map<string, typeof tokens>();
  for (const t of tokens) {
    const key = t.session.toString();
    if (!tokensBySession.has(key)) tokensBySession.set(key, []);
    tokensBySession.get(key)!.push(t);
  }
  const countBySession = new Map(counts.map((c) => [c._id.toString(), c.count as number]));

  res.json(
    new ApiResponse(
      sessions.map((s) => ({
        sessionId: s._id,
        title: s.title,
        day: s.day,
        startTime: s.startTime,
        room: s.room,
        scannedCount: countBySession.get(s._id.toString()) ?? 0,
        tokens: (tokensBySession.get(s._id.toString()) ?? []).map((t) => ({
          tokenId: t._id,
          volunteerName: t.volunteerName,
          volunteerEmail: t.volunteerEmail,
          revoked: t.revoked,
          lastUsedAt: t.lastUsedAt,
        })),
      }))
    )
  );
});

export const adminCreateTokens = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as AdminCreateAttendanceTokensInput;
  if (!isValidObjectId(input.sessionId)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  const { session, tokens } = await createAttendanceTokens({ ...input, createdByUserId: req.user!.sub });

  await recordAudit({
    req,
    action: 'session_attendance.tokens_created',
    resourceType: 'Session',
    resourceId: session.id,
    after: { volunteers: input.volunteers.map((v) => v.name) },
  });

  res.status(201).json(new ApiResponse({ sessionId: session.id, sessionTitle: session.title, tokens }));
});

// GET /admin/session-attendance/search-volunteers?q= — a standalone search
// over confirmed volunteer registrations, deliberately NOT a reuse of
// checkin.controller.ts's search (that one is the live main-entrance desk's
// manual-fallback lookup, running all night before the event — this feature
// stays fully separate from it, same reasoning as findRegistrationByQrToken
// above). Also deliberately returns email (checkin's search doesn't) since
// that's the whole point here: picking a known volunteer auto-fills who to
// deliver the link to.
export const adminSearchVolunteers = catchAsync(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) {
    res.json(new ApiResponse([]));
    return;
  }
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const volunteers = await Registration.find({
    type: 'volunteer',
    status: 'confirmed',
    isActive: true,
    $or: [{ fullName: rx }, { email: rx }],
  })
    .select('fullName email organization')
    .limit(15)
    .lean();

  res.json(
    new ApiResponse(
      volunteers.map((v) => ({ registrationId: v._id, name: v.fullName, email: v.email, organization: v.organization }))
    )
  );
});

export const adminRevokeToken = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Link not found', 'NOT_FOUND');
  const token = await SessionAttendanceToken.findById(req.params.id);
  if (!token) throw new ApiError(404, 'Link not found', 'NOT_FOUND');

  token.revoked = true;
  token.revokedAt = new Date();
  await token.save();

  await recordAudit({
    req,
    action: 'session_attendance.token_revoked',
    resourceType: 'SessionAttendanceToken',
    resourceId: token.id,
  });

  res.json(new ApiResponse({ ok: true }));
});

// GET /admin/session-attendance/sessions/:id/export — CSV of exactly who was
// scanned into this one session, for a post-event per-room attendance record.
export const adminExportSession = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  const session = await Session.findById(req.params.id).select('title day startTime room').lean<SessionLike>();
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  const records = await SessionAttendanceRecord.find({ session: session._id })
    .populate<{ registration: InstanceType<typeof Registration> }>('registration', 'fullName contactName companyName email organization groupAttendees')
    .sort({ scannedAt: 1 })
    .lean();

  const csvEscape = (value: string): string =>
    value.includes(',') || value.includes('"') || value.includes('\n') ? `"${value.replace(/"/g, '""')}"` : value;

  const rows = ['name,email,organization,scanned_at'];
  for (const r of records as unknown as { registration: InstanceType<typeof Registration>; memberIndex?: number; scannedAt: Date }[]) {
    const member = r.memberIndex !== undefined ? r.registration.groupAttendees?.[r.memberIndex] : undefined;
    const name = member?.fullName || r.registration.fullName || r.registration.contactName || r.registration.companyName || 'Unknown';
    const email = member?.email || r.registration.email || '';
    const organization = r.registration.organization || r.registration.companyName || '';
    rows.push([csvEscape(name), csvEscape(email), csvEscape(organization), r.scannedAt.toISOString()].join(','));
  }

  const filename = `attendance-${session.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(rows.join('\n') + '\n');
});
