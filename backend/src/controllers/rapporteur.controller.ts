import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { Session } from '../models/Session.model.js';
import { SessionReport } from '../models/SessionReport.model.js';
import { RapporteurAccessToken } from '../models/RapporteurAccessToken.model.js';
import { createRapporteurAssignment } from '../services/rapporteurToken.service.js';
import { draftSessionReportPolish } from '../services/ai/rapporteurPolish.service.js';
import { transcribeAudio } from '../services/ai/whisper.service.js';
import { sendRapporteurAssignmentEmail } from '../services/email.service.js';
import { recordAudit } from '../services/audit.service.js';
import { broadcastAdminEvent } from '../sockets/adminNamespace.js';
import type { AutosaveReportInput, AdminAssignRapporteurInput, AdminUpdateReportInput } from '../validations/rapporteur.validation.js';

interface SessionLike {
  _id: unknown;
  title: string;
  day: string;
  startTime: string;
  room: string;
}

// Structural, not InstanceType<typeof SessionReport> — the callers below pass
// documents fetched via different .populate() chains, each of which produces
// its own distinct Document generic type; this only needs to read a few
// fields, not match any one of those types exactly.
interface ReportLike {
  id?: string;
  status: string;
  aiPolishedStatus?: string | null;
  rapporteurName?: string | null;
}

const broadcastReportUpdate = (report: ReportLike, session: SessionLike): void => {
  broadcastAdminEvent('rapporteur-report-updated', {
    reportId: report.id,
    sessionId: String(session._id),
    sessionTitle: session.title,
    status: report.status,
    aiPolishedStatus: report.aiPolishedStatus ?? null,
    rapporteurName: report.rapporteurName,
    updatedAt: new Date(),
  });
};

// --- Token-scoped (no admin cookie at all — req.rapporteur comes from
// requireRapporteurToken) ---

export const getReport = catchAsync(async (req: Request, res: Response) => {
  const report = await SessionReport.findById(req.rapporteur!.reportId).populate<{ session: SessionLike }>(
    'session',
    'title day startTime room'
  );
  if (!report) throw new ApiError(404, 'Report not found', 'NOT_FOUND');

  res.json(
    new ApiResponse({
      reportId: report.id,
      session: report.session,
      rapporteurName: report.rapporteurName,
      keyPoints: report.keyPoints,
      decisions: report.decisions,
      actionItems: report.actionItems,
      notableQuotes: report.notableQuotes,
      status: report.status,
      submittedAt: report.submittedAt,
      updatedAt: report.updatedAt,
    })
  );
});

// PATCH — a partial autosave patch; any field present replaces that field
// wholesale (the client always sends its full current array for that field).
// Blocked once submitted — a submitted report's structured content is edited
// by an admin from the Review Queue instead, not by the rapporteur reopening
// their old link.
export const autosave = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as AutosaveReportInput;
  const report = await SessionReport.findById(req.rapporteur!.reportId);
  if (!report) throw new ApiError(404, 'Report not found', 'NOT_FOUND');
  if (report.status === 'submitted') {
    throw new ApiError(400, 'This report has already been submitted and can no longer be edited here.', 'ALREADY_SUBMITTED');
  }

  if (body.keyPoints !== undefined) report.keyPoints = body.keyPoints;
  if (body.decisions !== undefined) report.decisions = body.decisions;
  if (body.actionItems !== undefined) report.actionItems = body.actionItems as typeof report.actionItems;
  if (body.notableQuotes !== undefined) report.notableQuotes = body.notableQuotes as typeof report.notableQuotes;
  await report.save();

  res.json(new ApiResponse({ reportId: report.id, savedAt: new Date() }));
});

// POST /:token/submit — flips status to 'submitted' and fires the one Groq
// call this feature makes per assignment. AI polish failure must never block
// the submission itself — the rapporteur's job (getting notes in) is done the
// moment this returns 200 regardless of whether the AI step succeeded.
export const submit = catchAsync(async (req: Request, res: Response) => {
  const report = await SessionReport.findById(req.rapporteur!.reportId).populate<{ session: SessionLike }>(
    'session',
    'title day startTime room'
  );
  if (!report) throw new ApiError(404, 'Report not found', 'NOT_FOUND');
  if (report.status === 'submitted') {
    throw new ApiError(409, 'This report has already been submitted.', 'ALREADY_SUBMITTED');
  }

  report.status = 'submitted';
  report.submittedAt = new Date();

  try {
    const summary = await draftSessionReportPolish({
      sessionTitle: report.session.title,
      keyPoints: report.keyPoints,
      decisions: report.decisions,
      actionItems: report.actionItems,
      notableQuotes: report.notableQuotes,
    });
    report.aiPolishedSummary = summary;
    report.aiPolishedStatus = 'draft';
    report.aiPolishedAt = new Date();
    report.aiPolishError = undefined;
  } catch (err) {
    report.aiPolishError = err instanceof Error ? err.message : 'AI polish failed';
  }

  await report.save();
  broadcastReportUpdate(report, report.session);

  res.json(
    new ApiResponse({
      reportId: report.id,
      status: report.status,
      aiPolishedStatus: report.aiPolishedStatus ?? null,
      aiPolishError: report.aiPolishError ?? null,
    })
  );
});

