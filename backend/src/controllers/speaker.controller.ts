import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Speaker, type SpeakerDoc } from '../models/Speaker.model.js';
import {
  createSpeakerSchema,
  updateSpeakerSchema,
  listSpeakersQuerySchema,
  type ListSpeakersQuery,
} from '../validations/speaker.validation.js';
import { recordAudit } from '../services/audit.service.js';

// GET /speakers — public, published only, no auth
export const list = catchAsync(async (req: Request, res: Response) => {
  const track = typeof req.query.track === 'string' ? req.query.track : undefined;
  const filter: FilterQuery<SpeakerDoc> = { isPublished: true, ...(track ? { track } : {}) };
  const speakers = await Speaker.find(filter).sort({ order: 1, createdAt: -1 });
  res.json(new ApiResponse(speakers));
});

const buildAdminFilter = (query: ListSpeakersQuery): FilterQuery<SpeakerDoc> => {
  const filter: FilterQuery<SpeakerDoc> = {};
  if (query.track) filter.track = query.track;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { title: rx }, { organization: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listSpeakersQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Speaker.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(query.limit),
    Speaker.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createSpeakerSchema.parse({ body: req.body }).body;
  const speaker = await Speaker.create(input);
  await recordAudit({ req, action: 'speaker.created', resourceType: 'Speaker', resourceId: speaker.id, after: speaker.toObject() });
  res.status(201).json(new ApiResponse(speaker));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  const input = updateSpeakerSchema.parse({ body: req.body }).body;
  const before = await Speaker.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  const speaker = await Speaker.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!speaker) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'speaker.updated',
    resourceType: 'Speaker',
    resourceId: speaker.id,
    before: before.toObject(),
    after: speaker.toObject(),
  });
  res.json(new ApiResponse(speaker));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  const speaker = await Speaker.findByIdAndDelete(req.params.id);
  if (!speaker) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'speaker.deleted', resourceType: 'Speaker', resourceId: req.params.id, before: speaker.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
