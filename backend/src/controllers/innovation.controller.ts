import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Innovation, type InnovationDoc } from '../models/Innovation.model.js';
import {
  createInnovationSchema,
  updateInnovationSchema,
  listInnovationsQuerySchema,
  type ListInnovationsQuery,
} from '../validations/innovation.validation.js';
import { recordAudit } from '../services/audit.service.js';

// GET /innovations — public, published only
export const list = catchAsync(async (req: Request, res: Response) => {
  const track = typeof req.query.track === 'string' ? req.query.track : undefined;
  const filter: FilterQuery<InnovationDoc> = { isPublished: true, ...(track ? { track } : {}) };
  const innovations = await Innovation.find(filter).sort({ order: 1, createdAt: -1 });
  res.json(new ApiResponse(innovations));
});

const buildAdminFilter = (query: ListInnovationsQuery): FilterQuery<InnovationDoc> => {
  const filter: FilterQuery<InnovationDoc> = {};
  if (query.track) filter.track = query.track;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { organization: rx }, { founderName: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listInnovationsQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Innovation.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(query.limit),
    Innovation.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createInnovationSchema.parse({ body: req.body }).body;
  const innovation = await Innovation.create(input);
  await recordAudit({ req, action: 'innovation.created', resourceType: 'Innovation', resourceId: innovation.id, after: innovation.toObject() });
  res.status(201).json(new ApiResponse(innovation));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Innovation not found', 'NOT_FOUND');
  const input = updateInnovationSchema.parse({ body: req.body }).body;
  const before = await Innovation.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Innovation not found', 'NOT_FOUND');
  const innovation = await Innovation.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!innovation) throw new ApiError(404, 'Innovation not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'innovation.updated',
    resourceType: 'Innovation',
    resourceId: innovation.id,
    before: before.toObject(),
    after: innovation.toObject(),
  });
  res.json(new ApiResponse(innovation));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Innovation not found', 'NOT_FOUND');
  const innovation = await Innovation.findByIdAndDelete(req.params.id);
  if (!innovation) throw new ApiError(404, 'Innovation not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'innovation.deleted', resourceType: 'Innovation', resourceId: req.params.id, before: innovation.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
