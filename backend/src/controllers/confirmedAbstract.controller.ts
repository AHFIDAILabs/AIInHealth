import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { ConfirmedAbstract, type ConfirmedAbstractDoc } from '../models/ConfirmedAbstract.model.js';
import { Track } from '../models/Track.model.js';
import {
  createConfirmedAbstractSchema,
  updateConfirmedAbstractSchema,
  listConfirmedAbstractsQuerySchema,
  type ListConfirmedAbstractsQuery,
} from '../validations/confirmedAbstract.validation.js';
import { recordAudit } from '../services/audit.service.js';

// Same pattern as innovation.controller.ts's assertValidTrack — checks the
// live Track collection rather than a fixed enum. Unset track is allowed
// (see model comment), so this only runs when a value was actually given.
const assertValidTrack = async (track: string | undefined): Promise<void> => {
  if (!track) return;
  const exists = await Track.exists({ name: track });
  if (!exists) throw new ApiError(422, 'Select a valid track.', 'INVALID_TRACK');
};

// Fields safe for public consumption only — internalNotes is admin-only and
// deliberately never selected here.
const PUBLIC_FIELDS = 'code authorName photoUrl title presentationType track country order';

// GET /confirmed-abstracts — public, published only
export const list = catchAsync(async (req: Request, res: Response) => {
  const track = typeof req.query.track === 'string' ? req.query.track : undefined;
  const filter: FilterQuery<ConfirmedAbstractDoc> = { isPublished: true, ...(track ? { track } : {}) };
  const abstracts = await ConfirmedAbstract.find(filter).select(PUBLIC_FIELDS).sort({ order: 1, authorName: 1 });
  res.json(new ApiResponse(abstracts));
});

const buildAdminFilter = (query: ListConfirmedAbstractsQuery): FilterQuery<ConfirmedAbstractDoc> => {
  const filter: FilterQuery<ConfirmedAbstractDoc> = {};
  if (query.track) filter.track = query.track;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ authorName: rx }, { title: rx }, { code: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listConfirmedAbstractsQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    ConfirmedAbstract.find(filter).sort({ order: 1, authorName: 1 }).skip(skip).limit(query.limit),
    ConfirmedAbstract.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createConfirmedAbstractSchema.parse({ body: req.body }).body;
  await assertValidTrack(input.track);
  const existing = await ConfirmedAbstract.exists({ code: input.code });
  if (existing) throw new ApiError(409, 'An abstract with this code already exists.', 'DUPLICATE_CODE');
  const abstract = await ConfirmedAbstract.create(input);
  await recordAudit({
    req,
    action: 'confirmedAbstract.created',
    resourceType: 'ConfirmedAbstract',
    resourceId: abstract.id,
    after: abstract.toObject(),
  });
  res.status(201).json(new ApiResponse(abstract));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');
  const input = updateConfirmedAbstractSchema.parse({ body: req.body }).body;
  await assertValidTrack(input.track);
  const before = await ConfirmedAbstract.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');
  if (input.code && input.code !== before.code) {
    const duplicate = await ConfirmedAbstract.exists({ code: input.code, _id: { $ne: req.params.id } });
    if (duplicate) throw new ApiError(409, 'An abstract with this code already exists.', 'DUPLICATE_CODE');
  }
  const abstract = await ConfirmedAbstract.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!abstract) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'confirmedAbstract.updated',
    resourceType: 'ConfirmedAbstract',
    resourceId: abstract.id,
    before: before.toObject(),
    after: abstract.toObject(),
  });
  res.json(new ApiResponse(abstract));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');
  const abstract = await ConfirmedAbstract.findByIdAndDelete(req.params.id);
  if (!abstract) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'confirmedAbstract.deleted',
    resourceType: 'ConfirmedAbstract',
    resourceId: req.params.id,
    before: abstract.toObject(),
  });
  res.json(new ApiResponse({ id: req.params.id }));
});
