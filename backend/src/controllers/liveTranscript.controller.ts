import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Session } from '../models/Session.model.js';
import { transcribeAudio } from '../services/ai/whisper.service.js';
import { broadcastAdminEvent } from '../sockets/adminNamespace.js';

// AI-Assisted Rapporteur System Stage 2, Layer 3 — admin-only internal
// monitoring (confirmed with the user; not a public/delegate-facing feature),
// so every handler here reuses the existing /admin Socket.IO namespace
// (broadcastAdminEvent) rather than needing any new real-time channel.

// GET /admin/live-transcript/sessions — lightweight picker list, mirrors
// rapporteur.controller.ts's adminListAssignableSessions own lean-query shape.
export const adminListSessions = catchAsync(async (_req: Request, res: Response) => {
  const sessions = await Session.find()
    .select('title day startTime room isLiveTranscribed liveTranscriptStatus')
    .sort({ day: 1, startTime: 1 })
    .lean();

  res.json(
    new ApiResponse(
      sessions.map((s) => ({
        sessionId: s._id,
        title: s.title,
        day: s.day,
        startTime: s.startTime,
        room: s.room,
        // .lean() reads the raw stored document — Mongoose only applies a
        // schema default at document-hydration/creation time, so any Session
        // created before these two fields existed has neither stored at all
        // (not `false`/`'idle'`, just absent). Fall back explicitly here
        // rather than relying on a backfill migration for pre-existing rows.
        isLiveTranscribed: s.isLiveTranscribed ?? false,
        liveTranscriptStatus: s.liveTranscriptStatus ?? 'idle',
      }))
    )
  );
});

// GET /admin/live-transcript/sessions/:id — full segment list + status, for a
// late-joining viewer or a page refresh mid-capture.
export const adminGet = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  const session = await Session.findById(req.params.id).select(
    'title day startTime room liveTranscriptStatus liveTranscriptSegments liveTranscriptStartedAt liveTranscriptEndedAt'
  );
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  res.json(
    new ApiResponse({
      sessionId: session.id,
      title: session.title,
      day: session.day,
      startTime: session.startTime,
      room: session.room,
      status: session.liveTranscriptStatus,
      segments: session.liveTranscriptSegments,
      startedAt: session.liveTranscriptStartedAt,
      endedAt: session.liveTranscriptEndedAt,
    })
  );
});

const broadcastStatus = (session: { id?: string; title: string; liveTranscriptStatus?: string }): void => {
  broadcastAdminEvent('live-transcript-status', {
    sessionId: session.id,
    sessionTitle: session.title,
    status: session.liveTranscriptStatus,
  });
};

// POST /admin/live-transcript/sessions/:id/start — a fresh capture, not a
// resume: restarting an 'ended' session's transcript clears its old segments
// (see LIVE_TRANSCRIPT_STATUSES' comment in types/enums.ts).
export const adminStart = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  const session = await Session.findById(req.params.id);
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  if (session.liveTranscriptStatus === 'recording') {
    throw new ApiError(400, 'This session already has a live transcript in progress.', 'ALREADY_RECORDING');
  }

  session.liveTranscriptStatus = 'recording';
  session.isLiveTranscribed = true;
  session.liveTranscriptSegments = [] as unknown as typeof session.liveTranscriptSegments;
  session.liveTranscriptStartedAt = new Date();
  session.liveTranscriptEndedAt = undefined;
  await session.save();

  broadcastStatus(session);
  res.json(new ApiResponse({ sessionId: session.id, status: session.liveTranscriptStatus }));
});

// POST /admin/live-transcript/sessions/:id/stop
export const adminStop = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  const session = await Session.findById(req.params.id);
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  if (session.liveTranscriptStatus !== 'recording') {
    throw new ApiError(400, 'This session has no live transcript in progress.', 'NOT_RECORDING');
  }

  session.liveTranscriptStatus = 'ended';
  session.liveTranscriptEndedAt = new Date();
  await session.save();

  broadcastStatus(session);
  res.json(new ApiResponse({ sessionId: session.id, status: session.liveTranscriptStatus }));
});

// POST /admin/live-transcript/sessions/:id/chunk — one ~20-30s clip in a
// continuous recording loop driven by the frontend's LiveTranscriptTab. The
// uploaded buffer is never persisted — transcribeAudio hands it to Groq and
// discards it. The filter below (not just an upfront status check) closes the
// race where a concurrent `stop` lands between this request starting and its
// transcription finishing: the $push only applies if the session is STILL
// 'recording' at write time.
export const adminChunk = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  const file = req.file;
  if (!file) throw new ApiError(422, 'No audio file received.', 'VALIDATION_ERROR');

  const current = await Session.findById(req.params.id).select('title liveTranscriptStatus');
  if (!current) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  if (current.liveTranscriptStatus !== 'recording') {
    throw new ApiError(409, 'This session is not currently recording a live transcript.', 'NOT_RECORDING');
  }

  const text = await transcribeAudio({
    feature: 'rapporteur-live-transcript',
    buffer: file.buffer,
    filename: file.originalname || 'chunk.webm',
    mimeType: file.mimetype,
    triggeredBy: req.user!.sub,
  });

  const capturedAt = new Date();
  const updated = await Session.findOneAndUpdate(
    { _id: req.params.id, liveTranscriptStatus: 'recording' },
    { $push: { liveTranscriptSegments: { text, capturedAt } } },
    { new: true }
  ).select('title');
  if (!updated) {
    throw new ApiError(409, 'This session is not currently recording a live transcript.', 'NOT_RECORDING');
  }

  broadcastAdminEvent('live-transcript-segment', { sessionId: updated.id, sessionTitle: updated.title, text, capturedAt });
  res.json(new ApiResponse({ text, capturedAt }));
});
