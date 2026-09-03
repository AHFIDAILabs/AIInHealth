import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Partner, type PartnerDoc } from '../models/Partner.model.js';
import {
  createPartnerSchema,
  updatePartnerSchema,
  listPartnersQuerySchema,
  type ListPartnersQuery,
} from '../validations/partner.validation.js';
import { recordAudit } from '../services/audit.service.js';

// GET /partners — public, published only, grouped implicitly by tier via sort order
export const list = catchAsync(async (req: Request, res: Response) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const filter: FilterQuery<PartnerDoc> = { isPublished: true, ...(category ? { category } : {}) };
  const partners = await Partner.find(filter).sort({ tier: 1, order: 1, name: 1 });
  res.json(new ApiResponse(partners));
});

const buildAdminFilter = (query: ListPartnersQuery): FilterQuery<PartnerDoc> => {
  const filter: FilterQuery<PartnerDoc> = {};
  if (query.tier) filter.tier = query.tier;
  if (query.category) filter.category = query.category;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.name = rx;
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listPartnersQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Partner.find(filter).sort({ tier: 1, order: 1, name: 1 }).skip(skip).limit(query.limit),
    Partner.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createPartnerSchema.parse({ body: req.body }).body;
  const partner = await Partner.create(input);
  await recordAudit({ req, action: 'partner.created', resourceType: 'Partner', resourceId: partner.id, after: partner.toObject() });
  res.status(201).json(new ApiResponse(partner));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  const input = updatePartnerSchema.parse({ body: req.body }).body;
  const before = await Partner.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  const partner = await Partner.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!partner) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'partner.updated',
    resourceType: 'Partner',
    resourceId: partner.id,
    before: before.toObject(),
    after: partner.toObject(),
  });
  res.json(new ApiResponse(partner));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  const partner = await Partner.findByIdAndDelete(req.params.id);
  if (!partner) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'partner.deleted', resourceType: 'Partner', resourceId: req.params.id, before: partner.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