// POST /:token/quotes/transcribe — Stage 2, Layer 2 "Capture This Quote".
// Deliberately does NOT touch notableQuotes itself — it only transcribes and
// hands the text back. The rapporteur reviews/edits it client-side, then it
// reaches notableQuotes through the existing autosave PATCH above (with
// capturedViaAudio: true), the same single write path every other field
// already uses. The uploaded buffer is never persisted anywhere — it's handed
// to Groq and discarded the moment transcribeAudio returns.
export const transcribeQuote = catchAsync(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw new ApiError(422, 'No audio file received.', 'VALIDATION_ERROR');

  const text = await transcribeAudio({
    feature: 'rapporteur-quote-capture',
    buffer: file.buffer,
    filename: file.originalname || 'quote.webm',
    mimeType: file.mimetype,
  });

  res.json(new ApiResponse({ text }));
});

// --- Admin-side ---

// GET /admin/rapporteur/sessions — every session with its assignment (if any),
// so the Assign tab can show a single picker that already reflects who's
// covering what rather than risking a duplicate assignment.
export const adminListAssignableSessions = catchAsync(async (_req: Request, res: Response) => {
  const [sessions, reports] = await Promise.all([
    Session.find().select('title day startTime room').sort({ day: 1, startTime: 1 }).lean(),
    SessionReport.find().select('session rapporteurName rapporteurEmail status').lean(),
  ]);
  const reportBySession = new Map(reports.map((r) => [r.session.toString(), r]));

  res.json(
    new ApiResponse(
      sessions.map((s) => {
        const report = reportBySession.get(s._id.toString());
        return {
          sessionId: s._id,
          title: s.title,
          day: s.day,
          startTime: s.startTime,
          room: s.room,
          assignment: report
            ? { reportId: report._id, rapporteurName: report.rapporteurName, rapporteurEmail: report.rapporteurEmail, status: report.status }
            : null,
        };
      })
    )
  );
});

export const adminAssign = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as AdminAssignRapporteurInput;
  if (!isValidObjectId(input.sessionId)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  const { report, token, portalUrl } = await createRapporteurAssignment(input);
  const session = await Session.findById(input.sessionId).select('title day startTime room').lean();
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  await sendRapporteurAssignmentEmail(input.rapporteurEmail, input.rapporteurName, {
    sessionTitle: session.title,
    day: session.day,
    startTime: session.startTime,
    room: session.room,
    portalUrl,
  });

  await recordAudit({
    req,
    action: 'rapporteur.assigned',
    resourceType: 'SessionReport',
    resourceId: report.id,
    after: { sessionId: input.sessionId, rapporteurEmail: input.rapporteurEmail },
  });

  res.status(201).json(new ApiResponse({ reportId: report.id, tokenId: token.id, portalUrl }));
});

export const adminListReports = catchAsync(async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const filter = status ? { status } : {};
  const reports = await SessionReport.find(filter)
    .populate<{ session: SessionLike }>('session', 'title day startTime room')
    .sort({ updatedAt: -1 });

  res.json(
    new ApiResponse(
      reports.map((r) => ({
        reportId: r.id,
        session: r.session,
        rapporteurName: r.rapporteurName,
        rapporteurEmail: r.rapporteurEmail,
        keyPoints: r.keyPoints,
        decisions: r.decisions,
        actionItems: r.actionItems,
        notableQuotes: r.notableQuotes,
        status: r.status,
        submittedAt: r.submittedAt,
        aiPolishedSummary: r.aiPolishedSummary,
        aiPolishedStatus: r.aiPolishedStatus ?? null,
        aiPolishError: r.aiPolishError ?? null,
        approvedAt: r.approvedAt,
      }))
    )
  );
});

