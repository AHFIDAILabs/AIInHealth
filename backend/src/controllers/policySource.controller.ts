import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { PolicySource, type PolicySourceDoc } from '../models/PolicySource.model.js';
import {
  createPolicySourceSchema,
  updatePolicySourceSchema,
  listPolicySourcesQuerySchema,
  type ListPolicySourcesQuery,
} from '../validations/policyTracker.validation.js';
import { recordAudit } from '../services/audit.service.js';

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query: ListPolicySourcesQuery = listPolicySourcesQuerySchema.parse(req.query);
  const filter: FilterQuery<PolicySourceDoc> = query.country ? { country: query.country } : {};
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    PolicySource.find(filter).sort({ country: 1, label: 1 }).skip(skip).limit(query.limit),
    PolicySource.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createPolicySourceSchema.parse({ body: req.body }).body;
  const source = await PolicySource.create(input);
  await recordAudit({ req, action: 'policy_source.created', resourceType: 'PolicySource', resourceId: source.id, after: source.toObject() });
  res.status(201).json(new ApiResponse(source));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Source not found', 'NOT_FOUND');
  const input = updatePolicySourceSchema.parse({ body: req.body }).body;
  const before = await PolicySource.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Source not found', 'NOT_FOUND');
  const source = await PolicySource.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!source) throw new ApiError(404, 'Source not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'policy_source.updated',
    resourceType: 'PolicySource',
    resourceId: source.id,
    before: before.toObject(),
    after: source.toObject(),
  });
  res.json(new ApiResponse(source));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Source not found', 'NOT_FOUND');
  const source = await PolicySource.findByIdAndDelete(req.params.id);
  if (!source) throw new ApiError(404, 'Source not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'policy_source.deleted', resourceType: 'PolicySource', resourceId: req.params.id, before: source.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
