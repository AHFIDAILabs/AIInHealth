import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { VolunteerTrack } from '../models/VolunteerTrack.model.js';
import { Registration } from '../models/Registration.model.js';
import { recordAudit } from '../services/audit.service.js';
import { createVolunteerTrackSchema, updateVolunteerTrackSchema } from '../validations/volunteerTrack.validation.js';

// GET /volunteer-tracks — public. Feeds the public VolunteerForm's "which
// track are you interested in" dropdown, same reasoning as track.controller's
// public list() for Sessions.
export const list = catchAsync(async (_req: Request, res: Response) => {
  const tracks = await VolunteerTrack.find().sort({ order: 1, name: 1 }).select('name order');
  res.json(new ApiResponse(tracks));
});

// GET /admin/volunteer-tracks — with a live count of volunteers currently
// selected/assigned to each, computed here (never stored) so it can't drift.
export const adminList = catchAsync(async (_req: Request, res: Response) => {
  const [tracks, volunteers] = await Promise.all([
    VolunteerTrack.find().sort({ order: 1, name: 1 }),
    Registration.find({ type: 'volunteer' }).select('trackSelected trackAssigned').lean(),
  ]);

  res.json(
    new ApiResponse(
      tracks.map((t) => ({
        ...t.toObject(),
        volunteersCount: volunteers.filter((v) => v.trackSelected === t.name || v.trackAssigned === t.name).length,
      }))
    )
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createVolunteerTrackSchema.parse({ body: req.body }).body;
  let track;
  try {
    track = await VolunteerTrack.create(input);
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    throw new ApiError(409, 'A track with this name already exists.', 'DUPLICATE_VOLUNTEER_TRACK');
  }
  await recordAudit({
    req,
    action: 'volunteerTrack.created',
    resourceType: 'VolunteerTrack',
    resourceId: track.id,
    after: track.toObject(),
  });
  res.status(201).json(new ApiResponse({ ...track.toObject(), volunteersCount: 0 }));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Track not found', 'NOT_FOUND');
  const input = updateVolunteerTrackSchema.parse({ body: req.body }).body;
  const before = await VolunteerTrack.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Track not found', 'NOT_FOUND');

  let track;
  try {
    track = await VolunteerTrack.findByIdAndUpdate(req.params.id, input, { new: true });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    throw new ApiError(409, 'A track with this name already exists.', 'DUPLICATE_VOLUNTEER_TRACK');
  }
  if (!track) throw new ApiError(404, 'Track not found', 'NOT_FOUND');

  await recordAudit({
    req,
    action: 'volunteerTrack.updated',
    resourceType: 'VolunteerTrack',
    resourceId: track.id,
    before: before.toObject(),
    after: track.toObject(),
  });
  res.json(new ApiResponse(track));
});

// A track still selected/assigned on any volunteer can't be deleted outright
// — same "block, don't cascade" principle as Session Track's adminDelete.
export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Track not found', 'NOT_FOUND');
  const track = await VolunteerTrack.findById(req.params.id);
  if (!track) throw new ApiError(404, 'Track not found', 'NOT_FOUND');

  const inUse = await Registration.countDocuments({
    type: 'volunteer',
    $or: [{ trackSelected: track.name }, { trackAssigned: track.name }],
  });
  if (inUse > 0) {
    throw new ApiError(409, `${inUse} volunteer(s) still use this track — reassign them first`, 'VOLUNTEER_TRACK_IN_USE');
  }

  await track.deleteOne();
  await recordAudit({
    req,
    action: 'volunteerTrack.deleted',
    resourceType: 'VolunteerTrack',
    resourceId: req.params.id,
    before: track.toObject(),
  });
  res.json(new ApiResponse({ id: req.params.id }));
});
