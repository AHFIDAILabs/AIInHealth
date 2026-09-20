import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { InnovationShowcaseEntry, type InnovationShowcaseEntryDoc } from '../models/InnovationShowcaseEntry.model.js';
import {
  createInnovationShowcaseEntrySchema,
  updateInnovationShowcaseEntrySchema,
  listInnovationShowcaseEntriesQuerySchema,
  type ListInnovationShowcaseEntriesQuery,
} from '../validations/innovationShowcaseEntry.validation.js';
import { recordAudit } from '../services/audit.service.js';

// GET /innovation-showcase-entries — public, published only. Every field on
// this model is already safe to publish (see model comment), so no field
// projection is needed here, unlike confirmedAbstract.controller.ts.
export const list = catchAsync(async (req: Request, res: Response) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const filter: FilterQuery<InnovationShowcaseEntryDoc> = { isPublished: true, ...(category ? { category } : {}) };
  const entries = await InnovationShowcaseEntry.find(filter).sort({ order: 1, startupName: 1 });
  res.json(new ApiResponse(entries));
});

const buildAdminFilter = (query: ListInnovationShowcaseEntriesQuery): FilterQuery<InnovationShowcaseEntryDoc> => {
  const filter: FilterQuery<InnovationShowcaseEntryDoc> = {};
  if (query.category) filter.category = query.category;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ startupName: rx }, { founderNames: rx }, { solutionName: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listInnovationShowcaseEntriesQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    InnovationShowcaseEntry.find(filter).sort({ order: 1, startupName: 1 }).skip(skip).limit(query.limit),
    InnovationShowcaseEntry.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createInnovationShowcaseEntrySchema.parse({ body: req.body }).body;
  const entry = await InnovationShowcaseEntry.create(input);
  await recordAudit({
    req,
    action: 'innovationShowcaseEntry.created',
    resourceType: 'InnovationShowcaseEntry',
    resourceId: entry.id,
    after: entry.toObject(),
  });
  res.status(201).json(new ApiResponse(entry));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  const input = updateInnovationShowcaseEntrySchema.parse({ body: req.body }).body;
  const before = await InnovationShowcaseEntry.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  const entry = await InnovationShowcaseEntry.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!entry) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'innovationShowcaseEntry.updated',
    resourceType: 'InnovationShowcaseEntry',
    resourceId: entry.id,
    before: before.toObject(),
    after: entry.toObject(),
  });
  res.json(new ApiResponse(entry));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  const entry = await InnovationShowcaseEntry.findByIdAndDelete(req.params.id);
  if (!entry) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'innovationShowcaseEntry.deleted',
    resourceType: 'InnovationShowcaseEntry',
    resourceId: req.params.id,
    before: entry.toObject(),
  });
  res.json(new ApiResponse({ id: req.params.id }));
});
