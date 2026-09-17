import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Track } from '../models/Track.model.js';
import { Session } from '../models/Session.model.js';
import { recordAudit } from '../services/audit.service.js';
import { createTrackSchema, updateTrackSchema } from '../validations/track.validation.js';

// GET /admin/tracks — every track with its live session/speaker counts,
// computed here (never stored) so they can't drift from what Sessions
// actually has, same reasoning as SponsorshipPackage's utilization count.
export const adminList = catchAsync(async (_req: Request, res: Response) => {
  const [tracks, sessions] = await Promise.all([
    Track.find().sort({ order: 1, name: 1 }),
    Session.find().select('track speakers').lean(),
  ]);

  const sessionsByTrack = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = s.track.toString();
    if (!sessionsByTrack.has(key)) sessionsByTrack.set(key, []);
    sessionsByTrack.get(key)!.push(s);
  }

  res.json(
    new ApiResponse(
      tracks.map((t) => {
        const forTrack = sessionsByTrack.get(t.id) ?? [];
        const uniqueSpeakers = new Set(forTrack.flatMap((s) => s.speakers.map((sp) => sp.toString())));
        return {
          ...t.toObject(),
          sessionsCount: forTrack.length,
          speakersCount: uniqueSpeakers.size,
        };
      })
    )
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createTrackSchema.parse({ body: req.body }).body;
  let track;
  try {
    track = await Track.create(input);
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    throw new ApiError(409, 'A track with this name already exists.', 'DUPLICATE_TRACK');
  }
  await recordAudit({ req, action: 'track.created', resourceType: 'Track', resourceId: track.id, after: track.toObject() });
  res.status(201).json(new ApiResponse({ ...track.toObject(), sessionsCount: 0, speakersCount: 0 }));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Track not found', 'NOT_FOUND');
  const input = updateTrackSchema.parse({ body: req.body }).body;
  const before = await Track.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Track not found', 'NOT_FOUND');

  let track;
  try {
    track = await Track.findByIdAndUpdate(req.params.id, input, { new: true });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    throw new ApiError(409, 'A track with this name already exists.', 'DUPLICATE_TRACK');
  }
  if (!track) throw new ApiError(404, 'Track not found', 'NOT_FOUND');

  await recordAudit({
    req,
    action: 'track.updated',
    resourceType: 'Track',
    resourceId: track.id,
    before: before.toObject(),
    after: track.toObject(),
  });
  res.json(new ApiResponse(track));
});

// A track still in use by any session can't be deleted outright — same
// "block, don't cascade" principle as SponsorshipPackage.adminDelete. The
// admin reassigns those sessions' track first (in the Sessions List/edit
// form), rather than this endpoint silently leaving sessions with a dangling
// track reference.
export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Track not found', 'NOT_FOUND');
  const inUse = await Session.countDocuments({ track: req.params.id });
  if (inUse > 0) {
    throw new ApiError(409, `${inUse} session(s) still use this track — reassign them first`, 'TRACK_IN_USE');
  }
  const track = await Track.findByIdAndDelete(req.params.id);
  if (!track) throw new ApiError(404, 'Track not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'track.deleted', resourceType: 'Track', resourceId: req.params.id, before: track.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
