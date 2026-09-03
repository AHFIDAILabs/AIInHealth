import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Abstract, type AbstractDoc } from '../models/Abstract.model.js';
import type { CreateAbstractInput, ListAbstractsQuery } from '../validations/abstract.validation.js';
import { listAbstractsQuerySchema, adminUpdateAbstractSchema } from '../validations/abstract.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { emitAdminNotification } from '../services/notification.service.js';

// POST /abstracts — public
export const create = catchAsync(async (req: Request, res: Response) => {
  const { website: _honeypot, ...input } = req.body as CreateAbstractInput & { website?: string };
  const abstract = await Abstract.create(input);

  await emitAdminNotification({
    type: 'inquiry.new',
    title: 'New abstract submission',
    body: input.title,
    resourceType: 'Abstract',
    resourceId: abstract.id,
  });

  res.status(201).json(
    new ApiResponse({ id: abstract.id, message: "Thanks for your submission — our programme committee will review it and follow up by email." })
  );
});

const buildFilter = (query: ListAbstractsQuery): FilterQuery<AbstractDoc> => {
  const filter: FilterQuery<AbstractDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.track) filter.track = query.track;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { authorName: rx }, { authorEmail: rx }, { organization: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listAbstractsQuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Abstract.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Abstract.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');
  const input = adminUpdateAbstractSchema.parse({ body: req.body }).body;
  const before = await Abstract.findById(req.params.id).select('status reviewNotes');
  if (!before) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');
  const abstract = await Abstract.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!abstract) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'abstract.updated',
    resourceType: 'Abstract',
    resourceId: abstract.id,
    before: { status: before.status, reviewNotes: before.reviewNotes },
    after: { status: abstract.status, reviewNotes: abstract.reviewNotes },
  });
  res.json(new ApiResponse(abstract));
});
