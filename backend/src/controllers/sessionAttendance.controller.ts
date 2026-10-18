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
import type { AdminCreateAttendanceTokensInput, ScanAttendanceInput } from '../validations/sessionAttendance.validation.js';

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
  const { registration, memberIndex } = found;

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
    res.json(new ApiResponse({ status: 'already_recorded', attendee, scannedAt: existing.scannedAt }));
    return;
  }

  const record = await SessionAttendanceRecord.create({
    session: sessionId,
    registration: registration.id,
    memberIndex,
    scannedByToken: req.sessionAttendance!.tokenId,
  });

  broadcastAdminEvent('session-attendance.scan', { sessionId, attendee, scannedAt: record.scannedAt });
  res.json(new ApiResponse({ status: 'recorded', attendee, scannedAt: record.scannedAt }));
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

  const { session, tokens } = await createAttendanceTokens(input);

  await recordAudit({
    req,
    action: 'session_attendance.tokens_created',
    resourceType: 'Session',
    resourceId: session.id,
    after: { volunteers: input.volunteers.map((v) => v.name) },
  });

  res.status(201).json(new ApiResponse({ sessionId: session.id, sessionTitle: session.title, tokens }));
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
