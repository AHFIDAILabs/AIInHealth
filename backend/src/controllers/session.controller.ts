import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Session, type SessionDoc } from '../models/Session.model.js';
import {
  createSessionSchema,
  updateSessionSchema,
  listSessionsQuerySchema,
  checkConflictSchema,
  type ListSessionsQuery,
} from '../validations/session.validation.js';
import { recordAudit } from '../services/audit.service.js';

const SPEAKER_FIELDS = 'fullName title photoUrl';

// GET /sessions — public, published only
export const list = catchAsync(async (req: Request, res: Response) => {
  const day = typeof req.query.day === 'string' ? req.query.day : undefined;
  const track = typeof req.query.track === 'string' ? req.query.track : undefined;
  const filter: FilterQuery<SessionDoc> = { isPublished: true, ...(day ? { day } : {}), ...(track ? { track } : {}) };
  const sessions = await Session.find(filter).sort({ day: 1, startTime: 1 }).populate('speakers', SPEAKER_FIELDS);
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
    Session.find(filter).sort({ day: 1, startTime: 1 }).skip(skip).limit(query.limit).populate('speakers', SPEAKER_FIELDS),
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
  const populated = await session.populate('speakers', SPEAKER_FIELDS);
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
  const session = await Session.findByIdAndUpdate(req.params.id, input, { new: true }).populate('speakers', SPEAKER_FIELDS);
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