export const adminUpdateReport = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Report not found', 'NOT_FOUND');
  const input = req.body as AdminUpdateReportInput;

  const report = await SessionReport.findById(req.params.id).populate<{ session: SessionLike }>('session', 'title day startTime room');
  if (!report) throw new ApiError(404, 'Report not found', 'NOT_FOUND');

  if (input.aiPolishedSummary !== undefined) report.aiPolishedSummary = input.aiPolishedSummary;
  if (input.aiPolishedStatus === 'approved') {
    report.aiPolishedStatus = 'approved';
    report.approvedBy = req.user!.sub as unknown as typeof report.approvedBy;
    report.approvedAt = new Date();
  }
  await report.save();
  broadcastReportUpdate(report, report.session);

  res.json(new ApiResponse({ reportId: report.id, aiPolishedStatus: report.aiPolishedStatus ?? null, approvedAt: report.approvedAt }));
});

// Re-runs the AI polish call for a report whose first attempt failed
// (aiPolishError set, aiPolishedSummary still empty) — never resets an
// already-successful aiPolishedSummary.
export const adminRetryPolish = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Report not found', 'NOT_FOUND');
  const report = await SessionReport.findById(req.params.id).populate<{ session: SessionLike }>('session', 'title day startTime room');
  if (!report) throw new ApiError(404, 'Report not found', 'NOT_FOUND');

  try {
    const summary = await draftSessionReportPolish({
      sessionTitle: report.session.title,
      keyPoints: report.keyPoints,
      decisions: report.decisions,
      actionItems: report.actionItems,
      notableQuotes: report.notableQuotes,
    });
    report.aiPolishedSummary = summary;
    report.aiPolishedStatus = 'draft';
    report.aiPolishedAt = new Date();
    report.aiPolishError = undefined;
  } catch (err) {
    report.aiPolishError = err instanceof Error ? err.message : 'AI polish failed';
  }
  await report.save();
  broadcastReportUpdate(report, report.session);

  res.json(new ApiResponse({ reportId: report.id, aiPolishedStatus: report.aiPolishedStatus ?? null, aiPolishError: report.aiPolishError ?? null }));
});

// GET /admin/rapporteur/live-status — every active assignment (token + its
// report's current progress), for the Live Status tab's table + socket feed.
export const adminLiveStatus = catchAsync(async (_req: Request, res: Response) => {
  const tokens = await RapporteurAccessToken.find()
    .populate<{ session: SessionLike }>('session', 'title day startTime room')
    .populate<{ report: InstanceType<typeof SessionReport> }>('report', 'status aiPolishedStatus')
    .sort({ createdAt: -1 });

  res.json(
    new ApiResponse(
      tokens.map((t) => ({
        tokenId: t.id,
        sessionId: String(t.session._id),
        sessionTitle: t.session.title,
        rapporteurName: t.rapporteurName,
        rapporteurEmail: t.rapporteurEmail,
        status: t.report?.status ?? 'draft',
        aiPolishedStatus: t.report?.aiPolishedStatus ?? null,
        lastUsedAt: t.lastUsedAt,
        revoked: t.revoked,
        expiresAt: t.expiresAt,
      }))
    )
  );
});

export const adminRevokeToken = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Assignment not found', 'NOT_FOUND');
  const token = await RapporteurAccessToken.findById(req.params.id);
  if (!token) throw new ApiError(404, 'Assignment not found', 'NOT_FOUND');

  token.revoked = true;
  token.revokedAt = new Date();
  await token.save();

  await recordAudit({
    req,
    action: 'rapporteur.token_revoked',
    resourceType: 'RapporteurAccessToken',
    resourceId: token.id,
  });

  res.json(new ApiResponse({ ok: true }));
});

export const adminResendLink = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Assignment not found', 'NOT_FOUND');
  const token = await RapporteurAccessToken.findById(req.params.id).populate<{ session: SessionLike }>(
    'session',
    'title day startTime room'
  );
  if (!token) throw new ApiError(404, 'Assignment not found', 'NOT_FOUND');
  if (token.revoked) throw new ApiError(400, "This link has been revoked — it can't be resent.", 'TOKEN_REVOKED');

  const portalUrl = `${env.FRONTEND_ORIGIN}/rapporteur/${token.token}`;
  await sendRapporteurAssignmentEmail(token.rapporteurEmail, token.rapporteurName, {
    sessionTitle: token.session.title,
    day: token.session.day,
    startTime: token.session.startTime,
    room: token.session.room,
    portalUrl,
  });

  res.json(new ApiResponse({ sentAt: new Date() }));
});
