import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Media, type MediaDoc } from '../models/Media.model.js';
import { createMediaSchema, updateMediaSchema, listMediaQuerySchema, type ListMediaQuery } from '../validations/media.validation.js';
import { recordAudit } from '../services/audit.service.js';
import type { MediaType, MediaDay } from '../types/enums.js';

// Featured items float first everywhere — the Home page strip and admin grid
// both rely on this ordering rather than each re-deriving "which one is the hero".
const SORT = { isFeatured: -1, order: 1, createdAt: -1 } as const;

// GET /media — public, published only, no auth
export const list = catchAsync(async (req: Request, res: Response) => {
  const type = typeof req.query.type === 'string' ? (req.query.type as MediaType) : undefined;
  const day = typeof req.query.day === 'string' ? (req.query.day as MediaDay) : undefined;
  const filter: FilterQuery<MediaDoc> = { isPublished: true, ...(type ? { type } : {}), ...(day ? { day } : {}) };
  const items = await Media.find(filter).sort(SORT);
  res.json(new ApiResponse(items));
});

const buildAdminFilter = (query: ListMediaQuery): FilterQuery<MediaDoc> => {
  const filter: FilterQuery<MediaDoc> = {};
  if (query.type) filter.type = query.type;
  if (query.day) filter.day = query.day;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.caption = rx;
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listMediaQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Media.find(filter).sort(SORT).skip(skip).limit(query.limit),
    Media.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createMediaSchema.parse({ body: req.body }).body;
  const media = await Media.create({ ...input, thumbnailUrl: input.thumbnailUrl || input.url });
  await recordAudit({ req, action: 'media.created', resourceType: 'Media', resourceId: media.id, after: media.toObject() });
  res.status(201).json(new ApiResponse(media));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Media item not found', 'NOT_FOUND');
  const input = updateMediaSchema.parse({ body: req.body }).body;
  const before = await Media.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Media item not found', 'NOT_FOUND');
  const media = await Media.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!media) throw new ApiError(404, 'Media item not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'media.updated',
    resourceType: 'Media',
    resourceId: media.id,
    before: before.toObject(),
    after: media.toObject(),
  });
  res.json(new ApiResponse(media));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Media item not found', 'NOT_FOUND');
  const media = await Media.findByIdAndDelete(req.params.id);
  if (!media) throw new ApiError(404, 'Media item not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'media.deleted', resourceType: 'Media', resourceId: req.params.id, before: media.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
